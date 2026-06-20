import { fetchText } from "@/lib/http";
import type { MarketDataProvider, Quote, SymbolSearchResult } from "./types";

/**
 * Stooq provider — a free CSV price source used as a fallback when Yahoo is
 * unavailable. Stooq has no search API and does not return currency/previous
 * close in the lite endpoint, so it only supplies the latest price (the rest of
 * the app falls back to the holding's stored currency).
 *
 * Endpoint: https://stooq.com/q/l/?s=aapl.us,msft.us&f=sd2t2ohlcv&h&e=csv
 */
const SUFFIX_MAP: Record<string, string> = {
  HK: "hk",
  KS: "kr",
  KQ: "kr",
  T: "jp",
  TW: "tw",
  TWO: "tw",
  L: "uk",
  DE: "de",
  PA: "fr",
  AS: "nl",
  SW: "ch",
  TO: "ca",
  AX: "au",
  SI: "sg",
  SS: "cn",
  SZ: "cn",
};

/** Best-effort conversion of a Yahoo symbol to a Stooq symbol. */
export function yahooToStooq(yahooSymbol: string): string {
  const sym = yahooSymbol.trim();
  const dot = sym.lastIndexOf(".");
  if (dot === -1) return `${sym.toLowerCase()}.us`;
  const base = sym.slice(0, dot).toLowerCase();
  const suffix = sym.slice(dot + 1).toUpperCase();
  const mapped = SUFFIX_MAP[suffix];
  return mapped ? `${base}.${mapped}` : `${base}.${suffix.toLowerCase()}`;
}

export class StooqMarketDataProvider implements MarketDataProvider {
  readonly name = "stooq";

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const unique = Array.from(new Set(symbols.filter(Boolean)));
    if (unique.length === 0) return [];

    // stooqSymbol(lower) -> original yahoo symbol
    const byStooq = new Map<string, string>();
    for (const y of unique) byStooq.set(yahooToStooq(y).toLowerCase(), y);

    const results: Quote[] = [];
    const stooqSyms = Array.from(byStooq.keys());
    const chunkSize = 25;
    for (let i = 0; i < stooqSyms.length; i += chunkSize) {
      const chunk = stooqSyms.slice(i, i + chunkSize);
      try {
        const url = `https://stooq.com/q/l/?s=${chunk.join(
          ","
        )}&f=sd2t2ohlcv&h&e=csv`;
        const csv = await fetchText(url, { accept: "text/csv" });
        const lines = csv.trim().split(/\r?\n/);
        const header = lines.shift()?.toLowerCase() ?? "";
        const cols = header.split(",");
        const symIdx = cols.indexOf("symbol");
        const closeIdx = cols.indexOf("close");
        if (symIdx === -1 || closeIdx === -1) continue;
        for (const line of lines) {
          const parts = line.split(",");
          const stooqSym = parts[symIdx]?.toLowerCase();
          const closeRaw = parts[closeIdx];
          const close = Number(closeRaw);
          if (!stooqSym || !Number.isFinite(close)) continue;
          const yahooSymbol = byStooq.get(stooqSym);
          if (!yahooSymbol) continue;
          results.push({ yahooSymbol, price: close });
        }
      } catch {
        // skip chunk on failure
      }
    }
    return results;
  }

  // Stooq has no search endpoint.
  async search(): Promise<SymbolSearchResult[]> {
    return [];
  }
}
