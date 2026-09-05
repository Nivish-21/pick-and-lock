# Maincloud migration safety — room insights

## Finding

The published `pick-and-lock` database already has `plan` rows. The first room-insights branch (`server/room-insights` commit `3ee5a58afcc64c5d1ce892ef2d2d0c40bb89a141`) adds required lifecycle columns in the middle of the existing `Plan` table and adds a `Closed` enum variant. It builds locally, but it is **not safe to publish** to the live database.

SpacetimeDB automatic migration permits new tables and reducers. Existing-table column additions require default values and must be appended at the end; modifying or reordering existing columns is forbidden. Do not use `--delete-data` to bypass this finding.

## Safe version-1 migration design

Keep the published `Plan` schema and `PlanStatus` unchanged. Add only new tables and reducers:

| New table | Role |
| --- | --- |
| `room_lifecycle` | New-room creator identity, creation timestamp, optional closure timestamp/identity; one row per new plan. |
| `decision` | Append-only successful lock history. |
| `room_metrics` | One current summary row per plan. |
| `chat_message` | Short room-scoped messages. |

`create_room` creates a lifecycle and metrics row in the same transaction. `close_room` checks `room_lifecycle.created_by` and writes `closed_at`/`closed_by`; all mutating reducers check whether a lifecycle row is closed. The bridge treats a missing lifecycle row as legacy/open.

## Legacy `SATURDAY` room

The original `SATURDAY` row has no creator identity because the first schema did not persist one. It remains readable and usable for the current demo, but it is not closable under the safe migration until an owner-approved legacy migration strategy is implemented. New rooms get full metrics/chat/close support immediately.

## Required next action

Do not merge or publish `3ee5a58` as-is. Rework the schema in a fresh/updated server branch to the safe design above, regenerate bindings, re-run the quality gates, then review it again. Publishing still requires explicit owner confirmation after that review.
