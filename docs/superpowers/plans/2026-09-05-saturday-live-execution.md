# Saturday Live Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete Pick & Lock first iteration by the Sunday 08:30 IST code freeze with independent UI and SpacetimeDB lanes.

**Architecture:** The UI renders the frozen `RoomView` from fixtures while the server lane builds the SpacetimeDB module and tests. After the owner publishes the tested module to Maincloud, the server lane generates bindings and supplies a data bridge; the UI owner makes the sole shared integration edit in `client/src/App.tsx`.

**Tech Stack:** Rust, SpacetimeDB Maincloud, React, TypeScript, Vite, Vercel, Resend, Playwright.

**Spec:** `docs/source/pick-and-lock-build-spec.md`, `docs/contracts/realtime-contract.md`, `docs/plan-hardening.md`, and `docs/acceptance-matrix.md`

## Global Constraints

- Use Maincloud; do not self-host.
- The account owner publishes `pick-and-lock`; the collaborator never handles owner credentials.
- The UI owner owns visual code; the collaborator owns reducer, bridge, binding, API, and E2E code.
- All authoritative room writes are SpacetimeDB reducers.
- Do not introduce product scope beyond the written build specification.

---

### Task 1: Owner readiness and independent workspace launch

**Owner:** Repository/UI owner.

**Files:**

- Create: Vite-generated `client/**` only.
- Read: `docs/maincloud-owner-runbook.md`.

**Produces:** An authenticated Maincloud owner and an empty UI workspace that the server lane can later extend only inside its owned paths.

- [ ] **Step 1: Authenticate to Maincloud.**

  Run:

  ```bash
  spacetime login
  spacetime login show
  ```

  Expected: CLI shows the owner's authenticated account. No token enters Git or chat.

- [ ] **Step 2: Create and commit the UI workspace.**

  Run:

  ```bash
  git checkout -b ui/landing-and-fixtures
  npm create vite@latest client -- --template react-ts
  npm install --prefix client
  git add client
  git commit -m "chore(ui): bootstrap Vite workspace"
  git push -u origin ui/landing-and-fixtures
  ```

  Expected: `client/` exists; no server, bridge, or bindings path is written by the UI owner. Merge this bootstrap-only commit into `main` immediately so the collaborator later has an owned client workspace for generated bindings and the data bridge.

- [ ] **Step 3: Send the collaborator launch prompt.**

  Send the entire code block in `docs/prompts/collaborator-launch.md` without edits.

### Task 2: Server M1 — schema, authority, and reducer proof

**Owner:** Collaborator/server agent.

**Files:**

- Create and modify: `server/**`.
- Test: Rust unit and reducer-integration tests inside `server/**`.

**Consumes:** Frozen reducer inputs and lifecycle rules from `docs/contracts/realtime-contract.md`.

**Produces:** A buildable module with tested authoritative state and no dependency on UI files.

- [ ] **Step 1: Initialise only the server module.**

  Run:

  ```bash
  spacetime init pick-and-lock --server-only --lang rust --project-path server
  ```

  Expected: only `server/` is created by this lane.

- [ ] **Step 2: Write failing rule and reducer tests.**

  Create tests with these exact assertions before reducer implementation:

  ```text
  conditional maxPrice 400 is eligible for Bowling price 400
  conditional maxPrice 399 is not eligible for Bowling price 400
  the same sender joins twice and still has one active Friend row
  the same friend/activity answer key has one row after two setAnswer calls
  the same proposal/friend acceptance key rejects a second accept
  two simultaneous propose calls leave exactly one pending proposal
  two simultaneous threshold-reaching accept calls leave one locked plan and one version increment
  accepting dropout reopens; non-accepting dropout leaves the plan locked
  a dropped sender reconnects and join rejects with "You are marked out for this plan"
  ```

- [ ] **Step 3: Implement the minimal public schema, seed, and reducers.**

  Implement only the tables, activity seed, identity rules, and reducer invariants listed in the collaborator launch prompt and frozen contract.

- [ ] **Step 4: Run the server proof.**

  Run:

  ```bash
  cargo test --manifest-path server/Cargo.toml
  spacetime build --module-path server
  ```

  Expected: both commands exit successfully.

- [ ] **Step 5: Commit and push the server branch.**

  Run:

  ```bash
  git add server
  git commit -m "feat(server): implement Pick and Lock realtime core"
  git push -u origin server/realtime-core
  ```

### Task 3: UI M1 — fixture-complete product

**Owner:** Repository/UI owner.

**Files:**

- Create and modify: `client/src/pages/**`, `client/src/components/**`, `client/src/styles/**`, `client/src/fixtures/**`, `client/src/App.tsx`.

**Consumes:** `RoomView` and `RoomActions` from the frozen contract.

**Produces:** Landing, Join, Choices, Live Group, Locked, and reopened states with no SpacetimeDB imports.

- [ ] **Step 1: Implement fixture values and stub actions.**

  Include open, pending, locked, and reopened values that conform to `RoomView`, including `sendJoinEmail(email, shareCode)`.

- [ ] **Step 2: Implement the visual states.**

  Include name-only join, conditional-price selection, proposal/accept progress, dropout explanation, optional post-join email with Skip, and an `aria-live` reopen message.

- [ ] **Step 3: Verify fixture UI.**

  Run:

  ```bash
  npm test --prefix client
  npm run build --prefix client
  ```

  Expected: tests and production build pass before bridge integration.

### Task 4: Maincloud publish and data bridge

**Owner:** Maincloud publish by repository owner; bridge by collaborator.

**Files:**

- Owner modifies no tracked files.
- Collaborator creates: `client/src/module_bindings/**`, `client/src/data/**`.

**Consumes:** Merged server-core commit and published database name `pick-and-lock`.

**Produces:** Generated bindings and a `RoomDataBridge` that conforms exactly to the frozen contract.

- [ ] **Step 1: Merge tested server core to main.**

  Owner reviews the collaborator's evidence and merges only the `server/**` branch changes.

- [ ] **Step 2: Publish Maincloud database.**

  Owner runs:

  ```bash
  git checkout main
  git pull origin main
  spacetime publish --server maincloud --module-path server pick-and-lock
  spacetime list --server maincloud
  ```

  Expected: first publish creates `pick-and-lock`; no `--delete-data` option is used.

- [ ] **Step 3: Share non-secret database configuration.**

  Send server nickname `maincloud`, database name `pick-and-lock`, and the publish commit SHA to the collaborator.

- [ ] **Step 4: Generate and bridge.**

  Collaborator runs:

  ```bash
  spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path server
  ```

  Then resolves `plan.share_code` before the six plan-scoped subscriptions and exposes the frozen `RoomView` and `RoomActions` without editing visual files.

- [ ] **Step 5: Handoff the sole UI edit.**

  Collaborator sends the bridge commit SHA and one import/mount instruction. UI owner changes only `client/src/App.tsx`.

### Task 5: Core proof and release-only services

**Owner:** Both; server owner leads race/E2E and API, UI owner leads visual verification.

**Files:**

- Server agent creates: `client/e2e/**`, `api/capture-email.ts`, deployment configuration.
- UI owner modifies only visual email/share presentation paths.

**Consumes:** Live bridge and Maincloud database.

**Produces:** Two-client live updates, atomic lock/reopen proof, optional real email, and preview-ready demo.

- [ ] **Step 1: Prove real-time core before email.**

  Pass two-client updates, concurrent proposal/final-accept tests, accepting/non-accepting dropout, reconnect, and ten-client lock/reopen checks from `docs/acceptance-matrix.md`.

- [ ] **Step 2: Complete Vercel/Resend preflight.**

  Owner provisions Vercel and Resend; server agent implements email only after the preflight list in `docs/plan-hardening.md` is fully checked.

- [ ] **Step 3: Verify and freeze.**

  Pass preview email, a fresh-phone name-only join under 30 seconds, and six-tab rehearsal. Stop feature work at 08:00 IST; retain 30 minutes for recovery and demo rehearsal.

## Self-Review

- Written-spec core maps to Tasks 2–5.
- UI and server paths remain separate until the explicit `App.tsx` mount.
- Maincloud creation occurs only through the owner's first non-destructive publish.
- Email and deployment occur after—not before—real-time proof.
- No task depends on a collaborator changing an unowned file.
