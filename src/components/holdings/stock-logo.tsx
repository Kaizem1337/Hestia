"use client";

import { useMemo, useState } from "react";

interface LogoHolding {
  symbol: string;
  yahooSymbol: string;
  name: string | null;
  isin: string | null;
  logoUrl: string | null;
}

/** First alphanumeric char of the company name (falls back to the ticker). */
function monogramChar(h: LogoHolding): string {
  const src = (h.name && h.name.trim()) || h.symbol;
  const m = src.match(/[A-Za-z0-9]/);
  return (m ? m[0] : "?").toUpperCase();
}

function isCash(h: LogoHolding): boolean {
  return (
    h.symbol.toUpperCase() === "CASH" || h.yahooSymbol.toUpperCase() === "CASH"
  );
}

/**
 * Company logo with a graceful fallback cascade:
 *   manual override -> /api/logos (TradingView -> logo.dev) -> letter monogram.
 * Each <img> failure advances to the next source via onError.
 */
export function StockLogo({
  holding,
  size = 38,
  monogramColor,
  className = "",
}: {
  holding: LogoHolding;
  size?: number;
  monogramColor?: string;
  className?: string;
}) {
  const sources = useMemo(() => {
    const list: string[] = [];
    if (holding.logoUrl) list.push(holding.logoUrl);
    if (!isCash(holding)) {
      const q = new URLSearchParams({
        symbol: holding.symbol,
        yahooSymbol: holding.yahooSymbol,
        isin: holding.isin ?? "",
        name: holding.name ?? "",
      });
      list.push(`/api/logos?${q.toString()}`);
    }
    return list;
  }, [holding.logoUrl, holding.symbol, holding.yahooSymbol, holding.isin, holding.name]);

  const [idx, setIdx] = useState(0);
  const src = idx < sources.length ? sources[idx] : null;

  const base =
    "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl";

  // No logo found -> monogram tile (the only case that keeps a backing).
  if (!src) {
    return (
      <span
        className={`${base} border border-border bg-white/[0.04] font-serif ${className}`}
        style={{ width: size, height: size, color: monogramColor, fontSize: size * 0.4 }}
      >
        {monogramChar(holding)}
      </span>
    );
  }

  // Real logo -> just the logo itself, no frame, edge-to-edge.
  return (
    <span className={`${base} ${className}`} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setIdx((i) => i + 1)}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
