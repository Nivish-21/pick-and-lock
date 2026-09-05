// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { Timestamp } from "spacetimedb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicStoryBridge } from "./PublicStoryBridge";

const { queries, sharedRoomStory } = vi.hoisted(() => ({
  queries: [] as string[],
  sharedRoomStory: Object.assign([] as unknown[], {
    onInsert: (_callback: () => void): void => undefined,
    onUpdate: (_callback: () => void): void => undefined,
    onDelete: (_callback: () => void): void => undefined,
  }) as unknown as Array<unknown> & {
    onInsert: (callback: () => void) => void;
    onUpdate: (callback: () => void) => void;
    onDelete: (callback: () => void) => void;
  },
}));

vi.mock("./spacetime", () => ({
  createConnection: (
    _onError: unknown,
    onConnect: (connection: unknown) => void,
  ) => {
    const subscription = {
      onApplied(callback: () => void) {
        this.applied = callback;
        return this;
      },
      onError() {
        return this;
      },
      subscribe(query: string) {
        queries.push(query);
        this.applied();
      },
      applied: (): void => undefined,
    };
    const connection = {
      db: { sharedRoomStory },
      disconnect: vi.fn(),
      subscriptionBuilder: () => subscription,
    };
    onConnect(connection);
    return connection;
  },
}));

beforeEach(() => {
  queries.length = 0;
  sharedRoomStory.length = 0;
  sharedRoomStory.onInsert = () => undefined;
  sharedRoomStory.onUpdate = () => undefined;
  sharedRoomStory.onDelete = () => undefined;
});

afterEach(cleanup);

describe("PublicStoryBridge", () => {
  it("renders an unpublished story without any member-only subscription", async () => {
    render(<PublicStoryBridge publicRoomId="DINNER1" />);

    expect(
      await screen.findByRole("heading", {
        name: "This decision story is not public.",
      }),
    ).toBeTruthy();
    expect(queries).toEqual([
      "SELECT * FROM shared_room_story WHERE id = 'DINNER1'",
    ]);
  });

  it("maps only the public projection fields", async () => {
    sharedRoomStory.push({
      id: "DINNER1",
      title: "Dinner plan",
      status: { tag: "Locked" },
      choiceLabels: ["Bowling"],
      selectedChoiceLabel: "Bowling",
      decisionCount: 1,
      publishedAt: Timestamp.UNIX_EPOCH,
      updatedAt: Timestamp.UNIX_EPOCH,
      startsAt: undefined,
      timezone: undefined,
    });

    render(<PublicStoryBridge publicRoomId="DINNER1" />);

    expect(await screen.findByText("Dinner plan")).toBeTruthy();
    expect(screen.getAllByText("Bowling")).toHaveLength(2);
  });
});
