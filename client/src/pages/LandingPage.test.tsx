// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandingPage } from "./LandingPage";

afterEach(cleanup);

describe("LandingPage", () => {
  it("rejects a name shorter than two characters", () => {
    const onJoin = vi.fn();

    render(<LandingPage onJoin={onJoin} />);
    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "A" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Join Saturday room" }));

    expect(
      screen.getByText("Use a name between 2 and 40 characters."),
    ).toBeTruthy();
    expect(onJoin).not.toHaveBeenCalled();
  });

  it("joins using a trimmed display name", () => {
    const onJoin = vi.fn();

    render(<LandingPage onJoin={onJoin} />);
    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "  Nivish  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Join Saturday room" }));

    expect(onJoin).toHaveBeenCalledWith("Nivish");
  });
});
