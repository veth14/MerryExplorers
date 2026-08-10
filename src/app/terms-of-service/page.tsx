"use client";

import Link from "next/link";
import Image from "next/image";
import { m } from "framer-motion";
import { NAV_LINKS } from "@/data/landing";
import { SiteFooter } from "@/components/landing/site-footer";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-headline text-[20px] font-extrabold text-[#0033A0] mb-3">{title}</h2>
      <div className="text-[15px] font-medium text-[#475569] leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#fdfdfd] flex flex-col relative">
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div aria-hidden className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#0033A0] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.07]" />
        <div aria-hidden className="absolute top-40 -right-20 w-[500px] h-[500px] bg-[#FFC107] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.1]" />
        <div aria-hidden className="absolute -bottom-40 left-1/3 w-[700px] h-[700px] bg-[#0050d5] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.05]" />
      </div>

      {/* Header */}
      <header className="relative z-50 bg-white/60 border-b border-black/5 sticky top-0 backdrop-blur-xl">
        <div className="mx-auto flex h-[80px] w-full max-w-[1400px] items-center justify-between px-6 sm:px-10">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 transition-transform hover:scale-[0.98]">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl">
              <Image src="/LOGO-noBG.png" alt="Merry Explorers Logo" fill sizes="40px" className="object-contain" />
            </div>
            <span className="flex flex-col leading-none">
              <span className="font-headline text-[18px] font-extrabold tracking-tight text-[#0033A0]">Merry</span>
              <span className="font-headline text-[12px] font-bold tracking-[0.12em] text-[#FFB800]">Explorers</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-full px-6 py-2.5 text-[15px] font-bold transition-all text-[#64748b] hover:bg-black/5 hover:text-[#0033A0]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="w-10 shrink-0" aria-hidden="true" />
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-grow px-5 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-3xl">
          {/* Header */}
          <m.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <span className="text-4xl mb-4 inline-block">📋</span>
            <h1 className="font-headline text-[40px] sm:text-[56px] font-extrabold leading-[1.1] tracking-tight text-[#0f172a] mb-5">
              Terms of Service
            </h1>
            <p className="text-[15px] font-medium text-[#94a3b8]">Last updated: July 2025</p>
          </m.div>

          {/* Content Card */}
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 sm:p-12 shadow-[0_24px_80px_rgba(0,51,160,0.06)] border border-white"
          >
            <Section title="1. Acceptance of Terms">
              <p>By registering your child at Merry Explorers Playgroup & Learning Center ("the Center") or by using our website and online systems, you agree to be bound by these Terms of Service. If you do not agree with these terms, please do not proceed with registration or use our services.</p>
            </Section>

            <Section title="2. Registration & Fees">
              <ul className="list-disc pl-5 space-y-1">
                <li>All registration fees are non-refundable once the playgroup year has commenced.</li>
                <li>Monthly registration fees are due on or before the stated due dates.</li>
                <li>The Center reserves the right to adjust registration fee rates with prior notice to parents/guardians.</li>
              </ul>
            </Section>

            <Section title="3. Attendance & Schedules">
              <ul className="list-disc pl-5 space-y-1">
                <li>Regular attendance is expected of all registered students.</li>
                <li>Parents/guardians must inform the Center in advance of any absences.</li>
                <li>Sessions missed due to absences are generally not subject to make-up classes unless otherwise arranged.</li>
              </ul>
            </Section>

            <Section title="4. Code of Conduct">
              <p>Parents and guardians are expected to:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Treat all Center staff and other families with courtesy and respect.</li>
                <li>Adhere to Center policies and guidelines as communicated in the Center handbook.</li>
                <li>Ensure their child is fit for playgroup on days of attendance.</li>
                <li>Communicate openly with teachers regarding their child's needs and concerns.</li>
              </ul>
            </Section>

            <Section title="5. Health & Safety">
              <ul className="list-disc pl-5 space-y-1">
                <li>Children showing signs of illness should not be brought to playgroup.</li>
                <li>The Center reserves the right to send home a student showing signs of contagious illness.</li>
                <li>Parents must keep the Center informed of any allergies, medical conditions, or medications.</li>
                <li>The Center maintains a safe and nurturing environment but cannot be held liable for accidents beyond reasonable care.</li>
              </ul>
            </Section>

            <Section title="6. Photography & Media">
              <p>By registering your child, you grant the Center permission to take photographs and videos of your child for internal records, newsletters, and official social media channels. If you wish to opt out, please notify the Center in writing.</p>
            </Section>

            <Section title="7. Termination of Registration">
              <p>The playgroup reserves the right to terminate a student's registration under exceptional circumstances, including but not limited to non-payment or behavioral concerns.</p>
            </Section>

            <Section title="8. Changes to Terms">
              <p>Merry Explorers reserves the right to update these Terms of Service at any time. Parents/guardians will be notified of significant changes via social media announcements.</p>
            </Section>

            <Section title="9. Contact">
              <p>For any questions regarding these terms, please contact us at:</p>
              <p className="mt-2">
                <strong className="text-[#0033A0]">Merry Explorers Playgroup & Learning Center</strong><br />
                Unit C, 2nd Floor, Starla 88 Bldg, Camarin Rd., Caloocan<br />
                Email: <a href="mailto:Merryexplorerscenter@gmail.com" className="text-[#0066CC] hover:text-[#FFC107] transition-colors">Merryexplorerscenter@gmail.com
                </a>
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