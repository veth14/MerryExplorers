import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

/**
 * GET /api/offsets/[id]   — Fetch a single offset group by ID
 * PUT /api/offsets/[id]   — Add a rendered session to an offset group
 *
 * Adding a rendered session requires admin to EXPLICITLY assign it.
 * Saturday work or weekday OT does NOT automatically consume offsets.
 *
 * PUT body: {
 *   attendanceDateStr: string,   // date of the work session used for offset
 *   hours: number,               // hours rendered in this session
 *   attendanceId?: string,       // optional link to the attendance record
 *   type: "saturday" | "weekday_ot",
 *   notes?: string,
 *   recordedBy?: string,
 * }
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const group = await db.collection("offsets").findOne({ _id: new ObjectId(id) });
    if (!group) {
      return NextResponse.json({ error: "Offset group not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { ...group, id: group._id.toString() } });
  } catch (error: any) {
    console.error("Failed to fetch offset group:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { id } = await params;
    const body = await request.json();
    const { attendanceDateStr, hours, attendanceId, type, notes, recordedBy } = body;

    if (!attendanceDateStr || !hours || !type) {
      return NextResponse.json(
        { error: "attendanceDateStr, hours, and type are required" },
        { status: 400 }
      );
    }

    if (!["saturday", "weekday_ot"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'saturday' or 'weekday_ot'" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const group = await db.collection("offsets").findOne({ _id: new ObjectId(id) });

    if (!group) {
      return NextResponse.json({ error: "Offset group not found" }, { status: 404 });
    }

    if (group.status === "completed") {
      return NextResponse.json(
        { error: "This offset group is already completed." },
        { status: 409 }
      );
    }

    const now = new Date();
    const newSession = {
      attendanceDateStr,
      hours: Number(hours),
      attendanceId: attendanceId ?? null,
      type,
      notes: notes ?? null,
      recordedAt: now.toISOString(),
      recordedBy: recordedBy ?? null,
    };

    const existingSessions = group.renderedSessions ?? [];
    const updatedSessions = [...existingSessions, newSession];
    const newRenderedTotal = updatedSessions.reduce((sum: number, s: any) => sum + s.hours, 0);
    const newRemaining = Math.max(0, (group.requiredHours ?? 0) - newRenderedTotal);

    let newStatus: "pending" | "partial" | "completed" = "pending";
    if (newRemaining === 0) newStatus = "completed";
    else if (newRenderedTotal > 0) newStatus = "partial";

    await db.collection("offsets").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          renderedSessions: updatedSessions,
          renderedTotal: parseFloat(newRenderedTotal.toFixed(2)),
          remainingHours: parseFloat(newRemaining.toFixed(2)),
          status: newStatus,
          updatedAt: now,
        },
      }
    );

    const updated = await db.collection("offsets").findOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true, data: { ...updated, id: updated!._id.toString() } });
  } catch (error: any) {
    console.error("Failed to update offset group:", error);
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 });
  }
}
