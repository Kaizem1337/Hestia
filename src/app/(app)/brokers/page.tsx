"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2, RefreshCw, Trash2, ShieldCheck, Plug } from "lucide-react";
import { useData, apiFetch } from "@/lib/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge, Skeleton, EmptyState } from "@/components/ui/feedback";
import { timeAgo } from "@/lib/utils";
import type { BrokerConnectionView } from "@/lib/view-types";

const statusTone: Record<string, "positive" | "warning" | "negative" | "neutral"> = {
  SUCCESS: "positive",
  PARTIAL: "warning",
  FAILED: "negative",
  PENDING: "neutral",
};

export default function BrokersPage() {
  const conns = useData<{ connections: BrokerConnectionView[] }>("/api/brokers");
  const [credential, setCredential] = useState("");
  const [environment, setEnvironment] = useState("LIVE");
  const [label, setLabel] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    try {
      await apiFetch("/api/brokers", {
        method: "POST",
        body: JSON.stringify({
          provider: "TRADING212",
          environment,
          credential,
          label: label || undefined,
        }),
      });
      toast.success("Trading 212 connected");
      setCredential("");
      setLabel("");
      conns.refresh(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }

  async function sync(id: string) {
    setSyncingId(id);
    try {
      const res = await apiFetch<{ result: { imported: number; updated: number } }>(
        `/api/brokers/${id}/sync`,
        { method: "POST" }
      );
      toast.success(
        `Synced ${res.result.imported + res.result.updated} holdings`
      );
      conns.refresh(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncingId(null);
    }
  }

  async function disconnect(id: string) {
    if (!confirm("Disconnect this broker? Imported holdings remain.")) return;
    try {
      await apiFetch(`/api/brokers/${id}`, { method: "DELETE" });
      toast.success("Disconnected");
      conns.refresh(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  const connections = conns.data?.connections ?? [];

  return (
    <div>
      <PageHeader
        title="Brokers"
        description="Connect Trading 212 to sync holdings automatically."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-primary" /> Connect Trading 212
            </CardTitle>
            <CardDescription>
              Generate an API key and secret in the Trading 212 app (Settings
              → API), then paste them as API_KEY:API_SECRET. Existing legacy API
              keys still work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={connect} className="space-y-4">
              <div>
                <Label htmlFor="env">Environment</Label>
                <Select
                  id="env"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                >
                  <option value="LIVE">Live</option>
                  <option value="DEMO">Demo / Practice</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="key">API key + secret</Label>
                <Input
                  id="key"
                  type="password"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  placeholder="API_KEY:API_SECRET or legacy API key"
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  The credential is encrypted at rest and never shown again.
                </p>
              </div>
              <div>
                <Label htmlFor="label">Label (optional)</Label>
                <Input
                  id="label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Main ISA"
                />
              </div>
              <Button type="submit" loading={connecting} className="w-full">
                <ShieldCheck className="h-4 w-4" /> Verify & connect
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conns.loading && <Skeleton className="h-32" />}
            {!conns.loading && connections.length === 0 && (
              <EmptyState
                title="No brokers connected"
                description="Connect Trading 212 to sync your live holdings."
              />
            )}
            <ul className="space-y-3">
              {connections.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {c.label || c.provider}
                        </span>
                        <Badge tone={statusTone[c.status] ?? "neutral"}>
                          {c.status}
                        </Badge>
                        <Badge tone="neutral">{c.environment}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.lastSyncAt
                          ? `Last sync ${timeAgo(c.lastSyncAt)}`
                          : "Never synced"}
                        {c.lastSyncMessage ? ` · ${c.lastSyncMessage}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => sync(c.id)}
                      loading={syncingId === c.id}
                    >
                      <RefreshCw className="h-4 w-4" /> Sync now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => disconnect(c.id)}
                    >
                      <Trash2 className="h-4 w-4" /> Disconnect
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
