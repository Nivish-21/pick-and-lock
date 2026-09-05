import { describe, expect, it } from "vitest";
import { extractPollIdeas } from "./pollAuthoring";

describe("extractPollIdeas", () => {
  it("filters low-confidence, existing, duplicate, and invalid ideas", () => {
    expect(extractPollIdeas([
      { name: "Bowling", confidence: 0.99 },
      { name: "Escape room", confidence: 0.8 },
      { name: "Escape room", confidence: 0.9 },
      { name: "Maybe", confidence: 0.69 },
      { name: "", confidence: 1 },
    ], ["escape ROOM"])).toEqual([
      { name: "Bowling", price: 0, minPeople: 1, confidence: 0.99 },
    ]);
  });

  it("normalizes unspecified bounds and clamps safe values", () => {
    expect(extractPollIdeas([
      { name: "Picnic", confidence: 0.8, price: 1200.9, min_people: 100 },
      { name: "Board games", confidence: 0.8, price: -4, min_people: 0 },
    ], [])).toEqual([
      { name: "Picnic", price: 1200, minPeople: 50, confidence: 0.8 },
      { name: "Board games", price: 0, minPeople: 1, confidence: 0.8 },
    ]);
  });
});
