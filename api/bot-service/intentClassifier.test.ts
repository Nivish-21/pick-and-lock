import { describe, expect, it } from "vitest";
import { classifyIntent, INTENT_CLASSIFIER_PROMPT } from "./intentClassifier";

function mockedFetch(payload: unknown) {
  const calls: RequestInit[] = [];
  const fetchImpl = (async (_input: string, init?: RequestInit) => {
    calls.push(init ?? {});
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(payload) } }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

describe("classifyIntent", () => {
  it("sends only the cheap message batch and returns engage", async () => {
    const { fetchImpl, calls } = mockedFetch({ engage: true });

    await expect(
      classifyIntent(
        "test-key",
        [{ senderName: "Priya", body: "Any ideas for Saturday?" }],
        { fetchImpl },
      ),
    ).resolves.toEqual({ engage: true });

    const request = JSON.parse(String(calls[0]?.body));
    expect(request.model).toBe("gpt-5-nano");
    expect(request.max_completion_tokens).toBe(20);
    expect(request.messages).toEqual([
      { role: "system", content: INTENT_CLASSIFIER_PROMPT },
      {
        role: "user",
        content: JSON.stringify([
          { senderName: "Priya", body: "Any ideas for Saturday?" },
        ]),
      },
    ]);
  });

  it("fails closed for malformed model output", async () => {
    const { fetchImpl } = mockedFetch({ engage: "yes" });
    await expect(
      classifyIntent("test-key", [], { fetchImpl }),
    ).resolves.toEqual({
      engage: false,
    });
  });
});
