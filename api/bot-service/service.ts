import { DbConnection } from "../../client/src/module_bindings";
import { RoomDebouncer } from "./debounce";
import { askModerator, type ModeratorMessage, type PollDraftContext } from "./openai";
import { classifyIntent } from "./intentClassifier";
import { findNearbyPlaces } from "./places";
import {
  decideSpeak,
  type SpeakGateMessage,
  type SpeakGateState,
} from "./speakGate";
import { mergePollDraftUpdates } from "./pollAuthoring";

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

type CachedActivity = {
  name: string;
  price: number;
  minPeople: number;
  distanceKm?: number;
  timeMinutes?: number;
};

type CachedPollDraft = PollDraftContext;

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
  private readonly activities = new Map<number, CachedActivity[]>();
  private readonly pollDrafts = new Map<number, CachedPollDraft[]>();
  private readonly planTitles = new Map<number, string>();
  private readonly memberCounts = new Map<number, number>();
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
    connection.db.myBotPollDraft.onInsert((_context, row) => this.cachePollDraft(row));
    connection.db.myBotPollDraft.onUpdate((_context, _oldRow, row) => this.cachePollDraft(row));
    connection.db.myBotPollDraft.onDelete((_context, row) => this.removePollDraft(row.roomId, row.name));
    connection.db.plan.onInsert((_context, row) => {
      this.planTitles.set(row.id, row.title);
      void connection.reducers
        .ensureBotFriend({ planId: row.id })
        .catch(() => undefined);
    });
    connection.db.activity.onInsert((_context, row) => {
      this.cacheActivity(row);
    });
    connection.db.myRoomMembers.onInsert((_context, row) => {
      this.memberCounts.set(
        row.roomId,
        (this.memberCounts.get(row.roomId) ?? 0) + 1,
      );
    });
    connection.db.myRoomMembers.onDelete((_context, row) => {
      const count = this.memberCounts.get(row.roomId) ?? 0;
      this.memberCounts.set(row.roomId, Math.max(0, count - 1));
    });

    connection
      .subscriptionBuilder()
      .onApplied(() => {
        this.messages.clear();
        this.preferences.clear();
        this.locations.clear();
        this.lastActivity.clear();
        this.activities.clear();
        this.pollDrafts.clear();
        this.planTitles.clear();
        this.memberCounts.clear();
        for (const row of connection.db.activity) {
          this.cacheActivity(row);
        }
        for (const row of connection.db.myBotPollDraft) this.cachePollDraft(row);
        for (const row of connection.db.plan) {
          this.planTitles.set(row.id, row.title);
          void connection.reducers
            .ensureBotFriend({ planId: row.id })
            .catch(() => undefined);
        }
        for (const row of connection.db.myRoomMembers) {
          this.memberCounts.set(
            row.roomId,
            (this.memberCounts.get(row.roomId) ?? 0) + 1,
          );
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
        "SELECT * FROM my_bot_poll_draft",
        "SELECT * FROM my_room_members",
        "SELECT * FROM activity",
        "SELECT * FROM plan",
      ]);
  }

  private cacheActivity(row: {
    planId: number;
    name: string;
    price: number;
    minPeople: number;
    distanceKm?: number;
    timeMinutes?: number;
  }): void {
    const activities = this.activities.get(row.planId) ?? [];
    if (activities.some((activity) => activity.name === row.name)) return;
    activities.push({
      name: row.name,
      price: row.price,
      minPeople: row.minPeople,
      ...(row.distanceKm === undefined ? {} : { distanceKm: row.distanceKm }),
      ...(row.timeMinutes === undefined
        ? {}
        : { timeMinutes: row.timeMinutes }),
    });
    this.activities.set(row.planId, activities);
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

  private cachePollDraft(row: {
    roomId: number;
    name: string;
    price?: number;
    minPeople?: number;
    distanceKm?: number;
    timeMinutes?: number;
    awaitingConfirmation: boolean;
  }): void {
    const drafts = this.pollDrafts.get(row.roomId) ?? [];
    const index = drafts.findIndex((draft) => draft.name.toLocaleLowerCase() === row.name.toLocaleLowerCase());
    const draft: CachedPollDraft = {
      name: row.name,
      ...(row.price === undefined ? {} : { price: row.price }),
      ...(row.minPeople === undefined ? {} : { min_people: row.minPeople }),
      ...(row.distanceKm === undefined ? {} : { distance_km: row.distanceKm }),
      ...(row.timeMinutes === undefined ? {} : { time_minutes: row.timeMinutes }),
      awaiting_confirmation: row.awaitingConfirmation,
    };
    if (index >= 0) drafts[index] = draft;
    else drafts.push(draft);
    this.pollDrafts.set(row.roomId, drafts);
  }

  private removePollDraft(roomId: number, name: string): void {
    this.pollDrafts.set(roomId, (this.pollDrafts.get(roomId) ?? []).filter(
      (draft) => draft.name.toLocaleLowerCase() !== name.toLocaleLowerCase(),
    ));
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
    let gate = decideSpeak({
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
    if (!gate.allowed && gate.reason === "no speak trigger") {
      const intent = await classifyIntent(
        this.config.openAiKey,
        newMessages.map<ModeratorMessage>((message) => ({
          senderName: message.senderName,
          body: message.body,
        })),
      );
      if (intent.engage)
        gate = {
          allowed: true,
          trigger: "passive-intent",
          reason: "passive intent",
        };
    }
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
      roomTitle: this.planTitles.get(roomId) ?? "",
      currentActivities: this.activities.get(roomId) ?? [],
      memberCount: this.memberCounts.get(roomId) ?? 0,
      pollDrafts: this.pollDrafts.get(roomId) ?? [],
    });
    console.log(
      `Room ${roomId}: trigger=${gate.trigger} allowed=${gate.allowed} newMessages=${newMessages.length} reply=${result.reply_text ? "yes" : "no"} ideas=${result.activity_ideas.length}`,
    );

    const priorDrafts = this.pollDrafts.get(roomId) ?? [];
    const confirmation = newMessages.some((message) =>
      !message.isBot && /^(?:yes|yeah|yep|sure|please|go ahead|add (?:them|it)|do it)\b/i.test(message.body.trim()),
    );
    const confirmedNames = confirmation
      ? priorDrafts
          .filter((draft) => draft.awaiting_confirmation && draft.price !== undefined && draft.min_people !== undefined)
          .map((draft) => draft.name)
      : [];
    const createdNames: string[] = [];
    for (const name of confirmedNames) {
      const draft = priorDrafts.find((candidate) => candidate.name === name);
      if (!draft || draft.price === undefined || draft.min_people === undefined) continue;
      try {
        await this.connection.reducers.botAddActivity({
          roomId,
          name: draft.name,
          price: draft.price,
          minPeople: draft.min_people,
          distanceKm: draft.distance_km,
          timeMinutes: draft.time_minutes,
        });
        await this.connection.reducers.clearPollDraft({ roomId, name: draft.name });
        this.removePollDraft(roomId, draft.name);
        createdNames.push(draft.name);
      } catch {
        // A concurrent human add may have claimed this name; preserve the draft for retry.
      }
    }

    const updates = mergePollDraftUpdates([
      ...result.poll_draft_updates,
      ...(result.wants_poll && result.poll_draft_updates.length === 0
        ? result.cold_start_ideas.slice(0, 3).map((name) => ({ name }))
        : []),
    ]);
    for (const update of updates) {
      const existing = priorDrafts.find((draft) => draft.name.toLocaleLowerCase() === update.name.toLocaleLowerCase());
      const complete = (update.price ?? existing?.price) !== undefined && (update.minPeople ?? existing?.min_people) !== undefined;
      const awaitingConfirmation = existing?.awaiting_confirmation || (
        complete && result.confirm_create.some((name) => name.toLocaleLowerCase() === update.name.toLocaleLowerCase())
      );
      await this.connection.reducers.updatePollDraft({
        roomId,
        name: update.name,
        price: update.price,
        minPeople: update.minPeople,
        distanceKm: update.distanceKm,
        timeMinutes: update.timeMinutes,
        awaitingConfirmation,
      });
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
    if (createdNames.length > 0) {
      await this.connection.reducers
        .sendBotMessage({
          roomId,
          body: `Added to the poll: ${createdNames.join(", ")}.`,
          kind: "recap",
          payloadJson: JSON.stringify({ activities: createdNames }),
        })
        .catch((error) =>
          console.error(`sendBotMessage (recap) failed for room ${roomId}`, error),
        );
    } else if (result.reply_text && gate.allowed) {
      await this.connection.reducers
        .sendBotMessage({
          roomId,
          body: result.reply_text,
          kind: "text",
          payloadJson: "{}",
        })
        .catch((error) =>
          console.error(
            `sendBotMessage (reply) failed for room ${roomId}`,
            error,
          ),
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
            console.error(
              `sendBotMessage (places) failed for room ${roomId}`,
              error,
            ),
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
            console.error(
              `sendBotMessage (places-error) failed for room ${roomId}`,
              error,
            ),
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
