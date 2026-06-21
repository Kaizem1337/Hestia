"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface ImportHolding {
  symbol: string;
  yahooSymbol: string;
  name?: string | null;
  exchange?: string | null;
  isin?: string | null;
  currency: string;
  quantity: number;
  avgCost: number;
  accountName?: string | null;
  purchaseDate?: string | null;
  source: "IBKR";
}
interface Preview {
  holdings: ImportHolding[];
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: { row: number; reason: string }[];
  accountName?: string;
  baseCurrency?: string;
}

export function IbkrImport({ onImported }: { onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [fileName, setFileName] = useState("");
  const [merge, setMerge] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function reset() {
    setPreview(null);
    setFileName("");
    setMerge(false);
  }

  async function onFile(file: File) {
    setUploading(true);
    setPreview(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import/ibkr", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "Could not read file");
      }
      setPreview(json.data.preview);
      setFileName(json.data.fileName);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function confirmImport() {
    if (!preview || preview.holdings.length === 0) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/import/ibkr/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings: preview.holdings, merge, fileName }),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "Import failed");
      }
      const r = json.data.result;
      toast.success(
        `Imported ${r.imported} · updated ${r.updated} · skipped ${r.skipped}`
      );
      reset();
      onImported();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-4">
      {!preview && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center hover:bg-muted/50"
        >
          {uploading ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <UploadCloud className="h-7 w-7 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {uploading ? "Parsing statement…" : "Upload IBKR Activity Statement (.csv)"}
          </span>
          <span className="text-xs text-muted-foreground">
            Open Positions and instrument details are detected automatically.
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />

      {preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{fileName}</span>
            <Badge tone="positive">{preview.holdings.length} positions</Badge>
            {preview.accountName && (
              <Badge tone="neutral">Acct {preview.accountName}</Badge>
            )}
            {preview.baseCurrency && (
              <Badge tone="accent">Base {preview.baseCurrency}</Badge>
            )}
            {preview.skippedRows > 0 && (
              <Badge tone="warning">{preview.skippedRows} skipped</Badge>
            )}
          </div>

          {preview.holdings.length > 0 && (
            <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Symbol</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Avg cost</th>
                    <th className="px-3 py-2 font-medium">Ccy</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.holdings.map((h, i) => (
                    <tr key={i} className="border-t border-border/60">
                      <td className="px-3 py-2 font-medium">{h.yahooSymbol}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        <span className="block max-w-[200px] truncate">
                          {h.name || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular">
                        {formatNumber(h.quantity, { maximumFractionDigits: 4 })}
                      </td>
                      <td className="px-3 py-2 text-right tabular">
                        {formatCurrency(h.avgCost, h.currency)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {h.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <p className="mb-1 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3.5 w-3.5" /> Skipped rows
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                {preview.errors.slice(0, 6).map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={merge}
              onChange={(e) => setMerge(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Update existing IBKR holdings (otherwise duplicates are skipped)
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={reset}>
              Choose another file
            </Button>
            <Button
              onClick={confirmImport}
              loading={confirming}
              disabled={preview.holdings.length === 0}
            >
              <CheckCircle2 className="h-4 w-4" /> Import {preview.holdings.length}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
