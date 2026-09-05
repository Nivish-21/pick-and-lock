# Private v2 decision engine specification

## Outcome

Private v2 rooms preserve Pick & Lock’s core behaviour: members answer each custom choice, an eligible member proposes a feasible choice, enough eligible active members accept it atomically, and the room reopens if an accepting member leaves. Every completed lock becomes a private immutable decision row and updates a private metrics summary.

## Authority and privacy

- Canonical votes, proposals, acceptances, decisions, and metrics are private SpacetimeDB tables.
- Reducers derive the acting participant from `ctx.sender()` and active `room_membership`; no member identity is trusted from browser input.
- Public views are only caller-filtered `my_room_votes`, `my_room_proposals`, `my_room_acceptances`, `my_room_decisions`, and `my_room_metrics`.
- Non-members receive empty views. No decision engine row becomes public merely because its room has a public identifier.

## State and invariants

| Row               | Required fields                                                     | Invariant                                                                  |
| ----------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `room_vote`       | room, choice, member identity, answer state, optional maximum price | One current answer per active member and choice.                           |
| `room_proposal`   | room, choice, proposer identity, status, created timestamp          | At most one pending proposal per room.                                     |
| `room_acceptance` | proposal, member identity, accepted timestamp                       | One acceptance per proposal and member.                                    |
| `room_decision`   | room, selected choice, locked timestamp, eligible acceptance count  | Append-only record created in the same reducer transaction as a lock.      |
| `room_metrics`    | room, decision count, total decision seconds, latest lock timestamp | One private summary row per room, updated atomically with `room_decision`. |

- A vote is eligible when it is `In`, or `Conditional` with `max_price >= choice.price`.
- Only active members with an eligible current vote may propose or accept.
- `accept_private_proposal` inserts the caller’s acceptance and locks in that same transaction if the active eligible acceptance count reaches the choice minimum.
- Lock sets the private room to `Locked`, resolves the pending proposal, appends a decision, and increments metrics.
- `leave_private_room` marks only the caller’s membership inactive. If that caller accepted the locked proposal, the same reducer reopens the room and clears its current locked choice reference. It never deletes history.

## Required reducers and views

Reducers: `set_private_vote`, `propose_private_choice`, `accept_private_proposal`, `cancel_private_proposal`, and `leave_private_room`.

Views: `my_room_votes`, `my_room_proposals`, `my_room_acceptances`, `my_room_decisions`, and `my_room_metrics`. Each derives permitted room IDs exclusively from active membership for `ctx.sender()`.

## Acceptance proof

1. A non-member sees no private choice, vote, proposal, acceptance, decision, or metrics rows.
2. Two simultaneous proposals cannot leave two pending proposals.
3. Two final acceptances cannot create two decisions; exactly one decision/metrics increment occurs.
4. A non-eligible member cannot propose or accept.
5. An accepting member leaving reopens the private room; a non-accepting member leaving does not.
6. A completed lock is preserved after reopening and its metrics remain correct.

## Non-goals

- No chat, creator close, public sharing, or Maincloud publish in this task.
- No changes to v1 public tables, rows, reducers, or routes.
