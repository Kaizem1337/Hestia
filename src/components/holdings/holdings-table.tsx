"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/client";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatSignedCurrency,
  timeAgo,
} from "@/lib/utils";
import { toneClass } from "@/components/ui/value";
import { Badge } from "@/components/ui/feedback";
import { EditHoldingDialog } from "./edit-holding-dialog";
import { StockLogo } from "./stock-logo";
import type { EnrichedHolding } from "@/lib/view-types";

const sourceTone: Record<string, "neutral" | "accent" | "positive"> = {
  MANUAL: "neutral",
  TRADING212: "accent",
  IBKR: "positive",
};

// Approx height of the 2-item actions menu; used to decide flip direction.
const MENU_H = 92;

type MenuState = { id: string; top: number; right: number };

export function HoldingsTable({
  holdings,
  onChanged,
}: {
  holdings: EnrichedHolding[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<EnrichedHolding | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  // The menu is position:fixed (so the scroll container can't clip it), which
  // means it must close if the user scrolls or resizes.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  function toggleMenu(e: React.MouseEvent<HTMLButtonElement>, id: string) {
    if (menu?.id === id) {
      setMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const openUp = rect.bottom + MENU_H + 8 > window.innerHeight;
    setMenu({
      id,
      top: openUp ? rect.top - MENU_H - 4 : rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  }

  async function onDelete(h: EnrichedHolding) {
    setMenu(null);
    if (!confirm(`Remove ${h.symbol} from your holdings?`)) return;
    try {
      await apiFetch(`/api/holdings/${h.id}`, { method: "DELETE" });
      toast.success(`Removed ${h.symbol}`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const menuHolding = menu ? holdings.find((h) => h.id === menu.id) : null;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full table-auto border-collapse whitespace-nowrap text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-3 font-medium">Instrument</th>
            <th className="px-3 py-3 text-right font-medium">Qty</th>
            <th className="px-3 py-3 text-right font-medium">Avg cost</th>
            <th className="px-3 py-3 text-right font-medium">Price</th>
            <th className="px-3 py-3 text-right font-medium">Day</th>
            <th className="px-3 py-3 text-right font-medium">Value (native)</th>
            <th className="px-3 py-3 text-right font-medium">Value (base)</th>
            <th className="px-3 py-3 text-right font-medium">Gain / loss</th>
            <th className="px-3 py-3 text-right font-medium">Alloc.</th>
            <th className="px-3 py-3 text-right font-medium">Updated</th>
            <th className="px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr
              key={h.id}
              className="border-b border-border/60 last:border-0 hover:bg-muted/40"
            >
              <td className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <StockLogo holding={h} size={32} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{h.symbol}</span>
                      <Badge tone={sourceTone[h.source] ?? "neutral"}>
                        {h.source}
                      </Badge>
                      {h.stale && (
                        <span title="Price may be stale or unavailable">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        </span>
                      )}
                    </div>
                    <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                      {h.name || h.yahooSymbol}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 text-right tabular">
                {formatNumber(h.quantity, { maximumFractionDigits: 4 })}
              </td>
              <td className="px-3 py-3 text-right tabular">
                {formatCurrency(h.avgCost, h.nativeCurrency)}
              </td>
              <td className="px-3 py-3 text-right tabular">
                {formatCurrency(h.currentPrice, h.nativeCurrency)}
              </td>
              <td
                className={`px-3 py-3 text-right tabular ${toneClass(
                  h.dayChangePercent
                )}`}
              >
                {formatPercent(h.dayChangePercent, { signed: true })}
              </td>
              <td className="px-3 py-3 text-right tabular">
                {formatCurrency(h.nativeMarketValue, h.nativeCurrency, {
                  compact: true,
                })}
              </td>
              <td className="px-3 py-3 text-right tabular font-medium">
                {formatCurrency(h.baseMarketValue, h.baseCurrency)}
              </td>
              <td className="px-3 py-3 text-right tabular">
                <div className={toneClass(h.baseGainLoss)}>
                  {formatSignedCurrency(h.baseGainLoss, h.baseCurrency)}
                </div>
                <div className={`text-xs ${toneClass(h.baseGainLossPercent)}`}>
                  {formatPercent(h.baseGainLossPercent, { signed: true })}
                </div>
              </td>
              <td className="px-3 py-3 text-right tabular text-muted-foreground">
                {h.allocationPercent !== null
                  ? `${h.allocationPercent.toFixed(1)}%`
                  : "—"}
              </td>
              <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                {timeAgo(h.priceAsOf)}
              </td>
              <td className="px-2 py-3 text-right">
                <button
                  onClick={(e) => toggleMenu(e, h.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                  aria-label="Row actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Actions menu — position:fixed so the scroll container never clips it. */}
      {menu && menuHolding && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenu(null)} />
          <div
            className="fixed z-40 w-36 rounded-lg border border-border bg-card p-1 shadow-lg"
            style={{ top: menu.top, right: menu.right }}
          >
            <button
              onClick={() => {
                setEditing(menuHolding);
                setMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <Pencil className="h-4 w-4" /> Edit
            </button>
            <button
              onClick={() => onDelete(menuHolding)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[hsl(var(--negative))] hover:bg-muted"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          </div>
        </>
      )}

      {editing && (
        <EditHoldingDialog
          holding={editing}
          onClose={() => setEditing(null)}
          onSaved={onChanged}
        />
      )}
    </div>
  );
}
