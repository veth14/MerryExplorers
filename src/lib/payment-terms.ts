// Single source of truth for payment rules + math.
// Used by BOTH the admin Payment Tracking page and the parent dashboards,
// so the numbers always match.
import { PROGRAM_SLOTS, UNIFORM_KIT } from "@/data/landing";
import { getNthSessionDate } from "@/lib/sessions";

// Payment terms:
//  - 60% non-refundable reservation payment upon registration
//  - 40% balance due on the 6th session
//  - 4% interest on overdue balances, charged weekly every Monday
export const RESERVATION_RATE = 0.6;
export const WEEKLY_INTEREST_RATE = 0.04;
export const BALANCE_DUE_SESSION = 6;

// Class days per program. Only used when the student's own record has no schedule saved.
export const PROGRAM_SCHEDULE_FALLBACK: Record<string, string> = {
    "brave-explorer": "Monday – Friday", // Trailblazer
    "curious-explorer": "Monday, Wednesday",
    "creative-explorer": "Tuesday, Thursday, Friday",
};

export const VERIFIED_REG_STATUSES = ["approved", "early-bird", "active"];
export const isRegistrationVerified = (status?: string) => VERIFIED_REG_STATUSES.includes(status || "");

export function fmtPeso(n: number | undefined | null) {
    return `₱${(n ?? 0).toLocaleString()}`;
}

// "YYYY-MM-DD" -> "Jun 1, 2026"
export function fmtIsoDate(iso: string) {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// How many Mondays have passed since the due date (the due day itself doesn't count)
export function countMondaysAfter(dueIso: string, now = new Date()) {
    const d = new Date(dueIso + "T00:00:00");
    d.setDate(d.getDate() + 1);
    let count = 0;
    while (d <= now) {
        if (d.getDay() === 1) count++;
        d.setDate(d.getDate() + 1);
    }
    return count;
}

// Add-on prices (Uniform & Add-ons section of the registration form)
export const WELCOME_KIT_PRICE = 750; // required for new families
export const UNIFORM_SET_PRICE = 550; // uniform set only (returning families, optional)

const on = (v: any) => !!v && v !== "no" && v !== "false";

export type FeeItem = { key: string; label: string; amount: number };

// Itemised cost of a registration: program fee + Welcome Kit and/or Uniform Set.
// NOTE: the field names below are my best guess; adjust them to match your registration records.
export function getRegistrationItems(reg: any): FeeItem[] {
    const prog = reg ? PROGRAM_SLOTS[reg.program as keyof typeof PROGRAM_SLOTS] : undefined;
    if (!reg || !prog) return [];
    const items: FeeItem[] = [{ key: "program", label: "Program fee", amount: prog.rate }];

    const welcome = on(reg.welcomeKit) || on(reg.isNewFamily) || on(reg.newFamily) || on(reg.welcomeKitOrdered);
    const uniformSet = on(reg.uniformSetOnly) || on(reg.uniformSet) || on(reg.uniformSetOrdered);
    if (welcome) items.push({ key: "welcome", label: "Welcome Kit", amount: WELCOME_KIT_PRICE });
    if (uniformSet) items.push({ key: "uniform", label: "Uniform Set", amount: UNIFORM_SET_PRICE });

    // Older records only have `uniformOrdered` (what Payment Tracking used before)
    if (!welcome && !uniformSet && on(reg.uniformOrdered)) {
        items.push({ key: "kit", label: "Uniform / Welcome Kit", amount: UNIFORM_KIT.price });
    }
    return items;
}

// First Monday strictly after the due date: the day the first 4% is charged ("YYYY-MM-DD")
export function firstInterestDate(dueIso: string): string {
    const d = new Date(dueIso + "T00:00:00");
    d.setDate(d.getDate() + 1);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Full cost of a registration = sum of its items.
export function getRegistrationTotal(reg: any, fallback?: number): number | undefined {
    const items = getRegistrationItems(reg);
    if (items.length === 0) return fallback;
    return items.reduce((sum, i) => sum + i.amount, 0);
}

// Enrolled date + schedule for a student. `account` is the parent account / profile.
export function getStudentSessionInfo(reg: any, account?: any) {
    const info = account?.studentInfo;
    const enrolledAt: string | undefined = info?.enrolledAt || reg?.approvedAt;
    const schedule: string =
        info?.schedule || account?.schedule || PROGRAM_SCHEDULE_FALLBACK[reg?.program] || (PROGRAM_SLOTS as any)?.[reg?.program]?.schedule || "";
    const classTime: string = info?.classTime || account?.classTime || reg?.classTime || "";
    return { enrolledAt, schedule, classTime };
}

export function getBalanceDueDate(student: { enrolledAt?: string; schedule: string }): string | null {
    return getNthSessionDate(student.enrolledAt, student.schedule, BALANCE_DUE_SESSION);
}

// The full breakdown for one registration.
export function calcRegistrationTerms(
    reg: any,
    student: { enrolledAt?: string; schedule: string },
    paidVerified: number,
    fallbackDue?: number
) {
    const rawDue = getRegistrationTotal(reg, fallbackDue);
    const due = rawDue && rawDue > 0 ? rawDue : null;
    const balance = due != null ? Math.max(0, due - paidVerified) : null;

    let reservation: number | null = null;
    let balanceShare: number | null = null;
    let dueDate: string | null = null;
    let mondays = 0;
    let interest = 0;
    if (due != null) {
        reservation = Math.round(due * RESERVATION_RATE);
        balanceShare = due - reservation;
        dueDate = getBalanceDueDate(student);
        if (dueDate && balance && balance > 0) {
            mondays = countMondaysAfter(dueDate);
            interest = Math.round(balance * WEEKLY_INTEREST_RATE * mondays);
        }
    }
    const totalPayable = balance != null ? balance + interest : null;
    const interestStart = dueDate && balance && balance > 0 ? firstInterestDate(dueDate) : null;
    return { interestStart, due, items: getRegistrationItems(reg), paidVerified, balance, reservation, balanceShare, dueDate, mondays, interest, totalPayable };
}