import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { getBrokerConnector } from "@/lib/brokers";
import { brokerConnectionSchema } from "@/lib/validation";
import { fail, ok, parseJson, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Lists the user's broker connections WITHOUT exposing any token. */
export const GET = withErrorHandling(async () => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const connections = await prisma.brokerConnection.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      provider: true,
      environment: true,
      label: true,
      status: true,
      lastSyncAt: true,
      lastSyncMessage: true,
      encryptedToken: true,
    },
  });

  // Never leak the token; only report whether one is stored.
  const safe = connections.map(({ encryptedToken, ...c }) => ({
    ...c,
    hasToken: Boolean(encryptedToken),
  }));
  return ok({ connections: safe });
});

/** Connects (or re-connects) a broker after verifying the credentials. */
export const POST = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const parsed = await parseJson(req, brokerConnectionSchema);
  if (!parsed.success) return parsed.response;
  const { provider, environment, credential, label } = parsed.data;

  const connector = getBrokerConnector(provider);
  if (!connector) return fail("Unsupported broker provider", 400);

  // Verify the credential before storing it.
  const test = await connector.testConnection(credential, environment);
  if (!test.ok) {
    return fail(test.message || "Could not verify broker credentials", 400);
  }

  const encryptedToken = encrypt(credential);
  const connection = await prisma.brokerConnection.upsert({
    where: {
      userId_provider_environment: { userId, provider, environment },
    },
    create: {
      userId,
      provider,
      environment,
      label: label ?? test.accountName ?? null,
      encryptedToken,
      status: "SUCCESS",
      lastSyncMessage: "Connected",
    },
    update: {
      encryptedToken,
      label: label ?? test.accountName ?? undefined,
      status: "SUCCESS",
      lastSyncMessage: "Reconnected",
    },
    select: {
      id: true,
      provider: true,
      environment: true,
      label: true,
      status: true,
    },
  });

  return ok({ connection, baseCurrency: test.baseCurrency }, { status: 201 });
});
