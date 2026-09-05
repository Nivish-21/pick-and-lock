# Realtime Contract: UI and Server Boundary

This is the frozen interface for the first iteration. The UI can render every state with fixtures while the server agent builds the module. The server agent may not require UI changes beyond this contract; the UI owner may not assume extra reducer behaviour.

## Route and room

- Canonical route: `/r/SATURDAY`.
- The seeded plan has share code `SATURDAY`, title `Saturday plans`, and date label `Saturday`.
- The route may show a landing page before joining. Room state begins only after `join` succeeds.
- On first connection, the data bridge subscribes to `plan` filtered by `share_code`. It must find exactly one plan before subscribing to the other six tables filtered by that plan ID. Until then, the UI renders `Loading room` and makes no reducer call.
- The share code is uppercase ASCII `A-Z0-9`, 6-12 characters. It is a public room locator, not a secret or authentication credential.

## Reducer inputs and outcomes

| Reducer          | Success state                                                         | Rejection examples                                                                |
| ---------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `join`           | Caller has one active `Friend` row.                                   | Blank/too-long name, unknown plan, previously dropped identity.                   |
| `setAnswer`      | Caller has one answer for that activity.                              | Not joined, dropped, plan locked, invalid conditional price, wrong plan.          |
| `propose`        | One `pending` proposal exists.                                        | Plan locked, existing pending proposal, caller ineligible, activity not possible. |
| `accept`         | Caller acceptance exists; threshold may atomically lock plan.         | Proposal not pending, caller ineligible, duplicate acceptance.                    |
| `cancelProposal` | Pending proposal becomes cancelled.                                   | Caller is not proposer, proposal not pending.                                     |
| `dropOut`        | Caller is dropped and answers become `out`; accepted lock may reopen. | Not joined, already dropped.                                                      |
| `leave`          | Caller presence becomes offline only.                                 | Not joined.                                                                       |

Exact client action signatures:

```ts
join({ planId, name }: { planId: number; name: string }): Promise<void>;
setAnswer({
  activityId,
  state,
  maxPrice,
}: {
  activityId: number;
  state: AnswerState;
  maxPrice?: number;
}): Promise<void>;
propose({ activityId }: { activityId: number }): Promise<void>;
accept({ proposalId }: { proposalId: number }): Promise<void>;
cancelProposal({ proposalId }: { proposalId: number }): Promise<void>;
dropOut(): Promise<void>;
leave(): Promise<void>;
```

Reducer errors are plain, short strings. The UI passes them to the toast region unchanged except for an `Action not applied` heading.

## Subscribed row shape

```ts
type AnswerState = "in" | "out" | "conditional";
type PlanStatus = "open" | "locked";
type ProposalStatus = "pending" | "locked" | "cancelled" | "reopened";

type ActivityView = {
  id: number;
  name: string;
  price: number;
  minPeople: number;
  eligibleCount: number;
  possible: boolean;
  callerAnswer: { state: AnswerState; maxPrice?: number } | null;
};

type PendingProposalView = {
  id: number;
  activityId: number;
  activityName: string;
  acceptedCount: number;
  requiredCount: number;
  callerCanAccept: boolean;
  callerHasAccepted: boolean;
};

type RoomView = {
  planId: number;
  title: string;
  dateLabel: string;
  version: bigint;
  status: PlanStatus;
  activities: ActivityView[];
  friends: Array<{
    id: number;
    name: string;
    online: boolean;
    answered: boolean;
    dropped: boolean;
  }>;
  pendingProposal: PendingProposalView | null;
  lockedActivityId: number | null;
  lockedAcceptors: Array<{ id: number; name: string }>;
  latestEvent: { kind: string; message: string; at: Date } | null;
};

type RoomActions = {
  join(name: string): Promise<void>;
  setAnswer(
    activityId: number,
    state: AnswerState,
    maxPrice?: number,
  ): Promise<void>;
  propose(activityId: number): Promise<void>;
  accept(proposalId: number): Promise<void>;
  cancelProposal(proposalId: number): Promise<void>;
  dropOut(): Promise<void>;
  leave(): Promise<void>;
  sendJoinEmail(email: string, shareCode: string): Promise<void>;
};
```

## Lifecycle and concurrency rules

| Current plan state          | Action                            | Next state                    | Required effect                                                                                                    |
| --------------------------- | --------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `open`, no pending proposal | `propose`                         | `open`, one pending proposal  | Create a new proposal; proposer is not auto-accepted.                                                              |
| `open`, pending proposal    | `accept` below threshold          | `open`, same pending proposal | Insert acceptance only.                                                                                            |
| `open`, pending proposal    | `accept` at threshold             | `locked`                      | Insert acceptance, lock proposal/plan, set activity, increment version, append event in one reducer transaction.   |
| `open`, pending proposal    | `cancelProposal`                  | `open`, no pending proposal   | Mark proposal cancelled; acceptance rows remain historical and cannot count again.                                 |
| `locked`                    | `dropOut` by accepting friend     | `open`, old proposal reopened | Mark dropped, set all their answers out, clear lock, increment version, append reopening event in one transaction. |
| `locked`                    | `dropOut` by non-accepting friend | `locked`                      | Mark dropped and set answers out; do not reopen.                                                                   |

`setAnswer` is allowed only while the plan is open. For a pending proposal, acceptance count is recomputed from active, currently eligible accepters each time `accept` runs. An answer change can therefore make a previous acceptance inactive without deleting history. A locked participant must call `dropOut`, not `setAnswer`, to change availability.

`join` for an existing active identity restores only `online = true`; it never creates a second friend row. `join` for a dropped identity rejects with `You are marked out for this plan`. Refreshing/reconnecting does not change `dropped_at`.

## UI rules

- Presentational components receive `RoomView`, `RoomActions`, or focused values derived from them. They do not import SpacetimeDB bindings.
- Buttons may be visually disabled for clarity, but the reducer remains the authority and the toast must show a rejection.
- The locked/reopened animation keys off `RoomView.version`, never a local click state.
- The UI must show the latest reopen reason from `latestEvent.message`.
- The email field is optional. The UI calls `sendJoinEmail(email, roomUrl)` only after join; room entry never waits for it.

## Server rules

- `eligibleCount` includes `in` and `conditional` answers with `maxPrice >= activity.price`; `out` and missing answers do not count.
- `acceptedCount` includes active acceptances for the pending proposal.
- After a locking accepter drops out, set their answers to `out`, mark them dropped, reopen the proposal and plan, clear `lockedActivityId`, increment `version`, and emit `needs a new decision - only N of M remain`.
- If a non-accepting friend drops out after lock, do not reopen.
- `answer.answer_key = "{friend_id}:{activity_id}"` and `acceptance.acceptance_key = "{proposal_id}:{friend_id}"` are each `#[unique]` columns. SpacetimeDB has no composite primary keys, so these keys are the database-level uniqueness guard; reducer lookups remain the readable validation path.

## Hardening clarification

`RoomActions` is the UI-facing façade. It maps its positional UI arguments to the object-shaped reducer inputs shown under **Exact client action signatures**; it must not expose generated binding types to components. `sendJoinEmail(email, shareCode)` is the sole non-reducer action: it is optional, non-authoritative, and cannot mutate plan state. It accepts a share code, not a caller-provided URL. The Vercel function derives the canonical room URL from `PUBLIC_APP_ORIGIN` and the validated share code.

`plan.share_code` is also a `#[unique]` database column. The bridge still treats zero or multiple matches as an error state rather than selecting one arbitrarily.
