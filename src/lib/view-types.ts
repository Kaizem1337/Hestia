/**
 * Client-facing view types mirroring the JSON returned by the API. Kept separate
 * from server modules so client components never transitively import Prisma.
 */
export type HoldingSource = "MANUAL" | "TRADING212" | "IBKR";
export type PriceInterval = "MANUAL" | "M5" | "M15" | "M30" | "H1" | "DAILY";

export interface EnrichedHolding {
  id: string;
  symbol: string;
  yahooSymbol: string;
  name: string | null;
  exchange: string | null;
  isin: string | null;
  source: HoldingSource;
  accountName: string | null;
  accountKey: string;
  accountLabel: string;
  purchaseDate: string | null;
  logoUrl: string | null;
  quantity: number;
  avgCost: number;
  nativeCurrency: string;
  currentPrice: number | null;
  nativeMarketValue: number | null;
  nativeCostBasis: number;
  nativeGainLoss: number | null;
  dayChangePerShare: number | null;
  dayChangePercent: number | null;
  nativeDayChange: number | null;
  baseCurrency: string;
  fxRate: number;
  baseMarketValue: number | null;
  baseCostBasis: number;
  baseGainLoss: number | null;
  baseGainLossPercent: number | null;
  baseDayChange: number | null;
  allocationPercent: number | null;
  priceAsOf: string | null;
  stale: boolean;
}

export interface PortfolioTotals {
  baseCurrency: string;
  marketValue: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdingsCount: number;
}

export interface PortfolioResult {
  baseCurrency: string;
  holdings: EnrichedHolding[];
  totals: PortfolioTotals;
  pricesAsOf: string | null;
  fxAsOf: string | null;
  hasMissingFx: boolean;
}

export interface EnrichedWatchlistItem {
  id: string;
  symbol: string;
  yahooSymbol: string;
  name: string | null;
  exchange: string | null;
  currency: string | null;
  notes: string | null;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  priceAsOf: string | null;
  stale: boolean;
}

export interface EnrichedWatchlist {
  id: string;
  name: string;
  isDefault: boolean;
  order: number;
  items: EnrichedWatchlistItem[];
}

export interface SearchResult {
  symbol: string;
  yahooSymbol: string;
  name: string | null;
  exchange: string | null;
  region: string | null;
  currency: string | null;
  type: string | null;
}

export interface BrokerConnectionView {
  id: string;
  provider: string;
  environment: "LIVE" | "DEMO";
  label: string | null;
  status: "PENDING" | "SUCCESS" | "PARTIAL" | "FAILED";
  lastSyncAt: string | null;
  lastSyncMessage: string | null;
  hasToken: boolean;
}
