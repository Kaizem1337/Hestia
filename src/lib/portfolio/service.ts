import { prisma } from "@/lib/prisma";
import { getQuotesWithRefresh, type CachedQuote } from "@/lib/market-data";
import { getRatesToBase } from "@/lib/fx";
import { ensureUserSettings } from "@/lib/auth-helpers";
import type { HoldingSource } from "@/lib/enums";

export interface EnrichedHolding {
  id: string;
  symbol: string;
  yahooSymbol: string;
  name: string | null;
  exchange: string | null;
  isin: string | null;
  source: HoldingSource;
  accountName: string | null;
  accountKey: string;
  accountLabel: string;
  purchaseDate: string | null;
  logoUrl: string | null;
  quantity: number;
  avgCost: number;
  nativeCurrency: string;
  // Native currency figures
  currentPrice: number | null;
  nativeMarketValue: number | null;
  nativeCostBasis: number;
  nativeGainLoss: number | null;
  dayChangePerShare: number | null;
  dayChangePercent: number | null;
  nativeDayChange: number | null;
  // Base currency figures
  baseCurrency: string;
  fxRate: number;
  baseMarketValue: number | null;
  baseCostBasis: number;
  baseGainLoss: number | null;
  baseGainLossPercent: number | null;
  baseDayChange: number | null;
  allocationPercent: number | null;
  priceAsOf: string | null;
  stale: boolean;
}

export interface PortfolioTotals {
  baseCurrency: string;
  marketValue: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdingsCount: number;
}

export interface PortfolioResult {
  baseCurrency: string;
  holdings: EnrichedHolding[];
  totals: PortfolioTotals;
  pricesAsOf: string | null;
  fxAsOf: string | null;
  hasMissingFx: boolean;
}

/**
 * Some venues quote in minor units (e.g. London in pence => currency "GBp").
 * Normalise these to the major unit so FX conversion is correct.
 */
function normalizePrice(
  price: number | null,
  currency: string | null
): { price: number | null; currency: string | null } {
  if (price === null || !currency) return { price, currency };
  const minor: Record<string, string> = { GBp: "GBP", ZAc: "ZAR", ILA: "ILS" };
  if (minor[currency]) {
    return { price: price / 100, currency: minor[currency] };
  }
  return { price, currency };
}

/** Resolves a holding's account filter key + display label (nickname aware). */
function resolveAccount(
  source: string,
  accountKey: string,
  nick: string | null | undefined
): { accountKey: string; accountLabel: string } {
  if (source === "MANUAL") return { accountKey: "MANUAL", accountLabel: "Manual" };
  const ak = accountKey || "";
  const key = ak || source;
  let label: string;
  if (nick) label = nick;
  else if (ak) label = source === "IBKR" ? `IBKR · ${ak}` : ak;
  else label = source === "TRADING212" ? "Trading 212" : source;
  return { accountKey: key, accountLabel: label };
}

export async function getPortfolio(
  userId: string,
  opts: { force?: boolean } = {}
): Promise<PortfolioResult> {
  const settings = await ensureUserSettings(userId);
  const baseCurrency = settings.baseCurrency;

  const holdings = await prisma.holding.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  if (holdings.length === 0) {
    return {
      baseCurrency,
      holdings: [],
      totals: emptyTotals(baseCurrency),
      pricesAsOf: null,
      fxAsOf: null,
      hasMissingFx: false,
    };
  }

  const accountRows = await prisma.account.findMany({ where: { userId } });
  const nickMap = new Map(
    accountRows.map((a) => [`${a.source}::${a.accountKey}`, a.nickname])
  );

  const symbols = holdings.map((h) => h.yahooSymbol);
  const quotes = await getQuotesWithRefresh(symbols, { force: opts.force });

  // Determine the native currency for each holding (prefer live quote currency).
  const currencies = new Set<string>();
  for (const h of holdings) {
    const q = quotes.get(h.yahooSymbol);
    const norm = normalizePrice(q?.price ?? null, q?.currency ?? null);
    currencies.add(norm.currency ?? h.currency);
    currencies.add(h.currency);
  }

  const fxMap = await getRatesToBase(Array.from(currencies), baseCurrency);
  let hasMissingFx = false;
  let fxAsOf: Date | null = null;

  // First pass: compute base market values to derive allocation %.
  type Interim = {
    h: (typeof holdings)[number];
    q: CachedQuote | undefined;
    priceCurrency: string;
    price: number | null;
    nativeMarketValue: number | null;
    baseMarketValue: number | null;
    fxRate: number;
  };
  const interim: Interim[] = holdings.map((h) => {
    const q = quotes.get(h.yahooSymbol);
    const norm = normalizePrice(q?.price ?? null, q?.currency ?? null);
    const priceCurrency = norm.currency ?? h.currency;
    const price = norm.price;
    const fx = fxMap.get(priceCurrency);
    if (fx?.missing) hasMissingFx = true;
    if (fx && (!fxAsOf || fx.asOf > fxAsOf)) fxAsOf = fx.asOf;
    const fxRate = fx?.rate ?? 1;
    const nativeMarketValue = price !== null ? price * h.quantity : null;
    const baseMarketValue =
      nativeMarketValue !== null ? nativeMarketValue * fxRate : null;
    return { h, q, priceCurrency, price, nativeMarketValue, baseMarketValue, fxRate };
  });

  const totalBaseMarketValue = interim.reduce(
    (sum, i) => sum + (i.baseMarketValue ?? 0),
    0
  );

  let pricesAsOf: Date | null = null;
  const enriched: EnrichedHolding[] = interim.map((i) => {
    const { h, q, price, priceCurrency, nativeMarketValue, baseMarketValue, fxRate } =
      i;
    if (q?.asOf && (!pricesAsOf || q.asOf > pricesAsOf)) pricesAsOf = q.asOf;

    const acc = resolveAccount(
      h.source,
      h.accountKey,
      nickMap.get(`${h.source}::${h.accountKey || ""}`)
    );

    const nativeCostBasis = h.quantity * h.avgCost;
    const nativeGainLoss =
      nativeMarketValue !== null ? nativeMarketValue - nativeCostBasis : null;

    // Day change: quote.change is per-share in the price currency.
    const dayChangePerShare = q?.change ?? null;
    const nativeDayChange =
      dayChangePerShare !== null ? dayChangePerShare * h.quantity : null;

    // Cost basis is in the holding's native currency.
    const costFx = fxMap.get(h.currency)?.rate ?? fxRate;
    const baseCostBasis = nativeCostBasis * costFx;
    const baseMarketVal = baseMarketValue;
    const baseGainLoss =
      baseMarketVal !== null ? baseMarketVal - baseCostBasis : null;
    const baseGainLossPercent =
      baseGainLoss !== null && baseCostBasis > 0
        ? (baseGainLoss / baseCostBasis) * 100
        : null;
    const baseDayChange =
      nativeDayChange !== null ? nativeDayChange * fxRate : null;

    const allocationPercent =
      baseMarketVal !== null && totalBaseMarketValue > 0
        ? (baseMarketVal / totalBaseMarketValue) * 100
        : null;

    return {
      id: h.id,
      symbol: h.symbol,
      yahooSymbol: h.yahooSymbol,
      name: h.name ?? q?.shortName ?? null,
      exchange: h.exchange ?? q?.exchange ?? null,
      isin: h.isin,
      source: h.source as HoldingSource,
      accountName: h.accountName,
      accountKey: acc.accountKey,
      accountLabel: acc.accountLabel,
      purchaseDate: h.purchaseDate ? h.purchaseDate.toISOString() : null,
      logoUrl: h.logoUrl ?? null,
      quantity: h.quantity,
      avgCost: h.avgCost,
      nativeCurrency: priceCurrency,
      currentPrice: price,
      nativeMarketValue,
      nativeCostBasis,
      nativeGainLoss,
      dayChangePerShare,
      dayChangePercent: q?.changePercent ?? null,
      nativeDayChange,
      baseCurrency,
      fxRate,
      baseMarketValue: baseMarketVal,
      baseCostBasis,
      baseGainLoss,
      baseGainLossPercent,
      baseDayChange,
      allocationPercent,
      priceAsOf: q?.asOf ? q.asOf.toISOString() : null,
      stale: q?.stale ?? true,
    };
  });

  const totals = computeTotals(enriched, baseCurrency);

  // Record intraday snapshots (best-effort) to power the performance chart.
  // A new point is added on first load, at most ~every 90s in steady state, or
  // promptly when the total value moves (e.g. after adding/importing holdings),
  // so short ranges like 1D show real movement and spikes.
  if (totals.marketValue > 0) {
    try {
      const last = await prisma.portfolioSnapshot.findFirst({
        where: { userId },
        orderBy: { capturedAt: "desc" },
      });
      const elapsed = last ? Date.now() - last.capturedAt.getTime() : Infinity;
      const moved =
        !last ||
        last.totalValue <= 0 ||
        Math.abs(totals.marketValue - last.totalValue) / last.totalValue >
          0.0005;
      if (!last || elapsed > 90_000 || (moved && elapsed > 5_000)) {
        await prisma.portfolioSnapshot.create({
          data: {
            userId,
            baseCurrency,
            totalValue: totals.marketValue,
            costBasis: totals.costBasis,
          },
        });
      }
    } catch {
      /* snapshot failure must never break the dashboard */
    }
  }

  return {
    baseCurrency,
    holdings: enriched,
    totals,
    pricesAsOf: pricesAsOf ? (pricesAsOf as Date).toISOString() : null,
    fxAsOf: fxAsOf ? (fxAsOf as Date).toISOString() : null,
    hasMissingFx,
  };
}

function computeTotals(
  holdings: EnrichedHolding[],
  baseCurrency: string
): PortfolioTotals {
  let marketValue = 0;
  let costBasis = 0;
  let dayChange = 0;
  for (const h of holdings) {
    marketValue += h.baseMarketValue ?? 0;
    costBasis += h.baseCostBasis ?? 0;
    dayChange += h.baseDayChange ?? 0;
  }
  const gainLoss = marketValue - costBasis;
  const previousValue = marketValue - dayChange;
  return {
    baseCurrency,
    marketValue,
    costBasis,
    gainLoss,
    gainLossPercent: costBasis > 0 ? (gainLoss / costBasis) * 100 : 0,
    dayChange,
    dayChangePercent: previousValue > 0 ? (dayChange / previousValue) * 100 : 0,
    holdingsCount: holdings.length,
  };
}

function emptyTotals(baseCurrency: string): PortfolioTotals {
  return {
    baseCurrency,
    marketValue: 0,
    costBasis: 0,
    gainLoss: 0,
    gainLossPercent: 0,
    dayChange: 0,
    dayChangePercent: 0,
    holdingsCount: 0,
  };
}
