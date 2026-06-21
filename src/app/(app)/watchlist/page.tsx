"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  RefreshCw,
  FileSpreadsheet,
  Eye,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  FolderPlus,
  Check,
  X,
} from "lucide-react";
import { useData, apiFetch } from "@/lib/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Skeleton, EmptyState, ErrorState, Badge } from "@/components/ui/feedback";
import { SymbolSearch } from "@/components/symbol-search";
import { BasketImportDialog } from "@/components/watchlist/basket-import-dialog";
import { WatchlistItemEditDialog } from "@/components/watchlist/watchlist-item-edit-dialog";
import { formatCurrency, formatPercent, timeAgo } from "@/lib/utils";
import { toneClass } from "@/components/ui/value";
import type {
  EnrichedWatchlist,
  EnrichedWatchlistItem,
  SearchResult,
} from "@/lib/view-types";

export default function WatchlistPage() {
  const wl = useData<{ watchlists: EnrichedWatchlist[] }>("/api/watchlists");
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [targetId, setTargetId] = useState<string>("");
  const [editItem, setEditItem] = useState<EnrichedWatchlistItem | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const sections = wl.data?.watchlists ?? [];
  const effectiveTarget =
    targetId && sections.some((s) => s.id === targetId)
      ? targetId
      : sections[0]?.id ?? "";

  async function addSymbol(r: SearchResult) {
    try {
      await apiFetch("/api/watchlists/items", {
        method: "POST",
        body: JSON.stringify({
          symbol: r.symbol,
          yahooSymbol: r.yahooSymbol,
          name: r.name,
          exchange: r.exchange,
          currency: r.currency,
          watchlistId: effectiveTarget || undefined,
        }),
      });
      toast.success(`Added ${r.symbol}`);
      wl.refresh(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add symbol");
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

  async function createSection() {
    const name = newName.trim();
    if (!name) return;
    try {
      await apiFetch("/api/watchlists", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      toast.success(`Created “${name}”`);
      setNewName("");
      setShowCreate(false);
      wl.refresh(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create");
    }
  }

  async function saveRename(id: string) {
    const name = renameValue.trim();
    if (!name) return setRenamingId(null);
    try {
      await apiFetch(`/api/watchlists/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setRenamingId(null);
      wl.refresh(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rename failed");
    }
  }

  async function moveSection(id: string, direction: "up" | "down") {
    try {
      await apiFetch(`/api/watchlists/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ direction }),
      });
      wl.refresh(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Move failed");
    }
  }

  async function deleteSection(id: string, name: string) {
    if (!confirm(`Delete the “${name}” section and all its symbols?`)) return;
    try {
      await apiFetch(`/api/watchlists/${id}`, { method: "DELETE" });
      toast.success("Section deleted");
      wl.refresh(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const totalItems = sections.reduce((s, w) => s + w.items.length, 0);

  return (
    <div>
      <PageHeader
        title="Watchlist"
        description="Organise symbols into sections without adding them to holdings."
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreate((v) => !v)}
            >
              <FolderPlus className="h-4 w-4" /> New section
            </Button>
            <Button size="sm" onClick={() => setImporting(true)}>
              <FileSpreadsheet className="h-4 w-4" /> Import basket.xlsx
            </Button>
          </>
        }
      />

      {/* Add a symbol */}
      <Card className="mb-6 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium">Add a symbol</label>
            <SymbolSearch onSelect={addSymbol} />
          </div>
          {sections.length > 1 && (
            <div className="sm:w-56">
              <label className="mb-1.5 block text-sm font-medium">
                To section
              </label>
              <Select
                value={effectiveTarget}
                onChange={(e) => setTargetId(e.target.value)}
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </Card>

      {showCreate && (
        <Card className="mb-6 p-5">
          <label className="mb-1.5 block text-sm font-medium">
            New section name
          </label>
          <div className="flex gap-2">
            <Input
              value={newName}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createSection()}
              placeholder="e.g. Watching closely"
            />
            <Button onClick={createSection}>Create</Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {wl.loading && <Skeleton className="h-72" />}
      {!wl.loading && wl.error && (
        <ErrorState message={wl.error} onRetry={() => wl.refresh()} />
      )}

      {!wl.loading && totalItems === 0 && sections.length <= 1 && (
        <EmptyState
          icon={<Eye className="h-6 w-6" />}
          title="Your watchlist is empty"
          description="Search for a symbol above, or import a basket.xlsx file into its own section."
          action={
            <Button size="sm" onClick={() => setImporting(true)}>
              <FileSpreadsheet className="h-4 w-4" /> Import basket.xlsx
            </Button>
          }
        />
      )}

      {!wl.loading && (
        <div className="space-y-6">
          {sections.map((section, idx) => (
            <Card key={section.id} className="overflow-hidden">
              {/* Section header */}
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                {renamingId === section.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      value={renameValue}
                      autoFocus
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && saveRename(section.id)
                      }
                      className="h-9 max-w-xs"
                    />
                    <button
                      onClick={() => saveRename(section.id)}
                      className="rounded-md p-1.5 text-[hsl(var(--positive))] hover:bg-muted"
                      aria-label="Save name"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setRenamingId(null)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                      aria-label="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-serif text-[17px]">{section.name}</span>
                    <Badge tone="neutral">{section.items.length}</Badge>
                  </>
                )}
                <div className="flex-1" />
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => moveSection(section.id, "up")}
                    disabled={idx === 0}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveSection(section.id, "down")}
                    disabled={idx === sections.length - 1}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setRenamingId(section.id);
                      setRenameValue(section.name);
                    }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                    aria-label="Rename section"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteSection(section.id, section.name)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-[hsl(var(--negative))]"
                    aria-label="Delete section"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Items */}
              {section.items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No symbols in this section yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2.5 font-medium">Symbol</th>
                        <th className="px-4 py-2.5 font-medium">Name</th>
                        <th className="px-4 py-2.5 text-right font-medium">Price</th>
                        <th className="px-4 py-2.5 text-right font-medium">Change</th>
                        <th className="px-4 py-2.5 font-medium">Notes</th>
                        <th className="px-4 py-2.5 text-right font-medium">Updated</th>
                        <th className="px-2 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                        >
                          <td className="px-4 py-3">
                            <span className="font-semibold">{item.symbol}</span>
                            {item.stale && (
                              <span
                                className="ml-2 text-[10px] text-amber-500"
                                title="Price unavailable — try a Yahoo symbol override"
                              >
                                no price
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span className="block max-w-[200px] truncate">
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
                            <div className="flex justify-end gap-0.5">
                              <button
                                onClick={() => setEditItem(item)}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label={`Edit ${item.symbol}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => removeItem(item.id, item.symbol)}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-[hsl(var(--negative))]"
                                aria-label={`Remove ${item.symbol}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <BasketImportDialog
        open={importing}
        onClose={() => setImporting(false)}
        onImported={() => wl.refresh(true)}
      />
      <WatchlistItemEditDialog
        item={editItem}
        onClose={() => setEditItem(null)}
        onSaved={() => wl.refresh(true)}
      />
    </div>
  );
}
