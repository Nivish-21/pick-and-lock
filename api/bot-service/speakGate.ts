export type SpeakGateMessage = {
  body: string;
  senderName: string;
  isBot?: boolean;
  kind?: string;
};

export type SpeakGateState = {
  lastBotMessageAt?: number;
  botMessagesInCurrentMinute: number;
  minuteWindowStartedAt: number;
};

export type SpeakTrigger =
  | "direct-address"
  | "location-submitted"
  | "decision-milestone"
  | "silence-timeout"
  | "none";

export type SpeakGateInput = {
  messages: SpeakGateMessage[];
  now: number;
  state: SpeakGateState;
  locationJustSubmitted?: boolean;
  decisionMilestone?: boolean;
  lastActivityAt?: number;
  silenceMs?: number;
  everyoneAnswered?: boolean;
};

export type SpeakGateResult = {
  allowed: boolean;
  trigger: SpeakTrigger;
  reason: string;
};

function isDirectlyAddressed(messages: SpeakGateMessage[]): boolean {
  return messages.some(
    (message) =>
      !message.isBot &&
      /(?:^|[\s,])(?:@(?:ai\s+concierge|pick\s*&?\s*lock|bot|sorted)|(?:ai\s+concierge|pick\s*&?\s*lock|bot))(?:\b|$)/i.test(
        message.body,
      ),
  );
}

export function decideSpeak(input: SpeakGateInput): SpeakGateResult {
  const inMinute = input.now - input.state.minuteWindowStartedAt < 60_000;
  const messageCount = inMinute ? input.state.botMessagesInCurrentMinute : 0;
  if (
    input.state.lastBotMessageAt !== undefined &&
    input.now - input.state.lastBotMessageAt < 25_000
  ) {
    return { allowed: false, trigger: "none", reason: "cooldown" };
  }
  if (messageCount >= 3) {
    return { allowed: false, trigger: "none", reason: "minute-cap" };
  }

  if (isDirectlyAddressed(input.messages)) {
    return { allowed: true, trigger: "direct-address", reason: "directly addressed" };
  }
  if (input.locationJustSubmitted) {
    return { allowed: true, trigger: "location-submitted", reason: "new location" };
  }
  const humanDecisionMilestone = input.decisionMilestone && input.messages.some(
    (message) => !message.isBot && message.kind === "recap",
  );
  if (humanDecisionMilestone) {
    return { allowed: true, trigger: "decision-milestone", reason: "decision milestone" };
  }

  const silenceMs = input.silenceMs ?? 120_000;
  if (
    input.lastActivityAt !== undefined &&
    input.now - input.lastActivityAt >= silenceMs &&
    input.everyoneAnswered !== true
  ) {
    return { allowed: true, trigger: "silence-timeout", reason: "room is waiting" };
  }

  return { allowed: false, trigger: "none", reason: "no speak trigger" };
}
