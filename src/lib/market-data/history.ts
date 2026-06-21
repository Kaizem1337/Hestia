import { fetchJson } from "@/lib/http";
import { yahooSymbolCandidates } from "@/lib/symbols";

/**
 * Historical price series from Yahoo's crumb-free chart endpoint. Used to
 * reconstruct a portfolio performance line from the user's *current* holdings
 * priced over time (mark-to-market) — the standard way trackers show a chart
 * before/without their own recorded history.
 */
export interface PricePoint {
  t: number; // ms epoch
  close: number;
}

const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

const RANGE_PARAMS: Record<string, { range: string; interval: string }> = {
  "1D": { range: "1d", interval: "5m" },
  "1W": { range: "5d", interval: "30m" },
  "1M": { range: "1mo", interval: "1d" },
  "1Y": { range: "1y", interval: "1wk" },
  All: { range: "max", interval: "1mo" },
};

const MINOR_UNIT: Record<string, number> = { GBp: 100, ZAc: 100, ILA: 100 };

export async function getPriceHistory(
  symbol: string,
  range: string
): Promise<PricePoint[]> {
  const p = RANGE_PARAMS[range] ?? RANGE_PARAMS["1M"];
  // Try the requested symbol first, then its Taiwan sibling (.TW <-> .TWO).
  for (const sym of yahooSymbolCandidates(symbol)) {
    for (const host of HOSTS) {
      try {
        const url = `${host}/v8/finance/chart/${encodeURIComponent(
          sym
        )}?range=${p.range}&interval=${p.interval}`;
        const json = await fetchJson<{
          chart?: {
            result?: Array<{
              timestamp?: number[];
              meta?: { currency?: string };
              indicators?: { quote?: Array<{ close?: (number | null)[] }> };
            }>;
          };
        }>(url);
        const res = json?.chart?.result?.[0];
        const ts = res?.timestamp;
        const closes = res?.indicators?.quote?.[0]?.close;
        const divisor = MINOR_UNIT[res?.meta?.currency ?? ""] ?? 1;
        if (Array.isArray(ts) && Array.isArray(closes)) {
          const out: PricePoint[] = [];
          for (let i = 0; i < ts.length; i++) {
            const c = closes[i];
            if (typeof c === "number" && Number.isFinite(c)) {
              out.push({ t: ts[i] * 1000, close: c / divisor });
            }
          }
          if (out.length) return out;
        }
      } catch {
        // try next host / candidate
      }
    }
  }
  return [];
}
