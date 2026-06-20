"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SymbolSearch } from "@/components/symbol-search";
import { apiFetch } from "@/lib/client";
import type { SearchResult } from "@/lib/view-types";

interface Selected {
  symbol: string;
  yahooSymbol: string;
  name: string;
  exchange: string;
  currency: string;
}

export function AddHoldingDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [selected, setSelected] = useState<Selected | null>(null);
  const [quantity, setQuantity] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setSelected(null);
    setQuantity("");
    setAvgCost("");
    setCurrency("");
  }

  function onPick(r: SearchResult) {
    const sel: Selected = {
      symbol: r.symbol,
      yahooSymbol: r.yahooSymbol,
      name: r.name ?? "",
      exchange: r.exchange ?? "",
      currency: r.currency ?? "USD",
    };
    setSelected(sel);
    setCurrency(sel.currency);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      toast.error("Search and select a symbol first");
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/holdings", {
        method: "POST",
        body: JSON.stringify({
          symbol: selected.symbol,
          yahooSymbol: selected.yahooSymbol,
          name: selected.name || null,
          exchange: selected.exchange || null,
          currency: currency || selected.currency,
          quantity: qty,
          avgCost: Number(avgCost) || 0,
          source: "MANUAL",
        }),
      });
      toast.success(`Added ${selected.symbol}`);
      reset();
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add holding");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add holding"
      description="Search for a symbol, then enter your position."
    >
      <div className="space-y-4">
        <div>
          <Label>Symbol</Label>
          <SymbolSearch onSelect={onPick} autoFocus />
        </div>

        {selected && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{selected.symbol}</span>
              <span className="text-muted-foreground">
                {selected.exchange} · {selected.currency}
              </span>
            </div>
            <p className="truncate text-muted-foreground">{selected.name || "—"}</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="cost">Avg cost (native)</Label>
              <Input
                id="cost"
                type="number"
                step="any"
                min="0"
                value={avgCost}
                onChange={(e) => setAvgCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ccy">Native currency</Label>
            <Input
              id="ccy"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="USD"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={!selected}>
              Add holding
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
