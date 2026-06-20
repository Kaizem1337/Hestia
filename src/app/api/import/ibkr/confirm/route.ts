import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { saveImportedHoldings } from "@/lib/portfolio/save";
import { importConfirmSchema } from "@/lib/validation";
import { ok, parseJson, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const parsed = await parseJson(req, importConfirmSchema);
  if (!parsed.success) return parsed.response;
  const { holdings, merge, fileName } = parsed.data;

  const result = await saveImportedHoldings(userId, holdings, { merge });

  await prisma.importJob.create({
    data: {
      userId,
      type: "IBKR_CSV",
      status: "SUCCESS",
      totalRows: holdings.length,
      importedRows: result.imported + result.updated,
      skippedRows: result.skipped,
      fileName: fileName ?? null,
    },
  });

  return ok({ result });
});
