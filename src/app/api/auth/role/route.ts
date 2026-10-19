import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');

  if (!uid) {
    return NextResponse.json({ error: "UID required" }, { status: 400 });
  }

  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.uid !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Look up the user in "parent_accounts" first, then "accounts" by Firebase UID
    let user = await db.collection("parent_accounts").findOne({ _id: uid as any });
    if (!user) {
      user = await db.collection("accounts").findOne({ _id: uid as any });
    }
    
    if (user && user.role) {
      // Normalize to lowercase so "Admin", "ADMIN", "admin" all work consistently
      return NextResponse.json({ role: user.role.toLowerCase() });
    }
    
    // Not found in accounts — default to teacher for safety
    return NextResponse.json({ role: "teacher" });
  } catch (error) {
    console.error("Failed to fetch role:", error);
    return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 });
  }
}
