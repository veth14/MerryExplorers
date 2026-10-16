import type { Db } from "mongodb";
import { PROGRAM_SLOTS } from "@/data/landing";
import { requireAdmin } from "@/lib/auth-guard";

// ---------------------------------------------------------------------------
// Shared config: ONE place for values both GET and PATCH depend on
// ---------------------------------------------------------------------------
export const RENEWAL_PROMO_CODE = "A1RENEWAL2026";
export const RESERVATION_DEADLINE_ISO = "2026-10-16T13:00:00+08:00";
export const DOWNPAYMENT_RATE = 0.6;
export const MIN_STUDENTS_PER_SESSION = 3;
export const FALLBACK_PIONEER_RATES: Record<string, number> = { "creative-explorer": 4820 };

export const RENEWAL_STATUSES = ["reserved", "confirmed", "for_release", "released"] as const;
export type RenewalStatus = (typeof RENEWAL_STATUSES)[number];

// ---------------------------------------------------------------------------
// Auth shared by the legacy renewal endpoints.
// ---------------------------------------------------------------------------
export async function isAdmin(request: Request): Promise<boolean> {
    const auth = await requireAdmin(request);
    return !("response" in auth);
}

// ---------------------------------------------------------------------------
// Matching helpers
// ---------------------------------------------------------------------------
export const normName = (s: string) => (s || "").toLowerCase().replace(/\s+/g, "");

export const familyKey = (email: string, child: string) =>
    `${(email || "").toLowerCase().trim()}___${normName(child)}`;

export const safeDate = (value: any, fallbackIso: string): Date => {
    const d = value ? new Date(value) : new Date(fallbackIso);
    return isNaN(d.getTime()) ? new Date(fallbackIso) : d;
};

export const childFullName = (reg: any) =>
    `${reg.childInfo?.firstName || ""} ${reg.childInfo?.lastName || ""}`.trim();

// ---------------------------------------------------------------------------
// Pricing (previously duplicated, and different, in GET and PATCH)
// ---------------------------------------------------------------------------
export type PricingContext = {
    pioneerPrices: Record<string, number>;
    pioneerEmails: Set<string>;
};

export async function loadPricingContext(db: Db): Promise<PricingContext> {
    const settings = await db.collection("settings").findOne({ _key: "pioneer_settings_v1" });
    const pioneerDocs = await db.collection("pioneer_families").find({}).toArray();
    return {
        pioneerPrices: settings?.pioneerPrices || {},
        pioneerEmails: new Set(
            pioneerDocs.map((p: any) => (p.email || "").toLowerCase().trim()).filter(Boolean)
        ),
    };
}

export function computeTuition(reg: any, ctx: PricingContext, familyIsPioneer = false) {
    const progDef = (PROGRAM_SLOTS as Record<string, any>)[reg.program];
    const email = (reg.parentInfo?.email || "").toLowerCase().trim();
    const isPioneer = Boolean(reg.isPioneer || ctx.pioneerEmails.has(email) || familyIsPioneer);
    const pioneerRate = ctx.pioneerPrices[reg.program] || FALLBACK_PIONEER_RATES[reg.program] || null;

    const totalTuition =
        Number(reg.customRate) ||
        (isPioneer && pioneerRate ? pioneerRate : 0) ||
        Number(reg.amountDue) ||
        (progDef ? progDef.rate : 0) ||
        0;

    const expectedDownpayment =
        Math.round(totalTuition * DOWNPAYMENT_RATE) || (progDef ? progDef.downpayment : 0) || 0;

    return { totalTuition, expectedDownpayment, isPioneer };
}

export function totalPaid(reg: any): number {
    const initial = Number(reg.amountPaid) || 0;
    const balance = Array.isArray(reg.balancePayments)
        ? reg.balancePayments.reduce((s: number, b: any) => s + (Number(b.amountPaid) || 0), 0)
        : 0;
    return initial + balance;
}
