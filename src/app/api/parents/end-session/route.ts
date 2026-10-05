import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const { uid } = await request.json();
    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });

    const { db } = await connectToDatabase();
    
    await db.collection("accounts").updateOne(
      { _id: uid },
      { 
        $set: { 
          virtualSessionLink: null,
          virtualSessionTime: null,
          needsSessionPayment: true
        }
      }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to end session" }, { status: 500 });
  }
}
