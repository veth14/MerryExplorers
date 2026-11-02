import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import {
  getAllProgramsSchedules,
  buildSessionsByDateMap,
  buildSkippedDatesByDateMap,
  getManilaTodayStr,
} from "@/lib/program-sessions";

export const dynamic = "force-dynamic";

/**
 * GET /api/programs/schedules
 *
 * Query params (optional):
 * - programKey: filter to a single program
 * - month: "YYYY-MM" (filters returned sessions to a specific month)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterProgramKey = searchParams.get("programKey");
    const filterMonth = searchParams.get("month");

    const { db } = await connectToDatabase();

    // 1. Load program settings
    const settingsDoc = await db
      .collection("settings")
      .findOne({ _key: "renewal_settings_v2" });
    const rawPrograms = settingsDoc?.programs || [];

    // 2. Load holidays & suspensions from calendar_events
    const calHolidaysAndSuspensions = await db
      .collection("calendar_events")
      .find({
        type: { $in: ["holiday", "suspension"] },
        hidden: { $ne: true },
      })
      .toArray();

    // 3. Load from suspended_days
    const attendanceSuspendedDays = await db
      .collection("suspended_days")
      .find({})
      .toArray();

    // 4. Build lookup maps
    const holidaysMap = new Map<string, string>();
    const suspensionsMap = new Map<string, string>();

    for (const item of calHolidaysAndSuspensions) {
      if (item.type === "holiday" && item.startDate) {
        holidaysMap.set(item.startDate, item.title || "Holiday");
      } else if (item.type === "suspension" && item.startDate) {
        suspensionsMap.set(item.startDate, item.title || "Class Suspended");
      }
    }

    for (const item of attendanceSuspendedDays) {
      if (item.dateStr) {
        if (item.type === "holiday") {
          if (!holidaysMap.has(item.dateStr)) {
            holidaysMap.set(item.dateStr, item.reason || "Holiday");
          }
        } else {
          suspensionsMap.set(item.dateStr, item.reason || "Class Suspended");
        }
      }
    }

    const todayStr = getManilaTodayStr();

    // 5. Generate all program schedules
    const allSchedules = getAllProgramsSchedules({
      programs: rawPrograms,
      holidaysMap,
      suspensionsMap,
      todayStr,
    });

    const schedules = filterProgramKey
      ? allSchedules.filter((s) => s.programKey === filterProgramKey || s.slug === filterProgramKey)
      : allSchedules;

    const byDate = buildSessionsByDateMap(schedules);
    const skippedByDate = buildSkippedDatesByDateMap(schedules);

    // If month filter is requested, filter sessions
    if (filterMonth) {
      for (const sched of schedules) {
        sched.sessions = sched.sessions.filter((s) => s.dateStr.startsWith(filterMonth));
        sched.skippedDates = sched.skippedDates.filter((s) => s.dateStr.startsWith(filterMonth));
      }
    }

    return NextResponse.json({
      ok: true,
      todayStr,
      schedules,
      byDate,
      skippedByDate,
      holidaysCount: holidaysMap.size,
      suspensionsCount: suspensionsMap.size,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load program schedules";
    console.error("[/api/programs/schedules GET]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

