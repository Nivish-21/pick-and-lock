# UI-Owner Starting Prompt

You own the Pick & Lock UI and landing lane. Do not write SpacetimeDB reducers, bindings, data bridge, email endpoint, or deployment configuration.

Read, in order: `docs/plan-hardening.md`, `docs/contracts/realtime-contract.md`, `docs/acceptance-matrix.md`, `docs/two-builder-execution.md`, and `docs/superpowers/plans/2026-09-05-pick-and-lock-two-builder.md`. Build only after the repository owner accepts the hardened plan.

Your exclusive paths are `client/src/pages/**`, `client/src/components/**`, `client/src/styles/**`, `client/src/fixtures/**`, `client/src/App.tsx`, and landing-page assets/copy. Use fixtures implementing the frozen `RoomView` and stubbed `RoomActions`; do not import bindings or wait for the backend.

Build the landing page and the Join, Choices, Live Group, Locked Plan, and reopened states. The path is `/r/SATURDAY`. Make name-only join clear, explain conditional price, show live feasibility, make proposer acceptance explicit, explain automatic reopen, and render reopens through an `aria-live` region. Email is an optional post-join action with Skip; it never delays entry. Preserve the frozen prop contract and treat reducer errors as toast text.

At the handoff, replace fixtures with the server-supplied bridge in one small `client/src/App.tsx` commit. Do not alter the bridge, generated bindings, or server paths. Verify the fixture suite, production build, 390px layout, keyboard focus, and the acceptance rows you own. Report commit SHA, files, command output, contract impact, exact server dependency, and any limitation.
