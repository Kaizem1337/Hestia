import { describe, it, expect } from "vitest";
import {
  normalizeIbkrSymbol,
  parseBloombergTicker,
  normalizeAnySymbol,
  metaFromYahooSymbol,
} from "./symbols";

describe("normalizeIbkrSymbol", () => {
  it("zero-pads SEHK numeric tickers to 4 digits with .HK", () => {
    const r = normalizeIbkrSymbol("189", "SEHK");
    expect(r.yahooSymbol).toBe("0189.HK");
    expect(r.currency).toBe("HKD");
  });

  it("keeps an already-suffixed symbol untouched", () => {
    const r = normalizeIbkrSymbol("009150.KS", "KRX");
    expect(r.yahooSymbol).toBe("009150.KS");
    expect(r.currency).toBe("KRW");
  });

  it("maps US listings to a bare ticker", () => {
    const r = normalizeIbkrSymbol("NOK", "NYSE");
    expect(r.yahooSymbol).toBe("NOK");
    expect(r.currency).toBe("USD");
  });

  it("falls back to the raw ticker for unknown exchanges", () => {
    const r = normalizeIbkrSymbol("ZZZ", "WEIRD");
    expect(r.yahooSymbol).toBe("ZZZ");
  });
});

describe("parseBloombergTicker", () => {
  it("parses Korean tickers", () => {
    expect(parseBloombergTicker("009150 KS Equity")).toEqual({
      yahooSymbol: "009150.KS",
      currency: "KRW",
      exchange: "KRX",
    });
  });

  it("parses Japanese tickers (JT and JP)", () => {
    expect(parseBloombergTicker("4062 JT Equity")?.yahooSymbol).toBe("4062.T");
    expect(parseBloombergTicker("6981 JP Equity")?.yahooSymbol).toBe("6981.T");
  });

  it("parses Taiwan and US tickers", () => {
    expect(parseBloombergTicker("2449 TT Equity")?.yahooSymbol).toBe("2449.TW");
    expect(parseBloombergTicker("MRVL US Equity")).toEqual({
      yahooSymbol: "MRVL",
      currency: "USD",
      exchange: "US",
    });
  });

  it("returns null for non-Bloomberg input", () => {
    expect(parseBloombergTicker("AAPL")).toBeNull();
  });
});

describe("normalizeAnySymbol", () => {
  it("handles plain US tickers", () => {
    expect(normalizeAnySymbol("AAPL").yahooSymbol).toBe("AAPL");
  });
  it("handles Bloomberg format", () => {
    expect(normalizeAnySymbol("000660 KS Equity").yahooSymbol).toBe("000660.KS");
  });
  it("handles yahoo-suffixed symbols", () => {
    const r = normalizeAnySymbol("0189.hk");
    expect(r.yahooSymbol).toBe("0189.HK");
    expect(r.currency).toBe("HKD");
  });
});

describe("metaFromYahooSymbol", () => {
  it("derives currency from suffix", () => {
    expect(metaFromYahooSymbol("7203.T").currency).toBe("JPY");
    expect(metaFromYahooSymbol("AAPL").currency).toBe("USD");
    expect(metaFromYahooSymbol("HY9H.F")).toEqual({
      currency: "EUR",
      exchange: "Frankfurt",
    });
    expect(metaFromYahooSymbol("SMSN.IL")).toEqual({
      currency: "USD",
      exchange: "LSE IOB",
    });
  });
});
