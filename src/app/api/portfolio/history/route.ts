import { getUserId, ensureUserSettings } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getPriceHistory } from "@/lib/market-data/history";
import { getRatesToBase } from "@/lib/fx";
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
  const range = new URL(req.url).searchParams.get("range") ?? "1M";

  const settings = await ensureUserSettings(userId);
  const base = settings.baseCurrency;

  const holdings = await prisma.holding.findMany({
    where: { userId },
    select: { yahooSymbol: true, quantity: true, currency: true },
  });
  if (holdings.length === 0) {
    return ok({ points: [], baseCurrency: base });
  }

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
    return ok({ points: [], baseCurrency: base });
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
