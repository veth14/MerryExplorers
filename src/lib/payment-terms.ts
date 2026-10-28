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
export const LEGACY_ADVENTURE_1_START = "2026-09-28";
export const FALLBACK_PIONEER_RATES: Record<string, number> = {
    "creative-explorer": 4820,
    "curious-explorer": 4295,
};

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

// NEW: registration `program` slug -> `programKey` used in /api/renewal-settings.
// Each program has its OWN "Adv N Started" / "Adv N Starts" dates on the Programs page.
export const PROGRAM_KEY_BY_SLUG: Record<string, string> = {
    "curious-explorer": "Discovery Club: Curious Explorer",
    "creative-explorer": "Discovery Club: Creative Explorer",
    "everyday-explorer": "Discovery Club: Everyday Explorer",
    "brave-explorer": "Trailblazer: Brave Explorer",
};

export const VERIFIED_REG_STATUSES = ["approved", "early-bird", "active", "scholar"];
export const isRegistrationVerified = (status?: string) => VERIFIED_REG_STATUSES.includes(status || "");

export function fmtPeso(n: number | undefined | null) {
    return `₱${(n ?? 0).toLocaleString()}`;
}

// "YYYY-MM-DD" -> "Jun 1, 2026"
export function fmtIsoDate(iso: string) {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// How many Mondays have passed from the due date onward.
// A due date that falls on a Monday counts as the first interest Monday.
// `now` is the "as of" moment: today by default, or the date the parent actually paid.
export function countMondaysAfter(dueIso: string, now = new Date()) {
    const d = new Date(dueIso + "T00:00:00");
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
    const customRate = Number(reg.customRate) || 0;
    const pioneerFallback = FALLBACK_PIONEER_RATES[reg.program];
    const progRate = isPioneer
        ? (customRate && customRate !== prog.rate ? customRate : pioneerFallback || customRate || prog.rate)
        : customRate || prog.rate;
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

// First Monday on or after the due date: the day the first 4% is charged ("YYYY-MM-DD")
export function firstInterestDate(dueIso: string): string {
    const d = new Date(dueIso + "T00:00:00");
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

// NEW: the start date of Adventure `advNum` for ONE program, read from that program's own
// entry in /api/renewal-settings (the same data as the Programs & Registration Control page).
//   settings   = the `programs` array returned by /api/renewal-settings
//   programSlug = reg.program (e.g. "brave-explorer")
//   advNum     = which Adventure the registration belongs to
//   todayIso   = "YYYY-MM-DD" (Manila date is best)
// Returns undefined when the program has no saved date, so the caller can fall back.
export function getProgramAdventureStart(
    settings: any[] | undefined | null,
    programSlug: string | undefined,
    advNum: number,
    todayIso: string
): string | undefined {
    if (!settings || !programSlug) return undefined;
    const key = PROGRAM_KEY_BY_SLUG[programSlug];
    const entry = key ? settings.find((p) => p?.programKey === key) : undefined;
    if (!entry) return undefined;

    const day = (v: any) => (v ? String(v).slice(0, 10) : null);
    let cur = Math.floor(Number(entry.currentAdventure)) || 1;
    let curStart = day(entry.adventureStartDate);
    let nextStart = day(entry.nextAdventureStart);

    // The settings route rolls the cycle when the next start date arrives, but only when it is called.
    // Do the same roll here so the switch still happens on a page that stays open.
    if (nextStart && todayIso >= nextStart) {
        cur += 1;
        curStart = nextStart;
        nextStart = null;
    }

    if (advNum === cur && curStart) return curStart;
    if (advNum === cur + 1 && nextStart) return nextStart;
    return undefined;
}

export function getManilaTodayIso() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
}

/**
 * Resolve the Adventure start date for a registration using the same settings
 * timeline as Payment Tracking. Older registrations can have a stale
 * adventureStartDate copied at signup, so callers should prefer this result.
 */
export function getRegistrationAdventureStart(
    settings: any[] | undefined | null,
    registration: any,
    todayIso: string
): string | undefined {
    const day = (value: any) => value ? String(value).slice(0, 10) : null;
    const addDays = (iso: string, count: number) => {
        const date = new Date(`${iso}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() + count);
        return date.toISOString().slice(0, 10);
    };
    const addMonths = (iso: string, count: number) => {
        const date = new Date(`${iso}T00:00:00Z`);
        date.setUTCMonth(date.getUTCMonth() + count);
        return date.toISOString().slice(0, 10);
    };

    const masterKey = PROGRAM_KEY_BY_SLUG["curious-explorer"];
    const master = settings?.find((entry) => entry?.programKey === masterKey && (day(entry?.nextAdventureStart) || day(entry?.adventureStartDate)))
        ?? settings?.find((entry) => day(entry?.nextAdventureStart) || day(entry?.adventureStartDate));
    let currentNumber = Math.floor(Number(master?.currentAdventure)) || 1;
    let currentStart = day(master?.adventureStartDate);
    let nextStart = day(master?.nextAdventureStart);
    if (!master) {
        currentStart = "2026-06-01";
        nextStart = "2026-11-01";
    }
    if (nextStart && todayIso >= nextStart) {
        currentNumber += 1;
        currentStart = nextStart;
        nextStart = null;
    }
    if (!currentStart && nextStart) currentStart = addMonths(nextStart, -5);
    if (!currentStart) currentStart = "2026-06-01";

    const currentOpen = addDays(currentStart, -14);
    const nextOpen = nextStart ? addDays(nextStart, -14) : null;
    const dateInManila = (value: any): string | null => {
        if (!value) return null;
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
        }).format(date);
    };
    const registrationDays = [dateInManila(registration?.createdAt), dateInManila(registration?.submittedAt)]
        .filter(Boolean)
        .sort() as string[];
    const registeredDay = registrationDays[0];
    let adventureNumber = Math.floor(Number(registration?.adventure));
    if (!Number.isFinite(adventureNumber) || adventureNumber < 2) {
        adventureNumber = registeredDay
            ? nextOpen && registeredDay >= nextOpen
                ? currentNumber + 1
                : currentNumber > 1 && registeredDay < currentOpen
                    ? currentNumber - 1
                    : currentNumber
            : currentNumber;
        if (registration?.isPromoRegistration || registration?.parentInfo?.isRenewal || registration?.renewalPeriod) {
            if (registeredDay && registeredDay < currentStart && registeredDay >= addMonths(currentStart, -5)) {
                adventureNumber = Math.max(adventureNumber, currentNumber);
            } else if (nextStart && registeredDay && registeredDay >= currentStart && registeredDay < nextStart) {
                adventureNumber = Math.max(adventureNumber, currentNumber + 1);
            }
        }
    }

    const ownStart = getProgramAdventureStart(settings, registration?.program, adventureNumber, todayIso);
    if (ownStart) return ownStart;
    if (adventureNumber === currentNumber) return currentStart;
    if (adventureNumber === currentNumber + 1) return nextStart ?? addMonths(currentStart, 5);
    if (adventureNumber < currentNumber) {
        // Prefer the start date saved on the registration itself (written at approval time)
        // over the backwards month estimate, which is only approximate.
        const stored = registration?.adventureStartDate ? String(registration.adventureStartDate).slice(0, 10) : null;
        if (stored) return stored;
        // Adventure 1 actually began on Sep 28, 2026. When Adventure 2 began
        // on Oct 26, the normal five-month estimate points to May 26 instead.
        if (currentNumber === 2 && currentStart === "2026-10-26" && adventureNumber === 1) {
            return LEGACY_ADVENTURE_1_START;
        }
        return addMonths(currentStart, -5);
    }
    return undefined;
}

// Enrolled date + schedule for a student. `account` is the parent account / profile.
// `adventureStart` ("YYYY-MM-DD") = first day of the Adventure this registration belongs to.
//
// CHANGED: the approval date (reg.approvedAt) is no longer used when an adventureStart is given.
// Approval is just the day an admin clicked Verify, so it must not push the 6th-session due date later.
//   - explicit studentInfo.enrolledAt later than the Adventure start -> a real late joiner, kept as is
//   - no enrolledAt, or one before the Adventure start               -> the Adventure start date
// Without an adventureStart (older callers) the old behavior is kept: enrolledAt, else approvedAt.
export function getStudentSessionInfo(reg: any, account?: any, adventureStart?: string) {
    const info = account?.studentInfo;
    let enrolledAt: string | undefined = info?.enrolledAt || (adventureStart ? undefined : reg?.approvedAt);
    const schedule: string =
        PROGRAM_SCHEDULE[reg?.program] || info?.schedule || account?.schedule || (PROGRAM_SLOTS as any)?.[reg?.program]?.schedule || "";
    const classTime: string = info?.classTime || account?.classTime || reg?.classTime || "";

    if (adventureStart) {
        const base = enrolledAt ? String(enrolledAt).slice(0, 10) : null;
        if (!base || base < adventureStart) enrolledAt = adventureStart;
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
