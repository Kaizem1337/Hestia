import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NormalizedHolding } from "./types";

const prismaMock = vi.hoisted(() => ({
  holding: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { saveImportedHoldings } from "./save";

describe("saveImportedHoldings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("repairs broker rows when a sync resolves a better Yahoo symbol", async () => {
    const holding: NormalizedHolding = {
      symbol: "HY9H.F",
      yahooSymbol: "HY9H.F",
      name: "SK hynix",
      exchange: "Frankfurt",
      isin: "US78392B1070",
      currency: "EUR",
      quantity: 3.66434456,
      avgCost: 1259.99886867,
      accountName: "Trading 212 #45302101",
      source: "TRADING212",
    };

    prismaMock.holding.findUnique.mockResolvedValueOnce(null);
    prismaMock.holding.findFirst.mockResolvedValueOnce({
      id: "old-row",
      symbol: "HY9Hd",
      yahooSymbol: "HY9Hd",
      name: "SK hynix",
      exchange: null,
      isin: "US78392B1070",
      accountName: "Trading 212 #45302101",
      brokerConnectionId: "conn-1",
    });
    prismaMock.holding.update.mockResolvedValueOnce({});

    const result = await saveImportedHoldings("user-1", [holding], {
      merge: true,
      brokerConnectionId: "conn-1",
    });

    expect(prismaMock.holding.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        source: "TRADING212",
        brokerConnectionId: "conn-1",
        OR: [{ symbol: "HY9H.F" }, { isin: "US78392B1070" }],
      },
    });
    expect(prismaMock.holding.update).toHaveBeenCalledWith({
      where: { id: "old-row" },
      data: expect.objectContaining({
        symbol: "HY9H.F",
        yahooSymbol: "HY9H.F",
        quantity: 3.66434456,
        avgCost: 1259.99886867,
        currency: "EUR",
      }),
    });
    expect(prismaMock.holding.create).not.toHaveBeenCalled();
    expect(result).toEqual({ imported: 0, updated: 1, skipped: 0 });
  });
});
