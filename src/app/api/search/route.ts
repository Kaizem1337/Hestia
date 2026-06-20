import { getUserId } from "@/lib/auth-helpers";
import { searchSymbols } from "@/lib/market-data";
import { metaFromYahooSymbol } from "@/lib/symbols";
import { ok, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return ok({ results: [] });

  const results = await searchSymbols(q);
  // Enrich with a best-effort native currency derived from the suffix.
  const enriched = results.map((r) => {
    const meta = metaFromYahooSymbol(r.symbol);
    return {
      symbol: r.symbol,
      yahooSymbol: r.symbol,
      name: r.name ?? null,
      exchange: r.exchange ?? meta.exchange ?? null,
      region: r.region ?? null,
      currency: r.currency ?? meta.currency ?? null,
      type: r.type ?? null,
    };
  });
  return ok({ results: enriched });
});
