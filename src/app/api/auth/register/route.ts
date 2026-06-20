import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validation";
import { fail, ok, parseJson, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const parsed = await parseJson(req, registerSchema);
  if (!parsed.success) return parsed.response;
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Avoid leaking which emails are registered with a generic message.
    return fail("An account with that email already exists", 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      name: name ?? null,
      passwordHash,
      settings: { create: {} },
      watchlists: { create: { name: "My Watchlist", isDefault: true } },
    },
    select: { id: true, email: true, name: true },
  });

  return ok({ user }, { status: 201 });
});

export const GET = () => NextResponse.json({ ok: false }, { status: 405 });
