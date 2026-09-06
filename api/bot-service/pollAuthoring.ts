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
  distance_km?: unknown;
  time_minutes?: unknown;
  confidence?: unknown;
};

export type PollDraftUpdate = {
  name: string;
  price?: number;
  minPeople?: number;
  distanceKm?: number;
  timeMinutes?: number;
};

export type PollConstraints = Omit<PollDraftUpdate, "name">;

function optionalBound(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : undefined;
}

export function mergePollDraftUpdates(
  candidates: PollCandidate[],
  constraints: PollConstraints = {},
): PollDraftUpdate[] {
  const drafts = new Map<string, PollDraftUpdate>();
  for (const candidate of candidates) {
    if (typeof candidate.name !== "string") continue;
    const name = candidate.name.trim();
    const key = name.toLocaleLowerCase();
    if (!name || name.length > 60 || drafts.has(key)) continue;
    const draft: PollDraftUpdate = { name };
    const price = optionalBound(candidate.price);
    const minPeople = optionalBound(candidate.min_people);
    const distanceKm = optionalBound(candidate.distance_km);
    const timeMinutes = optionalBound(candidate.time_minutes);
    if (price !== undefined) draft.price = price;
    if (minPeople !== undefined) draft.minPeople = Math.max(1, minPeople);
    if (distanceKm !== undefined) draft.distanceKm = distanceKm;
    if (timeMinutes !== undefined) draft.timeMinutes = timeMinutes;
    drafts.set(key, draft);
  }
  return [...drafts.values()].map((draft) => ({
    ...constraints,
    ...draft,
  }));
}

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
