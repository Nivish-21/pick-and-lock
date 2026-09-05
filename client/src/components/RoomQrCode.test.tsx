// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoomQrCode } from "./RoomQrCode";

afterEach(cleanup);

describe("RoomQrCode", () => {
  it("renders an accessible SVG QR code with the room URL", () => {
    const roomUrl = "https://pick-and-lock.example/r/SATURDAY";

    render(
      <RoomQrCode roomUrl={roomUrl} label="Scan to join Saturday plans" />,
    );

    expect(
      screen.getByRole("img", { name: "Scan to join Saturday plans" }).nodeName,
    ).toBe("svg");
    expect(screen.getByText(roomUrl)).toBeTruthy();
  });
});
