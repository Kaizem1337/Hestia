"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { apiFetch } from "@/lib/client";
import type { EnrichedWatchlistItem } from "@/lib/view-types";

export function WatchlistItemEditDialog({
  item,
  onClose,
  onSaved,
}: {
  item: EnrichedWatchlistItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = Boolean(item);
  const [notes, setNotes] = useState("");
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);

  // Seed inputs each time a different item opens.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (item && seededFor !== item.id) {
    setSeededFor(item.id);
    setNotes(item.notes ?? "");
    setSymbol(item.yahooSymbol);
  }

  const previewSymbol = symbol.trim() || item?.yahooSymbol || "";
  const quoteUrl = `https://finance.yahoo.com/quote/${encodeURIComponent(previewSymbol)}`;
  const fetchUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(previewSymbol)}`;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setLoading(true);
    try {
      await apiFetch(`/api/watchlists/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ notes, yahooSymbol: symbol.trim() || undefined }),
      });
      toast.success("Saved");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={item ? `Edit ${item.symbol}` : "Edit"}
      description="Update notes, or override the symbol used to fetch prices."
    >
      <form onSubmit={save} className="space-y-4">
        <div>
          <Label htmlFor="wl-notes">Notes</Label>
          <Textarea
            id="wl-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why are you watching this?"
          />
        </div>
        <div>
          <Label htmlFor="wl-symbol">Yahoo symbol override</Label>
          <Input
            id="wl-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g. 0700.HK — or paste a Yahoo Finance URL"
          />
          <div className="mt-2 space-y-1 rounded-lg border border-border bg-muted/40 p-3 text-xs">
            <p className="text-muted-foreground">
              Prices are fetched from this Yahoo symbol. If a price isn’t showing,
              open the symbol on Yahoo to confirm it, then paste the symbol or URL
              here.
            </p>
            <a
              href={quoteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[hsl(var(--violet))]"
            >
              Open {previewSymbol} on Yahoo Finance
              <ExternalLink className="h-3 w-3" />
            </a>
            <p className="break-all font-mono text-[10px] text-faint">
              Fetch URL: {fetchUrl}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Save changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
