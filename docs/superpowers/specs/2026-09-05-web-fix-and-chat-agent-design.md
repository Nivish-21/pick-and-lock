# Design: fix the web app, add a chat-embedded AI decision agent

Status: approved by repository owner on 2026-09-05. Telegram is scrapped — everything runs on the existing SpacetimeDB-backed web app.

## 1. Diagnosis (why the UI is "severely broken")

Read from actual source, not from status docs:

- The deployed app is two half-integrated systems. **v1** (`create_room` / `Activity` / `propose` / `accept` / `drop_out` in `server/spacetimedb/src/lib.rs`) is live, tested, and deployed to Maincloud. **v2 private decision engine** (`create_private_room` / `propose_private_choice` / `set_private_vote` / `accept_private_proposal`) is ~630 uncommitted lines in `.worktrees/private-decision-engine`, never merged, never wired to any client page.
- `client/src/pages/LandingPage.tsx` renders `saturdayOpenView`, a **static import from `client/src/fixtures/room.ts`**, instead of the live `RoomView` the app already receives from `RoomDataBridge`. This is the literal cause of "I entered details and it's still hardcoded" — the preview board can never reflect a real created room.
- `client/src/pages/CreateRoomPage.tsx` only collects a title and date. The server always calls `seed_activities()` with a fixed activity list for every new room — there is no reducer path, and no UI, for a creator to define their own choices. "Create your own poll" does not exist yet in any reachable flow.
- Chat does not exist anywhere in `lib.rs`. It was only ever a bullet in `docs/room-insights-spec.md`, and that branch was rejected for an incompatible Maincloud migration and never merged.

## 2. Scope and lane ownership

Two people building in parallel, each with their own coding agent, on the same repo:

| Lane | Owner | Paths | Depends on |
|---|---|---|---|
| **A — Decision engine** | Teammate's agent (existing `server/private-decision-engine` worktree) | `server/spacetimedb/src/lib.rs` (custom choices/votes/proposals/lock/reopen/decisions/metrics), regenerated bindings | Nothing new — already in flight |
| **B — Client wiring fix** | This session's Codex build | `client/src/pages/**`, `client/src/components/**`, `client/src/fixtures/**` (delete unused fixture import), `client/src/App.tsx` | Lane A's reducer contract (create-room-with-choices) |
| **C — Chat + location schema** | This session's Codex build | `server/spacetimedb/src/lib.rs` (new, additive: `chat_message`, `member_preference`, `bot_room_state`, `location_submission` tables + reducers), regenerated bindings | Nothing — additive, independent of Lane A's tables |
| **D — Bot service** | This session's Codex build | New top-level `bot/` directory (Node/TypeScript, standalone process) | Lane C's schema + contract |
| **E — Verification** | This session's Codex build | `client/e2e/**` additions, `bot/test/**`, manual two-tab/restart scripts | Lanes B, C, D |

Lane C is additive-only (new tables, no edits to existing ones) specifically so it can be merged independently of whatever Lane A produces, minimizing conflict surface in the shared `lib.rs` file. Whoever merges second resolves the textual merge; neither lane edits the other's reducers.

## 3. Data model (Lane C — new, additive)

```rust
// Chat, room-scoped. Sender is either a human Friend or the reserved bot identity.
struct ChatMessage {
    id: u64,               // auto-inc primary key
    room_id: u32,          // FK to Plan/Room
    sender_identity: Identity,
    sender_name: String,   // denormalized for display; bot uses "AI Concierge"
    is_bot: bool,
    body: String,          // max 500 chars, validated at reducer boundary
    kind: String,          // "text" | "location_request" | "place_suggestions" | "recap"
    payload_json: String,  // structured data for kind != "text" (e.g. suggestion cards)
    sent_at: Timestamp,
}

// Durable, attributed, per-person facts extracted from chat. Visible to the whole room.
struct MemberPreference {
    id: u64,
    room_id: u32,
    friend_id: u32,
    friend_name: String,   // denormalized for the "who said what" panel
    statement: String,     // short paraphrase, e.g. "No seafood, budget under 500"
    category: String,      // "dietary" | "budget" | "timing" | "access" | "other"
    source_message_id: u64,
    recorded_at: Timestamp,
}

// One row per room. Deterministic speak-gate state, so it survives a bot process restart.
struct BotRoomState {
    room_id: u32,           // primary key
    last_bot_message_at: Option<Timestamp>,
    bot_messages_in_current_minute: u32,
    minute_window_started_at: Timestamp,
    last_processed_message_id: u64,  // watermark: bot has extracted/considered up to here
}

// A member's shared location, used once to drive a Places lookup.
struct LocationSubmission {
    id: u64,
    room_id: u32,
    friend_id: u32,
    lat: f64,
    lng: f64,
    submitted_at: Timestamp,
}
```

Reducers (all room-membership-gated the same way existing `set_answer`/`propose` are — reject if caller has no active `Friend`/`RoomMembership` row for that room):

- `send_chat_message(room_id, body)` — human callers only (`is_bot` forced false); rejects if caller isn't an active member; body 1-500 chars.
- `send_bot_message(room_id, body, kind, payload_json)` — **only** callable by the identity in `BOT_IDENTITY` (an env-configured public key baked into the server at build time, or checked against a seeded row); updates `BotRoomState` in the same transaction (cooldown bookkeeping) so speak-limits are enforced server-side, not trusted to the bot process.
- `record_preference(room_id, friend_id, statement, category, source_message_id)` — bot-identity-only.
- `submit_location(room_id, lat, lng)` — human callers only; validates lat/lng ranges.

Client-visible views: `my_room_chat` (messages for rooms the caller is active in), `my_room_preferences` (grouped by `friend_name` for the "who said what" panel) — same caller-filtered-view pattern already used for `my_rooms`/`my_room_members`.

## 4. Bot service architecture (Lane D)

Standalone Node/TypeScript process in `bot/`. **Not inside the SpacetimeDB module** — reducers run in a sandboxed WASM module with no outbound network access, so an LLM/Places call cannot happen from inside `lib.rs`. The bot connects to SpacetimeDB the same way a browser client does, using the TS SDK, authenticated with a **stable, persistent identity/token stored in `bot/.env` (`BOT_SPACETIME_TOKEN`)** — never regenerated on restart, so `ctx.sender == BOT_IDENTITY` checks in reducers stay valid across the bot's whole lifetime.

**One process, one connection, many rooms.** A single subscription covers `chat_message`, `my_room_members`, and `location_submission` across every room the bot has joined. An in-memory router keyed by `room_id` dispatches each row-insert event to a per-room handler. This is deliberately not a job queue or worker pool — the work is I/O-bound (waiting on HTTP calls), so Node's event loop handles the hackathon's room count without extra infrastructure. *(ponytail: single-process in-memory router; upgrade to a queue only if room count exceeds one event loop's comfortable concurrency — not expected for this deadline.)*

**Per-room cycle, triggered by debounce:**
1. New `chat_message` or `location_submission` row arrives for a room → (re)start a 3-second debounce timer for that room, cancelling any pending timer.
2. On timer fire: gather (a) all `chat_message` rows since `BotRoomState.last_processed_message_id`, (b) current room state (choices, answers, proposal/lock status) already present in the local subscription cache — no extra query needed, and (c) the room's `my_room_preferences` rows as a compact digest.
3. Compute the **deterministic speak trigger** in code (not by asking the model): directly addressed by name/handle; a `LocationSubmission` just landed (always answer); a decision milestone (proposal just created, or about to lock); or a silence timeout (no messages for N minutes AND not everyone has answered). If none of these fire, `allowed_to_speak = false` for this cycle.
4. **One LLM call**, always, using the batched new messages + the digest as context, requesting structured/tool-call output: `{ reply_text: string | null, extracted_preferences: [{friend_id, statement, category}], place_query_needed: bool }`. The prompt explicitly instructs: if `allowed_to_speak` is false, return `reply_text: null` — extraction still happens either way. This is one call per debounce-quiet cycle per room, not one call per message.
5. If `reply_text` is non-null: call `send_bot_message` — but the reducer itself re-checks `BotRoomState` cooldown (last message < 25s ago, or 3+ messages in the current 60s window) and rejects if the hard cap is already hit, so a bug in step 3 can't spam a room. If rejected, the bot just drops that reply — it isn't queued or retried, since a stale nudge from a since-resolved moment isn't worth resurfacing.
6. For each row in `extracted_preferences`: call `record_preference`. Advance `last_processed_message_id`.
7. If `LocationSubmission` triggered this cycle: call Google Places (Nearby Search) server-side with the submitted lat/lng and any dietary/budget preferences pulled from the digest as query hints; on success, `send_bot_message` with `kind: "place_suggestions"` and a JSON payload of venue cards; on failure or timeout, `send_bot_message` with a plain apologetic fallback — never leave the room waiting silently.

**Crash-recoverability**: nothing the bot decides depends on its own process memory surviving. `last_processed_message_id` and cooldown counters live in `BotRoomState`. If the process restarts, it resubscribes, reads `BotRoomState` for every room, and resumes — no duplicate greeting, no re-processing of already-seen messages.

**External calls**: every OpenAI-compatible (aigrants `gpt-5-nano`) and Google Places call gets an explicit 8-second timeout and one retry with backoff before falling back to a plain in-chat error message. No bare fetch without a timeout.

## 5. Client UI additions (Lane B)

- Delete the `saturdayOpenView` import from `LandingPage.tsx`; render the room's actual live activities/choices from the `RoomView` prop it's already handed by `RoomDataBridge`.
- `CreateRoomPage.tsx` gains a repeatable "add a choice" field list, sent to whatever create-room-with-choices reducer Lane A ships (exact signature confirmed against Lane A's contract before wiring — do not guess it).
- New `RoomChat` component: message list (renders `kind: "text"` normally, `"location_request"` as a card with a "Share my location" button wired to `navigator.geolocation.getCurrentPosition`, `"place_suggestions"`/`"recap"` as structured cards), a "AI Concierge is typing…" indicator that appears the instant the bot's debounce timer would plausibly be running (approximate client-side proxy: show it for up to 8s after the bot's last-seen activity in the room, hide on the next bot message).
- New `GroupInputPanel` component: subscribes to `my_room_preferences`, groups rows by `friend_name`, renders a live "who said what" list. Pure subscription render — no LLM involved, effectively instant.

## 6. Explicit non-goals (deliberately out of scope for this pass)

- No cross-session/cross-room user memory or accounts. Identity is still a name typed into a room; `MemberPreference` is room-scoped only.
- No Telegram integration of any kind.
- No Maincloud schema publish or production deploy without the repository owner's explicit confirmation, per the existing non-negotiable boundary in `docs/next-agent-takeover.md`.
- No voice (the `SMALLEST_API_KEY` credential is not used by this design; flag if that's wanted later).
- No load-balancing/queueing infrastructure for the bot service beyond the single-process router described above.

## 7. Verification plan (Lane E)

- **Two-tab test**: message in tab A appears in tab B without refresh; time the round trip.
- **Bot-restart test**: kill the bot mid-conversation, restart it, confirm no duplicate greeting and no lost `MemberPreference` rows — proves crash-recoverability, not just "seems to work."
- **Cross-room isolation test**: two rooms active simultaneously; assert the bot's replies/preferences in room A never reference room B's data (extend the existing `outsider_has_no_visible_private_room_ids`-style test pattern already in `lib.rs`'s test module).
- **Concurrency race test**: two members submit location at the same moment; both `LocationSubmission` rows land, both get a response, no dropped write (same style as the existing "two concurrent proposals → one success, one sender error" gate in `AGENTS.md`).
- **Chattiness test**: send 10 rapid unrelated messages in under 20 seconds; assert at most 1 bot message resulted (proves the debounce + deterministic gate, not just "the demo looked fine once").
- **Latency measurement**: log timestamp deltas (message insert → bot pickup → LLM response → reducer write → client receipt) to console/a simple log line, so the ~4-7s budget is measured, not assumed.

## Self-review

- No placeholders/TBDs remain; every table/reducer above has a concrete shape.
- Internal consistency: Lane C is additive-only and doesn't touch Lane A's tables, matching the stated conflict-avoidance rationale.
- Scope: this spec covers Lanes B-E only; Lane A (decision engine) is the teammate's pre-existing, separately-owned worktree and is referenced, not redefined, here.
- Ambiguity resolved explicitly: memory = per-room only (stated); speak-gate = deterministic-first, LLM-second (stated); bot runs external to the WASM module (stated, with the reason).
