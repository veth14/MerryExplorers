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
export function getCompletedSessionsCount(enrolledAtStr: string | undefined, schedule: string, classTime: string): number {
    if (!enrolledAtStr) return 0;
    const days = parseScheduleDays(schedule);
    const endTime = parseEndTime(classTime) || parseStartTime(classTime);
    if (days.length === 0 || !endTime) return 0;

    const startDate = new Date(enrolledAtStr);
    startDate.setHours(0, 0, 0, 0);

    const now = new Date();
    let count = 0;
    const current = new Date(startDate);

    while (current <= now) {
        if (days.includes(current.getDay())) {
            const isToday = current.toDateString() === now.toDateString();
            if (isToday) {
                const endOfClassToday = new Date(now);
                endOfClassToday.setHours(endTime.hour, endTime.minute, 0, 0);
                if (now >= endOfClassToday) count++;
            } else {
                count++;
            }
        }
        current.setDate(current.getDate() + 1);
    }
    return count;
}

// Calendar date (YYYY-MM-DD) of the Nth class day, counting from the enrolled date (inclusive).
// Uses the same day-by-day counting as getCompletedSessionsCount, so session N here is the day
// the dashboard's counter reaches N.
export function getNthSessionDate(enrolledAtStr: string | undefined, schedule: string, n: number): string | null {
    if (!enrolledAtStr) return null;
    const days = parseScheduleDays(schedule);
    if (days.length === 0) return null;

    const d = new Date(enrolledAtStr);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);

    let count = 0;
    for (let i = 0; i < 800; i++) {
        if (days.includes(d.getDay())) {
            count++;
            if (count === n) {
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            }
        }
        d.setDate(d.getDate() + 1);
    }
    return null;
}