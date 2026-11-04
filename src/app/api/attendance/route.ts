import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { computeTimeInStatus } from "@/lib/attendance-rules";

// GET /api/attendance
// Params:
//   ?date=YYYY-MM-DD  — single day (admin daily view)
//   ?uid=UID          — all records for a teacher (timekeeping)
//   ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD  — date range (multi-date export)
export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const uid = searchParams.get('uid');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const { db } = await connectToDatabase();

    let resolvedDateStr: string | null = null;
    const query: any = {};

    if (startDate && endDate) {
      // Range query for multi-date export
      query.dateStr = { $gte: startDate, $lte: endDate };
    } else if (dateStr) {
      if (dateStr === "today") {
        const todayStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
        const today = new Date(todayStr);
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        resolvedDateStr = `${yyyy}-${mm}-${dd}`;
        query.dateStr = resolvedDateStr;
      } else {
        resolvedDateStr = dateStr;
        query.dateStr = dateStr;
      }
    }
    if (uid) {
      query.teacherUid = uid;
    }

    // Interns can view their own attendance history, but never another person's records.
    if (auth.role === "intern") {
      query.teacherUid = auth.uid;
    }

    // Check if this date is marked as suspended or holiday
    let isSuspended = false;
    let suspendReason: string | null = null;
    let suspendType: "suspension" | "holiday" | null = null;
    if (resolvedDateStr) {
      const suspendDoc = await db.collection("suspended_days").findOne({ dateStr: resolvedDateStr });
      if (suspendDoc) {
        isSuspended = true;
        suspendReason = suspendDoc.reason || null;
        suspendType = suspendDoc.type === "holiday" ? "holiday" : "suspension";
      }
    }

    // Also fetch all suspended/holiday days for bulk queries (timekeeping etc.)
    const allSuspendedDocs = await db.collection("suspended_days").find({}).toArray();
    // Return as typed objects so consumers can distinguish holiday vs suspension
    const suspendedDays = allSuspendedDocs.map(d => ({
      dateStr: d.dateStr as string,
      type: (d.type === "holiday" ? "holiday" : "suspension") as "suspension" | "holiday",
    }));

    const attendanceRecords = await db.collection("attendance").find(query).toArray();
    
    // Fetch daily exemptions for this query
    let exemptions: string[] = [];
    let dailyExemptions: { teacherUid: string; dateStr: string }[] = [];

    if (resolvedDateStr) {
      const exemptDocs = await db.collection("daily_exemptions").find({ dateStr: resolvedDateStr }).toArray();
      exemptions = exemptDocs.map(d => d.teacherUid);
      dailyExemptions = exemptDocs.map(d => ({ teacherUid: d.teacherUid, dateStr: d.dateStr }));
    } else if (startDate && endDate) {
      const exemptDocs = await db.collection("daily_exemptions").find({
        dateStr: { $gte: startDate, $lte: endDate }
      }).toArray();
      exemptions = Array.from(new Set(exemptDocs.map(d => d.teacherUid)));
      dailyExemptions = exemptDocs.map(d => ({ teacherUid: d.teacherUid, dateStr: d.dateStr }));
    } else {
      const exemptDocs = await db.collection("daily_exemptions").find({}).toArray();
      exemptions = Array.from(new Set(exemptDocs.map(d => d.teacherUid)));
      dailyExemptions = exemptDocs.map(d => ({ teacherUid: d.teacherUid, dateStr: d.dateStr }));
    }

    if (auth.role === "intern") {
      exemptions = exemptions.filter((teacherUid) => teacherUid === auth.uid);
      dailyExemptions = dailyExemptions.filter((entry) => entry.teacherUid === auth.uid);
    }

    return NextResponse.json({ 
      success: true, 
      data: attendanceRecords, 
      isSuspended, 
      suspendReason, 
      suspendType,
      suspendedDays,
      exemptions,
      dailyExemptions
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30"
      }
    });
  } catch (error: any) {
    console.error("Failed to fetch attendance:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}

// POST /api/attendance (Clock in)
export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const data = await request.json();
    const { teacherUid, name, group, clockInPhotoUrl } = data;

    if (!teacherUid) return NextResponse.json({ error: "Missing teacherUid" }, { status: 400 });
    if (auth.role === "intern" && teacherUid !== auth.uid) {
      return NextResponse.json({ error: "Interns may only clock in for their own account" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    const now = new Date();
    const todayStr = now.toLocaleString("en-US", { timeZone: "Asia/Manila" });
    const todayInPht = new Date(todayStr);
    const yyyy = todayInPht.getFullYear();
    const mm = String(todayInPht.getMonth() + 1).padStart(2, '0');
    const dd = String(todayInPht.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // Check if already clocked in today
    const existing = await db.collection("attendance").findOne({ teacherUid, dateStr });
    if (existing) {
      return NextResponse.json({ error: "Already clocked in today", data: existing }, { status: 400 });
    }

    // Look up the account to get noTimeLog flag for status computation
    const accountDoc = await db.collection("accounts").findOne({ _id: teacherUid as any });
    if (auth.role === "intern" && accountDoc?.role?.toLowerCase() !== "intern") {
      return NextResponse.json({ error: "Intern account not found" }, { status: 403 });
    }
    let noTimeLog = accountDoc?.noTimeLog ?? false;

    // Check if there is a specific daily exemption for this teacher today
    const dailyExemption = await db.collection("daily_exemptions").findOne({ teacherUid, dateStr });
    if (dailyExemption) {
      noTimeLog = true;
    }

    // Compute whether this clock-in is on time or late using dynamic schedule configs and employee rules
    const scheduleConfigs = await db.collection("attendance_schedules").find().toArray();
    const timeInStatus = computeTimeInStatus(
      now.toISOString(),
      noTimeLog,
      accountDoc?.fullName || name,
      scheduleConfigs as any
    );

    const newRecord = {
      teacherUid,
      name: auth.role === "intern" ? accountDoc?.fullName || name : name,
      group: auth.role === "intern" ? accountDoc?.assignedRoom || "Unassigned" : group || "Unassigned",
      dateStr,
      clockInTime: now.toISOString(),
      clockInPhotoUrl: clockInPhotoUrl || null,
      clockOutTime: null,
      clockOutPhotoUrl: null,
      timeInStatus,
      status: "In Progress",
      breaks: [],
      createdAt: now,
    };

    const result = await db.collection("attendance").insertOne(newRecord);
    return NextResponse.json({ success: true, data: { ...newRecord, _id: result.insertedId } });
  } catch (error: any) {
    console.error("Failed to clock in:", error);
    return NextResponse.json({ error: error.message || "Failed to clock in" }, { status: 500 });
  }
}

// PUT /api/attendance (Clock out, start break, end break)
export async function PUT(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const data = await request.json();
    const { id, action, photoUrl } = data; // action: 'clock-out', 'start-break', 'end-break'

    if (!id || !action) return NextResponse.json({ error: "Missing id or action" }, { status: 400 });

    const { db } = await connectToDatabase();
    const record = await db.collection("attendance").findOne({ _id: new ObjectId(id) });

    if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });
    if (auth.role === "intern") {
      if (record.teacherUid !== auth.uid) {
        return NextResponse.json({ error: "Interns may only update their own attendance" }, { status: 403 });
      }
      if (action !== "clock-out") {
        return NextResponse.json({ error: "Interns may only clock out" }, { status: 403 });
      }
      if (record.clockOutTime) {
        return NextResponse.json({ error: "This attendance record is already clocked out" }, { status: 409 });
      }
    }

    const now = new Date();
    const updateDoc: any = { $set: { updatedAt: now } };

    if (action === "clock-out") {
      updateDoc.$set.clockOutTime = now.toISOString();
      updateDoc.$set.status = "Completed";
      if (photoUrl) updateDoc.$set.clockOutPhotoUrl = photoUrl;
    } else if (action === "patch-photo") {
      // Backfill clock-in photo URL after the record was already saved.
      if (photoUrl) updateDoc.$set.clockInPhotoUrl = photoUrl;
    } else if (action === "patch-clockout-photo") {
      // Backfill clock-out photo URL after the record was already saved.
      if (photoUrl) updateDoc.$set.clockOutPhotoUrl = photoUrl;
    } else if (action === "correct-times") {
      // Admin manual override: fix clock-in and/or clock-out times.
      // Expects { clockInTime?: ISO string, clockOutTime?: ISO string, timeInStatus?: string } in data.
      const { clockInTime, clockOutTime, timeInStatus } = data;
      if (clockInTime) updateDoc.$set.clockInTime = clockInTime;
      if (clockOutTime) {
        updateDoc.$set.clockOutTime = clockOutTime;
        updateDoc.$set.status = "Completed";
      }

      // Handle timeInStatus:
      // If admin explicitly specifies timeInStatus (e.g. "On Time" due to internet/technical issues), apply it.
      // Otherwise, if clockInTime was updated, recompute status based on the employee's schedule.
      if (timeInStatus) {
        updateDoc.$set.timeInStatus = timeInStatus;
      } else if (clockInTime) {
        const scheduleConfigs = await db.collection("attendance_schedules").find().toArray();
        const accountDoc = await db.collection("accounts").findOne({ _id: record.teacherUid as any });
        let noTimeLog = accountDoc?.noTimeLog ?? false;
        const dailyExemption = await db.collection("daily_exemptions").findOne({
          teacherUid: record.teacherUid,
          dateStr: record.dateStr,
        });
        if (dailyExemption) noTimeLog = true;

        const recomputed = computeTimeInStatus(
          clockInTime,
          noTimeLog,
          accountDoc?.fullName || record.name,
          scheduleConfigs as any
        );
        updateDoc.$set.timeInStatus = recomputed;
      }

      updateDoc.$set.correctedAt = now.toISOString();
      updateDoc.$set.correctedBy = data.correctedBy || "admin";
    } else if (action === "start-break") {
      const breakEntry: any = { start: now.toISOString(), end: null };
      if (photoUrl) breakEntry.photoUrl = photoUrl;
      updateDoc.$push = { breaks: breakEntry };
    } else if (action === "end-break") {
      // Find the last break that hasn't ended and set its end time
      const breaks = record.breaks || [];
      if (breaks.length > 0 && !breaks[breaks.length - 1].end) {
        breaks[breaks.length - 1].end = now.toISOString();
        updateDoc.$set.breaks = breaks;
      }
    }

    await db.collection("attendance").updateOne({ _id: new ObjectId(id) }, updateDoc);

    const updated = await db.collection("attendance").findOne({ _id: new ObjectId(id) });

    // --- AUTO-DEDUCT OFFSETS ON SATURDAY ---
    if (action === "clock-out" && updated) {
      const localDate = new Date(new Date(updated.clockInTime).toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      if (localDate.getDay() === 6) { // 6 = Saturday
        const clockInMs = new Date(updated.clockInTime).getTime();
        const clockOutMs = new Date(updated.clockOutTime).getTime();

        let breakMs = 0;
        if (Array.isArray(updated.breaks)) {
          updated.breaks.forEach((b: any) => {
            if (b.start && b.end) {
              breakMs += new Date(b.end).getTime() - new Date(b.start).getTime();
            }
          });
        }

        const rawWorkedHours = Math.max(0, (clockOutMs - clockInMs - breakMs) / 3600000);
        if (rawWorkedHours > 0) {
          // Find pending offsets for this teacher
          const pendingOffsets = await db.collection("offsets")
            .find({ employeeId: updated.teacherUid, status: { $in: ["pending", "partial"] } })
            .sort({ "sourceHoliday.dateStr": 1 })
            .toArray();

          let remainingWorked = rawWorkedHours;
          for (const group of pendingOffsets) {
            if (remainingWorked <= 0) break;

            let deduct = Math.min(remainingWorked, group.remainingHours);
            deduct = parseFloat(deduct.toFixed(2));
            if (deduct <= 0) continue;

            const session = {
              attendanceDateStr: updated.dateStr,
              hours: deduct,
              attendanceId: updated._id.toString(),
              type: "saturday",
              notes: "Auto-deducted at clock-out",
              recordedAt: now,
              recordedBy: "system"
            };

            const newRenderedTotal = parseFloat((group.renderedTotal + deduct).toFixed(2));
            const newRemaining = Math.max(0, parseFloat((group.remainingHours - deduct).toFixed(2)));
            const newStatus = newRemaining <= 0 ? "completed" : "partial";

            await db.collection("offsets").updateOne(
              { _id: group._id },
              {
                $set: {
                  renderedTotal: newRenderedTotal,
                  remainingHours: newRemaining,
                  status: newStatus,
                  updatedAt: now
                },
                $push: { renderedSessions: session }
              } as any
            );

            remainingWorked -= deduct;
          }
        }
      }
    }
    // ---------------------------------------

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Failed to update attendance:", error);
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 });
  }
}
