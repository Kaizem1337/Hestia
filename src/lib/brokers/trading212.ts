import { getEnv } from "@/lib/env";
import type { BrokerEnvironment } from "@/lib/enums";
import { YahooMarketDataProvider } from "@/lib/market-data/yahoo";
import type { SymbolSearchResult } from "@/lib/market-data/types";
import type { NormalizedHolding } from "@/lib/portfolio/types";
import { metaFromYahooSymbol } from "@/lib/symbols";
import {
  BrokerAuthError,
  BrokerError,
  BrokerRateLimitError,
  type BrokerConnector,
  type BrokerSyncResult,
  type BrokerTestResult,
} from "./types";

/**
 * Trading 212 API connector (server-side only).
 *
 * Auth: current Trading 212 API credentials are sent as HTTP Basic auth
 * (`API_KEY:API_SECRET`). Legacy one-piece API keys are still sent as the raw
 * `Authorization` header for existing stored connections. The credential is
 * decrypted from the DB immediately before the call and never leaves the server.
 *
 * Endpoints used (Trading 212 public API v0):
 *   GET /api/v0/equity/account/summary -> base currency, account id, cash
 *   GET /api/v0/equity/positions       -> open positions
 *   GET /api/v0/equity/metadata/instruments -> ticker enrichment (best effort)
 */
export class Trading212Connector implements BrokerConnector {
  readonly provider = "TRADING212" as const;

  private readonly symbolSearch = new YahooMarketDataProvider();

  private baseUrl(env: BrokerEnvironment): string {
    const cfg = getEnv();
    return env === "DEMO"
      ? cfg.TRADING212_DEMO_BASE_URL
      : cfg.TRADING212_LIVE_BASE_URL;
  }

  private async request<T>(
    path: string,
    token: string,
    env: BrokerEnvironment
  ): Promise<T> {
    const authorization = formatTrading212AuthorizationHeader(token);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl(env)}${path}`, {
        headers: { Authorization: authorization, Accept: "application/json" },
        // Avoid hanging forever on a slow/unreachable provider.
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      });
    } catch (e) {
      throw new BrokerError(
        `Could not reach Trading 212: ${
          e instanceof Error ? e.message : "network error"
        }`
      );
    }

    if (res.status === 401 || res.status === 403) {
      throw new BrokerAuthError();
    }
    if (res.status === 429) {
      throw new BrokerRateLimitError();
    }
    if (!res.ok) {
      throw new BrokerError(
        `Trading 212 returned ${res.status} for ${path}`
      );
    }
    try {
      return (await res.json()) as T;
    } catch {
      throw new BrokerError(`Trading 212 returned an unreadable response`);
    }
  }

  async testConnection(
    token: string,
    env: BrokerEnvironment
  ): Promise<BrokerTestResult> {
    try {
      const info = await this.request<Trading212AccountSummary>(
        "/api/v0/equity/account/summary",
        token,
        env
      );
      return {
        ok: true,
        message: "Connected to Trading 212",
        baseCurrency: getAccountCurrency(info),
        accountName: getAccountName(info),
      };
    } catch (e) {
      return {
        ok: false,
        message:
          e instanceof Error ? e.message : "Failed to connect to Trading 212",
      };
    }
  }

  async fetchHoldings(
    token: string,
    env: BrokerEnvironment
  ): Promise<BrokerSyncResult> {
    const warnings: string[] = [];

    const info = await this.request<Trading212AccountSummary>(
      "/api/v0/equity/account/summary",
      token,
      env
    );
    const accountCurrency = getAccountCurrency(info);
    const accountName = getAccountName(info);

    const positions = await this.request<Trading212Position[]>(
      "/api/v0/equity/positions",
      token,
      env
    );

    // Enrich tickers with metadata (name, isin, currency). Best-effort.
    const metaByTicker = new Map<string, Trading212MetadataInstrument>();
    try {
      const instruments = await this.request<Trading212MetadataInstrument[]>(
        "/api/v0/equity/metadata/instruments",
        token,
        env
      );
      for (const it of instruments) metaByTicker.set(it.ticker, it);
    } catch {
      warnings.push(
        "Could not load Trading 212 instrument metadata; symbol names may be limited."
      );
    }

    const availableCash = info.cash?.availableToTrade;
    const cashBalances =
      isFiniteNumber(availableCash) && accountCurrency
        ? [{ currency: accountCurrency, amount: availableCash }]
        : [];

    const searchCache = new Map<string, Promise<SymbolSearchResult[]>>();
    const unresolvedSymbols = new Set<string>();
    const holdings: NormalizedHolding[] = [];

    for (const p of positions) {
      const ticker = getPositionTicker(p);
      if (!ticker || !isFiniteNumber(p.quantity) || p.quantity === 0) {
        continue;
      }

      const meta = metaByTicker.get(ticker);
      const name = p.instrument?.name ?? meta?.name ?? meta?.shortName;
      const isin = p.instrument?.isin ?? meta?.isin;
      const currency =
        p.instrument?.currency ??
        p.instrument?.currencyCode ??
        meta?.currencyCode ??
        meta?.currency ??
        accountCurrency ??
        "USD";
      const { yahooSymbol: candidateYahooSymbol } = normalizeTrading212Ticker(
        ticker,
        currency
      );
      const resolution = await resolveTrading212YahooSymbol({
        ticker,
        candidateYahooSymbol,
        currency,
        name,
        isin,
        search: (query) => cachedSearch(query, this.symbolSearch, searchCache),
      });

      if (
        resolution.attempted &&
        !resolution.resolved &&
        shouldWarnForUnresolvedTrading212Ticker(ticker, currency)
      ) {
        unresolvedSymbols.add(getTrading212DisplaySymbol(ticker));
      }

      holdings.push({
        symbol: resolution.resolved
          ? resolution.yahooSymbol
          : getTrading212DisplaySymbol(ticker),
        yahooSymbol: resolution.yahooSymbol,
        name,
        exchange: resolution.exchange,
        isin,
        currency,
        quantity: p.quantity,
        avgCost: p.averagePricePaid ?? p.averagePrice ?? 0,
        accountName,
        purchaseDate: p.initialFillDate ?? null,
        source: "TRADING212",
      });
    }

    if (unresolvedSymbols.size > 0) {
      warnings.push(
        `Could not map these Trading 212 symbols to market-data symbols: ${Array.from(
          unresolvedSymbols
        ).join(", ")}.`
      );
    }

    return {
      holdings,
      cash: cashBalances,
      baseCurrency: accountCurrency,
      accountName,
      warnings,
    };
  }
}

interface Trading212SymbolResolutionInput {
  ticker: string;
  candidateYahooSymbol: string;
  currency?: string;
  name?: string | null;
  isin?: string | null;
  search: (query: string) => Promise<SymbolSearchResult[]>;
}

interface Trading212SymbolResolution {
  yahooSymbol: string;
  exchange?: string;
  attempted: boolean;
  resolved: boolean;
}

async function resolveTrading212YahooSymbol(
  input: Trading212SymbolResolutionInput
): Promise<Trading212SymbolResolution> {
  if (
    !shouldResolveTrading212TickerWithSearch(
      input.ticker,
      input.candidateYahooSymbol,
      input.currency
    )
  ) {
    return {
      yahooSymbol: input.candidateYahooSymbol,
      attempted: false,
      resolved: false,
    };
  }

  const queries = getTrading212SymbolSearchQueries(input);
  if (queries.length === 0) {
    return {
      yahooSymbol: input.candidateYahooSymbol,
      attempted: true,
      resolved: false,
    };
  }

  let best: { result: SymbolSearchResult; score: number } | null = null;
  for (const query of queries) {
    const results = await input.search(query);
    for (const result of results) {
      const score = scoreTrading212SearchResult(result, input);
      if (score > (best?.score ?? Number.NEGATIVE_INFINITY)) {
        best = { result, score };
      }
    }
    if ((best?.score ?? Number.NEGATIVE_INFINITY) >= 90) break;
  }

  if (!best || best.score < 25) {
    return {
      yahooSymbol: input.candidateYahooSymbol,
      attempted: true,
      resolved: false,
    };
  }

  return {
    yahooSymbol: best.result.symbol,
    exchange:
      metaFromYahooSymbol(best.result.symbol).exchange ?? best.result.exchange,
    attempted: true,
    resolved: true,
  };
}

async function cachedSearch(
  query: string,
  provider: YahooMarketDataProvider,
  cache: Map<string, Promise<SymbolSearchResult[]>>
): Promise<SymbolSearchResult[]> {
  const key = query.trim().toUpperCase();
  if (!key) return [];
  const cached = cache.get(key);
  if (cached) return cached;
  const promise = provider.search(query);
  cache.set(key, promise);
  return promise;
}

function getTrading212SymbolSearchQueries(
  input: Pick<
    Trading212SymbolResolutionInput,
    "ticker" | "candidateYahooSymbol" | "isin" | "name"
  >
): string[] {
  const display = getTrading212DisplaySymbol(input.ticker).trim();
  const strippedDisplay = stripTrading212VenueLetter(display);
  const queries = [
    input.isin,
    display,
    strippedDisplay,
    input.name,
    strippedDisplay && input.name ? `${strippedDisplay} ${input.name}` : null,
    input.candidateYahooSymbol,
  ];
  return Array.from(
    new Set(
      queries
        .map((q) => q?.trim())
        .filter((q): q is string => Boolean(q))
    )
  );
}

function scoreTrading212SearchResult(
  result: SymbolSearchResult,
  input: Pick<
    Trading212SymbolResolutionInput,
    "candidateYahooSymbol" | "currency" | "name"
  >
): number {
  const symbol = result.symbol.trim();
  if (!symbol) return Number.NEGATIVE_INFINITY;

  let score = 0;
  const symbolUpper = symbol.toUpperCase();
  const type = (result.type ?? "").toUpperCase();
  const exchangeText = `${result.exchange ?? ""} ${result.region ?? ""}`;
  const exchangeUpper = exchangeText.toUpperCase();
  const expectedCurrency = input.currency?.toUpperCase();
  const inferred = metaFromYahooSymbol(symbol);

  if (symbolUpper === input.candidateYahooSymbol.toUpperCase()) score += 45;
  if (type === "EQUITY") score += 20;
  if (type === "ETF") score += 12;
  if (type === "MUTUALFUND" || type === "INDEX") score -= 25;
  if (exchangeUpper.includes("OTC") || exchangeUpper.includes("PNK")) {
    score -= 30;
  }

  if (expectedCurrency && inferred.currency) {
    score += inferred.currency === expectedCurrency ? 55 : -20;
  } else if (expectedCurrency === "USD" && symbolUpper.endsWith(".IL")) {
    score += 45;
  }

  score += nameSimilarityScore(input.name, result.name);

  return score;
}

function nameSimilarityScore(
  expected?: string | null,
  actual?: string | null
): number {
  const expectedTokens = tokenizeName(expected);
  if (expectedTokens.length === 0) return 0;
  const actualTokens = new Set(tokenizeName(actual));
  let matches = 0;
  for (const token of expectedTokens) {
    if (actualTokens.has(token)) matches += 1;
  }
  return matches * 8;
}

function tokenizeName(value?: string | null): string[] {
  return (value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !COMMON_NAME_WORDS.has(token));
}

function stripTrading212VenueLetter(symbol: string): string | null {
  if (!/[a-z]$/.test(symbol) || symbol.length <= 1) return null;
  return symbol.slice(0, -1);
}

function shouldResolveTrading212TickerWithSearch(
  ticker: string,
  candidateYahooSymbol: string,
  currency?: string
): boolean {
  const parts = ticker.split("_");
  const exchangeCode = parts.length >= 2 ? parts[1].toUpperCase() : undefined;
  if (
    exchangeCode &&
    TRADING212_EXCHANGE_TO_YAHOO_SUFFIX[exchangeCode] !== undefined
  ) {
    return false;
  }
  if (candidateYahooSymbol.includes(".")) return false;

  const display = getTrading212DisplaySymbol(ticker);
  const normalizedCurrency = currency?.toUpperCase();
  return (
    normalizedCurrency !== undefined && normalizedCurrency !== "USD"
  ) || /[a-z]/.test(display) || display.length >= 5;
}

function shouldWarnForUnresolvedTrading212Ticker(
  ticker: string,
  currency?: string
): boolean {
  const display = getTrading212DisplaySymbol(ticker);
  const normalizedCurrency = currency?.toUpperCase();
  return (
    (normalizedCurrency !== undefined && normalizedCurrency !== "USD") ||
    /[a-z]/.test(display) ||
    display.length > 5
  );
}

const COMMON_NAME_WORDS = new Set([
  "CO",
  "CORP",
  "CORPORATION",
  "INC",
  "LTD",
  "LIMITED",
  "PLC",
  "SA",
  "AG",
  "NV",
]);

const TRADING212_EXCHANGE_TO_YAHOO_SUFFIX: Record<string, string> = {
  US: "",
  GB: ".L",
  UK: ".L",
  L: ".L",
  DE: ".DE",
  FR: ".PA",
  NL: ".AS",
  CH: ".SW",
  HK: ".HK",
  JP: ".T",
  KR: ".KS",
  TW: ".TW",
  CA: ".TO",
  AU: ".AX",
  SG: ".SI",
};

interface Trading212AccountSummary {
  cash?: {
    availableToTrade?: number;
    inPies?: number;
    reservedForOrders?: number;
  };
  currency?: string;
  id?: number | string;
}

interface Trading212Instrument {
  currency?: string;
  currencyCode?: string;
  isin?: string;
  name?: string;
  shortName?: string;
  ticker?: string;
}

interface Trading212MetadataInstrument extends Trading212Instrument {
  currencyCode?: string;
  ticker: string;
}

interface Trading212Position {
  averagePrice?: number;
  averagePricePaid?: number;
  currentPrice?: number;
  instrument?: Trading212Instrument;
  quantity?: number;
  ticker?: string;
  // ISO datetime the position was first opened (Trading 212 portfolio API).
  initialFillDate?: string;
}

export function formatTrading212AuthorizationHeader(token: string): string {
  const credential = token.trim();
  if (!credential) {
    throw new BrokerAuthError("Missing Trading 212 API credentials");
  }

  if (/^Basic\s+/i.test(credential)) {
    return credential;
  }

  const separatorIndex = credential.indexOf(":");
  if (separatorIndex === -1) {
    return credential;
  }

  const apiKey = credential.slice(0, separatorIndex).trim();
  const apiSecret = credential.slice(separatorIndex + 1).trim();
  if (!apiKey || !apiSecret) {
    throw new BrokerAuthError(
      "Trading 212 API credentials must be API_KEY:API_SECRET"
    );
  }

  return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`, "utf8").toString(
    "base64"
  )}`;
}

function getAccountCurrency(info: Trading212AccountSummary): string | undefined {
  return info.currency;
}

function getAccountName(info: Trading212AccountSummary): string {
  return info.id !== undefined && info.id !== null
    ? `Trading 212 #${info.id}`
    : "Trading 212";
}

function getPositionTicker(position: Trading212Position): string | undefined {
  return position.instrument?.ticker ?? position.ticker;
}

function getTrading212DisplaySymbol(ticker: string): string {
  return ticker.split("_")[0] || ticker;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Best-effort conversion of a Trading 212 ticker (e.g. "AAPL_US_EQ") into a
 * Yahoo symbol + native currency. Trading 212 does not expose Yahoo suffixes,
 * so non-US instruments are mapped from Trading 212's exchange code where the
 * common Yahoo suffix is known.
 */
export function normalizeTrading212Ticker(
  ticker: string,
  currencyCode?: string
): { yahooSymbol: string; currency?: string } {
  const base = getTrading212DisplaySymbol(ticker).trim();
  const parts = ticker.split("_");
  const exchangeCode = parts.length >= 2 ? parts[1].toUpperCase() : undefined;

  const suffix = exchangeCode
    ? TRADING212_EXCHANGE_TO_YAHOO_SUFFIX[exchangeCode]
    : undefined;
  const yahooSymbol = suffix !== undefined ? `${base}${suffix}` : base;
  return { yahooSymbol, currency: currencyCode };
}
