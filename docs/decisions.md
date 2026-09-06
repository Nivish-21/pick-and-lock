# Decisions

## 2026-09-05 — Selective server-branch integration

The collaborator branch contains the SpacetimeDB module and generated client bindings, but also duplicate tool-instruction files and `server/spacetime.local.json`, which encodes a machine-specific database name. We will selectively integrate product code rather than merging the branch wholesale. This preserves the frozen ownership boundary, avoids repository bloat, and keeps deployment configuration owned by the database account holder.

## 2026-09-05 — Persist decisions as history plus a room summary

Completed decisions must be auditable and quick to render. We will store each successful lock as an append-only `decision` row and keep one atomically updated `room_metrics` summary row per plan. Deriving totals solely from browser state would lose history and scanning all events for every room render would make the insight view increasingly expensive. We will not persist a ticking room-duration counter or a floating-point efficiency score: both are deterministic client-derived displays from stored server timestamps and totals.

## 2026-09-05 — Creator-only room closure

`close_room` may only be called by the identity that created the room, and only after a decision has locked. Closing remains a lifecycle state and preserves all rows; it never deletes a room, decisions, chat, or event history. This prevents an arbitrary participant from prematurely ending an active group decision.

## 2026-09-05 — Preference memory requires opt-in, not browser fingerprinting

The proposed assistant needs durable preference context, but a raw browser fingerprint is not an acceptable identity or memory key: it is opaque, unstable, difficult to revoke, and creates a privacy-sensitive tracking system. The future design will instead use explicit consent bound to the participant's SpacetimeDB identity, a participant-visible preference profile, room-specific sharing controls, correction, expiry, export, and deletion. Assistant output remains advisory; reducers retain all decision authority.

## 2026-09-05 — Add room lifecycle beside the published plan table

The live database already contains `plan` rows. SpacetimeDB cannot automatically migrate the proposed required lifecycle fields because they are non-default columns inserted into an existing table. We will preserve `Plan` and `PlanStatus` as published, introduce a separate `room_lifecycle` table for new rooms, and make close checks consult that table. This avoids data destruction and keeps the migration additive. The legacy seeded room remains non-closable until an owner explicitly approves a separate migration strategy.

## 2026-09-05 — Private rooms use private tables and membership-filtered views

The existing v1 tables are public and a share code is not an access-control mechanism. For v2, room content is private canonical data and client reads come only from public views filtered by `ViewContext.sender()`. We explicitly choose views over experimental SpacetimeDB RLS. Invite links carry a high-entropy secret in the URL fragment, while the module stores only its hash. This makes invite acceptance an explicit reducer-authorised transition and prevents a copied post-join room URL from revealing room data.

## 2026-09-05 — Public sharing is an explicit read-only story, not a room-access switch

Private v2 rooms remain private by default. A creator may publish a narrow, reversible `shared_room_story` projection at `/share/<publicRoomId>`, but the public URL does not grant membership or any write capability. We rejected making `/r/<publicRoomId>` public because it would conflate an identifier with authorisation and leak member data. The public page has an independent create-room CTA so visitors can act without coupling their new room to the source room.

## 2026-09-05 — GitHub Issues are the live agent queue

The repeated manual prompt relay is a coordination failure, not a coding task. We will use GitHub Issues with `ready`, `claimed`, `blocked`, and `review` states for atomic task claiming, one task branch per issue, and pull requests as handoffs. This is sufficient for two agents and avoids introducing another hosted coordination system. It does require agents to remain running or be awakened by their host; a repository cannot independently wake a stopped chat agent.

## 2026-09-06 — Preserve the deployed `my_rooms` schema during the v2 release

The deployed Maincloud module defines `PrivateRoomStatus` with only `Open`, and `my_rooms.status` exposes that type. Adding `Locked` to the same type causes SpacetimeDB to remove and recreate the view, disconnecting every live client. We will preserve that legacy type and field unchanged, add a new defaulted private decision-status field for v2 lifecycle state, and expose its state only through new v2/public projections. The legacy `my_rooms` view therefore remains a compatibility surface and continues to report `Open`; it is not the v2 room-state API. This trade-off avoids an unplanned production interruption and preserves existing data and subscriptions.
