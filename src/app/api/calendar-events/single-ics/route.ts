import { NextRequest, NextResponse } from "next/server";
import { createEvent, EventAttributes } from "ics";
import { EVENT_TYPE_META, CalendarEventType } from "@/lib/calendar-events";

/**
 * GET /api/calendar-events/single-ics
 * Generates and serves a single-event .ics file.
 * When opened on iOS (iPhone / iPad), iOS Safari automatically intercepts
 * the text/calendar response and opens the native Apple Calendar "Add Event" sheet.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title") || "Merry Explorers Event";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const type = (searchParams.get("type") || "merry_event") as CalendarEventType;
    const description = searchParams.get("description") || "";
    const location = searchParams.get("location") || "Merry Explorers Playgroup & Learning Center, North Caloocan";

    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return new NextResponse("Invalid or missing startDate (must be YYYY-MM-DD)", { status: 400 });
    }

    const [sy, sm, sd] = startDate.split("-").map(Number);
    const start: [number, number, number] = [sy, sm, sd];

    // In iCalendar standard, all-day event DTEND is exclusive (day after last active day)
    const lastDayStr = endDate && endDate >= startDate ? endDate : startDate;
    const [ey, em, ed] = lastDayStr.split("-").map(Number);
    const nextDay = new Date(ey, em - 1, ed + 1);
    const end: [number, number, number] = [
      nextDay.getFullYear(),
      nextDay.getMonth() + 1,
      nextDay.getDate(),
    ];

    const meta = EVENT_TYPE_META[type];
    const categoryLine = meta ? `${meta.emoji} ${meta.label}` : "Merry Explorers Event";
    const fullDescription = [categoryLine, description, "Merry Explorers Playgroup & Learning Center"]
      .filter(Boolean)
      .join("\n\n");

    const eventAttributes: EventAttributes = {
      title,
      start,
      end,
      description: fullDescription,
      location,
      startInputType: "local",
      endInputType: "local",
      calName: "Merry Explorers",
      status: "CONFIRMED",
      busyStatus: "FREE",
    };

    const { error, value } = createEvent(eventAttributes);
    if (error || !value) {
      console.error("[single-ics] createEvent error:", error);
      return new NextResponse("Failed to generate event calendar file", { status: 500 });
    }

    const safeFilename =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "event";

    return new NextResponse(value, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${safeFilename}.ics"`,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("[single-ics GET]", err);
    return new NextResponse("Failed to generate calendar file", { status: 500 });
  }
}
