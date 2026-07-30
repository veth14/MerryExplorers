import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/site-header";
import { HeroSection } from "@/components/landing/hero";
import { HighlightsSection } from "@/components/landing/highlights";
import { MissionVisionSection } from "@/components/landing/mission-vision";
import { ProgramsSection } from "@/components/landing/programs";
import { UniformSection } from "@/components/landing/uniform";
import { AboutSection } from "@/components/landing/about";
import { ParentPortalCTA } from "@/components/landing/parent-portal-cta";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata: Metadata = {
  title: "Merry Explorers — Nurturing Joyful Hearts, Inspiring Young Minds",
  description:
    "Nurturing joyful hearts, inspiring young minds through play, storytelling, and caring guidance. A safe, creative, and fun environment for little explorers.",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#fdfdfd] relative flex flex-col">
      {/* ── Dreamy Background Orbs (Global Landing Background) ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div aria-hidden className="absolute -top-40 -left-40 w-[800px] h-[800px] bg-[#0033A0] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.05]"></div>
        <div aria-hidden className="absolute top-1/4 -right-20 w-[600px] h-[600px] bg-[#FFC107] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.08]"></div>
        <div aria-hidden className="absolute top-2/3 left-1/4 w-[900px] h-[900px] bg-[#0050d5] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.04]"></div>
        <div aria-hidden className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#FFC107] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.06]"></div>
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
  );
}
