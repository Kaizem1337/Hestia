"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileSpreadsheet, Building2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IbkrImport } from "@/components/import/ibkr-import";
import { BasketImportDialog } from "@/components/watchlist/basket-import-dialog";
import { AccountsManager } from "@/components/accounts/accounts-manager";

export default function ImportPage() {
  const router = useRouter();
  const [basketOpen, setBasketOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Import & sync"
        description="Bring in holdings from IBKR or a basket file, or connect a broker."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> IBKR holdings
            </CardTitle>
            <CardDescription>
              Upload an Interactive Brokers Activity Statement (CSV). We map
              symbols, ISINs, exchanges, quantities and average cost, then show a
              preview before saving.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IbkrImport onImported={() => router.push("/holdings")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" /> Watchlist basket
            </CardTitle>
            <CardDescription>
              Import a basket.xlsx of symbols into your watchlist. Columns:
              Symbol/Ticker, Company Name, Exchange, Currency, Notes (optional).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                Bloomberg-style tickers like &quot;009150 KS Equity&quot; are
                normalized automatically.
              </p>
              <Button onClick={() => setBasketOpen(true)}>
                <FileSpreadsheet className="h-4 w-4" /> Import basket.xlsx
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <AccountsManager />
      </div>

      <BasketImportDialog
        open={basketOpen}
        onClose={() => setBasketOpen(false)}
        onImported={() => router.push("/watchlist")}
      />
    </div>
  );
}
