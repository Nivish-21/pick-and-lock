# Lessons

## 2026-09-05 — Handbook browser safety rejection

The browser tool rejected the direct World Tour handbook URL as unsafe despite the user supplying it. A direct `curl` retrieval then provided the official HTML and chapter 4 schedule. Use a direct read-only fetch when the browser safety layer blocks a user-provided public URL.

## 2026-09-05 — Union type corrupted inside Markdown table

`docs/contracts/realtime-contract.md` placed the `setAnswer` union `'in' | 'out' | 'conditional'` in a pipe-delimited table cell, so Markdown split it into extra columns. Move the input signature into a code block and keep the table entry descriptive.

## 2026-09-05 — Multi-file patch used stale formatted context

A large hardening patch failed because its README anchor did not match the current Prettier-aligned table spacing. Split multi-file edits and copy exact formatted context before patching.

## 2026-09-05 — `npx` command changed the following command's PATH

A chained verification command ran `npx prettier` before `rg` and `rtk`; the npm execution environment removed those shell commands from the later PATH. Run repository tools before `npx`, or in a separate shell command.

## 2026-09-05 — Incorrect hackathon-time inference

The plan treated an earlier statement as meaning the Sunday code freeze had already passed. The user clarified the actual time was 17:46 Saturday, leaving 14 hours 44 minutes. Time-sensitive schedule claims require an explicit timestamp check before they drive scope decisions.

## 2026-09-05 — Assumed a nested web-tool result shape

A repository-comparison call tried to read `r.content` without inspecting the wrapper result, causing a `TypeError`. Serialize or inspect an unfamiliar tool result before accessing nested fields.

## 2026-09-05 — Text patch attempted a binary asset deletion

An `apply_patch` batch included Vite's PNG asset, which cannot be read as UTF-8 patch context and caused the entire batch to abort. Keep binary deletion out of text patches and stage only the needed source files until explicit asset cleanup is handled separately.

## 2026-09-05 — Fixture briefly contradicted the demo activity minimum

`client/src/fixtures/room.ts` initially set Escape room to three people rather than the authoritative minimum of five. Re-read every fixed demo value against `docs/source/pick-and-lock-build-spec.md` before committing fixtures.

## 2026-09-05 — Used pre-formatting TypeScript as a patch anchor

A U3 patch expected an App component without semicolons, but Prettier had reformatted it after U1. Re-read exact current source immediately before each multi-file patch and split it when one formatted anchor can abort the whole task.

## 2026-09-05 — Repeated stale App import formatting in U4 patch

The U4 multi-file patch again assumed single-quoted imports while the formatter had changed `client/src/App.tsx` to double quotes. Use standalone file additions first and a separate, exact-context App patch.

## 2026-09-05 — UI tests leaked mounted DOM between cases

`client/src/pages/LandingPage.test.tsx` rendered twice without cleanup, so the second case found two `Join Saturday room` buttons. Register explicit `afterEach(cleanup)` in React DOM test files rather than relying on runner-specific automatic cleanup.

## 2026-09-05 — Server validation lacked a Rust toolchain

The isolated server-branch validation could not invoke `cargo`, and `spacetime build` then failed because `wasm32-unknown-unknown` was not installed. Verify the Rust compiler and required WASM target before treating a SpacetimeDB module handoff as buildable.

## 2026-09-05 — Subagent dispatch used the wrong input field

The multi-agent tool rejected `prompt`; its schema requires `message` or structured `items`. Inspect a dynamically discovered tool schema before the first invocation rather than inferring its request field.

## 2026-09-05 — Generated bindings failed the whitespace gate

SpacetimeDB code generation left extra blank lines at EOF in four TypeScript binding files, causing `git diff --check` to fail. Run the diff gate after generation and remove only generated trailing blank lines before committing.

## 2026-09-05 — Subagent prompt broke JavaScript interpolation

Backticks in a JavaScript template-literal agent prompt terminated the string before the tool call. Use plain quoted strings or avoid embedded Markdown code markers in orchestration payloads.

## 2026-09-05 — Merged dependency lockfile without refreshing this checkout

After merging `origin/ui/room-qr`, `client/src/components/RoomQrCode.tsx` could not resolve `qrcode.react` during `npm run test --prefix client`. The branch correctly changed `client/package.json` and `client/package-lock.json`; this checkout's `client/node_modules` was stale. After merging any dependency change, run `npm install --prefix client` before the first test/build gate.

## 2026-09-05 — Assumed a Vercel project existed from the repository name

`vercel deploy --dry --project pick-and-lock --yes` failed because the authenticated Vercel team had no project by that name. List or create the Vercel project before a named deployment; the GitHub repository name does not create a Vercel project automatically.

## 2026-09-05 — Maincloud publish required an interactive terminal

`spacetime publish` to Maincloud aborted at its confirmation prompt in a non-interactive shell before changing remote state. Use a TTY and explicitly confirm the reviewed publish after verifying the target database is absent.

## 2026-09-05 — Subagent branches shared the primary checkout

Multiple agents changed branches and wrote partial changes in the primary checkout rather than isolated worktrees. Stop agents before any branch switch, inspect the exact dirty files, preserve only reviewed work, and commit it from the active branch before merging it back.

## 2026-09-05 — Assumed the next GitHub issue number

The private decision-engine plan named issue `#7`, but pull requests and issues share GitHub's repository number sequence, so the created issue was `#10`. Always capture the URL returned by `gh issue create` and update planning references from that authoritative number before assigning work.
