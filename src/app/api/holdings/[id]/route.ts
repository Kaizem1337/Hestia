import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { holdingUpdateSchema } from "@/lib/validation";
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

export const PATCH = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const parsed = await parseJson(req, holdingUpdateSchema);
  if (!parsed.success) return parsed.response;

  // Ownership check scoped by userId prevents cross-user edits.
  const existing = await prisma.holding.findFirst({
    where: { id: ctx.params.id, userId },
  });
  if (!existing) return notFound("Holding");

  // purchaseDate: undefined => unchanged; empty/null => cleared; else parsed.
  let purchaseDate: Date | null | undefined;
  if (parsed.data.purchaseDate === undefined) {
    purchaseDate = undefined;
  } else if (!parsed.data.purchaseDate) {
    purchaseDate = null;
  } else {
    const d = new Date(parsed.data.purchaseDate);
    purchaseDate = Number.isNaN(d.getTime()) ? null : d;
  }

  const holding = await prisma.holding.update({
    where: { id: existing.id },
    data: {
      quantity: parsed.data.quantity ?? undefined,
      avgCost: parsed.data.avgCost ?? undefined,
      name: parsed.data.name === undefined ? undefined : parsed.data.name,
      currency: parsed.data.currency ?? undefined,
      purchaseDate,
    },
  });
  return ok({ holding });
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const existing = await prisma.holding.findFirst({
    where: { id: ctx.params.id, userId },
  });
  if (!existing) return notFound("Holding");

  await prisma.holding.delete({ where: { id: existing.id } });
  return ok({ deleted: true });
});

export const GET = () => fail("Method not allowed", 405);
