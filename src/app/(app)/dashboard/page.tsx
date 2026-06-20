"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, ArrowDownRight, RefreshCw, Plus, Wallet } from "lucide-react";
import { useData, apiFetch } from "@/lib/client";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { Donut } from "@/components/dashboard/donut";
import { AreaChart } from "@/components/dashboard/area-chart";
import { AddHoldingDialog } from "@/components/holdings/add-holding-dialog";
import {
  cn,
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  timeAgo,
} from "@/lib/utils";
import type {
  PortfolioResult,
  EnrichedHolding,
  EnrichedWatchlist,
  HoldingSource,
} from "@/lib/view-types";

const ALLOC_COLORS = [
  "#a78bfa",
  "#8b7cf2",
  "#6ee7d0",
  "#7dd3fc",
  "#c4b5fd",
  "#67e8c0",
  "#3f4670",
];
const RANGES = ["1D", "1W", "1M", "1Y", "All"] as const;
const SOURCE_LABELS: Record<HoldingSource, string> = {
  MANUAL: "Manual",
  TRADING212: "Trading 212",
  IBKR: "IBKR",
};
type Scope = "ALL" | HoldingSource;

const INTERVAL_MS: Record<string, number> = {
  M5: 5 * 60_000,
  M15: 15 * 60_000,
  M30: 30 * 60_000,
  H1: 60 * 60_000,
  DAILY: 24 * 60 * 60_000,
};
const INTERVAL_LABEL: Record<string, string> = {
  MANUAL: "Manual refresh",
  M5: "Auto · every 5m",
  M15: "Auto · every 15m",
  M30: "Auto · every 30m",
  H1: "Auto · hourly",
  DAILY: "Auto · daily",
};

function tone(v: number | null | undefined) {
  if (v === null || v === undefined || v === 0) return "text-muted-foreground";
  return v > 0 ? "text-positive" : "text-negative";
}
function isCash(h: EnrichedHolding) {
  return h.symbol.toUpperCase() === "CASH" || h.yahooSymbol.toUpperCase() === "CASH";
}
/** First letter of the company name (falls back to the ticker). */
function tileLetter(h: EnrichedHolding) {
  const src = (h.name && h.name.trim()) || h.symbol;
  const m = src.match(/[A-Za-z0-9]/);
  return (m ? m[0] : "?").toUpperCase();
}

export default function DashboardPage() {
  const portfolio = useData<PortfolioResult>("/api/portfolio");
  const [range, setRange] = useState<(typeof RANGES)[number]>("1M");
  const history = useData<{ points: { t: string; value: number }[] }>(
    `/api/portfolio/history?range=${range}`
  );
  const watchlists = useData<{ watchlists: EnrichedWatchlist[] }>(
    "/api/watchlists"
  );
  const settings = useData<{ settings: { priceInterval: string } }>(
    "/api/settings"
  );
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scope, setScope] = useState<Scope>("ALL");
  const [, setTick] = useState(0); // re-render so "updated X ago" stays current

  async function doRefresh(silent: boolean) {
    if (!silent) setRefreshing(true);
    try {
      await apiFetch("/api/prices/refresh", { method: "POST" });
      await Promise.all([
        portfolio.refresh(true),
        history.refresh(true),
        watchlists.refresh(true),
      ]);
      if (!silent) toast.success("Prices refreshed");
    } catch {
      if (!silent) toast.error("Could not refresh prices");
    } finally {
      if (!silent) setRefreshing(false);
    }
  }
  function refreshPrices() {
    void doRefresh(false);
  }

  const interval = settings.data?.settings.priceInterval ?? "MANUAL";
  const intervalMs = INTERVAL_MS[interval];

  // Auto-refresh on the configured cadence (latest closure via ref).
  const refreshRef = useRef<() => void>(() => {});
  refreshRef.current = () => void doRefresh(true);
  useEffect(() => {
    if (!intervalMs) return;
    const id = setInterval(() => refreshRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  // Tick every 30s so the relative "updated" time stays fresh.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const data = portfolio.data;
  const baseCurrency = data?.baseCurrency ?? "USD";
  const allHoldings = useMemo(() => data?.holdings ?? [], [data]);
  const presentSources = useMemo(
    () => Array.from(new Set(allHoldings.map((h) => h.source))) as HoldingSource[],
    [allHoldings]
  );

  // Filter + recompute totals/allocation for the selected source scope.
  const view = useMemo(() => {
    const list =
      scope === "ALL"
        ? allHoldings
        : allHoldings.filter((h) => h.source === scope);
    const marketValue = list.reduce((s, h) => s + (h.baseMarketValue ?? 0), 0);
    const costBasis = list.reduce((s, h) => s + (h.baseCostBasis ?? 0), 0);
    const dayChange = list.reduce((s, h) => s + (h.baseDayChange ?? 0), 0);
    const gainLoss = marketValue - costBasis;
    const prev = marketValue - dayChange;
    const ranked = [...list]
      .sort((a, b) => (b.baseMarketValue ?? 0) - (a.baseMarketValue ?? 0))
      .map((h, i) => ({
        ...h,
        color: ALLOC_COLORS[i % ALLOC_COLORS.length],
        allocPct: marketValue > 0 ? ((h.baseMarketValue ?? 0) / marketValue) * 100 : 0,
      }));
    const equitiesPct = ranked
      .filter((h) => !isCash(h))
      .reduce((s, h) => s + h.allocPct, 0);
    return {
      list: ranked,
      marketValue,
      costBasis,
      dayChange,
      gainLoss,
      dayPct: prev > 0 ? (dayChange / prev) * 100 : 0,
      glPct: costBasis > 0 ? (gainLoss / costBasis) * 100 : 0,
      equitiesPct,
    };
  }, [allHoldings, scope]);

  const asOf = data?.pricesAsOf
    ? new Date(data.pricesAsOf).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  if (portfolio.loading) return <DashboardSkeleton />;
  if (portfolio.error)
    return (
      <div className="pt-2">
        <ErrorState message={portfolio.error} onRetry={() => portfolio.refresh()} />
      </div>
    );

  const scopes: Scope[] = ["ALL", ...presentSources];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">
            Total Balance{scope !== "ALL" ? ` · ${SOURCE_LABELS[scope]}` : ""}
          </span>
          <span className="font-serif text-[clamp(40px,7vw,66px)] font-medium leading-[0.95] tracking-[-0.025em]">
            {formatCurrency(view.marketValue, baseCurrency)}
          </span>
          <div className="flex items-center gap-3.5">
            <span className={`inline-flex items-center gap-1.5 text-[15px] ${tone(view.dayChange)}`}>
              {view.dayChange >= 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              {formatSignedCurrency(view.dayChange, baseCurrency)} ·{" "}
              {formatPercent(view.dayPct, { signed: true })} today
            </span>
            <span className="h-4 w-px bg-border" />
            <span className="text-sm text-muted-foreground">
              {formatPercent(view.glPct, { signed: true })} all time
            </span>
          </div>
        </div>
        <button
          onClick={refreshPrices}
          title="Refresh prices now"
          className="group flex flex-col items-end gap-0.5 pb-1 text-right"
        >
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors group-hover:text-foreground">
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            {data?.pricesAsOf
              ? `Updated ${timeAgo(data.pricesAsOf)}`
              : "Refresh prices"}
          </span>
          <span className="text-[11px] text-faint">
            {INTERVAL_LABEL[interval] ?? "Manual refresh"}
            {asOf ? ` · as of ${asOf}` : ""}
          </span>
        </button>
      </div>

      {/* Source scope filter */}
      {presentSources.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {scopes.map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
                scope === s
                  ? "border-[hsl(var(--violet)/0.6)] bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "ALL" ? "All accounts" : SOURCE_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      {allHoldings.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="No holdings yet"
          description="Add a holding, import an IBKR statement, or sync Trading 212 to bring your dashboard to life."
          action={
            <div className="flex gap-2">
              <button
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--violet))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))]"
              >
                <Plus className="h-4 w-4" /> Add holding
              </button>
              <Link
                href="/import"
                className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Import
              </Link>
            </div>
          }
        />
      ) : (
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          {/* Left column */}
          <div className="flex min-w-0 flex-[1.75] flex-col gap-6">
            {/* Performance */}
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center">
                <span className="font-serif text-[19px]">Performance</span>
                <div className="flex-1" />
                <div className="flex gap-5">
                  {RANGES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`text-[13.5px] ${
                        r === range
                          ? "font-bold text-[hsl(var(--violet))]"
                          : "font-medium text-faint hover:text-muted-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <AreaChart data={(history.data?.points ?? []).map((p) => p.value)} />
            </div>

            {/* Holdings list */}
            <div className="flex flex-col">
              <div className="mb-1.5 flex items-center">
                <span className="font-serif text-[19px]">Holdings</span>
                <div className="flex-1" />
                <button
                  onClick={() => setAdding(true)}
                  className="mr-4 inline-flex items-center gap-1 text-[13.5px] text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
                <Link
                  href="/holdings"
                  className="text-[13.5px] text-muted-foreground hover:text-foreground"
                >
                  See all →
                </Link>
              </div>
              {view.list.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-4 border-b border-border py-2.5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    <span
                      className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl border border-border bg-white/[0.04] font-serif text-[15px]"
                      style={{ color: h.color }}
                    >
                      {tileLetter(h)}
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[15px] font-semibold">
                        {h.name || h.symbol}
                      </span>
                      <span className="truncate text-[12.5px] tracking-wide text-faint">
                        {h.symbol}
                        {isCash(h)
                          ? ""
                          : ` · ${h.quantity.toLocaleString()} shares`}
                      </span>
                    </div>
                  </div>
                  <div className="hidden w-[170px] items-center gap-2.5 md:flex">
                    <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(h.allocPct * 3.2, 100)}%`,
                          background: h.color,
                        }}
                      />
                    </div>
                    <span className="w-9 text-right text-[13px] text-muted-foreground">
                      {h.allocPct.toFixed(1)}%
                    </span>
                  </div>
                  {/* value + native */}
                  <div className="w-32 text-right">
                    <div className="font-serif text-[18px]">
                      {formatCurrency(h.baseMarketValue, baseCurrency, {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                    {h.nativeCurrency !== baseCurrency &&
                      h.nativeMarketValue !== null && (
                        <div className="tabular text-[11px] text-faint">
                          {formatCurrency(h.nativeMarketValue, h.nativeCurrency, {
                            compact: true,
                          })}
                        </div>
                      )}
                  </div>
                  {/* day % + total return */}
                  <div className="w-20 text-right">
                    <div className={`text-[14px] ${tone(h.dayChangePercent)}`}>
                      {h.dayChangePercent === null || h.dayChangePercent === 0
                        ? "—"
                        : formatPercent(h.dayChangePercent, { signed: true })}
                    </div>
                    <div className={`text-[11px] ${tone(h.baseGainLossPercent)}`}>
                      {h.baseGainLossPercent === null
                        ? ""
                        : `${formatPercent(h.baseGainLossPercent, { signed: true })} all`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {/* Allocation */}
            <div className="flex flex-col gap-5 rounded-[18px] border border-border bg-white/[0.025] p-7">
              <span className="font-serif text-[19px]">Allocation</span>
              <div className="flex justify-center">
                <Donut
                  data={view.list.map((h) => ({
                    color: h.color,
                    value: h.baseMarketValue ?? 0,
                  }))}
                  size={190}
                  thickness={26}
                  gap={3}
                >
                  <span className="eyebrow" style={{ fontSize: 10 }}>
                    Equities
                  </span>
                  <span className="font-serif text-[30px] font-medium">
                    {view.equitiesPct.toFixed(1)}%
                  </span>
                </Donut>
              </div>
              <div className="mt-1 flex flex-col gap-3">
                {view.list.map((h) => (
                  <div key={h.id} className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: h.color }}
                    />
                    <span className="truncate text-[13.5px] text-muted-foreground">
                      {h.name || h.symbol}
                    </span>
                    <div className="flex-1" />
                    <span className="font-serif text-[13.5px]">
                      {h.allocPct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Watchlist teaser */}
            <div
              className="flex flex-col gap-4 rounded-[18px] border border-border p-7"
              style={{
                background:
                  "linear-gradient(160deg, hsl(var(--violet) / 0.10), hsl(var(--teal) / 0.05))",
              }}
            >
              <div className="flex items-center">
                <span className="font-serif text-[19px]">Watchlist</span>
                <div className="flex-1" />
                <span className="text-[12.5px] text-faint">
                  {watchlists.data?.watchlists?.[0]?.items.length ?? 0} tracked
                </span>
              </div>
              {watchlists.loading ? (
                <Skeleton className="h-24" />
              ) : (watchlists.data?.watchlists?.[0]?.items.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Your watchlist is empty.
                </p>
              ) : (
                watchlists.data?.watchlists[0].items.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[14.5px] font-semibold">
                        {item.symbol}
                      </span>
                      <span className="truncate text-[12px] text-faint">
                        {item.name || item.yahooSymbol}
                      </span>
                    </div>
                    <div className="flex-1" />
                    <div className="flex flex-col items-end">
                      <span className="font-serif text-[15px]">
                        {formatCurrency(item.price, item.currency || baseCurrency)}
                      </span>
                      <span className={`text-[12.5px] ${tone(item.changePercent)}`}>
                        {formatPercent(item.changePercent, { signed: true })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <Link
                href="/watchlist"
                className="mt-0.5 text-sm font-semibold text-[hsl(var(--violet))]"
              >
                View full watchlist →
              </Link>
            </div>
          </div>
        </div>
      )}

      <AddHoldingDialog
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={() => {
          portfolio.refresh(true);
          history.refresh(true);
        }}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-16 w-80" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        <div className="flex-[1.75] space-y-4">
          <Skeleton className="h-[210px] w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="flex-1 space-y-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    </div>
  );
}
