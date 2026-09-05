import { describe, expect, it } from "vitest";
import { decideSpeak } from "./speakGate";

const state = {
  botMessagesInCurrentMinute: 0,
  minuteWindowStartedAt: 0,
};

describe("decideSpeak", () => {
  it("speaks when directly addressed", () => {
    expect(
      decideSpeak({
        messages: [{ senderName: "Priya", body: "@AI Concierge, any ideas?" }],
        now: 1000,
        state,
      }),
    ).toMatchObject({ allowed: true, trigger: "direct-address" });
  });

  it("recognizes @sorted as a direct address", () => {
    expect(
      decideSpeak({
        messages: [{ senderName: "Priya", body: "@Sorted, suggest something" }],
        now: 1000,
        state,
      }),
    ).toMatchObject({ allowed: true, trigger: "direct-address" });
  });

  it("stays silent for ordinary conversation", () => {
    expect(
      decideSpeak({
        messages: [{ senderName: "Priya", body: "I can do dinner" }],
        now: 1000,
        state,
      }),
    ).toMatchObject({ allowed: false, trigger: "none" });
  });

  it("does not treat a bot recap as a new decision milestone", () => {
    expect(
      decideSpeak({
        messages: [{ senderName: "AI Concierge", body: "Added Bowling.", isBot: true, kind: "recap" }],
        now: 1000,
        state,
        decisionMilestone: true,
      }),
    ).toMatchObject({ allowed: false, trigger: "none" });
  });

  it("allows a human decision recap to trigger a response", () => {
    expect(
      decideSpeak({
        messages: [{ senderName: "Priya", body: "Bowling works for everyone.", kind: "recap" }],
        now: 1000,
        state,
        decisionMilestone: true,
      }),
    ).toMatchObject({ allowed: true, trigger: "decision-milestone" });
  });

  it("always reacts to a fresh location unless cooldown blocks it", () => {
    expect(decideSpeak({ messages: [], now: 1000, state, locationJustSubmitted: true })).toMatchObject({ allowed: true });
    expect(
      decideSpeak({
        messages: [],
        now: 10_000,
        state: { ...state, lastBotMessageAt: 9_000 },
        locationJustSubmitted: true,
      }),
    ).toMatchObject({ allowed: false, reason: "cooldown" });
  });

  it("allows a silence nudge only before everyone answers", () => {
    expect(
      decideSpeak({ messages: [], now: 130_000, state, lastActivityAt: 0, silenceMs: 120_000 }),
    ).toMatchObject({ allowed: true, trigger: "silence-timeout" });
    expect(
      decideSpeak({ messages: [], now: 130_000, state, lastActivityAt: 0, silenceMs: 120_000, everyoneAnswered: true }),
    ).toMatchObject({ allowed: false });
  });
});
