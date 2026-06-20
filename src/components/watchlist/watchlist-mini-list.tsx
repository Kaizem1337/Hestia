"use client";

import { Skeleton } from "@/components/ui/feedback";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { toneClass } from "@/components/ui/value";
import type { EnrichedWatchlist } from "@/lib/view-types";

export function WatchlistMiniList({
  watchlists,
  loading,
}: {
  watchlists: EnrichedWatchlist[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  const items = watchlists.flatMap((w) => w.items);
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Your watchlist is empty. Add symbols on the Watchlist tab.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.slice(0, 6).map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between py-2.5 text-sm"
        >
          <div className="min-w-0">
            <span className="font-semibold">{item.symbol}</span>
            <p className="truncate text-xs text-muted-foreground">
              {item.name || item.yahooSymbol}
            </p>
          </div>
          <div className="text-right">
            <div className="tabular">
              {formatCurrency(item.price, item.currency || "USD")}
            </div>
            <div className={`text-xs tabular ${toneClass(item.changePercent)}`}>
              {formatPercent(item.changePercent, { signed: true })}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
