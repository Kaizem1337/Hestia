import { prisma } from "@/lib/prisma";
import { YahooFxProvider } from "./yahoo-fx";
import { StooqFxProvider } from "./stooq-fx";
import type { FxPair, FxProvider, FxQuote } from "./types";

export type { FxPair, FxQuote } from "./types";
export { convert } from "./convert";

/** Yahoo FX primary, Stooq fallback for any pair Yahoo could not resolve. */
class CompositeFxProvider implements FxProvider {
  readonly name = "composite-fx";
  private yahoo = new YahooFxProvider();
  private stooq = new StooqFxProvider();

  async getRates(pairs: FxPair[]): Promise<FxQuote[]> {
    const yq = await this.yahoo.getRates(pairs);
    const have = new Set(yq.map((q) => `${q.from}${q.to}`));
    const missing = pairs.filter((p) => !have.has(`${p.from}${p.to}`));
    let sq: FxQuote[] = [];
    if (missing.length > 0) {
      try {
        sq = await this.stooq.getRates(missing);
      } catch {
        /* non-fatal */
      }
    }
    return [...yq, ...sq];
  }
}

let provider: FxProvider | null = null;
export function getFxProvider(): FxProvider {
  if (!provider) provider = new CompositeFxProvider();
  return provider;
}

// FX rates are cached for this long before a re-fetch is attempted.
const FX_TTL_SECONDS = 60 * 30; // 30 minutes

export interface FxConversion {
  rate: number;
  asOf: Date;
  /** True when no live/cached rate was found and a fallback of 1 was used. */
  missing: boolean;
}

/**
 * Returns a from->to conversion rate, using a cached FxRate when fresh enough,
 * otherwise refreshing from the provider. Falls back gracefully to a stale
 * cached rate, then to 1.0 (flagged `missing`) if nothing is available.
 */
export async function getRate(from: string, to: string): Promise<FxConversion> {
  if (from === to) return { rate: 1, asOf: new Date(), missing: false };

  const cached = await prisma.fxRate.findUnique({
    where: { base_quote: { base: from, quote: to } },
  });
  const fresh =
    cached && (Date.now() - cached.asOf.getTime()) / 1000 < FX_TTL_SECONDS;
  if (cached && fresh) {
    return { rate: cached.rate, asOf: cached.asOf, missing: false };
  }

  const [quote] = await getFxProvider().getRates([{ from, to }]);
  if (quote) {
    const saved = await prisma.fxRate.upsert({
      where: { base_quote: { base: from, quote: to } },
      create: { base: from, quote: to, rate: quote.rate },
      update: { rate: quote.rate, asOf: new Date() },
    });
    return { rate: saved.rate, asOf: saved.asOf, missing: false };
  }

  // Provider failed: use a stale cached rate if we have one.
  if (cached) return { rate: cached.rate, asOf: cached.asOf, missing: false };
  return { rate: 1, asOf: new Date(), missing: true };
}

/**
 * Batch-refresh FX rates for all distinct currencies into the given base.
 * Returns a map of `currency -> FxConversion` (always includes base->base = 1).
 */
export async function getRatesToBase(
  currencies: string[],
  base: string
): Promise<Map<string, FxConversion>> {
  const distinct = Array.from(new Set(currencies.filter(Boolean)));
  const map = new Map<string, FxConversion>();
  map.set(base, { rate: 1, asOf: new Date(), missing: false });

  const toFetch = distinct.filter((c) => c !== base);
  if (toFetch.length === 0) return map;

  // Load cached rows first.
  const cachedRows = await prisma.fxRate.findMany({
    where: { quote: base, base: { in: toFetch } },
  });
  const cachedMap = new Map(cachedRows.map((r) => [r.base, r]));

  const stalePairs: FxPair[] = [];
  for (const cur of toFetch) {
    const cached = cachedMap.get(cur);
    const fresh =
      cached && (Date.now() - cached.asOf.getTime()) / 1000 < FX_TTL_SECONDS;
    if (cached && fresh) {
      map.set(cur, { rate: cached.rate, asOf: cached.asOf, missing: false });
    } else {
      stalePairs.push({ from: cur, to: base });
    }
  }

  if (stalePairs.length > 0) {
    const quotes = await getFxProvider().getRates(stalePairs);
    const quoteMap = new Map(quotes.map((q) => [q.from, q.rate]));
    for (const pair of stalePairs) {
      const rate = quoteMap.get(pair.from);
      if (rate) {
        const saved = await prisma.fxRate.upsert({
          where: { base_quote: { base: pair.from, quote: base } },
          create: { base: pair.from, quote: base, rate },
          update: { rate, asOf: new Date() },
        });
        map.set(pair.from, { rate: saved.rate, asOf: saved.asOf, missing: false });
      } else {
        const cached = cachedMap.get(pair.from);
        if (cached) {
          map.set(pair.from, {
            rate: cached.rate,
            asOf: cached.asOf,
            missing: false,
          });
        } else {
          map.set(pair.from, { rate: 1, asOf: new Date(), missing: true });
        }
      }
    }
  }

  return map;
}

