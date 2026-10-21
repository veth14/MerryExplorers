import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth-guard";
import { getManilaDateStr } from "@/lib/calendar-events";

const NAGER_BASE = "https://date.nager.at/api/v3/PublicHolidays";

interface NagerHoliday {
  date: string;       // "YYYY-MM-DD"
  localName: string;
  name: string;
  countryCode: string;
  types: string[];
}

/**
 * POST /api/calendar-events/sync-holidays?year=YYYY
 * Fetches PH holidays from Nager.Date and upserts them into calendar_events.
 * - Idempotent: uses a stable stableKey (country:PH:year:date:name) so re-running is safe.
 * - Soft-delete aware: never re-adds an event that was manually hidden by an admin.
 * - Requires admin auth.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const todayStr = getManilaDateStr();
    const currentYear = parseInt(todayStr.slice(0, 4), 10);
    const year = parseInt(searchParams.get("year") || String(currentYear), 10);

    const resp = await fetch(`${NAGER_BASE}/${year}/PH`, {
      headers: { Accept: "application/json" },
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: `Nager.Date returned ${resp.status} for year ${year}` },
        { status: 502 }
      );
    }

    const holidays: NagerHoliday[] = await resp.json();
    const { db } = await connectToDatabase();
    const now = new Date().toISOString();

    let synced = 0;
    let skipped = 0;

    for (const h of holidays) {
      const stableKey = `PH:${year}:${h.date}:${h.localName || h.name}`;

      // Check if an admin has already hidden this specific auto-holiday
      const existing = await db
        .collection("calendar_events")
        .findOne({ stableKey });

      if (existing?.hidden) {
        // Admin explicitly hid/deleted this — do not re-add
        skipped++;
        continue;
      }

      await db.collection("calendar_events").updateOne(
        { stableKey },
        {
          $set: {
            stableKey,
            title: h.localName || h.name,
            type: "holiday",
            startDate: h.date,
            endDate: null,
            visibility: "public",
            source: "holiday_auto",
            autoAdded: true,
            notes: `Philippine Public Holiday (${h.types?.join(", ") || "Public"})`,
            updatedBy: auth.user.uid,
            updatedAt: now,
          },
          $setOnInsert: {
            hidden: false,
            createdBy: auth.user.uid,
          },
        },
        { upsert: true }
      );
      synced++;
    }

    // Mark this year as synced so the admin page knows
    await db.collection("calendar_holiday_sync").updateOne(
      { year, country: "PH" },
      { $set: { year, country: "PH", syncedAt: now, count: synced } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, year, synced, skipped });
  } catch (err) {
    console.error("[sync-holidays POST]", err);
    return NextResponse.json({ error: "Failed to sync holidays" }, { status: 500 });
  }
}

/**
 * GET /api/calendar-events/sync-holidays?year=YYYY
 * Returns whether the given year has been synced already.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const todayStr = getManilaDateStr();
    const currentYear = parseInt(todayStr.slice(0, 4), 10);
    const year = parseInt(searchParams.get("year") || String(currentYear), 10);

    const { db } = await connectToDatabase();
    const syncDoc = await db
      .collection("calendar_holiday_sync")
      .findOne({ year, country: "PH" });

    return NextResponse.json({
      synced: !!syncDoc,
      syncedAt: syncDoc?.syncedAt || null,
      count: syncDoc?.count || 0,
    });
  } catch (err) {
    console.error("[sync-holidays GET]", err);
    return NextResponse.json({ error: "Failed to check sync status" }, { status: 500 });
  }
}
