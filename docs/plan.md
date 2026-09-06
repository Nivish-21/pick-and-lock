# Active execution plan — 2026-09-06 checkpoint (most recent, read this first)

## Task block: enable the bot in production — DONE

Owner decision: ship human-only chat to the first real tester now, build and verify the bot in the background, only announce it once fully working. All five steps below completed and independently verified; bot is live in production.

- [x] **Step 1 — generate a bot SpacetimeDB identity + token.** Owner ran `api/bot-service/generate-identity.ts` themselves; identity printed (public/safe), token written directly into `.env` (never printed by me).
- [x] **Step 2 — rebuild and republish with `BOT_IDENTITY` set.** `BOT_IDENTITY=<identity> spacetime publish pick-and-lock --module-path server/spacetimedb --yes=remote` — no table/column changes, compile-time constant only.
- [x] **Step 3 — confirm remaining bot-service env vars.** `OPENAI_API_KEY` and `GOOGLE_PLACES_API_KEY` both confirmed working via masked test calls (status codes only, values never printed).
- [x] **Step 4 — run `api/bot-service` persistently.** Superseded the original "run on the owner's machine" plan entirely — see the Render section below; this sandboxed tool cannot keep any detached long-running Node process network-connected (confirmed four separate ways), so a real always-on host was required immediately, not just "for later."
- [x] **Step 5 — end-to-end verification.** Confirmed live twice via direct SpacetimeDB SQL queries against `my_room_chat`/`my_bot_room_state` (not just the browser): `@sorted` triggers a real OpenAI call and a real `sendBotMessage` reply. Two apparent "bot didn't reply" cases were root-caused as correct guardrail behavior (bare "sorted" without `@` is deliberately not a trigger; 25s cooldown was still active), not bugs. **Not yet done**: a live-adversarial guardrail test and an autonomous `bot_add_activity` poll-authoring test against the now-live deployment (the mocked unit tests cover this logic, but nothing has exercised it against a live LLM + live database together since the diagnostic-logging deploy went out).

## Bot-service hosting — Render (superseded Cloudflare Containers below)

Three hosts attempted in sequence; Render is what's actually live. Cloudflare Containers (original plan, kept below for the record) was fully built and proven working locally via Docker, then blocked at deploy time: Containers require the Workers **Paid** plan, this account is Free — not a bug, an account-tier wall. Fly.io: `flyctl auth login` requires a real interactive TTY neither this tool nor the owner's own terminal (via the `!` prefix) could provide. Koyeb: mid-acquisition by Mistral, dashboard non-functional at the time (confirmed via screenshot).

Render (`render.yaml`, repo root) is live at `https://sorted-bot-service.onrender.com`, service ID `srv-dae9gt67bikc738ic13g`. Simpler than the Docker path — Render checks out the whole repo, so the bot-service's relative import into `client/src/module_bindings` needs no path rewriting, just a `node_modules` copy step in `buildCommand` (same underlying issue as Cloudflare: `spacetimedb` isn't resolvable from `client/src/module_bindings` on a clean checkout since Node's `node_modules` resolution never crosses into the sibling `api/bot-service` directory). `index.ts` gained a dynamic-`$PORT` health server for Render's health check. Owner logged in via `render login`'s device-authorization flow (no credentials seen by me); owner pasted the three secret env vars into Render's dashboard directly (one, `OPENAI_API_KEY`, needed re-pasting after a mismatch on first deploy).

- [x] Add health server to `index.ts`, add `render.yaml`, deploy via Render Blueprint (owner connected the GitHub repo in the dashboard).
- [x] Fix monorepo `node_modules` resolution in `buildCommand`.
- [x] Fix `OPENAI_API_KEY` mismatch (owner re-pasted in Render dashboard).
- [x] Verify live twice via direct SpacetimeDB SQL queries.
- [ ] Confirm `GOOGLE_PLACES_API_KEY` in Render's dashboard matches the now-working local value — it was set during initial Blueprint setup, before the key was confirmed working locally; worth the same re-check `OPENAI_API_KEY` needed.
- [ ] Run the Step 5 live-adversarial + autonomous-poll-authoring verification pass against the current live deployment (diagnostic-logging commit `f81e810`).

**Step 6 — owner decides when to tell the tester the bot is live.**
This is purely backend enablement — no new URL, no client redeploy needed (the client-side chat UI already works, it was only ever the bot's own authentication that was missing). Once step 5 passes, the same room the tester is already using will just start getting bot replies.

## Task block: kill hardcoded seed data, real date/time, bot hardening (2026-09-06)

Issues #20 and #21 both merged and independently re-verified; live-testing them together on production found and fixed three real bugs directly (mechanical, not new feature work): (1) SpacetimeDB requires `#[default(...)]` on new columns added to an existing table — publish failed without it on `Activity.distance_km`/`time_minutes`; (2) `planSelectors.ts` never copied the new distance/time fields into `ActivityView`, so they never displayed despite the form/reducer/display code all being wired; (3) `my_room_chat`/`my_room_preferences` are views scoped to every room the caller has ever joined, not the room being viewed — the client never filtered by current `plan_id`, so a caller in multiple rooms saw all their chats mixed together. All three fixed, verified, published/deployed.

Owner also flagged: every new room was getting hardcoded "Bowling/Escape room/Game night" activities (from `create_room` calling `seed_activities`) — removed, since activities should only come from manual entry or the bot, never hardcoded. Fixed, verified (no schema change, clean republish), deployed.

Two new disjoint lanes opened for the next round, both builders idle and ready:
- **Issue #25, branch `client/room-datetime`:** replace the free-text "When?" field with a real `<input type="datetime-local">`, add `Plan.scheduled_at: Option<Timestamp>` (additive, needs `#[default(None)]`), `create_room` gets a new required `scheduled_at` param. Touches server `Plan`/`create_room` + `CreateRoomPage.tsx` + `spacetime.ts`'s `createRoom` action only.
- **Issue #26, branch `bot/hardening`:** strengthen the bot's system prompt against off-topic/role-play/jailbreak requests, tune `speakGate.ts`'s triggers to reduce unnecessary chatter, and tighten debounce/timeout values to reduce latency where safe. `api/bot-service/**` only.

These two lanes are fully disjoint from each other (no shared files) — no merge-conflict risk expected. Neither merges into `main` until independently re-verified, same discipline as every prior lane. The `#[default(...)]` requirement and the "will disconnect clients" migration warning are now known patterns for any future additive schema change — check for both before publishing.

## Task block: beyond-core-loop merge, ship, and two new parallel lanes (2026-09-06)

Owner decision: get the verified core loop + chat feature in front of real testers now rather than gating on more feature work — tester feedback has latency, so start that clock early. In parallel, two genuinely disjoint new lanes proceed on their own branches (never merged until independently re-verified, same as every prior lane).

**My work (infra/verification, not new product code) — all done:**
1. ~~Live-test current `main` end-to-end~~ — done.
2. ~~Merge the isolated `pick-and-lock-beyond-core-loop` feature~~ — done as PR #22 (`ebd12c9`).
3. ~~Deploy to Vercel, confirm the Maincloud DB matches what's published~~ — done; republished Maincloud (owner-confirmed, additive-only), redeployed client, confirmed `pick-and-lock.vercel.app` aliased to latest.
4. Live-tested the integrated build, found and fixed a real bug (`/insights` "Invalid Date" — `Timestamp` needs `.toDate()`, not `Number()`), re-verified, redeployed. **Ready for real testers.**

Open item: mobile viewport couldn't be visually confirmed this session (browser-automation resize tool didn't affect actual page viewport). CSS is mobile-first by construction (base = stacked, `min-width` queries add desktop columns) so it's likely fine, but worth a real-device check.

**Builder A — issue #20, branch `client/activity-constraints`:** add `distance_km`/`time_minutes` as optional display/filter attributes on `Activity` (additive schema, not a feasibility-matching engine — owner explicitly chose the smaller scope). Touches the server `Activity` struct + `add_activity`/`bot_add_activity` reducers, and ONLY the "Add an option" form block in `client/src/pages/RoomPage.tsx`, plus `ActivityCard.tsx`, `spacetime.ts`, `fixtures/room.ts`.

**Builder B — issue #21, branch `client/room-chat-wiring`:** replace the `TODO(issue #16)` placeholder chat wiring with real `my_room_chat`/`my_room_preferences` subscriptions and `sendChatMessage`. Touches ONLY the `RoomSidebar` block in `client/src/pages/RoomPage.tsx` plus chat-related additions to `spacetime.ts`.

Both lanes touch `RoomPage.tsx` but in disjoint regions (form block vs. sidebar block) — same pattern that already merged cleanly for #16/#17. Neither merges into `main` until independently re-verified by re-running the full test/lint/build suite myself, not just trusting the builder's self-report.

## Resume point

Both chat-feature lanes are merged into `main`: issue #17 (onboarding + split-chat layout, PR #18) and issue #16 (server retarget to `Plan.id` + `bot_add_activity`/`ensure_bot_friend` + autonomous poll authoring, PR #19) — both independently re-verified, not just self-reported. To resume:

1. ~~Check GitHub issue #16~~ — done, merged as PR #19 (`70e0ca5`).
2. Regenerate/confirm `client/src/module_bindings` is current (PR #19 already includes `bot_add_activity_reducer.ts`/`ensure_bot_friend_reducer.ts`), then replace the `TODO(issue #16)` placeholder chat wiring in `client/src/pages/RoomPage.tsx` (`messages={[]}`, `onSend={placeholderSendChat}`) with the real `my_room_chat`/`my_room_preferences` subscriptions and `sendChatMessage` action (client-side plumbing pattern already established in `RoomDataBridge.tsx`/`spacetime.ts` for `activity`/`friend`/etc.). This is not yet a filed issue — needs a new prompt/issue before either builder can pick it up.
3. Re-run full verification (server + client + bot-service, see PR #19's body for the exact command list), then publish to Maincloud again with explicit owner confirmation (`spacetime publish pick-and-lock --module-path server/spacetimedb --yes=remote` — additive-only, verify with `git diff <prev> HEAD -- server/spacetimedb/src/lib.rs` that no existing table's columns changed, same check performed before every publish so far).
4. Live-browser-test the merged result the same way this session did (create a room, join, exercise the feature, check console/network) before considering it done — unit tests alone missed both the "module not republished" and "wrong room schema" defects this session found.

Everything below this point is prior-session history, kept for context; `docs/status.md` and `docs/changelog.md` have the full detailed log of what was merged, verified, and published.

## Where this stands right now (2026-09-05, superseded by Resume point above)

Design approved. Spec written and committed to:
`docs/superpowers/specs/2026-09-05-web-fix-and-chat-agent-design.md`

That spec is the source of truth for: diagnosis of the broken UI, lane ownership (A=teammate's decision-engine worktree, B=client wiring fix, C=chat+location schema, D=bot service, E=verification), the full data model, the bot's deterministic speak-gate design, and the non-goals list. Read it before doing anything else in this repo.

**Not yet done**: the detailed, self-contained task-by-task implementation plan (one per lane, written so a Codex CLI instance can run each unattended for hours without live steering). Next action on resuming: invoke `superpowers:writing-plans` against the spec above, scoped to Lanes B/C/D/E, and produce the exact per-lane prompts the user pastes into Codex.

## Environment facts established this session (do not re-derive)

- Two people building in parallel: this session (client/chat/bot) + a teammate driving the existing `server/private-decision-engine` worktree (Lane A). A peer Claude session `development-de` (idle) also exists in this repo's history but the user confirmed both humans keep separate parallel agents — no ownership collapse.
- LLM: AI Grants India key, OpenAI-compatible proxy at `https://aigrants.in/v/gpt`. Models available on that key: `davinci-002`, `gpt-5-nano`, `gpt-5.6-luna`, `text-embedding-3-small`, `text-embedding-ada-002`. Design targets `gpt-5-nano` for the bot's per-turn call.
- Voice credit key (`SMALLEST_API_KEY`, smallest.ai, `https://aigrants.in/v/sm`) exists but is explicitly **not used** by the current design — flagged as out of scope, not wired anywhere.
- Google Places API key: user confirmed they have one with free-tier headroom. **Not yet verified working** — next action once the real key is in `.env`: run one masked test call (Nearby/Text Search) and report only the HTTP status, never the key value.
- Secrets handling: `.gitignore` now ignores `.env`/`.env.*` (was previously NOT ignoring env files at all — fixed this session, verified with `git check-ignore -v .env`). `.env.example` and `.env` (empty template, gitignored) exist at repo root with `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `SMALLEST_API_KEY`, `SMALLEST_BASE_URL`, `GOOGLE_PLACES_API_KEY`. The real key values the user pasted in chat arrived already truncated/stripped — never obtained the raw values; user must fill `.env` directly in their editor, never paste secret values into this chat again.
- Codex CLI: `which codex` resolves to `/Users/nivish/.superset/bin/codex` — this is **Superset.app's own wrapped/managed agent CLI** (its own `auth.json`, model already set to `gpt-5.6-terra`, plugin/marketplace system layered into the shared `~/.codex/config.toml`). It has no visible `[model_providers.*]` section and is very likely tied to Superset's own billing, not a raw configurable OpenAI endpoint.
- A **separate, real, standalone `@openai/codex@0.150.1`** is already installed via npm and symlinked at `/opt/homebrew/bin/codex` — currently shadowed on PATH by Superset's binary of the same name. This is the one to point at the aigrants key (see instructions below), invoked by its full path to bypass the shadow.

## Codex CLI setup — hand this to the user, do not do it for them

1. Fill in the real key values directly in `/Users/nivish/development/Moonshot/.env` (already created, gitignored) — never paste them into a chat session again.
2. To use the real, standalone Codex CLI (not Superset's wrapper), invoke it by full path: `/opt/homebrew/bin/codex`. Superset's `~/.superset/bin/codex` shadows it earlier on PATH under the plain `codex` name.
3. Before running, export the two env vars so the real Codex CLI's default OpenAI provider points at the aigrants proxy instead of api.openai.com:
   ```
   export OPENAI_API_KEY="<value from .env>"
   export OPENAI_BASE_URL="https://aigrants.in/v/gpt"
   ```
4. Pass the model explicitly on every invocation, since Codex CLI's own default model will not exist on the aigrants proxy: `/opt/homebrew/bin/codex --model gpt-5-nano ...` (or `gpt-5.6-luna` for heavier reasoning tasks — the plan below will say which lane uses which).
5. Sanity-check with a trivial prompt first (e.g., "reply with OK") before pointing it at a multi-hour unattended build — confirm it actually reaches the aigrants proxy and doesn't silently fall back to Superset's or a cached default provider.
6. **Exact TOML syntax for a persistent `[model_providers.aigrants]` block was not verified against current Codex CLI docs this session** — if step 3's env-var approach doesn't stick across invocations, check `https://aigrants.in/v/gpt`'s own setup guide (the user already has this link) before guessing at config.toml keys.

## Next steps in order

1. Resume with `superpowers:writing-plans`, input = the committed spec, scope = Lanes B, C, D, E only (Lane A stays the teammate's).
2. Output: one self-contained prompt per lane (Codex will run each unattended for hours — lunch/dinner/nap/events happening in parallel), each with: exact files to touch, exact commands to verify (build/test/lint), a hard "do not publish to Maincloud / do not deploy without explicit owner confirmation" boundary, and a definition of done.
3. Recommend git worktrees per lane (matching this repo's existing `.worktrees/` convention) so parallel Codex instances don't collide on the same files, especially since Lane C touches the same `lib.rs` file Lane A is already mid-editing.
4. User runs each lane's prompt in its own Codex CLI invocation/worktree; this session checks progress when asked ("babysitting" role — verify commits, run quality gates, do not re-do the build).

## 2026-09-05 update — Codex CLI investigation outcome + security incident

**Corrected facts (supersede the "Environment facts" and "Codex CLI setup" sections above where they conflict):**

- `https://aigrants.in/v/gpt` is **not** an API base URL — it's a personal redirect link that 307s to a ChatGPT share page. Live-tested: every OpenAI-compatible path under it (`/v1/chat/completions`, `/v1/responses`, `/v1/models`) returns 404 with the marketing site's HTML. `OPENAI_BASE_URL` must be removed from `.env` / `.env.example` — there is no proxy. The key is a **real OpenAI API key**, verified live against `https://api.openai.com/v1/chat/completions` (HTTP 200, real completion from `gpt-5-nano-2025-08-07`).
- This org's key only has access to: `gpt-5-nano`, `gpt-5.6-luna`, `gpt-5.6-sol`, `text-embedding-3-small`, `text-embedding-ada-002` (confirmed via live `/v1/models`, not the possibly-stale list the user was told).
- Codex CLI (`/opt/homebrew/bin/codex`, tested at both 0.150.1 and 0.153.4 — user updated mid-session, no change) defaults to stored ChatGPT-login auth (`model: gpt-5.6-terra`) and ignores `OPENAI_API_KEY` as a plain env var. Fix: `codex login --with-api-key` (reads key from stdin), which writes real auth state — must be done against an **isolated `CODEX_HOME`** so it doesn't clobber the user's normal ChatGPT-logged-in Codex used elsewhere (Superset, other projects). Isolated home created at `~/.codex-aigrants`; project profile at `~/.codex-aigrants/pickandlock.config.toml` (`model = "gpt-5-nano"`, `[tools] web_search = false`).
- **Hard blocker, confirmed on both CLI versions, not fixable via any documented client-side config** (`tools.web_search=false`, feature flags, fresh login all tried): every `codex exec` call fails on the first turn with `Tool 'web_search_preview' disabled for this organization.` Codex CLI unconditionally requests this hosted tool via the Responses API (Chat Completions wire format is hard-removed in these versions — `wire_api = "chat"` errors at config load). This is an OpenAI-org-level permission on the AI Grants India account, not something Codex CLI, this repo, or the key holder can toggle from the client side.
- Options on the table, presented to the user: (a) org admin enables the hosted tool at `platform.openai.com/settings/organization/data-controls/hosted-tools`, or (b) drop Codex CLI as the build executor and have this session run the unattended build directly instead. **Decision point still open** — pending key rotation (below) before re-testing.

**Security incident — key rotation required, blocks everything above:**

The API key currently in `.env` (`sk-proj-aFf...`) was pasted in plaintext into a teammate's ("prana", Windows) personal ChatGPT conversation, which they then shared via a public `chatgpt.com/share/...` link and sent to this session. ChatGPT itself told them to revoke it. Anyone with that share URL can read the raw key. **Do not proceed with any further build work on this key until it is rotated.** Once a new key exists:
1. User pastes it in chat as before (a hook strips it before it reaches this session and writes straight to `.env` — confirmed working, key never entered this session's context).
2. Re-run the masked live verification against `api.openai.com` (same method as above) and re-run `codex login --with-api-key` against `~/.codex-aigrants` with the new key.
3. Re-test one `codex exec` turn to see if the `web_search_preview` block still applies (it's an org setting, not tied to the specific key, so expect it to persist unless the org dashboard was changed).

**Current action:** starting Lane B (client wiring fix — `LandingPage.tsx` hardcoded fixture, missing custom-poll UI, `CreateRoomPage.tsx`) directly in this session while key rotation is pending, since that work has no dependency on the LLM key or Codex CLI.

## Lane B — add-activity client wiring (2026-09-05)

Goal: expose the existing server `add_activity` reducer through the live client room UI, with focused success and error coverage.

Scope: `client/src/pages/**`, `client/src/components/**`, `client/src/data/**`, `client/src/fixtures/room.ts`, `client/src/module_bindings/**`, and `client/src/styles/room.css`. Generated bindings are regenerated, not hand-edited. No server or proposal/vote changes.

- [x] Regenerate TypeScript bindings and confirm the generated reducer method/signature.
- [x] Add `addActivity(name, price, minPeople)` to the bridge actions and `RoomActions`; keep fixture actions no-op.
- [x] Add the joined-room form, using the existing `runAction` toast error path and current room styling.
- [x] Add focused React Testing Library coverage for valid arguments and reducer failure toast; run the focused test red before implementation, then green.
- [x] Run all requested Rust/client verification commands plus `git diff --check`.
- [x] Append completion state to `docs/status.md` and `docs/changelog.md`, commit, push, and comment on issue #12.

Assumptions: the form is available on open joined rooms because `RoomPage` is only rendered after joining; no separate membership field exists in `RoomView`, so the server remains the authority for rejecting unauthorised calls. The required project logs are procedural files despite the source-only ownership boundary.

## Sorted rebrand (2026-09-05)

Goal: replace user-facing “Pick & Lock” branding with “Sorted” and install the supplied browser/app icons without changing the live SpacetimeDB database name or internal references.

Scope: `client/public/`, `client/index.html`, `client/src/pages/LandingPage.tsx`, `client/src/pages/RoomPage.tsx`, `client/src/pages/CreateRoomPage.tsx`, and their existing landing/room stylesheets. Procedural project logs will also be updated; no server, connection string, README, AGENTS, or fixture URL changes.

- [x] Copy the supplied PNG and generate 32px favicon and 180px Apple touch icon with `sips`.
- [x] Update the browser title, favicon links, wordmarks, and user-facing accessibility labels to Sorted.
- [x] Run the requested client tests, lint, build, and whitespace checks.
- [x] Update project status/changelog, commit, and push `ui/rebrand-sorted`.

Assumption: the source icon is trusted as supplied and does not need visual editing; only the requested raster sizes are generated.

## Onboarding and split chat (2026-09-05)

Goal: let room creators enter their name during room creation and auto-join after navigation, then mount the existing chat and shared-context components in a responsive RoomPage sidebar using placeholder data until issue #16 lands.

Scope: `client/src/pages/CreateRoomPage.tsx`, `client/src/pages/CreateRoomPage.test.tsx`, `client/src/pages/RoomPage.tsx`, `client/src/App.tsx`, `client/src/data/**` only if needed for the placeholder boundary, `client/src/styles/room.css`, and relevant tests. No server or bot-service paths.

+ [x] Add and validate the host-name field; include it in the create callback and store the pending host name before navigation.
+ [x] Auto-join pending creators in `RoomSession`, remove the session key only after join succeeds, and preserve the shared-link LandingPage path.
+ [x] Add the responsive two-column room layout and mount `RoomChat` plus `GroupInputPanel` with empty placeholder props and an issue #16 TODO at the data boundary.
+ [x] Add tests for host-name validation and create payload; add a focused RoomSession integration test proving pending-host navigation skips LandingPage and renders RoomPage after join.
+ [x] Run client tests, lint, build, and `git diff --check`.
+ [x] Update project status/changelog, commit incremental work, push `client/merged-onboarding-split-chat`, and comment on issue #17.

Assumptions: the existing `CreateRoomPage.onCreate` callback remains the create boundary, so the parent stores `pending-host-name:${shareCode}` after `createRoom` succeeds; the current RoomDataBridge provides the same `RoomActions` contract while issue #16 is unresolved.

## Activity distance and time metadata (2026-09-06)

Goal: add optional display/filter metadata for activity distance in km and time budget in minutes, preserving live Activity field order and keeping feasibility matching unchanged.

Scope: server/spacetimedb/src/lib.rs, regenerated client/src/module_bindings/**, client/src/fixtures/room.ts, client/src/pages/RoomPage.tsx only within the add-activity form block, client/src/components/ActivityCard.tsx, client/src/data/spacetime.ts, and required project logs. Do not touch RoomSidebar/chat or server/api paths outside the named reducers.

- [x] Append the two Activity fields at the struct end and update add_activity/bot_add_activity validation/inserts.
- [x] Run server fmt/build, regenerate bindings, and update the client action/view contracts.
- [x] Add optional form inputs and activity-card metadata display without changing chat/sidebar code.
- [x] Run all requested verification and confirm the origin/main Activity diff is additive-only.
- [x] Update status/changelog, commit, push the existing branch, and comment on issue #20.

Assumptions: blank optional form fields become undefined; distance/time are display metadata only, not per-friend feasibility constraints.

## Room creation date/time picker (2026-09-06)

Goal: replace the free-text room date with a browser-local datetime picker while storing the real scheduled timestamp and retaining a human-readable date label.

Scope: server/spacetimedb/src/lib.rs, regenerated client/src/module_bindings/**, client/src/pages/CreateRoomPage.tsx, client/src/pages/CreateRoomPage.test.tsx, client/src/data/spacetime.ts, and required project logs. Do not touch RoomPage, chat, or activity-form code.

- [x] Append Plan.scheduled_at with its required default and update create_room/seed construction.
- [x] Run server fmt/build, regenerate bindings, and update the createRoom client action.
- [x] Replace the free-text field with datetime-local, derive Timestamp/dateLabel, and update tests.
- [x] Run all requested verification and confirm the origin/main Plan diff is additive-only.
- [x] Update status/changelog, commit, push the existing branch, and comment on issue #25.

Assumptions: `datetime-local` uses the browser's local timezone; the client sends both `Timestamp.fromDate(date)` and a label shorter than 40 characters.

## Bot-service deployment: Cloudflare Containers (2026-09-06)

Context: `api/bot-service` code is confirmed correct — verified three separate times today with live instrumentation (fetch to SpacetimeDB temp-token endpoint, WebSocket construction, `onConnect` firing, live OpenAI calls against real queued room messages). The blocker is purely environmental: this sandboxed dev tool cannot keep a persistent detached process alive with working outbound network access. Tried and confirmed broken: Python `subprocess.Popen(start_new_session=True)`, the harness's own `run_in_background` task (both via `npm start` and bare `npx tsx`), and a macOS `launchd` user agent spawned entirely outside this tool's process tree — all four hang at "Connecting to SpacetimeDB WS..." with zero network sockets ever opening. Only a blocking foreground shell command reliably connects. Owner chose to deploy properly rather than run it in their own terminal, and pointed at Cloudflare — wrangler is already authenticated (account `Nivishv2004@gmail.com's Account`) with `containers`/`cloudchamber` write scopes, so Cloudflare Containers is viable with no new account setup.

Goal: run the existing bot-service Node process, unmodified in logic, inside a Cloudflare Container that stays up continuously (not per-request), fronted by the minimal Worker + Durable Object plumbing Cloudflare Containers requires.

Scope: new `api/bot-service/Dockerfile`, new `api/bot-service/wrangler.jsonc`, new `api/bot-service/worker.ts` (Container/Durable Object entrypoint), a small addition to `api/bot-service/index.ts` for a minimal HTTP health listener (Cloudflare Containers requires `defaultPort` to be listening for the platform to consider the container healthy — the bot has no inbound HTTP today), and `wrangler secret put` calls for the four existing env vars (`BOT_SPACETIME_TOKEN`, `OPENAI_API_KEY`, `GOOGLE_PLACES_API_KEY`, plus the two non-secret `SPACETIMEDB_HOST`/`SPACETIMEDB_DATABASE` values). No changes to `service.ts`, `openai.ts`, `speakGate.ts`, or any other bot logic — those are already proven working. No changes to the client or server SpacetimeDB module.

- [ ] Add a ~5-line HTTP health server to `index.ts` (listens on port 3000, returns 200) so the container reports healthy; does not change any existing bot behavior.
- [ ] Write `Dockerfile` (node base image, `npm ci`, `CMD ["npx", "tsx", "index.ts"]`).
- [ ] Write `wrangler.jsonc` with the `containers` block (`class_name`, `image: "./Dockerfile"`, `max_instances: 1`), matching `durable_objects` binding, and the SQLite-class migration.
- [ ] Write `worker.ts`: a `Container` subclass with `defaultPort = 3000`, `sleepAfter` set to effectively never sleep, and `envVars` sourced from the Durable Object's own `env` (never hardcoded) for the four config values; a default export `fetch` that calls `getContainer(...)` so the platform starts the instance.
- [ ] Set the four secrets via `wrangler secret put` (never echoing values into chat or logs) and deploy with `npx wrangler deploy`.
- [ ] Verify end-to-end against the live room used earlier today: confirm via `wrangler tail` or container logs that it connects, then re-send the `@sorted` test message in the browser and confirm a real bot reply appears in the room chat within the tuned latency budget.
- [ ] Update status/changelog once verified; report back to the owner so they can decide when to tell the tester the bot is live — do not announce it themselves.

Assumptions: Cloudflare Containers do not require the process to serve real traffic on the health port beyond a 200 response; `envVars` set from Durable Object `env` at construction time is the correct way to avoid hardcoding secrets into source; the existing `tsx`-based dev workflow runs fine inside a plain Node container image without a separate build step.

## Release audit and GitHub consolidation (2026-09-06)

Goal: bring the verified public decision-story server projection (`23a9c8b`) and the existing bot-production documentation checkpoint into `main`, prove the consolidated repository locally and through the live browser flow, then push the resulting commits to `origin/main`.

Scope: existing modifications to `docs/status.md`, `docs/changelog.md`, and this plan; `README.md` only for the required release-state update; `server/spacetimedb/src/lib.rs`; and generated `client/src/module_bindings/**`. Preserve `api/bot-service/bot.pid` and the nested `pick-and-lock-beyond-core-loop/` repository as untracked local artefacts. Do not publish the SpacetimeDB module, deploy Vercel, alter Render, or delete either artefact: those are distinct external/destructive actions and are not authorised by a GitHub push.

- [ ] Review the current dirty documentation checkpoint and `23a9c8b` against the public-projection privacy contract; confirm no merge conflict with `main` and no secrets or private rows enter generated public bindings.
- [ ] Commit the existing documentation checkpoint as-is, then cherry-pick `23a9c8b` into `main`; update the append-only status/changelog and release-state README to record the consolidation.
- [ ] Run the complete repository gate on consolidated `main`: Rust format/tests/SpacetimeDB build and binding generation; bot-service tests/typecheck; client tests/lint/Prettier/build; and `git diff --check`.
- [ ] Run a browser E2E smoke test against the currently deployed production application: create a fresh room, enter as its creator, join a second browser identity, add and answer an activity, and verify real-time state reaches both sessions without refresh. This tests the current deployed core; the new public projection remains local-only until a separately authorised Maincloud publish and route integration.
- [ ] Inspect the final commit graph, tracked diff, remote state, and GitHub push result; leave no unstaged tracked change. Report the exact push SHA, quality output, browser evidence, and the explicit non-deployed limitation.

Assumptions: the user's request authorises commits and a push to `origin/main`, plus non-destructive test-room creation during browser E2E; it does not authorise a Maincloud schema/module publish, Vercel deployment, Render change, or deletion of local artefacts.

## Public-story freshness correction (2026-09-06 — approval required)

Release-audit finding: `23a9c8b` materialises `shared_room_story` only in `publish_room` and `set_public_share_settings`. The private reducers that subsequently add a choice, lock a decision, or reopen after an accepter leaves never update the public row. A published story can therefore expose stale choices, status, selected choice, metrics, and timestamp. Do not merge or push `23a9c8b` as-is.

Goal: make a published public story a transactionally refreshed projection of every approved public field, without widening its schema or exposing private data; then resume the GitHub consolidation plan.

Scope: `server/spacetimedb/src/lib.rs`, its existing reducer tests, regenerated `client/src/module_bindings/**` only if generation changes them, plus append-only project logs and release README status. No UI route, Maincloud publish, Vercel deployment, Render change, or local-artefact deletion.

- [ ] Trace every private-room reducer that changes a field exposed by `shared_room_story`; add one minimal helper that refreshes an existing published row in the same reducer transaction and leaves unpublished rooms with no public row.
- [ ] Add reducer proof that a published story refreshes after choice creation, locks with the selected label and decision count, and reopens after an accepting member leaves; retain the non-creator and unpublish privacy checks.
- [ ] Run Rust format/tests/SpacetimeDB build and binding generation on the corrected projection branch; review the public row and generated bindings for private-field leakage.
- [ ] Replace the rejected commit with the corrected one, resume the consolidation/local gate/live deployed-core E2E/push sequence, and record the limitation that the projection remains undeployed until an explicitly authorised Maincloud publish plus UI route integration.

Assumption: a materialised public table is acceptable only if every exposed lifecycle mutation refreshes it atomically; an unpublished room must continue to produce zero public rows.

## Autonomous active-release completion (2026-09-06 — owner authorised)

Owner instruction: take over the active build while they are unavailable. This explicitly authorises implementation, documentation, commits, pushes, Maincloud publishing, Vercel deployment, and live test-room creation required to complete the current release. Keep scope to the deployed v1 demo and the already specified private-v2 public-story release; do not invent unrelated features or delete local artefacts.

- [ ] Correct and prove public-story freshness on the isolated server branch, then integrate the corrected projection with the existing mainline documentation checkpoint.
- [ ] Audit and wire the already-built public-story UI/route/data paths to the real public projection, preserving the private/public boundary and existing ownership constraints.
- [ ] Run the complete local gate and privacy proof, inspect the Maincloud migration as additive-only, then publish the module and deploy the verified client.
- [ ] Run live browser E2E for the v1 create/join/realtime core and the new public-story publish/view/unpublish/CTA lifecycle, including two-identity privacy checks where browser and subscriptions permit.
- [ ] Push all release commits to `origin/main`; append release evidence to status/changelog, update README release state, and leave the repository clean apart from deliberately preserved local artefacts.

Assumptions: a temporary production room and test identities are authorised test data; no existing production room, membership, message, or deployment is deleted or overwritten. Any migration that removes or changes an existing Maincloud column remains prohibited and stops the release.

**Current blocker:** the 2026-09-06 Maincloud migration plan removes and recreates the existing `my_rooms` view, which would disconnect all connected clients. The publish was interrupted before confirmation. Do not publish this module until the view migration is made non-breaking or the owner explicitly accepts the connection interruption.

## Critical real-time membership rendering defect (2026-09-06 — owner authorised)

Reported production symptom: joins and leaves are persisted in SpacetimeDB, but the people count and related room state do not update in already-open frontend sessions. This violates the product's core no-refresh/low-latency contract. Pause public-story release work until the live subscription-to-render path is proven and fixed.

- [x] Reproduce with two browser identities in a fresh room; capture the reducer result, subscribed `friend` rows, cache events, and rendered count before and after join/leave without refresh.
- [x] Trace the live `RoomDataBridge` subscription and cache listeners against the generated bindings; identify the first boundary where the update is absent or ignored. Add a focused failing regression test there.
- [x] Implement the smallest root-cause fix, verify the focused test and full client/server gates, and live-test join, leave, answer, lock, and reopen propagation across two active sessions.
- [x] Publish/deploy only after the migration and release diff are reviewed; record the live proof and resume the paused public-story release.

Assumptions: the report concerns the deployed v1 `/r/<shareCode>` path, where `Friend.online` is the room-presence source; membership identities and test rooms are temporary production test data, not user data to alter.

## Deployment-blocking email function typecheck (2026-09-06 — owner authorised)

The production Vercel build for the real-time presence hotfix completed and was aliased, but reported `TS2591` twice in `api/capture-email.ts`: its Vercel runtime use of `process.env` lacks the Node global type. This is an existing deployment defect, not a presence change. Treat it as release-blocking because the optional email endpoint must build cleanly even though it remains non-authoritative.

- [x] Trace the API TypeScript compilation boundary and write the smallest regression proof for the runtime-environment access.
- [x] Correct the typing/build configuration without widening the client bundle or changing email behaviour.
- [x] Verify Vercel build locally and in a fresh production deployment, then resume two-identity browser proof for presence.

## Additive Maincloud compatibility migration (2026-09-06 — owner-authorised release work)

Production schema inspection proved that `my_rooms.status` uses the deployed one-variant `PrivateRoomStatus::Open`. The queued v2 module widens that type to `Locked`, forcing the breaking view recreation. Preserve the deployed legacy status and add separate defaulted v2 lifecycle state instead. The legacy view remains intentionally limited; all new state goes through new v2/public projections.

- [ ] Replace the v2 use of `PrivateRoomStatus` with a distinct defaulted decision-status field while retaining the old private-room field and `my_rooms` output byte-for-byte compatible.
- [ ] Regenerate bindings and run Rust format/tests/build plus client test/typecheck/build gates.
- [ ] Inspect the generated Maincloud migration non-interactively only to confirm that it adds fields/tables/views and does not remove or recreate any deployed entity; stop if it reports client disconnects or replacement.
- [ ] Publish and deploy only if that proof succeeds, then run the already-planned public-share lifecycle E2E and append the release evidence.

**Progress (2026-09-06):** implementation and binding regeneration are complete locally. Rust format, 13/13 server tests, SpacetimeDB build, 52/52 client tests, client lint, and client build pass. The compatibility strategy retains production's one-variant `PrivateRoomStatus` and `my_rooms` schema, adds defaulted v2 `decision_status`, and moves public-story status to it. The Prettier invocation was split out because Prettier cannot parse Rust; run it against the regenerated TypeScript sources before migration inspection. No Maincloud publish or Vercel deploy has run.

**Migration result (2026-09-06):** the inspected plan is additive in data terms—defaulted columns, new tables, new public story table, and new views only—but Maincloud still labels the combined schema update as client-breaking and warns it will disconnect all clients. Confirmation was cancelled. This fails the third step's no-disconnect condition; do not publish or deploy this module unless the owner explicitly accepts the interruption or a server-platform-supported no-disconnect upgrade path is identified.
