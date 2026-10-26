import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedUser, requireInternalAuth } from "@/lib/auth-guard";
import { SCHEDULE_OCT_26_DEFAULT, BREAK_SCHEDULE, toManilaDateStr } from "@/lib/attendance-rules";

// Default schedule document for starting October 26, 2026
const DEFAULT_INITIAL_CONFIG = {
  effectiveFrom: "2026-10-26",
  requiredDailyHours: 8,
  schedule: SCHEDULE_OCT_26_DEFAULT,
  breaks: BREAK_SCHEDULE,
  note: "Standard 9:00 AM – 5:00 PM schedule (1h break, 1h offset for Saturday)",
  updatedBy: "System",
  updatedAt: new Date(),
  createdAt: new Date(),
};

// GET /api/attendance/schedule
// Returns all schedule configurations and the active schedule for the requested date (or today)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const targetDate = dateParam === "today" || !dateParam
      ? toManilaDateStr(new Date())
      : dateParam;

    const { db } = await connectToDatabase();
    const collection = db.collection("attendance_schedules");

    let configs = await collection.find().sort({ effectiveFrom: -1 }).toArray();

    // Seed initial active schedule for 2026-10-26 if none exists in database
    if (configs.length === 0) {
      await collection.insertOne(DEFAULT_INITIAL_CONFIG);
      configs = [DEFAULT_INITIAL_CONFIG as any];
    }

    const mappedConfigs = configs.map((c: any) => ({
      ...c,
      id: c._id ? c._id.toString() : undefined,
    }));

    // Find the configuration matching effectiveFrom <= targetDate (since sorted descending)
    const activeConfig =
      mappedConfigs.find((c: any) => c.effectiveFrom <= targetDate) || mappedConfigs[0];

    return NextResponse.json({
      success: true,
      targetDate,
      activeConfig,
      configs: mappedConfigs,
    });
  } catch (error: any) {
    console.error("Failed to fetch schedule configs:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch schedule configs" }, { status: 500 });
  }
}

// POST /api/attendance/schedule
// Create or update a schedule configuration effective from a given date
// Restricted to admin and developer roles
export async function POST(request: Request) {
  const deny = await requireInternalAuth(request);
  if (deny) return deny;

  try {
    const authResult = await getAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;

    const role = (authResult.role || "").toLowerCase();
    if (role !== "admin" && role !== "developer" && role !== "executive assistant") {
      return NextResponse.json({ error: "Forbidden: Developer or Admin permissions required" }, { status: 403 });
    }

    const body = await request.json();
    const { effectiveFrom, schedule, breaks, requiredDailyHours, note } = body;

    if (!effectiveFrom || typeof effectiveFrom !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      return NextResponse.json({ error: "effectiveFrom must be in YYYY-MM-DD format" }, { status: 400 });
    }

    if (!schedule || typeof schedule !== "object") {
      return NextResponse.json({ error: "schedule object is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection("attendance_schedules");

    const now = new Date();
    const updateDoc: any = {
      effectiveFrom,
      schedule,
      breaks: breaks || BREAK_SCHEDULE,
      requiredDailyHours: Number(requiredDailyHours) || 8,
      note: note || "",
      updatedAt: now,
      updatedBy: authResult.email || authResult.uid,
    };

    const result = await collection.updateOne(
      { effectiveFrom },
      {
        $set: updateDoc,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    // Audit log
    try {
      await db.collection("audit_log").insertOne({
        actorUid: authResult.uid,
        actorName: authResult.email || "Developer",
        actorRole: authResult.role || "developer",
        action: "UPDATE",
        category: "attendance_schedule",
        targetId: effectiveFrom,
        targetTitle: `Schedule effective from ${effectiveFrom}`,
        details: `Updated attendance shift schedule effective ${effectiveFrom}: ${note || "Custom schedule update"}`,
        createdAt: now,
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      success: true,
      message: `Schedule configuration saved for effective date ${effectiveFrom}`,
      data: {
        ...updateDoc,
        upsertedId: result.upsertedId,
      },
    });
  } catch (error: any) {
    console.error("Failed to save schedule config:", error);
    return NextResponse.json({ error: error.message || "Failed to save schedule config" }, { status: 500 });
  }
}
