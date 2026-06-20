import { prisma } from "@/lib/prisma";
import type { NormalizedHolding } from "./types";

export interface SaveHoldingsResult {
  imported: number;
  updated: number;
  skipped: number;
}

/**
 * Persists normalized holdings for a user.
 *
 * Duplicates are detected by the (userId, yahooSymbol, source) unique key:
 *   - merge=false (default): existing rows are left untouched and counted as
 *     skipped, so re-importing the same file never silently doubles positions.
 *   - merge=true: existing rows have quantity/avgCost/metadata updated.
 */
export async function saveImportedHoldings(
  userId: string,
  holdings: NormalizedHolding[],
  opts: { merge?: boolean; brokerConnectionId?: string | null } = {}
): Promise<SaveHoldingsResult> {
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const h of holdings) {
    let existing = await prisma.holding.findUnique({
      where: {
        userId_yahooSymbol_source: {
          userId,
          yahooSymbol: h.yahooSymbol,
          source: h.source,
        },
      },
    });

    if (!existing && opts.merge && opts.brokerConnectionId) {
      const repairMatchers = [
        { symbol: h.symbol },
        ...(h.isin ? [{ isin: h.isin }] : []),
      ];
      existing = await prisma.holding.findFirst({
        where: {
          userId,
          source: h.source,
          brokerConnectionId: opts.brokerConnectionId,
          OR: repairMatchers,
        },
      });
    }

    if (existing) {
      if (opts.merge) {
        await prisma.holding.update({
          where: { id: existing.id },
          data: {
            symbol: h.symbol,
            yahooSymbol: h.yahooSymbol,
            quantity: h.quantity,
            avgCost: h.avgCost,
            name: h.name ?? existing.name,
            exchange: h.exchange ?? existing.exchange,
            isin: h.isin ?? existing.isin,
            currency: h.currency,
            accountName: h.accountName ?? existing.accountName,
            brokerConnectionId:
              opts.brokerConnectionId ?? existing.brokerConnectionId,
          },
        });
        updated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    await prisma.holding.create({
      data: {
        userId,
        symbol: h.symbol,
        yahooSymbol: h.yahooSymbol,
        name: h.name ?? null,
        exchange: h.exchange ?? null,
        isin: h.isin ?? null,
        currency: h.currency,
        quantity: h.quantity,
        avgCost: h.avgCost,
        source: h.source,
        accountName: h.accountName ?? null,
        brokerConnectionId: opts.brokerConnectionId ?? null,
      },
    });
    imported += 1;
  }

  return { imported, updated, skipped };
}
