/**
 * program-sessions.ts
 *
 * Core engine for computing program schedules, session numbers, start dates, and end dates.
 *
 * Business Rules:
 * - Each program has a specific schedule (meeting days) and number of sessions per adventure:
 *     - Discovery Club: Curious Explorer: Monday & Wednesday (2 days/wk) -> 8 sessions
 *     - Discovery Club: Creative Explorer: Tuesday, Thursday & Friday (3 days/wk) -> 12 sessions
 *     - Discovery Club: Everyday Explorer: Monday to Friday (5 days/wk) -> 14 sessions
 *     - Trailblazer: Brave Explorer: Monday to Friday (5 days/wk) -> 18 sessions
 *     - Ballet: Saturdays -> 5 sessions
 *     - Saturday Playdate: Saturdays -> 5 sessions
 *     - Virtual Tutorial: Flexible / On-demand
 * - Automatic Skip & Shift:
 *     - If a program meeting day falls on a Holiday or Class Suspension (from calendar_events or suspended_days),
 *       that day is automatically SKIPPED and does not consume a session number.
 *     - The session is shifted forward to the next valid program meeting day.
 *     - The final session determines the program's calculated End Date.
 * - Indicators:
 *     - Each session clearly indicates the Adventure Number (e.g., Adventure 2 · Session 1 of 8).
 */

export interface ProgramScheduleConfig {
  programKey: string;
  slug: string;
  shortName: string;
  days: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  dayNames: string[]; // ["Mon", "Wed"] etc.
  defaultSessions: number;
  scheduleLabel: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  badge: string;
  gradient: string;
  ageRange: string;
}

export const PROGRAM_SCHEDULE_CONFIGS: Record<string, ProgramScheduleConfig> = {
  "Discovery Club: Curious Explorer": {
    programKey: "Discovery Club: Curious Explorer",
    slug: "curious-explorer",
    shortName: "Curious Explorer",
    days: [1, 3], // Monday & Wednesday
    dayNames: ["Mon", "Wed"],
    defaultSessions: 8,
    scheduleLabel: "Monday & Wednesday",
    emoji: "🔎",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
    badge: "bg-amber-100 text-amber-900 border-amber-300",
    gradient: "from-amber-500/10 to-orange-500/10",
    ageRange: "Ages 1.5 – 4.11",
  },
  "Discovery Club: Creative Explorer": {
    programKey: "Discovery Club: Creative Explorer",
    slug: "creative-explorer",
    shortName: "Creative Explorer",
    days: [2, 4, 5], // Tuesday, Thursday & Friday
    dayNames: ["Tue", "Thu", "Fri"],
    defaultSessions: 12,
    scheduleLabel: "Tuesday, Thursday & Friday",
    emoji: "🎨",
    color: "#0284c7",
    bg: "#f0f9ff",
    border: "#bae6fd",
    badge: "bg-sky-100 text-sky-900 border-sky-300",
    gradient: "from-sky-500/10 to-blue-500/10",
    ageRange: "Ages 2.6 – 4.11",
  },
  "Discovery Club: Everyday Explorer": {
    programKey: "Discovery Club: Everyday Explorer",
    slug: "everyday-explorer",
    shortName: "Everyday Explorer",
    days: [1, 2, 3, 4, 5], // Monday - Friday
    dayNames: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    defaultSessions: 14,
    scheduleLabel: "Monday – Friday",
    emoji: "🌈",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    badge: "bg-emerald-100 text-emerald-900 border-emerald-300",
    gradient: "from-emerald-500/10 to-teal-500/10",
    ageRange: "Ages 1.5 – 4.11",
  },
  "Trailblazer: Brave Explorer": {
    programKey: "Trailblazer: Brave Explorer",
    slug: "brave-explorer",
    shortName: "Brave Explorer",
    days: [1, 2, 3, 4, 5], // Monday - Friday
    dayNames: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    defaultSessions: 18,
    scheduleLabel: "Monday – Friday",
    emoji: "🏕️",
    color: "#4f46e5",
    bg: "#eef2ff",
    border: "#c7d2fe",
    badge: "bg-indigo-100 text-indigo-900 border-indigo-300",
    gradient: "from-indigo-500/10 to-violet-500/10",
    ageRange: "Ages 3 – 4.11",
  },
  "Saturday Playdate": {
    programKey: "Saturday Playdate",
    slug: "saturday-playdate",
    shortName: "Saturday Playdate",
    days: [6], // Saturdays
    dayNames: ["Sat"],
    defaultSessions: 5,
    scheduleLabel: "Saturdays",
    emoji: "🛝",
    color: "#0ea5e9",
    bg: "#f0f9ff",
    border: "#bae6fd",
    badge: "bg-cyan-100 text-cyan-900 border-cyan-300",
    gradient: "from-sky-500/10 to-cyan-500/10",
    ageRange: "Little Explorers",
  },
  "Ballet": {
    programKey: "Ballet",
    slug: "ballet",
    shortName: "Ballet",
    days: [6], // Saturdays
    dayNames: ["Sat"],
    defaultSessions: 5,
    scheduleLabel: "Saturdays",
    emoji: "🩰",
    color: "#be185d",
    bg: "#fdf2f8",
    border: "#fbcfe8",
    badge: "bg-pink-100 text-pink-900 border-pink-300",
    gradient: "from-pink-500/10 to-rose-500/10",
    ageRange: "Ages 3 – 12",
  },
  "Virtual Tutorial": {
    programKey: "Virtual Tutorial",
    slug: "virtual-tutorial",
    shortName: "Virtual Tutorial",
    days: [],
    dayNames: [],
    defaultSessions: 1,
    scheduleLabel: "Flexible / On-Demand",
    emoji: "🖥️",
    color: "#6d28d9",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    badge: "bg-purple-100 text-purple-900 border-purple-300",
    gradient: "from-purple-500/10 to-violet-500/10",
    ageRange: "All Ages",
  },
};

export const PROGRAM_KEYS_LIST = Object.keys(PROGRAM_SCHEDULE_CONFIGS);

export interface ProgramSessionItem {
  sessionNumber: number; // 1 to N
  totalSessions: number; // e.g. 8 or 12
  adventureNumber: number; // e.g. 2
  programKey: string;
  programShortName: string;
  dateStr: string; // "YYYY-MM-DD"
  dayName: string; // "Mon", "Tue", etc.
  formattedDate: string; // "Mon, Oct 26, 2026"
  isCompleted: boolean; // dateStr < todayStr
  isToday: boolean; // dateStr === todayStr
  status: "completed" | "today" | "upcoming";
}

export interface SkippedDateItem {
  dateStr: string;
  dayName: string;
  formattedDate: string;
  reason: string;
  type: "holiday" | "suspension";
  originalMeetingDay: boolean;
  movedSessionNumber: number;
}

export interface ProgramScheduleResult {
  programKey: string;
  shortName: string;
  slug: string;
  adventureNumber: number;
  startDate: string; // "YYYY-MM-DD"
  formattedStartDate: string; // "Oct 26, 2026"
  endDate: string; // "YYYY-MM-DD"
  formattedEndDate: string; // "Nov 18, 2026"
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  sessions: ProgramSessionItem[];
  skippedDates: SkippedDateItem[];
  config: ProgramScheduleConfig;
  hasStartDate: boolean;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatFullFriendlyDate(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function getManilaTodayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Computes the exact session schedule for a single program, automatically
 * skipping holidays and suspensions, and shifting subsequent session dates.
 */
export function generateProgramSchedule({
  programKey,
  adventureNumber,
  startDateStr,
  totalSessions,
  holidaysMap,
  suspensionsMap,
  todayStr = getManilaTodayStr(),
}: {
  programKey: string;
  adventureNumber: number;
  startDateStr?: string | null;
  totalSessions?: number | null;
  holidaysMap: Map<string, string> | Record<string, string>;
  suspensionsMap: Map<string, string> | Record<string, string>;
  todayStr?: string;
}): ProgramScheduleResult {
  const config = PROGRAM_SCHEDULE_CONFIGS[programKey] || {
    programKey,
    slug: programKey.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    shortName: programKey,
    days: [1, 2, 3, 4, 5],
    dayNames: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    defaultSessions: 8,
    scheduleLabel: "Weekdays",
    emoji: "🎒",
    color: "#0033a0",
    bg: "#f0f5ff",
    border: "#d6e4ff",
    badge: "bg-blue-100 text-blue-900 border-blue-300",
    gradient: "from-blue-500/10 to-indigo-500/10",
    ageRange: "All Explorers",
  };

  const getReason = (map: Map<string, string> | Record<string, string>, date: string): string | undefined => {
    return map instanceof Map ? map.get(date) : map[date];
  };

  const sessionsCount = Math.max(1, totalSessions || config.defaultSessions);

  if (!startDateStr) {
    return {
      programKey,
      shortName: config.shortName,
      slug: config.slug,
      adventureNumber,
      startDate: "",
      formattedStartDate: "Not set",
      endDate: "",
      formattedEndDate: "Not set",
      totalSessions: sessionsCount,
      completedSessions: 0,
      remainingSessions: sessionsCount,
      sessions: [],
      skippedDates: [],
      config,
      hasStartDate: false,
    };
  }

  const cleanStart = startDateStr.slice(0, 10);
  const [sy, sm, sd] = cleanStart.split("-").map(Number);
  const cur = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0));

  const sessions: ProgramSessionItem[] = [];
  const skippedDates: SkippedDateItem[] = [];

  // For programs without fixed meeting days (e.g. Virtual Tutorial)
  const meetingDays = config.days.length > 0 ? config.days : [1, 2, 3, 4, 5];

  let count = 0;
  let safety = 0;

  while (count < sessionsCount && safety < 365) {
    safety++;
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cur.getUTCDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    const dow = cur.getUTCDay();

    if (meetingDays.includes(dow)) {
      const holidayReason = getReason(holidaysMap, dateStr);
      const suspensionReason = getReason(suspensionsMap, dateStr);

      if (holidayReason) {
        skippedDates.push({
          dateStr,
          dayName: DAY_NAMES[dow],
          formattedDate: formatFullFriendlyDate(dateStr),
          reason: holidayReason,
          type: "holiday",
          originalMeetingDay: true,
          movedSessionNumber: count + 1,
        });
      } else if (suspensionReason) {
        skippedDates.push({
          dateStr,
          dayName: DAY_NAMES[dow],
          formattedDate: formatFullFriendlyDate(dateStr),
          reason: suspensionReason,
          type: "suspension",
          originalMeetingDay: true,
          movedSessionNumber: count + 1,
        });
      } else {
        count++;
        const isCompleted = dateStr < todayStr;
        const isToday = dateStr === todayStr;
        sessions.push({
          sessionNumber: count,
          totalSessions: sessionsCount,
          adventureNumber,
          programKey,
          programShortName: config.shortName,
          dateStr,
          dayName: DAY_NAMES[dow],
          formattedDate: formatFullFriendlyDate(dateStr),
          isCompleted,
          isToday,
          status: isCompleted ? "completed" : isToday ? "today" : "upcoming",
        });
      }
    }

    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const startDate = sessions[0]?.dateStr || cleanStart;
  const endDate = sessions[sessions.length - 1]?.dateStr || cleanStart;
  const completedSessions = sessions.filter((s) => s.isCompleted).length;
  const remainingSessions = sessionsCount - completedSessions;

  return {
    programKey,
    shortName: config.shortName,
    slug: config.slug,
    adventureNumber,
    startDate,
    formattedStartDate: formatFriendlyDate(startDate),
    endDate,
    formattedEndDate: formatFriendlyDate(endDate),
    totalSessions: sessionsCount,
    completedSessions,
    remainingSessions,
    sessions,
    skippedDates,
    config,
    hasStartDate: true,
  };
}

export type ProgramRenewalEntryLike = {
  programKey: string;
  currentAdventure?: number | null;
  adventureStartDate?: string | null;
  [key: string]: unknown;
};

/**
 * Computes schedules for all active programs.
 */
export function getAllProgramsSchedules({
  programs,
  holidaysMap,
  suspensionsMap,
  todayStr = getManilaTodayStr(),
}: {
  programs?: ProgramRenewalEntryLike[] | null;
  holidaysMap: Map<string, string> | Record<string, string>;
  suspensionsMap: Map<string, string> | Record<string, string>;
  todayStr?: string;
}): ProgramScheduleResult[] {
  const list: ProgramRenewalEntryLike[] =
    programs && programs.length > 0
      ? programs
      : PROGRAM_KEYS_LIST.map((key) => ({ programKey: key }));

  return list.map((p) => {
    const config = PROGRAM_SCHEDULE_CONFIGS[p.programKey];
    const currentAdv = Number(p.currentAdventure) || 2;
    return generateProgramSchedule({
      programKey: p.programKey,
      adventureNumber: currentAdv,
      startDateStr: p.adventureStartDate,
      totalSessions: config?.defaultSessions ?? 8,
      holidaysMap,
      suspensionsMap,
      todayStr,
    });
  });
}

/**
 * Groups sessions by date string ("YYYY-MM-DD") for fast calendar lookups.
 */
export function buildSessionsByDateMap(
  schedules: ProgramScheduleResult[]
): Record<string, ProgramSessionItem[]> {
  const map: Record<string, ProgramSessionItem[]> = {};

  for (const sched of schedules) {
    for (const session of sched.sessions) {
      if (!map[session.dateStr]) map[session.dateStr] = [];
      map[session.dateStr].push(session);
    }
  }

  return map;
}

/**
 * Groups skipped dates by date string ("YYYY-MM-DD") for fast calendar lookups.
 */
export function buildSkippedDatesByDateMap(
  schedules: ProgramScheduleResult[]
): Record<string, Array<{ programKey: string; shortName: string; skipped: SkippedDateItem }>> {
  const map: Record<string, Array<{ programKey: string; shortName: string; skipped: SkippedDateItem }>> = {};

  for (const sched of schedules) {
    for (const item of sched.skippedDates) {
      if (!map[item.dateStr]) map[item.dateStr] = [];
      map[item.dateStr].push({
        programKey: sched.programKey,
        shortName: sched.shortName,
        skipped: item,
      });
    }
  }

  return map;
}
