import { prisma } from "@/lib/prisma";
import { createResetToken } from "@/lib/password";
import { passwordResetRequestSchema } from "@/lib/validation";
import { ok, parseJson, withErrorHandling } from "@/lib/api";
import { getMailer } from "@/lib/mailer";

export const POST = withErrorHandling(async (req: Request) => {
  const parsed = await parseJson(req, passwordResetRequestSchema);
  if (!parsed.success) return parsed.response;
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond success to avoid revealing whether an account exists.
  if (user) {
    const { token, tokenHash } = createResetToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const link = `${base}/reset-password?token=${token}`;
    await getMailer().send({
      to: email,
      subject: "Reset your Hestia password",
      text: `Use this link to reset your password (valid for 1 hour):\n${link}`,
    });
  }

  return ok({
    message:
      "If an account exists for that email, a reset link has been sent.",
  });
});
