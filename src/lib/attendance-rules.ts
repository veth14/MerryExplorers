/**
 * attendance-rules.ts
 *
 * Pure utility module — no React, no DB imports.
 * Encodes all schedule and attendance business rules.
 * Used by both API routes and client pages.
 */

// ── Day abbreviations (must match workDays array values stored in MongoDB) ──────
export type DayAbbr = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

// ── Per-day schedule config ──────────────────────────────────────────────────────
type DaySchedule = {
  /** Expected clock-in time (24h "HH:MM") */
  start: string;
  /** Latest on-time clock-in (grace period end, 24h "HH:MM") */
  graceUntil: string;
  /** Normal end-of-shift (24h "HH:MM") */
  normalEnd: string;
  /**
   * Earliest acceptable clock-out on flexible days (24h "HH:MM").
   * null = strict, no early-out allowed without penalty consideration.
   */
  flexFloor: string | null;
};

type ScheduleTable = Record<Exclude<DayAbbr, "Sun">, DaySchedule>;

/**
 * The original company-wide base schedule (valid for dates BEFORE 2026-09-28).
 * Mon/Wed: flexible day — can leave from 2:30 PM.
 * Sat:     flexible day — can leave from 1:30 PM.
 * Tue/Thu/Fri: standard hours, no flexible floor.
 */
export const BASE_SCHEDULE: ScheduleTable = {
  Mon: { start: "08:30", graceUntil: "08:45", normalEnd: "17:30", flexFloor: "14:30" },
  Tue: { start: "08:30", graceUntil: "08:45", normalEnd: "17:30", flexFloor: null },
  Wed: { start: "08:30", graceUntil: "08:45", normalEnd: "17:30", flexFloor: "14:30" },
  Thu: { start: "08:30", graceUntil: "08:45", normalEnd: "17:30", flexFloor: null },
  Fri: { start: "08:30", graceUntil: "08:45", normalEnd: "17:30", flexFloor: null },
  Sat: { start: "08:30", graceUntil: "10:00", normalEnd: "15:00", flexFloor: "1:30" },
};

/**
 * The date (Manila, YYYY-MM-DD) from which the 9:30 AM–6:30 PM shift took effect.
 * Records from this date up to (but not including) SCHEDULE_V3_EFFECTIVE_DATE use NEW_SCHEDULE.
 * Records before this date continue to use BASE_SCHEDULE unchanged.
 */
export const NEW_SCHEDULE_EFFECTIVE_DATE = "2026-09-28";

/**
 * The company-wide schedule in effect from NEW_SCHEDULE_EFFECTIVE_DATE until
 * SCHEDULE_V3_EFFECTIVE_DATE. Start time shifted from 8:30 AM to 9:30 AM;
 * end time from 5:30 PM to 6:30 PM.
 */
export const NEW_SCHEDULE: ScheduleTable = {
  Mon: { start: "09:30", graceUntil: "09:45", normalEnd: "18:30", flexFloor: "15:30" },
  Tue: { start: "09:30", graceUntil: "09:45", normalEnd: "18:30", flexFloor: null },
  Wed: { start: "09:30", graceUntil: "09:45", normalEnd: "18:30", flexFloor: "15:30" },
  Thu: { start: "09:30", graceUntil: "09:45", normalEnd: "18:30", flexFloor: null },
  Fri: { start: "09:30", graceUntil: "09:45", normalEnd: "18:30", flexFloor: null },
  Sat: { start: "09:30", graceUntil: "11:00", normalEnd: "16:00", flexFloor: "2:30" },
};

/**
 * The date (Manila, YYYY-MM-DD) from which SCHEDULE_V3 takes effect.
 * It is the only place the start date is defined. Records before this date
 * keep using BASE_SCHEDULE.
 *
 * NOTE: this is the same date as NEW_SCHEDULE_EFFECTIVE_DATE, so the 9:30–6:30
 * NEW_SCHEDULE is superseded and no longer used for any date. It is still
 * exported so older imports keep compiling.
 */
export const SCHEDULE_V3_EFFECTIVE_DATE = "2026-09-28";

/**
 * Current company-wide schedule (effective from SCHEDULE_V3_EFFECTIVE_DATE):
 *   Mon / Wed:       9:00 AM – 6:00 PM
 *   Tue / Thu / Fri: 11:00 AM – 6:00 PM
 *   Sat:             10:00 AM – 3:00 PM
 *
 * NO GRACE PERIOD: graceUntil equals start, so any clock-in after the start
 * time (to the minute) is "Late".
 *
 * Flexible early-out floors keep the same pattern as before:
 * Mon/Wed = 3 hours before end of shift, Sat = 1.5 hours before end.
 */
export const SCHEDULE_V3: ScheduleTable = {
  Mon: { start: "09:00", graceUntil: "09:00", normalEnd: "18:00", flexFloor: "15:00" },
  Tue: { start: "11:00", graceUntil: "11:00", normalEnd: "18:00", flexFloor: null },
  Wed: { start: "09:00", graceUntil: "09:00", normalEnd: "18:00", flexFloor: "15:00" },
  Thu: { start: "11:00", graceUntil: "11:00", normalEnd: "18:00", flexFloor: null },
  Fri: { start: "11:00", graceUntil: "11:00", normalEnd: "18:00", flexFloor: null },
  Sat: { start: "10:00", graceUntil: "10:00", normalEnd: "15:00", flexFloor: "13:30" },
};

/**
 * Hours every employee must render on a Monday–Friday work day under SCHEDULE_V3.
 * Mon/Wed (9:00–18:00 less a 60-min break) = 8 hrs → nothing owed.
 * Tue/Thu/Fri (11:00–18:00 less a 60-min break) = 6 hrs → 2 hrs short, which
 * becomes an offset (see getOffsetHoursOwed).
 */
export const REQUIRED_DAILY_HOURS_V3 = 8;

/**
 * Returns the correct per-day schedule for a given date.
 *   on/after SCHEDULE_V3_EFFECTIVE_DATE  → SCHEDULE_V3
 *   on/after NEW_SCHEDULE_EFFECTIVE_DATE → NEW_SCHEDULE
 *   earlier                              → BASE_SCHEDULE
 *
 * Always use this function instead of reading a schedule table directly
 * whenever you have a date context.
 *
 * @param date  The calendar date to look up (Manila timezone is used internally)
 */
export function getScheduleTableForDate(date: Date): ScheduleTable {
  // Compare YYYY-MM-DD strings in Manila time to avoid UTC offset issues
  const manilaDateStr = date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }); // "YYYY-MM-DD"
  if (manilaDateStr >= SCHEDULE_V3_EFFECTIVE_DATE) return SCHEDULE_V3;
  if (manilaDateStr >= NEW_SCHEDULE_EFFECTIVE_DATE) return NEW_SCHEDULE;
  return BASE_SCHEDULE;
}

/**
 * Per-day break schedule (minutes to deduct from raw clock-in/out hours).
 *
 * MONDAY TO FRIDAY: 60 minutes
 * SATURDAY: No break deduction.
 *
 * This is the single source of truth — imported by both API routes and UI components.
 * Do NOT duplicate this logic locally; always import from this module.
 */
export const BREAK_SCHEDULE: Record<Exclude<DayAbbr, "Sun">, number> = {
  Mon: 60,
  Tue: 60,
  Wed: 60,
  Thu: 60,
  Fri: 60,
  Sat: 0,
};

/**
 * Saturday break length (minutes) from SCHEDULE_V3_EFFECTIVE_DATE onward.
 * Saturday had no break before; it now has a 45-minute break (11:45 AM – 12:30 PM).
 */
export const SATURDAY_BREAK_MINUTES_V3 = 45;

/**
 * Returns the number of break minutes to deduct for a given day-of-week index
 * (0 = Sunday, 1 = Monday, …, 6 = Saturday).
 *
 * This replaces all local getBreakMinutes() copies in the codebase.
 *
 * IMPORTANT: pass `date` whenever you have one. Saturday's break only applies
 * from SCHEDULE_V3_EFFECTIVE_DATE, so without a date Saturday returns the old
 * value (0) and payroll for new Saturdays would be calculated without a break.
 *
 * @param dayOfWeek  JS Date.getDay() value (0–6)
 * @param date       Optional date being evaluated (Manila timezone is used)
 */
export function getBreakMinutes(dayOfWeek: number, date?: Date): number {
  if (dayOfWeek === 0) return 0; // Sunday
  const abbr = (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const)[dayOfWeek] as Exclude<DayAbbr, "Sun">;

  if (abbr === "Sat" && date) {
    const manilaDateStr = date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
    if (manilaDateStr >= SCHEDULE_V3_EFFECTIVE_DATE) return SATURDAY_BREAK_MINUTES_V3;
  }
  return BREAK_SCHEDULE[abbr] ?? 0;
}

/**
 * Convenience wrapper: break minutes for a calendar date, using Manila time
 * for the day of week and the right era for Saturday.
 */
export function getBreakMinutesForDate(date: Date): number {
  const idx = (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const).indexOf(getDayAbbr(date));
  return getBreakMinutes(idx, date);
}

// ── Status types ─────────────────────────────────────────────────────────────────
export type TimeInStatus = "On Time" | "Late" | "Exempt";
export type DailyAttendanceStatus = "On Time" | "Late" | "Absent" | "Exempt" | "No Work Day" | "Suspended" | "Holiday" | "Future";

// ── Helpers ──────────────────────────────────────────────────────────────────────

/**
 * Converts a JS Date to its Manila-timezone day abbreviation.
 * e.g. Monday → "Mon", Saturday → "Sat"
 */
export function getDayAbbr(date: Date): DayAbbr {
  const manilaLocale = date.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "Asia/Manila",
  });
  // toLocaleDateString short weekday gives "Mon", "Tue", etc.
  return manilaLocale as DayAbbr;
}

/**
 * Returns the schedule config for a given date, or null if it falls on Sunday
 * (no work day company-wide).
 */
export function getScheduleForDate(date: Date): DaySchedule | null {
  const day = getDayAbbr(date);
  if (day === "Sun") return null;
  const table = getScheduleTableForDate(date);
  return table[day as Exclude<DayAbbr, "Sun">];
}

/**
 * Scheduled paid hours for a date: shift length minus the break.
 * Returns null on Sunday (no work day).
 * e.g. Mon 9:00–18:00 → 8, Tue 11:00–18:00 → 6.
 */
export function getScheduledHours(date: Date): number | null {
  const schedule = getScheduleForDate(date);
  if (!schedule) return null;
  const [sH, sM] = schedule.start.split(":").map(Number);
  const [eH, eM] = schedule.normalEnd.split(":").map(Number);
  const shiftMins = eH * 60 + eM - (sH * 60 + sM);
  return Math.max(0, shiftMins - getBreakMinutesForDate(date)) / 60;
}

/**
 * Offset hours owed for a Monday–Friday work day: the gap between the
 * REQUIRED_DAILY_HOURS_V3 (8) and the hours the shift actually covers.
 *   Mon / Wed        → 0   (8 scheduled hours)
 *   Tue / Thu / Fri  → 2   (6 scheduled hours)
 * Saturday, Sunday and dates before SCHEDULE_V3_EFFECTIVE_DATE → 0.
 *
 * This only calculates the shortfall. Recording it in the offset workflow
 * happens wherever offsets are created (payroll / offset code).
 */
export function getOffsetHoursOwed(date: Date): number {
  const manilaDateStr = date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  if (manilaDateStr < SCHEDULE_V3_EFFECTIVE_DATE) return 0;

  const day = getDayAbbr(date);
  if (day === "Sat" || day === "Sun") return 0;

  const scheduled = getScheduledHours(date);
  if (scheduled === null) return 0;
  return Math.max(0, REQUIRED_DAILY_HOURS_V3 - scheduled);
}

/**
 * Returns true if an employee with the given workDays array is scheduled to
 * work on the provided date.
 *
 * @param workDays  Array of day abbreviations stored on the account, e.g. ["Mon","Wed","Thu"]
 * @param date      The date to check (uses Asia/Manila timezone)
 */
export function isWorkDay(workDays: string[], date: Date): boolean {
  const day = getDayAbbr(date);
  return workDays.includes(day);
}

/**
 * Computes the time-in status for a clock-in event.
 *
 * Rules:
 *  - If noTimeLog is true → "Exempt" (no penalty possible without a timestamp)
 *  - If clock-in is at or before that day's grace period end → "On Time"
 *  - If clock-in is after the grace period → "Late"
 *
 * The grace period end comes from the schedule that was active on the day of
 * the clock-in (see getScheduleTableForDate).
 *
 * @param clockInISO  ISO timestamp of the clock-in event
 * @param noTimeLog   Whether this employee is exempt from time checks
 */
export function computeTimeInStatus(
  clockInISO: string,
  noTimeLog: boolean
): TimeInStatus {
  if (noTimeLog) return "Exempt";

  const clockIn = new Date(clockInISO);
  const day = getDayAbbr(clockIn);

  // Sunday is never a work day — treat as exempt to avoid false positives
  if (day === "Sun") return "Exempt";

  // Pick the schedule table that was active on the day of this clock-in
  const scheduleTable = getScheduleTableForDate(clockIn);
  const schedule = scheduleTable[day as Exclude<DayAbbr, "Sun">];

  // Parse grace period end for this day
  const [graceH, graceM] = schedule.graceUntil.split(":").map(Number);

  // Reconstruct the grace deadline in Manila time by extracting the date part
  // from the ISO string in Manila timezone
  const manilaStr = clockIn.toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const manilaDate = new Date(manilaStr);
  const graceDeadline = new Date(manilaDate);
  graceDeadline.setHours(graceH, graceM, 0, 0);

  // Compare to the minute (seconds ignored) so that a clock-in at 11:00:30 with
  // no grace period is still "On Time" — consistent with computeLateDeduction,
  // which counts whole minutes late.
  const manilaClockIn = new Date(manilaStr);
  manilaClockIn.setSeconds(0, 0);
  return manilaClockIn <= graceDeadline ? "On Time" : "Late";
}

/**
 * Derives the overall daily attendance status for an employee given their
 * attendance record (or lack thereof) and account settings.
 *
 * @param record         The MongoDB attendance record for today, or null if absent
 * @param account        The employee account doc
 * @param date           The date being evaluated (defaults to now)
 * @param isSuspended    Whether the school declared this date suspended/no-class
 * @param dayOffType     When isSuspended is true, the type of day-off ("suspension" | "holiday")
 */
export function computeDailyStatus(
  record: { timeInStatus?: string; clockInTime?: string } | null,
  account: {
    workDays: string[];
    noTimeLog: boolean;
    weeklyHoursTarget?: number | null;
  },
  date: Date = new Date(),
  isSuspended: boolean = false,
  dayOffType: "suspension" | "holiday" = "suspension"
): DailyAttendanceStatus {
  // Not scheduled today
  if (!isWorkDay(account.workDays, date)) return "No Work Day";

  // If the school declared this a suspended/no-class day:
  // — Teachers who came in still get the day-off status (no penalty)
  // — Teachers who didn't come in also get the day-off status (not "Absent")
  if (isSuspended) return dayOffType === "holiday" ? "Holiday" : "Suspended";

  // OJT/intern tracked by weekly hours — exempt from daily absent check
  if (account.weeklyHoursTarget != null) return "Exempt";

  // No-time-log employees are always exempt
  if (account.noTimeLog) return "Exempt";

  // No record → absent (but check if it's a future date)
  if (!record || !record.clockInTime) {
    const nowManilaStr = new Date().toLocaleDateString("en-US", { timeZone: "Asia/Manila" });
    const dateManilaStr = date.toLocaleDateString("en-US", { timeZone: "Asia/Manila" });
    const nowManila = new Date(nowManilaStr);
    const dateManila = new Date(dateManilaStr);

    if (dateManila > nowManila) return "Future";
    return "Absent";
  }

  // Use stored status if available, otherwise recompute
  const status = (record.timeInStatus as TimeInStatus | undefined) ??
    computeTimeInStatus(record.clockInTime, account.noTimeLog);

  return status as DailyAttendanceStatus;
}

// ── Human-readable helpers ────────────────────────────────────────────────────────

/**
 * Returns a human-readable schedule summary for display on teacher cards.
 * e.g. "Mon · Tue · Wed · Thu · Fri"
 */
export function formatWorkDays(workDays: string[]): string {
  const ORDER: DayAbbr[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return ORDER.filter((d) => workDays.includes(d)).join(" · ");
}

/**
 * Returns a short label for the employment arrangement.
 * e.g. "Full-Time", "Part-Time", "OJT (8 hrs/wk)"
 */
export function formatEmploymentLabel(
  employmentType: "full-time" | "part-time",
  weeklyHoursTarget: number | null | undefined
): string {
  if (weeklyHoursTarget != null) return `OJT / Intern (${weeklyHoursTarget} hrs/wk)`;
  return employmentType === "full-time" ? "Full-Time" : "Part-Time";
}

// ── Late-arrival deduction ────────────────────────────────────────────────────

/**
 * Late-deduction policy shape.
 *
 * scheduledStart   — deduction is applied for any clock-in AFTER this time.
 * lateThreshold    — at or after this time the deduction becomes one full
 *                    hourly rate regardless of exact late minutes.
 *
 * NOTE: This is entirely separate from graceUntil / computeTimeInStatus.
 * The attendance "On Time" / "Late" label does NOT suppress the deduction.
 * Example (old schedule): clock-in at 8:44 AM → status "On Time",
 * deduction = 14 min × rate.
 */
export type LateDeductionConfig = {
  scheduledStart: string; // 24h "HH:MM"
  lateThreshold: string; // 24h "HH:MM"
  beforeThresholdMethod: "per-minute";
  atThresholdMethod: "one-hourly-rate";
};

/** Original late-deduction config (used for dates before NEW_SCHEDULE_EFFECTIVE_DATE). */
export const LATE_DEDUCTION_CONFIG = {
  scheduledStart: "08:30" as const, // 24h "HH:MM"
  lateThreshold: "09:00" as const, // 24h "HH:MM"
  beforeThresholdMethod: "per-minute" as const,
  atThresholdMethod: "one-hourly-rate" as const,
};

/** Late-deduction config for NEW_SCHEDULE_EFFECTIVE_DATE up to SCHEDULE_V3_EFFECTIVE_DATE. */
export const NEW_LATE_DEDUCTION_CONFIG = {
  scheduledStart: "09:30" as const, // 24h "HH:MM"
  lateThreshold: "10:00" as const, // 24h "HH:MM"
  beforeThresholdMethod: "per-minute" as const,
  atThresholdMethod: "one-hourly-rate" as const,
};

/**
 * How long after the scheduled start the deduction becomes one full hourly
 * rate. Both earlier configs used 30 minutes (8:30→9:00 and 9:30→10:00), so
 * the same gap is kept for the current schedule.
 */
export const LATE_THRESHOLD_MINUTES_AFTER_START = 30;

/** Adds minutes to a 24h "HH:MM" string and returns a 24h "HH:MM" string. */
function addMinutesToTime(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Returns the correct late-deduction config for the given date.
 *   on/after SCHEDULE_V3_EFFECTIVE_DATE  → follows THAT DAY'S start time
 *                                          (9:00 Mon/Wed, 11:00 Tue/Thu/Fri,
 *                                          10:00 Sat), threshold = start + 30 min
 *   on/after NEW_SCHEDULE_EFFECTIVE_DATE → NEW_LATE_DEDUCTION_CONFIG
 *   earlier                              → LATE_DEDUCTION_CONFIG
 *
 * The current schedule has different start times per day, so a single
 * company-wide start time no longer works.
 */
export function getLateDeductionConfigForDate(date: Date): LateDeductionConfig {
  const manilaDateStr = date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

  if (manilaDateStr >= SCHEDULE_V3_EFFECTIVE_DATE) {
    const day = getDayAbbr(date);
    // Sunday is never a work day; fall back to Monday's times so the result is still valid
    const schedule = SCHEDULE_V3[day === "Sun" ? "Mon" : (day as Exclude<DayAbbr, "Sun">)];
    return {
      scheduledStart: schedule.start,
      lateThreshold: addMinutesToTime(schedule.start, LATE_THRESHOLD_MINUTES_AFTER_START),
      beforeThresholdMethod: "per-minute",
      atThresholdMethod: "one-hourly-rate",
    };
  }

  return manilaDateStr >= NEW_SCHEDULE_EFFECTIVE_DATE
    ? NEW_LATE_DEDUCTION_CONFIG
    : LATE_DEDUCTION_CONFIG;
}

export type LateDeductionMethod = "none" | "per-minute" | "threshold";

export type LateDeductionResult = {
  /** Minutes late relative to scheduledStart. 0 when not late or threshold applies. */
  lateMinutes: number;
  /** Peso amount to deduct from gross pay. */
  deduction: number;
  /** Which deduction rule was applied. */
  method: LateDeductionMethod;
};

/**
 * Computes the late-arrival payroll deduction for a single clock-in event.
 *
 * Rules (driven by getLateDeductionConfigForDate — never hardcoded here):
 *   clockIn ≤ scheduledStart                  → deduction = 0
 *   scheduledStart < clockIn < lateThreshold  → per-minute: round(hourlyRate / 60 × minutesLate, 2)
 *   clockIn ≥ lateThreshold                   → one full hourlyRate
 *
 * IMPORTANT SEPARATION:
 *   This function must NOT consult graceUntil or computeTimeInStatus.
 *   Attendance status and payroll deduction are independent rules.
 *
 * @param clockInISO  ISO timestamp of the clock-in event
 * @param hourlyRate  Employee's hourly rate (sourced from payroll data, not hardcoded)
 * @param noTimeLog   Whether this employee is exempt from time checks
 */
export function computeLateDeduction(
  clockInISO: string,
  hourlyRate: number,
  noTimeLog: boolean,
): LateDeductionResult {
  if (noTimeLog) return { lateMinutes: 0, deduction: 0, method: "none" };

  // Use the config that was active on the day of this clock-in
  const { scheduledStart, lateThreshold } = getLateDeductionConfigForDate(new Date(clockInISO));

  // Work in Manila local time — same pattern as computeTimeInStatus
  const clockIn = new Date(clockInISO);
  const manilaStr = clockIn.toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const manilaIn = new Date(manilaStr);

  const [startH, startM] = scheduledStart.split(":").map(Number);
  const [threshH, threshM] = lateThreshold.split(":").map(Number);

  const startBoundary = new Date(manilaIn);
  startBoundary.setHours(startH, startM, 0, 0);

  const threshBoundary = new Date(manilaIn);
  threshBoundary.setHours(threshH, threshM, 0, 0);

  // On time or early
  if (manilaIn <= startBoundary) {
    return { lateMinutes: 0, deduction: 0, method: "none" };
  }

  // At or after threshold → one full hourly rate
  if (manilaIn >= threshBoundary) {
    return { lateMinutes: 0, deduction: hourlyRate, method: "threshold" };
  }

  // Between scheduledStart and threshold → per-minute
  const lateMinutes = Math.floor(
    (manilaIn.getTime() - startBoundary.getTime()) / 60_000,
  );
  const deduction = parseFloat(((hourlyRate / 60) * lateMinutes).toFixed(2));
  return { lateMinutes, deduction, method: "per-minute" };
}

// ── Scheduled-hours clamping ──────────────────────────────────────────────────

/**
 * Computes regular credited work hours for a single day, clamped to the
 * employee's scheduled start and end times.
 *
 * SCOPE — regular payroll hours ONLY:
 *   This function replaces the raw "clockOut - clockIn - break" calculation
 *   ONLY when determining regular credited payroll hours.
 *   It must NOT replace or modify any calculation used for approved OT or
 *   offset functionality.
 *
 * Clamping rules:
 *   effectiveStart = max(clockIn,  scheduledStart)  → early arrivals ignored
 *   effectiveEnd   = min(clockOut, scheduledEnd)    → late departures ignored
 *   creditedHours  = max(0, effectiveEnd - effectiveStart - breakMins)
 *
 * Early arrivals and late departures are silently excluded. They must NOT
 * automatically generate OT or offset credit. Existing approved OT and offset
 * workflows remain unchanged and process separately according to their own rules.
 *
 * @param clockInISO     ISO timestamp of the clock-in event
 * @param clockOutISO    ISO timestamp of the clock-out event
 * @param scheduledStart Scheduled start time (24h "HH:MM"), e.g. "09:00"
 * @param scheduledEnd   Scheduled end time (24h "HH:MM"),   e.g. "18:00"
 * @param breakMins      Break minutes to deduct (from BREAK_SCHEDULE via getBreakMinutes)
 * @returns Credited hours as a number rounded to 2 decimal places
 */
export function computeCreditedHours(
  clockInISO: string,
  clockOutISO: string,
  scheduledStart: string,
  scheduledEnd: string,
  breakMins: number,
): number {
  const clockIn = new Date(clockInISO);
  const clockOut = new Date(clockOutISO);

  // Convert to Manila local time
  const manilaInStr = clockIn.toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const manilaOutStr = clockOut.toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const manilaIn = new Date(manilaInStr);
  const manilaOut = new Date(manilaOutStr);

  // Build schedule boundaries on the same Manila date as clock-in
  const [startH, startM] = scheduledStart.split(":").map(Number);
  const [endH, endM] = scheduledEnd.split(":").map(Number);

  const schedStart = new Date(manilaIn);
  schedStart.setHours(startH, startM, 0, 0);

  const schedEnd = new Date(manilaIn);
  schedEnd.setHours(endH, endM, 0, 0);

  // Clamp to scheduled window
  const effectiveStart = manilaIn < schedStart ? schedStart : manilaIn;
  const effectiveEnd = manilaOut > schedEnd ? schedEnd : manilaOut;

  const creditedMs = Math.max(
    0,
    effectiveEnd.getTime() - effectiveStart.getTime() - breakMins * 60_000,
  );
  return parseFloat((creditedMs / 3_600_000).toFixed(2));
}