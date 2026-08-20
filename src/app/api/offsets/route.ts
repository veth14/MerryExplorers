import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

/**
 * GET /api/offsets?uid=...
 *
 * Returns all offset groups for an employee, each linked to the paid holiday
 * that generated it, with rendered sessions and remaining balance.
 *
 * POST /api/offsets
 *
 * Creates a new offset requirement when admin records a paid holiday obligation.
 * Body: { employeeId, holidayDateStr, holidayName, requiredHours }
 *
 * Note: Admin must EXPLICITLY assign attendance sessions to an offset via
 * PUT /api/offsets/[id] — Saturday work or OT does NOT auto-consume offsets.
 */

export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const offsetGroups = await db
      .collection("offsets")
      .find({ employeeId: uid })
      .sort({ "sourceHoliday.dateStr": -1 })
      .toArray();

    // Extract all unique attendance IDs
    const attendanceIds = Array.from(new Set(
      offsetGroups.flatMap((g: any) => 
        (g.renderedSessions ?? []).map((s: any) => s.attendanceId).filter(Boolean)
      )
    ));

    const attendanceMap = new Map();
    if (attendanceIds.length > 0) {
      const attendanceRecords = await db.collection("attendance").find({
        _id: { $in: attendanceIds.map((id: string) => new ObjectId(id)) }
      }).toArray();

      attendanceRecords.forEach((r: any) => {
        let tIn = null, tOut = null;
        if (r.clockInTime) {
          tIn = new Date(r.clockInTime).toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", hour12: true });
        }
        if (r.clockOutTime) {
          tOut = new Date(r.clockOutTime).toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", hour12: true });
        }
        attendanceMap.set(r._id.toString(), { timeIn: tIn, timeOut: tOut });
      });
    }

    const formatted = offsetGroups.map((g: any) => ({
      id: g._id.toString(),
      employeeId: g.employeeId,
      sourceHoliday: g.sourceHoliday ?? null,       // { dateStr, name }
      timeIn: g.timeIn ?? null,
      timeOut: g.timeOut ?? null,
      requiredHours: g.requiredHours ?? 0,
      renderedSessions: (g.renderedSessions ?? []).map((s: any) => {
        const att = s.attendanceId ? attendanceMap.get(s.attendanceId) : null;
        return {
          attendanceDateStr: s.attendanceDateStr,
          timeIn: s.timeIn ?? att?.timeIn ?? null,
          timeOut: s.timeOut ?? att?.timeOut ?? null,
          hours: s.hours,
          attendanceId: s.attendanceId ?? null,
          type: s.type,  // "saturday" | "weekday_ot"
          notes: s.notes ?? null,
          recordedAt: s.recordedAt ?? null,
          recordedBy: s.recordedBy ?? null,
        };
      }),
      renderedTotal: g.renderedTotal ?? 0,
      remainingHours: g.remainingHours ?? g.requiredHours ?? 0,
      status: g.status ?? "pending",   // "pending" | "partial" | "completed"
      createdAt: g.createdAt,
      updatedAt: g.updatedAt ?? null,
    }));

    return NextResponse.json(
      { success: true, data: formatted },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
    );
  } catch (error: any) {
    console.error("Failed to fetch offsets:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const body = await request.json();
    const { employeeId, holidayDateStr, holidayName, requiredHours, createdBy } = body;

    if (!employeeId || !holidayDateStr || !holidayName || !requiredHours) {
      return NextResponse.json(
        { error: "employeeId, holidayDateStr, holidayName, requiredHours are required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Prevent duplicate offset groups for the same employee + holiday date
    const existing = await db.collection("offsets").findOne({
      employeeId,
      "sourceHoliday.dateStr": holidayDateStr,
    });

    if (existing) {
      return NextResponse.json(
        { error: `An offset group for ${holidayName} (${holidayDateStr}) already exists for this employee.` },
        { status: 409 }
      );
    }

    const now = new Date();
    const newGroup = {
      employeeId,
      sourceHoliday: { dateStr: holidayDateStr, name: holidayName },
      requiredHours: Number(requiredHours),
      renderedSessions: [],
      renderedTotal: 0,
      remainingHours: Number(requiredHours),
      status: "pending" as const,
      createdAt: now,
      updatedAt: now,
      createdBy: createdBy ?? null,
    };

    const result = await db.collection("offsets").insertOne(newGroup);
    return NextResponse.json({ success: true, id: result.insertedId.toString(), data: newGroup });
  } catch (error: any) {
    console.error("Failed to create offset:", error);
    return NextResponse.json({ error: error.message || "Failed to create" }, { status: 500 });
  }
}
