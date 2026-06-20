/**
 * Standalone price + FX refresh job.
 *
 * Run on a schedule via system cron, e.g. every 15 minutes:
 *   star/15 * * * *  cd /app && npm run refresh:prices
 * (Alternatively call POST /api/cron/refresh with the CRON_SECRET.)
 */
import { prisma } from "../src/lib/prisma";
import { refreshQuotes } from "../src/lib/market-data";
import { getRatesToBase } from "../src/lib/fx";

async function main() {
  const [holdings, items, settings] = await Promise.all([
    prisma.holding.findMany({ select: { yahooSymbol: true } }),
    prisma.watchlistItem.findMany({ select: { yahooSymbol: true } }),
    prisma.userSettings.findMany({ select: { baseCurrency: true } }),
  ]);

  const symbols = Array.from(
    new Set([
      ...holdings.map((h) => h.yahooSymbol),
      ...items.map((i) => i.yahooSymbol),
    ])
  );

  console.info(`[refresh] refreshing ${symbols.length} symbols...`);
  const quotes = symbols.length ? await refreshQuotes(symbols) : [];
  console.info(`[refresh] got ${quotes.length} quotes`);

  const bases = Array.from(new Set(settings.map((s) => s.baseCurrency)));
  const currencies = Array.from(
    new Set(quotes.map((q) => q.currency).filter(Boolean) as string[])
  );
  for (const base of bases) {
    if (currencies.length) await getRatesToBase(currencies, base);
  }
  console.info(`[refresh] refreshed FX into ${bases.length} base currencies`);
}

main()
  .catch((e) => {
    console.error("[refresh] failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
