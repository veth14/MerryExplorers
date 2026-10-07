// src/lib/session-balance.ts
//
// Single source of truth for the virtual-session "pay when you can" balance.
// Both the admin page and the parent dashboard import this, so the numbers always match.
//
// Rule: every session the admin ends adds one session rate to the account balance.
// Only VERIFIED payments reduce it. Payments still being checked are reported separately.

/** Set to true if registration already covers the very first session. */
export const FIRST_SESSION_PREPAID = false;

/** Per-session rate when the account has no promo. */
export const DEFAULT_SESSION_RATE = 675;

export type SessionBalance = {
    /** Price of one session (promo price if the account has one). */
    rate: number;
    /** Sessions the admin has ended. */
    sessionsDone: number;
    /** Sessions that count toward the bill (after the prepaid first session, if any). */
    billedSessions: number;
    /** billedSessions × rate. */
    totalBilled: number;
    /** Sum of verified payments. */
    verifiedPaid: number;
    /** Sum of payments submitted but not yet verified or rejected. */
    checking: number;
    /** What the family still owes. Never below zero. */
    balance: number;
};

function sumPaid(payments: any[]): number {
    return payments.reduce((total, p) => total + (Number(p?.amountPaid) || 0), 0);
}

/**
 * @param acc      The parent account/profile (needs virtualSessionsCompleted, promoDiscount,
 *                 and optionally sessionPayments and sessionBalance).
 * @param payments Optional payments list to use instead of acc.sessionPayments
 *                 (the parent dashboard loads payments separately).
 */
export function getSessionBalance(acc: any, payments?: any[]): SessionBalance {
    const rate: number = acc?.promoDiscount?.finalPrice ?? DEFAULT_SESSION_RATE;
    const sessionsDone: number = acc?.virtualSessionsCompleted || 0;
    const billedSessions = Math.max(0, sessionsDone - (FIRST_SESSION_PREPAID ? 1 : 0));

    const list: any[] = payments ?? acc?.sessionPayments ?? [];
    const verifiedPaid = sumPaid(list.filter((p) => p?.verified));
    const checking = sumPaid(list.filter((p) => !p?.verified && !p?.rejected));

    const totalBilled = billedSessions * rate;

    // Prefer a server-computed balance if the API provides one.
    const balance: number =
        typeof acc?.sessionBalance === "number"
            ? acc.sessionBalance
            : Math.max(0, totalBilled - verifiedPaid);

    return { rate, sessionsDone, billedSessions, totalBilled, verifiedPaid, checking, balance };
}