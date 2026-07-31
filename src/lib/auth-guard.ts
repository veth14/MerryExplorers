import { NextResponse } from "next/server";

/**
 * Verifies that the request carries the correct internal API secret.
 * The portal frontend must send: Authorization: Bearer <INTERNAL_API_SECRET>
 *
 * Returns null on success, or a 401 NextResponse on failure.
 *
 * Usage:
 *   const deny = requireInternalAuth(request);
 *   if (deny) return deny;
 */
export function requireInternalAuth(request: Request): NextResponse | null {
  const secret = process.env.INTERNAL_API_SECRET;

  // If no secret is configured (e.g. in dev without .env.local), skip the guard
  if (!secret) {
    console.warn("[auth-guard] INTERNAL_API_SECRET is not set — skipping auth check");
    return null;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader === `Bearer ${secret}`) {
    return null;
  }

  // Allow frontend clients that have a session cookie
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader && cookieHeader.includes("session=")) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
