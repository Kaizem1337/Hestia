/**
 * Tiny server-side HTTP helpers for the free market-data / FX providers.
 *
 * A browser-like User-Agent is important: Yahoo and Stooq return 403/empty for
 * requests without one. Every call has a timeout so a slow provider can't hang
 * a request, and errors are thrown for the caller to handle/fallback.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export async function fetchText(
  url: string,
  opts: { timeoutMs?: number; accept?: string } = {}
): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: opts.accept ?? "*/*",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(opts.timeoutMs ?? 12_000),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

export async function fetchJson<T = unknown>(
  url: string,
  opts: { timeoutMs?: number } = {}
): Promise<T> {
  const text = await fetchText(url, {
    timeoutMs: opts.timeoutMs,
    accept: "application/json",
  });
  return JSON.parse(text) as T;
}
