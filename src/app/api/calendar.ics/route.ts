import { NextRequest, NextResponse } from "next/server";
import { createEvents, EventAttributes } from "ics";
import { connectToDatabase } from "@/lib/mongodb";
import { getManilaDateStr, deriveProgramEvents, EVENT_TYPE_META, deduplicateCalendarEvents, CalendarEvent } from "@/lib/calendar-events";

/**
 * GET /api/calendar.ics
 * Public, read-only .ics calendar feed.
 * - Only visibility="public" events
 * - Includes live program-derived events
 * - All-day events (VALUE=DATE array)
 * - Stable UIDs so calendar apps update existing entries on re-subscription
 */
export async function GET(_req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const todayStr = getManilaDateStr();
    const currentYear = parseInt(todayStr.slice(0, 4), 10);

    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear + 1}-12-31`;

    const docs = await db
      .collection("calendar_events")
      .find({
        visibility: "public",
        hidden: { $ne: true },
        startDate: { $gte: yearStart, $lte: yearEnd },
      })
      .sort({ startDate: 1 })
      .toArray();

    // Live program events
    let programEvents: ReturnType<typeof deriveProgramEvents> = [];
    try {
      const settingsDoc = await db
        .collection("settings")
        .findOne({ _key: "renewal_settings_v2" });
      if (settingsDoc?.programs) {
        programEvents = deriveProgramEvents(settingsDoc.programs).filter(
          (e) => e.visibility === "public"
        );
      }
    } catch { /* non-fatal */ }

    /** Parse "YYYY-MM-DD" into a [year, month, day] tuple for ics */
    function toDateArray(s: string): [number, number, number] {
      const [y, m, d] = s.split("-").map(Number);
      return [y, m, d];
    }

    function buildDescription(type: string, notes?: string | null): string {
      const meta = EVENT_TYPE_META[type as keyof typeof EVENT_TYPE_META];
      const typeLine = meta ? `${meta.emoji} ${meta.label}` : type;
      return [typeLine, notes].filter(Boolean).join("\n\n");
    }

    const icsEvents: EventAttributes[] = [];

    // Combine manual and program events and deduplicate
    const combinedEvents: CalendarEvent[] = [
      ...docs.map((d) => ({
        _id: d.stableKey ? `${d.stableKey}@merryexplorers` : d._id.toString(),
        title: d.title,
        type: d.type,
        startDate: d.startDate,
        endDate: d.endDate,
        visibility: d.visibility as "public",
        source: d.source,
        notes: d.notes,
      })),
      ...programEvents,
    ];

    const uniqueEvents = deduplicateCalendarEvents(combinedEvents);

    for (const e of uniqueEvents) {
      const uid = e._id.includes("@") ? e._id : `${e._id}@merryexplorers`;
      const start = toDateArray(e.startDate);
      const endDateStr = e.endDate && e.endDate > e.startDate ? e.endDate : e.startDate;
      const endParts = toDateArray(endDateStr);
      const endExclusive: [number, number, number] = (() => {
        const d = new Date(endParts[0], endParts[1] - 1, endParts[2] + 1);
        return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
      })();

      icsEvents.push({
        uid,
        title: e.title,
        description: buildDescription(e.type, e.notes),
        start,
        end: endExclusive,
        startInputType: "local",
        endInputType: "local",
        calName: "Merry Explorers Adventure Calendar",
      });
    }

    const { error, value } = createEvents(icsEvents);

    if (error || !value) {
      console.error("[calendar.ics] createEvents error:", error);
      return new NextResponse("Failed to generate calendar feed", { status: 500 });
    }

    return new NextResponse(value, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="merry-explorers-calendar.ics"',
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("[calendar.ics GET]", err);
    return new NextResponse("Failed to generate calendar feed", { status: 500 });
  }
}
