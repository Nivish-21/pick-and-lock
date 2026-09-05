// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fixtureActions,
  type ActivityView,
  type RoomActions,
} from "../fixtures/room";
import { ActivityCard } from "./ActivityCard";

afterEach(cleanup);

const possibleActivity: ActivityView = {
  id: 1,
  name: "Bowling",
  price: 400,
  minPeople: 4,
  eligibleCount: 4,
  possible: true,
  callerAnswer: null,
};

function actionsWith(overrides: Partial<RoomActions>): RoomActions {
  return { ...fixtureActions, ...overrides };
}

describe("ActivityCard", () => {
  it("shows optional distance and time metadata", () => {
    render(
      <ActivityCard
        activity={{ ...possibleActivity, distanceKm: 5, timeMinutes: 90 }}
        actions={fixtureActions}
        onError={vi.fn()}
      />,
    );

    expect(screen.getByText(/INR 400 · minimum 4 · 5 km · back in 1h 30m/)).toBeTruthy();
  });

  it("proposes a possible activity", async () => {
    const propose = vi.fn().mockResolvedValue(undefined);

    render(
      <ActivityCard
        activity={possibleActivity}
        actions={actionsWith({ propose })}
        onError={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Propose Bowling" }));

    await waitFor(() => {
      expect(propose).toHaveBeenCalledWith(1);
    });
  });

  it("does not offer a proposal for an impossible activity", () => {
    render(
      <ActivityCard
        activity={{ ...possibleActivity, possible: false, eligibleCount: 3 }}
        actions={fixtureActions}
        onError={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Propose Bowling" }),
    ).toBeNull();
  });

  it("forwards proposal rejections to the error callback", async () => {
    const onError = vi.fn();

    render(
      <ActivityCard
        activity={possibleActivity}
        actions={actionsWith({
          propose: vi.fn().mockRejectedValue(new Error("Already proposed")),
        })}
        onError={onError}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Propose Bowling" }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Already proposed");
    });
  });
});
