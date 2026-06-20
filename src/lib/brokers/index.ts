import type { BrokerProvider } from "@/lib/enums";
import { Trading212Connector } from "./trading212";
import type { BrokerConnector } from "./types";

export * from "./types";
export { parseIbkrCsv } from "./ibkr-import";
export { parseBasketWorkbook } from "./basket-import";
export type { BasketItem, BasketImportResult } from "./basket-import";

/**
 * Returns the API connector for a given broker provider, or null for
 * providers that are file-import only (IBKR, MANUAL).
 *
 * Add new API brokers by registering them here.
 */
export function getBrokerConnector(
  provider: BrokerProvider
): BrokerConnector | null {
  switch (provider) {
    case "TRADING212":
      return new Trading212Connector();
    default:
      return null;
  }
}
