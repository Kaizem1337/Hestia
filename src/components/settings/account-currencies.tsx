"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Globe2 } from "lucide-react";
import { useData, apiFetch } from "@/lib/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import type { PortfolioResult } from "@/lib/view-types";

interface SettingsResp {
  settings: { baseCurrency: string; accountCurrencies: string | null };
}

/**
 * Per-account display currency. Each distinct account (incl. Manual) can be
 * shown in its own currency on the Holdings page and the dashboard when filtered
 * to that account; the "All accounts" overview always uses the base currency.
 */
export function AccountCurrencies() {
  const portfolio = useData<PortfolioResult>("/api/portfolio");
  const settings = useData<SettingsResp>("/api/settings");
  const [map, setMap] = useState<Record<string, string>>({});
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);

  const baseCurrency = settings.data?.settings.baseCurrency ?? "USD";

  // Distinct accounts present in the user's holdings.
  const accounts = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of portfolio.data?.holdings ?? []) m.set(h.accountKey, h.accountLabel);
    return Array.from(m, ([key, label]) => ({ key, label }));
  }, [portfolio.data]);

  useEffect(() => {
    if (seeded || !settings.data) return;
    try {
      const raw = settings.data.settings.accountCurrencies;
      setMap(raw ? (JSON.parse(raw) as Record<string, string>) : {});
    } catch {
      setMap({});
    }
    setSeeded(true);
  }, [settings.data, seeded]);

  async function save() {
    setSaving(true);
    try {
      // Only persist real overrides (drop anything equal to the base currency).
      const clean: Record<string, string> = {};
      for (const a of accounts) {
        const v = map[a.key];
        if (v && v !== baseCurrency) clean[a.key] = v;
      }
      await apiFetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ accountCurrencies: clean }),
      });
      toast.success("Account currencies saved");
      settings.refresh(true);
      portfolio.refresh(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-primary" /> Account currencies
        </CardTitle>
        <CardDescription>
          Display each account in its own currency on the Holdings page and the
          dashboard when filtered to that account. The “All accounts” overview
          always uses your base currency ({baseCurrency}).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {portfolio.loading || settings.loading ? (
          <Skeleton className="h-24" />
        ) : accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No accounts yet — add or import holdings first.
          </p>
        ) : (
          <div className="space-y-3">
            {accounts.map((a) => (
              <div key={a.key} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {a.label}
                </span>
                <Select
                  className="w-44"
                  value={map[a.key] ?? baseCurrency}
                  onChange={(e) =>
                    setMap((m) => ({ ...m, [a.key]: e.target.value }))
                  }
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.label}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
            <div className="flex justify-end pt-1">
              <Button size="sm" onClick={save} loading={saving}>
                Save currencies
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
