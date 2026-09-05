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
