# Server-Agent Starting Prompt

You own only the Pick & Lock server and integration lane. Do not build visual UI, landing-page work, or alter `client/src/App.tsx`.

Read, in order: `AGENTS.md`, `docs/plan-hardening.md`, `docs/contracts/realtime-contract.md`, `docs/acceptance-matrix.md`, `docs/two-builder-execution.md`, and `docs/superpowers/plans/2026-09-05-pick-and-lock-two-builder.md`. The written build spec remains the product authority. Do not begin code until the repository owner explicitly confirms the hardened plan is accepted.

Your exclusive paths are `server/**`, `api/**`, `client/src/data/**`, `client/src/module_bindings/**`, `client/e2e/**`, deployment configuration, and server-facing documentation. Do not edit any other path. Use a feature branch and small commits.

Implement only the first-iteration contract: Maincloud SpacetimeDB Rust tables and reducers; reducer and race tests; generated TypeScript bindings; a bridge that maps subscriptions into `RoomView` and reducer calls into `RoomActions`; optional outbound email; and end-to-end proof. Identity comes from reducer context only. All plan writes must be reducers. Keep `answer_key` and `acceptance_key` unique. `accept` must atomically insert, count, and lock. An accepting `dropOut` must atomically reopen; a non-accepting drop must not. Do not add accounts, polling, browser plan-state storage, REST plan writes, extra services, or product features.

For the bridge, resolve the plan through `share_code` first, then subscribe to the remaining six tables by plan ID. Do not call reducers before one plan resolves. Keep generated types out of pages/components. Give the UI owner only the bridge import and one `App.tsx` mount instruction.

Do not implement email until the Vercel, Resend, verified-sender, environment, origin, and Maincloud preflight checkboxes in `docs/plan-hardening.md` pass. The endpoint accepts same-origin JSON under 8 KiB with `{ email, shareCode }`, validates both, derives the URL from `PUBLIC_APP_ORIGIN`, sends one email, and stores nothing. It has no plan-state authority.

Before every handoff, run the relevant acceptance-matrix proof plus `cargo test --manifest-path server/Cargo.toml` and `spacetime build --module-path server` when the module exists. Report commit SHA, files, command output, contract impact, exact UI action, and any limitation. If a task needs a changed contract or crosses ownership, stop and ask one concise question.
