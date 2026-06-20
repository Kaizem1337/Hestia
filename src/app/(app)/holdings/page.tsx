"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RefreshCw, Plus, Wallet } from "lucide-react";
import { useData, apiFetch } from "@/lib/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { HoldingsTable } from "@/components/holdings/holdings-table";
import { AddHoldingDialog } from "@/components/holdings/add-holding-dialog";
import { timeAgo } from "@/lib/utils";
import type { PortfolioResult } from "@/lib/view-types";

export default function HoldingsPage() {
  const portfolio = useData<PortfolioResult>("/api/portfolio");
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function refreshPrices() {
    setRefreshing(true);
    try {
      await apiFetch("/api/prices/refresh", { method: "POST" });
      await portfolio.refresh(true);
      toast.success("Prices refreshed");
    } catch {
      toast.error("Could not refresh prices");
    } finally {
      setRefreshing(false);
    }
  }

  const data = portfolio.data;
  const holdings = data?.holdings ?? [];

  return (
    <div>
      <PageHeader
        title="Holdings"
        description={
          data
            ? `${holdings.length} positions · updated ${timeAgo(data.pricesAsOf)}`
            : "All your positions in native and base currency"
        }
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
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Add holding
            </Button>
          </>
        }
      />

      {portfolio.loading && <Skeleton className="h-96" />}

      {!portfolio.loading && portfolio.error && (
        <ErrorState message={portfolio.error} onRetry={() => portfolio.refresh()} />
      )}

      {!portfolio.loading && data && holdings.length === 0 && (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="No holdings yet"
          description="Add a holding manually or import from a broker."
          action={
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> Add holding
              </Button>
              <Link href="/import">
                <Button size="sm" variant="outline">
                  Import
                </Button>
              </Link>
            </div>
          }
        />
      )}

      {!portfolio.loading && data && holdings.length > 0 && (
        <HoldingsTable holdings={holdings} onChanged={() => portfolio.refresh(true)} />
      )}

      <AddHoldingDialog
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={() => portfolio.refresh(true)}
      />
    </div>
  );
}
