import { describe, expect, it } from "vitest";
import { parseRoomRoute } from "./room-route";

describe("parseRoomRoute", () => {
  it("accepts an uppercase share code", () => {
    expect(parseRoomRoute("/r/SATURDAY")).toBe("SATURDAY");
  });

  it("normalises a lowercase share code", () => {
    expect(parseRoomRoute("/r/saturday")).toBe("SATURDAY");
  });

  it("accepts one trailing slash", () => {
    expect(parseRoomRoute("/r/SATURDAY/")).toBe("SATURDAY");
  });

  it("rejects malformed share codes", () => {
    expect(parseRoomRoute("/r/SHORT")).toBeNull();
    expect(parseRoomRoute("/r/SATURDAY-1")).toBeNull();
    expect(parseRoomRoute("/r/SATURDAY/extra")).toBeNull();
  });

  it("rejects unrelated paths", () => {
    expect(parseRoomRoute("/about")).toBeNull();
  });
});
