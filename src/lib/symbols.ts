/**
 * Symbol normalization utilities.
 *
 * Brokers and basket files express the same instrument in different dialects:
 *   - IBKR:       "189" (SEHK), "009150.KS" (KRX), "NOK" (NYSE)
 *   - Bloomberg:  "009150 KS Equity", "4062 JT Equity", "MRVL US Equity"
 *   - Yahoo:      "0189.HK", "009150.KS", "NOK"
 *
 * These helpers convert any of those into a Yahoo-Finance compatible symbol so
 * the market-data adapter has a single canonical key, and derive a sensible
 * native currency / exchange label along the way.
 */

export interface NormalizedSymbol {
  /** Yahoo Finance compatible symbol used for quotes. */
  yahooSymbol: string;
  /** Inferred native currency, if derivable from the exchange. */
  currency?: string;
  /** Human exchange label, if derivable. */
  exchange?: string;
}

/** Map of Yahoo exchange suffix -> { currency, exchange, pad }. */
const SUFFIX_META: Record<
  string,
  { currency: string; exchange: string; pad?: number }
> = {
  HK: { currency: "HKD", exchange: "HKEX", pad: 4 },
  KS: { currency: "KRW", exchange: "KRX" },
  KQ: { currency: "KRW", exchange: "KOSDAQ" },
  T: { currency: "JPY", exchange: "TSE" },
  TW: { currency: "TWD", exchange: "TWSE" },
  TWO: { currency: "TWD", exchange: "TPEx" },
  L: { currency: "GBP", exchange: "LSE" },
  IL: { currency: "USD", exchange: "LSE IOB" },
  DE: { currency: "EUR", exchange: "XETRA" },
  F: { currency: "EUR", exchange: "Frankfurt" },
  SG: { currency: "EUR", exchange: "Stuttgart" },
  DU: { currency: "EUR", exchange: "Dusseldorf" },
  HM: { currency: "EUR", exchange: "Hamburg" },
  MU: { currency: "EUR", exchange: "Munich" },
  PA: { currency: "EUR", exchange: "Euronext Paris" },
  AS: { currency: "EUR", exchange: "Euronext Amsterdam" },
  SW: { currency: "CHF", exchange: "SIX" },
  TO: { currency: "CAD", exchange: "TSX" },
  AX: { currency: "AUD", exchange: "ASX" },
  SI: { currency: "SGD", exchange: "SGX" },
  SS: { currency: "CNY", exchange: "Shanghai" },
  SZ: { currency: "CNY", exchange: "Shenzhen" },
};

/**
 * Bloomberg country/exchange code -> Yahoo suffix.
 * Example Bloomberg ticker: "009150 KS Equity" -> suffix "KS".
 */
const BLOOMBERG_TO_YAHOO: Record<
  string,
  { suffix: string; currency: string; exchange: string; pad?: number }
> = {
  KS: { suffix: "KS", currency: "KRW", exchange: "KRX" },
  KP: { suffix: "KS", currency: "KRW", exchange: "KRX" },
  JT: { suffix: "T", currency: "JPY", exchange: "TSE" },
  JP: { suffix: "T", currency: "JPY", exchange: "TSE" },
  TT: { suffix: "TW", currency: "TWD", exchange: "TWSE" },
  HK: { suffix: "HK", currency: "HKD", exchange: "HKEX", pad: 4 },
  US: { suffix: "", currency: "USD", exchange: "US" },
  LN: { suffix: "L", currency: "GBP", exchange: "LSE" },
  GR: { suffix: "DE", currency: "EUR", exchange: "XETRA" },
  FP: { suffix: "PA", currency: "EUR", exchange: "Euronext Paris" },
  NA: { suffix: "AS", currency: "EUR", exchange: "Euronext Amsterdam" },
  SW: { suffix: "SW", currency: "CHF", exchange: "SIX" },
  CT: { suffix: "TO", currency: "CAD", exchange: "TSX" },
  CN: { suffix: "TO", currency: "CAD", exchange: "TSX" },
  AT: { suffix: "AX", currency: "AUD", exchange: "ASX" },
  SP: { suffix: "SI", currency: "SGD", exchange: "SGX" },
  C1: { suffix: "SS", currency: "CNY", exchange: "Shanghai" },
  C2: { suffix: "SZ", currency: "CNY", exchange: "Shenzhen" },
};

/**
 * IBKR "Listing Exch" -> Yahoo suffix.
 * Example: symbol "189" + listingExch "SEHK" -> "0189.HK".
 */
const IBKR_EXCH_TO_YAHOO: Record<
  string,
  { suffix: string; currency: string; exchange: string; pad?: number }
> = {
  SEHK: { suffix: "HK", currency: "HKD", exchange: "HKEX", pad: 4 },
  KRX: { suffix: "KS", currency: "KRW", exchange: "KRX" },
  KOSDAQ: { suffix: "KQ", currency: "KRW", exchange: "KOSDAQ" },
  TSEJ: { suffix: "T", currency: "JPY", exchange: "TSE" },
  TSE_JP: { suffix: "T", currency: "JPY", exchange: "TSE" },
  TWSE: { suffix: "TW", currency: "TWD", exchange: "TWSE" },
  LSE: { suffix: "L", currency: "GBP", exchange: "LSE" },
  LSEETF: { suffix: "L", currency: "GBP", exchange: "LSE" },
  IBIS: { suffix: "DE", currency: "EUR", exchange: "XETRA" },
  SBF: { suffix: "PA", currency: "EUR", exchange: "Euronext Paris" },
  AEB: { suffix: "AS", currency: "EUR", exchange: "Euronext Amsterdam" },
  EBS: { suffix: "SW", currency: "CHF", exchange: "SIX" },
  TSE: { suffix: "TO", currency: "CAD", exchange: "TSX" },
  ASX: { suffix: "AX", currency: "AUD", exchange: "ASX" },
  SGX: { suffix: "SI", currency: "SGD", exchange: "SGX" },
  NYSE: { suffix: "", currency: "USD", exchange: "NYSE" },
  NASDAQ: { suffix: "", currency: "USD", exchange: "NASDAQ" },
  ARCA: { suffix: "", currency: "USD", exchange: "NYSE Arca" },
  BATS: { suffix: "", currency: "USD", exchange: "BATS" },
};

function padNumeric(code: string, pad?: number): string {
  if (!pad) return code;
  if (!/^\d+$/.test(code)) return code;
  return code.padStart(pad, "0");
}

/** Returns currency/exchange metadata for a Yahoo symbol's suffix. */
export function metaFromYahooSymbol(yahooSymbol: string): {
  currency?: string;
  exchange?: string;
} {
  const dot = yahooSymbol.lastIndexOf(".");
  if (dot === -1) return { currency: "USD", exchange: "US" };
  const suffix = yahooSymbol.slice(dot + 1).toUpperCase();
  const meta = SUFFIX_META[suffix];
  return meta
    ? { currency: meta.currency, exchange: meta.exchange }
    : { currency: undefined, exchange: undefined };
}

/**
 * Normalize an IBKR symbol using its listing exchange into a Yahoo symbol.
 * `symbol` may already include a suffix (e.g. "009150.KS"), in which case it is
 * returned as-is with derived metadata.
 */
export function normalizeIbkrSymbol(
  symbol: string,
  listingExch?: string
): NormalizedSymbol {
  const trimmed = symbol.trim();
  if (trimmed.includes(".")) {
    return { yahooSymbol: trimmed, ...metaFromYahooSymbol(trimmed) };
  }
  const exch = (listingExch ?? "").trim().toUpperCase();
  const meta = IBKR_EXCH_TO_YAHOO[exch];
  if (!meta) {
    // Unknown exchange: assume US-style plain ticker.
    return { yahooSymbol: trimmed, currency: undefined, exchange: listingExch };
  }
  const base = padNumeric(trimmed, meta.pad);
  const yahooSymbol = meta.suffix ? `${base}.${meta.suffix}` : base;
  return { yahooSymbol, currency: meta.currency, exchange: meta.exchange };
}

/**
 * Parse a Bloomberg-style ticker like "009150 KS Equity" or "MRVL US Equity".
 * Returns null if the string is not in Bloomberg format.
 */
export function parseBloombergTicker(raw: string): NormalizedSymbol | null {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  // <code> <country> [Equity]
  const match = cleaned.match(/^(\S+)\s+([A-Z0-9]{1,3})(?:\s+Equity)?$/i);
  if (!match) return null;
  const [, code, countryRaw] = match;
  const country = countryRaw.toUpperCase();
  const meta = BLOOMBERG_TO_YAHOO[country];
  if (!meta) return null;
  const base = padNumeric(code, meta.pad);
  const yahooSymbol = meta.suffix ? `${base}.${meta.suffix}` : base;
  return { yahooSymbol, currency: meta.currency, exchange: meta.exchange };
}

/**
 * Best-effort normalization of a free-form ticker (manual entry / watchlist).
 * Accepts Bloomberg format, Yahoo format, or a plain ticker.
 */
export function normalizeAnySymbol(raw: string): NormalizedSymbol {
  const bloomberg = parseBloombergTicker(raw);
  if (bloomberg) return bloomberg;
  const trimmed = raw.trim().toUpperCase();
  if (trimmed.includes(".")) {
    return { yahooSymbol: trimmed, ...metaFromYahooSymbol(trimmed) };
  }
  return { yahooSymbol: trimmed, currency: "USD", exchange: "US" };
}

/**
 * Ordered list of Yahoo symbols to *try* when fetching market data.
 *
 * Yahoo lists Taiwan's main board (TWSE) as `.TW` and the Taipei Exchange
 * (TPEx / OTC, formerly GreTai) as `.TWO`. Brokers rarely distinguish the two,
 * so a TPEx instrument (e.g. 8299) commonly imports as `8299.TW` and returns no
 * price data. We try the requested symbol first, then its Taiwan sibling, so a
 * mis-suffixed holding still resolves without needing a re-import. Callers
 * should key the result by the *original* symbol, not the one that resolved.
 *
 * Non-Taiwan symbols return just themselves (no extra requests).
 */
export function yahooSymbolCandidates(symbol: string): string[] {
  const s = symbol.trim();
  if (/\.TWO$/i.test(s)) return [s, s.replace(/\.TWO$/i, ".TW")];
  if (/\.TW$/i.test(s)) return [s, s.replace(/\.TW$/i, ".TWO")];
  return [s];
}
