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
 * Duplicates are detected by the (userId, source, accountKey, yahooSymbol)
 * unique key, so the same instrument can be held separately across multiple
 * accounts (e.g. two IBKR accounts), and re-importing never doubles positions.
 *   - merge=false (default): existing rows are left untouched (skipped).
 *   - merge=true: existing rows are updated.
 *
 * `accountKey` comes from the holding's accountName (IBKR account number /
 * Trading 212 account id; "" for manual entries).
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
    const accountKey = h.accountName ?? "";

    let existing = await prisma.holding.findUnique({
      where: {
        userId_source_accountKey_yahooSymbol: {
          userId,
          source: h.source,
          accountKey,
          yahooSymbol: h.yahooSymbol,
        },
      },
    });

    // Repair: a position whose Yahoo symbol changed but is the same instrument.
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
            accountKey,
            purchaseDate: h.purchaseDate
              ? new Date(h.purchaseDate)
              : existing.purchaseDate,
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
        accountKey,
        purchaseDate: h.purchaseDate ? new Date(h.purchaseDate) : null,
        brokerConnectionId: opts.brokerConnectionId ?? null,
      },
    });
    imported += 1;
  }

  // Register distinct accounts so they can be nicknamed and filtered.
  // Best-effort: never let account bookkeeping break a holdings import.
  try {
    const seen = new Set<string>();
    for (const h of holdings) {
      const accountKey = h.accountName ?? "";
      if (!accountKey || h.source === "MANUAL") continue;
      const key = `${h.source}::${accountKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      await prisma.account.upsert({
        where: {
          userId_source_accountKey: { userId, source: h.source, accountKey },
        },
        create: { userId, source: h.source, accountKey },
        update: {},
      });
    }
  } catch {
    /* account registration is non-critical */
  }

  return { imported, updated, skipped };
}
