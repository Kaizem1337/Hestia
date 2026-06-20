"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { EnrichedHolding } from "@/lib/view-types";

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#6366f1",
  "#14b8a6",
];

export function AllocationChart({
  holdings,
  baseCurrency,
}: {
  holdings: EnrichedHolding[];
  baseCurrency: string;
}) {
  const withValue = holdings
    .filter((h) => (h.baseMarketValue ?? 0) > 0)
    .sort((a, b) => (b.baseMarketValue ?? 0) - (a.baseMarketValue ?? 0));

  // Group all but the top 8 into "Other".
  const top = withValue.slice(0, 8);
  const rest = withValue.slice(8);
  const data = top.map((h) => ({
    name: h.symbol,
    value: h.baseMarketValue ?? 0,
  }));
  if (rest.length) {
    data.push({
      name: "Other",
      value: rest.reduce((s, h) => s + (h.baseMarketValue ?? 0), 0),
    });
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            No priced holdings yet.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-56 w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) =>
                      formatCurrency(value, baseCurrency)
                    }
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      color: "hsl(var(--foreground))",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full space-y-1.5 sm:w-1/2">
              {data.map((d, i) => (
                <li
                  key={d.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    {d.name}
                  </span>
                  <span className="tabular text-muted-foreground">
                    {formatCurrency(d.value, baseCurrency, { compact: true })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
