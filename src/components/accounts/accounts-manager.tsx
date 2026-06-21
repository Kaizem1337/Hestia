"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { useData, apiFetch } from "@/lib/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge, Skeleton } from "@/components/ui/feedback";

interface AccountRow {
  id: string;
  source: string;
  accountKey: string;
  nickname: string | null;
  defaultLabel: string;
}

export function AccountsManager() {
  const req = useData<{ accounts: AccountRow[] }>("/api/accounts");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function save(a: AccountRow) {
    const nickname = (edits[a.id] ?? a.nickname ?? "").trim();
    setSavingId(a.id);
    try {
      await apiFetch(`/api/accounts/${a.id}`, {
        method: "PATCH",
        body: JSON.stringify({ nickname: nickname || null }),
      });
      toast.success("Nickname saved");
      req.refresh(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  const accounts = req.data?.accounts ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> Accounts
        </CardTitle>
        <CardDescription>
          Each IBKR account number and Trading 212 API is tracked separately.
          Give them nicknames to recognise them in the dashboard filter.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {req.loading && <Skeleton className="h-24" />}
        {!req.loading && accounts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No broker accounts yet. Import an IBKR statement or sync Trading 212
            and they’ll appear here.
          </p>
        )}
        <ul className="space-y-3">
          {accounts.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge tone={a.source === "IBKR" ? "positive" : "accent"}>
                    {a.source === "TRADING212" ? "Trading 212" : a.source}
                  </Badge>
                  <span className="truncate text-sm font-medium">
                    {a.defaultLabel}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={edits[a.id] ?? a.nickname ?? ""}
                  onChange={(e) =>
                    setEdits((m) => ({ ...m, [a.id]: e.target.value }))
                  }
                  placeholder="Nickname (e.g. Main ISA)"
                  className="h-9 sm:w-56"
                />
                <Button
                  size="sm"
                  onClick={() => save(a)}
                  loading={savingId === a.id}
                >
                  Save
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
