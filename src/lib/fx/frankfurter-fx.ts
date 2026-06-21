import { fetchJson } from "@/lib/http";
import type { FxPair, FxProvider, FxQuote } from "./types";

/**
 * Frankfurter (frankfurter.app) — free, no API key, ECB reference rates.
 *
 * Daily granularity but very reliable, used as a fallback for major currencies
 * when Yahoo's intraday FX is unavailable. It doesn't cover every currency
 * (e.g. no TWD), so unsupported pairs simply fall through to the next provider.
 */
const HOST = "https://api.frankfurter.app";

export class FrankfurterFxProvider implements FxProvider {
  readonly name = "frankfurter-fx";

  async getRates(pairs: FxPair[]): Promise<FxQuote[]> {
    // One request per source currency: ?from=USD&to=GBP,EUR,...
    const byFrom = new Map<string, Set<string>>();
    for (const p of pairs) {
      if (p.from === p.to) continue;
      const set = byFrom.get(p.from) ?? new Set<string>();
      set.add(p.to);
      byFrom.set(p.from, set);
    }

    const out: FxQuote[] = [];
    await Promise.all(
      Array.from(byFrom.entries()).map(async ([from, tos]) => {
        try {
          const url = `${HOST}/latest?from=${encodeURIComponent(
            from
          )}&to=${Array.from(tos).map(encodeURIComponent).join(",")}`;
          const json = await fetchJson<{ rates?: Record<string, number> }>(url, {
            timeoutMs: 6000,
          });
          const rates = json?.rates ?? {};
          for (const to of tos) {
            const rate = rates[to];
            if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
              out.push({ from, to, rate });
            }
          }
        } catch {
          /* skip this source currency */
        }
      })
    );
    return out;
  }
}
