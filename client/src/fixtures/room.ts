export type AnswerState = "in" | "out" | "conditional";

export type PlanStatus = "open" | "locked";

export type ActivityView = {
  id: number;
  name: string;
  price: number;
  minPeople: number;
  distanceKm?: number;
  timeMinutes?: number;
  eligibleCount: number;
  voteCount?: number;
  possible: boolean;
  callerAnswer: { state: AnswerState; maxPrice?: number } | null;
};

export type PendingProposalView = {
  id: number;
  activityId: number;
  activityName: string;
  acceptedCount: number;
  requiredCount: number;
  callerCanAccept: boolean;
  callerHasAccepted: boolean;
};

export type RoomView = {
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

export type RoomActions = {
  join: (name: string) => Promise<void>;
  addActivity: (
    name: string,
    price: number,
    minPeople: number,
    distanceKm?: number,
    timeMinutes?: number,
  ) => Promise<void>;
  setAnswer: (
    activityId: number,
    state: AnswerState,
    maxPrice?: number,
  ) => Promise<void>;
  propose: (activityId: number) => Promise<void>;
  accept: (proposalId: number) => Promise<void>;
  cancelProposal: (proposalId: number) => Promise<void>;
  dropOut: () => Promise<void>;
  leave: () => Promise<void>;
  sendJoinEmail: (email: string, shareCode: string) => Promise<void>;
};

const saturdayActivities: ActivityView[] = [
  {
    id: 1,
    name: "Bowling",
    price: 400,
    minPeople: 4,
    eligibleCount: 4,
    possible: true,
    callerAnswer: null,
  },
  {
    id: 2,
    name: "Escape room",
    price: 600,
    minPeople: 5,
    eligibleCount: 2,
    possible: false,
    callerAnswer: null,
  },
  {
    id: 3,
    name: "Game night",
    price: 0,
    minPeople: 3,
    eligibleCount: 3,
    possible: true,
    callerAnswer: null,
  },
];

const saturdayFriends: RoomView["friends"] = [
  { id: 1, name: "Aarav", online: true, answered: true, dropped: false },
  { id: 2, name: "Diya", online: true, answered: true, dropped: false },
  { id: 3, name: "Ishaan", online: true, answered: true, dropped: false },
  { id: 4, name: "Meera", online: true, answered: true, dropped: false },
  { id: 5, name: "Rohan", online: false, answered: false, dropped: false },
  { id: 6, name: "Zoya", online: true, answered: false, dropped: false },
];

export const saturdayOpenView: RoomView = {
  planId: 1,
  title: "Saturday plans",
  dateLabel: "Saturday",
  version: 1n,
  status: "open",
  activities: saturdayActivities,
  friends: saturdayFriends,
  pendingProposal: null,
  lockedActivityId: null,
  lockedAcceptors: [],
  latestEvent: {
    kind: "answered",
    message: "Meera can make Bowling.",
    at: new Date("2026-09-05T12:30:00Z"),
  },
};

export const saturdayPendingView: RoomView = {
  ...saturdayOpenView,
  pendingProposal: {
    id: 1,
    activityId: 1,
    activityName: "Bowling",
    acceptedCount: 2,
    requiredCount: 4,
    callerCanAccept: true,
    callerHasAccepted: false,
  },
  latestEvent: {
    kind: "proposed",
    message: "Aarav proposed Bowling.",
    at: new Date("2026-09-05T12:32:00Z"),
  },
};

export const saturdayLockedView: RoomView = {
  ...saturdayOpenView,
  version: 2n,
  status: "locked",
  lockedActivityId: 1,
  lockedAcceptors: saturdayFriends
    .slice(0, 4)
    .map(({ id, name }) => ({ id, name })),
  latestEvent: {
    kind: "locked",
    message: "Bowling is locked for four friends.",
    at: new Date("2026-09-05T12:34:00Z"),
  },
};

export const saturdayReopenedView: RoomView = {
  ...saturdayOpenView,
  version: 3n,
  friends: saturdayFriends.map((friend) =>
    friend.id === 4 ? { ...friend, online: false, dropped: true } : friend,
  ),
  activities: saturdayActivities.map((activity) =>
    activity.id === 1
      ? { ...activity, eligibleCount: 3, possible: false }
      : activity,
  ),
  latestEvent: {
    kind: "reopened",
    message: "Bowling needs a new decision - only 3 of 4 remain.",
    at: new Date("2026-09-05T12:36:00Z"),
  },
};

const noOp = async (): Promise<void> => undefined;

export const fixtureActions: RoomActions = {
  join: noOp,
  addActivity: noOp,
  setAnswer: noOp,
  propose: noOp,
  accept: noOp,
  cancelProposal: noOp,
  dropOut: noOp,
  leave: noOp,
  sendJoinEmail: noOp,
};
