# Decisions

## 2026-09-05 — Selective server-branch integration

The collaborator branch contains the SpacetimeDB module and generated client bindings, but also duplicate tool-instruction files and `server/spacetime.local.json`, which encodes a machine-specific database name. We will selectively integrate product code rather than merging the branch wholesale. This preserves the frozen ownership boundary, avoids repository bloat, and keeps deployment configuration owned by the database account holder.

## 2026-09-05 — Persist decisions as history plus a room summary

Completed decisions must be auditable and quick to render. We will store each successful lock as an append-only `decision` row and keep one atomically updated `room_metrics` summary row per plan. Deriving totals solely from browser state would lose history and scanning all events for every room render would make the insight view increasingly expensive. We will not persist a ticking room-duration counter or a floating-point efficiency score: both are deterministic client-derived displays from stored server timestamps and totals.

## 2026-09-05 — Creator-only room closure

`close_room` may only be called by the identity that created the room, and only after a decision has locked. Closing remains a lifecycle state and preserves all rows; it never deletes a room, decisions, chat, or event history. This prevents an arbitrary participant from prematurely ending an active group decision.
