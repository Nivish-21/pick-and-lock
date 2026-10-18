import { beforeEach, describe, expect, it, vi } from "vitest";

type Insert<T> = (_context: unknown, row: T) => void;

function table<T>(rows: T[] = []) {
  let onInsert: Insert<T> | undefined;
  let onDelete: Insert<T> | undefined;
  return {
    onInsert(callback: Insert<T>) {
      onInsert = callback;
    },
    onDelete(callback: Insert<T>) {
      onDelete = callback;
    },
    onUpdate() {},
    insert(row: T) {
      rows.push(row);
      onInsert?.({}, row);
    },
    delete(row: T) {
      const index = rows.indexOf(row);
      if (index >= 0) rows.splice(index, 1);
      onDelete?.({}, row);
    },
    [Symbol.iterator]() {
      return rows[Symbol.iterator]();
    },
  };
}

const fixture = vi.hoisted(() => {
  const activity = table<any>();
  const plan = table<any>();
  const myRoomMembers = table<any>();
  const myRoomChat = table<any>();
  const myRoomPreferences = table<any>();
  const myRoomLocations = table<any>();
  const myBotRoomState = table<any>();
  let onApplied: (() => void) | undefined;
  const connection = {
    db: {
      activity,
      plan,
      myRoomMembers,
      myRoomChat,
      myRoomPreferences,
      myRoomLocations,
      myBotRoomState,
    },
    reducers: {
      ensureBotFriend: vi.fn().mockResolvedValue(undefined),
      sendBotMessage: vi.fn().mockResolvedValue(undefined),
    },
    disconnect: vi.fn(),
    subscriptionBuilder: () => ({
      onApplied(callback: () => void) {
        onApplied = callback;
        return this;
      },
      onError() {
        return this;
      },
      subscribe: vi.fn(),
    }),
    apply() {
      onApplied?.();
    },
  };
  return { connection };
});

vi.mock("../../client/src/module_bindings", () => ({
  DbConnection: {
    builder: () => ({
      withUri() {
        return this;
      },
      withDatabaseName() {
        return this;
      },
      withToken() {
        return this;
      },
      onConnect(callback: (connection: typeof fixture.connection) => void) {
        callback(fixture.connection);
        return this;
      },
      onConnectError() {
        return this;
      },
      onDisconnect() {
        return this;
      },
      build: () => fixture.connection,
    }),
  },
}));

vi.mock("./openai", () => ({ askModerator: vi.fn() }));

import { askModerator } from "./openai";
import { RoomBotService } from "./service";

describe("RoomBotService context caches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("caches activity fields, plan titles, and member counts after subscription application", () => {
    fixture.connection.db.activity.insert({
      planId: 7,
      name: "Bowling",
      price: 400,
      minPeople: 4,
      distanceKm: 3,
      timeMinutes: 25,
    });
    fixture.connection.db.plan.insert({ id: 7, title: "Saturday plans" });
    fixture.connection.db.myRoomMembers.insert({ roomId: 7, membershipId: 1 });
    fixture.connection.db.myRoomMembers.insert({ roomId: 7, membershipId: 2 });

    const service = new RoomBotService({
      host: "ws://test",
      database: "test",
      token: "test",
      openAiKey: "test",
    });
    fixture.connection.apply();

    expect((service as any).activities.get(7)).toEqual([
      {
        name: "Bowling",
        price: 400,
        minPeople: 4,
        distanceKm: 3,
        timeMinutes: 25,
      },
    ]);
    expect((service as any).planTitles.get(7)).toBe("Saturday plans");
    expect((service as any).memberCounts.get(7)).toBe(2);
    service.stop();
  });

  it("updates all context caches after later inserts", () => {
    const service = new RoomBotService({
      host: "ws://test",
      database: "test",
      token: "test",
      openAiKey: "test",
    });
    fixture.connection.apply();

    fixture.connection.db.activity.insert({
      planId: 9,
      name: "Escape room",
      price: 600,
      minPeople: 5,
      distanceKm: undefined,
      timeMinutes: undefined,
    });
    fixture.connection.db.plan.insert({ id: 9, title: "Friday evening" });
    fixture.connection.db.myRoomMembers.insert({ roomId: 9, membershipId: 3 });

    expect((service as any).activities.get(9)).toEqual([
      { name: "Escape room", price: 600, minPeople: 5 },
    ]);
    expect((service as any).planTitles.get(9)).toBe("Friday evening");
    expect((service as any).memberCounts.get(9)).toBe(1);
    service.stop();
  });

  it("decrements member counts when a membership leaves the subscribed view", () => {
    const service = new RoomBotService({
      host: "ws://test",
      database: "test",
      token: "test",
      openAiKey: "test",
    });
    fixture.connection.apply();

    const member = { roomId: 11, membershipId: 4 };
    fixture.connection.db.myRoomMembers.insert(member);
    fixture.connection.db.myRoomMembers.delete(member);

    expect((service as any).memberCounts.get(11)).toBe(0);
    service.stop();
  });

  it("sends the static intro then location request for a fresh room without calling the LLM", async () => {
    const service = new RoomBotService({
      host: "ws://test",
      database: "test",
      token: "test",
      openAiKey: "test",
    });

    fixture.connection.db.plan.insert({ id: 12, title: "New plans" });
    await vi.waitFor(() =>
      expect(fixture.connection.reducers.sendBotMessage).toHaveBeenCalledTimes(2),
    );

    expect(fixture.connection.reducers.ensureBotFriend).toHaveBeenCalledWith({
      planId: 12,
    });
    expect(fixture.connection.reducers.sendBotMessage).toHaveBeenNthCalledWith(
      1,
      {
        roomId: 12,
        body: "Hi, I'm Sorted's planning assistant — mention me anytime, or just tell me what you're deciding and I'll help build a poll.",
        kind: "text",
        payloadJson: "{}",
      },
    );
    expect(fixture.connection.reducers.sendBotMessage).toHaveBeenNthCalledWith(
      2,
      {
        roomId: 12,
        body: "Share your location to help me suggest nearby options.",
        kind: "location_request",
        payloadJson: "{}",
      },
    );
    expect(fixture.connection.reducers.sendBotMessage).toHaveBeenCalledTimes(2);
    expect(askModerator).not.toHaveBeenCalled();
    service.stop();
  });

  it("does not send an entry intro when the room already has chat", async () => {
    fixture.connection.db.myRoomChat.insert({
      id: 1,
      roomId: 13,
      senderName: "Priya",
      body: "Already here",
      isBot: false,
      kind: "text",
      sentAt: Date.now(),
    });
    const service = new RoomBotService({
      host: "ws://test",
      database: "test",
      token: "test",
      openAiKey: "test",
    });

    fixture.connection.db.plan.insert({ id: 13, title: "Existing plans" });
    await Promise.resolve();

    expect(fixture.connection.reducers.sendBotMessage).not.toHaveBeenCalled();
    service.stop();
  });
});
