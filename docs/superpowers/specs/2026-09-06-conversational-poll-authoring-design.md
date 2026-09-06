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

- [ ] Add `#[spacetimedb::table(accessor = bot_poll_draft, private)] pub struct BotPollDraft` with `room_id: u32` (primary key), `name: Option<String>`, `price: Option<u32>`, `min_people: Option<u32>`, `distance_km: Option<u32>`, `time_minutes: Option<u32>`, `awaiting_confirmation: bool`, `updated_at: Timestamp`.
- [ ] Add a bot-gated reducer `update_poll_draft(ctx, room_id, name?, price?, min_people?, distance_km?, time_minutes?, awaiting_confirmation)` — `require_bot(ctx)?`, upserts the row, only overwriting fields actually passed (use `Option<Option<T>>` or a small patch struct so "field not mentioned this turn" is distinguishable from "field explicitly cleared").
- [ ] Add a bot-gated reducer `clear_poll_draft(ctx, room_id)` — deletes the row once a draft is confirmed and materialized via `bot_add_activity`, or abandoned.
- [ ] Add filtered view `my_bot_poll_draft` (same `ViewContext.sender()` pattern as `my_bot_room_state`) so the bot-service can subscribe to and cache draft state, surviving a bot-service restart.
- [ ] Module tests: non-bot callers rejected on both reducers; a partial patch only changes the fields it names; `clear_poll_draft` removes the row.
- [ ] `cargo fmt --check`, `cargo test`, `spacetime build`, regenerate bindings.

## Task 5 — Poll-drafting conversation logic

**Owner:** bot-service agent. Depends on Tasks 1, 2, and 4.

**Files:** `api/bot-service/openai.ts`, `api/bot-service/service.ts`, `api/bot-service/pollAuthoring.ts` (existing file — extend, don't replace).

- [ ] Extend `askModerator`'s context param with the Task 1 caches: `room_title`, `current_activities`, `member_count`, plus the existing `preference_digest` and the current `poll_draft` state (from Task 4's cached view) so the model always sees what's already been captured.
- [ ] Extend `ModeratorResult`'s JSON schema with: `wants_poll: boolean` (group is expressing intent to decide, with or without a concrete idea yet), `poll_draft_update: { name?, price?, min_people?, distance_km?, time_minutes? }` (only fields the model could newly infer this turn — a partial patch, not a full replace), `cold_start_ideas: string[]` (2-3 candidate activity names, populated only when `wants_poll` is true and the group has given no concrete activity yet — the model should draw on `preference_digest` for budget/people/distance and, when available, the Places suggestions from Task 7), and `confirm_create: boolean` (true only when the draft is complete and the model is explicitly asking "want me to add this?").
- [ ] Update `MODERATOR_SYSTEM_PROMPT` to describe this flow: notice decision intent even without a concrete idea → if blank, propose 2-3 ideas grounded in context → as the group reacts, fill `poll_draft_update` from what's said → ask directly for whatever required field is still missing (`price` and `min_people` are required by `bot_add_activity`'s signature; `distance_km`/`time_minutes` are optional) → once complete, set `confirm_create: true` and ask "want me to add this?" in `reply_text` → only call `bot_add_activity` after the *next* human message reads as an affirmative, never on the same turn `confirm_create` first became true.
- [ ] In `service.ts`: merge `poll_draft_update` into the Task 4 draft state via `update_poll_draft` (never overwrite a field the model didn't mention); when the previous turn had `awaiting_confirmation: true` and the new human message reads as confirmation (reuse the existing sanitization/classification machinery — a second tiny classifier call is acceptable here since it only runs while a draft is actively pending, not on every message), call `bot_add_activity` with the completed draft, then `clear_poll_draft`. If the reply reads as a rejection or a correction, update the draft instead of creating anything.
- [ ] Tests: a fully blank room where the group says "let's just go somewhere" gets 2-3 proposed ideas; a room that names an activity but no price/headcount gets asked for exactly those; a completed draft is not created until an explicit follow-up confirmation; a rejection updates the draft instead of creating it; `distance_km`/`time_minutes` stay optional and don't block creation.

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
- Internal consistency: Task 5's required fields (`price`, `min_people`) match `bot_add_activity`'s actual non-optional parameters; Task 4's new table avoids the view-recreation hazard documented in `docs/decisions.md`'s 2026-09-06 entry.
- Scope check: each task is independently mergeable and testable; only Task 5 has real fan-in (1, 2, 4), matching the "biggest and last" position in the shipping order.
- Ambiguity check: "confirm before create" is pinned to a concrete mechanism (an explicit `confirm_create` flag plus a required next-turn affirmative), not left as a vague instruction to the model.
