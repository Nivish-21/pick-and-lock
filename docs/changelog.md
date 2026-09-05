# 2026-09-05

- Deleted the accidental local chat scaffold and dependencies; preserved the Git-tracked Pick & Lock planning pack.
- Added a root `AGENTS.md` for the collaborator's server/integration agent.
- Added a frozen realtime contract, two-builder execution model, and revised implementation plan with disjoint ownership.
- Hardened the contract with share-code resolution, uniqueness, reconnect, concurrency, email safety, onboarding, and no-loop lifecycle rules; added a pre-handoff audit package.
- Corrected the event schedule: at 17:46 Saturday the team still has 14 hours 44 minutes to the 08:30 Sunday code freeze; added checkpoint-based execution timing.
- Completed the pre-handoff package: acceptance matrix, server/UI/auditor prompts, conflict amendments, and hardening completion record. No application code added.
- Added the live-execution plan, collaborator launch prompt, and Maincloud database-owner runbook so both builders can start without a second planning pass.
- Recorded launch authority: UI workspace and server-core work can start in parallel; Maincloud database creation is deferred to the owner's first tested-module publish.
- Recorded successful Maincloud owner authentication; database creation remains correctly deferred until the tested server module is merged and published.
- Started the resumable UI execution lane with an explicit six-subtask log and durable product context for the selected design workflow.
- Completed UI U1: created the React/Vite client, removed the visible starter experience, added departure-board semantic tokens, and verified lint plus production build.
- Completed UI U2: added frozen-contract TypeScript types and deterministic Saturday room fixtures for open, pending, locked, and reopened UI states.
- Completed UI U3 pending verification: added a mobile-first landing page, accessible name-only join form, and live Saturday fixture preview.
- Verified UI U3 at desktop and 390px widths, including invalid-name rejection and successful name-only join.
- Completed UI U4: added the fixture-driven room screen, answer controls, conditional price input, group-status panels, proposal acceptance state, locked-plan state, and reopened notice; moved the shared wordmark style into the base stylesheet so the room has no hidden page-style dependency.
- Completed UI U5: added local Vitest and Testing Library coverage for join and room-critical actions, explicit test cleanup, the `npm run test` command, and passing mobile accessibility smoke, lint, production-build, and deterministic-design gates.
- Added the first-version SpacetimeDB server checkpoint: selectively integrated the Rust module and regenerated bindings, installed the matching TypeScript SDK, added creator-supplied share-code rooms, scoped membership/leave/drop-out per room, corrected active-eligible acceptance counting and the reopen reason, and excluded the collaborator's duplicate agent files plus machine-local database setting.
- Published the first Maincloud database as `pick-and-lock`, verified its seeded plan/activity rows, and added proposal plus copy-room-link controls with passing UI coverage.

# 2026-09-05 — Room insights contract and execution plan

- Added `docs/room-insights-spec.md` to define authoritative lifecycle, decision history, metrics, chat, and room-close semantics.
- Added `docs/superpowers/plans/2026-09-05-room-insights.md` and appended U7 to `docs/plan.md` to isolate server, bridge, UI, and deployment work.
- Ignored `.worktrees/` before creating isolated agent workspaces.
- Recorded decisions for append-only decision history plus atomic summaries and creator-only room closure.

# 2026-09-05 — Independent email lane

- Added U8 and Task 5 to plan a server-only, non-authoritative room-link email endpoint with strict boundary validation and no email persistence.

# 2026-09-05 — Repository hand-off and future assistant boundary

- Added `docs/project-handoff.md` as the first-read document for future collaborators, with current branches, active work, integration order, version-1 outcome, and final verification sequence.
- Updated product and execution documents for a later consented preference-memory and advisory decision-assistant phase.
- Rejected raw browser fingerprinting as a memory key; documented explicit consent, visibility, correction, expiry, export, and deletion requirements before any AI/provider implementation.

# 2026-09-05 — Maincloud migration correction

- Added `docs/maincloud-migration-safety.md` after reviewing the local metrics branch against Maincloud's automatic-migration constraints.
- Recorded that `server/room-insights` commit `3ee5a58` is not deployable because it changes the existing `plan` table incompatibly; no data-destroying workaround is authorised.
- Amended the room-insights specification and plan to use an additive `room_lifecycle` table and leave the seeded legacy room readable but non-closable.

# 2026-09-05 — Live bridge demo integration

- Merged safe route, QR, Vercel SPA, bridge, and Create Room branches into main; deliberately excluded the incompatible metrics schema branch.
- Mounted the SpacetimeDB bridge and Create Room callback in `client/src/App.tsx`; rendered the room QR payload from the canonical browser URL.
- Refreshed the local dependency tree after the QR dependency merge and passed 19 client tests, lint, production build, and whitespace validation.
- Performed a live Maincloud browser smoke test: joined `SATURDAY` as `Demo Host` and changed Bowling eligibility from 0 to 1 through the real reducer.

# 2026-09-05 — Production demo deployment

- Created Vercel project `nivi-s-projects1/pick-and-lock` and deployed the verified main client to https://pick-and-lock.vercel.app.
- Verified the direct public room URL `/r/SATURDAY`: Maincloud connected, `Demo Guest` joined alongside `Demo Host`, the real Bowling count rendered, and the QR component encoded the production room URL.
- Kept the incompatible metrics schema branch out of main and out of the production deployment.
- Ignored Vercel’s local project directory and local environment files in `client/.gitignore`; no deployment token or environment file entered Git.
- Created and verified the clean production presenter room `XATWU1XNQB` (`Demo dinner decision`) through the public Create Room, route, and join flows.

# 2026-09-05 — Private rooms v2 planning

- Added the private custom-room and scheduling specification plus an executable implementation plan.
- Defined private canonical tables, caller-filtered views, fragment invite secrets, custom choices, calendar export, v1 coexistence, and two-identity privacy proof.
- Recorded that the current public v1 share-code model cannot meet invite-only visibility requirements without the v2 access boundary.

# 2026-09-05 — Public decision-story and agent-collaboration planning

- Added the v2 public sharing specification: creator opt-in, read-only public story, optional schedule visibility, unpublish, and an independent create-room CTA.
- Added an executable Superpowers plan that isolates server projection, UI, route/bridge, and two-identity privacy-proof tasks.
- Added a GitHub-Issues-based task claim and pull-request handoff protocol so agents can claim their next unblocked task without repeated human relay prompts.
- Kept private v2 data in SpacetimeDB; no Supabase integration or additional coordination service is planned.

# 2026-09-05 — v2 execution queue launched

- Pushed the planning package as `45626e6` to `origin/main`.
- Created GitHub labels plus issues #1–#6 with explicit ownership, dependency, and acceptance boundaries.
- Started disjoint private-room server (#2) and public-story UI (#3) worktrees; reserved the independent calendar-event builder (#6) for a collaborator.

# 2026-09-05 — README operating status

- Added a root README with the live demo, current product state, architecture, active v2 lanes, local checks, safety constraints, and agent workflow.
- Updated the docs index to route incoming contributors to the current handoff, v2 specifications, collaboration protocol, and execution plan.
- Added an execution-plan rule requiring README status updates with every merge, publish, deployment, or lane-state change.

# 2026-09-05 — Public-story UI merged

- Reviewed and merged PR #7 as `9d82753`; the fixture-only public-story page and sharing settings component remain isolated from routing and SpacetimeDB.
- Verified on `main`: 23 client tests, lint, production build, and `git diff --check` pass.
- Updated the root README and execution plan to mark #3 merged; public projection/route work remains dependency-blocked.

# 2026-09-05 — Private v2 access core merged

- Reviewed and merged PR #9 as `dcd5ac5`; private rooms, schedules, choices, membership, hash-only invites, and caller-filtered foundational views now exist locally in the module and bindings.
- Verified on `main`: Rust format, 3 module tests, SpacetimeDB build, 23 client tests, lint, production build, and whitespace validation pass.
- Kept Maincloud unpublished. Added the private decision-engine prerequisite (#10) because public sharing requires server-authoritative decision history and metrics.

# 2026-09-06 — Onboarding and split-chat client lane

- Added creator name collection and validation to room creation, pending host session storage, and automatic post-navigation joining.
- Added responsive RoomPage two-column layout with mounted `RoomChat` and `GroupInputPanel` using empty issue #16 placeholder data and TODO wiring.
- Added host validation/payload tests and a RoomSession pending-host integration test; full client verification passes.

# 2026-09-05 — Lane B custom activity UI wired

- Regenerated `client/src/module_bindings/` with the new `add_activity` reducer binding.
- Added `RoomActions.addActivity`, live `actionsFor` wiring, fixture no-op support, and an open-room form in `RoomPage` for name, price, and minimum people.
- Added success and reducer-error React Testing Library coverage. All requested Rust/client verification commands pass.

# 2026-09-05 — Sorted brand rebrand

- Added the supplied Sorted icon plus 32px favicon and 180px Apple touch icon assets.
- Updated browser metadata, accessibility labels, and landing, room, and create-room wordmarks to Sorted.
- Kept the live SpacetimeDB database name, README, AGENTS, and internal fixture URLs unchanged.

# 2026-09-06 — Integration, Maincloud publish, and schema-mismatch fix

- Merged PRs #13 (Lane B), #14 (Sorted rebrand), #8 (calendar-event builder), #15 (chat-agent), and #18 (onboarding/split-chat) into `main`; independently re-ran full verification on each merge commit rather than trusting each agent's self-report.
- Fixed a merge mistake: `api/bot-service/node_modules` was briefly staged via `git add -A`; added `api/bot-service/.gitignore`, recommitted clean before pushing.
- Renamed the Vercel project `pick-and-lock` → `sorted`; production domain unchanged (still `pick-and-lock.vercel.app`) pending a Deployment Protection dashboard change the owner hasn't made yet.
- Published the additive schema (verified no existing-table columns changed) to Maincloud with explicit owner confirmation: `spacetime publish pick-and-lock --module-path server/spacetimedb --yes=remote`.
- Live browser testing against production found `add_activity` was unreachable (module not republished) and that chat/location/bot tables were built against `PrivateRoom.id` instead of `Plan.id`, and that `RoomChat`/`GroupInputPanel` were never mounted anywhere. Recorded the root cause and owner-confirmed fix in the design spec (section 8) and opened issues #16 (server retarget) and #17 (client onboarding/layout).

# 2026-09-06 — Chat schema retarget merged (issue #16)

- Merged PR #19 (`70e0ca5`) into `main`: chat/preference/bot-state/location views and reducers retargeted from `PrivateRoom.id` to `Plan.id` via `Friend`; added `bot_add_activity` (bot-gated autonomous poll-option authoring) and `ensure_bot_friend` reducers; added poll-authoring extraction with confidence filtering and case-insensitive dedup wired into the existing debounce cycle; broadened the speak-gate to recognize `@sorted`.
- The branch was forked before PR #18 (onboarding/split-chat) merged; merged `main` into the branch first and independently re-verified the result rather than trusting the merge or the agent's self-report: confirmed no existing table columns removed/changed (only a new index attribute on `Friend.identity`), confirmed `docs/status.md`/`docs/changelog.md`/`docs/plan.md` came out identical to main's checkpoint, then re-ran Rust fmt/build, 8/8 bot-service tests, bot-service `tsc --noEmit`, 39/39 client tests, client lint, and client production build myself.
- `RoomPage.tsx` still has the `TODO(issue #16)` placeholder chat wiring (`messages={[]}`, `placeholderSendChat`) — client wiring to the real `my_room_chat`/`sendChatMessage` plumbing is the next open task, not yet filed as an issue.

# 2026-09-06 — Beyond-core-loop merged, Maincloud republished, live-tested, shipped

- Cherry-picked the isolated `pick-and-lock-beyond-core-loop` feature (PWA manifest/icons/OG tags, app-wide `/insights` route, `/api/capture-email` Resend endpoint) onto current `main` as PR #22 (`ebd12c9`). Independently re-verified after the cherry-pick, not just trusting the original commit: server untouched (cargo fmt/build), 44/44 client tests (39 existing + 5 new insights), lint clean, build clean, `vercel.json` rewrite confirmed to exclude `/api/*`, `capture-email.ts` confirmed to degrade to 501 without a key.
- Opened issues #20 (price/distance/time activity constraints, owner chose display/filter attributes over a full feasibility-matching engine) and #21 (real chat wiring to replace the issue #16 placeholder) with self-contained prompts and disjoint `RoomPage.tsx` region ownership (form block vs. sidebar block), and set up their branches/worktrees so both builders can start in parallel without blocking on this integration pass.
- Republished the Maincloud module (owner-confirmed) — the live database had predated PR #19's chat-schema retarget; migration plan showed only the expected additive index (`friend_identity_idx_btree`), no column changes.
- Live-tested the fully integrated `main` end-to-end on production: created a room with the new host-name-on-creation flow, joined, answered an activity, added a custom activity live (confirms Lane B + the republished module both work together), and loaded `/insights`.
- That live test found a real bug: every event timestamp on `/insights` rendered "Invalid Date" — `new Date(Number(timestamp))` doesn't work on the generated `Timestamp` class (no numeric coercion), it needs `.toDate()`. The same bug existed in `planSelectors.ts` but never surfaced because `RoomPage` never renders `latestEvent.at`. Fixed both directly (trivial, pre-existing bug found during verification, not new feature work) as `f2abb8f`, updated the one test that mocked `at` as a raw bigint to use a real `Timestamp` instance, re-verified (44/44 tests, lint, build), redeployed, and confirmed live: real timestamps now render correctly.
- Confirmed `pick-and-lock.vercel.app` is aliased to the latest deployment. Product is ready for real testers.

# 2026-09-06 — Issues #20/#21 merged, three live-found bugs fixed, hardcoded seed removed

- Merged PR #23 (issue #20, activity constraints) and PR #24 (issue #21, real chat wiring) into `main`; both branches had forked before the beyond-core-loop merge, so `main` was merged into each first and independently re-verified (not the builders' self-reports) before merging.
- Live-testing both together on production found and fixed three real bugs, each mechanical enough to fix directly rather than route back to a builder: (1) `spacetime publish` rejected the new `Activity.distance_km`/`time_minutes` columns — SpacetimeDB requires an explicit `#[default(...)]` annotation on new columns added to an existing table, even `Option<T>` ones; (2) `planSelectors.ts` never copied `distanceKm`/`timeMinutes` from the raw subscription into `ActivityView`, so the fields never displayed despite the form/reducer/display code all being correctly wired — no test caught it since only fixture-driven tests exercised the display path; (3) `my_room_chat`/`my_room_preferences` are views scoped to every room the caller has an active `Friend` row in, not the room being viewed — the client never filtered by the current `plan_id`, so a caller in multiple rooms saw all their rooms' chat mixed together (found by testing two rooms back to back with the same browser identity).
- Removed the hardcoded `seed_activities` call from `create_room` (owner: "we don't have to add the static ones... don't do any hard-coded stuff anymore") — new rooms now start empty; activities come from manual entry or the bot. `seed_activities` itself stays for the one-time legacy `SATURDAY` demo room.
- Republished Maincloud twice more (owner-confirmed each time): once requiring `--yes=break-clients` (the `#[default(...)]` fix's migration disconnects active clients, no data loss), once with no migration needed (pure behavior change). Redeployed the client three times total across this round, re-verifying live after each fix.
- Opened issues #25 (real date/time picker, stored as `Timestamp` not free text) and #26 (bot role guardrails, chatter reduction, latency) as two new fully-disjoint lanes — no shared files between them, so no merge-conflict risk expected next round.

# 2026-09-06 — Issues #25/#26 merged; bot-enablement gap discovered

- Merged PR #27 (issue #25, `Plan.scheduled_at`) and PR #28 (issue #26, bot hardening) into `main`; both branches had forked before prior merges, merged `main` in first (clean, zero conflicts — fully disjoint files as designed), independently re-verified before merging.
- Republished Maincloud (owner-confirmed, `--yes=break-clients` — additive column, no data loss) and redeployed. Live-tested the new date/time picker end-to-end: room header correctly shows "Sun, Sep 6 · 7:00 PM" computed from the real `Timestamp`, room starts empty (seed-removal fix still holds), chat correctly scoped to the new room only.
- **Discovered the bot has never actually been enabled in production**: `require_bot()` checks `option_env!("BOT_IDENTITY")`, which is a Rust compile-time env var never set on any build/publish this session — so it's always `None` and every bot-authenticated reducer call (`send_bot_message`, `bot_add_activity`, `ensure_bot_friend`, `record_preference`, `advance_bot_watermark`) has been silently rejecting all along. Separately, `api/bot-service` is a long-running Node process (`npm start` → `tsx index.ts`), not a serverless function — it has never been started anywhere, and there's no `BOT_SPACETIME_TOKEN` in `.env`/`.env.example` at all. All the chat/poll-authoring UI and schema work is real and tested, but the bot itself has been inert in production this entire session. Flagged to the owner before further tester invites.

# 2026-09-06 — Bot enabled in production on Render; PR #29 (private decision engine) merged

- Owner-run `generate-identity.ts` produced a bot SpacetimeDB identity/token; rebuilt and republished Maincloud with `BOT_IDENTITY` set at compile time for the first time this session, enabling every previously-rejected bot reducer call.
- First-ever live bot activation surfaced two real bugs, both unreachable until now: `gpt-5-nano` 400s on any non-default `temperature` (removed the param); a single OpenAI failure inside `processRoom` crashed bot processing for every room simultaneously (split into a try/catch wrapper `processRoom` around the original logic, now `processRoomUnsafe`, so one room's failure no longer takes down the rest).
- Confirmed this sandboxed tool cannot keep a persistent Node process network-connected once detached — reproduced identically across a Python `subprocess.Popen(start_new_session=True)`, the harness's own `run_in_background` (both `npm start` and bare `npx tsx`), and a macOS `launchd` agent outside this tool's process tree; all four open zero sockets and hang silently. A backgrounded `curl` control test worked fine, ruling out a blanket restriction. Cloud hosting was the only path forward.
- Tried three hosts before landing on one: **Cloudflare Containers** — fully built and proven working via a local Docker run with a real bot reply, blocked at deploy by the account being on the Workers Free plan (Containers require Paid). **Fly.io** — `flyctl auth login` needs a real interactive TTY this tool doesn't have, and the owner's own terminal (via the `!` prefix) hit the same wall. **Koyeb** — mid-acquisition by Mistral, dashboard non-functional (confirmed via screenshot).
- **Render** is the one that stuck (owner's call: plain Node host, no Docker). Added `render.yaml` and a dynamic-`$PORT` health server in `index.ts`. Owner authenticated via `render login`'s device-authorization flow and connected the repo via the dashboard (Blueprint creation isn't CLI-scriptable). Fixed two real deploy bugs from the actual Render logs: the same cross-directory `spacetimedb` module-resolution failure hit in the Docker attempt (fixed via a `node_modules` copy step in `buildCommand`), and a mismatched `OPENAI_API_KEY` pasted during Blueprint setup (owner re-pasted and saved, which auto-redeployed and fixed it).
- Live at `https://sorted-bot-service.onrender.com`. Confirmed working end-to-end twice via direct SpacetimeDB SQL queries against `my_room_chat`/`my_bot_room_state` (not just the browser UI): a real `@sorted` message triggers a real OpenAI call and a real `sendBotMessage` reply. Root-caused what looked like two hosting failures as correct guardrail behavior instead: `isDirectlyAddressed`'s regex deliberately requires a literal `@` prefix (bare "sorted" is excluded — it's too common an English word to trigger on), and the 25-second anti-spam cooldown from issue #26 correctly swallowed several rapid test messages. Added error logging to five previously-silent `.catch(() => undefined)` sites in `service.ts` and one diagnostic log line per processing cycle, so a genuine future failure at those sites won't vanish without a trace — deployed and live, not yet re-verified with a fresh live test.
- Merged PR #29 (issue #10, private decision engine — votes/proposals/acceptances/decisions/metrics for the separate, unmerged private-room initiative). The branch was ~50 commits behind `main`; merging `main` in produced conflicts in `server/spacetimedb/src/lib.rs` and three generated binding files, all pure non-overlapping interleaved appends (confirmed via `--conflict=diff3` before resolving — the common-ancestor content was empty in every hunk, proving neither side touched the other's code). Regenerated bindings fresh rather than hand-merging generated files. Independently verified after merging: `cargo fmt --check`, 8/8 server tests, `spacetime build`, `spacetime generate`, 47/47 client tests (one flaked once on a full-suite run, passed both in isolation and on a clean rerun — pre-existing test-order flakiness, not a regression), lint, build, `git diff --check`.
- Still open: the live-adversarial and autonomous-poll-authoring verification pass for the bot hasn't run since the diagnostic-logging deploy; issues #1/#4/#5 (public-story projection/route/two-identity privacy proof) are now unblocked since #10 has merged; unconfirmed whether Render's `GOOGLE_PLACES_API_KEY` (set before the key was confirmed working) matches the working value; the Vercel alias remains blocked on a Deployment Protection dashboard change the owner hasn't made.

# 2026-09-06 — Real-time presence and Vercel function release repair

- Stopped the subsequent public-story Maincloud publish before confirmation: its migration would remove and recreate `my_rooms`, disconnecting active clients. No schema change was applied.
- Added a live room-presence readout in `client/src/pages/RoomPage.tsx`: `here` counts online, non-dropped friends; `in room` counts all non-dropped friends. It deliberately does not alter activity eligibility.
- Added a RoomPage regression test covering a no-refresh presence transition.
- Added the Node type reference required by the Vercel email function, so `process.env` typechecks in the deployment compiler without changing email behaviour or client runtime code.
- Pushed `44036a1` and `127294f`, then deployed production `dpl_BP76FszHuT1gw47JxxTTLf2FmXPW` to `https://pick-and-lock.vercel.app`.
- Verified production in two browser identities: join/presence, add option, answer/feasibility, proposal, atomic lock, and accepter drop-out/reopen all propagated to the other open session without reload.
