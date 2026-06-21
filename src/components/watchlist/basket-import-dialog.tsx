"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/feedback";

interface BasketItem {
  symbol: string;
  yahooSymbol: string;
  name?: string | null;
  exchange?: string | null;
  currency?: string | null;
  notes?: string | null;
}
interface Preview {
  items: BasketItem[];
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: { row: number; reason: string }[];
}

export function BasketImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [fileName, setFileName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function reset() {
    setPreview(null);
    setFileName("");
    setSectionName("");
  }

  async function onFile(file: File) {
    setUploading(true);
    setPreview(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import/basket", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "Could not read file");
      }
      setPreview(json.data.preview);
      setFileName(json.data.fileName);
      setSectionName(
        (json.data.fileName || "").replace(/\.[^.]+$/, "").trim() ||
          "Imported basket"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function confirmImport() {
    if (!preview || preview.items.length === 0) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/import/basket/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: preview.items,
          fileName,
          name: sectionName.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "Import failed");
      }
      toast.success(
        `Imported ${json.data.result.imported} symbols${
          json.data.result.skipped
            ? ` (${json.data.result.skipped} already on list)`
            : ""
        }`
      );
      reset();
      onImported();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Import basket.xlsx"
      description="Upload an Excel file with Symbol/Ticker, Company Name, Exchange, Currency and optional Notes columns."
      className="sm:max-w-2xl"
    >
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
            {uploading ? "Reading file…" : "Click to choose a .xlsx file"}
          </span>
          <span className="text-xs text-muted-foreground">
            Bloomberg-style baskets (e.g. &quot;009150 KS Equity&quot;) are supported too.
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{fileName}</span>
            <Badge tone="positive">{preview.items.length} to import</Badge>
            {preview.skippedRows > 0 && (
              <Badge tone="warning">{preview.skippedRows} skipped</Badge>
            )}
          </div>

          <div>
            <Label htmlFor="section-name">New section name</Label>
            <Input
              id="section-name"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="e.g. AI Bottleneck Basket"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              These symbols are added to their own watchlist section.
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Symbol</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Exch.</th>
                  <th className="px-3 py-2 font-medium">Ccy</th>
                </tr>
              </thead>
              <tbody>
                {preview.items.map((it, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-3 py-2 font-medium">{it.yahooSymbol}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <span className="block max-w-[220px] truncate">
                        {it.name || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {it.exchange || "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {it.currency || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={reset}>
              Choose another file
            </Button>
            <Button
              onClick={confirmImport}
              loading={confirming}
              disabled={preview.items.length === 0}
            >
              <CheckCircle2 className="h-4 w-4" /> Import {preview.items.length}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
