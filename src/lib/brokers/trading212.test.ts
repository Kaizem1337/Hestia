import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatTrading212AuthorizationHeader,
  normalizeTrading212Ticker,
  Trading212Connector,
} from "./trading212";

const requiredEnv = {
  DATABASE_URL: "file:./test.db",
  ENCRYPTION_KEY: "12345678901234567890123456789012",
  NEXTAUTH_SECRET: "12345678901234567890123456789012",
  TRADING212_DEMO_BASE_URL: "https://demo.test",
  TRADING212_LIVE_BASE_URL: "https://live.test",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Trading212Connector", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    Object.assign(process.env, requiredEnv);
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("formats current key/secret credentials as HTTP Basic auth", () => {
    expect(formatTrading212AuthorizationHeader("key:secret")).toBe(
      `Basic ${Buffer.from("key:secret", "utf8").toString("base64")}`
    );
  });

  it("splits key/secret credentials only at the first colon", () => {
    expect(formatTrading212AuthorizationHeader("key:secret:with:colons")).toBe(
      `Basic ${Buffer.from("key:secret:with:colons", "utf8").toString(
        "base64"
      )}`
    );
  });

  it("preserves prebuilt Basic and legacy one-piece credentials", () => {
    expect(formatTrading212AuthorizationHeader("Basic abc123")).toBe(
      "Basic abc123"
    );
    expect(formatTrading212AuthorizationHeader("legacy-api-key")).toBe(
      "legacy-api-key"
    );
  });

  it("rejects blank credentials before calling Trading 212", async () => {
    const connector = new Trading212Connector();
    const result = await connector.testConnection("   ", "LIVE");

    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tests the connection against the current account summary endpoint", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        cash: { availableToTrade: 120.5 },
        currency: "GBP",
        id: 123456,
      })
    );

    const connector = new Trading212Connector();
    const result = await connector.testConnection("key:secret", "DEMO");
    const [url, init] = fetchMock.mock.calls[0];

    expect(result).toMatchObject({
      ok: true,
      baseCurrency: "GBP",
      accountName: "Trading 212 #123456",
    });
    expect(url).toBe("https://demo.test/api/v0/equity/account/summary");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: `Basic ${Buffer.from("key:secret", "utf8").toString(
        "base64"
      )}`,
      Accept: "application/json",
    });
  });

  it("syncs current positions and cash from account summary", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          cash: { availableToTrade: 88.12, inPies: 10, reservedForOrders: 2 },
          currency: "GBP",
          id: 987654,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            averagePricePaid: 123.45,
            currentPrice: 150,
            instrument: {
              currency: "USD",
              isin: "US0378331005",
              name: "Apple Inc.",
              ticker: "AAPL_US_EQ",
            },
            quantity: 3.5,
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            currencyCode: "USD",
            isin: "US0378331005",
            name: "Apple Inc.",
            shortName: "Apple",
            ticker: "AAPL_US_EQ",
          },
        ])
      );

    const connector = new Trading212Connector();
    const result = await connector.fetchHoldings("legacy-api-key", "LIVE");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://live.test/api/v0/equity/account/summary",
      "https://live.test/api/v0/equity/positions",
      "https://live.test/api/v0/equity/metadata/instruments",
    ]);
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      Authorization: "legacy-api-key",
    });
    expect(result).toMatchObject({
      baseCurrency: "GBP",
      accountName: "Trading 212 #987654",
      cash: [{ currency: "GBP", amount: 88.12 }],
      warnings: [],
    });
    expect(result.holdings).toEqual([
      {
        accountName: "Trading 212 #987654",
        avgCost: 123.45,
        currency: "USD",
        exchange: undefined,
        isin: "US0378331005",
        name: "Apple Inc.",
        quantity: 3.5,
        source: "TRADING212",
        symbol: "AAPL",
        yahooSymbol: "AAPL",
      },
    ]);
  });

  it("keeps holdings when optional instrument metadata fails", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          cash: { availableToTrade: 0 },
          currency: "GBP",
          id: 123,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            averagePricePaid: 10,
            instrument: {
              currency: "GBP",
              name: "Example PLC",
              ticker: "EXMPL_GB_EQ",
            },
            quantity: 2,
          },
        ])
      )
      .mockResolvedValueOnce(jsonResponse({ error: "nope" }, 500));

    const connector = new Trading212Connector();
    const result = await connector.fetchHoldings("Basic existing", "DEMO");

    expect(result.holdings).toHaveLength(1);
    expect(result.holdings[0]).toMatchObject({
      symbol: "EXMPL",
      yahooSymbol: "EXMPL.L",
      currency: "GBP",
    });
    expect(result.warnings).toEqual([
      "Could not load Trading 212 instrument metadata; symbol names may be limited.",
    ]);
  });

  it("resolves Trading 212 internal symbols through ISIN search", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          cash: { availableToTrade: 0 },
          currency: "USD",
          id: 45302101,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            averagePricePaid: 1259.99886867,
            instrument: {
              currency: "EUR",
              isin: "US78392B1070",
              name: "SK hynix",
              ticker: "HY9Hd",
            },
            quantity: 3.66434456,
          },
          {
            averagePricePaid: 5539.99663685,
            instrument: {
              currency: "USD",
              isin: "US7960508882",
              name: "Samsung Electronics",
              ticker: "SMSNl",
            },
            quantity: 1.07654939,
          },
          {
            averagePricePaid: 283.25011819,
            instrument: {
              currency: "USD",
              isin: "US5738741041",
              name: "Marvell Technology",
              ticker: "MRVL_US_EQ",
            },
            quantity: 16.79243783,
          },
        ])
      )
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse({
          quotes: [
            {
              symbol: "HY9H.F",
              shortname: "SK Hynix Inc. R",
              quoteType: "EQUITY",
              exchDisp: "Frankfurt",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          quotes: [
            {
              symbol: "SMSN.IL",
              shortname: "SAMSUNG ELECTRONICS CO LTD",
              quoteType: "EQUITY",
              exchDisp: "International Orderbook - London",
            },
          ],
        })
      );

    const connector = new Trading212Connector();
    const result = await connector.fetchHoldings("key:secret", "LIVE");

    expect(String(fetchMock.mock.calls[3][0])).toContain("q=US78392B1070");
    expect(String(fetchMock.mock.calls[4][0])).toContain("q=US7960508882");
    expect(result.warnings).toEqual([]);
    expect(result.holdings).toMatchObject([
      {
        symbol: "HY9H.F",
        yahooSymbol: "HY9H.F",
        name: "SK hynix",
        exchange: "Frankfurt",
        isin: "US78392B1070",
        currency: "EUR",
      },
      {
        symbol: "SMSN.IL",
        yahooSymbol: "SMSN.IL",
        name: "Samsung Electronics",
        exchange: "LSE IOB",
        isin: "US7960508882",
        currency: "USD",
      },
      {
        symbol: "MRVL",
        yahooSymbol: "MRVL",
        name: "Marvell Technology",
        isin: "US5738741041",
        currency: "USD",
      },
    ]);
  });
});

describe("normalizeTrading212Ticker", () => {
  it("maps common Trading 212 exchange codes to Yahoo symbols", () => {
    expect(normalizeTrading212Ticker("AAPL_US_EQ", "USD")).toEqual({
      yahooSymbol: "AAPL",
      currency: "USD",
    });
    expect(normalizeTrading212Ticker("VUSA_GB_EQ", "GBP")).toEqual({
      yahooSymbol: "VUSA.L",
      currency: "GBP",
    });
    expect(normalizeTrading212Ticker("0005_HK_EQ", "HKD")).toEqual({
      yahooSymbol: "0005.HK",
      currency: "HKD",
    });
  });
});
