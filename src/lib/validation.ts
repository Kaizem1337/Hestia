import { z } from "zod";
import { SUPPORTED_CURRENCY_CODES } from "@/lib/currency";

const currencyEnum = z
  .string()
  .refine((c) => SUPPORTED_CURRENCY_CODES.includes(c as never), {
    message: "Unsupported currency",
  });

export const priceIntervalEnum = z.enum([
  "MANUAL",
  "M5",
  "M15",
  "M30",
  "H1",
  "DAILY",
]);

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100).optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).nullable().optional(),
  email: z.string().trim().toLowerCase().email().optional(),
});

export const settingsUpdateSchema = z.object({
  baseCurrency: currencyEnum.optional(),
  priceInterval: priceIntervalEnum.optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

export const holdingCreateSchema = z.object({
  symbol: z.string().trim().min(1).max(40),
  yahooSymbol: z.string().trim().min(1).max(40),
  name: z.string().trim().max(200).optional().nullable(),
  exchange: z.string().trim().max(80).optional().nullable(),
  isin: z.string().trim().max(20).optional().nullable(),
  currency: z.string().trim().min(2).max(8),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  avgCost: z.coerce.number().min(0, "Average cost cannot be negative").default(0),
  source: z.enum(["MANUAL", "TRADING212", "IBKR"]).default("MANUAL"),
  accountName: z.string().trim().max(120).optional().nullable(),
});

export const holdingUpdateSchema = z.object({
  quantity: z.coerce.number().positive().optional(),
  avgCost: z.coerce.number().min(0).optional(),
  name: z.string().trim().max(200).optional().nullable(),
  currency: z.string().trim().min(2).max(8).optional(),
});

export const watchlistItemCreateSchema = z.object({
  symbol: z.string().trim().min(1).max(40),
  yahooSymbol: z.string().trim().min(1).max(40),
  name: z.string().trim().max(200).optional().nullable(),
  exchange: z.string().trim().max(80).optional().nullable(),
  currency: z.string().trim().max(8).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  watchlistId: z.string().optional(),
});

export const watchlistCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

const brokerCredentialSchema = z
  .string()
  .trim()
  .min(8, "Trading 212 credential looks too short")
  .max(2000);

export const brokerConnectionSchema = z
  .object({
    provider: z.enum(["TRADING212"]),
    environment: z.enum(["LIVE", "DEMO"]).default("LIVE"),
    credential: brokerCredentialSchema.optional(),
    // Backward-compatible request field for older clients.
    apiKey: brokerCredentialSchema.optional(),
    label: z.string().trim().max(80).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.credential && !value.apiKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Trading 212 credential is required",
        path: ["credential"],
      });
    }
  })
  .transform(({ apiKey, credential, ...value }) => ({
    ...value,
    credential: credential ?? apiKey!,
  }));

export const importConfirmSchema = z.object({
  // Array of normalized holdings the user confirmed from the preview.
  holdings: z
    .array(
      z.object({
        symbol: z.string().min(1),
        yahooSymbol: z.string().min(1),
        name: z.string().optional().nullable(),
        exchange: z.string().optional().nullable(),
        isin: z.string().optional().nullable(),
        currency: z.string().min(2),
        quantity: z.number(),
        avgCost: z.number(),
        accountName: z.string().optional().nullable(),
        source: z.enum(["MANUAL", "TRADING212", "IBKR"]),
      })
    )
    .min(1),
  // When true, existing same-source holdings are updated; otherwise duplicates
  // are skipped.
  merge: z.boolean().default(false),
  fileName: z.string().optional(),
});

export const basketConfirmSchema = z.object({
  items: z
    .array(
      z.object({
        symbol: z.string().min(1),
        yahooSymbol: z.string().min(1),
        name: z.string().optional().nullable(),
        exchange: z.string().optional().nullable(),
        currency: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .min(1),
  watchlistId: z.string().optional(),
  fileName: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type HoldingCreateInput = z.infer<typeof holdingCreateSchema>;
