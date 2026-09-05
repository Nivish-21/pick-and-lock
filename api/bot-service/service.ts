import { DbConnection } from "../../client/src/module_bindings";
import { RoomDebouncer } from "./debounce";
import { askModerator, type ModeratorMessage } from "./openai";
import { findNearbyPlaces } from "./places";
import {
  decideSpeak,
  type SpeakGateMessage,
  type SpeakGateState,
} from "./speakGate";
import { extractPollIdeas } from "./pollAuthoring";

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
  private readonly activities = new Map<number, Array<{ name: string }>>();
  private readonly debouncer: RoomDebouncer<{
    type: "message" | "location";
    id: number;
  }>;

  constructor(private readonly config: BotServiceConfig) {
    this.debouncer = new RoomDebouncer(2_000, async (batch) => {
      const byRoom = new Map<
        number,
        Array<{ type: "message" | "location"; id: number }>
      >();
      for (const entry of batch) {
        const roomBatch = byRoom.get(entry.roomId) ?? [];
        roomBatch.push(entry.item);
        byRoom.set(entry.roomId, roomBatch);
      }
      await Promise.all(
        [...byRoom.entries()].map(([roomId, roomBatch]) =>
          this.processRoom(roomId, roomBatch),
        ),
      );
    });
    this.connection = DbConnection.builder()
      .withUri(config.host)
      .withDatabaseName(config.database)
      .withToken(config.token)
      .onConnect((connection) => this.subscribe(connection))
      .onConnectError((_context, error) =>
        console.error("Bot connection error", error),
      )
      .onDisconnect((_context, error) =>
        console.error("Bot disconnected", error ?? "unknown error"),
      )
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
      roomMessages.push(message);
      this.messages.set(row.roomId, roomMessages);
      this.lastActivity.set(row.roomId, message.sentAt);
      if (!message.isBot)
        this.debouncer.schedule(row.roomId, {
          type: "message",
          id: message.id,
        });
    });
    connection.db.myRoomChat.onUpdate((_context, _oldRow, row) => {
      const roomMessages = this.messages.get(row.roomId) ?? [];
      const index = roomMessages.findIndex(
        (message) => message.id === numeric(row.id),
      );
      if (index >= 0)
        roomMessages[index] = {
          ...roomMessages[index],
          body: row.body,
          kind: row.kind,
        };
      this.messages.set(row.roomId, roomMessages);
    });
    connection.db.myRoomPreferences.onInsert((_context, row) => {
      const roomPreferences = this.preferences.get(row.roomId) ?? [];
      roomPreferences.push({
        friendName: row.friendName,
        statement: row.statement,
        category: row.category,
      });
      this.preferences.set(row.roomId, roomPreferences);
    });
    connection.db.myRoomLocations.onInsert((_context, row) => {
      const roomLocations = this.locations.get(row.roomId) ?? [];
      const location = {
        id: numeric(row.id),
        roomId: row.roomId,
        lat: row.lat,
        lng: row.lng,
      };
      roomLocations.push(location);
      this.locations.set(row.roomId, roomLocations);
      this.lastActivity.set(row.roomId, Date.now());
      this.debouncer.schedule(row.roomId, {
        type: "location",
        id: location.id,
      });
    });
    connection.db.myBotRoomState.onInsert((_context, row) =>
      this.cacheState(row),
    );
    connection.db.myBotRoomState.onUpdate((_context, _oldRow, row) =>
      this.cacheState(row),
    );
    connection.db.plan.onInsert((_context, row) => {
      void connection.reducers
        .ensureBotFriend({ planId: row.id })
        .catch(() => undefined);
    });
    connection.db.activity.onInsert((_context, row) => {
      const activities = this.activities.get(row.planId) ?? [];
      if (!activities.some((activity) => activity.name === row.name))
        activities.push({ name: row.name });
      this.activities.set(row.planId, activities);
    });

    connection
      .subscriptionBuilder()
      .onApplied(() => {
        this.messages.clear();
        this.preferences.clear();
        this.locations.clear();
        this.lastActivity.clear();
        this.activities.clear();
        for (const row of connection.db.activity) {
          const activities = this.activities.get(row.planId) ?? [];
          activities.push({ name: row.name });
          this.activities.set(row.planId, activities);
        }
        for (const row of connection.db.plan) {
          void connection.reducers
            .ensureBotFriend({ planId: row.id })
            .catch(() => undefined);
        }
        for (const row of connection.db.myRoomChat) {
          const roomMessages = this.messages.get(row.roomId) ?? [];
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
          this.lastActivity.set(
            row.roomId,
            Math.max(
              this.lastActivity.get(row.roomId) ?? 0,
              timestampMs(row.sentAt),
            ),
          );
        }
        for (const row of connection.db.myRoomPreferences) {
          const roomPreferences = this.preferences.get(row.roomId) ?? [];
          roomPreferences.push({
            friendName: row.friendName,
            statement: row.statement,
            category: row.category,
          });
          this.preferences.set(row.roomId, roomPreferences);
        }
        for (const row of connection.db.myRoomLocations) {
          const roomLocations = this.locations.get(row.roomId) ?? [];
          roomLocations.push({
            id: numeric(row.id),
            roomId: row.roomId,
            lat: row.lat,
            lng: row.lng,
          });
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
        "SELECT * FROM activity",
        "SELECT * FROM plan",
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
      lastBotMessageAt: row.lastBotMessageAt
        ? timestampMs(row.lastBotMessageAt)
        : undefined,
      botMessagesInCurrentMinute: row.botMessagesInCurrentMinute,
      minuteWindowStartedAt: timestampMs(row.minuteWindowStartedAt),
      lastProcessedMessageId: numeric(row.lastProcessedMessageId),
    });
  }

  private async processRoom(
    roomId: number,
    batch: Array<{ type: "message" | "location"; id: number }>,
  ): Promise<void> {
    try {
      await this.processRoomUnsafe(roomId, batch);
    } catch (error) {
      console.error(`Bot processing failed for room ${roomId}`, error);
    }
  }

  private async processRoomUnsafe(
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
    const newMessages = messages.filter(
      (message) => message.id > previousState.lastProcessedMessageId,
    );
    const locationJustSubmitted = batch.some(
      (entry) => entry.type === "location",
    );
    const gate = decideSpeak({
      messages: newMessages,
      now: Date.now(),
      state: previousState,
      locationJustSubmitted,
      decisionMilestone: newMessages.some(
        (message) => !message.isBot && message.kind === "recap",
      ),
      lastActivityAt: this.lastActivity.get(roomId),
      everyoneAnswered: false,
    });
    const result = await askModerator(this.config.openAiKey, {
      allowedToSpeak: gate.allowed,
      trigger: gate.trigger,
      messages: newMessages.map<ModeratorMessage>((message) => ({
        senderName: message.senderName,
        body: message.body,
      })),
      preferenceDigest: (this.preferences.get(roomId) ?? [])
        .map(
          (preference) =>
            `${preference.friendName}: ${preference.statement} (${preference.category})`,
        )
        .join("; "),
    });
    console.log(
      `Room ${roomId}: trigger=${gate.trigger} allowed=${gate.allowed} newMessages=${newMessages.length} reply=${result.reply_text ? "yes" : "no"} ideas=${result.activity_ideas.length}`,
    );

    const ideas =
      newMessages.length > 0
        ? extractPollIdeas(
            result.activity_ideas,
            (this.activities.get(roomId) ?? []).map(
              (activity) => activity.name,
            ),
          )
        : [];
    let authoredNames: string[] = [];
    if (ideas.length > 0) {
      await this.connection.reducers
        .sendBotMessage({
          roomId,
          body: "Drafting a few options from the chat...",
          kind: "text",
          payloadJson: "{}",
        })
        .catch((error) =>
          console.error(`sendBotMessage (drafting) failed for room ${roomId}`, error),
        );
      for (const idea of ideas) {
        try {
          await this.connection.reducers.botAddActivity({
            roomId,
            name: idea.name,
            price: idea.price,
            minPeople: idea.minPeople,
          });
          authoredNames.push(idea.name);
          const activities = this.activities.get(roomId) ?? [];
          activities.push({ name: idea.name });
          this.activities.set(roomId, activities);
        } catch {
          // A concurrent human add or another bot cycle may have claimed the name.
        }
      }
      if (authoredNames.length > 0) {
        setTimeout(() => {
          void this.connection.reducers
            .sendBotMessage({
              roomId,
              body: `Added to the poll: ${authoredNames.join(", ")}.`,
              kind: "recap",
              payloadJson: JSON.stringify({ activities: authoredNames }),
            })
            .catch((error) =>
              console.error(`sendBotMessage (recap) failed for room ${roomId}`, error),
            );
        }, 26_000);
      }
    }

    for (const preference of result.extracted_preferences) {
      await this.connection.reducers.recordPreference({
        roomId,
        friendId: preference.friend_id,
        statement: preference.statement,
        category: preference.category,
        sourceMessageId: BigInt(newMessages.at(-1)?.id ?? 0),
      });
    }
    if (result.reply_text && gate.allowed && authoredNames.length === 0) {
      await this.connection.reducers
        .sendBotMessage({
          roomId,
          body: result.reply_text,
          kind: "text",
          payloadJson: "{}",
        })
        .catch((error) =>
          console.error(`sendBotMessage (reply) failed for room ${roomId}`, error),
        );
    }

    const location = (this.locations.get(roomId) ?? []).at(-1);
    if (
      location &&
      this.config.placesKey &&
      (result.place_query_needed || gate.trigger === "location-submitted")
    ) {
      try {
        const places = await findNearbyPlaces(
          this.config.placesKey,
          location,
          "group-friendly venue",
        );
        await this.connection.reducers
          .sendBotMessage({
            roomId,
            body: places.length
              ? "Here are a few nearby options."
              : "I could not find nearby options yet.",
            kind: "place_suggestions",
            payloadJson: JSON.stringify({ places }),
          })
          .catch((error) =>
            console.error(`sendBotMessage (places) failed for room ${roomId}`, error),
          );
      } catch (error) {
        console.error(`findNearbyPlaces failed for room ${roomId}`, error);
        await this.connection.reducers
          .sendBotMessage({
            roomId,
            body: "I could not check nearby places right now. Try again in a moment.",
            kind: "place_suggestions",
            payloadJson: JSON.stringify({ places: [] }),
          })
          .catch((error) =>
            console.error(`sendBotMessage (places-error) failed for room ${roomId}`, error),
          );
      }
    }

    const latestId =
      messages.at(-1)?.id ?? previousState.lastProcessedMessageId;
    if (latestId > previousState.lastProcessedMessageId) {
      await this.connection.reducers.advanceBotWatermark({
        roomId,
        lastProcessedMessageId: BigInt(latestId),
      });
    }
  }
}
