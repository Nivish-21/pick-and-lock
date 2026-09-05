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

# 2026-09-06 — Room date/time picker

- Appended `Plan.scheduled_at` with `#[default(None)]`, passed the required timestamp through `create_room`, and regenerated client bindings.
- Replaced the room creation free-text timing field with a browser-local datetime picker that sends both a real timestamp and a human-readable label.
