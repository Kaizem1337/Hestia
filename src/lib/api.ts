import { NextResponse } from "next/server";
import { z, ZodError, type ZodTypeAny } from "zod";

/** Standard JSON success response. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

/** Standard JSON error response. */
export function fail(message: string, status = 400, extra?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, details: extra },
    { status }
  );
}

export const unauthorized = () => fail("Unauthorized", 401);
export const notFound = (what = "Resource") => fail(`${what} not found`, 404);

/** Parses + validates a JSON body against a Zod schema. */
export async function parseJson<S extends ZodTypeAny>(
  request: Request,
  schema: S
): Promise<
  | { success: true; data: z.output<S> }
  | { success: false; response: NextResponse }
> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { success: false, response: fail("Invalid JSON body", 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      response: fail("Validation failed", 422, flattenZod(parsed.error)),
    };
  }
  return { success: true, data: parsed.data };
}

export function flattenZod(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Wraps a route handler with a consistent try/catch so unexpected errors become
 * clean 500 responses instead of leaking stack traces to the client.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("[api] Unhandled error:", err);
      return fail("Something went wrong. Please try again.", 500);
    }
  };
}
