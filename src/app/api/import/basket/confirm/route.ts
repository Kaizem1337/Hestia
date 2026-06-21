import { Prisma } from "@prisma/client";
import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { basketConfirmSchema } from "@/lib/validation";
import { fail, ok, parseJson, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Derives a friendly section name from an uploaded file name. */
function sectionNameFromFile(fileName?: string): string {
  if (!fileName) return "Imported basket";
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  return base.replace(/\.[^.]+$/, "").trim() || "Imported basket";
}

export const POST = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const parsed = await parseJson(req, basketConfirmSchema);
  if (!parsed.success) return parsed.response;
  const { items, fileName, name } = parsed.data;

  let watchlistId = parsed.data.watchlistId;
  if (watchlistId) {
    const wl = await prisma.watchlist.findFirst({
      where: { id: watchlistId, userId },
    });
    if (!wl) return fail("Watchlist not found", 404);
  } else {
    // Basket imports land in their own new section.
    const sectionName = (name?.trim() || sectionNameFromFile(fileName)).slice(
      0,
      80
    );
    const order = await prisma.watchlist.count({ where: { userId } });
    const wl = await prisma.watchlist.create({
      data: { userId, name: sectionName, order },
    });
    watchlistId = wl.id;
  }

  let imported = 0;
  let skipped = 0;
  for (const item of items) {
    try {
      await prisma.watchlistItem.create({
        data: {
          watchlistId,
          symbol: item.symbol,
          yahooSymbol: item.yahooSymbol,
          name: item.name ?? null,
          exchange: item.exchange ?? null,
          currency: item.currency ?? null,
          notes: item.notes ?? null,
        },
      });
      imported += 1;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        skipped += 1; // already on the watchlist
      } else {
        throw e;
      }
    }
  }

  await prisma.importJob.create({
    data: {
      userId,
      type: "BASKET_XLSX",
      status: "SUCCESS",
      totalRows: items.length,
      importedRows: imported,
      skippedRows: skipped,
      fileName: fileName ?? null,
    },
  });

  return ok({ result: { imported, skipped }, watchlistId });
});
