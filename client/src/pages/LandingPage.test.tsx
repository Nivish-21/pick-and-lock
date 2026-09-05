// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { saturdayOpenView } from "../fixtures/room";
import { LandingPage } from "./LandingPage";

afterEach(cleanup);

describe("LandingPage", () => {
  it("rejects a name shorter than two characters", () => {
    const onJoin = vi.fn();

    render(<LandingPage view={saturdayOpenView} onJoin={onJoin} />);
    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "A" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: `Join ${saturdayOpenView.title}` }),
    );

    expect(
      screen.getByText("Use a name between 2 and 40 characters."),
    ).toBeTruthy();
    expect(onJoin).not.toHaveBeenCalled();
  });

  it("joins using a trimmed display name", () => {
    const onJoin = vi.fn();

    render(<LandingPage view={saturdayOpenView} onJoin={onJoin} />);
    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "  Nivish  " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: `Join ${saturdayOpenView.title}` }),
    );

    expect(onJoin).toHaveBeenCalledWith("Nivish");
  });

  it("renders the live room's activities, not a fixture", () => {
    const liveView = {
      ...saturdayOpenView,
      title: "Diwali Get-together",
      activities: [
        {
          id: 99,
          name: "Movie night",
          price: 200,
          minPeople: 2,
          eligibleCount: 1,
          possible: false,
          callerAnswer: null,
        },
      ],
    };

    render(<LandingPage view={liveView} onJoin={vi.fn()} />);

    expect(screen.getByText("Movie night")).toBeTruthy();
    expect(screen.queryByText("Bowling")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Join Diwali Get-together" }),
    ).toBeTruthy();
  });
});
