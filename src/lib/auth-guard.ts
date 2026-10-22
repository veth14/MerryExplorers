import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

// ---------------------------------------------------------------------------
// In-process Firebase token cache
// ---------------------------------------------------------------------------
// Firebase ID tokens expire after 1 hour. Caching the verification result for
// 5 minutes is safe and eliminates one outbound HTTP round-trip to Google
// per API call (typically 100–400ms depending on region latency).
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1_000; // 5 minutes
const _tokenCache = new Map<string, { uid: string; email: string | null; expiresAt: number }>();

export type AppRole =
  | "admin"
  | "developer"
  | "executive assistant"
  | "teacher"
  | "lead teacher"
  | "assistant teacher"
  | "parent";

export type AuthenticatedUser = {
  uid: string;
  email: string | null;
  role: AppRole | null;
};

function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * Verifies a Firebase ID token supplied by an authenticated browser client.
 * Browser-controlled cookies are deliberately not accepted as credentials.
 */
export async function getAuthenticatedUser(
  request: Request
): Promise<AuthenticatedUser | NextResponse> {
  const authorization = request.headers.get("authorization");
  const idToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!idToken) return unauthorized();

  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      console.error("[auth-guard] Firebase API key is not configured");
      return unauthorized("Authentication is not configured");
    }

    // Check in-process token cache first (avoids Google round-trip)
    const cachedToken = _tokenCache.get(idToken);
    let firebaseUid: string;
    let firebaseEmail: string | null;

    if (cachedToken && Date.now() < cachedToken.expiresAt) {
      firebaseUid = cachedToken.uid;
      firebaseEmail = cachedToken.email;
    } else {
      // Firebase validates the token's signature and expiry before returning the
      // account. The web API key identifies the Firebase project; it cannot turn
      // an arbitrary string into a valid ID token.
      const verification = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
          cache: "no-store",
        }
      );

      if (!verification.ok) return unauthorized();

      const payload = await verification.json() as {
        users?: Array<{ localId?: string; email?: string }>;
      };
      const firebaseUser = payload.users?.[0];
      if (!firebaseUser?.localId) return unauthorized();

      firebaseUid = firebaseUser.localId;
      firebaseEmail = firebaseUser.email ?? null;

      // Ensure cache lifetime NEVER exceeds the token's own JWT expiration
      let tokenExpMs: number | null = null;
      try {
        const parts = idToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
          if (typeof payload.exp === "number") tokenExpMs = payload.exp * 1000;
        }
      } catch { /* fallback to default TTL */ }

      const expiresAt = tokenExpMs
        ? Math.min(Date.now() + TOKEN_CACHE_TTL_MS, tokenExpMs)
        : Date.now() + TOKEN_CACHE_TTL_MS;

      // Cache the verified token
      _tokenCache.set(idToken, {
        uid: firebaseUid,
        email: firebaseEmail,
        expiresAt,
      });

      // Evict stale entries to prevent unbounded memory growth
      if (_tokenCache.size > 200) {
        const now = Date.now();
        for (const [key, entry] of _tokenCache) {
          if (now > entry.expiresAt) _tokenCache.delete(key);
        }
      }
    }

    const { db } = await connectToDatabase();
    let account = await db.collection("parent_accounts").findOne(
      { _id: firebaseUid as never },
      { projection: { role: 1 } }
    );
    if (!account) {
      account = await db.collection("accounts").findOne(
        { _id: firebaseUid as never },
        { projection: { role: 1 } }
      );
    }

    const role = typeof account?.role === "string"
      ? account.role.toLowerCase() as AppRole
      : null;

    return { uid: firebaseUid, email: firebaseEmail, role };
  } catch (error) {
    console.error("[auth-guard] Firebase token verification failed", error);
    return unauthorized();
  }
}

/**
 * Shared guard for routes that only need an authenticated Firebase user.
 * It intentionally rejects the old `session=active` cookie and no longer
 * accepts an INTERNAL_API_SECRET fallback.
 */
export async function requireInternalAuth(request: Request): Promise<NextResponse | null> {
  const result = await getAuthenticatedUser(request);
  return result instanceof NextResponse ? result : null;
}

export async function requireRoles(
  request: Request,
  allowedRoles: AppRole[]
): Promise<{ user: AuthenticatedUser } | { response: NextResponse }> {
  const result = await getAuthenticatedUser(request);
  if (result instanceof NextResponse) return { response: result };
  if (!result.role || !allowedRoles.includes(result.role)) return { response: forbidden() };
  return { user: result };
}

export async function requireAdmin(
  request: Request
): Promise<{ user: AuthenticatedUser } | { response: NextResponse }> {
  return requireRoles(request, ["admin", "developer", "executive assistant"]);
}

export async function requireParent(
  request: Request,
  expectedUid?: string
): Promise<{ user: AuthenticatedUser } | { response: NextResponse }> {
  const result = await requireRoles(request, ["parent"]);
  if ("response" in result) return result;
  if (expectedUid && result.user.uid !== expectedUid) return { response: forbidden() };
  return result;
}
