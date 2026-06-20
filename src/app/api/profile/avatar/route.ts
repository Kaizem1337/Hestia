import { getUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  getAvatarStorage,
  MAX_AVATAR_BYTES,
  validateAvatar,
} from "@/lib/storage";
import { fail, ok, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return fail("No image uploaded", 400);
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return fail("Image is too large (max 2 MB)", 400);
  }

  const validationError = validateAvatar(file.type, file.size);
  if (validationError) return fail(validationError, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await getAvatarStorage().save(userId, {
    buffer,
    contentType: file.type,
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: { image: saved.url },
    select: { id: true, image: true },
  });

  return ok({ image: user.image });
});
