import { getUserId } from "@/lib/auth-helpers";
import { parseIbkrCsv } from "@/lib/brokers";
import { fail, ok, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Parses an uploaded IBKR Activity Statement and returns a preview.
 * Nothing is saved here — the user reviews, then POSTs to /confirm.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return fail("No file uploaded. Attach an IBKR CSV export.", 400);
  }
  if (file.size > 10 * 1024 * 1024) {
    return fail("File too large (max 10 MB).", 400);
  }

  const text = Buffer.from(await file.arrayBuffer()).toString("utf8");
  const result = parseIbkrCsv(text);

  if (result.holdings.length === 0 && result.errors.length > 0) {
    return ok({ preview: result, fileName: file.name });
  }
  return ok({ preview: result, fileName: file.name });
});
