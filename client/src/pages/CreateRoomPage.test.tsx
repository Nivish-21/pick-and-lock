// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateRoomPage, type CreateRoomInput } from "./CreateRoomPage";

afterEach(cleanup);

function fillForm(title: string, dateLabel = "Tonight", hostName = "Nivish") {
  fireEvent.change(screen.getByLabelText("What are we deciding?"), {
    target: { value: title },
  });
  fireEvent.change(screen.getByLabelText("When?"), {
    target: { value: dateLabel },
  });
  fireEvent.change(screen.getByLabelText("Your name"), {
    target: { value: hostName },
  });
}

describe("CreateRoomPage", () => {
  it("does not create a room for an invalid title", () => {
    const onCreate = vi.fn<(input: CreateRoomInput) => Promise<void>>();

    render(<CreateRoomPage onCreate={onCreate} />);
    fillForm("   ");
    fireEvent.click(screen.getByRole("button", { name: "Create room" }));

    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(
      "Add a decision between 1 and 60 characters.",
    );
  });

  it("does not create a room for an invalid host name", () => {
    const onCreate = vi.fn<(input: CreateRoomInput) => Promise<void>>();

    render(<CreateRoomPage onCreate={onCreate} />);
    fillForm("Dinner plan", "Tonight", "A");
    fireEvent.click(screen.getByRole("button", { name: "Create room" }));

    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(
      "Use a name between 2 and 40 characters.",
    );
  });

  it("creates a room with a ten-character uppercase code", async () => {
    const onCreate = vi
      .fn<(input: CreateRoomInput) => Promise<void>>()
      .mockResolvedValue(undefined);

    render(<CreateRoomPage onCreate={onCreate} />);
    fillForm("Dinner plan", "Friday at 8");
    fireEvent.click(screen.getByRole("button", { name: "Create room" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
    const input = onCreate.mock.calls[0][0];

    expect(input).toMatchObject({
      title: "Dinner plan",
      dateLabel: "Friday at 8",
      hostName: "Nivish",
    });
    expect(input.shareCode).toMatch(/^[A-Z0-9]{10}$/);
  });

  it("trims a valid host name before creating the room", async () => {
    const onCreate = vi
      .fn<(input: CreateRoomInput) => Promise<void>>()
      .mockResolvedValue(undefined);

    render(<CreateRoomPage onCreate={onCreate} />);
    fillForm("Dinner plan", "Tonight", "  Host Name  ");
    fireEvent.click(screen.getByRole("button", { name: "Create room" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
    expect(onCreate.mock.calls[0][0].hostName).toBe("Host Name");
  });

  it("shows a rejected create error", async () => {
    const onCreate = vi
      .fn<(input: CreateRoomInput) => Promise<void>>()
      .mockRejectedValue(new Error("Room code already exists"));

    render(<CreateRoomPage onCreate={onCreate} />);
    fillForm("Dinner plan");
    fireEvent.click(screen.getByRole("button", { name: "Create room" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Room code already exists",
    );
  });

  it("shows the generated code after a successful create", async () => {
    const onCreate = vi
      .fn<(input: CreateRoomInput) => Promise<void>>()
      .mockResolvedValue(undefined);

    render(<CreateRoomPage onCreate={onCreate} />);
    fillForm("Dinner plan");
    fireEvent.click(screen.getByRole("button", { name: "Create room" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
    const { shareCode } = onCreate.mock.calls[0][0];
    const success = await screen.findByRole("status");

    expect(success.textContent).toContain("Room created.");
    expect(success.textContent).toContain(shareCode);
  });
});
