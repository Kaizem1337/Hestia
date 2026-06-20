import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getEnv } from "@/lib/env";

/**
 * Avatar storage abstraction.
 *
 * Two drivers are provided so the app works without external object storage:
 *   - "local"   : writes files under ./public/uploads/avatars and returns a
 *                 public URL (good for local dev / single-server deploys).
 *   - "dataurl" : returns a base64 data URL stored directly in the DB
 *                 (no filesystem needed; good for serverless/dev).
 *
 * Swap in S3/GCS by implementing `AvatarStorage` and registering it below.
 */
export interface SavedAvatar {
  /** Value to persist on User.image (URL or data URL). */
  url: string;
}

export interface AvatarStorage {
  save(
    userId: string,
    data: { buffer: Buffer; contentType: string }
  ): Promise<SavedAvatar>;
}

const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

export function validateAvatar(contentType: string, size: number): string | null {
  if (!ALLOWED[contentType]) {
    return "Unsupported image type. Use PNG, JPEG, WEBP or GIF.";
  }
  if (size > MAX_AVATAR_BYTES) {
    return "Image is too large (max 2 MB).";
  }
  return null;
}

class LocalAvatarStorage implements AvatarStorage {
  async save(userId: string, data: { buffer: Buffer; contentType: string }) {
    const ext = ALLOWED[data.contentType] ?? "png";
    const dir = path.join(process.cwd(), "public", "uploads", "avatars");
    await fs.mkdir(dir, { recursive: true });
    const fileName = `${userId}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    await fs.writeFile(path.join(dir, fileName), data.buffer);
    return { url: `/uploads/avatars/${fileName}` };
  }
}

class DataUrlAvatarStorage implements AvatarStorage {
  async save(_userId: string, data: { buffer: Buffer; contentType: string }) {
    const b64 = data.buffer.toString("base64");
    return { url: `data:${data.contentType};base64,${b64}` };
  }
}

let storage: AvatarStorage | null = null;
export function getAvatarStorage(): AvatarStorage {
  if (storage) return storage;
  storage =
    getEnv().AVATAR_STORAGE_DRIVER === "dataurl"
      ? new DataUrlAvatarStorage()
      : new LocalAvatarStorage();
  return storage;
}
