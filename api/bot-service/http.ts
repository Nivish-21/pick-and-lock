export type FetchLike = typeof fetch;

export type RetryFetchOptions = {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  fetchImpl?: FetchLike;
};

export async function fetchWithRetry(
  input: string,
  init: RequestInit,
  options: RetryFetchOptions = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 8_000;
  const retries = options.retries ?? 1;
  const backoffMs = options.backoffMs ?? 250;
  const fetchImpl = options.fetchImpl ?? fetch;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(input, { ...init, signal: controller.signal });
      if (response.ok || attempt === retries) return response;
      lastError = new Error(`HTTP request failed with status ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
    } finally {
      clearTimeout(timer);
    }
    await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
  }

  throw lastError instanceof Error ? lastError : new Error("HTTP request failed");
}
