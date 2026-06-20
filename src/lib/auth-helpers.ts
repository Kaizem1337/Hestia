import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Returns the authenticated user's id, or null if not signed in. */
export async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/**
 * Returns the authenticated user id or throws `UnauthorizedError`. Use in API
 * routes wrapped with `withErrorHandling`-style guards, or catch explicitly.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new UnauthorizedError();
  return id;
}

/** Loads the current user with settings, ensuring default settings exist. */
export async function getCurrentUser() {
  const id = await getUserId();
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { settings: true },
  });
  return user;
}

/** Returns the user's settings, creating defaults on first access. */
export async function ensureUserSettings(userId: string) {
  const existing = await prisma.userSettings.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.userSettings.create({ data: { userId } });
}
