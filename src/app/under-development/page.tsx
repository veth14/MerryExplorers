"use client";

import Link from "next/link";
import { m } from "framer-motion";
import { SiteFooter } from "@/components/landing/site-footer";

export default function UnderDevelopmentPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFF]">
      {/* Top accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0033A0] via-[#0066CC] to-[#FFC107]" />

      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-lg text-center">

          {/* Animated icon */}
          <m.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mb-8 flex justify-center"
          >
            <div className="relative flex h-32 w-32 items-center justify-center">
              {/* Outer ring pulse */}
              <m.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-[#0033A0]/20"
              />
              {/* Inner circle */}
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#0033A0] to-[#0066CC] shadow-[0_20px_60px_-10px_rgba(0,51,160,0.4)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-11 w-11"
                >
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              {/* Decorative sparkles */}
              <m.span
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute -top-2 -right-1 text-2xl"
              >
                ✨
              </m.span>
              <m.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -bottom-1 -left-2 text-xl"
              >
                🔧
              </m.span>
            </div>
          </m.div>

          {/* Heading */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {/* Badge */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#FFF8E1] border border-[#FFC107]/40 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[#FFC107] animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#7A4F00]">
                Coming Soon
              </span>
            </div>

            <h1 className="font-headline text-4xl sm:text-5xl font-extrabold text-[#0F006E] leading-tight mb-4">
              We're Building
              <br />
              <span className="text-[#0066CC]">Something Special</span>
            </h1>

            <p className="text-[#64748B] text-base font-medium leading-relaxed max-w-sm mx-auto mb-10">
              This feature is currently under development. Our team is working hard to bring it to you soon. In the meantime, feel free to explore what's available!
            </p>
          </m.div>

          {/* Progress bar decoration */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mb-10 mx-auto max-w-xs"
          >
            <div className="flex justify-between text-[11px] font-bold text-[#94A3B8] mb-1.5">
              <span>In progress</span>
              <span>Almost there!</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
              <m.div
                initial={{ width: "0%" }}
                animate={{ width: "72%" }}
                transition={{ duration: 1.5, delay: 0.6, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-[#0033A0] to-[#0066CC]"
              />
            </div>
          </m.div>

          {/* CTAs */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-2xl bg-[#0033A0] px-7 py-3.5 text-[14px] font-extrabold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Back to Home
            </Link>
            <Link
              href="/inquire"
              className="inline-flex items-center gap-2.5 rounded-2xl border-2 border-[#0033A0]/20 bg-white px-7 py-3.5 text-[14px] font-extrabold text-[#0033A0] transition-all hover:border-[#0033A0]/40 hover:-translate-y-0.5 active:scale-95"
            >
              📬 Contact Us Instead
            </Link>
          </m.div>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
