"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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

const MENU_H = 92;
type MenuState = { id: string; top: number; right: number };
const CHECK = "h-4 w-4 rounded border-input accent-[hsl(var(--violet))]";

export function HoldingsTable({
  holdings,
  onChanged,
}: {
  holdings: EnrichedHolding[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<EnrichedHolding | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Group holdings by account, ordered by total value desc.
  const groups = useMemo(() => {
    const m = new Map<
      string,
      { label: string; source: string; items: EnrichedHolding[] }
    >();
    for (const h of holdings) {
      const g = m.get(h.accountKey);
      if (g) g.items.push(h);
      else m.set(h.accountKey, { label: h.accountLabel, source: h.source, items: [h] });
    }
    return Array.from(m.values())
      .map((g) => ({
        ...g,
        currency: g.items[0].accountCurrency,
        total: g.items.reduce((s, h) => s + (h.accountMarketValue ?? 0), 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [holdings]);

  const allIds = useMemo(() => holdings.map((h) => h.id), [holdings]);
  const allSelected = selected.size > 0 && selected.size === allIds.length;

  // Drop any selected ids that no longer exist after a refresh.
  useEffect(() => {
    setSelected((prev) => {
      const valid = new Set(allIds);
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => (valid.has(id) ? next.add(id) : (changed = true)));
      return changed ? next : prev;
    });
  }, [allIds]);

  // The actions menu is position:fixed, so it must close on scroll/resize.
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

  function toggleOne(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function setMany(ids: string[], on: boolean) {
    setSelected((prev) => {
      const n = new Set(prev);
      ids.forEach((id) => (on ? n.add(id) : n.delete(id)));
      return n;
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

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (
      !confirm(
        `Remove ${ids.length} holding${ids.length > 1 ? "s" : ""} from your portfolio?`
      )
    )
      return;
    setDeleting(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => apiFetch(`/api/holdings/${id}`, { method: "DELETE" }))
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const failed = ids.length - ok;
      if (ok) toast.success(`Removed ${ok} holding${ok > 1 ? "s" : ""}`);
      if (failed) toast.error(`${failed} could not be removed`);
      setSelected(new Set());
      onChanged();
    } finally {
      setDeleting(false);
    }
  }

  const menuHolding = menu ? holdings.find((h) => h.id === menu.id) : null;

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full table-auto border-collapse whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-9 px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all holdings"
                  checked={allSelected}
                  onChange={() => setMany(allIds, !allSelected)}
                  className={CHECK}
                />
              </th>
              <th className="px-3 py-3 font-medium">Instrument</th>
              <th className="hidden px-3 py-3 text-right font-medium md:table-cell">Qty</th>
              <th className="hidden px-3 py-3 text-right font-medium lg:table-cell">Avg cost</th>
              <th className="px-3 py-3 text-right font-medium">Price</th>
              <th className="hidden px-3 py-3 text-right font-medium xl:table-cell">Day</th>
              <th className="px-3 py-3 text-right font-medium">Value</th>
              <th className="px-3 py-3 text-right font-medium">Gain / loss</th>
              <th className="hidden px-3 py-3 text-right font-medium lg:table-cell">Alloc.</th>
              <th className="hidden px-3 py-3 text-right font-medium xl:table-cell">Updated</th>
              <th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const groupIds = g.items.map((h) => h.id);
              const groupAll = groupIds.every((id) => selected.has(id));
              const groupSome = groupIds.some((id) => selected.has(id));
              return (
                <Fragment key={g.label + g.source}>
                  {/* account section header */}
                  <tr className="border-b border-border bg-white/[0.02]">
                    <td colSpan={11} className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          aria-label={`Select all in ${g.label}`}
                          checked={groupAll}
                          ref={(el) => {
                            if (el) el.indeterminate = groupSome && !groupAll;
                          }}
                          onChange={(e) => setMany(groupIds, e.target.checked)}
                          className={CHECK}
                        />
                        <span className="font-serif text-[15px]">{g.label}</span>
                        <Badge tone={sourceTone[g.source] ?? "neutral"}>
                          {g.source}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {g.items.length} position{g.items.length > 1 ? "s" : ""}
                        </span>
                        <span className="flex-1" />
                        <span className="tabular text-sm font-semibold">
                          {formatCurrency(g.total, g.currency)}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {g.items.map((h) => (
                    <tr
                      key={h.id}
                      className={`border-b border-border/50 last:border-0 hover:bg-muted/40 ${
                        selected.has(h.id) ? "bg-[hsl(var(--violet)/0.08)]" : ""
                      }`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${h.symbol}`}
                          checked={selected.has(h.id)}
                          onChange={() => toggleOne(h.id)}
                          className={CHECK}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <StockLogo holding={h} size={30} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{h.symbol}</span>
                              {h.stale && (
                                <span title="Price may be stale or unavailable">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                </span>
                              )}
                            </div>
                            <p className="max-w-[180px] truncate text-xs text-muted-foreground">
                              {h.name || h.yahooSymbol}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 text-right tabular md:table-cell">
                        {formatNumber(h.quantity, { maximumFractionDigits: 4 })}
                      </td>
                      <td className="hidden px-3 py-3 text-right tabular lg:table-cell">
                        {formatCurrency(h.avgCost, h.nativeCurrency)}
                      </td>
                      <td className="px-3 py-3 text-right tabular">
                        {formatCurrency(h.currentPrice, h.nativeCurrency)}
                      </td>
                      <td
                        className={`hidden px-3 py-3 text-right tabular xl:table-cell ${toneClass(
                          h.dayChangePercent
                        )}`}
                      >
                        {formatPercent(h.dayChangePercent, { signed: true })}
                      </td>
                      <td className="px-3 py-3 text-right tabular font-medium">
                        <div>
                          {formatCurrency(h.accountMarketValue, h.accountCurrency)}
                        </div>
                        {h.nativeCurrency !== h.accountCurrency &&
                          h.nativeMarketValue !== null && (
                            <div className="text-[11px] font-normal text-muted-foreground">
                              {formatCurrency(h.nativeMarketValue, h.nativeCurrency, {
                                compact: true,
                              })}
                            </div>
                          )}
                      </td>
                      <td className="px-3 py-3 text-right tabular">
                        <div className={toneClass(h.accountGainLoss)}>
                          {formatSignedCurrency(h.accountGainLoss, h.accountCurrency)}
                        </div>
                        <div className={`text-xs ${toneClass(h.accountGainLossPercent)}`}>
                          {formatPercent(h.accountGainLossPercent, { signed: true })}
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 text-right tabular text-muted-foreground lg:table-cell">
                        {h.allocationPercent !== null
                          ? `${h.allocationPercent.toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="hidden px-3 py-3 text-right text-xs text-muted-foreground xl:table-cell">
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
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

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

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-border bg-card/95 px-4 py-2.5 shadow-2xl backdrop-blur">
            <span className="text-sm">
              <span className="font-semibold">{selected.size}</span> selected
            </span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
            <button
              onClick={bulkDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 rounded-full bg-[hsl(var(--negative)/0.15)] px-3 py-1.5 text-sm font-medium text-[hsl(var(--negative))] transition-colors hover:bg-[hsl(var(--negative)/0.25)] disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      )}

      {editing && (
        <EditHoldingDialog
          holding={editing}
          onClose={() => setEditing(null)}
          onSaved={onChanged}
        />
      )}
    </>
  );
}
