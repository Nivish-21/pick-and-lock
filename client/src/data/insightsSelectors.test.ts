import { describe, expect, it } from "vitest";
import { buildInsightsView } from "./insightsSelectors";
import type { DbView } from "../module_bindings";

// buildInsightsView only ever reads db.plan/activity/friend/proposal/
// acceptance/eventLog as iterables, so a plain object of arrays is a
// faithful enough stand-in for the real subscription cache.
function fakeDb(tables: {
  plan?: unknown[];
  activity?: unknown[];
  friend?: unknown[];
  proposal?: unknown[];
  acceptance?: unknown[];
  eventLog?: unknown[];
}): DbView {
  return {
    plan: tables.plan ?? [],
    activity: tables.activity ?? [],
    friend: tables.friend ?? [],
    proposal: tables.proposal ?? [],
    acceptance: tables.acceptance ?? [],
    eventLog: tables.eventLog ?? [],
  } as unknown as DbView;
}

describe("buildInsightsView", () => {
  it("returns zeroed stats for an empty module", () => {
    const view = buildInsightsView(fakeDb({}));

    expect(view.totalRooms).toBe(0);
    expect(view.lockedRooms).toBe(0);
    expect(view.openRooms).toBe(0);
    expect(view.completionRate).toBe(0);
    expect(view.moneyCoordinated).toBe(0);
    expect(view.latestEvents).toEqual([]);
  });

  it("aggregates locked vs. open rooms and coordinated money", () => {
    const view = buildInsightsView(
      fakeDb({
        plan: [
          { id: 1, status: { tag: "Locked" }, lockedActivityId: 10 },
          { id: 2, status: { tag: "Locked" }, lockedActivityId: 20 },
          { id: 3, status: { tag: "Open" }, lockedActivityId: null },
        ],
        activity: [
          { id: 10, planId: 1, name: "Bowling", price: 400, minPeople: 4 },
          { id: 20, planId: 2, name: "Escape room", price: 600, minPeople: 5 },
        ],
      }),
    );

    expect(view.totalRooms).toBe(3);
    expect(view.lockedRooms).toBe(2);
    expect(view.openRooms).toBe(1);
    expect(view.completionRate).toBeCloseTo(2 / 3);
    expect(view.moneyCoordinated).toBe(1000);
  });

  it("counts active participants separately from dropped-out ones", () => {
    const view = buildInsightsView(
      fakeDb({
        friend: [
          { id: 1, droppedAt: null },
          { id: 2, droppedAt: null },
          { id: 3, droppedAt: new Date() },
        ],
      }),
    );

    expect(view.totalParticipants).toBe(3);
    expect(view.activeParticipants).toBe(2);
  });

  it("counts reopen events and surfaces the most recent events first", () => {
    const view = buildInsightsView(
      fakeDb({
        eventLog: [
          { id: 1n, kind: "joined", message: "Ann joined", at: 1000n },
          { id: 2n, kind: "reopened", message: "Plan reopened", at: 2000n },
          { id: 3n, kind: "locked", message: "Bowling locked", at: 3000n },
          { id: 4n, kind: "reopened", message: "Plan reopened again", at: 4000n },
        ],
      }),
    );

    expect(view.reopenCount).toBe(2);
    expect(view.latestEvents[0].message).toBe("Plan reopened again");
    expect(view.latestEvents.map((event) => event.message)).toEqual([
      "Plan reopened again",
      "Bowling locked",
      "Plan reopened",
      "Ann joined",
    ]);
  });

  it("counts proposals made and acceptances given", () => {
    const view = buildInsightsView(
      fakeDb({
        proposal: [{ id: 1 }, { id: 2 }, { id: 3 }],
        acceptance: [{ id: 1 }, { id: 2 }],
      }),
    );

    expect(view.totalProposalsMade).toBe(3);
    expect(view.totalAcceptances).toBe(2);
  });
});
