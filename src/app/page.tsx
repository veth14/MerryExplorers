import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { SiteHeader } from "@/components/landing/site-header";
import { HeroSection } from "@/components/landing/hero";
import { AnimationProvider } from "@/components/providers/animation-provider";

// Lazy-loaded components (Below the fold)
const HighlightsSection = dynamic(() => import("@/components/landing/highlights").then(mod => mod.HighlightsSection));
const MissionVisionSection = dynamic(() => import("@/components/landing/mission-vision").then(mod => mod.MissionVisionSection));
const ProgramsSection = dynamic(() => import("@/components/landing/programs").then(mod => mod.ProgramsSection));
const UniformSection = dynamic(() => import("@/components/landing/uniform").then(mod => mod.UniformSection));
const AboutSection = dynamic(() => import("@/components/landing/about").then(mod => mod.AboutSection));
const ParentPortalCTA = dynamic(() => import("@/components/landing/parent-portal-cta").then(mod => mod.ParentPortalCTA));
const SiteFooter = dynamic(() => import("@/components/landing/site-footer").then(mod => mod.SiteFooter));

export const metadata: Metadata = {
  title: "Merry Explorers — Joyful Hearts, Inspiring Minds",
  description:
    "Nurturing joyful hearts, inspiring young minds through play, storytelling, and caring guidance. A safe, creative, and fun environment for little explorers.",
};

export default function LandingPage() {
  return (
    <AnimationProvider>
      <main className="min-h-screen bg-[#fdfdfd] relative flex flex-col">
        {/* ── Dreamy Background Orbs (Global Landing Background) ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div aria-hidden className="absolute -top-40 -left-40 w-[800px] h-[800px] bg-[#0033A0] rounded-full filter blur-[80px] opacity-20 md:opacity-[0.05] md:mix-blend-multiply md:blur-[150px]"></div>
          <div aria-hidden className="absolute top-1/4 -right-20 w-[600px] h-[600px] bg-[#FFC107] rounded-full filter blur-[80px] opacity-30 md:opacity-[0.08] md:mix-blend-multiply md:blur-[150px]"></div>
          <div aria-hidden className="absolute top-2/3 left-1/4 w-[900px] h-[900px] bg-[#0050d5] rounded-full filter blur-[80px] opacity-20 md:opacity-[0.04] md:mix-blend-multiply md:blur-[150px]"></div>
          <div aria-hidden className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#FFC107] rounded-full filter blur-[80px] opacity-20 md:opacity-[0.06] md:mix-blend-multiply md:blur-[150px]"></div>
        </div>

        <SiteHeader />
        <div className="relative z-10 flex flex-col">
          <HeroSection />
          <HighlightsSection />
          <MissionVisionSection />
          <ProgramsSection />
          <UniformSection />
          <AboutSection />
          <ParentPortalCTA />
          <SiteFooter />
        </div>
      </main>
    </AnimationProvider>
  );
}
