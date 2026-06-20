import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validation";
import { fail, ok, parseJson, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

export const PATCH = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const parsed = await parseJson(req, profileUpdateSchema);
  if (!parsed.success) return parsed.response;
  const { name, email } = parsed.data;

  if (email) {
    const taken = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) return fail("That email is already in use", 409);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: name === undefined ? undefined : name,
      email: email ?? undefined,
    },
    select: { id: true, name: true, email: true, image: true },
  });
  return ok({ user });
});
