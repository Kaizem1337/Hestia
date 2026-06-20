import { getUserId } from "@/lib/auth-helpers";
import { getPortfolio } from "@/lib/portfolio/service";
import { ok, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  const portfolio = await getPortfolio(userId, { force });
  return ok(portfolio);
});
