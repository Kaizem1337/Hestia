import { getUserId, ensureUserSettings } from "@/lib/auth-helpers";
import { getRatesToBase } from "@/lib/fx";
import { SUPPORTED_CURRENCY_CODES } from "@/lib/currency";
import { ok, unauthorized, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Current FX rates for the major supported currencies against the user's base
 * currency. `?force=1` bypasses the FX cache and re-fetches live rates.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const settings = await ensureUserSettings(userId);
  const base = settings.baseCurrency;
  const force = new URL(req.url).searchParams.get("force") === "1";

  const currencies = SUPPORTED_CURRENCY_CODES.filter((c) => c !== base);
  const map = await getRatesToBase(currencies, base, { force });

  let latest = 0;
  const rates = currencies.map((currency) => {
    const r = map.get(currency);
    if (r) latest = Math.max(latest, r.asOf.getTime());
    return {
      currency,
      // rate = how many <base> per 1 <currency>.
      rate: r && !r.missing ? r.rate : null,
    };
  });

  return ok({
    base,
    rates,
    asOf: latest ? new Date(latest).toISOString() : null,
  });
});
