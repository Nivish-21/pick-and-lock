# Conversational poll authoring — design spec

## Problem

The bot today only speaks when a keyword regex, a location submission, a decision lock, or a silence timeout tells it to, and even then it has no idea what room it's in: `askModerator`'s context carries chat history and a preference digest, nothing else. It cannot notice a group that wants to decide but has said nothing concrete, it cannot draft a poll on its own, and nothing happens automatically when a room is created or a member arrives with no plan. Manual poll creation (`RoomPage.tsx`'s add-activity form) is the only way an activity gets added unless someone happens to phrase a suggestion the extraction pipeline already catches.

## Goal

The bot becomes the primary way polls get created. It notices genuine intent to decide without requiring an `@mention`, understands the room it's in (title, current options, budget/headcount/distance constraints already stated), proposes ideas when the group has none, fills in a poll draft through conversation, confirms before creating it, and can ask for location access proactively rather than only when it personally needs it. The manual form stays as a hidden fallback, not deleted.

## Non-goals

- No model or provider upgrade. Everything below runs on the existing `gpt-5-nano` chat-completions integration. Revisit only if drafting quality proves to be the bottleneck once this ships.
- No real function/tool-calling loop. The existing pattern — the model returns structured JSON, `service.ts` deterministically turns fields into reducer calls — already gets the same outcome as tool-calling for this bounded set of actions, with far less moving part. `bot_add_activity` already exists; nothing here needs new reducers except the poll-draft state table.
- No Place Details / full review text fetch. Nearby Search already returns rating and review count for free; fetching full review text is a second API call per venue for marginal benefit. Revisit only if ratings alone don't produce good suggestions.
- No deletion of the manual add-activity form. It moves behind a closed disclosure; the code and reducer path are untouched.

## Architecture overview

```
new message batch (existing 2s debounce)
        │
        ├─ heuristic trigger already fired? (direct-address / location-submitted
        │  / decision-milestone / silence-timeout) ──────────────┐
        │                                                        │
        no                                                       │
        │                                                        ▼
        ▼                                              Tier 2: askModerator
  cooldown / minute-cap                                 (full room context,
  already blocking a reply?                              poll-draft state,
        │                                                 cold-start ideas,
        no                                                 confirmation logic)
        ▼                                                        │
  Tier 1: classifyIntent                                         │
  (cheap, message-only, no context)                              │
        │                                                        │
       yes ─────────────────────────────────────────────────────┘
        │
       no → nothing happens this cycle
```

Tier 1 and Tier 2 both call the same model; Tier 1's prompt and expected output are tiny (a few tokens), so running it on every eligible batch is cheap. Tier 2 stays rare — only when Tier 1 or an existing heuristic says something is actually worth reasoning about.

## Task 1 — Cache what the bot already receives but throws away

**Owner:** bot-service agent.

**Files:** `api/bot-service/service.ts` only.

**Problem:** `service.ts` already subscribes to `activity`, `plan`, and `myRoomChat`, but only caches `{ name: string }` per activity and never caches the plan title or a member count anywhere usable by `askModerator`.

- [ ] Extend `CachedActivity` (currently `{ name: string }`) to `{ name: string; price: number; minPeople: number; distanceKm?: number; timeMinutes?: number }`, populated from the existing `activity.onInsert`/subscription-applied handlers (the fields already exist on the `Activity` row from issue #20 — this is a read, not a schema change).
- [ ] Add a `planTitles: Map<number, string>` cache populated from the existing `plan.onInsert`/subscription-applied handlers (`Plan.title` is already subscribed to, just never stored).
- [ ] Add a `memberCounts: Map<number, number>` cache populated by subscribing to `myRoomMembers` (already generated; not currently subscribed to in `service.ts`) and counting rows per `roomId`.
- [ ] Unit test: given a fixture activity/plan/member-count insert sequence, the caches reflect current state after `onApplied` and after subsequent inserts.

## Task 2 — Tier 1 passive-intent classifier

**Owner:** bot-service agent.

**Files:** new `api/bot-service/intentClassifier.ts` (+ test), `api/bot-service/service.ts`, `api/bot-service/speakGate.ts`.

- [ ] Add `SpeakTrigger` value `"passive-intent"` in `speakGate.ts`.
- [ ] Write `classifyIntent(apiKey, messages: { senderName: string; body: string }[]): Promise<{ engage: boolean }>` in `intentClassifier.ts` — a minimal OpenAI call: system prompt is one sentence ("Does this message batch show the group addressing an assistant, asking for suggestions, or stuck without a plan? Reply with JSON {engage: boolean}."), user content is just the raw batch (sender + body, nothing else). No history, no room context — keep the input and output as small as the existing `MODERATOR_SYSTEM_PROMPT` machinery allows, this call must stay cheap.
- [ ] In `service.ts`'s `processRoomUnsafe`, after `decideSpeak` returns `allowed: false` with `reason: "no speak trigger"` (i.e. no heuristic fired) — and only if cooldown/minute-cap aren't independently the blocking reason — call `classifyIntent` on the batch's new messages. If `engage` is true, proceed to Tier 2 exactly as if `decideSpeak` had returned `trigger: "passive-intent", allowed: true`.
- [ ] Test: cooldown-blocked and minute-cap-blocked rooms never call `classifyIntent` (cost control — no point classifying what can't reply anyway).
- [ ] Test: `engage: true` from the classifier flows into the same `askModerator` call path as any other trigger, tagged `"passive-intent"`.

## Task 3 — Room-entry intro and proactive location request

**Owner:** server + bot-service agent.

**Files:** `api/bot-service/service.ts` only (no server reducer changes — reuses `send_bot_message` and the existing `location_request` chat kind).

- [ ] On `Plan.onInsert` (where `service.ts` already calls `ensureBotFriend`), also call `sendBotMessage` twice, back to back: once with `kind: "text"` and a static intro ("Hi, I'm Sorted's planning assistant — mention me anytime, or just tell me what you're deciding and I'll help build a poll."), and once with `kind: "location_request"` so the existing permission button in `RoomChat.tsx` shows up immediately. No LLM call — both messages are static, so this is free and instant, satisfying "as soon as we enter."
- [ ] Guard against double-send: key off `room_id` having zero prior chat rows at the moment `Plan.onInsert` fires (rooms are created empty per the earlier seed-removal fix, so this is a reliable one-time check) rather than adding new persisted state.
- [ ] Test: a freshly created room's chat contains exactly one intro message and one location-request message, in that order, with no LLM call made.

## Task 4 — Poll draft state

**Owner:** server agent.

**Files:** `server/spacetimedb/src/lib.rs`, regenerated `client/src/module_bindings/**`.

**Why a new table, not new columns on `BotRoomState`:** adding columns to an existing table risks the exact view-recreation-disconnects-clients hazard hit and fixed as `b3f07ec` this session. A new table is purely additive — no risk to any existing view.

**Revision (2026-09-06):** a room isn't always narrowing toward one idea — the group may already have several competing named options ("bowling" vs "escape room" vs "arcade"), and the app's existing vote/lock mechanic is exactly what narrows those down. The bot's job is to capture each distinct option as its own draft, not to pick a winner in conversation. So this is a table of concurrent drafts per room, keyed by name, not one draft per room.

- [ ] Add `#[spacetimedb::table(accessor = bot_poll_draft, private)] pub struct BotPollDraft` with `id: u64` (auto-inc primary key), `room_id: u32` (btree index), `name: String`, `price: Option<u32>`, `min_people: Option<u32>`, `distance_km: Option<u32>`, `time_minutes: Option<u32>`, `awaiting_confirmation: bool`, `updated_at: Timestamp`.
- [ ] Add a bot-gated reducer `update_poll_draft(ctx, room_id, name, price?, min_people?, distance_km?, time_minutes?, awaiting_confirmation)` — `require_bot(ctx)?`, upserts by matching `(room_id, name)` (case-insensitive), only overwriting fields actually passed.
- [ ] Add a bot-gated reducer `clear_poll_draft(ctx, room_id, name)` — deletes the one named draft once it's confirmed and materialized via `bot_add_activity`, or abandoned. Confirming several at once means calling this once per name.
- [ ] Add filtered view `my_bot_poll_draft` (same `ViewContext.sender()` pattern as `my_bot_room_state`) so the bot-service can subscribe to and cache all of a room's draft rows, surviving a bot-service restart.
- [ ] Module tests: non-bot callers rejected on both reducers; two drafts with different names in the same room coexist independently; a partial patch to one draft never touches another; `clear_poll_draft` removes only the named row.
- [ ] `cargo fmt --check`, `cargo test`, `spacetime build`, regenerate bindings.

## Task 5 — Poll-drafting conversation logic

**Owner:** bot-service agent. Depends on Tasks 1, 2, and 4.

**Files:** `api/bot-service/openai.ts`, `api/bot-service/service.ts`, `api/bot-service/pollAuthoring.ts` (existing file — extend, don't replace).

**Revision (2026-09-06):** the group may name several competing options in the same conversation ("bowling," "escape room," "arcade") rather than one idea to refine. The bot's job is narrowing *inputs to a poll* (which distinct options exist, what each needs) — never narrowing *the decision itself*; that's what the existing vote/lock mechanic is for. So drafts are a list, and shared constraints (budget, headcount, distance) stated once at the room level apply to every draft that doesn't override them, rather than being asked per option.

- [ ] Extend `askModerator`'s context param with the Task 1 caches: `room_title`, `current_activities`, `member_count`, plus the existing `preference_digest` and the current *list* of `poll_drafts` (from Task 4's cached view) so the model always sees every option already in flight.
- [ ] Extend `ModeratorResult`'s JSON schema with: `wants_poll: boolean` (group is expressing decision intent, with zero, one, or several ideas already named), `poll_draft_updates: Array<{ name: string, price?, min_people?, distance_km?, time_minutes? }>` (one entry per distinct option the model can identify this turn — a new name starts a new draft, an existing name patches it, each entry only carries fields newly inferred), `cold_start_ideas: string[]` (2-3 candidate names, populated only when `wants_poll` is true and the group has named nothing yet — grounded in `preference_digest` and, when available, Task 7's Places suggestions), and `confirm_create: string[]` (names of drafts that are complete and being proposed for creation this turn — may be more than one).
- [ ] Update `MODERATOR_SYSTEM_PROMPT` to describe this flow: notice decision intent → if the group has named nothing, propose 2-3 ideas → if the group has named one or more options, open or patch a draft per name → apply room-level budget/headcount/distance (from `preference_digest`) to every draft lacking its own value, so the same question is never asked once per option → for any draft still missing `price` or `min_people` (the two required by `bot_add_activity`), ask directly, naming which option the question is about when more than one draft is open → once one or more drafts are complete, list them in `confirm_create` and ask "want me to add these as options: A, B?" → only call `bot_add_activity` for a given name after a *later* human message affirms it, never on the same turn it first became complete.
- [ ] In `service.ts`: merge each entry of `poll_draft_updates` into Task 4's draft table via `update_poll_draft`, keyed by name (never overwrite a field, or a different draft, the model didn't mention); when a prior turn set `awaiting_confirmation: true` on one or more drafts and the new human message reads as confirmation (a second tiny classifier call is acceptable here — it only runs while drafts are pending, not on every message), call `bot_add_activity` once per confirmed name, then `clear_poll_draft` for each. A rejection or correction on one draft updates or removes only that draft, leaving sibling drafts untouched.
- [ ] Tests: a blank room gets 2-3 proposed ideas; a room naming three options in one message opens three independent drafts; a room-level "we're 6 people, under $30" fills that field on every open draft without being asked again per option; confirming two of three pending drafts creates exactly those two and leaves the third open; a rejection on one draft doesn't affect the others; `distance_km`/`time_minutes` stay optional and don't block creation.

## Task 6 — Places rating enrichment

**Owner:** bot-service agent. Independent of Tasks 1-5; consumed by Task 5's cold-start suggestions when available.

**Files:** `api/bot-service/places.ts`.

- [ ] Extend `findNearbyPlaces`'s return type to include `rating?: number` and `userRatingsTotal?: number` from the existing Nearby Search response (already present in the API response today, currently discarded).
- [ ] Pass this through to `askModerator`'s context when a location is on file for the room, so `cold_start_ideas` (Task 5) can be grounded in real nearby options with a rating signal, not just generic activity names.
- [ ] Test: a fixture Nearby Search response with rating data surfaces `rating`/`userRatingsTotal` on the returned places; a response missing those fields degrades to `undefined`, not a thrown error.

## Task 7 — Hide the manual form behind a fallback disclosure

**Owner:** client agent. Independent of all other tasks; safe to ship any time.

**Files:** `client/src/pages/RoomPage.tsx` only.

- [ ] Wrap the existing add-activity form (`RoomPage.tsx:92`, `addActivity`) in a closed-by-default disclosure ("Add manually ▾"). No reducer, schema, or test-visible-behavior change — the form still works identically once opened.
- [ ] Update the form's existing tests only if they currently assume the form is visible by default; add one test confirming the disclosure starts closed and the form becomes visible and functional once expanded.

## Suggested shipping order

1. Task 1 (caching) — foundational, zero user-visible change, safe to verify in isolation.
2. Task 3 (entry intro + location ask) — small, static, immediately visible win.
3. Task 7 (hide manual form) — independent, ship whenever convenient.
4. Task 4 (draft schema) — additive server change, needs its own publish/verify cycle.
5. Task 2 (Tier 1 classifier) — needs Task 1's context to be worth anything.
6. Task 6 (Places rating) — independent, can land before or after Task 5.
7. Task 5 (drafting conversation) — the big one; depends on 1, 2, and 4 all being live and verified first.

## Plan self-review

- Placeholder scan: every task names its files, owner, and a concrete checklist; no TBDs.
- Internal consistency: Task 5's required fields (`price`, `min_people`) match `bot_add_activity`'s actual non-optional parameters; Task 4's new table avoids the view-recreation hazard documented in `docs/decisions.md`'s 2026-09-06 entry; Task 4's `(room_id, name)`-keyed drafts and Task 5's list-shaped `poll_draft_updates`/`confirm_create` agree on supporting multiple concurrent options rather than one draft per room.
- Scope check: each task is independently mergeable and testable; only Task 5 has real fan-in (1, 2, 4), matching the "biggest and last" position in the shipping order.
- Ambiguity check: "confirm before create" is pinned to a concrete mechanism (an explicit `confirm_create` flag plus a required next-turn affirmative), not left as a vague instruction to the model.
