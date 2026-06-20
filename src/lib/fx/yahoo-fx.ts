import { fetchJson } from "@/lib/http";
import type { FxPair, FxProvider, FxQuote } from "./types";

/**
 * Yahoo FX provider using the crumb-free chart endpoint with currency pair
 * symbols of the form "USDKRW=X" (price = how many <to> per 1 <from>).
 */
const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

export class YahooFxProvider implements FxProvider {
  readonly name = "yahoo-fx";

  async getRates(pairs: FxPair[]): Promise<FxQuote[]> {
    const out: FxQuote[] = [];
    const needed: FxPair[] = [];
    for (const p of pairs) {
      if (p.from === p.to) out.push({ from: p.from, to: p.to, rate: 1 });
      else needed.push(p);
    }
    if (needed.length === 0) return out;

    const concurrency = 6;
    for (let i = 0; i < needed.length; i += concurrency) {
      const batch = needed.slice(i, i + concurrency);
      const settled = await Promise.all(batch.map((p) => this.getOne(p)));
      for (const q of settled) if (q) out.push(q);
    }
    return out;
  }

  private async getOne(pair: FxPair): Promise<FxQuote | null> {
    const symbol = `${pair.from}${pair.to}=X`;
    for (const host of HOSTS) {
      try {
        const url = `${host}/v8/finance/chart/${encodeURIComponent(
          symbol
        )}?range=1d&interval=1d`;
        const json = await fetchJson<{
          chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> };
        }>(url);
        const rate = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
          return { from: pair.from, to: pair.to, rate };
        }
      } catch {
        // try next host
      }
    }
    return null;
  }
}
