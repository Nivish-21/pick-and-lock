# Private Rooms v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship invite-only custom decision rooms with a scheduled calendar event and member-only real-time visibility.

**Architecture:** v2 adds private canonical SpacetimeDB tables and public caller-filtered views alongside v1; it does not alter existing public tables. The client accepts an invite fragment through a reducer, then subscribes only to the caller's views. The v2 UI is a creation wizard plus a member room; v1 stays deployed until v2 passes the privacy proof.

**Tech Stack:** Rust, SpacetimeDB private tables and views, generated TypeScript bindings, React, TypeScript, Vite, Vercel, browser-native calendar `.ics` download.

**Spec:** `docs/private-rooms-and-scheduling-spec.md`

## Global Constraints

- No raw browser fingerprint, API key, invite token, or member-private row may enter public tables, browser storage, Git, logs, or analytics.
- Use caller-filtered views, not SpacetimeDB experimental RLS.
- Additive deployment only; do not modify the live v1 public schema or use `--delete-data`.
- Keep v1 `/r/SATURDAY` available until private-room acceptance criteria pass.
- Store time in UTC plus an IANA timezone; never store a locale-formatted date as authoritative time.

---

### Task 1: Private server foundation

**Owner:** Server agent.

**Files:**

- Create/modify: `server/spacetimedb/**`
- Regenerate: `client/src/module_bindings/**`

**Produces:** Private v2 tables, invite hash validation, membership authority, and public caller-filtered views.

- [ ] Define the private tables and indexes in the specification; leave all v1 public tables untouched.
- [ ] Add SHA-256 invite hashing, private invite rows, `create_private_room`, `join_with_invite`, `revoke_invite`, and `regenerate_invite` reducers with explicit identity/role checks.
- [ ] Add public `my_*` views filtered through active membership; non-members receive empty results.
- [ ] Add reducer/view tests for invalid/revoked/expired invite, cross-identity isolation, creator-only controls, and no v1 regression.
- [ ] Build, generate bindings, run client checks, commit, and push a dedicated server branch. Do not publish.

### Task 2: Creation-wizard UI

**Owner:** UI agent.

**Files:**

- Create/modify: `client/src/pages/private-room/**`, `client/src/components/private-room/**`, `client/src/styles/private-room/**`

**Produces:** Fixture-driven wizard and invite-acceptance states with no binding imports.

- [ ] Build steps for purpose, schedule, choices, and privacy/share confirmation using injected callbacks and fixture data.
- [ ] Use native date/time/number inputs and a timezone confirmation control; validate title, duration, 2–6 choices, prices, and minimum people locally.
- [ ] Build the private invite acceptance and access-denied screens without rendering room metadata before acceptance.
- [ ] Add component tests for validation, step progression, empty metadata in denied state, and responsive keyboard access.
- [ ] Run client test/lint/build and commit only owned visual paths.

### Task 3: Private real-time bridge and calendar export

**Owner:** Data/integration agent.

**Files:**

- Create: `client/src/data/privateRoom/**`
- Create: `client/src/lib/calendarEvent.ts`, `client/src/lib/calendarEvent.test.ts`

**Consumes:** Task 1 generated bindings and Task 2 view/action facade.

**Produces:** Member-only subscriptions/actions and local `.ics` generation.

- [ ] Resolve an invite fragment only for the join reducer, remove it from URL after success, and never persist it.
- [ ] Subscribe exclusively to `my_*` views after membership; map no data to an access-denied state.
- [ ] Expose typed actions for custom vote, proposal, acceptance, invite revocation/regeneration, and room-leave.
- [ ] Generate RFC 5545-compatible `.ics` text locally from locked schedule/choice data; no calendar provider or OAuth.
- [ ] Add bridge and calendar unit tests, then run full client checks.

### Task 4: Mount, proof, and safe release

**Owner:** Repository owner with both agents.

- [ ] Mount private routes without changing the v1 route fallback.
- [ ] Run two isolated browser identities: outsider direct route, valid invite acceptance, real-time vote, revoke/reissue, and calendar download.
- [ ] Review generated binding/schema diff and obtain explicit confirmation before publishing the additive v2 Maincloud module.
- [ ] Publish without data deletion, deploy Vercel, and rerun the private-room proof on production.

## Self-review

- The plan does not claim current public v1 rooms are private.
- Raw invite tokens are fragment-only and hash-stored server-side.
- Every client-visible private row routes through a caller-filtered view.
- UI, server, and bridge write scopes remain independent until the explicit mount step.
