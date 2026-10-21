import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { PublicCalendarView } from "@/components/calendar/public-calendar-view";
import { connectToDatabase } from "@/lib/mongodb";
import {
  CalendarEvent,
  getManilaDateStr,
  deriveProgramEvents,
  deduplicateCalendarEvents,
} from "@/lib/calendar-events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Adventure Calendar — Merry Explorers",
  description:
    "View upcoming Merry Explorers adventure starts, public registration dates, renewal windows, and Philippine holidays. Subscribe to our live .ics feed.",
};

// ─── Server Data Fetching ─────────────────────────────────────────────────────

async function getPublicEvents(month: string): Promise<CalendarEvent[]> {
  try {
    const { db } = await connectToDatabase();
    const [y, m] = month.split("-").map(Number);
    const firstDay = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;

    const docs = await db
      .collection("calendar_events")
      .find({
        visibility: "public",
        hidden: { $ne: true },
        $or: [
          { startDate: { $gte: firstDay, $lte: lastDay } },
          { startDate: { $lt: firstDay }, endDate: { $gte: firstDay } },
        ],
      })
      .sort({ startDate: 1 })
      .limit(200)
      .toArray();

    const events: CalendarEvent[] = docs.map((d) => ({
      _id: d._id.toString(),
      title: d.title,
      type: d.type,
      startDate: d.startDate,
      endDate: d.endDate,
      visibility: d.visibility as "public",
      source: d.source,
      sourceRef: d.sourceRef,
      notes: d.notes,
      imageUrl: d.imageUrl || undefined,
      autoAdded: d.autoAdded,
    }));

    // Merge live program events
    try {
      const settingsDoc = await db
        .collection("settings")
        .findOne({ _key: "renewal_settings_v2" });
      if (settingsDoc?.programs) {
        const progEvents = deriveProgramEvents(settingsDoc.programs).filter(
          (e) =>
            e.visibility === "public" &&
            e.startDate >= firstDay &&
            e.startDate <= lastDay
        );
        return deduplicateCalendarEvents([...events, ...progEvents]).sort((a, b) =>
          a.startDate.localeCompare(b.startDate)
        );
      }
    } catch { /* non-fatal */ }

    return deduplicateCalendarEvents(events);
  } catch {
    return [];
  }
}

async function getUpcomingPublicEvents(limit = 4): Promise<CalendarEvent[]> {
  try {
    const { db } = await connectToDatabase();
    const todayStr = getManilaDateStr();

    const docs = await db
      .collection("calendar_events")
      .find({
        visibility: "public",
        hidden: { $ne: true },
        startDate: { $gte: todayStr },
      })
      .sort({ startDate: 1 })
      .limit(limit * 2)
      .toArray();

    const events: CalendarEvent[] = docs.map((d) => ({
      _id: d._id.toString(),
      title: d.title,
      type: d.type,
      startDate: d.startDate,
      endDate: d.endDate,
      visibility: "public" as const,
      source: d.source,
      notes: d.notes,
      imageUrl: d.imageUrl || undefined,
      autoAdded: d.autoAdded,
    }));

    try {
      const settingsDoc = await db
        .collection("settings")
        .findOne({ _key: "renewal_settings_v2" });
      if (settingsDoc?.programs) {
        const progEvents = deriveProgramEvents(settingsDoc.programs).filter(
          (e) => e.visibility === "public" && e.startDate >= todayStr
        );
        return deduplicateCalendarEvents([...events, ...progEvents])
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
          .slice(0, limit);
      }
    } catch { /* non-fatal */ }

    return deduplicateCalendarEvents(events).slice(0, limit);
  } catch {
    return [];
  }
}

// ─── Public Calendar Page ─────────────────────────────────────────────────────

export default async function PublicCalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const today = getManilaDateStr();
  const currentMonthStr = today.slice(0, 7);
  const rawMonth = params?.month || currentMonthStr;

  // Validate YYYY-MM
  const monthParam = /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : currentMonthStr;

  const [events, upcomingEvents] = await Promise.all([
    getPublicEvents(monthParam),
    getUpcomingPublicEvents(4),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://merryexplorers.com";

  return (
    <div className="min-h-screen bg-[#faf9f5] flex flex-col font-sans selection:bg-[#FFC107] selection:text-[#0a1835]">
      {/* ── Official Site Header (Floating Pill Navigation) ── */}
      <SiteHeader />

      {/* ── Main Interactive Calendar (Hero + Grid + Custom Subscribe Modal) ── */}
      <main className="flex-1">
        <PublicCalendarView
          initialMonth={monthParam}
          initialEvents={events}
          upcomingEvents={upcomingEvents}
          siteUrl={siteUrl}
        />
      </main>

      {/* ── Official Site Footer ── */}
      <SiteFooter />
    </div>
  );
}
