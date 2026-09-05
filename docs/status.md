# Current state

The accidental local scaffold was deleted on 2026-09-05. This repository now contains planning documents only.

The current execution authority is `docs/superpowers/plans/2026-09-05-pick-and-lock-two-builder.md`. The UI owner and the server agent have disjoint file ownership defined in `AGENTS.md`.

Next step: both builders start their independent lanes from the frozen realtime contract, then perform the one explicit data-bridge handoff.

Plan hardening is in progress. Do not hand the repository to the collaborator or start implementation until the hardened contract, prompts, and acceptance matrix are committed and the repository owner accepts them.

Schedule corrected at 17:46 IST on Saturday: 14 hours 44 minutes remain before the 08:30 Sunday code freeze. The immediate plan is the M1-to-M3 sequence in `docs/two-builder-execution.md`; no first-iteration core feature is cut.

The hardened plan package is complete and awaiting repository-owner acceptance. It includes the frozen contract, acceptance matrix, owner prompts, plan-auditor prompt, and checkpoint schedule. No application code has been created in this hardening pass.

The next execution package is ready: a copy-and-send collaborator launch prompt, a live two-owner sequence, and a Maincloud owner runbook. Maincloud is the chosen database host; do not self-host for this time-boxed build.

The repository owner authorised launch by requesting the exact collaborator prompt and live plan. The UI owner may create the Vite workspace on an owned branch; the collaborator may start `server/**` immediately. The owner authenticates to Maincloud now and creates `pick-and-lock` by publishing the merged, tested server core.

Maincloud owner authentication completed successfully on 2026-09-05. The next owner-side database action remains the first non-destructive publish after server-core merge; no database, token, or deployment secret has been committed.

UI implementation is authorised and starts with U1 in `docs/ui-execution-log.md`. Every completed UI subtask is committed and pushed before the next starts. The server lane remains independent until U6.

U1 completed successfully: the React/Vite workspace, semantic token system, and durable product context are ready. `npm run lint --prefix client` and `npm run build --prefix client` pass. Next: U2 fixtures and the frozen presentational contract.

U2 completed successfully: UI fixtures cover each core room lifecycle state and expose the contract action surface without importing SpacetimeDB. Next: U3 landing page and name-only join flow.

U3 completed pending verification: the landing page applies the departure-board direction, validates a name locally, and previews actual fixture state. Next: U4 room screens and interactive fixture states.

U3 verification passed: lint and production build pass; desktop and 390px browser captures were inspected; invalid-name rejection and successful name-only join were exercised. Next: U4 room screens and interactive fixture states.

U4 completed successfully: the room UI now renders Choices, proposal, Locked, and reopened states against the frozen UI facade. It is still deliberately fixture-driven, so the server lane remains independent until U6. Lint, production build, desktop/mobile inspection, and the Impeccable deterministic scan passed. Next: U5 focused UI tests and accessibility verification.

U5 completed successfully: local Vitest component checks cover the name guard, trimmed join, conditional price action, and locked-room drop-out safety rule. The browser accessibility smoke check at 390px exposes the expected labels, regions, headings, and answer actions. `npm run test`, lint, and production build pass. The UI lane is ready for the server-owned bridge at U6.

U6 server checkpoint is ready: the collaborator module was selectively integrated without duplicate agent files or machine-local database configuration. The first-version amendment now supports creator-supplied share codes and fixed activities per room; friend identity, leave, and drop-out are room-scoped. The server build, generated bindings, client tests, lint, and build pass. Maincloud is authenticated and empty; next action is the first publish of `pick-and-lock`.

Maincloud publish completed successfully: `pick-and-lock` was created and its seeded `SATURDAY` plan plus three activities were verified by read-only SQL. Proposal and share-link UI controls now have focused tests; client tests, lint, and build pass. Remaining critical work: mount the returned data bridge and creation page, then perform the live browser smoke test.

Room-insights planning is complete. The next approved implementation adds server-authoritative lifecycle timestamps, decision history, a room metrics summary, short chat messages, and creator-only close semantics. The active bridge agent remains isolated in `client/src/data/**`; server schema and generated bindings will be delivered in a separate worktree, then rebased by that agent. A Maincloud schema publish remains pending explicit confirmation after local verification.

An independent U8 lane is authorised for a non-blocking Vercel/Resend room-link email endpoint in `api/**`. It must not delay entry, mutate room state, or persist email addresses. It is isolated from the active server-schema, data-bridge, QR, route, and Vercel configuration lanes.

Repository hand-off documentation is now centralised in `docs/project-handoff.md`. It records completed work, active lanes, the exact integration order, version-1 definition of done, and a deliberately deferred privacy-safe decision-assistant phase. The route lane completed at `4b7804032129e1c2a7c9f516fdfd14b3821db193`; the QR lane completed at `3a0227d41ee976aae960fdeb18c20374c9266957`; Vercel SPA configuration completed at `b5725762416e59c3393eabc134b5c49270f6abfc`. All remain unmerged pending review. The metrics schema and collaborator data bridge are still active.

The first metrics branch completed local quality gates at `3ee5a58afcc64c5d1ce892ef2d2d0c40bb89a141`, but review found an incompatible Maincloud migration: it adds required columns in the middle of the existing `plan` table. It must not be merged or published. `docs/maincloud-migration-safety.md` defines the corrective additive `room_lifecycle` design. The route, QR, and Vercel lanes remain ready for review; the collaborator data bridge remains active.

Demo-critical client integration is complete and verified against Maincloud. The safe route (`4b78040`), QR (`3a0227d`), Vercel SPA configuration (`b572576`), real-time bridge (`c329fe1`), and Create Room page (`dc6b08b`) were merged into main. `App.tsx` now uses `RoomDataBridge`: `/r/<shareCode>` resolves live room data, requires a successful name join, and renders QR sharing; `/` connects then creates a room and navigates to its public URL. A browser verified the hosted Maincloud `SATURDAY` room by joining as `Demo Host` and changing Bowling's eligible count from 0 to 1. Maincloud metrics schema work remains blocked on the documented migration correction. Next: push this verified client integration, then deploy the Vercel client and verify its public URL.

Production deployment completed on 2026-09-05: https://pick-and-lock.vercel.app. The Vercel project is `nivi-s-projects1/pick-and-lock`; its production deployment built successfully from main commit `17fe6ef`. Direct deployment verification at `/r/SATURDAY` connected to Maincloud, joined `Demo Guest`, displayed the prior `Demo Host` plus Bowling eligibility `1 / 4`, and rendered the canonical production QR payload. The metrics branch is still intentionally excluded and must follow `docs/maincloud-migration-safety.md` before any future publish.

Clean demo room created and verified in production: https://pick-and-lock.vercel.app/r/XATWU1XNQB. It is titled `Demo dinner decision`, has date label `Tonight`, and was joined as `Demo Creator`. The room route, live Maincloud subscription, membership reducer, activity state, copy link, and QR payload all rendered from the public deployment.

The next planned product version is private custom rooms with calendar scheduling. It is documented in `docs/private-rooms-and-scheduling-spec.md` and `docs/superpowers/plans/2026-09-05-private-rooms-v2.md`; no v2 code or Maincloud publish is authorised by this planning checkpoint. v2 deliberately coexists with the public v1 demo and uses private tables plus caller-filtered views so room metadata is invisible until invite acceptance.

The next v2 subproject is now planned: optional creator-authorised public decision stories and a public create-room CTA. `docs/public-sharing-and-cta-spec.md`, `docs/agent-collaboration-protocol.md`, and `docs/superpowers/plans/2026-09-05-public-sharing-and-agent-collaboration.md` define the private/public boundary, execution tasks, and agent self-direction protocol. No public-sharing code, database publish, or deployment has started yet.

Execution started after plan approval. `45626e6` pushed the plan package to `origin/main`; GitHub Issues now track the independent lanes. The private v2 access core is active in `server/private-v2-core` (#2), fixture-driven public-story UI is active in `ui/public-story` (#3), and the isolated calendar-event builder is ready for an external collaborator (#6). Public projection, route integration, privacy proof, Maincloud publish, and deployment remain blocked by explicit dependencies and owner confirmation.

The root `README.md` is now the durable incoming-contributor entry point. It states the live v1 proof, active v2 issue lanes, local quality commands, privacy/publishing boundaries, and the GitHub task-claim workflow. It must be updated in the same commit as every lane-state or release change.
