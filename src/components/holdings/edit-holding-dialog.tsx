"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { apiFetch } from "@/lib/client";
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
  const [loading, setLoading] = useState(false);

  // Seed inputs when a holding is opened.
  const open = Boolean(holding);
  const key = holding?.id ?? "none";

  function seed() {
    if (holding) {
      setQuantity(String(holding.quantity));
      setAvgCost(String(holding.avgCost));
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
