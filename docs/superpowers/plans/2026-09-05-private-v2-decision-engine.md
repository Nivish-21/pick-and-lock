# Private v2 decision engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add private v2 voting, proposal, atomic lock/reopen, immutable decision history, and metrics needed by member rooms and future public decision stories.

**Architecture:** Add only private canonical rows and caller-filtered `my_*` SpacetimeDB views beside the merged private access core. Reducers perform all eligibility, proposal, acceptance, lock, reopen, history, and metrics transitions. Existing v1 rows and reducers remain untouched.

**Tech Stack:** Rust, SpacetimeDB, generated TypeScript bindings, Vitest client gate.

**Spec:** `docs/private-v2-decision-engine-spec.md`

## Global Constraints

- Modify no v1 table/reducer schema or behaviour.
- Store every private canonical row in a private table; views must filter active membership by `ctx.sender()`.
- Lock/decision/metrics updates are one reducer transaction.
- No Maincloud publish, Vercel deployment, UI mounting, or new dependency.

---

### Task 1: Build private decision authority

**Owner:** Server agent, issue `#10`.

**Files:**

- Modify: `server/spacetimedb/src/lib.rs`
- Regenerate: `client/src/module_bindings/**`

**Consumes:** Merged `PrivateRoom`, `RoomChoice`, and `RoomMembership` foundation from commit `dcd5ac5`.

**Produces:** Private decision tables, reducers, caller-filtered views, and bindings for the future private bridge/public-story projection.

- [ ] Write failing module tests for outsider-empty views, one-pending-proposal, atomic final acceptance, non-eligible rejection, accepting-member leave/reopen, and preserved decision/metrics history.
- [ ] Add private vote, proposal, acceptance, decision, and metrics tables plus only the enum/field changes required for private room lock/reopen state.
- [ ] Implement membership-derived vote, proposal, accept, cancel, and leave reducers with explicit sender errors.
- [ ] Add the five membership-filtered `my_*` views with display-safe projections only.
- [ ] Generate TypeScript bindings; run `cargo fmt --check`, `cargo test --manifest-path server/spacetimedb/Cargo.toml`, `spacetime build --module-path server/spacetimedb`, and root client test/lint/build.
- [ ] Commit only server and generated-binding paths as `feat: add private room decision engine`; push a branch and open a PR. Do not publish.

### Task 2: Release the public-story projection dependency

**Owner:** Repository owner.

**Files:**

- Modify: GitHub issue #1 labels and dependency comment
- Modify: `docs/status.md`, `docs/changelog.md`, `README.md` after review/merge

**Consumes:** Reviewed, merged Task 1.

**Produces:** #1 becomes `ready`; its server agent can add the creator-controlled public projection without inventing history or metrics.

- [ ] Review Task 1 for private-table access and atomic state transitions.
- [ ] Merge only after the full root server/client gate passes.
- [ ] Move #1 from `blocked` to `ready`, record that #4 remains blocked by #1, and update README lane state.
