// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "spacetimedb";
import { CreateRoomPage, type CreateRoomInput } from "./CreateRoomPage";

afterEach(cleanup);

function fillForm(
  title: string,
  scheduledAt = "2026-09-05T19:00",
  hostName = "Nivish",
  hostEmail = "",
) {
  fireEvent.change(screen.getByLabelText("What are we deciding?"), {
    target: { value: title },
  });
  fireEvent.change(screen.getByLabelText("When?"), {
    target: { value: scheduledAt },
  });
  fireEvent.change(screen.getByLabelText("Your name"), {
    target: { value: hostName },
  });
  if (hostEmail) {
    fireEvent.change(screen.getByLabelText("Your email (optional)"), {
      target: { value: hostEmail },
    });
  }
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
    fillForm("Dinner plan", "2026-09-05T19:00", "A");
    fireEvent.click(screen.getByRole("button", { name: "Create room" }));

    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(
      "Use a name between 2 and 40 characters.",
    );
  });

  it("does not create a room without a date and time", () => {
    const onCreate = vi.fn<(input: CreateRoomInput) => Promise<void>>();

    render(<CreateRoomPage onCreate={onCreate} />);
    fillForm("Dinner plan", "", "Nivish");
    fireEvent.click(screen.getByRole("button", { name: "Create room" }));

    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(
      "Choose a date and time.",
    );
  });

  it("creates a room with a ten-character uppercase code", async () => {
    const onCreate = vi
      .fn<(input: CreateRoomInput) => Promise<void>>()
      .mockResolvedValue(undefined);

    render(<CreateRoomPage onCreate={onCreate} />);
    fillForm("Dinner plan");
    fireEvent.click(screen.getByRole("button", { name: "Create room" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
    const input = onCreate.mock.calls[0][0];

    expect(input).toMatchObject({
      title: "Dinner plan",
      dateLabel: "Sat, Sep 5 · 7:00 PM",
      hostName: "Nivish",
    });
    expect(input.scheduledAt).toEqual(
      Timestamp.fromDate(new Date("2026-09-05T19:00")),
    );
    expect(input.shareCode).toMatch(/^[A-Z0-9]{10}$/);
  });

  it("trims a valid host name before creating the room", async () => {
    const onCreate = vi
      .fn<(input: CreateRoomInput) => Promise<void>>()
      .mockResolvedValue(undefined);

    render(<CreateRoomPage onCreate={onCreate} />);
    fillForm("Dinner plan", "2026-09-05T19:00", "  Host Name  ");
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

  it("includes email in the create input when provided", async () => {
    const onCreate = vi
      .fn<(input: CreateRoomInput) => Promise<void>>()
      .mockResolvedValue(undefined);

    render(<CreateRoomPage onCreate={onCreate} />);
    fillForm("Dinner plan", "2026-09-05T19:00", "Nivish", "test@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Create room" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
    expect(onCreate.mock.calls[0][0].hostEmail).toBe("test@example.com");
  });

  it("omits email from create input when empty", async () => {
    const onCreate = vi
      .fn<(input: CreateRoomInput) => Promise<void>>()
      .mockResolvedValue(undefined);

    render(<CreateRoomPage onCreate={onCreate} />);
    fillForm("Dinner plan");
    fireEvent.click(screen.getByRole("button", { name: "Create room" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
    expect(onCreate.mock.calls[0][0].hostEmail).toBeUndefined();
  });
});
