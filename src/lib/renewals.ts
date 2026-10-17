import type { Db } from "mongodb";
import { PROGRAM_SLOTS } from "@/data/landing";
import { requireAdmin } from "@/lib/auth-guard";
import { FALLBACK_PIONEER_RATES } from "@/lib/payment-terms";

// ---------------------------------------------------------------------------
// Shared config: ONE place for values both GET and PATCH depend on
// ---------------------------------------------------------------------------
export const DOWNPAYMENT_RATE = 0.6;
export const MIN_STUDENTS_PER_SESSION = 3;
export { FALLBACK_PIONEER_RATES };

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
            pioneerDocs.flatMap((p: any) => [p.email, p.email2].map((email: string) => (email || "").toLowerCase().trim()).filter(Boolean))
        ),
    };
}

export function computeTuition(reg: any, ctx: PricingContext, familyIsPioneer = false) {
    const progDef = (PROGRAM_SLOTS as Record<string, any>)[reg.program];
    const email = (reg.parentInfo?.email || "").toLowerCase().trim();
    const isPioneer = Boolean(reg.isPioneer || ctx.pioneerEmails.has(email) || familyIsPioneer);
    const pioneerRate = ctx.pioneerPrices[reg.program] || FALLBACK_PIONEER_RATES[reg.program] || null;

    const customRate = Number(reg.customRate) || 0;
    const standardRate = progDef ? progDef.rate : 0;
    const totalTuition = isPioneer && pioneerRate
        ? pioneerRate
        : customRate || Number(reg.amountDue) || standardRate || 0;

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
