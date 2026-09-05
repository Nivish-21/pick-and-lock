# Public decision stories and agent collaboration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a creator deliberately publish a privacy-safe, read-only room story with a create-room CTA, while making two coding agents self-direct from a GitHub issue queue.

**Architecture:** Private v2 tables remain the source of truth in SpacetimeDB. Creator-authorised reducers control a narrow public `shared_room_story` view; the React public page renders that projection only. GitHub Issues supply atomic task claiming and pull requests supply durable handoffs, so agents do not require a human to relay every next task.

**Tech Stack:** Rust + SpacetimeDB Maincloud, generated TypeScript bindings, React 19, TypeScript, Vite, Vitest, Testing Library, GitHub Issues and pull requests.

**Spec:** `docs/public-sharing-and-cta-spec.md` and `docs/agent-collaboration-protocol.md`

## Global Constraints

- v1 public tables and routes remain untouched; this is additive v2 work.
- Private canonical rows use private tables; member reads use caller-filtered views, not experimental RLS.
- Public stories are default-off, read-only, and never project member names, identities, votes, chat, invite fields, preferences, or price limits.
- No frontend dependency is permitted; use existing React, browser clipboard, and QR patterns.
- Only the repository owner confirms a Maincloud publish or production deployment.
- Every agent claims one GitHub issue before editing and works only inside its issue’s allowed paths.

---

## File map

| Path                                                        | Responsibility                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------- |
| `server/spacetimedb/src/lib.rs`                             | v2 sharing state, creator-only reducers, and public projection view |
| `client/src/module_bindings/**`                             | Generated public-story bindings                                     |
| `client/src/public-share-route.ts`                          | Parse and create opaque `/share/<publicRoomId>` paths               |
| `client/src/data/PublicStoryBridge.tsx`                     | Subscribe only to the public projection                             |
| `client/src/pages/public-room/SharedRoomStory.tsx`          | Read-only public page                                               |
| `client/src/components/public-room/PublicShareSettings.tsx` | Creator sharing controls with injected callbacks                    |
| `client/src/styles/public-room.css`                         | Scoped responsive public-story styles                               |
| `client/src/App.tsx`                                        | Sole route integration after bridge and page are ready              |
| `client/e2e/public-sharing.spec.ts`                         | Two-identity privacy proof                                          |

### Task 1: Create and operate the collaboration queue

**Files:**

- Create: GitHub Issues `V2-PS1` through `V2-PS4`
- Read: `docs/agent-collaboration-protocol.md`

**Produces:** Each agent can claim exactly one unblocked task without a relay prompt.

- [x] Create the listed labels and the v2 issue queue from the current public-sharing issue graph.
- [x] Put task scope, allowed paths, dependencies, and the listed acceptance proof into each issue.
- [x] Send the bootstrap prompt from `docs/agent-collaboration-protocol.md` to each internal collaborator agent once.
- [x] Verify every active internal agent has a claimed issue and every dependent issue has a visible blocker comment.

### Task 2: Add the creator-controlled SpacetimeDB public projection

**Owner:** Server agent, issue `V2-PS1`.

**Files:**

- Modify: `server/spacetimedb/src/lib.rs`
- Modify: `client/src/module_bindings/**` (generated output only)

**Consumes:** Private v2 `private_room`, `room_choice`, `room_decision`, `room_metrics`, and schedule data from `docs/private-rooms-and-scheduling-spec.md`.

**Produces:** `publish_room(room_id, show_schedule)`, `set_public_share_settings(room_id, show_schedule)`, `unpublish_room(room_id)`, and public `shared_room_story` rows.

- [ ] Write a failing module test: a non-creator `publish_room` call returns an explicit error.
- [ ] Write a failing module test: a published locked room projects only ID, title, status, choice labels, selected choice, aggregate decision count, timestamps, and schedule only when `show_schedule` is true.
- [ ] Write a failing module test: no projection field exposes member, identity, vote, chat, invite, preference, or price-limit data; unpublishing leaves zero story rows.
- [ ] Implement minimum private sharing state and creator checks; never create a public copy of a private row.
- [ ] Generate bindings and run `cargo fmt --check`, `cargo test --manifest-path server/spacetimedb/Cargo.toml`, and `spacetime build --module-path server/spacetimedb`.
- [ ] Commit only server and generated-binding files as `feat: add public decision story projection`.

### Task 3: Build the independent public-story UI

**Owner:** UI agent, issue `V2-PS2`.

**Files:**

- Create: `client/src/pages/public-room/SharedRoomStory.tsx`
- Create: `client/src/pages/public-room/SharedRoomStory.test.tsx`
- Create: `client/src/components/public-room/PublicShareSettings.tsx`
- Create: `client/src/components/public-room/PublicShareSettings.test.tsx`
- Create: `client/src/styles/public-room.css`

**Consumes:** A local exported `PublicRoomStory` type with `publicRoomId`, `title`, optional `summary`, `status`, `publishedAt`, `choices`, optional `winningChoice`, `decisionCount`, and optional `schedule`.

**Produces:** Fixture-driven accessible UI with no SpacetimeDB import or generated-binding dependency.

- [x] Wrote component tests for the exact CTA plus locked/public story content.
- [x] Wrote component coverage for story fields with no member, chat, or vote data in the public type.
- [x] Implemented `SharedRoomStory` with loading/unpublished states, read-only choice/result content, and exact CTA copy.
- [x] Implemented `PublicShareSettings` with injected callbacks and a public-field preview.
- [x] Ran 23 client tests, lint, and production build successfully.
- [x] Reviewed with no findings and merged `9d82753` (`feat: add public decision story UI`).

### Task 4: Integrate public path and projection bridge

**Owner:** Integration agent, issue `V2-PS3`.

**Files:**

- Create: `client/src/public-share-route.ts`
- Create: `client/src/public-share-route.test.ts`
- Create: `client/src/data/PublicStoryBridge.tsx`
- Modify: `client/src/App.tsx`

**Consumes:** Generated `shared_room_story` bindings from Task 2 and `SharedRoomStory` from Task 3.

**Produces:** `/share/<publicRoomId>` subscribes only to the public projection; `/r/<publicRoomId>` keeps member-only behaviour.

- [ ] Write route tests that accept `/share/ABC123`, normalise lower-case IDs, and reject `/share/`, `/share/ABC-123`, and `/r/ABC123`.
- [ ] Write a bridge test where an unpublished fixture renders “This decision story is not public.” and never calls a member-only subscription.
- [ ] Implement parser `^/share/([A-Z0-9]{6,24})/?$` and `publicSharePath(id)`.
- [ ] Implement `PublicStoryBridge` using only the generated public-story subscription and map fields one-to-one to `PublicRoomStory`.
- [ ] Add the public route before the existing room route in `App.tsx`; do not modify the member-room flow.
- [ ] Run `npm run test --prefix client -- --run`, `npm run lint --prefix client`, `npm run build --prefix client`, and `git diff --check`.
- [ ] Commit only integration paths as `feat: route public decision stories`.

### Task 5: Prove privacy with two identities and ready the release

**Owner:** Server/E2E agent, issue `V2-PS4`; repository owner performs publish confirmation.

**Files:**

- Create: `client/e2e/public-sharing.spec.ts`
- Modify: `docs/status.md`, `docs/changelog.md`, `docs/project-handoff.md` after verified completion only

**Consumes:** Merged Tasks 2–4 in a local test database or confirmed Maincloud test deployment.

**Produces:** Evidence that sharing has no private-data leakage and an owner-ready deployment request.

- [ ] Test as creator: create a private room, publish with schedule hidden, and verify the public story has no schedule.
- [ ] Test as a fresh outsider: visit `/share/<id>` and assert absence of member names, chat, private-room content, vote controls, and writes; assert CTA target `/`.
- [ ] Test as a fresh outsider: direct `/r/<id>` yields no room content before invite acceptance.
- [ ] Test as creator: unpublish, then verify a fresh public visit is unpublished while a member retains access.
- [ ] Run the existing client gates plus the E2E test and attach command output to the pull request.
- [ ] Ask the owner for explicit confirmation before a Maincloud publish. After a confirmed publish, verify the public URL and append verified state to status, changelog, and handoff docs.

## Plan self-review

- Spec coverage: private-by-default, creator opt-in, schedule consent, public projection, CTA, unpublish, no-leak proof, v1 coexistence, and autonomous collaboration map to Tasks 1–5.
- Placeholder scan: every task names its files, owner, interface, checks, and handoff.
- Type consistency: `PublicStoryBridge` produces `PublicRoomStory`, `SharedRoomStory` renders it, and the bridge reads only `shared_room_story`.

### Task 6: Maintain the incoming-contributor README

**Owner:** Repository owner.

**Files:**

- Create: `README.md`
- Modify: `docs/README.md`

**Produces:** One current entry point that states working behaviour, active lanes, safety boundaries, local checks, and the agent task queue.

- [x] Replace the missing root-level project entry point with a product README.
- [x] Link the root README from the documentation index and add v2 document routing.
- [ ] After every merge, publish, deployment, or lane-state change, update the README status table in the same documentation commit.
