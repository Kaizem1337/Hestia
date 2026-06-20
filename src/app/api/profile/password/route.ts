import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { passwordChangeSchema } from "@/lib/validation";
import { fail, ok, parseJson, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

export const PATCH = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const parsed = await parseJson(req, passwordChangeSchema);
  if (!parsed.success) return parsed.response;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return unauthorized();

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!valid) return fail("Current password is incorrect", 400);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  return ok({ message: "Password updated" });
});
