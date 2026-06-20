import { fetchJson } from "@/lib/http";
import type { MarketDataProvider, Quote, SymbolSearchResult } from "./types";

/**
 * Yahoo Finance provider using the **crumb-free** public endpoints:
 *   - Quotes:  query1.finance.yahoo.com/v8/finance/chart/{symbol}
 *   - Search:  query2.finance.yahoo.com/v1/finance/search
 *
 * Why not the `quote` endpoint / yahoo-finance2? Yahoo now requires a
 * crumb+cookie handshake for `v7/finance/quote`, which constantly breaks
 * (rate limits, EU consent redirects). The `chart` endpoint needs no crumb and
 * returns everything we need in its `meta` block, so it is far more reliable.
 *
 * All calls are defensive: a failure for one symbol never throws out of here.
 */
const CHART_HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];
const SEARCH_HOST = "https://query2.finance.yahoo.com";

interface ChartMeta {
  currency?: string;
  symbol?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  fullExchangeName?: string;
  exchangeName?: string;
  shortName?: string;
  longName?: string;
}

export class YahooMarketDataProvider implements MarketDataProvider {
  readonly name = "yahoo";

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const unique = Array.from(
      new Set(symbols.map((s) => s.trim()).filter(Boolean))
    );
    if (unique.length === 0) return [];

    const results: Quote[] = [];
    // Limited concurrency so we don't hammer Yahoo.
    const concurrency = 6;
    for (let i = 0; i < unique.length; i += concurrency) {
      const batch = unique.slice(i, i + concurrency);
      const settled = await Promise.all(
        batch.map((sym) => this.getOneQuote(sym))
      );
      for (const q of settled) if (q) results.push(q);
    }
    return results;
  }

  private async getOneQuote(symbol: string): Promise<Quote | null> {
    for (const host of CHART_HOSTS) {
      try {
        const url = `${host}/v8/finance/chart/${encodeURIComponent(
          symbol
        )}?range=1d&interval=1d`;
        const json = await fetchJson<{
          chart?: { result?: Array<{ meta?: ChartMeta }>; error?: unknown };
        }>(url);
        const meta = json?.chart?.result?.[0]?.meta;
        if (!meta || typeof meta.regularMarketPrice !== "number") continue;
        const price = meta.regularMarketPrice;
        const prev = meta.chartPreviousClose ?? meta.previousClose;
        const change = typeof prev === "number" ? price - prev : undefined;
        const changePercent =
          typeof prev === "number" && prev !== 0
            ? ((price - prev) / prev) * 100
            : undefined;
        return {
          yahooSymbol: meta.symbol ?? symbol,
          currency: meta.currency,
          price,
          previousClose: typeof prev === "number" ? prev : undefined,
          change,
          changePercent,
          shortName: meta.shortName ?? meta.longName,
          exchange: meta.fullExchangeName ?? meta.exchangeName,
        };
      } catch {
        // try next host
      }
    }
    return null;
  }

  async search(query: string): Promise<SymbolSearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    try {
      const url = `${SEARCH_HOST}/v1/finance/search?q=${encodeURIComponent(
        q
      )}&quotesCount=12&newsCount=0&listsCount=0`;
      const json = await fetchJson<{
        quotes?: Array<Record<string, unknown>>;
      }>(url);
      const quotes = json?.quotes ?? [];
      return quotes
        .filter((it) => typeof it.symbol === "string" && it.quoteType !== "OPTION")
        .map((it) => ({
          symbol: String(it.symbol),
          name:
            (it.shortname as string) ||
            (it.longname as string) ||
            (it.shortName as string) ||
            undefined,
          exchange: (it.exchDisp as string) || (it.exchange as string) || undefined,
          region: (it.exchDisp as string) || undefined,
          type: (it.quoteType as string) || (it.typeDisp as string) || undefined,
        }));
    } catch {
      return [];
    }
  }
}
