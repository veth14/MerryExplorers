import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/site-header";
import { HeroSection } from "@/components/landing/hero";
import { HighlightsSection } from "@/components/landing/highlights";
import { ProgramsSection } from "@/components/landing/programs";
import { AboutSection } from "@/components/landing/about";
import { ParentPortalCTA } from "@/components/landing/parent-portal-cta";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata: Metadata = {
  title: "Merry Explorers — Where Little Adventures Begin",
  description:
    "Nurturing, inspiring young minds through play, storytelling, and caring guidance. Enroll your child at Merry Explorers preschool and kindergarten.",
};

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <HeroSection />
      <HighlightsSection />
      <ProgramsSection />
      <AboutSection />
      <ParentPortalCTA />
      <SiteFooter />
    </>
  );
}
