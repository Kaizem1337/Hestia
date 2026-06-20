import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { refreshQuotes } from "@/lib/market-data";
import { ok, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Manually refresh quotes for all of the current user's symbols. */
export const POST = withErrorHandling(async () => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const [holdings, items] = await Promise.all([
    prisma.holding.findMany({
      where: { userId },
      select: { yahooSymbol: true },
    }),
    prisma.watchlistItem.findMany({
      where: { watchlist: { userId } },
      select: { yahooSymbol: true },
    }),
  ]);

  const symbols = Array.from(
    new Set([
      ...holdings.map((h) => h.yahooSymbol),
      ...items.map((i) => i.yahooSymbol),
    ])
  );

  const quotes = await refreshQuotes(symbols);
  return ok({ refreshed: quotes.length, requested: symbols.length });
});
