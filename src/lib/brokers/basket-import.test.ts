import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseBasketWorkbook } from "./basket-import";

function toBuffer(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("parseBasketWorkbook", () => {
  it("parses a Bloomberg-style basket with title rows", () => {
    const buf = toBuffer([
      ["My AI Basket"],
      ["2026-06-18"],
      [],
      ["Ticker", "Name", "Current Day Weight (%)", "Close Price ($)"],
      ["009150 KS Equity", "SAMSUNG ELECTRO-MECHANICS CO", 14.28, 1431],
      ["MRVL US Equity", "MARVELL TECHNOLOGY INC", 15.39, 310],
    ]);
    const r = parseBasketWorkbook(buf);
    expect(r.items).toHaveLength(2);
    expect(r.items[0].yahooSymbol).toBe("009150.KS");
    expect(r.items[0].currency).toBe("KRW");
    expect(r.items[1].yahooSymbol).toBe("MRVL");
    expect(r.items[1].currency).toBe("USD");
  });

  it("parses the documented simple column layout", () => {
    const buf = toBuffer([
      ["Symbol", "Company Name", "Exchange", "Currency", "Notes"],
      ["AAPL", "Apple Inc.", "NASDAQ", "USD", "tech"],
      ["0700.HK", "Tencent", "HKEX", "HKD", ""],
    ]);
    const r = parseBasketWorkbook(buf);
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toMatchObject({
      yahooSymbol: "AAPL",
      currency: "USD",
      notes: "tech",
    });
    expect(r.items[1].yahooSymbol).toBe("0700.HK");
    expect(r.items[1].currency).toBe("HKD");
  });

  it("skips duplicate symbols", () => {
    const buf = toBuffer([
      ["Symbol", "Name"],
      ["AAPL", "Apple"],
      ["AAPL", "Apple dupe"],
    ]);
    const r = parseBasketWorkbook(buf);
    expect(r.items).toHaveLength(1);
    expect(r.skippedRows).toBe(1);
  });

  it("reports a clear error when no header is found", () => {
    const buf = toBuffer([
      ["just"],
      ["some"],
      ["data"],
    ]);
    const r = parseBasketWorkbook(buf);
    expect(r.items).toHaveLength(0);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});
