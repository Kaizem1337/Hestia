import { prisma } from "@/lib/prisma";
import { hashPassword, hashToken } from "@/lib/password";
import { passwordResetConfirmSchema } from "@/lib/validation";
import { fail, ok, parseJson, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const parsed = await parseJson(req, passwordResetConfirmSchema);
  if (!parsed.success) return parsed.response;
  const { token, password } = parsed.data;

  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return fail("This reset link is invalid or has expired", 400);
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate any other outstanding tokens for this user.
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return ok({ message: "Password updated. You can now sign in." });
});
