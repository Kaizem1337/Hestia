import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound, ok, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export const DELETE = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  // Ownership enforced via the parent watchlist's userId.
  const item = await prisma.watchlistItem.findFirst({
    where: { id: ctx.params.id, watchlist: { userId } },
  });
  if (!item) return notFound("Watchlist item");

  await prisma.watchlistItem.delete({ where: { id: item.id } });
  return ok({ deleted: true });
});
