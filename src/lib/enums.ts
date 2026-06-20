/**
 * String-union "enums".
 *
 * SQLite does not support Prisma enums, so these columns are stored as String.
 * These union types keep the rest of the codebase type-safe and are the single
 * source of truth for the allowed values.
 */
export type BrokerProvider = "TRADING212" | "IBKR" | "MANUAL";
export type BrokerEnvironment = "LIVE" | "DEMO";
export type HoldingSource = "MANUAL" | "TRADING212" | "IBKR";
export type PriceInterval = "MANUAL" | "M5" | "M15" | "M30" | "H1" | "DAILY";
export type SyncStatus = "PENDING" | "SUCCESS" | "PARTIAL" | "FAILED";
export type ImportType = "IBKR_CSV" | "BASKET_XLSX" | "TRADING212_SYNC";
