import { getUserId, ensureUserSettings } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { settingsUpdateSchema } from "@/lib/validation";
import { ok, parseJson, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const settings = await ensureUserSettings(userId);
  // Include the DB-backed profile so the settings UI doesn't rely on the
  // (stale) NextAuth session for name/email/avatar.
  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, image: true },
  });
  return ok({ settings, profile });
});

export const PATCH = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const parsed = await parseJson(req, settingsUpdateSchema);
  if (!parsed.success) return parsed.response;

  await ensureUserSettings(userId);
  const settings = await prisma.userSettings.update({
    where: { userId },
    data: {
      baseCurrency: parsed.data.baseCurrency ?? undefined,
      priceInterval: parsed.data.priceInterval ?? undefined,
      theme: parsed.data.theme ?? undefined,
      accountCurrencies:
        parsed.data.accountCurrencies !== undefined
          ? JSON.stringify(parsed.data.accountCurrencies)
          : undefined,
    },
  });
  return ok({ settings });
});
