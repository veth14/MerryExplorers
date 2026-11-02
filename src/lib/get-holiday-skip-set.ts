/**
 * Server-side helper — fetches all holidays and suspensions from the DB
 * and returns them as a Set<"YYYY-MM-DD"> for use in payment-term calculations.
 *
 * Call this inside any API route that already has a `db` connection, then pass
 * the result as the `skipDates` parameter to `calcRegistrationTerms()`.
 *
 * This is intentionally NOT a React hook or client component — it is server-only.
 */
import type { Db } from "mongodb";

export async function getHolidaySkipSet(db: Db): Promise<Set<string>> {
    const [holidays, suspensions] = await Promise.all([
        db
            .collection("suspended_days")
            .find({ type: { $in: ["holiday", "suspension"] }, hidden: { $ne: true } })
            .project({ dateStr: 1 })
            .toArray(),
        db
            .collection("calendar_events")
            .find({ type: { $in: ["holiday", "suspension"] }, hidden: { $ne: true } })
            .project({ startDate: 1 })
            .toArray(),
    ]);

    const set = new Set<string>();
    for (const h of holidays) {
        if (h.dateStr) set.add(String(h.dateStr).slice(0, 10));
    }
    for (const e of suspensions) {
        if (e.startDate) set.add(String(e.startDate).slice(0, 10));
    }
    return set;
}
