import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { accountUpdateSchema } from "@/lib/validation";
import {
  notFound,
  ok,
  parseJson,
  unauthorized,
  withErrorHandling,
} from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/** Set or clear an account's nickname. */
export const PATCH = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const parsed = await parseJson(req, accountUpdateSchema);
  if (!parsed.success) return parsed.response;

  const acct = await prisma.account.findFirst({
    where: { id: ctx.params.id, userId },
  });
  if (!acct) return notFound("Account");

  const updated = await prisma.account.update({
    where: { id: acct.id },
    data: { nickname: parsed.data.nickname ?? null },
  });
  return ok({ account: updated });
});
