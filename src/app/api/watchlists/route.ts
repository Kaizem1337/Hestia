import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getWatchlists } from "@/lib/watchlist/service";
import { watchlistCreateSchema } from "@/lib/validation";
import { ok, parseJson, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  const watchlists = await getWatchlists(userId, { force });
  return ok({ watchlists });
});

export const POST = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const parsed = await parseJson(req, watchlistCreateSchema);
  if (!parsed.success) return parsed.response;
  const order = await prisma.watchlist.count({ where: { userId } });
  const watchlist = await prisma.watchlist.create({
    data: { userId, name: parsed.data.name, order },
  });
  return ok({ watchlist }, { status: 201 });
});
