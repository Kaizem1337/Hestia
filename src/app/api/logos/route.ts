import { prisma } from "@/lib/prisma";
import { resolveLogo } from "@/lib/logos";

export const dynamic = "force-dynamic";

// Positive results are cached 30 days; misses are NOT trusted from cache so a
// newly-added logo.dev token (or a transient provider failure) self-heals on
// the next request instead of being stuck behind a 30-day negative cache.
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Resolves a holding to a clean logo image and 302-redirects to it.
 *   GET /api/logos?symbol=AAPL&yahooSymbol=AAPL&isin=US...&name=Apple%20Inc.
 * Returns 404 when no logo is found, so an <img onError> can fall back to a
 * monogram. Manual per-holding overrides are applied client-side, not here.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get("symbol")?.trim() ?? "";
    const yahooSymbol = url.searchParams.get("yahooSymbol")?.trim() ?? "";
    const isin = url.searchParams.get("isin")?.trim() ?? "";
    const name = url.searchParams.get("name")?.trim() ?? "";

    const key = (isin || yahooSymbol || symbol).toUpperCase();
    if (!key) return new Response(null, { status: 404 });

    // Only trust a *positive* cache hit. Null/expired rows fall through to a
    // fresh resolve, so misses never get stuck (auto-heals poisoned caches).
    const cached = await prisma.logoCache
      .findUnique({ where: { key } })
      .catch(() => null);
    let resolvedUrl: string | null = null;
    if (cached?.url && Date.now() - cached.updatedAt.getTime() < TTL_MS) {
      resolvedUrl = cached.url;
    } else {
      const result = await resolveLogo({ symbol, yahooSymbol, isin, name });
      resolvedUrl = result.url;
      await prisma.logoCache
        .upsert({
          where: { key },
          create: { key, url: result.url, source: result.source },
          update: { url: result.url, source: result.source },
        })
        .catch(() => {
          /* cache write is best-effort */
        });
    }

    if (!resolvedUrl) return new Response(null, { status: 404 });

    return new Response(null, {
      status: 302,
      headers: {
        Location: resolvedUrl,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
