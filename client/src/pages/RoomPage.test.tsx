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

afterEach(cleanup);

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
});
