"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { NAV_LINKS } from "@/data/landing";
import { SiteFooter } from "@/components/landing/site-footer";

export default function ContactPage() {
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
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-full bg-white border-2 border-[#f1f5f9] px-6 py-2.5 text-[15px] font-bold text-[#0033A0] shadow-sm hover:border-[#0033A0]/20 hover:bg-[#f8fafc] transition-all hover:-translate-y-0.5"
          >
            Portal Login
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-grow px-5 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <span className="text-4xl mb-4 inline-block">📞</span>
            <h1 className="font-headline text-[40px] sm:text-[56px] font-extrabold leading-[1.1] tracking-tight text-[#0f172a] mb-5">
              Contact Us
            </h1>
            <p className="text-[17px] font-medium text-[#64748b] max-w-lg mx-auto leading-relaxed">
              We'd love to hear from you. Reach out through any of the channels below.
            </p>
          </motion.div>

          {/* Contact Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {/* Address */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] p-8 shadow-[0_24px_80px_rgba(0,51,160,0.06)] border border-white flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#e8f0fe] flex items-center justify-center text-2xl">📍</div>
              <div>
                <h3 className="font-headline text-[18px] font-extrabold text-[#0033A0] mb-2">Address</h3>
                <p className="text-[15px] font-semibold text-[#475569] leading-relaxed">
                  Unit C, 2nd Floor, B13 L33<br />
                  Camarin Rd., North, Caloocan<br />
                  1421 Metro Manila<br />
                  <span className="text-[13px] text-[#94a3b8]">(Near Camarin Doctors Hospital)</span>
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] p-8 shadow-[0_24px_80px_rgba(0,51,160,0.06)] border border-white flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#fff8e1] flex items-center justify-center text-2xl">📱</div>
              <div>
                <h3 className="font-headline text-[18px] font-extrabold text-[#0033A0] mb-2">Phone</h3>
                <a href="tel:+639123456789" className="text-[15px] font-semibold text-[#0066CC] hover:text-[#FFC107] transition-colors leading-relaxed block">
                  +63 912 345 6789
                </a>
                <p className="text-[13px] text-[#94a3b8] mt-1 font-medium">Mon–Fri, 8AM–5PM</p>
              </div>
            </div>

            {/* Email */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] p-8 shadow-[0_24px_80px_rgba(0,51,160,0.06)] border border-white flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#e8f5e9] flex items-center justify-center text-2xl">✉️</div>
              <div>
                <h3 className="font-headline text-[18px] font-extrabold text-[#0033A0] mb-2">Email</h3>
                <a href="mailto:info@merryexplorers.com" className="text-[15px] font-semibold text-[#0066CC] hover:text-[#FFC107] transition-colors leading-relaxed break-all block">
                  info@merryexplorers.com
                </a>
                <p className="text-[13px] text-[#94a3b8] mt-1 font-medium">We reply within 1–2 business days</p>
              </div>
            </div>
          </motion.div>

          {/* CTA to Inquire */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 text-center"
          >
            <p className="text-[16px] font-semibold text-[#64748b] mb-4">Want to ask about enrollment or programs?</p>
            <Link
              href="/inquire"
              className="inline-flex items-center gap-3 rounded-[1rem] bg-gradient-to-r from-[#0033A0] to-[#0047df] px-8 py-4 text-[16px] font-extrabold text-white shadow-[0_12px_32px_rgba(0,51,160,0.3)] hover:shadow-[0_16px_40px_rgba(0,51,160,0.4)] transition-all hover:-translate-y-1"
            >
              Send an Inquiry →
            </Link>
          </motion.div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
