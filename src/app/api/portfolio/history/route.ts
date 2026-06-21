import { getUserId, ensureUserSettings } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getPriceHistory } from "@/lib/market-data/history";
import { getRatesToBase } from "@/lib/fx";
import { SUPPORTED_CURRENCY_CODES } from "@/lib/currency";
import { ok, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Performance series for the chart. Reconstructs the value of the user's
 * *current* holdings over the requested range using historical prices
 * (mark-to-market) converted at current FX, so the chart always shows real
 * movement — even on 1D and even if the app hasn't been open to record history.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "1M";
  const scope = url.searchParams.get("scope") ?? "ALL";

  const settings = await ensureUserSettings(userId);
  // Optional target currency (used when the dashboard is filtered to an account
  // with its own display currency); falls back to the user's base currency.
  const currencyParam = url.searchParams.get("currency");
  const base =
    currencyParam && SUPPORTED_CURRENCY_CODES.includes(currencyParam as never)
      ? currencyParam
      : settings.baseCurrency;

  // scope is "ALL", a source (MANUAL/TRADING212/IBKR), or an account key.
  const where =
    scope === "ALL"
      ? { userId }
      : scope === "MANUAL" ||
          scope === "TRADING212" ||
          scope === "IBKR"
        ? { userId, source: scope }
        : { userId, accountKey: scope };

  const holdings = await prisma.holding.findMany({
    where,
    select: {
      yahooSymbol: true,
      quantity: true,
      currency: true,
      purchaseDate: true,
    },
  });
  if (holdings.length === 0) {
    return ok({ points: [], baseCurrency: base });
  }

  // Purchase dates gate each holding's contribution: before a position was
  // opened it contributes 0, so the line starts at the first purchase and
  // flatlines at 0 across any earlier stretch where nothing was held yet.
  const purchaseMs = holdings.map((h) =>
    h.purchaseDate ? h.purchaseDate.getTime() : null
  );

  const fx = await getRatesToBase(
    Array.from(new Set(holdings.map((h) => h.currency))),
    base
  );

  // Fetch each holding's historical price series.
  const series = await Promise.all(
    holdings.map((h) => getPriceHistory(h.yahooSymbol, range))
  );

  // Use the richest series as the time grid.
  let gridIdx = 0;
  let max = 0;
  series.forEach((s, i) => {
    if (s.length > max) {
      max = s.length;
      gridIdx = i;
    }
  });
  if (max === 0) {
    // No price history at all for any holding — still draw a line, flat at 0,
    // spanning the requested window so the chart never renders empty.
    const spanMs: Record<string, number> = {
      "1D": 24 * 3600_000,
      "1W": 7 * 24 * 3600_000,
      "1M": 30 * 24 * 3600_000,
      "3M": 90 * 24 * 3600_000,
      "6M": 182 * 24 * 3600_000,
      "1Y": 365 * 24 * 3600_000,
      "ALL": 365 * 24 * 3600_000,
    };
    const now = Date.now();
    const start = now - (spanMs[range] ?? spanMs["1M"]);
    return ok({
      points: [
        { t: new Date(start).toISOString(), value: 0 },
        { t: new Date(now).toISOString(), value: 0 },
      ],
      baseCurrency: base,
    });
  }
  const grid = series[gridIdx].map((p) => p.t);

  // Forward-fill each holding onto the grid and sum to a portfolio value.
  const pointers = new Array(holdings.length).fill(0);
  const lastClose = new Array(holdings.length).fill(null as number | null);
  const raw = grid.map((t) => {
    let value = 0;
    for (let i = 0; i < holdings.length; i++) {
      const s = series[i];
      if (s.length === 0) continue;
      while (pointers[i] < s.length && s[pointers[i]].t <= t) {
        lastClose[i] = s[pointers[i]].close;
        pointers[i] += 1;
      }
      // Don't credit a holding before it was purchased — it contributes 0.
      const pd = purchaseMs[i];
      if (pd !== null && t < pd) continue;
      const close = lastClose[i] ?? s[0].close;
      const rate = fx.get(holdings[i].currency)?.rate ?? 1;
      value += close * holdings[i].quantity * rate;
    }
    return { t: new Date(t).toISOString(), value };
  });

  // Downsample to keep the payload/chart light.
  let points = raw;
  if (points.length > 200) {
    const step = Math.ceil(points.length / 200);
    points = points.filter((_, i) => i % step === 0 || i === points.length - 1);
  }

  return ok({ points, baseCurrency: base });
});
