import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { refreshQuotes } from "@/lib/market-data";
import { getRatesToBase } from "@/lib/fx";
import { fail, ok, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Background price + FX refresh endpoint, intended to be called by an external
 * scheduler (system cron, GitHub Actions, Vercel Cron, etc.).
 *
 * Auth: requires `Authorization: Bearer <CRON_SECRET>` (or `?secret=`). This is
 * deliberately NOT a user-session route so it can run unattended.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const env = getEnv();
  if (!env.CRON_SECRET) {
    return fail("CRON_SECRET is not configured on the server", 500);
  }
  const auth = req.headers.get("authorization") ?? "";
  const url = new URL(req.url);
  const provided =
    auth.replace(/^Bearer\s+/i, "") || url.searchParams.get("secret") || "";
  if (provided !== env.CRON_SECRET) {
    return fail("Unauthorized", 401);
  }

  // Distinct symbols across all users' holdings and watchlists.
  const [holdings, items] = await Promise.all([
    prisma.holding.findMany({ select: { yahooSymbol: true } }),
    prisma.watchlistItem.findMany({ select: { yahooSymbol: true } }),
  ]);
  const symbols = Array.from(
    new Set([
      ...holdings.map((h) => h.yahooSymbol),
      ...items.map((i) => i.yahooSymbol),
    ])
  );

  const quotes = symbols.length ? await refreshQuotes(symbols) : [];

  // Refresh FX rates into every base currency users actually use.
  const settings = await prisma.userSettings.findMany({
    select: { baseCurrency: true },
  });
  const bases = Array.from(new Set(settings.map((s) => s.baseCurrency)));
  const currencies = Array.from(
    new Set(quotes.map((q) => q.currency).filter(Boolean) as string[])
  );
  for (const base of bases) {
    if (currencies.length) await getRatesToBase(currencies, base);
  }

  return ok({
    refreshedSymbols: quotes.length,
    requestedSymbols: symbols.length,
    fxBases: bases.length,
  });
});
