# Pick & Lock Contributor Contract

Read these files before changing code:

1. `docs/source/pick-and-lock-build-spec.md`
2. `docs/product-brief.md`
3. `docs/contracts/realtime-contract.md`
4. `docs/plan-hardening.md`
5. `docs/two-builder-execution.md`
6. `docs/superpowers/plans/2026-09-05-pick-and-lock-two-builder.md`
7. `docs/superpowers/plans/2026-09-05-saturday-live-execution.md`

The written build spec is authoritative. Build Pick & Lock: a real-time group activity decision room that locks only after enough eligible people accept and automatically reopens if an accepter drops out. Do not turn it into a generic poll.

## Your role: server and integration lane

You own the SpacetimeDB module, reducer tests, generated bindings, connection/data adapter, optional email API, deployment scripts, and end-to-end concurrency checks. The human UI owner owns the landing page and every visual component.

## File ownership

| Owner           | Exclusive paths                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server agent    | `server/**`, `api/**`, `client/src/data/**`, `client/src/module_bindings/**`, `client/e2e/**`, deployment configuration, server-facing documentation.    |
| UI owner        | `client/src/pages/**`, `client/src/components/**`, `client/src/styles/**`, `client/src/fixtures/**`, `client/src/App.tsx`, landing-page assets and copy. |
| Shared contract | `docs/contracts/realtime-contract.md`. Do not edit it without agreement from the UI owner.                                                               |

Do not edit files outside your owned paths. Do not create an app at repository root. Do not refactor the UI, change its styles, add mock server state, or add a second backend.

Before the first edit, read and follow `docs/prompts/server-agent.md` and `docs/prompts/collaborator-launch.md` verbatim. Do not start implementation until the repository owner says the hardened plan is accepted.

## Non-negotiable server rules

- All authoritative writes run through SpacetimeDB reducers.
- Identity comes only from the reducer context sender; never accept a friend identity or friend ID from the browser as authority.
- Reject invalid actions with short sender errors; do not silently ignore them.
- Exactly one pending proposal or locked activity may exist for a plan.
- `accept` must lock in the same transaction that inserts the threshold-reaching acceptance.
- `drop_out` must reopen in the same transaction when the caller accepted the locked proposal.
- Public client rows are read-only to clients. No REST endpoint may mutate a plan.

## Working sequence

1. Build and test `server/**` against the contract without waiting for UI code.
2. Commit small, focused server changes. Run `cargo test --manifest-path server/Cargo.toml` and `spacetime build --module-path server` before each handoff.
3. Publish only after the owner supplies the Maincloud database name and completes login.
4. Generate bindings into `client/src/module_bindings/` after the client directory exists. Commit generated bindings with the module commit that produced them.
5. Implement `client/src/data/RoomDataBridge.tsx` and `client/src/data/spacetime.ts` without editing `App.tsx` or components. They must expose the `RoomView` and `RoomActions` contract exactly.
6. Tell the UI owner the commit SHA and the one import/mount instruction. Do not mount it yourself.

## Quality gates

- Race: two concurrent proposals yield one success and one visible sender error.
- Race: two final accepts yield one lock, one plan version increment, and no second lock.
- Dropout: an accepting friend reopens the plan; a non-accepting friend does not.
- Reconnect: state rehydrates from subscriptions with no product state in browser storage.
- Ten clients receive lock and reopen without refresh.

## Email capture

The email is optional and non-blocking. Use the provisioned Resend Vercel Marketplace integration from `api/capture-email.ts`; validate server-side, send one confirmation containing the room URL, and never store email addresses or plan state outside SpacetimeDB. Do not add the provider SDK until the integration is provisioned and environment names are present.

## Handoff format

Every handoff comment or PR description must include:

- files changed;
- reducer or adapter contract exposed;
- command output for the relevant test/build;
- the exact UI action needed, if any;
- known limitation, if any.
