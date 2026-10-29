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
};

export type ScheduleTable = Record<Exclude<DayAbbr, "Sun">, DaySchedule>;

/**
 * Historical company-wide schedule (before October 26, 2026):
 *   Mon / Wed:       9:00 AM – 6:00 PM (8 hrs credited, 0 owed)
 *   Tue / Thu / Fri: 11:00 AM – 6:00 PM (6 hrs credited, 2 hrs owed)
 *   Sat:             10:00 AM – 3:00 PM
 */
export const SCHEDULE_PRE_OCT_26: ScheduleTable = {
  Mon: { start: "09:00", graceUntil: "09:00", normalEnd: "18:00" },
  Tue: { start: "11:00", graceUntil: "11:00", normalEnd: "18:00" },
  Wed: { start: "09:00", graceUntil: "09:00", normalEnd: "18:00" },
  Thu: { start: "11:00", graceUntil: "11:00", normalEnd: "18:00" },
  Fri: { start: "11:00", graceUntil: "11:00", normalEnd: "18:00" },
  Sat: { start: "10:00", graceUntil: "10:00", normalEnd: "15:00" },
};

/**
 * Default standard company-wide schedule starting October 26, 2026:
 *   Mon – Fri: 9:00 AM – 5:00 PM (8h span - 1h break = 7 hrs credited, 1 hr owed for Saturday offset)
 *   Sat:       10:00 AM – 3:00 PM
 *
 * NO GRACE PERIOD: graceUntil equals start, so any clock-in after start time is "Late".
 */
export const SCHEDULE_OCT_26_DEFAULT: ScheduleTable = {
  Mon: { start: "09:00", graceUntil: "09:00", normalEnd: "17:00" },
  Tue: { start: "09:00", graceUntil: "09:00", normalEnd: "17:00" },
  Wed: { start: "09:00", graceUntil: "09:00", normalEnd: "17:00" },
  Thu: { start: "09:00", graceUntil: "09:00", normalEnd: "17:00" },
  Fri: { start: "09:00", graceUntil: "09:00", normalEnd: "17:00" },
  Sat: { start: "09:00", graceUntil: "09:00", normalEnd: "15:00" },
};

/** Export SCHEDULE as current default for backward compatibility */
export const SCHEDULE: ScheduleTable = SCHEDULE_OCT_26_DEFAULT;

/**
 * Ian Angelo Valmores fixed shift: 9:30 AM – 6:30 PM (Mon – Thu only; Fri, Sat, Sun are OFF)
 */
export const IAN_WORK_DAYS: DayAbbr[] = ["Mon", "Tue", "Wed", "Thu"];

export const IAN_SCHEDULE: ScheduleTable = {
  Mon: { start: "09:30", graceUntil: "09:30", normalEnd: "18:30" },
  Tue: { start: "09:30", graceUntil: "09:30", normalEnd: "18:30" },
  Wed: { start: "09:30", graceUntil: "09:30", normalEnd: "18:30" },
  Thu: { start: "09:30", graceUntil: "09:30", normalEnd: "18:30" },
  Fri: { start: "09:30", graceUntil: "09:30", normalEnd: "18:30" }, // fallback
  Sat: { start: "09:30", graceUntil: "09:30", normalEnd: "18:30" }, // fallback
};

export const REQUIRED_DAILY_HOURS = 8;

export type ScheduleConfigItem = {
  effectiveFrom: string; // "YYYY-MM-DD"
  schedule: ScheduleTable;
  breaks?: Partial<Record<Exclude<DayAbbr, "Sun">, number>>;
  requiredDailyHours?: number;
};

/**
 * Returns "YYYY-MM-DD" in Asia/Manila time zone.
 */
export function toManilaDateStr(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

export function formatTime24To12(hhmm: string): string {
  if (!hhmm || !hhmm.includes(":")) return hhmm || "";
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function formatShiftLabel(schedule: DaySchedule): string {
  return `${formatTime24To12(schedule.start)} - ${formatTime24To12(schedule.normalEnd)}`;
}

export function getScheduleTableForDate(
  date: Date,
  employeeName?: string,
  dynamicConfigs?: ScheduleConfigItem[]
): ScheduleTable {
  if (employeeName && employeeName.toLowerCase().includes("ian angelo valmores")) {
    return IAN_SCHEDULE;
  }

  const dateStr = toManilaDateStr(date);

  // If dynamic configurations from MongoDB are supplied, use the one matching effectiveFrom <= dateStr
  if (dynamicConfigs && dynamicConfigs.length > 0) {
    const sorted = [...dynamicConfigs].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
    const matched = sorted.find((c) => c.effectiveFrom <= dateStr);
    if (matched && matched.schedule) {
      return matched.schedule;
    }
  }

  // Built-in date-boundary: any historical attendance before Oct 26, 2026 retains the old schedule!
  if (dateStr < "2026-10-26") {
    return SCHEDULE_PRE_OCT_26;
  }

  return SCHEDULE_OCT_26_DEFAULT;
}

/**
 * Per-day break schedule (minutes to deduct from raw clock-in/out hours).
 *
 * MONDAY TO FRIDAY: 60 minutes
 * SATURDAY: 45 minutes
 */
export const BREAK_SCHEDULE: Record<Exclude<DayAbbr, "Sun">, number> = {
  Mon: 60,
  Tue: 60,
  Wed: 60,
  Thu: 60,
  Fri: 60,
  Sat: 45,
};

export function getBreakMinutes(dayOfWeek: number, date?: Date, dynamicConfigs?: ScheduleConfigItem[]): number {
  if (dayOfWeek === 0) return 0; // Sunday
  const abbr = (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const)[dayOfWeek] as Exclude<DayAbbr, "Sun">;
  if (date) {
    return getBreakMinutesForDate(date, dynamicConfigs);
  }
  return BREAK_SCHEDULE[abbr] ?? 60;
}

export function getBreakMinutesForDate(date: Date, dynamicConfigs?: ScheduleConfigItem[]): number {
  const day = getDayAbbr(date);
  if (day === "Sun") return 0;
  const abbr = day as Exclude<DayAbbr, "Sun">;

  const dateStr = toManilaDateStr(date);
  if (dynamicConfigs && dynamicConfigs.length > 0) {
    const sorted = [...dynamicConfigs].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
    const matched = sorted.find((c) => c.effectiveFrom <= dateStr);
    if (matched?.breaks?.[abbr] !== undefined) {
      return matched.breaks[abbr]!;
    }
  }

  return BREAK_SCHEDULE[abbr] ?? 60;
}

// ── Status types ─────────────────────────────────────────────────────────────────
export type TimeInStatus = "On Time" | "Late" | "Exempt";
export type DailyAttendanceStatus = "On Time" | "Late" | "Absent" | "Exempt" | "No Work Day" | "Suspended" | "Holiday" | "Future";

// ── Helpers ──────────────────────────────────────────────────────────────────────

export function getDayAbbr(date: Date): DayAbbr {
  const manilaLocale = date.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "Asia/Manila",
  });
  return manilaLocale as DayAbbr;
}

export function getScheduleForDate(
  date: Date,
  employeeName?: string,
  dynamicConfigs?: ScheduleConfigItem[]
): DaySchedule | null {
  const day = getDayAbbr(date);
  if (day === "Sun") return null;

  // Friday and Saturday are OFF for Ian Angelo Valmores
  if (employeeName && employeeName.toLowerCase().includes("ian angelo valmores")) {
    if (day === "Fri" || day === "Sat") return null;
  }

  const table = getScheduleTableForDate(date, employeeName, dynamicConfigs);
  return table[day as Exclude<DayAbbr, "Sun">];
}

export function getScheduledHours(
  date: Date,
  employeeName?: string,
  dynamicConfigs?: ScheduleConfigItem[]
): number | null {
  const schedule = getScheduleForDate(date, employeeName, dynamicConfigs);
  if (!schedule) return null;
  const [sH, sM] = schedule.start.split(":").map(Number);
  const [eH, eM] = schedule.normalEnd.split(":").map(Number);
  const shiftMins = eH * 60 + eM - (sH * 60 + sM);
  return Math.max(0, shiftMins - getBreakMinutesForDate(date, dynamicConfigs)) / 60;
}

export function getOffsetHoursOwed(
  date: Date,
  employeeName?: string,
  dynamicConfigs?: ScheduleConfigItem[]
): number {
  const day = getDayAbbr(date);
  if (day === "Sat" || day === "Sun") return 0;

  const scheduled = getScheduledHours(date, employeeName, dynamicConfigs);
  if (scheduled === null) return 0;
  return Math.max(0, REQUIRED_DAILY_HOURS - scheduled);
}

export function isWorkDay(workDays: string[], date: Date, employeeName?: string): boolean {
  const day = getDayAbbr(date);
  if (employeeName && employeeName.toLowerCase().includes("ian angelo valmores")) {
    return IAN_WORK_DAYS.includes(day);
  }
  return workDays.includes(day);
}

export function computeTimeInStatus(
  clockInISO: string,
  noTimeLog: boolean,
  employeeName?: string,
  dynamicConfigs?: ScheduleConfigItem[]
): TimeInStatus {
  if (noTimeLog) return "Exempt";

  const clockIn = new Date(clockInISO);
  const day = getDayAbbr(clockIn);

  if (day === "Sun") return "Exempt";

  const scheduleTable = getScheduleTableForDate(clockIn, employeeName, dynamicConfigs);
  const schedule = scheduleTable[day as Exclude<DayAbbr, "Sun">];

  const [graceH, graceM] = schedule.graceUntil.split(":").map(Number);

  const manilaStr = clockIn.toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const manilaDate = new Date(manilaStr);
  const graceDeadline = new Date(manilaDate);
  graceDeadline.setHours(graceH, graceM, 0, 0);

  const manilaClockIn = new Date(manilaStr);
  manilaClockIn.setSeconds(0, 0);
  return manilaClockIn <= graceDeadline ? "On Time" : "Late";
}

export function computeDailyStatus(
  record: { timeInStatus?: string; clockInTime?: string } | null,
  account: {
    workDays: string[];
    noTimeLog: boolean;
    weeklyHoursTarget?: number | null;
    fullName?: string;
  },
  date: Date = new Date(),
  isSuspended: boolean = false,
  dayOffType: "suspension" | "holiday" = "suspension"
): DailyAttendanceStatus {
  if (!isWorkDay(account.workDays, date, account.fullName)) return "No Work Day";
  if (isSuspended) return dayOffType === "holiday" ? "Holiday" : "Suspended";
  if (account.weeklyHoursTarget != null) return "Exempt";
  if (account.noTimeLog) return "Exempt";

  if (!record || !record.clockInTime) {
    const nowManilaStr = new Date().toLocaleDateString("en-US", { timeZone: "Asia/Manila" });
    const dateManilaStr = date.toLocaleDateString("en-US", { timeZone: "Asia/Manila" });
    const nowManila = new Date(nowManilaStr);
    const dateManila = new Date(dateManilaStr);

    if (dateManila > nowManila) return "Future";
    return "Absent";
  }

  let status = record.timeInStatus as TimeInStatus | undefined;
  // If status was marked Late, but the clockInTime evaluates to On Time (e.g. after manual correction to 9:00 AM),
  // automatically resolve to On Time.
  if (!status || (status === "Late" && record.clockInTime)) {
    const recomputed = computeTimeInStatus(record.clockInTime, account.noTimeLog, account.fullName);
    if (recomputed === "On Time") {
      status = "On Time";
    }
  }

  return (status ?? computeTimeInStatus(record.clockInTime, account.noTimeLog, account.fullName)) as DailyAttendanceStatus;
}

// ── Human-readable helpers ────────────────────────────────────────────────────────

export function formatWorkDays(workDays: string[]): string {
  const ORDER: DayAbbr[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return ORDER.filter((d) => workDays.includes(d)).join(" · ");
}

export function formatEmploymentLabel(
  employmentType: "full-time" | "part-time",
  weeklyHoursTarget: number | null | undefined
): string {
  if (weeklyHoursTarget != null) return `OJT / Intern (${weeklyHoursTarget} hrs/wk)`;
  return employmentType === "full-time" ? "Full-Time" : "Part-Time";
}

// ── Late-arrival deduction ────────────────────────────────────────────────────

export type LateDeductionConfig = {
  scheduledStart: string; // 24h "HH:MM"
  lateThreshold: string; // 24h "HH:MM"
  beforeThresholdMethod: "per-minute";
  atThresholdMethod: "one-hourly-rate";
};

export const LATE_THRESHOLD_MINUTES_AFTER_START = 30;

function addMinutesToTime(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function getLateDeductionConfigForDate(
  date: Date,
  employeeName?: string,
  dynamicConfigs?: ScheduleConfigItem[]
): LateDeductionConfig {
  const day = getDayAbbr(date);
  const table = getScheduleTableForDate(date, employeeName, dynamicConfigs);
  const schedule = table[day === "Sun" ? "Mon" : (day as Exclude<DayAbbr, "Sun">)];
  return {
    scheduledStart: schedule.start,
    lateThreshold: addMinutesToTime(schedule.start, LATE_THRESHOLD_MINUTES_AFTER_START),
    beforeThresholdMethod: "per-minute",
    atThresholdMethod: "one-hourly-rate",
  };
}

export type LateDeductionMethod = "none" | "per-minute" | "threshold";

export type LateDeductionResult = {
  lateMinutes: number;
  deduction: number;
  method: LateDeductionMethod;
};

export function computeLateDeduction(
  clockInISO: string,
  hourlyRate: number,
  noTimeLog: boolean,
  employeeName?: string,
  dynamicConfigs?: ScheduleConfigItem[]
): LateDeductionResult {
  if (noTimeLog) return { lateMinutes: 0, deduction: 0, method: "none" };

  const { scheduledStart, lateThreshold } = getLateDeductionConfigForDate(
    new Date(clockInISO),
    employeeName,
    dynamicConfigs
  );

  const clockIn = new Date(clockInISO);
  const manilaStr = clockIn.toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const manilaIn = new Date(manilaStr);

  const [startH, startM] = scheduledStart.split(":").map(Number);
  const [threshH, threshM] = lateThreshold.split(":").map(Number);

  const startBoundary = new Date(manilaIn);
  startBoundary.setHours(startH, startM, 0, 0);

  const threshBoundary = new Date(manilaIn);
  threshBoundary.setHours(threshH, threshM, 0, 0);

  if (manilaIn <= startBoundary) {
    return { lateMinutes: 0, deduction: 0, method: "none" };
  }

  if (manilaIn >= threshBoundary) {
    return { lateMinutes: 0, deduction: hourlyRate, method: "threshold" };
  }

  const lateMinutes = Math.floor(
    (manilaIn.getTime() - startBoundary.getTime()) / 60_000,
  );
  const deduction = parseFloat(((hourlyRate / 60) * lateMinutes).toFixed(2));
  return { lateMinutes, deduction, method: "per-minute" };
}

// ── Scheduled-hours clamping ──────────────────────────────────────────────────

export function computeCreditedHours(
  clockInISO: string,
  clockOutISO: string,
  scheduledStart: string,
  scheduledEnd: string,
  breakMins: number,
): number {
  const clockIn = new Date(clockInISO);
  const clockOut = new Date(clockOutISO);

  const manilaInStr = clockIn.toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const manilaOutStr = clockOut.toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const manilaIn = new Date(manilaInStr);
  const manilaOut = new Date(manilaOutStr);

  const [startH, startM] = scheduledStart.split(":").map(Number);
  const [endH, endM] = scheduledEnd.split(":").map(Number);

  const schedStart = new Date(manilaIn);
  schedStart.setHours(startH, startM, 0, 0);

  const schedEnd = new Date(manilaIn);
  schedEnd.setHours(endH, endM, 0, 0);

  const effectiveStart = manilaIn < schedStart ? schedStart : manilaIn;
  const effectiveEnd = manilaOut > schedEnd ? schedEnd : manilaOut;

  const elapsedMs = Math.max(0, effectiveEnd.getTime() - effectiveStart.getTime());
  // Only deduct break if the employee worked more than 4 hours (240 mins)
  // Ensures half-day shifts (e.g. 9:00 AM - 12:00 PM = 3h) are not unfairly penalized with a lunch break deduction
  const effectiveBreakMins = elapsedMs > 240 * 60_000 ? breakMins : 0;

  const creditedMs = Math.max(0, elapsedMs - effectiveBreakMins * 60_000);
  return parseFloat((creditedMs / 3_600_000).toFixed(2));
}