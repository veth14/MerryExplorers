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

/**
 * The company-wide base schedule.
 * Mon/Wed: flexible day — can leave from 2:00 PM (even though normal end is 3:00 PM).
 * Sat:     flexible day — can leave from 10:30 AM (even though normal end is 12:00 PM).
 * Tue/Thu/Fri: standard hours, no flexible floor.
 */
export const BASE_SCHEDULE: Record<Exclude<DayAbbr, "Sun">, DaySchedule> = {
  Mon: { start: "08:30", graceUntil: "08:45", normalEnd: "17:30", flexFloor: "14:30" },
  Tue: { start: "08:30", graceUntil: "08:45", normalEnd: "17:30", flexFloor: null },
  Wed: { start: "08:30", graceUntil: "08:45", normalEnd: "17:30", flexFloor: "14:30" },
  Thu: { start: "08:30", graceUntil: "08:45", normalEnd: "17:30", flexFloor: null },
  Fri: { start: "08:30", graceUntil: "08:45", normalEnd: "17:30", flexFloor: null },
  Sat: { start: "08:30", graceUntil: "10:00", normalEnd: "15:00", flexFloor: "1:30" },
};

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
 * Returns the number of break minutes to deduct for a given day-of-week index
 * (0 = Sunday, 1 = Monday, …, 6 = Saturday).
 *
 * This replaces all local getBreakMinutes() copies in the codebase.
 *
 * @param dayOfWeek  JS Date.getDay() value (0–6)
 */
export function getBreakMinutes(dayOfWeek: number): number {
  if (dayOfWeek === 0) return 0; // Sunday
  const abbr = (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const)[dayOfWeek] as Exclude<DayAbbr, "Sun">;
  return BREAK_SCHEDULE[abbr] ?? 0;
}

// ── Status types ─────────────────────────────────────────────────────────────────
export type TimeInStatus = "On Time" | "Late" | "Exempt";
export type DailyAttendanceStatus = "On Time" | "Late" | "Absent" | "Exempt" | "No Work Day" | "Suspended";

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
  return BASE_SCHEDULE[day as Exclude<DayAbbr, "Sun">];
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
 *  - If clock-in is at or before the grace period end (8:45 AM) → "On Time"
 *  - If clock-in is after the grace period → "Late"
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

  const schedule = BASE_SCHEDULE[day as Exclude<DayAbbr, "Sun">];

  // Parse grace period end for this day
  const [graceH, graceM] = schedule.graceUntil.split(":").map(Number);

  // Reconstruct the grace deadline in Manila time by extracting the date part
  // from the ISO string in Manila timezone
  const manilaStr = clockIn.toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const manilaDate = new Date(manilaStr);
  const graceDeadline = new Date(manilaDate);
  graceDeadline.setHours(graceH, graceM, 0, 0);

  // Compare — if manila clock-in time is at or before grace deadline → On Time
  const manilaClockIn = new Date(manilaStr);
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
 */
export function computeDailyStatus(
  record: { timeInStatus?: string; clockInTime?: string } | null,
  account: {
    workDays: string[];
    noTimeLog: boolean;
    weeklyHoursTarget?: number | null;
  },
  date: Date = new Date(),
  isSuspended: boolean = false
): DailyAttendanceStatus {
  // Not scheduled today
  if (!isWorkDay(account.workDays, date)) return "No Work Day";

  // If the school declared this a suspended/no-class day:
  // — Teachers who came in still get "Suspended" (no penalty, but record is kept)
  // — Teachers who didn't come in also get "Suspended" (not "Absent" — it's a school closure,
  //   no work no pay but not a disciplinary absence)
  if (isSuspended) return "Suspended";

  // OJT/intern tracked by weekly hours — exempt from daily absent check
  if (account.weeklyHoursTarget != null) return "Exempt";

  // No-time-log employees are always exempt
  if (account.noTimeLog) return "Exempt";

  // No record → absent
  if (!record || !record.clockInTime) return "Absent";

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
 * Configurable late-deduction policy.
 *
 * Do NOT hardcode these values inside payroll calculations — always import this
 * object and read from it so the thresholds can be changed in one place.
 *
 * scheduledStart   — deduction is applied for any clock-in AFTER this time.
 * lateThreshold    — at or after this time the deduction becomes one full
 *                    hourly rate regardless of exact late minutes.
 *
 * NOTE: This is entirely separate from graceUntil / computeTimeInStatus.
 * The attendance "On Time" / "Late" label does NOT suppress the deduction.
 * Example: clock-in at 8:44 AM → status "On Time", deduction = 14 min × rate.
 */
export const LATE_DEDUCTION_CONFIG = {
  scheduledStart: "08:30" as const, // 24h "HH:MM"
  lateThreshold: "09:00" as const, // 24h "HH:MM"
  beforeThresholdMethod: "per-minute" as const,
  atThresholdMethod: "one-hourly-rate" as const,
};

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
 * Rules (driven by LATE_DEDUCTION_CONFIG — never hardcoded here):
 *   clockIn ≤ 08:30               → deduction = 0
 *   08:30 < clockIn < 09:00       → per-minute: round(hourlyRate / 60 × minutesLate, 2)
 *   clockIn ≥ 09:00               → one full hourlyRate
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

  const { scheduledStart, lateThreshold } = LATE_DEDUCTION_CONFIG;

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
 * @param scheduledStart Scheduled start time (24h "HH:MM"), e.g. "08:30"
 * @param scheduledEnd   Scheduled end time (24h "HH:MM"),   e.g. "15:00"
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
