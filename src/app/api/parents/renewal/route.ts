import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { uid, returning, notes, reason } = data;

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Update parent account with renewal status
    await db.collection("accounts").updateOne(
      { _id: uid },
      {
        $set: {
          renewalStatus: {
            hasSubmitted: true,
            returning,
            notes: notes || "",
            reason: reason || "",
            submittedAt: new Date().toISOString(),
          }
        }
      }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to submit renewal:", error);
    return NextResponse.json({ error: error.message || "Failed to submit renewal" }, { status: 500 });
  }
}
