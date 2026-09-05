// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoomSession } from "./App";

const { bridgeActions, bridgeView } = vi.hoisted(() => ({
  bridgeActions: {
    join: vi.fn().mockResolvedValue(undefined),
    addActivity: vi.fn().mockResolvedValue(undefined),
    setAnswer: vi.fn().mockResolvedValue(undefined),
    propose: vi.fn().mockResolvedValue(undefined),
    accept: vi.fn().mockResolvedValue(undefined),
    cancelProposal: vi.fn().mockResolvedValue(undefined),
    dropOut: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn().mockResolvedValue(undefined),
    sendJoinEmail: vi.fn().mockResolvedValue(undefined),
  },
  bridgeView: {
    planId: 1,
    title: "Saturday plans",
    dateLabel: "Saturday",
    version: 1n,
    status: "open",
    activities: [],
    friends: [],
    pendingProposal: null,
    lockedActivityId: null,
    lockedAcceptors: [],
    latestEvent: null,
  },
}));

vi.mock("./data/RoomDataBridge", () => ({
  RoomDataBridge: ({
    children,
  }: {
    children: (
      view: typeof bridgeView,
      actions: typeof bridgeActions,
    ) => ReactNode;
  }) => children(bridgeView, bridgeActions),
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe("RoomSession", () => {
  it("auto-joins a pending host and skips the landing page", async () => {
    sessionStorage.setItem("pending-host-name:SATURDAY", "Host Name");

    render(<RoomSession roomCode="SATURDAY" />);

    await waitFor(() => {
      expect(bridgeActions.join).toHaveBeenCalledWith("Host Name");
    });
    expect(
      await screen.findByRole("heading", { name: "What works for you?" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Join Saturday plans" }),
    ).toBeNull();
    expect(sessionStorage.getItem("pending-host-name:SATURDAY")).toBeNull();
  });
});
