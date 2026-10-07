import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getOffsetHoursOwed, computeCreditedHours, getScheduleTableForDate, getBreakMinutesForDate, getDayAbbr, DayAbbr } from "@/lib/attendance-rules";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // The uid could be a Firebase string or an ObjectId hex string
    let accountId;
    try {
      accountId = new ObjectId(uid);
    } catch {
      accountId = uid; // It's a string ID like Firebase UID
    }

    // Try finding by _id first
    let account = await db.collection("accounts").findOne({ _id: accountId } as any);

    // If not found, maybe it's stored under id field?
    if (!account) {
      account = await db.collection("accounts").findOne({ id: uid });
    }

    const employeeName = account?.fullName || "";

    const attendanceRecords = await db
      .collection("attendance")
      .find({
        teacherUid: uid,
        dateStr: { $gte: "2026-09-29" },
      })
      .sort({ dateStr: 1 })
      .toArray();

    const ledger = [];
    let totalDebt = 0;
    let totalCredit = 0;

    for (const rec of attendanceRecords) {
      if (!rec.clockInTime) continue;

      const date = new Date(rec.clockInTime);
      const day = getDayAbbr(date);

      // Check debt for short shifts (Tue/Thu/Fri = 2 hours owed, automatically)
      const owed = getOffsetHoursOwed(date, employeeName);
      if (owed > 0) {
        totalDebt += owed;
        ledger.push({
          id: rec._id.toString() + "_debt",
          date: rec.dateStr,
          timeIn: new Date(rec.clockInTime).toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", hour12: true }),
          timeOut: rec.clockOutTime ? new Date(rec.clockOutTime).toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", hour12: true }) : "—",
          type: "debt",
          hours: owed,
          label: `${day} Short Shift`,
        });
      }

      // Check credit for Saturday offset work
      if (day === "Sat" && rec.clockOutTime) {
        const scheduleTable = getScheduleTableForDate(date, employeeName);
        const schedule = scheduleTable["Sat" as Exclude<DayAbbr, "Sun">];
        const breakMins = getBreakMinutesForDate(date);

        const credited = computeCreditedHours(
          rec.clockInTime,
          rec.clockOutTime,
          schedule.start,
          schedule.normalEnd,
          breakMins
        );

        if (credited > 0) {
          totalCredit += credited;
          ledger.push({
            id: rec._id.toString() + "_credit",
            date: rec.dateStr,
            timeIn: new Date(rec.clockInTime).toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", hour12: true }),
            timeOut: new Date(rec.clockOutTime).toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", hour12: true }),
            type: "credit",
            hours: credited,
            label: `Saturday Offset Work`,
          });
        }
      }
    }

    const remainingOffset = Math.max(0, totalDebt - totalCredit);

    return NextResponse.json({
      success: true,
      data: {
        totalDebt,
        totalCredit,
        remainingOffset,
        ledger: ledger.reverse(),
      }
    });
  } catch (error: any) {
    console.error("Failed to fetch offsets:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
