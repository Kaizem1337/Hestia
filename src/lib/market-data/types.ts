/** A normalized market quote returned by any market-data provider. */
export interface Quote {
  yahooSymbol: string;
  currency?: string;
  price?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  marketState?: string;
  shortName?: string;
  exchange?: string;
}

/** A symbol search result for autocomplete. */
export interface SymbolSearchResult {
  symbol: string; // provider symbol (Yahoo compatible)
  name?: string;
  exchange?: string;
  region?: string;
  currency?: string;
  type?: string; // EQUITY, ETF, etc.
}

/**
 * Market-data provider adapter contract. Implement this to swap Yahoo for any
 * other free/paid provider without touching the rest of the app.
 */
export interface MarketDataProvider {
  readonly name: string;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  search(query: string): Promise<SymbolSearchResult[]>;
}
