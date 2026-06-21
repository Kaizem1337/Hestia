"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { apiFetch } from "@/lib/client";
import { StockLogo } from "./stock-logo";
import type { EnrichedHolding } from "@/lib/view-types";

export function EditHoldingDialog({
  holding,
  onClose,
  onSaved,
}: {
  holding: EnrichedHolding | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [quantity, setQuantity] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Seed inputs when a holding is opened.
  const open = Boolean(holding);
  const key = holding?.id ?? "none";

  function seed() {
    if (holding) {
      setQuantity(String(holding.quantity));
      setAvgCost(String(holding.avgCost));
      setPurchaseDate(holding.purchaseDate ? holding.purchaseDate.slice(0, 10) : "");
      setLogoUrl(holding.logoUrl ?? null);
    }
  }

  async function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !holding) return;
    setLogoBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/holdings/${holding.id}/logo`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "Upload failed");
      }
      setLogoUrl(json.data.holding.logoUrl);
      toast.success("Logo updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onLogoRemove() {
    if (!holding) return;
    setLogoBusy(true);
    try {
      await apiFetch(`/api/holdings/${holding.id}/logo`, { method: "DELETE" });
      setLogoUrl(null);
      toast.success("Logo reset");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLogoBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!holding) return;
    setLoading(true);
    try {
      await apiFetch(`/api/holdings/${holding.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          quantity: Number(quantity),
          avgCost: Number(avgCost),
          purchaseDate: purchaseDate || null,
        }),
      });
      toast.success("Holding updated");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      key={key}
      open={open}
      onClose={onClose}
      title={holding ? `Edit ${holding.symbol}` : "Edit"}
    >
      {/* seed values once on open */}
      <SeedOnce run={seed} />
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Logo */}
        {holding && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <StockLogo
              key={logoUrl ?? "auto"}
              holding={{ ...holding, logoUrl }}
              size={44}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Logo</p>
              <p className="text-xs text-muted-foreground">
                {logoUrl
                  ? "Custom logo in use."
                  : "Auto-detected. Upload a .svg or .png to override."}
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
              onChange={onLogoFile}
              className="hidden"
            />
            <div className="flex shrink-0 flex-col gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                loading={logoBusy}
                onClick={() => fileRef.current?.click()}
              >
                Upload
              </Button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={onLogoRemove}
                  disabled={logoBusy}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="eqty">Quantity</Label>
            <Input
              id="eqty"
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ecost">Avg cost (native)</Label>
            <Input
              id="ecost"
              type="number"
              step="any"
              value={avgCost}
              onChange={(e) => setAvgCost(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="epdate">Purchase date</Label>
          <Input
            id="epdate"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            The performance chart starts from this date; earlier dates show a
            flat line at zero. Leave blank to count across the whole range.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Save changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Runs a side effect exactly once when mounted (used to seed form inputs). */
function SeedOnce({ run }: { run: () => void }) {
  useState(() => {
    run();
    return null;
  });
  return null;
}
