import { fetchWithRetry, type RetryFetchOptions } from "./http";

export const INTENT_CLASSIFIER_PROMPT =
  "Does this message batch show the group addressing an assistant, asking for suggestions, or stuck without a plan? Reply with JSON {engage: boolean}.";

export type IntentMessage = {
  senderName: string;
  body: string;
};

export async function classifyIntent(
  apiKey: string,
  messages: IntentMessage[],
  options: RetryFetchOptions = {},
): Promise<{ engage: boolean }> {
  const response = await fetchWithRetry(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        max_completion_tokens: 20,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: INTENT_CLASSIFIER_PROMPT },
          { role: "user", content: JSON.stringify(messages) },
        ],
      }),
    },
    options,
  );
  if (!response.ok)
    throw new Error(`OpenAI intent classifier failed (${response.status})`);
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  try {
    return {
      engage:
        JSON.parse(data.choices?.[0]?.message?.content ?? "").engage === true,
    };
  } catch {
    return { engage: false };
  }
}
