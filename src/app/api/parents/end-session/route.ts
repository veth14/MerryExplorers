import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const { uid } = await request.json();
    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });

    const { db } = await connectToDatabase();

    // Ending a session no longer blocks the family. It clears the class link and adds
    // one completed session, which adds one session rate to the account balance
    // (the balance is worked out in src/lib/session-balance.ts).
    //
    // The filter only matches while a class link is set, so a double-click, a retry,
    // or a second admin ending the same session can't count it twice.
    const result = await db.collection("accounts").updateOne(
      { _id: uid, virtualSessionLink: { $nin: [null, ""] } },
      {
        $set: {
          virtualSessionLink: null,
          virtualSessionTime: null,
        },
        $inc: {
          virtualSessionsCompleted: 1,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "No active session to end" }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to end session" }, { status: 500 });
  }
}