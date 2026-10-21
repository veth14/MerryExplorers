import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { SiteHeader } from "@/components/landing/site-header";
import { HeroSection } from "@/components/landing/hero";

// Lazy-loaded components (Below the fold)
const HighlightsSection = nextDynamic(() => import("@/components/landing/highlights").then(mod => mod.HighlightsSection));
const MissionVisionSection = nextDynamic(() => import("@/components/landing/mission-vision").then(mod => mod.MissionVisionSection));
const ProgramsSection = nextDynamic(() => import("@/components/landing/programs").then(mod => mod.ProgramsSection));
const DiscoverFitSection = nextDynamic(() => import("@/components/landing/discover-fit").then(mod => mod.DiscoverFitSection));
const UniformSection = nextDynamic(() => import("@/components/landing/uniform").then(mod => mod.UniformSection));
const AboutSection = nextDynamic(() => import("@/components/landing/about").then(mod => mod.AboutSection));
const CalendarSection = nextDynamic(() => import("@/components/landing/calendar-section").then(mod => mod.CalendarSection));
const ParentPortalCTA = nextDynamic(() => import("@/components/landing/parent-portal-cta").then(mod => mod.ParentPortalCTA));
const SiteFooter = nextDynamic(() => import("@/components/landing/site-footer").then(mod => mod.SiteFooter));

import { connectToDatabase } from "@/lib/mongodb";
import { computeAdventureBadge } from "@/lib/adventure-badge";
import { ProgramRenewalEntry } from "@/app/api/renewal-settings/route";
import {
  CalendarEvent,
  CalendarEventType,
  getManilaDateStr,
  deriveProgramEvents,
  deduplicateCalendarEvents,
} from "@/lib/calendar-events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Merry Explorers — The Next Merry Adventure is Here!",
  description:
    "Explore joyful playgroup programs, updated policies, and adventure schedules. Dream. Discover. Explore. — Merry Explorers Playgroup & Learning Center, North Caloocan.",
};

async function getHeroBadge() {
  try {
    const { db } = await connectToDatabase();
    const doc = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
    if (doc?.programs) {
      return computeAdventureBadge(doc.programs as ProgramRenewalEntry[], doc.heroBadgeOverride);
    }
  } catch {
    // fallback to computed default
  }
  return computeAdventureBadge();
}

const MAJOR_EVENT_TYPES: CalendarEventType[] = [
  "adventure_start",
  "merry_event",
  "main_event",
  "renewal",
  "registration_open",
];

async function getUpcomingCalendarEvents(): Promise<CalendarEvent[]> {
  try {
    const { db } = await connectToDatabase();
    const todayStr = getManilaDateStr();
    const docs = await db
      .collection("calendar_events")
      .find({
        visibility: "public",
        hidden: { $ne: true },
        type: { $in: MAJOR_EVENT_TYPES },
        startDate: { $gte: todayStr },
      })
      .sort({ startDate: 1 })
      .limit(6)
      .toArray();

    const events: CalendarEvent[] = docs.map((d) => ({
      _id: d._id.toString(),
      title: d.title,
      type: d.type,
      startDate: d.startDate,
      endDate: d.endDate,
      visibility: "public" as const,
      source: d.source,
      description: d.description || undefined,
      notes: d.notes || undefined,
      imageUrl: d.imageUrl || undefined,
      autoAdded: d.autoAdded,
    }));

    // Merge live program events
    try {
      const settingsDoc = await db
        .collection("settings")
        .findOne({ _key: "renewal_settings_v2" });
      if (settingsDoc?.programs) {
        const progEvents = deriveProgramEvents(settingsDoc.programs)
          .filter(
            (e) =>
              e.visibility === "public" &&
              MAJOR_EVENT_TYPES.includes(e.type) &&
              e.startDate >= todayStr
          );
        return deduplicateCalendarEvents([...events, ...progEvents])
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
          .slice(0, 3);
      }
    } catch { /* non-fatal */ }

    return deduplicateCalendarEvents(events)
      .filter((e) => MAJOR_EVENT_TYPES.includes(e.type))
      .slice(0, 3);
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const [initialBadge, upcomingCalendarEvents] = await Promise.all([
    getHeroBadge(),
    getUpcomingCalendarEvents(),
  ]);

  return (
    <main className="min-h-screen bg-[#fdfdfd] relative flex flex-col">
      <SiteHeader />
      <div className="relative z-10 flex flex-col">
        <HeroSection initialBadge={initialBadge} />
        <HighlightsSection />
        <MissionVisionSection />
        <ProgramsSection />
        <DiscoverFitSection />
        <UniformSection />
        <AboutSection />
        <CalendarSection events={upcomingCalendarEvents} />
        <ParentPortalCTA />
        <SiteFooter />
      </div>
    </main>
  );
}
