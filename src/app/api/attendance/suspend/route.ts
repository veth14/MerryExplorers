import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";

// POST /api/attendance/suspend — Mark a date as suspended or holiday
export async function POST(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const { dateStr, reason, type } = await request.json();
    if (!dateStr) return NextResponse.json({ error: "Missing dateStr" }, { status: 400 });

    const dayType: "suspension" | "holiday" = type === "holiday" ? "holiday" : "suspension";

    const { db } = await connectToDatabase();
    await db.collection("suspended_days").updateOne(
      { dateStr },
      { $set: { dateStr, reason: reason || "No reason provided", type: dayType, createdAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, dateStr, reason, type: dayType });
  } catch (error: any) {
    console.error("Failed to suspend day:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/attendance/suspend — Undo a suspension or holiday
export async function DELETE(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("dateStr");
    if (!dateStr) return NextResponse.json({ error: "Missing dateStr" }, { status: 400 });

    const { db } = await connectToDatabase();
    await db.collection("suspended_days").deleteOne({ dateStr });

    return NextResponse.json({ success: true, dateStr });
  } catch (error: any) {
    console.error("Failed to undo suspension:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
