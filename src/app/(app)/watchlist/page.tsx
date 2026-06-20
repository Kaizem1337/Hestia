"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, FileSpreadsheet, Eye, Trash2 } from "lucide-react";
import { useData, apiFetch } from "@/lib/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { SymbolSearch } from "@/components/symbol-search";
import { BasketImportDialog } from "@/components/watchlist/basket-import-dialog";
import { formatCurrency, formatPercent, timeAgo } from "@/lib/utils";
import { toneClass } from "@/components/ui/value";
import type { EnrichedWatchlist, SearchResult } from "@/lib/view-types";

export default function WatchlistPage() {
  const wl = useData<{ watchlists: EnrichedWatchlist[] }>("/api/watchlists");
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);

  const watchlist = wl.data?.watchlists?.[0];
  const items = watchlist?.items ?? [];

  async function addSymbol(r: SearchResult) {
    setAdding(true);
    try {
      await apiFetch("/api/watchlists/items", {
        method: "POST",
        body: JSON.stringify({
          symbol: r.symbol,
          yahooSymbol: r.yahooSymbol,
          name: r.name,
          exchange: r.exchange,
          currency: r.currency,
        }),
      });
      toast.success(`Added ${r.symbol}`);
      wl.refresh(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add symbol");
    } finally {
      setAdding(false);
    }
  }

  async function removeItem(id: string, symbol: string) {
    try {
      await apiFetch(`/api/watchlists/items/${id}`, { method: "DELETE" });
      toast.success(`Removed ${symbol}`);
      wl.refresh(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    }
  }

  async function refreshPrices() {
    setRefreshing(true);
    try {
      await apiFetch("/api/prices/refresh", { method: "POST" });
      await wl.refresh(true);
      toast.success("Prices refreshed");
    } catch {
      toast.error("Could not refresh prices");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Watchlist"
        description="Track symbols without adding them to your holdings."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshPrices}
              loading={refreshing}
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setImporting(true)}>
              <FileSpreadsheet className="h-4 w-4" /> Import basket.xlsx
            </Button>
          </>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add a symbol</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xl">
            <SymbolSearch onSelect={addSymbol} />
          </div>
          {adding && (
            <p className="mt-2 text-xs text-muted-foreground">Adding…</p>
          )}
        </CardContent>
      </Card>

      {wl.loading && <Skeleton className="h-72" />}
      {!wl.loading && wl.error && (
        <ErrorState message={wl.error} onRetry={() => wl.refresh()} />
      )}

      {!wl.loading && watchlist && items.length === 0 && (
        <EmptyState
          icon={<Eye className="h-6 w-6" />}
          title="Your watchlist is empty"
          description="Search for a symbol above, or import a basket.xlsx file."
          action={
            <Button size="sm" onClick={() => setImporting(true)}>
              <FileSpreadsheet className="h-4 w-4" /> Import basket.xlsx
            </Button>
          }
        />
      )}

      {!wl.loading && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Change</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 text-right font-medium">Updated</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-3 font-semibold">{item.symbol}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="block max-w-[220px] truncate">
                      {item.name || item.yahooSymbol}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular">
                    {formatCurrency(item.price, item.currency || "USD")}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular ${toneClass(
                      item.changePercent
                    )}`}
                  >
                    {formatPercent(item.changePercent, { signed: true })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="block max-w-[160px] truncate">
                      {item.notes || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {timeAgo(item.priceAsOf)}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <button
                      onClick={() => removeItem(item.id, item.symbol)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-[hsl(var(--negative))]"
                      aria-label={`Remove ${item.symbol}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BasketImportDialog
        open={importing}
        onClose={() => setImporting(false)}
        onImported={() => wl.refresh(true)}
      />
    </div>
  );
}
