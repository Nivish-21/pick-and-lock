# Room Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist room lifecycle, completed-decision history, room metrics, chat messages, and creator-authorised closure in SpacetimeDB.

**Architecture:** Add a narrow append-only `decision` table and a one-row-per-plan `room_metrics` read model. Reducers write both atomically, while the data bridge subscribes to the new rows and maps them to an additive UI insights facade. The public client remains a Vite static deployment; Maincloud remains the only authoritative store.

**Tech Stack:** Rust, SpacetimeDB 2.10, generated TypeScript bindings, React, TypeScript, Vite, Vercel.

**Spec:** `docs/room-insights-spec.md`

## Global Constraints

- All authoritative writes occur in SpacetimeDB reducers; the browser never writes metrics directly.
- Preserve the active bridge agent's ownership of `client/src/data/**`; do not edit that path in the schema task.
- Do not add a dependency for QR generation: encode the canonical `/r/<shareCode>` URL with the browser-native share/copy flow first.
- Maincloud publish is a live schema deployment and requires a separate owner confirmation after local verification.
- Generated bindings are committed with the server schema commit; generated files must not contain accidental whitespace-only changes.

---

### Task 1: Add lifecycle and insight schema

**Files:**

- Modify: `server/spacetimedb/src/lib.rs`
- Regenerate: `client/src/module_bindings/**`
- Test: `server/spacetimedb/src/lib.rs` helper tests or reducer tests supported by the existing module layout

**Consumes:** `docs/room-insights-spec.md`

**Produces:** `PlanStatus::Closed`, lifecycle fields on `Plan`, `Decision`, `RoomMetrics`, and `ChatMessage` tables.

- [ ] Add `Closed` to `PlanStatus`.
- [ ] Add `created_by`, `created_at`, `closed_by`, and `closed_at` to `Plan`.
- [ ] Add public plan-indexed `Decision`, `RoomMetrics`, and `ChatMessage` tables using the exact fields in `docs/room-insights-spec.md`.
- [ ] Update `init` and `create_room` to set lifecycle fields and create exactly one metrics row.
- [ ] Format and build with `cargo fmt --check` and `spacetime build --module-path server/spacetimedb`.
- [ ] Regenerate bindings and run `git diff --check`.
- [ ] Commit: `feat(metrics): persist room lifecycle and insights`.

### Task 2: Make locks and closure measurable

**Files:**

- Modify: `server/spacetimedb/src/lib.rs`
- Regenerate: `client/src/module_bindings/**`

**Consumes:** Tables from Task 1.

**Produces:** Atomic decision history and summary updates, `close_room`, and `send_message` reducers.

- [ ] Before changing `accept`, add a focused check that a threshold lock produces one decision, increments the summary once, and records a non-negative duration.
- [ ] On threshold lock, insert one `Decision` with `sequence = metrics.decisions_taken + 1`, derive `decision_duration_ms` from the proposal server timestamp, and update the one `RoomMetrics` row in the same transaction.
- [ ] Add `close_room(plan_id)` with creator-only and locked-only checks; update lifecycle fields, increment `version`, and append a `closed` event.
- [ ] Add `send_message(plan_id, body)` with active-member, room-status, and 1–500-byte validation; insert a message and append a `message_sent` event.
- [ ] Reject closed rooms consistently in every mutation path.
- [ ] Run Rust format/build, regenerate bindings, then run client test/lint/build.
- [ ] Commit: `feat(metrics): record decisions, messages, and closure`.

### Task 3: Bridge hand-off and room insights UI

**Files:**

- Collaborator modifies: `client/src/data/**`
- UI owner modifies: `client/src/App.tsx`, `client/src/pages/**`, `client/src/components/**`, `client/src/fixtures/**`
- Test: `client/src/**/*.test.tsx`

**Consumes:** Generated `decision`, `room_metrics`, `chat_message`, `close_room`, and `send_message` bindings from Task 2.

**Produces:** An additive room insight model and close/chat actions without leaking bindings into visual components.

- [ ] Bridge subscribes to all three plan-scoped insight tables only after resolving the plan ID.
- [ ] Bridge exports `RoomInsights` containing completed decisions, total duration, last duration, `createdAt`, and optional `closedAt`; it adds `closeRoom()` and `sendMessage(body)` to the action facade.
- [ ] UI renders a compact summary and closes only for the creator; it renders received messages and an accessible message composer for open/locked rooms.
- [ ] Add fixture and component checks for a closed room, two completed decisions, summary values, and message validation.
- [ ] Run `npm run test --prefix client`, `npm run lint --prefix client`, and `npm run build --prefix client`.
- [ ] Commit each owned lane separately and push the branch.

### Task 4: Deploy and prove real data

**Files:**

- Modify only deployment configuration if required by the existing Vite/Vercel setup.

**Consumes:** Local green schema, regenerated bindings, mounted bridge, and an explicit owner confirmation.

**Produces:** A live Maincloud schema and Vercel client deployment with shareable room URLs.

- [ ] Obtain explicit confirmation before publishing the live module because this changes the Maincloud schema.
- [ ] Publish `server/spacetimedb` to the existing `pick-and-lock` database without `--delete-data`.
- [ ] Verify the room metrics and decision rows by read-only query, then open two browser sessions to verify messages and live decision totals.
- [ ] Deploy the client to Vercel with only `VITE_SPACETIMEDB_HOST` and `VITE_SPACETIMEDB_DATABASE` public configuration.
- [ ] Confirm `/r/<shareCode>` copy/share output and QR payload both resolve to the deployed room route.

## Self-Review

- Every requested metric has a single authoritative definition in `docs/room-insights-spec.md`.
- History is append-only, and the summary is updated atomically rather than reconstructed unreliably in the browser.
- Room closure is creator-authorised and cannot remove history.
- The other agent can finish the existing bridge without a shared-file conflict; the regenerated bindings are its only required rebase point.
