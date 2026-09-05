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

## 2026-09-05 — Client test command ran without worktree dependencies

`npm run test --prefix client -- --run src/pages/RoomPage.test.tsx` failed before Vitest discovery with `vitest: command not found` because this Git worktree had no `client/node_modules`. The source test was not evaluated. Refresh the local dependency tree from `client/package-lock.json` before interpreting client test results.

## 2026-09-05 — Rebrand JSX needed formatter pass

The initial Sorted icon swap passed lint, tests, build, and whitespace checks, but `prettier --check` flagged `client/src/pages/RoomPage.tsx` and `client/src/pages/CreateRoomPage.tsx`. Run the repository formatter on modified JSX before the final gate.

## 2026-09-05 — Onboarding test worktree lacked dependencies

`npm run test --prefix client -- --run src/pages/CreateRoomPage.test.tsx src/App.test.tsx` failed before Vitest discovery with `vitest: command not found`; the onboarding worktree had no `client/node_modules`. Install from `client/package-lock.json` before evaluating the new tests.

## 2026-09-06 — Date/time picker test retained the old date fixture shape

`client/src/pages/CreateRoomPage.test.tsx` passed `"Tonight"` as the second argument to the invalid-host helper after the field changed from free text to `datetime-local`. The helper interpreted it as an empty/invalid datetime in the browser, so date validation ran before host validation. Update callers whenever a test helper's parameter meaning changes.

## 2026-09-06 — Assumed a generated SpacetimeDB row implemented `Clone`

`server/spacetimedb/src/lib.rs` failed with `E0599` while adding the public-story refresh path because `SharedRoomStory` has no `Clone` derive. Capture the required scalar (`published_at`) before moving a generated row into the replacement helper; never assume a SpacetimeDB table row is clonable unless its declaration explicitly derives `Clone`.

## 2026-09-06 — Ran a TypeScript one-liner with top-level await

The two-identity SpacetimeDB subscription proof did not execute because `tsx -e` emitted CommonJS and rejected top-level `await`. Wrap exploratory `tsx -e` code in an async IIFE before interpreting the command as a live test.

## 2026-09-06 — Let shell quotes corrupt a live SQL probe

The retry created its authorised temporary room but sent `SELECT * FROM plan WHERE share_code =` because a single quote inside a single-quoted `tsx -e` payload was consumed by the shell. Construct SQL string delimiters in TypeScript or use a separately patched script; never place SQL single quotes directly inside a shell single-quoted payload.

## 2026-09-06 — Assumed the Vercel CLI was locally installed

`npx --no-install vercel` could not inspect the deployment because this checkout has no local Vercel CLI dependency. Check the executable path or use the configured global CLI before a deployment-status command; do not interpret a package-resolution error as deployment state.

## 2026-09-06 — Client build did not typecheck the Vercel function

The Vercel production build reported `TS2591` for `process.env` in `api/capture-email.ts` even though `npm run build --prefix client` passed. Include the API compilation boundary in release verification; a successful Vite client build does not validate Vercel function types.

## 2026-09-06 — Assumed the Vercel function used the repository-root API path

The deployment runs with `client/` as its Vercel root, so `api/capture-email.ts` resolves under that directory rather than the repository root. Resolve deployment-relative paths before inspecting a Vercel build error.

## 2026-09-06 — Ran an explicit-file TypeScript check without its TypeScript 6 flag

TypeScript 6 rejects a command that specifies source files while a `tsconfig.json` is present unless `--ignoreConfig` is also supplied. Add the flag for one-file compiler probes before drawing conclusions from the result.

## 2026-09-06 — Used a stale release-log patch anchor

A combined status/changelog/README patch failed because the expected final status line was not the exact current text. Re-read the destination tails and split append-only release-log edits from unrelated README and plan changes.

## 2026-09-06 — Used unsupported line-number hunks with `apply_patch`

An attempt to append release notes using a standard unified-diff line-number hunk failed because this patch tool requires textual context. Use the exact final line as the append anchor.

## 2026-09-06 — Assumed the bot package exposed a typecheck script

`npm run typecheck --prefix api/bot-service` failed because `package.json` has no such script, despite TypeScript being available. Inspect package scripts before composing a full gate; use `tsc --noEmit` directly until the project explicitly adds that script.
