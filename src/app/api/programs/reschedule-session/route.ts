import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth-guard";
import {
  cascadeScheduleAfterMove,
  generateProgramSchedule,
  getManilaTodayStr,
  PROGRAM_SCHEDULE_CONFIGS,
  CustomSessionOverride,
} from "@/lib/program-sessions";

export const dynamic = "force-dynamic";

const SETTINGS_KEY = "renewal_settings_v2";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const {
      programKey,
      adventureNumber,
      sessionNumber,
      targetDateStr,
      isMakeUp = false,
      makeUpReason = "",
      cascade = true,
      action = "move",
      actorUid,
      actorName,
    } = body;

    if (!programKey || typeof programKey !== "string") {
      return NextResponse.json({ error: "Missing or invalid programKey." }, { status: 400 });
    }

    const config = PROGRAM_SCHEDULE_CONFIGS[programKey];
    if (!config) {
      return NextResponse.json({ error: `Unknown programKey: ${programKey}` }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const settingsDoc = await db.collection("settings").findOne({ _key: SETTINGS_KEY });
    const rawPrograms = settingsDoc?.programs || [];

    // Find the program entry
    const progIndex = rawPrograms.findIndex((p: any) => p.programKey === programKey);
    const progEntry = progIndex >= 0 ? rawPrograms[progIndex] : { programKey };

    // ── ACTION: RESET SCHEDULE BACK TO AUTOMATIC DEFAULT ──
    if (action === "reset") {
      const updatedPrograms = rawPrograms.map((p: any) =>
        p.programKey === programKey ? { ...p, customSessions: null } : p
      );

      await db.collection("settings").updateOne(
        { _key: SETTINGS_KEY },
        { $set: { programs: updatedPrograms, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );

      // Audit log
      await db.collection("audit_log").insertOne({
        actorUid: actorUid || (auth as any).user?.uid || "admin",
        actorName: actorName || "Admin",
        actorRole: "admin",
        action: "RESET_PROGRAM_SCHEDULE",
        category: "calendar",
        targetId: programKey,
        details: `Reset schedule for ${config.shortName} to default automatic calculation.`,
        createdAt: new Date(),
      });

      return NextResponse.json({
        ok: true,
        message: `Reset ${config.shortName} back to automatic schedule.`,
        programKey,
      });
    }

    // ── ACTION: RESCHEDULE / MOVE SESSION ──
    const sNum = Number(sessionNumber);
    if (!Number.isInteger(sNum) || sNum < 1) {
      return NextResponse.json({ error: "Invalid session number." }, { status: 400 });
    }

    if (!targetDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(String(targetDateStr))) {
      return NextResponse.json({ error: "Invalid targetDateStr. Expected YYYY-MM-DD." }, { status: 400 });
    }

    // Load holidays & suspensions
    const [calHolidaysAndSuspensions, attendanceSuspendedDays] = await Promise.all([
      db.collection("calendar_events").find({
        type: { $in: ["holiday", "suspension"] },
        hidden: { $ne: true },
      }).toArray(),
      db.collection("suspended_days").find({}).toArray(),
    ]);

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

    const suspensionsMap = new Map<string, string>();
    for (const item of calHolidaysAndSuspensions) {
      if (item.type === "suspension" && item.startDate) {
        const pKeys = Array.isArray(item.programKeys) && item.programKeys.length > 0
          ? item.programKeys
          : (item.programKey ? [item.programKey] : []);
        if (pKeys.length === 0 || pKeys.includes(programKey)) {
          suspensionsMap.set(item.startDate, item.title || "Class Suspended");
        }
      }
    }
    for (const item of attendanceSuspendedDays) {
      if (item.dateStr && item.type !== "holiday") {
        suspensionsMap.set(item.dateStr, item.reason || "Class Suspended");
      }
    }

    const todayStr = getManilaTodayStr();
    const currentAdv = Number(adventureNumber) || Number(progEntry.currentAdventure) || 2;
    const totalSessions = config.defaultSessions || 8;

    // 1. Generate current schedule to inspect existing dates
    const currentSchedule = generateProgramSchedule({
      programKey,
      adventureNumber: currentAdv,
      startDateStr: progEntry.adventureStartDate,
      totalSessions,
      holidaysMap,
      suspensionsMap,
      todayStr,
      customSessions: progEntry.customSessions,
    });

    // Validation: cannot move before session K-1
    if (sNum > 1) {
      const prevSession = currentSchedule.sessions.find((s) => s.sessionNumber === sNum - 1);
      if (prevSession && targetDateStr <= prevSession.dateStr) {
        return NextResponse.json(
          { error: `Session ${sNum} cannot be placed on or before Session ${sNum - 1} (${prevSession.formattedDate}).` },
          { status: 400 }
        );
      }
    }

    // 2. Cascade calculations
    const updatedCustomSessions: CustomSessionOverride[] = cascadeScheduleAfterMove({
      programKey,
      sessionNumber: sNum,
      targetDateStr,
      isMakeUp: Boolean(isMakeUp),
      makeUpReason: makeUpReason ? String(makeUpReason).trim() : (isMakeUp ? "Make-Up Session" : ""),
      cascade: Boolean(cascade),
      currentSessions: currentSchedule.sessions,
      holidaysMap,
      suspensionsMap,
      totalSessions,
    });

    // 3. Save to database in renewal_settings_v2
    let updatedPrograms: any[];
    if (progIndex >= 0) {
      updatedPrograms = rawPrograms.map((p: any) =>
        p.programKey === programKey ? { ...p, customSessions: updatedCustomSessions } : p
      );
    } else {
      updatedPrograms = [...rawPrograms, { programKey, customSessions: updatedCustomSessions }];
    }

    await db.collection("settings").updateOne(
      { _key: SETTINGS_KEY },
      { $set: { programs: updatedPrograms, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );

    // 4. Audit log entry
    const detailsMsg = `Rescheduled ${config.shortName} Session ${sNum} to ${targetDateStr}${
      isMakeUp ? ` (Make-up: ${makeUpReason || "Make-Up Session"})` : ""
    }.${cascade ? " Subsequent sessions cascaded." : ""}`;

    await db.collection("audit_log").insertOne({
      actorUid: actorUid || (auth as any).user?.uid || "admin",
      actorName: actorName || "Admin",
      actorRole: "admin",
      action: "RESCHEDULE_SESSION",
      category: "calendar",
      targetId: programKey,
      details: detailsMsg,
      createdAt: new Date(),
    });

    // 5. Generate and return the freshly calculated schedule
    const recomputedSchedule = generateProgramSchedule({
      programKey,
      adventureNumber: currentAdv,
      startDateStr: progEntry.adventureStartDate,
      totalSessions,
      holidaysMap,
      suspensionsMap,
      todayStr,
      customSessions: updatedCustomSessions,
    });

    return NextResponse.json({
      ok: true,
      message: detailsMsg,
      schedule: recomputedSchedule,
      customSessions: updatedCustomSessions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reschedule session";
    console.error("[/api/programs/reschedule-session POST]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

