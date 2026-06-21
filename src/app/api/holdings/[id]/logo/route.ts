import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { fail, ok, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const ALLOWED: Record<string, string> = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_BYTES = 1024 * 1024; // 1 MB

async function ownedHolding(userId: string, id: string) {
  return prisma.holding.findFirst({ where: { id, userId } });
}

/** Best-effort removal of a previously uploaded local logo file. */
async function unlinkLocal(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/logos/")) return;
  await fs
    .unlink(path.join(process.cwd(), "public", url.replace(/^\//, "")))
    .catch(() => {});
}

// POST — upload a manual logo override (.svg / .png / .jpg / .webp).
export const POST = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const existing = await ownedHolding(userId, ctx.params.id);
  if (!existing) return fail("Holding not found", 404);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("No image uploaded", 400);

  const ext = ALLOWED[file.type];
  if (!ext) return fail("Use an SVG, PNG, JPEG or WEBP image.", 400);
  if (file.size > MAX_BYTES) return fail("Image is too large (max 1 MB).", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", "logos");
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${existing.id}-${crypto
    .randomBytes(6)
    .toString("hex")}.${ext}`;
  await fs.writeFile(path.join(dir, fileName), buffer);
  const url = `/uploads/logos/${fileName}`;

  await unlinkLocal(existing.logoUrl);
  const holding = await prisma.holding.update({
    where: { id: existing.id },
    data: { logoUrl: url },
    select: { id: true, logoUrl: true },
  });
  return ok({ holding });
});

// DELETE — clear the manual override (revert to auto-resolved / monogram).
export const DELETE = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const existing = await ownedHolding(userId, ctx.params.id);
  if (!existing) return fail("Holding not found", 404);

  await unlinkLocal(existing.logoUrl);
  await prisma.holding.update({
    where: { id: existing.id },
    data: { logoUrl: null },
  });
  return ok({ cleared: true });
});
