import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ok, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Lists the user's broker accounts (IBKR numbers / Trading 212 APIs). */
export const GET = withErrorHandling(async () => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: [{ source: "asc" }, { createdAt: "asc" }],
  });

  const out = accounts.map((a) => ({
    id: a.id,
    source: a.source,
    accountKey: a.accountKey,
    nickname: a.nickname,
    defaultLabel:
      a.source === "IBKR" ? `IBKR · ${a.accountKey}` : a.accountKey,
  }));
  return ok({ accounts: out });
});
