import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { SiteHeader } from "@/components/landing/site-header";
import { HeroSection } from "@/components/landing/hero";

// Lazy-loaded components (Below the fold)
const HighlightsSection = dynamic(() => import("@/components/landing/highlights").then(mod => mod.HighlightsSection));
const MissionVisionSection = dynamic(() => import("@/components/landing/mission-vision").then(mod => mod.MissionVisionSection));
const ProgramsSection = dynamic(() => import("@/components/landing/programs").then(mod => mod.ProgramsSection));
const DiscoverFitSection = dynamic(() => import("@/components/landing/discover-fit").then(mod => mod.DiscoverFitSection));
const UniformSection = dynamic(() => import("@/components/landing/uniform").then(mod => mod.UniformSection));
const AboutSection = dynamic(() => import("@/components/landing/about").then(mod => mod.AboutSection));
const ParentPortalCTA = dynamic(() => import("@/components/landing/parent-portal-cta").then(mod => mod.ParentPortalCTA));
const SiteFooter = dynamic(() => import("@/components/landing/site-footer").then(mod => mod.SiteFooter));

export const metadata: Metadata = {
  title: "Merry Explorers — The Next Merry Adventure is Here!",
  description:
    "Adventure 1 begins September 28, 2026! New programs, updated policies, and schedules. Dream. Discover. Explore. — Merry Explorers Playgroup & Learning Center, North Caloocan.",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#fdfdfd] relative flex flex-col">
      <SiteHeader />
      <div className="relative z-10 flex flex-col">
        <HeroSection />
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
