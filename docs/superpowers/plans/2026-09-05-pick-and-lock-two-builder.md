# Pick & Lock Two-Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the complete written Pick & Lock core with two independent contributors: one owns UI and landing, one owns the SpacetimeDB authority and integration layer.

**Architecture:** The frozen `RoomView`/`RoomActions` contract lets the UI use fixtures while the server agent builds Rust reducers and tests. The only integration work is a data bridge that maps generated bindings to the contract; UI components remain unaware of SpacetimeDB.

**Tech Stack:** Rust, SpacetimeDB Maincloud, TypeScript, React, Vite, CSS, Vitest, Playwright, Vercel, Resend.

**Spec:** `docs/source/pick-and-lock-build-spec.md`, `docs/contracts/realtime-contract.md`, and `docs/two-builder-execution.md`

## Global Constraints

- The complete written spec is in scope for iteration one; the deck does not expand scope.
- UI owner and server agent must obey `AGENTS.md` file ownership.
- All plan state is reducer-owned. The client may display derived counts but never authorize actions.
- The lock and dropout reopen are atomic transactions and are never cut.
- No implementation begins in a shared file without a contract-preserving handoff.

---

### Task 1: UI lane - create the visual product with fixtures

**Owner:** UI owner.

**Files:**

- Create: `client/src/pages/LandingPage.tsx`, `client/src/pages/RoomPage.tsx`, `client/src/components/ActivityCard.tsx`, `ProposalCard.tsx`, `EventFeed.tsx`, `PresenceList.tsx`, `ShareLink.tsx`, `ToastRegion.tsx`.
- Create: `client/src/fixtures/saturdayRoom.ts`, `client/src/styles/tokens.css`, `layout.css`, `motion.css`.
- Modify: `client/src/App.tsx`.
- Test: `client/src/pages/RoomPage.test.tsx`, `client/src/components/ActivityCard.test.tsx`.

**Consumes:** `RoomView` and `RoomActions` from `docs/contracts/realtime-contract.md`.

**Produces:** Mobile-first screens that work with fixture data and no server imports.

- [ ] **Step 1: Bootstrap only the UI workspace.**

  Run: `npm create vite@latest client -- --template react-ts`

  Run: `npm install --prefix client qrcode.react`.

  Expected: the UI lane owns `client/package.json`; no server or database code is created here.

- [ ] **Step 2: Write the failing RoomPage fixture test.**

  ```tsx
  render(<RoomPage view={saturdayOpenView} actions={stubActions} />);
  expect(screen.getByText("Bowling")).toBeVisible();
  expect(screen.getByText("4 / 4 - possible")).toBeVisible();
  ```

- [ ] **Step 3: Implement the fixture and presentational props.**

  `saturdayOpenView`, `saturdayLockedView`, and `saturdayReopenedView` must be valid `RoomView` values. Components invoke only methods from `RoomActions`; they do not access browser storage or generated bindings.

- [ ] **Step 4: Build the landing page and four room states.**

  Build the landing page, Join, Choices, Live Group, and Locked Plan. Conditional selection reveals an INR field. Join displays an optional email field but the room enter button only requires a valid display name.

- [ ] **Step 5: Add mobile, accessibility, and transition checks.**

  At 390px width, controls are at least 44px tall, status has text as well as colour, focus is visible, and the lock/reopen panel responds to `view.version`.

- [ ] **Step 6: Verify and commit.**

  Run: `npm test --prefix client` and `npm run build --prefix client`.

  ```bash
  git add client/src client/package.json client/package-lock.json
  git commit -m "feat(ui): build Pick and Lock landing and room fixtures"
  ```

### Task 2: Server lane - schema, seed, and pure rules

**Owner:** Server agent.

**Files:**

- Create: `server/Cargo.toml`, `server/src/lib.rs`, `server/src/rules.rs`, `server/src/rules_test.rs`.
- Test: `server/src/rules_test.rs`.

**Consumes:** Server rules in `AGENTS.md` and reducer/data definitions in `docs/contracts/realtime-contract.md`.

**Produces:** A compiling Rust SpacetimeDB module with the seven public tables and idempotent Saturday seed.

- [ ] **Step 1: Bootstrap only the Rust module.**

  Run: `spacetime init pick-and-lock --server-only --lang rust --project-path server`

  Expected: `server/` is the only new application path created by this lane.

- [ ] **Step 2: Write failing pure-rule tests.**

  ```rust
  #[test]
  fn conditional_answer_is_eligible_at_the_activity_price() {
      assert!(is_eligible(AnswerState::Conditional, Some(400), 400));
      assert!(!is_eligible(AnswerState::Conditional, Some(399), 400));
  }
  ```

- [ ] **Step 3: Define typed rows and seed data.**

  Add `Plan`, `Activity`, `Friend`, `Answer`, `Proposal`, `Acceptance`, and `EventLog`; include `share_code` and `dropped_at`. Seed exactly Bowling/400/4, Escape room/600/5, and Game night/0/3 once.

- [ ] **Step 4: Implement pure eligibility/count helpers.**

  Implement `is_eligible`, `is_possible`, and `active_acceptance_count`. Missing answers and `out` never count; conditional counts only when the ceiling is at least the price.

- [ ] **Step 5: Verify and commit.**

  Run: `cargo test --manifest-path server/Cargo.toml` and `spacetime build --module-path server`.

  ```bash
  git add server
  git commit -m "feat(server): define Pick and Lock schema and rules"
  ```

### Task 3: Server lane - reducers, presence, and atomic invariants

**Owner:** Server agent.

**Files:**

- Modify: `server/src/lib.rs`, `server/src/rules.rs`, `server/src/rules_test.rs`.
- Create: `server/tests/reducer_integration.rs`.

**Produces:** Identity-scoped join/answer/propose/accept/dropout actions with clean error paths.

- [ ] **Step 1: Write reducer acceptance tests.**

  Cover one friend row per sender identity, one answer per friend/activity, no pending-proposal duplicate, no duplicate acceptance, and a non-eligible accepter rejection.

- [ ] **Step 2: Implement join, presence, and answer reducers.**

  Resolve the friend only from `ctx.sender`. `client_connected`, `client_disconnected`, and `leave` mutate only `online`. `set_answer` validates a conditional price and upserts only the caller row.

- [ ] **Step 3: Implement proposal and accept.**

  `propose` requires open plan, possible activity, eligible caller, and no pending proposal. `accept` inserts one acceptance then atomically locks plan/proposal, increments version, and appends the lock event at threshold.

- [ ] **Step 4: Implement dropout and reopen.**

  Set every caller answer to out and `dropped_at`. Reopen only if that caller accepted the locked proposal. Clear locked activity, increment version, and emit the exact remaining-count message in the same transaction.

- [ ] **Step 5: Write the two races.**

  Two simultaneous proposals must leave one pending proposal. Two simultaneous threshold-reaching accepts must leave one lock and one version bump.

- [ ] **Step 6: Verify and commit.**

  Run: `cargo test --manifest-path server/Cargo.toml` and `spacetime build --module-path server`.

  ```bash
  git add server
  git commit -m "feat(server): enforce lock and reopen invariants"
  ```

### Task 4: Server lane - bindings and data bridge

**Owner:** Server agent.

**Files:**

- Create: `client/src/data/spacetime.ts`, `client/src/data/RoomDataBridge.tsx`, `client/src/data/planSelectors.ts`.
- Create: `client/src/module_bindings/**` through the generator.
- Test: `client/src/data/planSelectors.test.ts`.

**Consumes:** A server module from Tasks 2-3 and the frozen UI contract.

**Produces:** A non-visual adapter that supplies `RoomView` and `RoomActions` without touching UI components or `App.tsx`.

- [ ] **Step 1: Generate bindings after the UI client directory exists.**

  Run: `spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path server`

  Expected: generated files are committed unchanged after formatting.

- [ ] **Step 2: Write selector tests against generated-like rows.**

  Test possible count, pending acceptance count, lock state, and reopened state. Assert `buildRoomView` returns the exact contract shape.

- [ ] **Step 3: Implement connection and subscriptions.**

  Connect with `wss://maincloud.spacetimedb.com` and environment database name. Subscribe to all seven room tables. Save only the SpacetimeDB identity token; never cache plan state.

- [ ] **Step 4: Implement `RoomDataBridge`.**

  It renders `children(view, actions)` after subscription application and surfaces reducer errors through the UI-supplied toast callback. It may not import pages, components, styles, or `App.tsx`.

- [ ] **Step 5: Verify and hand off.**

  Run: `npm test --prefix client -- planSelectors` and `npm run build --prefix client`.

  ```bash
  git add client/src/data client/src/module_bindings
  git commit -m "feat(data): bridge realtime room state to UI contract"
  ```

  Handoff: give the UI owner the commit SHA and the exact `RoomDataBridge` import path.

### Task 5: One-time UI mount and two-client proof

**Owner:** UI owner mounts; server agent observes and fixes only owned data/server files.

**Files:**

- Modify: `client/src/App.tsx` by UI owner only.
- Test: `client/e2e/realtime.spec.ts` by server agent.

**Produces:** Fixtures replaced by live subscribed state without rewriting UI components.

- [ ] **Step 1: Mount the bridge.**

  ```tsx
  <RoomDataBridge>
    {(view, actions) => <RoomPage view={view} actions={actions} />}
  </RoomDataBridge>
  ```

- [ ] **Step 2: Test two clients.**

  Client A joins then chooses Bowling `in`. Client B joins and observes Client A plus the updated count without navigation or refresh.

- [ ] **Step 3: Test lock/reopen.**

  Four eligible friends accept Bowling. Assert both clients show Locked Plan. One accepting friend drops out; assert both show Live Group with the remaining-count event.

- [ ] **Step 4: Commit separately by owner.**

  UI owner commits the `App.tsx` mount. Server agent commits only `client/e2e/**` changes.

### Task 6: Email, deployment, and acceptance proof

**Owner:** Server agent owns API/deployment; UI owner owns optional-email and share presentation.

**Files:**

- Create: `api/capture-email.ts`, `vercel.ts`, `client/e2e/race.spec.ts`, `client/e2e/reconnect.spec.ts`, `client/e2e/ten-client.spec.ts`, `docs/demo-script.md`, `docs/deployment.md`.
- Modify: UI-owned Join/Share components only by UI owner.

**Produces:** A public, fresh-device demo with real email and tested realtime guarantees.

- [ ] **Step 1: Provision Resend before writing the API.**

  Run: `vercel integration add resend/resend-email --yes --no-claim`.

  If a browser claim flow opens, the repository owner completes it before the server agent continues. Pull environment names with `vercel env pull --yes`; never commit or print values.

- [ ] **Step 2: Implement email API and UI callback.**

  API accepts a validated email and room URL, sends a confirmation, returns `{ sent: true }`, and does not store data. UI sends only after join and treats failure as non-blocking.

- [ ] **Step 3: Publish and deploy.**

  Run: `spacetime publish --module-path server --server maincloud pick-and-lock`.

  Run: `vercel --prod` after preview verification. Set public `VITE_SPACETIMEDB_HOST` and `VITE_SPACETIMEDB_DATABASE`; keep Resend server-only.

- [ ] **Step 4: Run final acceptance.**

  Execute proposal race, final-accept race, reconnect, ten-client lock/reopen, fresh-phone join under 30 seconds, and six-tab demo. If any update needs refresh, return to Task 4.

- [ ] **Step 5: Commit and tag.**

  ```bash
  git add api vercel.ts client/e2e docs
  git commit -m "feat: deploy Pick and Lock realtime demo"
  git tag -a v1.0.0-pick-and-lock -m "Pick and Lock first iteration"
  git push origin main --follow-tags
  ```

## Self-review

| Requirement                           | Covered by                         |
| ------------------------------------- | ---------------------------------- |
| Full written-spec core                | Tasks 1-6                          |
| UI and backend independence           | Task 1, Tasks 2-4, frozen contract |
| Atomic lock and automatic reopen      | Task 3, Task 5                     |
| No-refresh realtime proof             | Tasks 4-6                          |
| Public phone demo and email           | Task 6                             |
| File ownership for collaborator agent | `AGENTS.md` and every task owner   |

The only shared-file action is the UI owner's one-time `App.tsx` mount. All other code paths are disjoint by ownership.
