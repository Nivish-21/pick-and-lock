# Realtime Contract: UI and Server Boundary

This is the frozen interface for the first iteration. The UI can render every state with fixtures while the server agent builds the module. The server agent may not require UI changes beyond this contract; the UI owner may not assume extra reducer behaviour.

## Route and room

- Canonical route: `/r/SATURDAY`.
- The seeded plan has share code `SATURDAY`, title `Saturday plans`, and date label `Saturday`.
- The route may show a landing page before joining. Room state begins only after `join` succeeds.

## Reducer inputs and outcomes

| Reducer          | Input                              | Success state                                                         | Rejection examples                                                                |
| ---------------- | ---------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `join`           | `{ planId: number, name: string }` | Caller has one active `Friend` row.                                   | Blank/too-long name, unknown plan.                                                |
| `setAnswer`      | `{ activityId: number, state: 'in' | 'out'                                                                 | 'conditional', maxPrice?: number }`                                               | Caller has one answer for that activity. | Not joined, dropped, invalid conditional price, wrong plan. |
| `propose`        | `{ activityId: number }`           | One `pending` proposal exists.                                        | Plan locked, existing pending proposal, caller ineligible, activity not possible. |
| `accept`         | `{ proposalId: number }`           | Caller acceptance exists; threshold may atomically lock plan.         | Proposal not pending, caller ineligible, duplicate acceptance.                    |
| `cancelProposal` | `{ proposalId: number }`           | Pending proposal becomes cancelled.                                   | Caller is not proposer, proposal not pending.                                     |
| `dropOut`        | `{}`                               | Caller is dropped and answers become `out`; accepted lock may reopen. | Not joined, already dropped.                                                      |
| `leave`          | `{}`                               | Caller presence becomes offline only.                                 | Not joined.                                                                       |

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
};
```

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
