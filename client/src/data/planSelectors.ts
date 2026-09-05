import type { DbView } from "../module_bindings";
import type {
  Activity,
  Answer,
  Friend,
  Plan,
  Proposal,
  Acceptance,
  EventLog,
} from "../module_bindings/types";
import type { RoomView } from "../fixtures/room";

const tag = (value: unknown): string | undefined =>
  typeof value === "object" && value !== null && "tag" in value
    ? String((value as { tag: unknown }).tag)
    : undefined;

export function buildRoomView(db: DbView, planId: number, identity?: { toHexString(): string }): RoomView {
  const plan = [...db.plan].find((row) => row.id === planId) as Plan | undefined;
  if (!plan) throw new Error("Room plan not found");
  const activities = [...db.activity].filter((row) => row.planId === planId) as Activity[];
  const friends = [...db.friend].filter((row) => row.planId === planId) as Friend[];
  const answers = [...db.answer].filter((row) => row.planId === planId) as Answer[];
  const proposals = [...db.proposal].filter((row) => row.planId === planId) as Proposal[];
  const acceptances = [...db.acceptance].filter((row) => {
    const proposal = proposals.find((candidate) => candidate.id === row.proposalId);
    return proposal !== undefined;
  }) as Acceptance[];
  const caller = identity ? friends.find((friend) => friend.identity.toHexString() === identity.toHexString()) : undefined;
  const currentAnswers = new Map(answers.filter((answer) => answer.friendId === caller?.id).map((answer) => [answer.activityId, answer]));
  const activeFriends = friends.filter((friend) => friend.droppedAt == null);
  const activityViews = activities.map((activity) => {
    const voteCount = answers.filter(
      (answer) =>
        answer.activityId === activity.id &&
        activeFriends.some((friend) => friend.id === answer.friendId),
    ).length;
    const eligibleCount = answers.filter((answer) => answer.activityId === activity.id && activeFriends.some((friend) => friend.id === answer.friendId) && (tag(answer.state) === "In" || (tag(answer.state) === "Conditional" && (answer.maxPrice ?? 0) >= activity.price))).length;
    const answer = currentAnswers.get(activity.id);
    const state = tag(answer?.state);
    return {
      id: activity.id,
      name: activity.name,
      price: activity.price,
      minPeople: activity.minPeople,
      distanceKm: activity.distanceKm,
      timeMinutes: activity.timeMinutes,
      eligibleCount,
      voteCount,
      possible: eligibleCount >= activity.minPeople,
      callerAnswer: state === "In" ? { state: "in" as const } : state === "Out" ? { state: "out" as const } : state === "Conditional" ? { state: "conditional" as const, ...(answer?.maxPrice == null ? {} : { maxPrice: answer.maxPrice }) } : null,
    };
  });
  const pending = proposals.find((proposal) => tag(proposal.status) === "Pending");
  const pendingActivity = pending ? activities.find((activity) => activity.id === pending.activityId) : undefined;
  const pendingAcceptances = pending ? acceptances.filter((acceptance) => acceptance.proposalId === pending.id) : [];
  const callerAnswer = pendingActivity ? currentAnswers.get(pendingActivity.id) : undefined;
  const callerEligible = pendingActivity && callerAnswer ? tag(callerAnswer.state) === "In" || (tag(callerAnswer.state) === "Conditional" && (callerAnswer.maxPrice ?? 0) >= pendingActivity.price) : false;
  const callerHasAccepted = pending ? pendingAcceptances.some((acceptance) => acceptance.friendId === caller?.id) : false;
  const events = [...db.eventLog].filter((row) => row.planId === planId) as EventLog[];
  const latestEvent = events.sort((a, b) => Number(b.id - a.id))[0];
  const lockedProposal = proposals.find((proposal) => tag(proposal.status) === "Locked");
  const lockedAcceptances = lockedProposal ? acceptances.filter((acceptance) => acceptance.proposalId === lockedProposal.id) : [];
  return {
    planId: plan.id,
    title: plan.title,
    dateLabel: plan.dateLabel,
    version: plan.version,
    status: tag(plan.status) === "Locked" ? "locked" : "open",
    activities: activityViews,
    friends: friends.map((friend) => ({ id: friend.id, name: friend.name, online: friend.online, answered: answers.some((answer) => answer.friendId === friend.id), dropped: friend.droppedAt != null })),
    pendingProposal: pending && pendingActivity ? { id: pending.id, activityId: pending.activityId, activityName: pendingActivity.name, acceptedCount: pendingAcceptances.length, requiredCount: pendingActivity.minPeople, callerCanAccept: Boolean(callerEligible), callerHasAccepted } : null,
    lockedActivityId: plan.lockedActivityId ?? null,
    lockedAcceptors: lockedAcceptances.map((acceptance) => friends.find((friend) => friend.id === acceptance.friendId)).filter((friend): friend is Friend => Boolean(friend)).map((friend) => ({ id: friend.id, name: friend.name })),
    latestEvent: latestEvent ? { kind: latestEvent.kind, message: latestEvent.message, at: latestEvent.at.toDate() } : null,
  };
}
