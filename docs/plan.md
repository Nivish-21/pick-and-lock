# Active execution plan — 2026-09-06 checkpoint (most recent, read this first)

## Task block: beyond-core-loop merge, ship, and two new parallel lanes (2026-09-06)

Owner decision: get the verified core loop + chat feature in front of real testers now rather than gating on more feature work — tester feedback has latency, so start that clock early. In parallel, two genuinely disjoint new lanes proceed on their own branches (never merged until independently re-verified, same as every prior lane).

**My work (infra/verification, not new product code):**
1. Live-test current `main` end-to-end (core loop + merged chat feature).
2. Merge the isolated `pick-and-lock-beyond-core-loop` feature (commit `538742a`: PWA manifest/icons/OG tags, app-wide `/insights` route, `/api/capture-email` Resend endpoint) — self-contained, already tested (41/41), doesn't touch the core decision engine or `RoomDataBridge.tsx`. Same merge-main-in → resolve `App.tsx` conflict → independently re-verify → PR → merge process as #16/#17.
3. Deploy to Vercel, confirm the Maincloud DB matches what's published.
4. Owner invites real testers once the above is live.

**Builder A — issue #20, branch `client/activity-constraints`:** add `distance_km`/`time_minutes` as optional display/filter attributes on `Activity` (additive schema, not a feasibility-matching engine — owner explicitly chose the smaller scope). Touches the server `Activity` struct + `add_activity`/`bot_add_activity` reducers, and ONLY the "Add an option" form block in `client/src/pages/RoomPage.tsx`, plus `ActivityCard.tsx`, `spacetime.ts`, `fixtures/room.ts`.

**Builder B — issue #21, branch `client/room-chat-wiring`:** replace the `TODO(issue #16)` placeholder chat wiring with real `my_room_chat`/`my_room_preferences` subscriptions and `sendChatMessage`. Touches ONLY the `RoomSidebar` block in `client/src/pages/RoomPage.tsx` plus chat-related additions to `spacetime.ts`.

Both lanes touch `RoomPage.tsx` but in disjoint regions (form block vs. sidebar block) — same pattern that already merged cleanly for #16/#17. Neither merges into `main` until independently re-verified by re-running the full test/lint/build suite myself, not just trusting the builder's self-report.

## Resume point

Both chat-feature lanes are merged into `main`: issue #17 (onboarding + split-chat layout, PR #18) and issue #16 (server retarget to `Plan.id` + `bot_add_activity`/`ensure_bot_friend` + autonomous poll authoring, PR #19) — both independently re-verified, not just self-reported. To resume:

1. ~~Check GitHub issue #16~~ — done, merged as PR #19 (`70e0ca5`).
2. Regenerate/confirm `client/src/module_bindings` is current (PR #19 already includes `bot_add_activity_reducer.ts`/`ensure_bot_friend_reducer.ts`), then replace the `TODO(issue #16)` placeholder chat wiring in `client/src/pages/RoomPage.tsx` (`messages={[]}`, `onSend={placeholderSendChat}`) with the real `my_room_chat`/`my_room_preferences` subscriptions and `sendChatMessage` action (client-side plumbing pattern already established in `RoomDataBridge.tsx`/`spacetime.ts` for `activity`/`friend`/etc.). This is not yet a filed issue — needs a new prompt/issue before either builder can pick it up.
3. Re-run full verification (server + client + bot-service, see PR #19's body for the exact command list), then publish to Maincloud again with explicit owner confirmation (`spacetime publish pick-and-lock --module-path server/spacetimedb --yes=remote` — additive-only, verify with `git diff <prev> HEAD -- server/spacetimedb/src/lib.rs` that no existing table's columns changed, same check performed before every publish so far).
4. Live-browser-test the merged result the same way this session did (create a room, join, exercise the feature, check console/network) before considering it done — unit tests alone missed both the "module not republished" and "wrong room schema" defects this session found.

Everything below this point is prior-session history, kept for context; `docs/status.md` and `docs/changelog.md` have the full detailed log of what was merged, verified, and published.

## Where this stands right now (2026-09-05, superseded by Resume point above)

Design approved. Spec written and committed to:
`docs/superpowers/specs/2026-09-05-web-fix-and-chat-agent-design.md`

That spec is the source of truth for: diagnosis of the broken UI, lane ownership (A=teammate's decision-engine worktree, B=client wiring fix, C=chat+location schema, D=bot service, E=verification), the full data model, the bot's deterministic speak-gate design, and the non-goals list. Read it before doing anything else in this repo.

**Not yet done**: the detailed, self-contained task-by-task implementation plan (one per lane, written so a Codex CLI instance can run each unattended for hours without live steering). Next action on resuming: invoke `superpowers:writing-plans` against the spec above, scoped to Lanes B/C/D/E, and produce the exact per-lane prompts the user pastes into Codex.

## Environment facts established this session (do not re-derive)

- Two people building in parallel: this session (client/chat/bot) + a teammate driving the existing `server/private-decision-engine` worktree (Lane A). A peer Claude session `development-de` (idle) also exists in this repo's history but the user confirmed both humans keep separate parallel agents — no ownership collapse.
- LLM: AI Grants India key, OpenAI-compatible proxy at `https://aigrants.in/v/gpt`. Models available on that key: `davinci-002`, `gpt-5-nano`, `gpt-5.6-luna`, `text-embedding-3-small`, `text-embedding-ada-002`. Design targets `gpt-5-nano` for the bot's per-turn call.
- Voice credit key (`SMALLEST_API_KEY`, smallest.ai, `https://aigrants.in/v/sm`) exists but is explicitly **not used** by the current design — flagged as out of scope, not wired anywhere.
- Google Places API key: user confirmed they have one with free-tier headroom. **Not yet verified working** — next action once the real key is in `.env`: run one masked test call (Nearby/Text Search) and report only the HTTP status, never the key value.
- Secrets handling: `.gitignore` now ignores `.env`/`.env.*` (was previously NOT ignoring env files at all — fixed this session, verified with `git check-ignore -v .env`). `.env.example` and `.env` (empty template, gitignored) exist at repo root with `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `SMALLEST_API_KEY`, `SMALLEST_BASE_URL`, `GOOGLE_PLACES_API_KEY`. The real key values the user pasted in chat arrived already truncated/stripped — never obtained the raw values; user must fill `.env` directly in their editor, never paste secret values into this chat again.
- Codex CLI: `which codex` resolves to `/Users/nivish/.superset/bin/codex` — this is **Superset.app's own wrapped/managed agent CLI** (its own `auth.json`, model already set to `gpt-5.6-terra`, plugin/marketplace system layered into the shared `~/.codex/config.toml`). It has no visible `[model_providers.*]` section and is very likely tied to Superset's own billing, not a raw configurable OpenAI endpoint.
- A **separate, real, standalone `@openai/codex@0.150.1`** is already installed via npm and symlinked at `/opt/homebrew/bin/codex` — currently shadowed on PATH by Superset's binary of the same name. This is the one to point at the aigrants key (see instructions below), invoked by its full path to bypass the shadow.

## Codex CLI setup — hand this to the user, do not do it for them

1. Fill in the real key values directly in `/Users/nivish/development/Moonshot/.env` (already created, gitignored) — never paste them into a chat session again.
2. To use the real, standalone Codex CLI (not Superset's wrapper), invoke it by full path: `/opt/homebrew/bin/codex`. Superset's `~/.superset/bin/codex` shadows it earlier on PATH under the plain `codex` name.
3. Before running, export the two env vars so the real Codex CLI's default OpenAI provider points at the aigrants proxy instead of api.openai.com:
   ```
   export OPENAI_API_KEY="<value from .env>"
   export OPENAI_BASE_URL="https://aigrants.in/v/gpt"
   ```
4. Pass the model explicitly on every invocation, since Codex CLI's own default model will not exist on the aigrants proxy: `/opt/homebrew/bin/codex --model gpt-5-nano ...` (or `gpt-5.6-luna` for heavier reasoning tasks — the plan below will say which lane uses which).
5. Sanity-check with a trivial prompt first (e.g., "reply with OK") before pointing it at a multi-hour unattended build — confirm it actually reaches the aigrants proxy and doesn't silently fall back to Superset's or a cached default provider.
6. **Exact TOML syntax for a persistent `[model_providers.aigrants]` block was not verified against current Codex CLI docs this session** — if step 3's env-var approach doesn't stick across invocations, check `https://aigrants.in/v/gpt`'s own setup guide (the user already has this link) before guessing at config.toml keys.

## Next steps in order

1. Resume with `superpowers:writing-plans`, input = the committed spec, scope = Lanes B, C, D, E only (Lane A stays the teammate's).
2. Output: one self-contained prompt per lane (Codex will run each unattended for hours — lunch/dinner/nap/events happening in parallel), each with: exact files to touch, exact commands to verify (build/test/lint), a hard "do not publish to Maincloud / do not deploy without explicit owner confirmation" boundary, and a definition of done.
3. Recommend git worktrees per lane (matching this repo's existing `.worktrees/` convention) so parallel Codex instances don't collide on the same files, especially since Lane C touches the same `lib.rs` file Lane A is already mid-editing.
4. User runs each lane's prompt in its own Codex CLI invocation/worktree; this session checks progress when asked ("babysitting" role — verify commits, run quality gates, do not re-do the build).

## 2026-09-05 update — Codex CLI investigation outcome + security incident

**Corrected facts (supersede the "Environment facts" and "Codex CLI setup" sections above where they conflict):**

- `https://aigrants.in/v/gpt` is **not** an API base URL — it's a personal redirect link that 307s to a ChatGPT share page. Live-tested: every OpenAI-compatible path under it (`/v1/chat/completions`, `/v1/responses`, `/v1/models`) returns 404 with the marketing site's HTML. `OPENAI_BASE_URL` must be removed from `.env` / `.env.example` — there is no proxy. The key is a **real OpenAI API key**, verified live against `https://api.openai.com/v1/chat/completions` (HTTP 200, real completion from `gpt-5-nano-2025-08-07`).
- This org's key only has access to: `gpt-5-nano`, `gpt-5.6-luna`, `gpt-5.6-sol`, `text-embedding-3-small`, `text-embedding-ada-002` (confirmed via live `/v1/models`, not the possibly-stale list the user was told).
- Codex CLI (`/opt/homebrew/bin/codex`, tested at both 0.150.1 and 0.153.4 — user updated mid-session, no change) defaults to stored ChatGPT-login auth (`model: gpt-5.6-terra`) and ignores `OPENAI_API_KEY` as a plain env var. Fix: `codex login --with-api-key` (reads key from stdin), which writes real auth state — must be done against an **isolated `CODEX_HOME`** so it doesn't clobber the user's normal ChatGPT-logged-in Codex used elsewhere (Superset, other projects). Isolated home created at `~/.codex-aigrants`; project profile at `~/.codex-aigrants/pickandlock.config.toml` (`model = "gpt-5-nano"`, `[tools] web_search = false`).
- **Hard blocker, confirmed on both CLI versions, not fixable via any documented client-side config** (`tools.web_search=false`, feature flags, fresh login all tried): every `codex exec` call fails on the first turn with `Tool 'web_search_preview' disabled for this organization.` Codex CLI unconditionally requests this hosted tool via the Responses API (Chat Completions wire format is hard-removed in these versions — `wire_api = "chat"` errors at config load). This is an OpenAI-org-level permission on the AI Grants India account, not something Codex CLI, this repo, or the key holder can toggle from the client side.
- Options on the table, presented to the user: (a) org admin enables the hosted tool at `platform.openai.com/settings/organization/data-controls/hosted-tools`, or (b) drop Codex CLI as the build executor and have this session run the unattended build directly instead. **Decision point still open** — pending key rotation (below) before re-testing.

**Security incident — key rotation required, blocks everything above:**

The API key currently in `.env` (`sk-proj-aFf...`) was pasted in plaintext into a teammate's ("prana", Windows) personal ChatGPT conversation, which they then shared via a public `chatgpt.com/share/...` link and sent to this session. ChatGPT itself told them to revoke it. Anyone with that share URL can read the raw key. **Do not proceed with any further build work on this key until it is rotated.** Once a new key exists:
1. User pastes it in chat as before (a hook strips it before it reaches this session and writes straight to `.env` — confirmed working, key never entered this session's context).
2. Re-run the masked live verification against `api.openai.com` (same method as above) and re-run `codex login --with-api-key` against `~/.codex-aigrants` with the new key.
3. Re-test one `codex exec` turn to see if the `web_search_preview` block still applies (it's an org setting, not tied to the specific key, so expect it to persist unless the org dashboard was changed).

**Current action:** starting Lane B (client wiring fix — `LandingPage.tsx` hardcoded fixture, missing custom-poll UI, `CreateRoomPage.tsx`) directly in this session while key rotation is pending, since that work has no dependency on the LLM key or Codex CLI.

## Lane B — add-activity client wiring (2026-09-05)

Goal: expose the existing server `add_activity` reducer through the live client room UI, with focused success and error coverage.

Scope: `client/src/pages/**`, `client/src/components/**`, `client/src/data/**`, `client/src/fixtures/room.ts`, `client/src/module_bindings/**`, and `client/src/styles/room.css`. Generated bindings are regenerated, not hand-edited. No server or proposal/vote changes.

- [x] Regenerate TypeScript bindings and confirm the generated reducer method/signature.
- [x] Add `addActivity(name, price, minPeople)` to the bridge actions and `RoomActions`; keep fixture actions no-op.
- [x] Add the joined-room form, using the existing `runAction` toast error path and current room styling.
- [x] Add focused React Testing Library coverage for valid arguments and reducer failure toast; run the focused test red before implementation, then green.
- [x] Run all requested Rust/client verification commands plus `git diff --check`.
- [x] Append completion state to `docs/status.md` and `docs/changelog.md`, commit, push, and comment on issue #12.

Assumptions: the form is available on open joined rooms because `RoomPage` is only rendered after joining; no separate membership field exists in `RoomView`, so the server remains the authority for rejecting unauthorised calls. The required project logs are procedural files despite the source-only ownership boundary.

## Sorted rebrand (2026-09-05)

Goal: replace user-facing “Pick & Lock” branding with “Sorted” and install the supplied browser/app icons without changing the live SpacetimeDB database name or internal references.

Scope: `client/public/`, `client/index.html`, `client/src/pages/LandingPage.tsx`, `client/src/pages/RoomPage.tsx`, `client/src/pages/CreateRoomPage.tsx`, and their existing landing/room stylesheets. Procedural project logs will also be updated; no server, connection string, README, AGENTS, or fixture URL changes.

- [x] Copy the supplied PNG and generate 32px favicon and 180px Apple touch icon with `sips`.
- [x] Update the browser title, favicon links, wordmarks, and user-facing accessibility labels to Sorted.
- [x] Run the requested client tests, lint, build, and whitespace checks.
- [x] Update project status/changelog, commit, and push `ui/rebrand-sorted`.

Assumption: the source icon is trusted as supplied and does not need visual editing; only the requested raster sizes are generated.

## Onboarding and split chat (2026-09-05)

Goal: let room creators enter their name during room creation and auto-join after navigation, then mount the existing chat and shared-context components in a responsive RoomPage sidebar using placeholder data until issue #16 lands.

Scope: `client/src/pages/CreateRoomPage.tsx`, `client/src/pages/CreateRoomPage.test.tsx`, `client/src/pages/RoomPage.tsx`, `client/src/App.tsx`, `client/src/data/**` only if needed for the placeholder boundary, `client/src/styles/room.css`, and relevant tests. No server or bot-service paths.

+ [x] Add and validate the host-name field; include it in the create callback and store the pending host name before navigation.
+ [x] Auto-join pending creators in `RoomSession`, remove the session key only after join succeeds, and preserve the shared-link LandingPage path.
+ [x] Add the responsive two-column room layout and mount `RoomChat` plus `GroupInputPanel` with empty placeholder props and an issue #16 TODO at the data boundary.
+ [x] Add tests for host-name validation and create payload; add a focused RoomSession integration test proving pending-host navigation skips LandingPage and renders RoomPage after join.
+ [x] Run client tests, lint, build, and `git diff --check`.
+ [x] Update project status/changelog, commit incremental work, push `client/merged-onboarding-split-chat`, and comment on issue #17.

Assumptions: the existing `CreateRoomPage.onCreate` callback remains the create boundary, so the parent stores `pending-host-name:${shareCode}` after `createRoom` succeeds; the current RoomDataBridge provides the same `RoomActions` contract while issue #16 is unresolved.
