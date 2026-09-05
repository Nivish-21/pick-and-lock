import type { DbView } from "../module_bindings";
import type {
  Activity,
  Friend,
  Plan,
  Proposal,
  Acceptance,
  EventLog,
} from "../module_bindings/types";

const tag = (value: unknown): string | undefined =>
  typeof value === "object" && value !== null && "tag" in value
    ? String((value as { tag: unknown }).tag)
    : undefined;

export type InsightsEvent = { message: string; at: Date };

export type InsightsView = {
  totalRooms: number;
  lockedRooms: number;
  openRooms: number;
  completionRate: number;
  totalParticipants: number;
  activeParticipants: number;
  reopenCount: number;
  totalActivitiesOffered: number;
  totalProposalsMade: number;
  totalAcceptances: number;
  moneyCoordinated: number;
  latestEvents: InsightsEvent[];
};

/**
 * Pure, client-side aggregate view across every room in the SpacetimeDB
 * module. Reads only the already-public tables (Plan/Activity/Friend/
 * Proposal/Acceptance/EventLog) — no server changes required, and nothing
 * here touches Section A's per-room reducer/table logic.
 */
export function buildInsightsView(db: DbView): InsightsView {
  const plans = [...db.plan] as Plan[];
  const activities = [...db.activity] as Activity[];
  const friends = [...db.friend] as Friend[];
  const proposals = [...db.proposal] as Proposal[];
  const acceptances = [...db.acceptance] as Acceptance[];
  const events = [...db.eventLog] as EventLog[];

  const lockedPlans = plans.filter((plan) => tag(plan.status) === "Locked");
  const totalRooms = plans.length;
  const lockedRooms = lockedPlans.length;
  const openRooms = totalRooms - lockedRooms;
  const completionRate = totalRooms === 0 ? 0 : lockedRooms / totalRooms;

  const activeFriends = friends.filter((friend) => friend.droppedAt == null);

  const moneyCoordinated = lockedPlans.reduce((sum, plan) => {
    const activity = activities.find(
      (candidate) => candidate.id === plan.lockedActivityId,
    );
    return sum + (activity?.price ?? 0);
  }, 0);

  const reopenCount = events.filter((event) => event.kind === "reopened").length;

  const latestEvents = [...events]
    .sort((a, b) => Number(b.id - a.id))
    .slice(0, 8)
    .map((event) => ({ message: event.message, at: event.at.toDate() }));

  return {
    totalRooms,
    lockedRooms,
    openRooms,
    completionRate,
    totalParticipants: friends.length,
    activeParticipants: activeFriends.length,
    reopenCount,
    totalActivitiesOffered: activities.length,
    totalProposalsMade: proposals.length,
    totalAcceptances: acceptances.length,
    moneyCoordinated,
    latestEvents,
  };
}
