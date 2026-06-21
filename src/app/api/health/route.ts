import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness probe for Docker / Portainer healthchecks and uptime monitors.
 * Intentionally cheap and dependency-free (no DB or network calls) so a
 * transient database/provider hiccup never triggers a container restart loop.
 * Not matched by the auth middleware, so it needs no session.
 */
export async function GET() {
  return NextResponse.json(
    { status: "ok", uptime: Math.round(process.uptime()) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
