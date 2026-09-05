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
  saturdayLockedView,
  saturdayOpenView,
  type RoomActions,
} from "../fixtures/room";
import { RoomPage } from "./RoomPage";

const clipboardDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard",
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (clipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "clipboard");
  }
});

function actionsWith(overrides: Partial<RoomActions>): RoomActions {
  return { ...fixtureActions, ...overrides };
}

describe("RoomPage", () => {
  it("sends a conditional answer with the chosen maximum price", async () => {
    const setAnswer = vi.fn().mockResolvedValue(undefined);

    render(
      <RoomPage view={saturdayOpenView} actions={actionsWith({ setAnswer })} />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Conditional" })[0]);
    fireEvent.change(screen.getByLabelText("Maximum price in INR"), {
      target: { value: "450" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(setAnswer).toHaveBeenCalledWith(1, "conditional", 450);
    });
    expect(screen.queryByLabelText("Maximum price in INR")).toBeNull();
  });

  it("explains the automatic reopen safety rule in a locked room", async () => {
    const dropOut = vi.fn().mockResolvedValue(undefined);

    render(
      <RoomPage view={saturdayLockedView} actions={actionsWith({ dropOut })} />,
    );
    expect(
      screen.getByText(
        "If an accepter cannot come, the room automatically reopens for everyone.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "I can't come" }));

    await waitFor(() => {
      expect(dropOut).toHaveBeenCalledOnce();
    });
  });

  it("copies the current room link and announces success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<RoomPage view={saturdayOpenView} actions={fixtureActions} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy room link" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(window.location.href);
    });
    expect(screen.getByRole("status").textContent).toBe("Room link copied.");
  });

  it("announces when copying the room link is unavailable", async () => {
    Reflect.deleteProperty(navigator, "clipboard");

    render(<RoomPage view={saturdayOpenView} actions={fixtureActions} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy room link" }));

    expect(screen.getByRole("status").textContent).toBe(
      "Could not copy room link.",
    );
  });

  it("adds a custom activity with the entered values", async () => {
    const addActivity = vi.fn().mockResolvedValue(undefined);

    render(
      <RoomPage
        view={saturdayOpenView}
        actions={actionsWith({ addActivity })}
      />,
    );
    fireEvent.change(screen.getByLabelText("Activity name"), {
      target: { value: "Picnic" },
    });
    fireEvent.change(screen.getByLabelText("Price in INR"), {
      target: { value: "250" },
    });
    fireEvent.change(screen.getByLabelText("Minimum people"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add activity" }));

    await waitFor(() => {
      expect(addActivity).toHaveBeenCalledWith(
        "Picnic",
        250,
        3,
        undefined,
        undefined,
      );
    });
  });

  it("adds optional distance and time metadata", async () => {
    const addActivity = vi.fn().mockResolvedValue(undefined);

    render(
      <RoomPage
        view={saturdayOpenView}
        actions={actionsWith({ addActivity })}
      />,
    );
    fireEvent.change(screen.getByLabelText("Activity name"), {
      target: { value: "Museum" },
    });
    fireEvent.change(screen.getByLabelText("Distance in km (optional)"), {
      target: { value: "5" },
    });
    fireEvent.change(
      screen.getByLabelText("Time budget in minutes (optional)"),
      { target: { value: "60" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Add activity" }));

    await waitFor(() => {
      expect(addActivity).toHaveBeenCalledWith("Museum", 0, 1, 5, 60);
    });
  });

  it("shows the reducer error when adding an activity fails", async () => {
    const addActivity = vi
      .fn()
      .mockRejectedValue(new Error("That option already exists"));

    render(
      <RoomPage
        view={saturdayOpenView}
        actions={actionsWith({ addActivity })}
      />,
    );
    fireEvent.change(screen.getByLabelText("Activity name"), {
      target: { value: "Bowling" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add activity" }));

    expect(
      await screen.findByText("Action not applied: That option already exists"),
    ).toBeTruthy();
  });
});
