import { GoogleAuth } from "google-auth-library";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireRoles } from "@/lib/auth-guard";

export const runtime = "nodejs";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { project_id?: string; client_email?: string; private_key?: string };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = await requireRoles(request, ["developer", "admin"]);
  if ("response" in auth) return auth.response;

  try {
    const { db } = await connectToDatabase();
    const [staffDocs, parentDocs, events] = await Promise.all([
      db.collection("accounts").find({}, {
        projection: { fullName: 1, email: 1, role: 1, status: 1 },
      }).toArray(),
      db.collection("parent_accounts").find({}, {
        projection: {
          fullName: 1,
          email: 1,
          role: 1,
          status: 1,
          childName: 1,
          childrenNames: 1,
          program: 1,
          classTime: 1,
          phone: 1,
        },
      }).toArray(),
      db.collection("password_reset_logs").find({})
        .sort({ createdAt: -1 }).limit(100).toArray(),
    ]);

    const formattedStaff = staffDocs
      .filter((account) => typeof account.email === "string" && account.email.trim())
      .map((account) => ({
        id: account._id.toString(),
        fullName: account.fullName || "Unnamed staff",
        email: account.email,
        role: account.role || "Staff",
        accountType: "staff" as const,
        status: account.status || "active",
      }));

    const formattedParents = parentDocs
      .filter((account) => typeof account.email === "string" && account.email.trim())
      .map((account) => {
        const childName =
          account.childName ||
          (Array.isArray(account.childrenNames) && account.childrenNames.length > 0
            ? account.childrenNames.join(", ")
            : "");
        return {
          id: account._id.toString(),
          fullName: account.fullName || "Unnamed parent",
          email: account.email,
          role: "Parent",
          accountType: "parent" as const,
          childName,
          program: account.program || "",
          classTime: account.classTime || "",
          phone: account.phone || "",
          status: account.status || "active",
        };
      });

    return NextResponse.json({
      accounts: [...formattedStaff, ...formattedParents],
      history: events.map((event) => ({
        id: event._id.toString(),
        targetName: event.targetName,
        targetEmail: event.targetEmail,
        targetRole: event.targetRole,
        accountType: event.accountType || "staff",
        childName: event.childName || "",
        program: event.program || "",
        requestedByName: event.requestedByName,
        createdAt: event.createdAt,
        outcome: event.outcome,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to load password reset history:", error);
    return NextResponse.json({ error: "Could not load password reset data." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireRoles(request, ["developer", "admin"]);
  if ("response" in auth) return auth.response;

  let body: { accountId?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const accountId = typeof body.accountId === "string" ? body.accountId.trim() : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!accountId || newPassword.length < 8 || newPassword.length > 128) {
    return NextResponse.json({ error: "Choose an account and enter a password of 8–128 characters." }, { status: 400 });
  }

  const serviceAccount = getServiceAccount();
  const projectId = serviceAccount?.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!serviceAccount?.client_email || !serviceAccount.private_key || !projectId) {
    return NextResponse.json({
      error: "Password reset is not configured yet. Add the Firebase service account credentials to the server environment.",
    }, { status: 503 });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Look up in accounts (staff) first, then in parent_accounts
    const staffDoc = await db.collection("accounts").findOne({ _id: accountId as any });
    const parentDoc = staffDoc ? null : await db.collection("parent_accounts").findOne({ _id: accountId as any });
    const account = staffDoc || parentDoc;
    const isParent = !staffDoc && !!parentDoc;

    if (!account || typeof account.email !== "string") {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const googleAuth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/identitytoolkit"],
    });
    const client = await googleAuth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = typeof tokenResponse === "string" ? tokenResponse : tokenResponse.token;
    if (!accessToken) throw new Error("Firebase Admin access token unavailable");

    const firebaseResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts:update`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ localId: accountId, password: newPassword }),
        cache: "no-store",
      },
    );
    if (!firebaseResponse.ok) {
      const errText = await firebaseResponse.text();
      console.error("Firebase update password failed:", firebaseResponse.status, errText);
      return NextResponse.json({ error: "Firebase could not update this account password." }, { status: 502 });
    }

    if (isParent) {
      await db.collection("parent_accounts").updateOne(
        { _id: accountId as any },
        { $set: { updatedAt: new Date().toISOString() } }
      ).catch(() => {});
    }

    const childName = isParent
      ? account.childName || (Array.isArray(account.childrenNames) ? account.childrenNames.join(", ") : undefined)
      : undefined;

    try {
      await db.collection("password_reset_logs").insertOne({
        targetUid: accountId,
        targetName: account.fullName || "Unnamed account",
        targetEmail: account.email,
        targetRole: isParent ? "Parent" : (account.role || "Staff"),
        accountType: isParent ? "parent" : "staff",
        childName,
        program: isParent ? (account.program || undefined) : undefined,
        requestedByUid: auth.user.uid,
        requestedByName: auth.user.email || (auth.user.role === "developer" ? "Developer" : "Admin"),
        createdAt: new Date(),
        outcome: "password_updated",
      });
    } catch (logError) {
      console.error("Password was updated, but its audit entry could not be saved:", logError);
      return NextResponse.json({
        success: true,
        warning: "Password updated, but the history entry could not be saved.",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update account password:", error);
    return NextResponse.json({ error: "Could not update the account password." }, { status: 500 });
  }
}
