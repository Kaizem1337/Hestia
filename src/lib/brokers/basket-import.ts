import * as XLSX from "xlsx";
import { normalizeAnySymbol } from "@/lib/symbols";
import type { RowError } from "@/lib/portfolio/types";

/**
 * basket.xlsx watchlist import adapter.
 *
 * Supports two layouts:
 *   1. The documented simple schema with columns:
 *        Symbol | Company Name | Exchange | Currency | Notes (optional)
 *   2. Real-world Bloomberg "basket" exports where the ticker column contains
 *        values like "009150 KS Equity" / "MRVL US Equity".
 *
 * The header row is detected dynamically (it may not be the first row), and
 * columns are matched by fuzzy header names so column order does not matter.
 */

export interface BasketItem {
  symbol: string;
  yahooSymbol: string;
  name?: string;
  exchange?: string;
  currency?: string;
  notes?: string;
  /** Basket allocation weight (%), if the file carries one. */
  weight?: number | null;
}

export interface BasketImportResult {
  items: BasketItem[];
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: RowError[];
}

type ColMap = {
  symbol: number;
  name: number;
  exchange: number;
  currency: number;
  notes: number;
  weight: number;
  weightFallback: number;
};

function matchHeader(cell: unknown): keyof ColMap | null {
  if (typeof cell !== "string") return null;
  const c = cell.trim().toLowerCase();
  if (/ticker|symbol/.test(c)) return "symbol";
  if (/company|name|description/.test(c)) return "name";
  if (/exchange|exch/.test(c)) return "exchange";
  if (/currency|ccy/.test(c)) return "currency";
  if (/note/.test(c)) return "notes";
  // Weight: prefer "current day weight"; "previous day weight" / plain "weight"
  // are a fallback; "weight change" is ignored.
  if (/weight/.test(c) && !/change/.test(c)) {
    return /current/.test(c) ? "weight" : "weightFallback";
  }
  return null;
}

function cellNumber(row: unknown[], idx: number): number | null {
  if (idx < 0) return null;
  const v = row[idx];
  if (v === null || v === undefined || v === "") return null;
  const n =
    typeof v === "number" ? v : Number(String(v).replace(/[%,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function findHeaderRow(rows: unknown[][]): { index: number; cols: ColMap } | null {
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const cols: ColMap = {
      symbol: -1,
      name: -1,
      exchange: -1,
      currency: -1,
      notes: -1,
      weight: -1,
      weightFallback: -1,
    };
    let matches = 0;
    row.forEach((cell, idx) => {
      const key = matchHeader(cell);
      if (key && cols[key] === -1) {
        cols[key] = idx;
        matches += 1;
      }
    });
    // Need at least a symbol column to consider this a header row.
    if (cols.symbol !== -1 && matches >= 1) {
      return { index: i, cols };
    }
  }
  return null;
}

function cellString(row: unknown[], idx: number): string | undefined {
  if (idx < 0) return undefined;
  const v = row[idx];
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

export function parseBasketWorkbook(buffer: Buffer | ArrayBuffer): BasketImportResult {
  const errors: RowError[] = [];
  let rows: unknown[][];
  try {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  } catch (e) {
    return {
      items: [],
      totalRows: 0,
      importedRows: 0,
      skippedRows: 0,
      errors: [
        {
          row: 0,
          reason: `Could not read spreadsheet: ${
            e instanceof Error ? e.message : "unknown error"
          }`,
        },
      ],
    };
  }

  const header = findHeaderRow(rows);
  if (!header) {
    return {
      items: [],
      totalRows: 0,
      importedRows: 0,
      skippedRows: 0,
      errors: [
        {
          row: 0,
          reason:
            "No header row found. Expected a column named Symbol/Ticker (and optionally Company Name, Exchange, Currency, Notes).",
        },
      ],
    };
  }

  const { cols } = header;
  const items: BasketItem[] = [];
  const seen = new Set<string>();
  let totalRows = 0;

  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const rawSymbol = cellString(row, cols.symbol);
    if (!rawSymbol) continue; // blank line / spacer
    totalRows += 1;

    const normalized = normalizeAnySymbol(rawSymbol);
    if (!normalized.yahooSymbol) {
      errors.push({
        row: i + 1,
        reason: `Could not normalize symbol "${rawSymbol}"`,
        raw: rawSymbol,
      });
      continue;
    }
    if (seen.has(normalized.yahooSymbol)) {
      errors.push({
        row: i + 1,
        reason: `Duplicate symbol ${normalized.yahooSymbol} skipped`,
        raw: rawSymbol,
      });
      continue;
    }
    seen.add(normalized.yahooSymbol);

    items.push({
      symbol: rawSymbol,
      yahooSymbol: normalized.yahooSymbol,
      name: cellString(row, cols.name),
      exchange: cellString(row, cols.exchange) ?? normalized.exchange,
      currency: cellString(row, cols.currency) ?? normalized.currency,
      notes: cellString(row, cols.notes),
      weight:
        cellNumber(row, cols.weight) ?? cellNumber(row, cols.weightFallback),
    });
  }

  return {
    items,
    totalRows,
    importedRows: items.length,
    skippedRows: errors.length,
    errors,
  };
}
