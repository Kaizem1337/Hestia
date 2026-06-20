import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound, ok, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export const DELETE = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const conn = await prisma.brokerConnection.findFirst({
    where: { id: ctx.params.id, userId },
  });
  if (!conn) return notFound("Broker connection");

  await prisma.brokerConnection.delete({ where: { id: conn.id } });
  return ok({ deleted: true });
});
