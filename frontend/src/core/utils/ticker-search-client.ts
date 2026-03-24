export interface TickerSuggestion {
  ticker: string;
  name: string;
  cik: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const suggestionCache = new Map<string, { data: TickerSuggestion[]; ts: number }>();
const inFlight = new Map<string, Promise<TickerSuggestion[]>>();

function makeAbortError(): Error {
  return new DOMException('The operation was aborted.', 'AbortError');
}

export async function searchTickers(
  query: string,
  opts?: { signal?: AbortSignal; limit?: number }
): Promise<TickerSuggestion[]> {
  const normalizedQuery = query.trim().toUpperCase();
  const limit = Math.max(1, Math.min(20, opts?.limit ?? 8));

  if (normalizedQuery.length < 2) return [];
  if (opts?.signal?.aborted) throw makeAbortError();

  const cacheKey = `${normalizedQuery}:${limit}`;
  const now = Date.now();
  const cached = suggestionCache.get(cacheKey);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const existing = inFlight.get(cacheKey);
  if (existing) {
    const data = await existing;
    if (opts?.signal?.aborted) throw makeAbortError();
    return data;
  }

  const fetchPromise = fetch(`/api/sec/search?q=${encodeURIComponent(normalizedQuery)}&limit=${limit}`, {
    signal: opts?.signal
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Search request failed: ${res.status}`);
      }
      const data = await res.json();
      return Array.isArray(data) ? (data as TickerSuggestion[]) : [];
    })
    .then((data) => {
      suggestionCache.set(cacheKey, { data, ts: Date.now() });
      return data;
    })
    .finally(() => {
      inFlight.delete(cacheKey);
    });

  inFlight.set(cacheKey, fetchPromise);
  return fetchPromise;
}

