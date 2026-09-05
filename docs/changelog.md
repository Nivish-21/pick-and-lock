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
