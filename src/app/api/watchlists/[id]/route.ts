import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { watchlistUpdateSchema } from "@/lib/validation";
import {
  notFound,
  ok,
  parseJson,
  unauthorized,
  withErrorHandling,
} from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/** Rename a watchlist section, or move it up/down in the ordering. */
export const PATCH = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const parsed = await parseJson(req, watchlistUpdateSchema);
  if (!parsed.success) return parsed.response;

  const target = await prisma.watchlist.findFirst({
    where: { id: ctx.params.id, userId },
  });
  if (!target) return notFound("Watchlist");

  if (parsed.data.name !== undefined) {
    await prisma.watchlist.update({
      where: { id: target.id },
      data: { name: parsed.data.name },
    });
  }

  if (parsed.data.direction) {
    // Normalise ordering and swap with the adjacent section in one transaction.
    const lists = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    const ids = lists.map((l) => l.id);
    const idx = ids.indexOf(target.id);
    const swap = parsed.data.direction === "up" ? idx - 1 : idx + 1;
    if (idx !== -1 && swap >= 0 && swap < ids.length) {
      [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
      await prisma.$transaction(
        ids.map((wid, i) =>
          prisma.watchlist.update({ where: { id: wid }, data: { order: i } })
        )
      );
    }
  }

  return ok({ updated: true });
});

/** Delete a watchlist section (its items cascade). */
export const DELETE = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const target = await prisma.watchlist.findFirst({
    where: { id: ctx.params.id, userId },
  });
  if (!target) return notFound("Watchlist");

  await prisma.watchlist.delete({ where: { id: target.id } });
  return ok({ deleted: true });
});
