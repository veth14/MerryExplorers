import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { computeTimeInStatus } from "@/lib/attendance-rules";

// GET /api/attendance
// Can pass ?date=YYYY-MM-DD or ?uid=teacher_firebase_uid
export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const uid = searchParams.get('uid');

    const { db } = await connectToDatabase();

    let resolvedDateStr: string | null = null;
    let query: any = {};
    if (dateStr) {
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

    // Check if this date is marked as suspended
    let isSuspended = false;
    let suspendReason: string | null = null;
    if (resolvedDateStr) {
      const suspendDoc = await db.collection("suspended_days").findOne({ dateStr: resolvedDateStr });
      if (suspendDoc) {
        isSuspended = true;
        suspendReason = suspendDoc.reason || null;
      }
    }

    const attendanceRecords = await db.collection("attendance").find(query).toArray();
    return NextResponse.json({ success: true, data: attendanceRecords, isSuspended, suspendReason }, {
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
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const data = await request.json();
    const { teacherUid, name, group, clockInPhotoUrl } = data;
    
    if (!teacherUid) return NextResponse.json({ error: "Missing teacherUid" }, { status: 400 });

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
    const noTimeLog = accountDoc?.noTimeLog ?? false;

    // Compute whether this clock-in is on time or late
    const timeInStatus = computeTimeInStatus(now.toISOString(), noTimeLog);

    const newRecord = {
      teacherUid,
      name,
      group: group || "Unassigned",
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
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const data = await request.json();
    const { id, action, photoUrl } = data; // action: 'clock-out', 'start-break', 'end-break'

    if (!id || !action) return NextResponse.json({ error: "Missing id or action" }, { status: 400 });

    const { db } = await connectToDatabase();
    const record = await db.collection("attendance").findOne({ _id: new ObjectId(id) });
    
    if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

    const now = new Date();
    let updateDoc: any = { $set: { updatedAt: now } };

    if (action === "clock-out") {
      updateDoc.$set.clockOutTime = now.toISOString();
      updateDoc.$set.status = "Completed";
      if (photoUrl) updateDoc.$set.clockOutPhotoUrl = photoUrl;
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
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Failed to update attendance:", error);
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 });
  }
}
