"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { SymbolSearch } from "@/components/symbol-search";
import { useData, apiFetch } from "@/lib/client";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import type { SearchResult } from "@/lib/view-types";

interface Selected {
  symbol: string;
  yahooSymbol: string;
  name: string;
  exchange: string;
  currency: string;
}

interface AccountRow {
  id: string;
  source: string;
  accountKey: string;
  nickname: string | null;
  defaultLabel: string;
}

const cn = (...c: (string | false)[]) => c.filter(Boolean).join(" ");

export function AddHoldingDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const accountsReq = useData<{ accounts: AccountRow[] }>("/api/accounts");
  const [mode, setMode] = useState<"security" | "cash">("security");
  const [account, setAccount] = useState("MANUAL");

  const [selected, setSelected] = useState<Selected | null>(null);
  const [quantity, setQuantity] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [currency, setCurrency] = useState("");

  const [cashCurrency, setCashCurrency] = useState("USD");
  const [cashAmount, setCashAmount] = useState("");

  const [loading, setLoading] = useState(false);

  const accounts = accountsReq.data?.accounts ?? [];
  const accountOptions = useMemo(
    () => [
      { value: "MANUAL", label: "Manual" },
      ...accounts.map((a) => ({
        value: a.accountKey,
        label: a.nickname || a.defaultLabel,
      })),
    ],
    [accounts]
  );

  function reset() {
    setMode("security");
    setAccount("MANUAL");
    setSelected(null);
    setQuantity("");
    setAvgCost("");
    setCurrency("");
    setCashCurrency("USD");
    setCashAmount("");
  }

  function onPick(r: SearchResult) {
    const sel: Selected = {
      symbol: r.symbol,
      yahooSymbol: r.yahooSymbol,
      name: r.name ?? "",
      exchange: r.exchange ?? "",
      currency: r.currency ?? "USD",
    };
    setSelected(sel);
    setCurrency(sel.currency);
  }

  /** Resolve the selected account into { source, accountName }. */
  function accountTarget() {
    if (account === "MANUAL") return { source: "MANUAL", accountName: null };
    const a = accounts.find((x) => x.accountKey === account);
    return a
      ? { source: a.source, accountName: a.accountKey }
      : { source: "MANUAL", accountName: null };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { source, accountName } = accountTarget();
    setLoading(true);
    try {
      let body: Record<string, unknown>;
      let label: string;

      if (mode === "cash") {
        const amount = Number(cashAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
          toast.error("Enter a valid cash amount");
          setLoading(false);
          return;
        }
        body = {
          symbol: "CASH",
          yahooSymbol: `CASH.${cashCurrency}`,
          name: `Cash · ${cashCurrency}`,
          currency: cashCurrency,
          quantity: amount,
          avgCost: 1,
          source,
          accountName,
        };
        label = `${cashCurrency} cash`;
      } else {
        if (!selected) {
          toast.error("Search and select a symbol first");
          setLoading(false);
          return;
        }
        const qty = Number(quantity);
        if (!Number.isFinite(qty) || qty <= 0) {
          toast.error("Enter a valid quantity");
          setLoading(false);
          return;
        }
        body = {
          symbol: selected.symbol,
          yahooSymbol: selected.yahooSymbol,
          name: selected.name || null,
          exchange: selected.exchange || null,
          currency: currency || selected.currency,
          quantity: qty,
          avgCost: Number(avgCost) || 0,
          source,
          accountName,
        };
        label = selected.symbol;
      }

      await apiFetch("/api/holdings", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success(`Added ${label}`);
      reset();
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add holding");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add holding"
      description="Add a security or a cash balance to any account."
    >
      <div className="space-y-4">
        {/* Account + type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="acct">Account</Label>
            <Select
              id="acct"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              {accountOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <div className="flex gap-1 rounded-lg border border-border p-1">
              {(["security", "cash"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-sm capitalize",
                    mode === m
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {mode === "security" ? (
          <>
            <div>
              <Label>Symbol</Label>
              <SymbolSearch onSelect={onPick} autoFocus />
            </div>

            {selected && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{selected.symbol}</span>
                  <span className="text-muted-foreground">
                    {selected.exchange} · {selected.currency}
                  </span>
                </div>
                <p className="truncate text-muted-foreground">
                  {selected.name || "—"}
                </p>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="qty">Quantity</Label>
                  <Input
                    id="qty"
                    type="number"
                    step="any"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="cost">Avg cost (native)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="any"
                    min="0"
                    value={avgCost}
                    onChange={(e) => setAvgCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="ccy">Native currency</Label>
                <Input
                  id="ccy"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  placeholder="USD"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    reset();
                    onClose();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={loading} disabled={!selected}>
                  Add holding
                </Button>
              </div>
            </form>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cashccy">Currency</Label>
                <Select
                  id="cashccy"
                  value={cashCurrency}
                  onChange={(e) => setCashCurrency(e.target.value)}
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="cashamt">Amount</Label>
                <Input
                  id="cashamt"
                  type="number"
                  step="any"
                  min="0"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Held at face value in {cashCurrency} and converted to your base /
              account currency with live FX.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  reset();
                  onClose();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Add cash
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
