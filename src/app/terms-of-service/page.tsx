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

export default function TermsOfServicePage() {
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
              📋 Center Policies &amp; Agreement
            </span>
            <h1 className="font-fredoka text-[40px] sm:text-[52px] font-bold leading-[1.1] tracking-normal text-[#002f76] mb-3">
              Terms of Service
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
            <WashiTape color="#ffd23f" width={80} tilt={-3} className="-top-3 left-1/2 -translate-x-1/2" />
            <Section title="1. Acceptance of Terms">
              <p>By registering your child at Merry Explorers Playgroup &amp; Learning Center (&quot;the Center&quot;) or by using our website and online systems, you agree to be bound by these Terms of Service. If you do not agree with these terms, please do not proceed with registration or use our services.</p>
            </Section>

            <Section title="2. Registration & Fees">
              <ul className="list-disc pl-5 space-y-1">
                <li>To confirm and secure your child&apos;s slot, a <strong className="text-[#0033A0]">60% non-refundable downpayment</strong> of the total program fee is required upon submission of the registration form.</li>
                <li>The remaining balance must be settled on or before the start of the Adventure.</li>
                <li>All fees are non-refundable once the Adventure has commenced.</li>
                <li>Payment is accepted via <strong className="text-[#0033A0]">Bank Transfer or GCash only</strong>. Cash payments are not accepted.</li>
                <li>The Center reserves the right to adjust program fee rates with prior notice to parents/guardians.</li>
              </ul>
            </Section>

            <Section title="3. Attendance & Schedules">
              <ul className="list-disc pl-5 space-y-1">
                <li>Regular attendance is expected of all registered students throughout the Adventure.</li>
                <li>Parents/guardians must inform the Center in advance of any absences.</li>
                <li>Sessions missed due to absences are generally not subject to make-up classes unless otherwise arranged with the Center.</li>
                <li>Schedules are organized per Adventure. Any changes to the schedule will be communicated through official channels.</li>
              </ul>
            </Section>

            <Section title="4. Trailblazer: Brave Explorer Prerequisite">
              <p>Students registering in the Trailblazer: Brave Explorer program must meet the following prerequisites before the start of the Adventure:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Must be able to grip independently (e.g., crayons, pencils).</li>
                <li>Must be able to stay independently with teachers without a guardian present.</li>
                <li>Must be able to sit still for at least 3 minutes in a classroom set-up.</li>
              </ul>
              <p className="mt-2">The Center reserves the right to recommend a more appropriate program if a child does not meet these prerequisites.</p>
            </Section>

            <Section title="5. Code of Conduct">
              <p>Parents and guardians are expected to:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Treat all Center staff and other families with courtesy and respect.</li>
                <li>Adhere to Center policies and guidelines as communicated in the Center handbook.</li>
                <li>Ensure their child is fit for playgroup on days of attendance.</li>
                <li>Communicate openly with teachers regarding their child&apos;s needs and concerns.</li>
              </ul>
            </Section>

            <Section title="6. Health & Safety">
              <ul className="list-disc pl-5 space-y-1">
                <li>Children showing signs of illness should not be brought to playgroup.</li>
                <li>The Center reserves the right to send home a student showing signs of contagious illness.</li>
                <li>Parents must keep the Center informed of any allergies, medical conditions, or medications.</li>
                <li>The Center maintains a safe and nurturing environment but cannot be held liable for accidents beyond reasonable care.</li>
              </ul>
            </Section>

            <Section title="7. Photography & Media">
              <p>By registering your child, you grant the Center permission to take photographs and videos of your child for internal records, newsletters, and official social media channels. If you wish to opt out, please notify the Center in writing.</p>
            </Section>

            <Section title="8. Termination of Registration">
              <p>The playgroup reserves the right to terminate a student&apos;s registration under exceptional circumstances, including but not limited to non-payment or behavioral concerns.</p>
            </Section>

            <Section title="9. Changes to Terms">
              <p>Merry Explorers reserves the right to update these Terms of Service at any time. Parents/guardians will be notified of significant changes via official social media announcements.</p>
            </Section>

            <Section title="10. Contact">
              <p>For any questions regarding these terms, please contact us at:</p>
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