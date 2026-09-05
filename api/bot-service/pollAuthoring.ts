export type ActivityIdea = {
  name: string;
  price: number;
  minPeople: number;
  confidence: number;
};

export type PollCandidate = {
  name?: unknown;
  price?: unknown;
  min_people?: unknown;
  confidence?: unknown;
};

export function extractPollIdeas(
  candidates: PollCandidate[],
  existingNames: string[],
): ActivityIdea[] {
  const existing = new Set(existingNames.map((name) => name.trim().toLocaleLowerCase()));
  const added = new Set<string>();
  const ideas: ActivityIdea[] = [];
  for (const candidate of candidates) {
    if (typeof candidate.name !== "string") continue;
    const name = candidate.name.trim();
    const confidence = typeof candidate.confidence === "number" ? candidate.confidence : 0;
    const price = typeof candidate.price === "number" && Number.isFinite(candidate.price) ? Math.max(0, Math.floor(candidate.price)) : 0;
    const minPeople = typeof candidate.min_people === "number" && Number.isFinite(candidate.min_people)
      ? Math.max(1, Math.min(50, Math.floor(candidate.min_people)))
      : 1;
    const key = name.toLocaleLowerCase();
    if (!name || name.length > 60 || confidence < 0.7 || existing.has(key) || added.has(key)) continue;
    if (price > 1_000_000) continue;
    added.add(key);
    ideas.push({ name, price, minPeople, confidence });
  }
  return ideas;
}
