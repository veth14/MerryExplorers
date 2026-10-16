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

// Class days per program. The PROGRAM decides the schedule, so it is the same for every student.
//  - Curious Explorer ........ Monday, Wednesday
//  - Creative Explorer ....... Tuesday, Thursday, Friday
//  - Trailblazer (Brave) ..... Monday to Friday
//  - Everyday Explorer ....... Monday to Friday
// Written as a comma list (no "–" range) so getNthSessionDate can always read it.
export const PROGRAM_SCHEDULE: Record<string, string> = {
    "curious-explorer": "Monday, Wednesday",
    "creative-explorer": "Tuesday, Thursday, Friday",
    "brave-explorer": "Monday, Tuesday, Wednesday, Thursday, Friday", // Trailblazer
    "everyday-explorer": "Monday, Tuesday, Wednesday, Thursday, Friday",
};

// Old name kept so any file that still imports it keeps working.
export const PROGRAM_SCHEDULE_FALLBACK = PROGRAM_SCHEDULE;

export const VERIFIED_REG_STATUSES = ["approved", "early-bird", "active", "scholar"];
export const isRegistrationVerified = (status?: string) => VERIFIED_REG_STATUSES.includes(status || "");

export function fmtPeso(n: number | undefined | null) {
    return `₱${(n ?? 0).toLocaleString()}`;
}

// "YYYY-MM-DD" -> "Jun 1, 2026"
export function fmtIsoDate(iso: string) {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// How many Mondays have passed since the due date (the due day itself doesn't count).
// `now` is the "as of" moment: today by default, or the date the parent actually paid.
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
    const isPioneer = Boolean(reg.isPioneer);
    const progRate = reg.customRate || (isPioneer && reg.program === "creative-explorer" ? 4820 : (isPioneer && reg.program === "curious-explorer" ? 4295 : prog.rate));
    const items: FeeItem[] = [{ key: "program", label: isPioneer ? "Program fee (Pioneer)" : "Program fee", amount: progRate }];

    const welcome = !isPioneer && (on(reg.welcomeKit) || on(reg.isNewFamily) || on(reg.newFamily) || on(reg.welcomeKitOrdered));
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

// CHANGED: new optional 3rd parameter `adventureStart`.
// Enrolled date + schedule for a student. `account` is the parent account / profile.
// `adventureStart` ("YYYY-MM-DD") = first day of the Adventure this registration belongs to.
// Sessions are never counted before it, so a family that pays early is not charged for
// sessions that have not happened yet.
// The schedule comes from the PROGRAM first (PROGRAM_SCHEDULE above). Only programs that
// are not in that list fall back to whatever is saved on the student / account.
export function getStudentSessionInfo(reg: any, account?: any, adventureStart?: string) {
    const info = account?.studentInfo;
    let enrolledAt: string | undefined = info?.enrolledAt || reg?.approvedAt;
    const schedule: string =
        PROGRAM_SCHEDULE[reg?.program] || info?.schedule || account?.schedule || (PROGRAM_SLOTS as any)?.[reg?.program]?.schedule || "";
    const classTime: string = info?.classTime || account?.classTime || reg?.classTime || "";

    if (adventureStart) {
        const base = enrolledAt ? String(enrolledAt).slice(0, 10) : null;
        const d = new Date();
        const todayIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (base && base < adventureStart) enrolledAt = adventureStart;           // approved before classes started
        else if (!base && adventureStart > todayIso) enrolledAt = adventureStart; // still pending, Adventure not started yet
    }
    return { enrolledAt, schedule, classTime };
}

export function getBalanceDueDate(student: { enrolledAt?: string; schedule: string }): string | null {
    return getNthSessionDate(student.enrolledAt, student.schedule, BALANCE_DUE_SESSION);
}

// The full breakdown for one registration.
// `asOf` = the moment interest is calculated up to. Leave it out for "today";
// pass the payment date when recording a payment that was made earlier.
export function calcRegistrationTerms(
    reg: any,
    student: { enrolledAt?: string; schedule: string },
    paidVerified: number,
    fallbackDue?: number,
    asOf: Date = new Date()
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
            mondays = countMondaysAfter(dueDate, asOf);
            interest = Math.round(balance * WEEKLY_INTEREST_RATE * mondays);
        }
    }
    const totalPayable = balance != null ? balance + interest : null;
    const interestStart = dueDate && balance && balance > 0 ? firstInterestDate(dueDate) : null;
    return { interestStart, due, items: getRegistrationItems(reg), paidVerified, balance, reservation, balanceShare, dueDate, mondays, interest, totalPayable };
}