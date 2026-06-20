export { default } from "next-auth/middleware";

/**
 * Protects authenticated app pages. Unauthenticated users are redirected to the
 * sign-in page configured in `authOptions.pages.signIn`.
 *
 * API routes are intentionally NOT matched here — they perform their own
 * per-request auth checks and return JSON 401s rather than HTML redirects.
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/holdings/:path*",
    "/watchlist/:path*",
    "/import/:path*",
    "/brokers/:path*",
    "/settings/:path*",
    "/profile/:path*",
  ],
};
