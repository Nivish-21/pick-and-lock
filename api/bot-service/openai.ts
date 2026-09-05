import { fetchWithRetry, type RetryFetchOptions } from "./http";

export type ModeratorMessage = {
  senderName: string;
  body: string;
};

export type ModeratorResult = {
  reply_text: string | null;
  extracted_preferences: Array<{
    friend_id: number;
    statement: string;
    category: "dietary" | "budget" | "timing" | "access" | "other";
  }>;
  place_query_needed: boolean;
  activity_ideas: Array<{
    name?: unknown;
    price?: unknown;
    min_people?: unknown;
    confidence?: unknown;
  }>;
};

const emptyResult: ModeratorResult = {
  reply_text: null,
  extracted_preferences: [],
  place_query_needed: false,
  activity_ideas: [],
};

export async function askModerator(
  apiKey: string,
  context: {
    allowedToSpeak: boolean;
    trigger: string;
    messages: ModeratorMessage[];
    preferenceDigest: string;
  },
  options: RetryFetchOptions = {},
): Promise<ModeratorResult> {
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
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You are AI Concierge in a friend decision room. Return JSON with exactly reply_text (string or null), extracted_preferences (array of {friend_id, statement, category}), place_query_needed (boolean), and activity_ideas (array of {name, price, min_people, confidence}). Extract only explicit preferences and activity or venue ideas that the group is considering. Use confidence from 0 to 1. Keep replies concise. If allowed_to_speak is false, reply_text must be null.',
          },
          {
            role: "user",
            content: JSON.stringify({
              allowed_to_speak: context.allowedToSpeak,
              trigger: context.trigger,
              messages: context.messages,
              preference_digest: context.preferenceDigest,
            }),
          },
        ],
      }),
    },
    options,
  );
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return emptyResult;
  try {
    const parsed = JSON.parse(content) as Partial<ModeratorResult>;
    return {
      reply_text:
        context.allowedToSpeak && typeof parsed.reply_text === "string"
          ? parsed.reply_text.trim().slice(0, 500) || null
          : null,
      extracted_preferences: Array.isArray(parsed.extracted_preferences)
        ? parsed.extracted_preferences
        : [],
      place_query_needed: parsed.place_query_needed === true,
      activity_ideas: Array.isArray(parsed.activity_ideas) ? parsed.activity_ideas : [],
    };
  } catch {
    return emptyResult;
  }
}
