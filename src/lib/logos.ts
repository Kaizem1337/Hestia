/**
 * Stock logo resolution.
 *
 * Priority (manual uploads are handled separately, on the Holding):
 *   1. TradingView — their symbol search returns a `logoid` we turn into a
 *      clean full-colour SVG (e.g. `apple` -> .../apple--big.svg). No API key.
 *   2. logo.dev — ticker-based image, used only when LOGO_DEV_TOKEN is set.
 *   3. none — caller renders a monogram fallback.
 *
 * Results are cached by the API route so providers are only queried once per
 * instrument (and only positive results are trusted).
 */

export interface LogoLookup {
  symbol: string;
  yahooSymbol?: string | null;
  isin?: string | null;
  name?: string | null;
}

export interface ResolvedLogo {
  url: string | null;
  source: "tradingview" | "logodev" | null;
}

const TV_SEARCH = "https://symbol-search.tradingview.com/symbol_search/";
const tvLogo = (logoid: string) =>
  `https://s3-symbol-logo.tradingview.com/${logoid}--big.svg`;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Strip an exchange suffix (e.g. "0189.HK" -> "0189", "AAPL" -> "AAPL"). */
function baseTicker(symbol: string): string {
  return (symbol.split(".")[0] || symbol).trim();
}

/**
 * Clean ticker for provider lookups. The display `symbol` can be a Bloomberg
 * string like "009150 KS Equity" / "MRVL US Equity"; the Yahoo symbol is always
 * clean ("009150.KS" / "MRVL"), so prefer its base. Using the Bloomberg form
 * made searches match on the country code (KS->Kookmin Bank, US->Schwab, …).
 */
function tickerFor(lookup: LogoLookup): string {
  const ys = (lookup.yahooSymbol ?? "").trim();
  return baseTicker(ys || lookup.symbol);
}

interface TvResult {
  symbol?: string;
  logoid?: string;
  exchange?: string;
  type?: string;
}

/** TradingView returns either a bare array or { symbols: [...] }. */
function tvResults(payload: unknown): TvResult[] {
  if (Array.isArray(payload)) return payload as TvResult[];
  if (payload && typeof payload === "object" && "symbols" in payload) {
    const s = (payload as { symbols?: unknown }).symbols;
    if (Array.isArray(s)) return s as TvResult[];
  }
  return [];
}

/**
 * symbol-search sits behind Cloudflare and returns empty/HTML for requests that
 * don't look like they come from tradingview.com, so we send full browser
 * headers including Referer/Origin.
 */
async function tvFetch(query: string): Promise<TvResult[]> {
  const url = `${TV_SEARCH}?text=${encodeURIComponent(
    query
  )}&hl=0&lang=en&domain=production`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.tradingview.com/",
      Origin: "https://www.tradingview.com",
    },
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const text = await res.text();
  try {
    return tvResults(JSON.parse(text));
  } catch {
    return [];
  }
}

async function resolveTradingView(lookup: LogoLookup): Promise<string | null> {
  const base = tickerFor(lookup);
  // 1) Ticker search — only trust an EXACT symbol match. (Never grab the first
  //    arbitrary result: that is what mapped KS->Kookmin, US->Schwab, TT->TTM.)
  if (base) {
    try {
      const results = (await tvFetch(base)).filter((r) => r.logoid?.trim());
      const exact = results.find(
        (r) => (r.symbol ?? "").toUpperCase() === base.toUpperCase()
      );
      if (exact?.logoid) return tvLogo(exact.logoid);
    } catch {
      // fall through to the name search
    }
  }
  // 2) Company-name search — relevance-ranked, so the top logo'd hit is the
  //    company itself. Handles foreign tickers TradingView indexes by name.
  const name = lookup.name?.trim();
  if (name) {
    try {
      const results = (await tvFetch(name)).filter((r) => r.logoid?.trim());
      if (results[0]?.logoid) return tvLogo(results[0].logoid);
    } catch {
      /* give up -> logo.dev / monogram */
    }
  }
  return null;
}

function logoDevToken(): string | undefined {
  const t = process.env.LOGO_DEV_TOKEN;
  return t && t.trim() ? t.trim() : undefined;
}

function resolveLogoDev(lookup: LogoLookup): string | null {
  const token = logoDevToken();
  if (!token) return null;
  const ticker = tickerFor(lookup);
  // logo.dev's ticker API only knows US-style alphabetic tickers. Skip numeric
  // / foreign tickers (e.g. "009150", "8299") which would return a wrong logo.
  if (!ticker || !/^[A-Za-z][A-Za-z.\-]*$/.test(ticker)) return null;
  // `retina` for crispness; `fallback=404` so a real miss surfaces as an error
  // (img onError -> monogram) instead of logo.dev's generic placeholder.
  return `https://img.logo.dev/ticker/${encodeURIComponent(
    ticker
  )}?token=${encodeURIComponent(token)}&format=png&retina=true&fallback=404`;
}

export async function resolveLogo(lookup: LogoLookup): Promise<ResolvedLogo> {
  const tv = await resolveTradingView(lookup);
  if (tv) return { url: tv, source: "tradingview" };
  const ld = resolveLogoDev(lookup);
  if (ld) return { url: ld, source: "logodev" };
  return { url: null, source: null };
}
