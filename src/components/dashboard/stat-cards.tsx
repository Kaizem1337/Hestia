"use client";

import { TrendingUp, TrendingDown, Wallet, PieChart } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from "@/lib/utils";
import { toneClass } from "@/components/ui/value";
import type { PortfolioTotals } from "@/lib/view-types";

export function StatCards({ totals }: { totals: PortfolioTotals }) {
  const { baseCurrency } = totals;
  const dayUp = totals.dayChange >= 0;
  const glUp = totals.gainLoss >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total value</span>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-3xl font-semibold font-serif">
          {formatCurrency(totals.marketValue, baseCurrency)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Cost basis {formatCurrency(totals.costBasis, baseCurrency, { compact: true })}
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Day change</span>
          {dayUp ? (
            <TrendingUp className="h-4 w-4 text-[hsl(var(--positive))]" />
          ) : (
            <TrendingDown className="h-4 w-4 text-[hsl(var(--negative))]" />
          )}
        </div>
        <p className={`mt-2 text-3xl font-semibold font-serif ${toneClass(totals.dayChange)}`}>
          {formatSignedCurrency(totals.dayChange, baseCurrency)}
        </p>
        <p className={`mt-1 text-xs ${toneClass(totals.dayChangePercent)}`}>
          {formatPercent(totals.dayChangePercent, { signed: true })} today
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total gain / loss</span>
          {glUp ? (
            <TrendingUp className="h-4 w-4 text-[hsl(var(--positive))]" />
          ) : (
            <TrendingDown className="h-4 w-4 text-[hsl(var(--negative))]" />
          )}
        </div>
        <p className={`mt-2 text-3xl font-semibold font-serif ${toneClass(totals.gainLoss)}`}>
          {formatSignedCurrency(totals.gainLoss, baseCurrency)}
        </p>
        <p className={`mt-1 text-xs ${toneClass(totals.gainLossPercent)}`}>
          {formatPercent(totals.gainLossPercent, { signed: true })} all time
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Holdings</span>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-3xl font-semibold font-serif">{totals.holdingsCount}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          positions in {baseCurrency}
        </p>
      </Card>
    </div>
  );
}
