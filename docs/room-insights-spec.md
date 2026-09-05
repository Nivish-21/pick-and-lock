# Room insights data specification

## Goal

Make every room auditable and measurable without relying on browser state. A room can be created, make one or more locked decisions, reopen after an accepting member drops out, exchange short messages, and close after a final locked decision.

## Lifecycle

`open` → `locked` → `closed`

A locked room may reopen when an accepting participant drops out. Reopening preserves the completed `decision` row and returns the room to `open`; it does not erase history. Only the creator identity may close a room, and only while it is locked.

## Authoritative tables

| Table | Purpose | Key fields |
| --- | --- | --- |
| `plan` | Room lifecycle and ownership | `created_by`, `created_at`, `closed_at`, `closed_by`, `status`, `locked_activity_id`, `version` |
| `decision` | Append-only record for every successful lock | `plan_id`, `proposal_id`, `activity_id`, `sequence`, `decided_at`, `decision_duration_ms`, `eligible_count`, `accepted_count` |
| `room_metrics` | One current summary row per room | `decisions_taken`, `total_decision_time_ms`, `last_decision_time_ms`, `last_decided_at` |
| `chat_message` | Short room conversation | `plan_id`, `friend_id`, `body`, `sent_at` |
| `event_log` | Existing human-readable audit stream | Continue recording lifecycle events, including `closed` and `message_sent` |

`decision` is the source of record. `room_metrics` is an atomically maintained read model used for the room summary and insights card; it is never client-writable.

## Metrics definitions

| Metric | Definition |
| --- | --- |
| Decisions taken | `room_metrics.decisions_taken`; increment once in the same reducer transaction that locks a proposal. |
| Decision time | `ctx.timestamp - proposal.created_at`, in milliseconds, for the lock that created the decision. |
| Total decision time | Sum of completed `decision.decision_duration_ms`; stored in `room_metrics` for constant-time rendering. |
| Room age | `now - plan.created_at` while open or locked; `plan.closed_at - plan.created_at` after closure. Rendered by the client, not persisted as a ticking counter. |
| Time to close | `plan.closed_at - plan.created_at`; rendered by the client. |
| Decision efficiency | UI-derived: `decisions_taken / elapsed_room_hours`. Do not persist a floating-point value. |

## Authority and validation

- `create_room` sets `created_by = ctx.sender()` and `created_at = ctx.timestamp`, creates one `room_metrics` row, and emits `created`.
- `accept` creates exactly one `decision` row and updates exactly one `room_metrics` row when its acceptance locks the proposal.
- `close_room(plan_id)` requires `ctx.sender() == plan.created_by` and a `locked` room; it records close timestamp/identity, changes the status to `closed`, increments `version`, and emits `closed`.
- `send_message(plan_id, body)` requires an active joined friend, an open/locked room, and trimmed UTF-8 text of 1–500 bytes. The row is inserted with server time. Closed rooms reject new messages.
- Existing mutations (`join`, `set_answer`, `propose`, `accept`, `cancel_proposal`, `drop_out`, `leave`) reject closed rooms with `Room is closed`.
- No client supplies timestamps, creator identity, counts, durations, or summary values.

## Deliberate first-version limits

- Messages are room-local text only: no reactions, attachments, edits, deletion, moderation, or notifications.
- Existing rooms retain the three seeded activities. Custom options are a separate product/schema change and must not be smuggled into this metrics release.
- Links and QR codes are derived from the public room code. They are not stored as a second mutable database field.
