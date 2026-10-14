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
const ParentPortalCTA = nextDynamic(() => import("@/components/landing/parent-portal-cta").then(mod => mod.ParentPortalCTA));
const SiteFooter = nextDynamic(() => import("@/components/landing/site-footer").then(mod => mod.SiteFooter));

import { connectToDatabase } from "@/lib/mongodb";
import { computeAdventureBadge } from "@/lib/adventure-badge";
import { ProgramRenewalEntry } from "@/app/api/renewal-settings/route";

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

export default async function LandingPage() {
  const initialBadge = await getHeroBadge();

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
        <ParentPortalCTA />
        <SiteFooter />
      </div>
    </main>
  );
}
