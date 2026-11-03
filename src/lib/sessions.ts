// Shared session-counting helpers.
// Save as lib/sessions.ts and import from BOTH the parent dashboard and the Payment Tracking
// page, so a session is counted the same way everywhere.

export function parseScheduleDays(schedule: string): number[] {
    const days: number[] = [];
    const s = (schedule || "").toLowerCase();
    if (s.includes("monday – friday") || s.includes("monday - friday")) {
        return [1, 2, 3, 4, 5];
    }
    if (s.includes("monday")) days.push(1);
    if (s.includes("tuesday")) days.push(2);
    if (s.includes("wednesday")) days.push(3);
    if (s.includes("thursday")) days.push(4);
    if (s.includes("friday")) days.push(5);
    if (s.includes("saturday")) days.push(6);
    if (s.includes("sunday")) days.push(0);
    return days;
}

export function parseStartTime(classTime: string): { hour: number; minute: number } | null {
    // e.g. "9:45 AM – 11:00 AM" or "4:25 PM - 5:25 PM"
    const match = (classTime || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;
    let hour = parseInt(match[1], 10);
    const min = parseInt(match[2], 10);
    const meridiem = match[3].toUpperCase();
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    return { hour, minute: min };
}

export function parseEndTime(classTime: string): { hour: number; minute: number } | null {
    const matches = [...(classTime || "").matchAll(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi)];
    if (matches.length < 2) return null;
    const match = matches[1];
    let hour = parseInt(match[1], 10);
    const min = parseInt(match[2], 10);
    const meridiem = match[3].toUpperCase();
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    return { hour, minute: min };
}

// Same logic the parent dashboard uses: every scheduled class day from the enrolled date,
// today only counts once class has ended.
// Holiday and class suspension dates in `skipDates` are excluded so non-class days are never counted.
export function getCompletedSessionsCount(
    enrolledAtStr: string | undefined,
    schedule: string,
    classTime: string,
    skipDates?: Set<string>
): number {
    if (!enrolledAtStr) return 0;
    const days = parseScheduleDays(schedule);
    const endTime = parseEndTime(classTime) || parseStartTime(classTime);
    if (days.length === 0 || !endTime) return 0;

    const startDate = new Date(enrolledAtStr);
    startDate.setHours(0, 0, 0, 0);

    const now = new Date();
    let count = 0;
    const current = new Date(startDate);
    const pad = (x: number) => String(x).padStart(2, "0");

    while (current <= now) {
        if (days.includes(current.getDay())) {
            const dateStr = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
            if (!skipDates?.has(dateStr)) {
                const isToday = current.toDateString() === now.toDateString();
                if (isToday) {
                    const endOfClassToday = new Date(now);
                    endOfClassToday.setHours(endTime.hour, endTime.minute, 0, 0);
                    if (now >= endOfClassToday) count++;
                } else {
                    count++;
                }
            }
        }
        current.setDate(current.getDate() + 1);
    }
    return count;
}

/**
 * Matches a student's program string or slug to its official ProgramScheduleResult from /api/programs/schedules.
 */
export function matchProgramSchedule(
    schedules: any[] | undefined | null,
    programNameOrSlug: string | undefined | null
): any | undefined {
    if (!programNameOrSlug || !Array.isArray(schedules) || schedules.length === 0) return undefined;
    const p = programNameOrSlug.toLowerCase().trim();
    return schedules.find((s) => {
        const key = (s.programKey || "").toLowerCase();
        const slug = (s.slug || "").toLowerCase();
        const short = (s.shortName || "").toLowerCase();
        if (key === p || slug === p || short === p) return true;
        if (p.includes("curious") && key.includes("curious")) return true;
        if (p.includes("creative") && key.includes("creative")) return true;
        if (p.includes("everyday") && key.includes("everyday")) return true;
        if (
            (p.includes("brave") || p.includes("trailblazer")) &&
            (key.includes("brave") || key.includes("trailblazer"))
        )
            return true;
        if (p.includes("ballet") && key.includes("ballet")) return true;
        if (p.includes("playdate") && key.includes("playdate")) return true;
        return false;
    });
}

export interface CalendarSessionProgress {
    totalSessions: number;
    completedSessions: number;
    remainingSessions: number;
    adventureNumber: number;
    currentSessionLabel: string;
    isTodayClassDay: boolean;
    todayStatus: "upcoming" | "in_progress" | "completed" | "none";
    nextSessionDate: Date | null;
    nextSessionLabel: string | null;
    source: "calendar" | "fallback";
}

/**
 * Calculates accurate session progress directly from the official school calendar.
 * Automatically respects:
 * - Holidays and Class Suspensions (already factored into programSchedule.sessions)
 * - Program-specific meeting days (Mon/Wed for Curious, Tue/Thu/Fri for Creative, etc.)
 * - Class end time for today's session
 * - Adventure number from settings
 */
export function calculateCalendarSessionProgress({
    programSchedule,
    schedule = "",
    classTime = "",
    enrolledAt,
    skipDates,
    now = new Date(),
}: {
    programSchedule?: any;
    schedule?: string;
    classTime?: string;
    enrolledAt?: string;
    skipDates?: Set<string>;
    now?: Date;
}): CalendarSessionProgress {
    const pad = (x: number) => String(x).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const startTime = parseStartTime(classTime);
    const endTime = parseEndTime(classTime) || startTime;

    // ── CALENDAR CONNECTED CALCULATION ──
    if (programSchedule && Array.isArray(programSchedule.sessions) && programSchedule.sessions.length > 0) {
        const total = Number(programSchedule.totalSessions) || programSchedule.sessions.length;
        const adventureNumber = Number(programSchedule.adventureNumber) || 1;
        const enrolledIso = enrolledAt ? String(enrolledAt).slice(0, 10) : null;

        let completed = 0;
        let todaySession: any = null;
        let todayStatus: "upcoming" | "in_progress" | "completed" | "none" = "none";
        let nextSessionItem: any = null;

        for (const s of programSchedule.sessions) {
            // If student enrolled later than this session, ignore past sessions before enrollment
            if (enrolledIso && s.dateStr < enrolledIso) {
                continue;
            }

            if (s.dateStr < todayStr) {
                completed++;
            } else if (s.dateStr === todayStr) {
                todaySession = s;
                if (endTime) {
                    const endToday = new Date(now);
                    endToday.setHours(endTime.hour, endTime.minute, 0, 0);
                    const startToday = startTime ? new Date(now) : null;
                    if (startToday && startTime) startToday.setHours(startTime.hour, startTime.minute, 0, 0);

                    if (now >= endToday) {
                        completed++;
                        todayStatus = "completed";
                    } else if (startToday && now >= startToday) {
                        todayStatus = "in_progress";
                    } else {
                        todayStatus = "upcoming";
                    }
                } else {
                    todayStatus = "upcoming";
                }
            } else if (s.dateStr > todayStr && !nextSessionItem) {
                nextSessionItem = s;
            }
        }

        // Determine next upcoming date for countdown
        let nextDate: Date | null = null;
        let nextLabel: string | null = null;

        if (todaySession && todayStatus !== "completed" && startTime) {
            const d = new Date(now);
            d.setHours(startTime.hour, startTime.minute, 0, 0);
            if (d > now) {
                nextDate = d;
                nextLabel = `Today · ${todaySession.formattedDate || todayStr}`;
            }
        }

        if (!nextDate && nextSessionItem) {
            const [ny, nm, nd] = nextSessionItem.dateStr.split("-").map(Number);
            const d = new Date(ny, nm - 1, nd);
            if (startTime) d.setHours(startTime.hour, startTime.minute, 0, 0);
            nextDate = d;
            nextLabel = nextSessionItem.formattedDate || nextSessionItem.dateStr;
        }

        const remaining = Math.max(0, total - completed);
        const currentNum = todaySession ? todaySession.sessionNumber : (nextSessionItem ? nextSessionItem.sessionNumber : completed);

        return {
            totalSessions: total,
            completedSessions: completed,
            remainingSessions: remaining,
            adventureNumber,
            currentSessionLabel: `Session ${currentNum} of ${total}`,
            isTodayClassDay: !!todaySession,
            todayStatus,
            nextSessionDate: nextDate,
            nextSessionLabel: nextLabel,
            source: "calendar",
        };
    }

    // ── FALLBACK (when programSchedule isn't loaded yet) ──
    const completedFallback = getCompletedSessionsCount(enrolledAt, schedule, classTime, skipDates);
    return {
        totalSessions: 18,
        completedSessions: completedFallback,
        remainingSessions: Math.max(0, 18 - completedFallback),
        adventureNumber: 1,
        currentSessionLabel: `Session ${completedFallback}`,
        isTodayClassDay: false,
        todayStatus: "none",
        nextSessionDate: null,
        nextSessionLabel: null,
        source: "fallback",
    };
}

// Calendar date (YYYY-MM-DD) of the Nth *actual* class day, counting from the enrolled date
// (inclusive). Holiday / suspension dates in `skipDates` are automatically skipped so that the
// 6th-session due date always reflects reality (e.g. a Monday holiday pushes the count forward).
export function getNthSessionDate(
    enrolledAtStr: string | undefined,
    schedule: string,
    n: number,
    skipDates?: Set<string>
): string | null {
    if (!enrolledAtStr) return null;
    const days = parseScheduleDays(schedule);
    if (days.length === 0) return null;

    const d = new Date(enrolledAtStr);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);

    let count = 0;
    for (let i = 0; i < 800; i++) {
        const pad = (x: number) => String(x).padStart(2, "0");
        const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        if (days.includes(d.getDay()) && !(skipDates?.has(dateStr))) {
            count++;
            if (count === n) return dateStr;
        }
        d.setDate(d.getDate() + 1);
    }
    return null;
}