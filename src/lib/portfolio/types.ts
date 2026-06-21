import type { HoldingSource } from "@/lib/enums";

/**
 * A broker/import-agnostic holding shape. Every adapter (Trading 212 sync,
 * IBKR import, basket import, manual add) normalizes into this so the rest of
 * the app never needs to know where a holding came from.
 */
export interface NormalizedHolding {
  /** Ticker as the source expresses it (e.g. "189", "AAPL", "009150.KS"). */
  symbol: string;
  /** Yahoo Finance compatible symbol used for quotes (e.g. "0189.HK"). */
  yahooSymbol: string;
  name?: string | null;
  exchange?: string | null;
  isin?: string | null;
  currency: string;
  quantity: number;
  /** Average cost per share in native currency. */
  avgCost: number;
  accountName?: string | null;
  /** ISO date the position was first opened, if known (drives chart start). */
  purchaseDate?: string | null;
  source: HoldingSource;
}

export interface CashBalance {
  currency: string;
  amount: number;
}

/** Per-row failure detail surfaced to the user during imports. */
export interface RowError {
  row: number;
  reason: string;
  raw?: string;
}

/** Result of parsing an import file (IBKR CSV, basket xlsx, ...). */
export interface ImportResult {
  holdings: NormalizedHolding[];
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: RowError[];
  accountName?: string;
  baseCurrency?: string;
}
