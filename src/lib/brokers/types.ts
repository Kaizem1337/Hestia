import type { BrokerEnvironment, BrokerProvider } from "@/lib/enums";
import type { CashBalance, NormalizedHolding } from "@/lib/portfolio/types";

export interface BrokerTestResult {
  ok: boolean;
  message: string;
  baseCurrency?: string;
  accountName?: string;
}

export interface BrokerSyncResult {
  holdings: NormalizedHolding[];
  cash: CashBalance[];
  baseCurrency?: string;
  accountName?: string;
  /** Non-fatal issues encountered during sync (e.g. couldn't enrich metadata). */
  warnings: string[];
}

/**
 * Broker connector contract for *API-based* brokers (e.g. Trading 212).
 * File-based imports (IBKR) use the import-adapter functions instead.
 */
export interface BrokerConnector {
  readonly provider: BrokerProvider;
  testConnection(
    token: string,
    env: BrokerEnvironment
  ): Promise<BrokerTestResult>;
  fetchHoldings(
    token: string,
    env: BrokerEnvironment
  ): Promise<BrokerSyncResult>;
}

// --- Typed errors for graceful API handling --------------------------------

export class BrokerAuthError extends Error {
  constructor(message = "Invalid or unauthorized broker credentials") {
    super(message);
    this.name = "BrokerAuthError";
  }
}

export class BrokerRateLimitError extends Error {
  constructor(message = "Broker API rate limit reached, please retry shortly") {
    super(message);
    this.name = "BrokerRateLimitError";
  }
}

export class BrokerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrokerError";
  }
}
