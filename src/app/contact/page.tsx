"use client";

import Link from "next/link";
import { m } from "framer-motion";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { WashiTape, PlayfulSun, PlayfulStar } from "@/components/landing/playful-decorations";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf6ff]/50 via-[#fcfdff] to-[#f8fafc] flex flex-col relative overflow-hidden">
      {/* Universal Floating Pill Header */}
      <SiteHeader />

      {/* Playgroup Background Accents */}
      <div className="absolute top-20 right-6 sm:top-24 sm:right-16 z-0 pointer-events-none opacity-85">
        <PlayfulSun size={110} />
      </div>
      <div className="absolute top-52 left-8 z-0 pointer-events-none hidden md:block">
        <PlayfulStar size={26} rotate={15} />
      </div>
      <div className="absolute bottom-40 right-12 z-0 pointer-events-none hidden md:block">
        <PlayfulStar size={30} rotate={-20} delay={0.8} />
      </div>

      {/* Main */}
      <main className="relative z-10 flex-grow px-5 pt-32 pb-16 sm:pt-40 sm:pb-24">
        <div className="mx-auto w-full max-w-4xl">
          {/* Header */}
          <m.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <span className="font-fredoka text-[13px] font-semibold uppercase tracking-wider text-[#0050d5] bg-[#edf5ff] px-4 py-1.5 rounded-full inline-block mb-3 border border-[#d6e7ff] shadow-sm">
              💬 We&apos;d Love to Hear From You
            </span>
            <h1 className="font-fredoka text-[42px] sm:text-[54px] font-bold leading-[1.1] tracking-normal text-[#002f76] mb-3">
              Contact Our Center
            </h1>
            <p className="text-[16px] sm:text-[17px] font-medium text-[#5b7294] max-w-lg mx-auto leading-relaxed">
              Have questions about schedules, trial sessions, or our playgroup family? Reach out through any of the channels below!
            </p>
          </m.div>

          {/* Contact Cards */}
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {/* Address */}
            <div className="relative bg-white/90 backdrop-blur-2xl rounded-[2.2rem] p-8 shadow-[0_20px_50px_rgba(0,51,160,0.08)] border-2 border-white hover:border-[#bfe0fb] transition-all flex flex-col gap-4">
              <WashiTape color="#ffd23f" width={70} tilt={-4} className="-top-3 left-1/2 -translate-x-1/2" />
              <div className="w-12 h-12 rounded-2xl bg-[#e8f0fe] flex items-center justify-center text-2xl shadow-inner">📍</div>
              <div>
                <h3 className="font-fredoka text-[20px] font-bold text-[#0033A0] mb-2">Our Center</h3>
                <p className="text-[14.5px] font-semibold text-[#475569] leading-relaxed">
                  Unit C, 2nd Floor, B13 L33<br />
                  Camarin Rd., North, Caloocan<br />
                  1421 Metro Manila<br />
                  <span className="text-[12.5px] text-[#94a3b8]">(Near Camarin Doctors Hospital)</span>
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="relative bg-white/90 backdrop-blur-2xl rounded-[2.2rem] p-8 shadow-[0_20px_50px_rgba(0,51,160,0.08)] border-2 border-white hover:border-[#bfe0fb] transition-all flex flex-col gap-4">
              <WashiTape color="#8fd3f7" width={70} tilt={4} className="-top-3 left-1/2 -translate-x-1/2" />
              <div className="w-12 h-12 rounded-2xl bg-[#fff8e1] flex items-center justify-center text-2xl shadow-inner">📱</div>
              <div>
                <h3 className="font-fredoka text-[20px] font-bold text-[#0033A0] mb-2">Call or Text</h3>
                <a href="tel:+639477820606" className="text-[15px] font-bold text-[#0066CC] hover:text-[#FFC107] transition-colors leading-relaxed block">
                  (0947) 782 0606
                </a>
                <p className="text-[12.5px] text-[#94a3b8] mt-1 font-medium">Mon–Fri, 8AM–5PM</p>
              </div>
            </div>

            {/* Email */}
            <div className="relative bg-white/90 backdrop-blur-2xl rounded-[2.2rem] p-8 shadow-[0_20px_50px_rgba(0,51,160,0.08)] border-2 border-white hover:border-[#bfe0fb] transition-all flex flex-col gap-4">
              <WashiTape color="#fed7aa" width={70} tilt={-3} className="-top-3 left-1/2 -translate-x-1/2" />
              <div className="w-12 h-12 rounded-2xl bg-[#e8f5e9] flex items-center justify-center text-2xl shadow-inner">✉️</div>
              <div>
                <h3 className="font-fredoka text-[20px] font-bold text-[#0033A0] mb-2">Email Us</h3>
                <a href="mailto:Merryexplorerscenter@gmail.com" className="text-[14.5px] font-bold text-[#0066CC] hover:text-[#FFC107] transition-colors leading-relaxed break-all block">
                  Merryexplorerscenter@gmail.com
                </a>
                <p className="text-[12.5px] text-[#94a3b8] mt-1 font-medium">We reply within 1–2 business days</p>
              </div>
            </div>
          </m.div>

          {/* CTA to Inquire */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-14 text-center"
          >
            <p className="font-fredoka text-[17px] font-semibold text-[#5b7294] mb-4">Ready to start an adventure or ask questions?</p>
            <Link
              href="/inquire"
              className="inline-flex items-center gap-3 rounded-full bg-[#0033A0] px-9 py-4 font-fredoka text-[17px] font-bold text-white shadow-[0_12px_32px_rgba(0,51,160,0.3)] hover:bg-[#002880] hover:shadow-[0_16px_40px_rgba(0,51,160,0.4)] transition-all hover:-translate-y-1 ring-4 ring-white"
            >
              Send an Inquiry 💌 →
            </Link>
          </m.div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
