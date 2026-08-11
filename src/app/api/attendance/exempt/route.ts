import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { computeTimeInStatus } from "@/lib/attendance-rules";

// POST /api/attendance/exempt
// Toggles the exemption status for a specific teacher on a specific date.
export async function POST(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const data = await request.json();
    const { teacherUid, dateStr, action } = data;

    if (!teacherUid || !dateStr || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection("daily_exemptions");

    if (action === "exempt") {
      // Upsert the exemption record
      await collection.updateOne(
        { teacherUid, dateStr },
        {
          $set: {
            teacherUid,
            dateStr,
            createdAt: new Date(),
            reason: "Flexible schedule assigned"
          }
        },
        { upsert: true }
      );

      // If the employee already clocked in today, mark their stored status as Exempt
      await db.collection("attendance").updateOne(
        { teacherUid, dateStr },
        { $set: { timeInStatus: "Exempt" } }
      );

    } else if (action === "remove") {
      // Remove the daily exemption
      await collection.deleteOne({ teacherUid, dateStr });

      // IMPORTANT: recompute the real timeInStatus from the employee's actual clock-in time.
      // Without the exemption, a 5:50 PM clock-in must be re-evaluated as "Late".
      const record = await db.collection("attendance").findOne({ teacherUid, dateStr });
      if (record && record.clockInTime) {
        // Check the base account setting (account-level noTimeLog, not the daily override)
        const accountDoc = await db.collection("accounts").findOne({ _id: teacherUid as any });
        const noTimeLog = accountDoc?.noTimeLog ?? false;

        // Recompute using only the account's base setting, NOT the daily exemption we just removed
        const recomputedStatus = computeTimeInStatus(record.clockInTime, noTimeLog);

        await db.collection("attendance").updateOne(
          { teacherUid, dateStr },
          { $set: { timeInStatus: recomputedStatus } }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to toggle exemption:", error);
    return NextResponse.json({ error: error.message || "Failed to toggle exemption" }, { status: 500 });
  }
}
