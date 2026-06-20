import { z } from "zod";

/**
 * Server-side environment validation.
 *
 * This module must only ever be imported from server code. It throws on boot if
 * required secrets are missing, which surfaces misconfiguration early instead of
 * at the first request.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXTAUTH_SECRET: z
    .string()
    .min(16, "NEXTAUTH_SECRET must be at least 16 characters"),
  NEXTAUTH_URL: z.string().url().optional(),
  ENCRYPTION_KEY: z
    .string()
    .min(16, "ENCRYPTION_KEY is required for token encryption"),
  CRON_SECRET: z.string().min(1).optional(),
  AVATAR_STORAGE_DRIVER: z.enum(["local", "dataurl"]).default("local"),
  PRICE_MIN_REFRESH_SECONDS: z.coerce.number().int().positive().default(60),
  TRADING212_LIVE_BASE_URL: z
    .string()
    .url()
    .default("https://live.trading212.com"),
  TRADING212_DEMO_BASE_URL: z
    .string()
    .url()
    .default("https://demo.trading212.com"),
});

type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
