/** Supported base currencies for portfolio totals. */
export const SUPPORTED_CURRENCIES = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "HKD", label: "Hong Kong Dollar", symbol: "HK$" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "KRW", label: "South Korean Won", symbol: "₩" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { code: "TWD", label: "Taiwan Dollar", symbol: "NT$" },
  { code: "CNY", label: "Chinese Yuan", symbol: "¥" },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export const SUPPORTED_CURRENCY_CODES = SUPPORTED_CURRENCIES.map((c) => c.code);

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return SUPPORTED_CURRENCY_CODES.includes(code as CurrencyCode);
}

export function currencyLabel(code: string): string {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code)?.label ?? code;
}
