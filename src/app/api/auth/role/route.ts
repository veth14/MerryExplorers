import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');

  if (!uid) {
    return NextResponse.json({ error: "UID required" }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Look up the user in the "accounts" collection by their Firebase UID
    const user = await db.collection("accounts").findOne({ _id: uid as any });
    
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
