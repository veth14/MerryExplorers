import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

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

    const { db } = await connectToDatabase();
    let account = await db.collection("parent_accounts").findOne(
      { _id: firebaseUser.localId as never },
      { projection: { role: 1 } }
    );
    if (!account) {
      account = await db.collection("accounts").findOne(
        { _id: firebaseUser.localId as never },
        { projection: { role: 1 } }
      );
    }

    const role = typeof account?.role === "string"
      ? account.role.toLowerCase() as AppRole
      : null;

    return { uid: firebaseUser.localId, email: firebaseUser.email ?? null, role };
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
