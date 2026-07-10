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
    
    // Look up the user in the "accounts" collection where _id is the Firebase UID
    // Note: Since we'll manually set the MongoDB _id to match the Firebase UID as a string
    const user = await db.collection("accounts").findOne({ _id: uid as any });
    
    if (user) {
      // If found in accounts, they are a teacher
      return NextResponse.json({ role: "teacher" });
    }
    
    // If they aren't in the teacher 'accounts' collection, they must be the hardcoded Admin
    return NextResponse.json({ role: "admin" });
  } catch (error) {
    console.error("Failed to fetch role:", error);
    return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 });
  }
}
