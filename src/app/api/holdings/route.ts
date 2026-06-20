import { Prisma } from "@prisma/client";
import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { holdingCreateSchema } from "@/lib/validation";
import { fail, ok, parseJson, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const parsed = await parseJson(req, holdingCreateSchema);
  if (!parsed.success) return parsed.response;
  const d = parsed.data;

  try {
    const holding = await prisma.holding.create({
      data: {
        userId,
        symbol: d.symbol,
        yahooSymbol: d.yahooSymbol,
        name: d.name ?? null,
        exchange: d.exchange ?? null,
        isin: d.isin ?? null,
        currency: d.currency,
        quantity: d.quantity,
        avgCost: d.avgCost,
        source: d.source,
        accountName: d.accountName ?? null,
      },
    });
    return ok({ holding }, { status: 201 });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return fail(
        "You already track this symbol from this source. Edit it instead.",
        409
      );
    }
    throw e;
  }
});
