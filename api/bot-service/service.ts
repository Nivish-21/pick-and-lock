import { DbConnection } from "../../client/src/module_bindings";
import { RoomDebouncer } from "./debounce";
import { askModerator, type ModeratorMessage } from "./openai";
import { findNearbyPlaces } from "./places";
import { decideSpeak, type SpeakGateMessage, type SpeakGateState } from "./speakGate";

type CachedMessage = SpeakGateMessage & {
  id: number;
  roomId: number;
  kind: string;
  sentAt: number;
};

type CachedLocation = {
  id: number;
  roomId: number;
  lat: number;
  lng: number;
};

type CachedPreference = {
  id: number;
  friendName: string;
  statement: string;
  category: string;
};

type CachedState = SpeakGateState & {
  roomId: number;
  lastProcessedMessageId: number;
};

type TimestampLike = Date | number | { toDate(): Date };

function numeric(value: number | bigint): number {
  return typeof value === "bigint" ? Number(value) : value;
}

function timestampMs(value: Date | number | { toDate(): Date }): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return value.toDate().getTime();
}

export type BotServiceConfig = {
  host: string;
  database: string;
  token: string;
  openAiKey: string;
  placesKey?: string;
};

export class RoomBotService {
  private readonly connection: DbConnection;
  private readonly messages = new Map<number, CachedMessage[]>();
  private readonly preferences = new Map<number, CachedPreference[]>();
  private readonly locations = new Map<number, CachedLocation[]>();
  private readonly states = new Map<number, CachedState>();
  private readonly lastActivity = new Map<number, number>();
  private readonly debouncer: RoomDebouncer<{ type: "message" | "location"; id: number }>;

  constructor(private readonly config: BotServiceConfig) {
    this.debouncer = new RoomDebouncer(3_000, async (batch) => {
      const byRoom = new Map<number, Array<{ type: "message" | "location"; id: number }>>();
      for (const entry of batch) {
        const roomBatch = byRoom.get(entry.roomId) ?? [];
        roomBatch.push(entry.item);
        byRoom.set(entry.roomId, roomBatch);
      }
      await Promise.all(
        [...byRoom.entries()].map(([roomId, roomBatch]) => this.processRoom(roomId, roomBatch)),
      );
    });
    this.connection = DbConnection.builder()
      .withUri(config.host)
      .withDatabaseName(config.database)
      .withToken(config.token)
      .onConnect((connection) => this.subscribe(connection))
      .onConnectError((_context, error) => console.error("Bot connection error", error))
      .onDisconnect((_context, error) => console.error("Bot disconnected", error ?? "unknown error"))
      .build();
  }

  stop(): void {
    this.debouncer.dispose();
    this.connection.disconnect();
  }

  private subscribe(connection: DbConnection): void {
    connection.db.myRoomChat.onInsert((_context, row) => {
      const message: CachedMessage = {
        id: numeric(row.id),
        roomId: row.roomId,
        senderName: row.senderName,
        body: row.body,
        isBot: row.isBot,
        kind: row.kind,
        sentAt: timestampMs(row.sentAt),
      };
      const roomMessages = this.messages.get(row.roomId) ?? [];
      if (roomMessages.some((message) => message.id === numeric(row.id))) return;
      roomMessages.push(message);
        this.messages.set(row.roomId, roomMessages);
      this.lastActivity.set(row.roomId, message.sentAt);
      if (!message.isBot) this.debouncer.schedule(row.roomId, { type: "message", id: message.id });
    });
    connection.db.myRoomChat.onUpdate((_context, _oldRow, row) => {
      const roomMessages = this.messages.get(row.roomId) ?? [];
      const index = roomMessages.findIndex((message) => message.id === numeric(row.id));
      if (index >= 0) roomMessages[index] = { ...roomMessages[index], body: row.body, kind: row.kind };
      this.messages.set(row.roomId, roomMessages);
    });
    connection.db.myRoomPreferences.onInsert((_context, row) => {
      const roomPreferences = this.preferences.get(row.roomId) ?? [];
      const id = numeric(row.id);
      if (roomPreferences.some((preference) => preference.id === id)) return;
      roomPreferences.push({ id, friendName: row.friendName, statement: row.statement, category: row.category });
      this.preferences.set(row.roomId, roomPreferences);
    });
    connection.db.myRoomLocations.onInsert((_context, row) => {
      const roomLocations = this.locations.get(row.roomId) ?? [];
      const location = { id: numeric(row.id), roomId: row.roomId, lat: row.lat, lng: row.lng };
      if (roomLocations.some((existing) => existing.id === location.id)) return;
      roomLocations.push(location);
      this.locations.set(row.roomId, roomLocations);
      this.lastActivity.set(row.roomId, Date.now());
      this.debouncer.schedule(row.roomId, { type: "location", id: location.id });
    });
    connection.db.myBotRoomState.onInsert((_context, row) => this.cacheState(row));
    connection.db.myBotRoomState.onUpdate((_context, _oldRow, row) => this.cacheState(row));

    connection.subscriptionBuilder()
      .onApplied(() => {
        this.messages.clear();
        this.preferences.clear();
        this.locations.clear();
        this.lastActivity.clear();
        for (const row of connection.db.myRoomChat) {
          const roomMessages = this.messages.get(row.roomId) ?? [];
          if (roomMessages.some((message) => message.id === numeric(row.id))) continue;
          roomMessages.push({
            id: numeric(row.id),
            roomId: row.roomId,
            senderName: row.senderName,
            body: row.body,
            isBot: row.isBot,
            kind: row.kind,
            sentAt: timestampMs(row.sentAt),
          });
          this.messages.set(row.roomId, roomMessages);
          this.lastActivity.set(row.roomId, Math.max(this.lastActivity.get(row.roomId) ?? 0, timestampMs(row.sentAt)));
        }
        for (const row of connection.db.myRoomPreferences) {
          const roomPreferences = this.preferences.get(row.roomId) ?? [];
          const id = numeric(row.id);
          if (roomPreferences.some((preference) => preference.id === id)) continue;
          roomPreferences.push({ id, friendName: row.friendName, statement: row.statement, category: row.category });
          this.preferences.set(row.roomId, roomPreferences);
        }
        for (const row of connection.db.myRoomLocations) {
          const roomLocations = this.locations.get(row.roomId) ?? [];
          if (roomLocations.some((location) => location.id === numeric(row.id))) continue;
          roomLocations.push({ id: numeric(row.id), roomId: row.roomId, lat: row.lat, lng: row.lng });
          this.locations.set(row.roomId, roomLocations);
        }
        const roomIds = new Set<number>();
        for (const row of connection.db.myRoomChat) {
          if (!row.isBot) roomIds.add(row.roomId);
        }
        for (const roomId of roomIds) {
          this.debouncer.schedule(roomId, { type: "message", id: 0 });
        }
      })
      .onError((context) => console.error("Bot subscription error", context))
      .subscribe([
        "SELECT * FROM my_room_chat",
        "SELECT * FROM my_room_preferences",
        "SELECT * FROM my_room_locations",
        "SELECT * FROM my_bot_room_state",
      ]);
  }

  private cacheState(row: {
    roomId: number;
    lastBotMessageAt?: TimestampLike | null;
    botMessagesInCurrentMinute: number;
    minuteWindowStartedAt: TimestampLike;
    lastProcessedMessageId: number | bigint;
  }): void {
    this.states.set(row.roomId, {
      roomId: row.roomId,
      lastBotMessageAt: row.lastBotMessageAt ? timestampMs(row.lastBotMessageAt) : undefined,
      botMessagesInCurrentMinute: row.botMessagesInCurrentMinute,
      minuteWindowStartedAt: timestampMs(row.minuteWindowStartedAt),
      lastProcessedMessageId: numeric(row.lastProcessedMessageId),
    });
  }

  private async processRoom(
    roomId: number,
    batch: Array<{ type: "message" | "location"; id: number }>,
  ): Promise<void> {
    const messages = this.messages.get(roomId) ?? [];
    const previousState = this.states.get(roomId) ?? {
      roomId,
      lastBotMessageAt: undefined,
      botMessagesInCurrentMinute: 0,
      minuteWindowStartedAt: Date.now(),
      lastProcessedMessageId: 0,
    };
    const newMessages = messages.filter((message) => message.id > previousState.lastProcessedMessageId);
    const locationJustSubmitted = batch.some((entry) => entry.type === "location");
    const gate = decideSpeak({
      messages: newMessages,
      now: Date.now(),
      state: previousState,
      locationJustSubmitted,
      decisionMilestone: newMessages.some((message) => message.kind === "recap"),
      lastActivityAt: this.lastActivity.get(roomId),
      everyoneAnswered: false,
    });
    const result = await askModerator(this.config.openAiKey, {
      allowedToSpeak: gate.allowed,
      trigger: gate.trigger,
      messages: newMessages.map<ModeratorMessage>((message) => ({ senderName: message.senderName, body: message.body })),
      preferenceDigest: (this.preferences.get(roomId) ?? [])
        .map((preference) => `${preference.friendName}: ${preference.statement} (${preference.category})`)
        .join("; "),
    });

    for (const preference of result.extracted_preferences) {
      if (!Number.isInteger(preference.friend_id) || preference.friend_id <= 0
        || typeof preference.statement !== "string"
        || !["dietary", "budget", "timing", "access", "other"].includes(preference.category)) {
        continue;
      }
      await this.connection.reducers.recordPreference({
        roomId,
        friendId: preference.friend_id,
        statement: preference.statement,
        category: preference.category,
        sourceMessageId: BigInt(newMessages.at(-1)?.id ?? 0),
      }).catch(() => undefined);
    }
    if (result.reply_text && gate.allowed) {
      await this.connection.reducers.sendBotMessage({
        roomId,
        body: result.reply_text,
        kind: "text",
        payloadJson: "{}",
      }).catch(() => undefined);
    }

    const submittedLocationIds = new Set(
      batch.filter((entry) => entry.type === "location").map((entry) => entry.id),
    );
    const locations = this.locations.get(roomId) ?? [];
    const location = [...locations].reverse().find((candidate) => submittedLocationIds.has(candidate.id));
    if (location && this.config.placesKey && (result.place_query_needed || gate.trigger === "location-submitted")) {
      try {
        const places = await findNearbyPlaces(this.config.placesKey, location, "group-friendly venue");
        await this.connection.reducers.sendBotMessage({
          roomId,
          body: places.length ? "Here are a few nearby options." : "I could not find nearby options yet.",
          kind: "place_suggestions",
          payloadJson: JSON.stringify({ places }),
        }).catch(() => undefined);
      } catch {
        await this.connection.reducers.sendBotMessage({
          roomId,
          body: "I could not check nearby places right now. Try again in a moment.",
          kind: "place_suggestions",
          payloadJson: JSON.stringify({ places: [] }),
        }).catch(() => undefined);
      }
    }

    const latestId = messages.reduce(
      (latest, message) => Math.max(latest, message.id),
      previousState.lastProcessedMessageId,
    );
    if (latestId > previousState.lastProcessedMessageId) {
      await this.connection.reducers.advanceBotWatermark({ roomId, lastProcessedMessageId: BigInt(latestId) });
    }
  }
}
