# Pick & Lock Architecture Contract

## System boundary

```text
React + Vite client  -- typed reducer calls -->  SpacetimeDB Rust module (Maincloud)
React + Vite client  <-- subscriptions -------  public plan rows and event log
Optional Vercel Function -- Resend integration -> confirmation email only
```

The client is a projection layer. It may derive display-only counts from subscribed rows, but the Rust module alone decides eligibility, proposal validity, lock state, and reopen state.

## Repository shape to create during implementation

```text
server/
  Cargo.toml
  src/lib.rs
  tests/reducer_integration.rs
client/
  package.json
  vite.config.ts
  src/main.tsx
  src/App.tsx
  src/module_bindings/              # generated; do not hand-edit
  src/lib/connection.ts
  src/lib/plan-selectors.ts
  src/lib/validation.ts
  src/components/
  src/screens/
  src/styles/
  src/test/
api/capture-email.ts
vercel.ts
```

## Server model

Use Rust enums, not free-form strings, for `PlanStatus`, `ProposalStatus`, and `AnswerState`. Every public table has an auto-increment primary key; `answer` and `acceptance` carry an internal unique composite key such as `"{friend_id}:{activity_id}"` to make their one-row invariants durable.

| Table        | Required fields                                                                      | Notes                                                                                   |
| ------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `plan`       | `id`, `title`, `date_label`, `share_code`, `status`, `locked_activity_id`, `version` | One seeded row; `version` increments on lock and reopen.                                |
| `activity`   | `id`, `plan_id`, `name`, `price`, `min_people`                                       | Bowling, Escape room, Game night.                                                       |
| `friend`     | `id`, `plan_id`, `identity`, `name`, `online`, `joined_at`, `dropped_at`             | Identity is the caller identity. `dropped_at` is availability, not connection presence. |
| `answer`     | `id`, `plan_id`, `friend_id`, `activity_id`, `state`, `max_price`, `unique_key`      | One answer per friend/activity.                                                         |
| `proposal`   | `id`, `plan_id`, `activity_id`, `proposed_by`, `status`, `created_at`                | Only one pending proposal per plan.                                                     |
| `acceptance` | `id`, `proposal_id`, `friend_id`, `accepted_at`, `unique_key`                        | One acceptance per friend/proposal.                                                     |
| `event_log`  | `id`, `plan_id`, `kind`, `friend_id`, `activity_id`, `message`, `at`                 | Rendered as escaped plain text in the activity feed.                                    |

## Reducer contract

| Reducer           | Caller input                        | Required server behaviour                                                                                                                                    |
| ----------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `init`            | none                                | Seed exactly one plan and the three demo activities idempotently.                                                                                            |
| `join`            | `plan_id`, `name`                   | Validate name, resolve caller identity, create or reconnect the caller's friend row, append `joined`.                                                        |
| `set_answer`      | `activity_id`, `state`, `max_price` | Resolve the caller's friend row; validate state/price; upsert only that caller's answer; append `answered`.                                                  |
| `propose`         | `activity_id`                       | Require caller to be an active eligible friend, plan open, activity possible, and no pending proposal; insert pending proposal and append `proposed`.        |
| `accept`          | `proposal_id`                       | Require pending proposal and caller eligibility; reject duplicate acceptance; insert acceptance; atomically lock when acceptance count reaches `min_people`. |
| `cancel_proposal` | `proposal_id`                       | Allow only the pending proposal's proposer; mark cancelled and append an event.                                                                              |
| `drop_out`        | none                                | Mark caller dropped, set all their answers to `out`, append `dropped`; if they accepted the locked proposal, atomically reopen and append `reopened`.        |
| `leave`           | none                                | Change only the caller's `online` state.                                                                                                                     |

All invalid user actions return a short sender error. The client maps that error to a toast; it never optimistically edits authoritative state.

## Pure server rules

```rust
eligible(friend, activity, answer) =
    answer.state == In ||
    (answer.state == Conditional && answer.max_price >= activity.price)

possible(activity, answers) = eligible_count(activity, answers) >= activity.min_people
```

`accept` must insert the acceptance, recount valid acceptances, and update `proposal`, `plan`, `plan.version`, and `event_log` in one reducer transaction. `drop_out` must reopen in that same transaction when the dropped friend accepted the locked proposal. There is no client-side lock reducer and no repair job.

## Client state and screens

The connection uses `wss://maincloud.spacetimedb.com`, the deployed database name, and a saved SpacetimeDB identity token. On connection, subscribe to the seven public tables filtered to the seeded plan. Derive `PlanView` in `client/src/lib/plan-selectors.ts` from subscribed rows:

- eligibility count and `possible` per activity;
- who is answered, undecided, online, and dropped;
- current pending proposal and acceptance progress;
- locked activity and reopening reason from the latest event;
- a monotonically increasing `version` key for lock/reopen animation.

Screens are Join, Choices, Live Group, and Locked Plan. The route is `/r/:shareCode`; the share UI supplies the same URL and a QR code. Join includes a display name and an optional email field. The email flow is independent: call `/api/capture-email` after a successful join, show success/failure non-blockingly, and never withhold the room.

## Deployment and operations

- Publish `server/` to SpacetimeDB Maincloud as `pick-and-lock` and record the returned identity in deployment notes, never in client source.
- Generate bindings after every module schema/reducer change and commit the generated TypeScript bindings with the consuming client change.
- Deploy `client/` and `api/capture-email.ts` on Vercel. Set only public `VITE_SPACETIMEDB_HOST` and `VITE_SPACETIMEDB_DATABASE` in the client environment.
- Provision the discovered Resend Marketplace integration before adding the email function. Keep its API key server-only.
- Warm the Maincloud database before demos, test the public URL on a fresh phone, and keep the deployment logs accessible.

## Hardening errata

The newer frozen realtime contract supersedes this document where they differ. The implementation paths are `client/src/data/**` and `client/src/module_bindings/**`, not `client/src/lib/**`. The durable unique columns are `answer_key` and `acceptance_key`. The bridge first resolves `plan.share_code`, then subscribes to the remaining six plan-scoped tables. Email posts `{ email, shareCode }`; the server derives the URL and never trusts a client-supplied URL.
