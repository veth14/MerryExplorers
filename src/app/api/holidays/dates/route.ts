import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

/**
 * GET /api/holidays/dates
 * Returns a flat array of "YYYY-MM-DD" strings for all holidays and class
 * suspensions stored in both collections.  Used client-side by the Payment
 * Tracking page to build the skipDates Set for calcRegistrationTerms().
 * No authentication required — this is the same data shown on the public calendar.
 */
export async function GET() {
  try {
    const { db } = await connectToDatabase();

    const [suspended, events] = await Promise.all([
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
    for (const h of suspended) if (h.dateStr) set.add(String(h.dateStr).slice(0, 10));
    for (const e of events) if (e.startDate) set.add(String(e.startDate).slice(0, 10));

    return NextResponse.json({ dates: [...set].sort() });
  } catch (err) {
    console.error("[holidays/dates]", err);
    return NextResponse.json({ dates: [] });
  }
}
