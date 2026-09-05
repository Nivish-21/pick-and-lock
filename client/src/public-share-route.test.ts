import { describe, expect, it } from "vitest";
import { parsePublicShareRoute, publicSharePath } from "./public-share-route";

describe("public share route", () => {
  it("normalises a valid public room ID", () => {
    expect(parsePublicShareRoute("/share/dinner1")).toBe("DINNER1");
    expect(publicSharePath("dinner1")).toBe("/share/DINNER1");
  });

  it("rejects non-public routes and malformed IDs", () => {
    expect(parsePublicShareRoute("/share/")).toBeNull();
    expect(parsePublicShareRoute("/share/ABC-123")).toBeNull();
    expect(parsePublicShareRoute("/r/ABC123")).toBeNull();
  });
});
