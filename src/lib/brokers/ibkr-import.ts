import { parse } from "csv-parse/sync";
import { normalizeIbkrSymbol } from "@/lib/symbols";
import type { ImportResult, NormalizedHolding, RowError } from "@/lib/portfolio/types";

/**
 * IBKR Activity Statement (CSV) import adapter.
 *
 * IBKR statements are multi-section CSVs: the first column is the section name,
 * the second is a row type ("Header" | "Data" | "Total"). We read two sections:
 *   - "Financial Instrument Information" -> per-symbol metadata (ISIN, exchange,
 *     description) keyed by symbol.
 *   - "Open Positions" (DataDiscriminator = "Summary") -> the actual holdings.
 *
 * Numeric fields can contain thousands separators inside quotes
 * (e.g. "2,032,000.0000"), so values are de-comma'd before parsing.
 *
 * This module is pure (string in, structured result out) and has no DB/Network
 * dependencies, which keeps it trivially unit-testable.
 */

function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "" || cleaned === "--") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

interface InstrumentMeta {
  description?: string;
  isin?: string;
  listingExch?: string;
  type?: string;
}

export function parseIbkrCsv(content: string): ImportResult {
  const errors: RowError[] = [];
  let records: string[][];
  try {
    records = parse(content, {
      relax_column_count: true,
      relax_quotes: true,
      skip_empty_lines: true,
      bom: true,
    }) as string[][];
  } catch (e) {
    return {
      holdings: [],
      totalRows: 0,
      importedRows: 0,
      skippedRows: 0,
      errors: [
        {
          row: 0,
          reason: `Could not parse file as CSV: ${
            e instanceof Error ? e.message : "unknown error"
          }`,
        },
      ],
    };
  }

  // --- Account information ---------------------------------------------------
  let accountName: string | undefined;
  let baseCurrency: string | undefined;
  for (const r of records) {
    if (r[0] === "Account Information" && r[1] === "Data") {
      if (r[2] === "Account") accountName = r[3]?.trim() || accountName;
      if (r[2] === "Base Currency") baseCurrency = r[3]?.trim() || baseCurrency;
    }
  }

  // --- Financial Instrument Information --------------------------------------
  // Header columns: ...,Asset Category,Symbol,Description,Conid,Security ID,
  //                 Underlying,Listing Exch,Multiplier,Type,Code
  const instruments = new Map<string, InstrumentMeta>();
  for (const r of records) {
    if (r[0] === "Financial Instrument Information" && r[1] === "Data") {
      const symbol = r[3]?.trim();
      if (!symbol) continue;
      instruments.set(symbol, {
        description: r[4]?.trim() || undefined,
        isin: r[6]?.trim() || undefined,
        listingExch: r[8]?.trim() || undefined,
        type: r[10]?.trim() || undefined,
      });
    }
  }

  // --- Trades (for purchase / open dates) -----------------------------------
  // Header columns: DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,
  //                 Quantity,T. Price,... Open Positions carries no dates, so we
  //                 derive each symbol's earliest BUY (positive quantity) as its
  //                 purchase date. Date/Time looks like "YYYY-MM-DD, HH:MM:SS".
  const purchaseDates = new Map<string, number>();
  for (const r of records) {
    if (r[0] !== "Trades" || r[1] !== "Data") continue;
    const disc = r[2]?.trim();
    if (disc !== "Trade" && disc !== "Order") continue;
    const tSymbol = r[5]?.trim();
    const dateStr = r[6]?.trim();
    const qty = toNumber(r[7]);
    if (!tSymbol || !dateStr || qty === null || qty <= 0) continue;
    const ms = Date.parse(dateStr.replace(", ", "T"));
    if (!Number.isFinite(ms)) continue;
    const prev = purchaseDates.get(tSymbol);
    if (prev === undefined || ms < prev) purchaseDates.set(tSymbol, ms);
  }

  // --- Open Positions -------------------------------------------------------
  // Header columns: DataDiscriminator,Asset Category,Currency,Symbol,Quantity,
  //                 Mult,Cost Price,Cost Basis,Close Price,Value,...
  const holdings: NormalizedHolding[] = [];
  let totalRows = 0;
  let rowIndex = 0;

  for (const r of records) {
    rowIndex += 1;
    if (r[0] !== "Open Positions") continue;
    if (r[1] !== "Data") continue; // skip Header/Total rows
    if (r[2] !== "Summary" && r[2] !== "Lot") continue;
    if (r[2] === "Lot") continue; // lots are sub-rows of a summary; avoid dupes
    totalRows += 1;

    const currency = r[4]?.trim();
    const symbol = r[5]?.trim();
    const quantity = toNumber(r[6]);
    const costPrice = toNumber(r[8]);

    if (!symbol) {
      errors.push({ row: rowIndex, reason: "Missing symbol", raw: r.join(",") });
      continue;
    }
    if (quantity === null || quantity === 0) {
      errors.push({
        row: rowIndex,
        reason: `Invalid or zero quantity for ${symbol}`,
        raw: r.join(","),
      });
      continue;
    }
    if (!currency) {
      errors.push({
        row: rowIndex,
        reason: `Missing currency for ${symbol}`,
        raw: r.join(","),
      });
      continue;
    }

    const meta = instruments.get(symbol);
    const normalized = normalizeIbkrSymbol(symbol, meta?.listingExch);
    const purchaseMs = purchaseDates.get(symbol);

    holdings.push({
      symbol,
      yahooSymbol: normalized.yahooSymbol,
      name: meta?.description,
      exchange: meta?.listingExch ?? normalized.exchange,
      isin: meta?.isin,
      currency,
      quantity,
      avgCost: costPrice ?? 0,
      accountName,
      purchaseDate:
        purchaseMs !== undefined ? new Date(purchaseMs).toISOString() : null,
      source: "IBKR",
    });
  }

  return {
    holdings,
    totalRows,
    importedRows: holdings.length,
    skippedRows: errors.length,
    errors,
    accountName,
    baseCurrency,
  };
}
