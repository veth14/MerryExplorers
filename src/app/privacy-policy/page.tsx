"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
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

export default function PrivacyPolicyPage() {
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
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <span className="text-4xl mb-4 inline-block">🔒</span>
            <h1 className="font-headline text-[40px] sm:text-[56px] font-extrabold leading-[1.1] tracking-tight text-[#0f172a] mb-5">
              Privacy Policy
            </h1>
            <p className="text-[15px] font-medium text-[#94a3b8]">Last updated: July 2025</p>
          </motion.div>

          {/* Content Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 sm:p-12 shadow-[0_24px_80px_rgba(0,51,160,0.06)] border border-white"
          >
            <Section title="1. Information We Collect">
              <p>We collect personal information that you voluntarily provide when you fill out our inquiry forms, register your child, or contact us. This may include:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Parent or guardian full name, email address, and phone number</li>
                <li>Child's name, age, and relevant health information</li>
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
                <strong className="text-[#0033A0]">Merry Explorers Playgroup & Learning Center</strong><br />
                Unit C, 2nd Floor, Starla 88 Bldg, Camarin Rd., Caloocan<br />
                Email: <a href="mailto:Merryexplorerscenter@gmail.com" className="text-[#0066CC] hover:text-[#FFC107] transition-colors">Merryexplorerscenter@gmail.com</a>
              </p>
            </Section>
          </motion.div>

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