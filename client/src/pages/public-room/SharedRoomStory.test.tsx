// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SharedRoomStory, type PublicRoomStory } from "./SharedRoomStory";

afterEach(cleanup);

const lockedStory: PublicRoomStory = {
  publicRoomId: "DINNER42",
  title: "Friday dinner",
  summary: "Pick one place for Friday.",
  status: "locked",
  publishedAt: "2026-09-05T12:00:00Z",
  choices: ["Canteen", "Rooftop"],
  winningChoice: "Rooftop",
  decisionCount: 1,
  schedule: {
    startsAt: "2026-09-06T14:00:00Z",
    timezone: "Asia/Kolkata",
  },
};

describe("SharedRoomStory", () => {
  it("renders the exact independent-room CTA", () => {
    render(<SharedRoomStory story={lockedStory} loading={false} />);

    expect(
      screen.getByText("Have a decision to make? Make it together."),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Create your own room" }),
    ).toHaveProperty("href", "http://localhost:3000/");
  });

  it("renders only story choices, decision count, and an included schedule", () => {
    render(<SharedRoomStory story={lockedStory} loading={false} />);

    expect(screen.getByRole("heading", { name: "Friday dinner" })).toBeTruthy();
    expect(screen.getByText("Canteen")).toBeTruthy();
    expect(within(screen.getByRole("list")).getByText("Rooftop")).toBeTruthy();
    expect(screen.getByText("1 decision recorded")).toBeTruthy();
    expect(screen.getByText("Asia/Kolkata")).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
