import { getUserId } from "@/lib/auth-helpers";
import { parseBasketWorkbook } from "@/lib/brokers";
import { fail, ok, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Parses an uploaded basket.xlsx and returns a watchlist preview (no save). */
export const POST = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return fail("No file uploaded. Attach a basket .xlsx file.", 400);
  }
  if (file.size > 10 * 1024 * 1024) {
    return fail("File too large (max 10 MB).", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = parseBasketWorkbook(buffer);
  return ok({ preview: result, fileName: file.name });
});
