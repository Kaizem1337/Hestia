import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formats a number as a currency amount with the correct symbol/decimals. */
export function formatCurrency(
  value: number | null | undefined,
  currency: string,
  opts: { compact?: boolean; maximumFractionDigits?: number } = {}
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: opts.compact ? "compact" : "standard",
      maximumFractionDigits:
        opts.maximumFractionDigits ??
        (opts.compact ? 2 : zeroDecimalCurrencies.has(currency) ? 0 : 2),
    }).format(value);
  } catch {
    // Unknown currency code: fall back to a plain number + code.
    return `${formatNumber(value, { maximumFractionDigits: 2 })} ${currency}`;
  }
}

const zeroDecimalCurrencies = new Set(["JPY", "KRW", "CLP", "VND", "ISK"]);

export function formatNumber(
  value: number | null | undefined,
  opts: { maximumFractionDigits?: number; minimumFractionDigits?: number } = {}
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: opts.maximumFractionDigits ?? 2,
    minimumFractionDigits: opts.minimumFractionDigits,
  }).format(value);
}

export function formatPercent(
  value: number | null | undefined,
  opts: { signed?: boolean } = {}
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = opts.signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatSignedCurrency(
  value: number | null | undefined,
  currency: string,
  opts: { compact?: boolean } = {}
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatCurrency(value, currency, opts)}`;
}

/** Relative "time ago" string for a date (e.g. "3m ago"). */
export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "never";
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function initialsFromName(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
