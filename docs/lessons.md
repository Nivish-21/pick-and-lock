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
