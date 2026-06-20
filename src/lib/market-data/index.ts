import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { YahooMarketDataProvider } from "./yahoo";
import { StooqMarketDataProvider } from "./stooq";
import type { MarketDataProvider, Quote, SymbolSearchResult } from "./types";

export type { Quote, SymbolSearchResult } from "./types";

/**
 * Composite provider: Yahoo (primary) with Stooq as a price fallback for any
 * symbol Yahoo could not resolve. Search uses Yahoo only (Stooq has none).
 */
class CompositeMarketDataProvider implements MarketDataProvider {
  readonly name = "composite";
  private yahoo = new YahooMarketDataProvider();
  private stooq = new StooqMarketDataProvider();

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const yq = await this.yahoo.getQuotes(symbols);
    const resolved = new Map<string, Quote>();
    for (const q of yq) if (q.price != null) resolved.set(q.yahooSymbol, q);

    const missing = symbols.filter((s) => !resolved.has(s));
    if (missing.length > 0) {
      try {
        const sq = await this.stooq.getQuotes(missing);
        for (const q of sq) if (q.price != null && !resolved.has(q.yahooSymbol)) {
          resolved.set(q.yahooSymbol, q);
        }
      } catch {
        /* fallback failure is non-fatal */
      }
    }
    return Array.from(resolved.values());
  }

  search(query: string): Promise<SymbolSearchResult[]> {
    return this.yahoo.search(query);
  }
}

let provider: MarketDataProvider | null = null;
export function getMarketDataProvider(): MarketDataProvider {
  if (!provider) provider = new CompositeMarketDataProvider();
  return provider;
}

export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  return getMarketDataProvider().search(query);
}

/**
 * Refresh quotes for the given Yahoo symbols and upsert them into the
 * PriceQuote cache. Symbols that resolve are marked fresh; symbols the provider
 * could not return are marked `stale` (but their last-known price is kept).
 */
export async function refreshQuotes(symbols: string[]): Promise<Quote[]> {
  const unique = Array.from(new Set(symbols.filter(Boolean)));
  if (unique.length === 0) return [];

  const quotes = await getMarketDataProvider().getQuotes(unique);
  const returned = new Set(quotes.map((q) => q.yahooSymbol));

  await Promise.all(
    quotes.map((q) =>
      prisma.priceQuote.upsert({
        where: { yahooSymbol: q.yahooSymbol },
        create: {
          yahooSymbol: q.yahooSymbol,
          currency: q.currency,
          price: q.price,
          previousClose: q.previousClose,
          change: q.change,
          changePercent: q.changePercent,
          marketState: q.marketState,
          shortName: q.shortName,
          exchange: q.exchange,
          stale: false,
        },
        update: {
          currency: q.currency,
          price: q.price,
          previousClose: q.previousClose,
          change: q.change,
          changePercent: q.changePercent,
          marketState: q.marketState,
          shortName: q.shortName ?? undefined,
          exchange: q.exchange ?? undefined,
          asOf: new Date(),
          stale: false,
        },
      })
    )
  );

  // Mark symbols the provider could not resolve as stale (keep last price).
  const missing = unique.filter((s) => !returned.has(s));
  if (missing.length > 0) {
    await prisma.priceQuote.updateMany({
      where: { yahooSymbol: { in: missing } },
      data: { stale: true },
    });
  }

  return quotes;
}

/** Reads cached quotes for symbols from the PriceQuote table (no network). */
export async function getCachedQuotes(symbols: string[]) {
  const unique = Array.from(new Set(symbols.filter(Boolean)));
  if (unique.length === 0) return new Map<string, CachedQuote>();
  const rows = await prisma.priceQuote.findMany({
    where: { yahooSymbol: { in: unique } },
  });
  const map = new Map<string, CachedQuote>();
  for (const r of rows) map.set(r.yahooSymbol, r);
  return map;
}

export type CachedQuote = {
  yahooSymbol: string;
  currency: string | null;
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  marketState: string | null;
  shortName: string | null;
  exchange: string | null;
  asOf: Date;
  stale: boolean;
};

/**
 * Returns cached quotes, refreshing from the provider first only if the cache
 * is older than the configured minimum refresh window (rate-limit guard) or
 * `force` is set.
 */
export async function getQuotesWithRefresh(
  symbols: string[],
  opts: { force?: boolean } = {}
): Promise<Map<string, CachedQuote>> {
  const unique = Array.from(new Set(symbols.filter(Boolean)));
  if (unique.length === 0) return new Map();

  const minSeconds = getEnv().PRICE_MIN_REFRESH_SECONDS;
  const cached = await getCachedQuotes(unique);

  const now = Date.now();
  const needsRefresh =
    opts.force ||
    unique.some((s) => {
      const c = cached.get(s);
      if (!c || c.price === null) return true;
      return (now - c.asOf.getTime()) / 1000 > minSeconds;
    });

  if (needsRefresh) {
    await refreshQuotes(unique);
    return getCachedQuotes(unique);
  }
  return cached;
}
