import { Prisma } from "@prisma/client";
import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { watchlistItemUpdateSchema } from "@/lib/validation";
import {
  fail,
  notFound,
  ok,
  parseJson,
  unauthorized,
  withErrorHandling,
} from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/** Extracts a Yahoo symbol from a pasted quote/chart URL, or returns it as-is. */
function extractYahooSymbol(input: string): string {
  const s = input.trim();
  const m =
    s.match(/quote\/([^/?#]+)/i) ||
    s.match(/chart\/([^/?#]+)/i) ||
    s.match(/symbol=([^&?#]+)/i);
  return m ? decodeURIComponent(m[1]) : s;
}

/** Edit a watchlist item's notes and/or Yahoo symbol override. */
export const PATCH = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const parsed = await parseJson(req, watchlistItemUpdateSchema);
  if (!parsed.success) return parsed.response;

  const item = await prisma.watchlistItem.findFirst({
    where: { id: ctx.params.id, watchlist: { userId } },
  });
  if (!item) return notFound("Watchlist item");

  const data: { notes?: string | null; yahooSymbol?: string } = {};
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  if (parsed.data.yahooSymbol !== undefined) {
    data.yahooSymbol = extractYahooSymbol(parsed.data.yahooSymbol);
  }

  try {
    const updated = await prisma.watchlistItem.update({
      where: { id: item.id },
      data,
    });
    return ok({ item: updated });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("That symbol is already on this section", 409);
    }
    throw e;
  }
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const item = await prisma.watchlistItem.findFirst({
    where: { id: ctx.params.id, watchlist: { userId } },
  });
  if (!item) return notFound("Watchlist item");

  await prisma.watchlistItem.delete({ where: { id: item.id } });
  return ok({ deleted: true });
});
