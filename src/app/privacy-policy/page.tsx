"use client";

import Link from "next/link";
import { m } from "framer-motion";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { WashiTape, PlayfulSun, PlayfulStar } from "@/components/landing/playful-decorations";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-fredoka text-[21px] font-bold text-[#0033A0] mb-3">{title}</h2>
      <div className="text-[15px] font-medium text-[#475569] leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf6ff]/50 via-[#fcfdff] to-[#f8fafc] flex flex-col relative overflow-hidden">
      {/* Universal Floating Pill Header */}
      <SiteHeader />

      {/* Background Playgroup Accents */}
      <div className="absolute top-20 right-6 sm:top-24 sm:right-16 z-0 pointer-events-none opacity-80">
        <PlayfulSun size={110} />
      </div>
      <div className="absolute top-52 left-10 z-0 pointer-events-none hidden md:block">
        <PlayfulStar size={26} rotate={15} />
      </div>

      {/* Main */}
      <main className="relative z-10 flex-grow px-5 pt-32 pb-16 sm:pt-40 sm:pb-24">
        <div className="mx-auto w-full max-w-3xl">
          {/* Header */}
          <m.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="font-fredoka text-[13px] font-semibold uppercase tracking-wider text-[#0050d5] bg-[#edf5ff] px-4 py-1.5 rounded-full inline-block mb-3 border border-[#d6e7ff] shadow-sm">
              🔒 Your Family&apos;s Privacy &amp; Trust
            </span>
            <h1 className="font-fredoka text-[40px] sm:text-[52px] font-bold leading-[1.1] tracking-normal text-[#002f76] mb-3">
              Privacy Policy
            </h1>
            <p className="font-fredoka text-[14px] font-medium text-[#94a3b8]">Last updated: September 2026</p>
          </m.div>

          {/* Content Card */}
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative bg-white/95 backdrop-blur-2xl rounded-[2.5rem] p-8 sm:p-12 shadow-[0_24px_80px_rgba(0,51,160,0.08)] border-2 border-white"
          >
            <WashiTape color="#8fd3f7" width={80} tilt={-3} className="-top-3 left-1/2 -translate-x-1/2" />
            <Section title="1. Information We Collect">
              <p>We collect personal information that you voluntarily provide when you fill out our inquiry forms, register your child, or contact us. This may include:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Parent or guardian full name, email address, and phone number</li>
                <li>Child&apos;s name, age, and relevant health information</li>
                <li>Payment and billing information for registration fees</li>
              </ul>
            </Section>

            <Section title="2. How We Use Your Information">
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Process registration applications and manage student records</li>
                <li>Communicate with parents/guardians about playgroup updates, events, and announcements</li>
                <li>Comply with legal and regulatory requirements</li>
                <li>Improve our programs and services</li>
              </ul>
            </Section>

            <Section title="3. Data Sharing">
              <p>We do not sell, trade, or rent your personal information to third parties. We may share information with trusted service providers who assist us in operating our playgroup, provided they agree to keep this information confidential.</p>
            </Section>

            <Section title="4. Data Retention">
              <p>We retain personal data for as long as necessary to fulfill the purposes outlined in this policy, or as required by applicable laws and regulations in the Philippines (Republic Act 10173 – Data Privacy Act of 2012).</p>
            </Section>

            <Section title="5. Your Rights">
              <p>Under the Philippine Data Privacy Act, you have the right to:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Access and obtain a copy of your personal data</li>
                <li>Correct inaccurate or incomplete data</li>
                <li>Request erasure of your data under certain circumstances</li>
                <li>Object to the processing of your data</li>
              </ul>
            </Section>

            <Section title="6. Security">
              <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
            </Section>

            <Section title="7. Contact">
              <p>For any privacy-related concerns, please contact us at:</p>
              <p className="mt-2">
                <strong className="text-[#0033A0]">Merry Explorers Playgroup &amp; Learning Center</strong><br />
                2nd Floor, Starla 88 Bldg., Camarin Road, North Caloocan<br />
                Near Camarin Doctors Hospital<br />
                Email: <a href="mailto:Merryexplorerscenter@gmail.com" className="text-[#0066CC] hover:text-[#FFC107] transition-colors">Merryexplorerscenter@gmail.com</a>
              </p>
            </Section>
          </m.div>

          <div className="mt-8 text-center">
            <Link href="/" className="text-[14px] font-bold text-[#0066CC] hover:text-[#FFC107] transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}