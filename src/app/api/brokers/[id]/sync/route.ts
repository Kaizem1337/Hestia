import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import {
  BrokerAuthError,
  BrokerRateLimitError,
  getBrokerConnector,
} from "@/lib/brokers";
import type { BrokerEnvironment, BrokerProvider } from "@/lib/enums";
import { saveImportedHoldings } from "@/lib/portfolio/save";
import { fail, notFound, ok, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/** Syncs holdings from a connected broker into the user's portfolio. */
export const POST = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const conn = await prisma.brokerConnection.findFirst({
    where: { id: ctx.params.id, userId },
  });
  if (!conn) return notFound("Broker connection");
  if (!conn.encryptedToken) {
    return fail("This connection has no stored API credentials. Reconnect it.", 400);
  }

  const connector = getBrokerConnector(conn.provider as BrokerProvider);
  if (!connector) return fail("Unsupported broker provider", 400);

  const token = decrypt(conn.encryptedToken);

  try {
    const result = await connector.fetchHoldings(
      token,
      conn.environment as BrokerEnvironment
    );
    const saved = await saveImportedHoldings(userId, result.holdings, {
      merge: true,
      brokerConnectionId: conn.id,
    });

    const status = result.warnings.length > 0 ? "PARTIAL" : "SUCCESS";
    const message =
      result.warnings.length > 0
        ? result.warnings.join(" ")
        : `Synced ${saved.imported + saved.updated} holdings`;

    await prisma.$transaction([
      prisma.brokerConnection.update({
        where: { id: conn.id },
        data: { status, lastSyncAt: new Date(), lastSyncMessage: message },
      }),
      prisma.syncLog.create({
        data: {
          userId,
          brokerConnectionId: conn.id,
          status,
          message,
          itemsSynced: saved.imported + saved.updated,
        },
      }),
    ]);

    return ok({
      result: saved,
      cash: result.cash,
      baseCurrency: result.baseCurrency,
      warnings: result.warnings,
      status,
    });
  } catch (err) {
    let message = "Sync failed";
    let httpStatus = 502;
    if (err instanceof BrokerAuthError) {
      message =
        "Trading 212 rejected the API credentials. Reconnect with a valid key and secret.";
      httpStatus = 401;
    } else if (err instanceof BrokerRateLimitError) {
      message = "Trading 212 rate limit reached. Try again shortly.";
      httpStatus = 429;
    } else if (err instanceof Error) {
      message = err.message;
    }

    await prisma.$transaction([
      prisma.brokerConnection.update({
        where: { id: conn.id },
        data: { status: "FAILED", lastSyncAt: new Date(), lastSyncMessage: message },
      }),
      prisma.syncLog.create({
        data: { userId, brokerConnectionId: conn.id, status: "FAILED", message },
      }),
    ]);

    return fail(message, httpStatus);
  }
});
