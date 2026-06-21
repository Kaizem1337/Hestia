import { prisma } from "@/lib/prisma";
import { getQuotesWithRefresh } from "@/lib/market-data";

export interface EnrichedWatchlistItem {
  id: string;
  symbol: string;
  yahooSymbol: string;
  name: string | null;
  exchange: string | null;
  currency: string | null;
  notes: string | null;
  weight: number | null;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  priceAsOf: string | null;
  stale: boolean;
}

export interface EnrichedWatchlist {
  id: string;
  name: string;
  isDefault: boolean;
  order: number;
  items: EnrichedWatchlistItem[];
}

/** Ensures the user has at least one (default) watchlist and returns it. */
export async function ensureDefaultWatchlist(userId: string) {
  const existing = await prisma.watchlist.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.watchlist.create({
    data: { userId, name: "My Watchlist", isDefault: true },
  });
}

export async function getWatchlists(
  userId: string,
  opts: { force?: boolean } = {}
): Promise<EnrichedWatchlist[]> {
  await ensureDefaultWatchlist(userId);
  const watchlists = await prisma.watchlist.findMany({
    where: { userId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  const symbols = watchlists.flatMap((w) => w.items.map((i) => i.yahooSymbol));
  const quotes = await getQuotesWithRefresh(symbols, { force: opts.force });

  return watchlists.map((w) => ({
    id: w.id,
    name: w.name,
    isDefault: w.isDefault,
    order: w.order,
    items: w.items.map((i) => {
      const q = quotes.get(i.yahooSymbol);
      return {
        id: i.id,
        symbol: i.symbol,
        yahooSymbol: i.yahooSymbol,
        name: i.name ?? q?.shortName ?? null,
        exchange: i.exchange ?? q?.exchange ?? null,
        currency: i.currency ?? q?.currency ?? null,
        notes: i.notes,
        weight: i.weight ?? null,
        price: q?.price ?? null,
        change: q?.change ?? null,
        changePercent: q?.changePercent ?? null,
        priceAsOf: q?.asOf ? q.asOf.toISOString() : null,
        stale: q?.stale ?? true,
      };
    }),
  }));
}
