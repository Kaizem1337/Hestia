"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, ArrowLeftRight } from "lucide-react";
import { useData, apiFetch } from "@/lib/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { currencyLabel } from "@/lib/currency";
import { timeAgo } from "@/lib/utils";

interface FxResp {
  base: string;
  rates: { currency: string; rate: number | null }[];
  asOf: string | null;
}

function fmt(n: number): string {
  const d = n >= 100 ? 0 : n >= 1 ? 4 : 6;
  return n.toLocaleString(undefined, { maximumFractionDigits: d });
}

export function FxRates() {
  const req = useData<FxResp>("/api/fx");
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      await apiFetch("/api/fx?force=1");
      await req.refresh(true);
      toast.success("FX rates refreshed");
    } catch {
      toast.error("Could not refresh rates");
    } finally {
      setRefreshing(false);
    }
  }

  const data = req.data;
  const base = data?.base ?? "";

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" /> Exchange rates
          </CardTitle>
          <CardDescription>
            Live rates against your base currency ({base || "—"}).
            {data?.asOf ? ` Updated ${timeAgo(data.asOf)}.` : ""}
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          loading={refreshing}
          onClick={refresh}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {req.loading ? (
          <Skeleton className="h-32" />
        ) : (
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {data?.rates.map((r) => (
              <div
                key={r.currency}
                className="flex items-center justify-between gap-3 border-b border-border/50 py-1.5 text-sm last:border-0 sm:[&:nth-last-child(2)]:border-0"
              >
                <span className="truncate text-muted-foreground">
                  <span className="font-medium text-foreground">{r.currency}</span>
                  <span className="ml-1.5 text-xs text-faint">
                    {currencyLabel(r.currency)}
                  </span>
                </span>
                <span className="tabular shrink-0 font-medium">
                  {r.rate && r.rate > 0
                    ? `1 ${base} = ${fmt(1 / r.rate)} ${r.currency}`
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
