import type { Metadata } from "next";
import { DiscoveryQuiz } from "./DiscoveryQuiz";
import { SiteHeader } from "@/components/landing/site-header";

export const metadata: Metadata = {
  title: "Discovery Day Quiz — Merry Explorers",
  description:
    "Find the perfect program for your little explorer. Answer a few questions to discover whether Curious Explorer, Creative Explorer, or Trailblazer is the best fit for your child.",
};

export default function DiscoveryDayPage() {
  return (
    <main className="min-h-screen bg-[#fdfdfd] relative overflow-hidden flex flex-col">
      {/* ── Dreamy Background Orbs (matching Inquire page) ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div aria-hidden className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#0033A0] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.07]"></div>
        <div aria-hidden className="absolute top-40 -right-20 w-[500px] h-[500px] bg-[#FFC107] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.1]"></div>
        <div aria-hidden className="absolute -bottom-40 left-1/3 w-[700px] h-[700px] bg-[#0050d5] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.05]"></div>
      </div>

      {/* Header */}
      <SiteHeader />

      {/* Quiz card (added pt-32 to clear the fixed SiteHeader) */}
      <div className="relative z-10 max-w-2xl mx-auto w-full px-4 pt-32 pb-16">
        <DiscoveryQuiz />
      </div>
    </main>
  );
}
