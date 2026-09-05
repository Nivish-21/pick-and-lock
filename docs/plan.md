# Active execution plan

## U5 — UI verification recovery

Goal: make the fixture-driven UI checks repeatable without changing production behaviour.

- [ ] Add explicit DOM cleanup after each React component test.
- [ ] Run the UI tests, lint, production build, deterministic design scan, and browser accessibility smoke check.
- [ ] Append the completed U5 checkpoint to the execution log, status, and changelog; commit and push it.

## U5 completed

- [x] Registered explicit React DOM cleanup, added four fixture-driven component checks, and ran the full quality gate.
- [x] Browser accessibility smoke check confirms the name field, join action, labelled regions, headings, and answer controls remain exposed at 390px.
- [x] U5 checkpoint is ready to commit and push.

## U6 — Server handoff and real-time bridge

Goal: integrate the collaborator's SpacetimeDB core without importing unrelated repository instructions or machine-local configuration.

- [ ] Validate the server branch in an isolated disposable checkout and compare its public schema and reducers to the frozen contract.
- [ ] Selectively integrate only `server/spacetimedb/**`, the generated bindings, and essential ignore rules; exclude duplicate agent-instruction files and `server/spacetime.local.json`.
- [ ] Repair any proven module or contract failures, then build the UI-facing bridge in server-owned data paths without changing visual components.
- [ ] Verify server build, client tests/lint/build, and an end-to-end local connection when a confirmed Maincloud database name is available.
- [ ] Append the handoff result to the execution log, status, and changelog; commit and push each completed checkpoint.

### U6 validation recovery

- [ ] Install the missing Rust toolchain and `wasm32-unknown-unknown` target, then rerun the isolated server build before integrating any branch file.

### 15-minute MVP amendment

- [ ] Support creator-supplied share codes, seeded activities per new room, and a route-aware room creation/join flow.
- [ ] Scope friend identity, drop-out, and leave behaviour to one room so distinct share links do not interfere.

### U6 server checkpoint completed

- [x] Validated the collaborator module in a disposable checkout, selectively integrated only product code and generated bindings, and excluded machine-local and duplicate instruction files.
- [x] Added the multi-room amendment, creator-supplied share codes, room-scoped friends, corrected acceptance eligibility, and counted reopen events.
- [x] Regenerated bindings; Rust format/build and client test/lint/build pass. Publishing is the next owner-authorised deployment action.

### U6 interaction checkpoint completed

- [x] Added proposal controls for feasible activities and an accessible share-link copy action with focused UI coverage.

### U6 merge recovery

- [x] Refreshed `client/node_modules` after merging the QR dependency lockfile; 19 client tests, lint, production build, and whitespace checks pass.

### U6 live bridge checkpoint completed

- [x] Merged the route, QR, Vercel, bridge, and Create Room client branches; mounted the bridge and creation flow in `App.tsx`.
- [x] Verified Maincloud in a real browser: `SATURDAY` connected, `Demo Host` joined, and a live Bowling answer changed the authoritative eligible count from 0 to 1.
- [x] Created and deployed the Vercel `pick-and-lock` project; production `/r/SATURDAY` connected to Maincloud, joined `Demo Guest`, and rendered the deployed canonical QR URL.

## U7 — Room insights and closure

Goal: persist complete room lifecycles, decision history, current metrics, and short room chat without making browser state authoritative.

- [ ] Add the additive server schema and regenerate bindings in an isolated server-owned branch.
- [ ] Record each lock atomically as a decision and update the room metrics row.
- [ ] Add creator-authorised locked-room closure and active-member chat reducers.
- [ ] Hand the new bindings to the data-bridge agent; mount visual insight, close, and chat controls only after its adapter handoff.
- [ ] Obtain explicit approval before publishing the schema update to Maincloud, then verify real rows and deploy the client.

## U8 — Optional room-link email confirmation

Goal: send a non-authoritative email containing a validated room link without delaying room entry or persisting email addresses in SpacetimeDB.

- [ ] Add a Vercel serverless `POST /api/capture-email` endpoint in the server-agent-owned `api/**` path using the configured Resend HTTP API and environment variables only.
- [ ] Validate email and share code at the API boundary, derive the room URL from `PUBLIC_APP_ORIGIN`, and return short, explicit errors without logging email addresses.
- [ ] Add isolated endpoint tests, then hand the endpoint contract to the bridge/UI lane without editing visual components.

## U9 — Future consented preference memory and decision assistant

Goal: help a group recognise trade-offs from preferences they deliberately share, without covert tracking or autonomous decisions.

- [ ] Complete and deploy version 1 before opening this implementation lane.
- [ ] Write the separate consent, retention, delete/export, provider, and threat-model specification before adding any identity or memory table.
- [ ] Use explicit participant identity and consented `preference_profile` rows; never use raw browser fingerprint data as a memory key.
- [ ] Keep all model/provider calls server-side behind one adapter; pass only room-scoped, consented context and return suggestions only.
- [ ] Give every preference and suggestion a visible source, correction path, expiry/retention policy, and delete action.

## U7 migration correction — Maincloud compatibility

- [ ] Reject the current `server/room-insights` implementation for deployment because it alters the existing `plan` table incompatibly.
- [ ] Rework lifecycle as a new `room_lifecycle` table, retain the existing `Plan` schema/status, and preserve `SATURDAY` as a legacy readable room.
- [ ] Regenerate bindings, re-run all gates, and review the corrected branch before asking for a publish confirmation.

## U10 — Private custom rooms and calendar scheduling (v2)

Goal: add invite-only, member-visible rooms with creator-defined choices and a real schedule without weakening the live v1 demo.

- [ ] Build v2 from `docs/private-rooms-and-scheduling-spec.md` and `docs/superpowers/plans/2026-09-05-private-rooms-v2.md`.
- [ ] Use new private canonical tables plus caller-filtered views; do not attempt to make already-public v1 room data private retroactively.
- [ ] Create the wizard, invite acceptance, custom choice board, calendar export, and privacy proof in separate ownership lanes.
- [ ] Do not publish the v2 module until a two-identity outsider/member proof and explicit owner confirmation are complete.

## U11 — Optional public decision story, CTA, and autonomous agent handoffs

Goal: keep v2 rooms invite-only by default while allowing a creator to deliberately publish a privacy-safe read-only decision story that sends visitors into an independent room-creation flow.

- [ ] Use `docs/public-sharing-and-cta-spec.md` and `docs/superpowers/plans/2026-09-05-public-sharing-and-agent-collaboration.md` as the source of truth.
- [ ] Build only the new v2 public projection and `/share/<publicRoomId>` route; never expose a private v2 room through `/r/<publicRoomId>`.
- [ ] Make public sharing default-off, creator-only, reversible, and free of member identity, chat, individual votes, invite data, preferences, and price limits.
- [ ] Add the exact public CTA: “Have a decision to make? Make it together.” with a “Create your own room” link to `/`.
- [ ] Use GitHub Issues and `docs/agent-collaboration-protocol.md` for autonomous task claiming and PR handoffs; no agent waits for a manually relayed next task.
- [ ] Require two-identity privacy proof and explicit owner confirmation before a Maincloud publish or public deployment.

## U10 prerequisite — Private decision engine

Goal: add private v2 votes, proposals, atomic lock/reopen, decision history, and metrics before exposing a public decision story.

- [ ] Build from `docs/private-v2-decision-engine-spec.md` and `docs/superpowers/plans/2026-09-05-private-v2-decision-engine.md`.
- [ ] Keep all new decision rows private and expose only active-membership-filtered `my_*` views.
- [ ] Do not start public projection #1 until the private decision engine is reviewed and merged.
