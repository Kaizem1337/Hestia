import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  initialsFromName,
} from "./utils";
import { convert } from "./fx/convert";

describe("formatCurrency", () => {
  it("formats USD with 2 decimals", () => {
    expect(formatCurrency(1234.5, "USD")).toBe("$1,234.50");
  });
  it("uses 0 decimals for zero-decimal currencies", () => {
    expect(formatCurrency(2032000, "KRW")).toBe("₩2,032,000");
  });
  it("returns em dash for null", () => {
    expect(formatCurrency(null, "USD")).toBe("—");
  });
  it("falls back gracefully for unknown currency codes", () => {
    expect(formatCurrency(10, "ZZZ")).toContain("ZZZ");
  });
});

describe("formatPercent / formatSignedCurrency", () => {
  it("adds a sign for positive percents", () => {
    expect(formatPercent(2.23, { signed: true })).toBe("+2.23%");
    expect(formatPercent(-9.04, { signed: true })).toBe("-9.04%");
  });
  it("signs currency amounts", () => {
    expect(formatSignedCurrency(216000, "KRW")).toBe("+₩216,000");
  });
});

describe("convert (FX)", () => {
  it("multiplies amount by rate", () => {
    expect(convert(100, 1.2)).toBeCloseTo(120, 6);
    // e.g. 8,128,000 KRW at ~0.00057 KRW->GBP ~ 4,633 GBP
    expect(convert(8128000, 0.00057)).toBeCloseTo(4632.96, 2);
  });
});

describe("initialsFromName", () => {
  it("uses first and last initial", () => {
    expect(initialsFromName("Faris Awan")).toBe("FA");
  });
  it("falls back to email", () => {
    expect(initialsFromName(null, "demo@x.com")).toBe("DE");
  });
});
