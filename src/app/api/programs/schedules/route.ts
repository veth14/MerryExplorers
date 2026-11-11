import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import {
  generateProgramSchedule,
  PROGRAM_SCHEDULE_CONFIGS,
  PROGRAM_KEYS_LIST,
  buildSessionsByDateMap,
  buildSkippedDatesByDateMap,
  getManilaTodayStr,
  ProgramScheduleResult,
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

    for (const item of calHolidaysAndSuspensions) {
      if (item.type === "holiday" && item.startDate) {
        holidaysMap.set(item.startDate, item.title || "Holiday");
      }
    }

    for (const item of attendanceSuspendedDays) {
      if (item.dateStr && item.type === "holiday" && !holidaysMap.has(item.dateStr)) {
        holidaysMap.set(item.dateStr, item.reason || "Holiday");
      }
    }

    const allSuspensionDates = new Set<string>();
    for (const item of calHolidaysAndSuspensions) {
      if (item.type === "suspension" && item.startDate) {
        allSuspensionDates.add(item.startDate);
      }
    }
    for (const item of attendanceSuspendedDays) {
      if (item.dateStr && item.type !== "holiday") {
        allSuspensionDates.add(item.dateStr);
      }
    }

    // Helper to get suspensions for a specific program (program-specific or playgroup-wide)
    function getProgramSuspensions(progKey: string): Map<string, string> {
      const sMap = new Map<string, string>();
      for (const item of calHolidaysAndSuspensions) {
        if (item.type === "suspension" && item.startDate) {
          const pKeys = Array.isArray(item.programKeys) && item.programKeys.length > 0
            ? item.programKeys
            : (item.programKey ? [item.programKey] : []);
          if (pKeys.length === 0 || pKeys.includes(progKey)) {
            sMap.set(item.startDate, item.title || "Class Suspended");
          }
        }
      }
      for (const item of attendanceSuspendedDays) {
        if (item.dateStr && item.type !== "holiday") {
          sMap.set(item.dateStr, item.reason || "Class Suspended");
        }
      }
      return sMap;
    }

    const todayStr = getManilaTodayStr();

    // 5. Generate all program schedules with program-aware suspensions
    const programList = rawPrograms && rawPrograms.length > 0
      ? rawPrograms
      : PROGRAM_KEYS_LIST.map((key) => ({ programKey: key }));

    const allSchedules: ProgramScheduleResult[] = programList.map((p: any) => {
      const config = PROGRAM_SCHEDULE_CONFIGS[p.programKey];
      const currentAdv = Number(p.currentAdventure) || 2;
      return generateProgramSchedule({
        programKey: p.programKey,
        adventureNumber: currentAdv,
        startDateStr: p.adventureStartDate,
        totalSessions: config?.defaultSessions ?? 8,
        holidaysMap,
        suspensionsMap: getProgramSuspensions(p.programKey),
        todayStr,
        customSessions: p.customSessions,
      });
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
      suspensionsCount: allSuspensionDates.size,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load program schedules";
    console.error("[/api/programs/schedules GET]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

