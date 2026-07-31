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
  Mon: { start: "08:30", graceUntil: "08:45", normalEnd: "15:00", flexFloor: "14:00" },
  Tue: { start: "08:30", graceUntil: "08:45", normalEnd: "17:00", flexFloor: null },
  Wed: { start: "08:30", graceUntil: "08:45", normalEnd: "15:00", flexFloor: "14:00" },
  Thu: { start: "08:30", graceUntil: "08:45", normalEnd: "17:00", flexFloor: null },
  Fri: { start: "08:30", graceUntil: "08:45", normalEnd: "15:00", flexFloor: null },
  Sat: { start: "08:30", graceUntil: "08:45", normalEnd: "12:00", flexFloor: "10:30" },
};

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
