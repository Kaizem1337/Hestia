import { Prisma } from "@prisma/client";
import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ensureDefaultWatchlist } from "@/lib/watchlist/service";
import { watchlistItemCreateSchema } from "@/lib/validation";
import { fail, ok, parseJson, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const parsed = await parseJson(req, watchlistItemCreateSchema);
  if (!parsed.success) return parsed.response;
  const d = parsed.data;

  // Resolve target watchlist, verifying ownership.
  let watchlistId = d.watchlistId;
  if (watchlistId) {
    const wl = await prisma.watchlist.findFirst({
      where: { id: watchlistId, userId },
    });
    if (!wl) return fail("Watchlist not found", 404);
  } else {
    const wl = await ensureDefaultWatchlist(userId);
    watchlistId = wl.id;
  }

  try {
    const item = await prisma.watchlistItem.create({
      data: {
        watchlistId,
        symbol: d.symbol,
        yahooSymbol: d.yahooSymbol,
        name: d.name ?? null,
        exchange: d.exchange ?? null,
        currency: d.currency ?? null,
        notes: d.notes ?? null,
      },
    });
    return ok({ item }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("That symbol is already on this watchlist", 409);
    }
    throw e;
  }
});
