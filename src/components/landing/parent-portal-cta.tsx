"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRightIcon } from "./icons";

export function ParentPortalCTA() {
  return (
    <section id="admissions" className="relative py-16 sm:py-24">
      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[40px] px-8 py-14 shadow-xl sm:px-12 lg:px-20 lg:py-20"
          style={{
            background: "linear-gradient(135deg, #0033A0 0%, #002080 100%)",
          }}
        >
          {/* Decorative star */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-8 text-2xl opacity-80 text-[#FFC107]"
          >
            ✦
          </div>

          <div className="relative grid items-center gap-14 lg:grid-cols-2">
            {/* Graphic (Left) */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex justify-center lg:justify-end lg:pr-10"
            >
              <div className="relative flex h-56 w-56 items-center justify-center rounded-3xl bg-white shadow-2xl sm:h-72 sm:w-72">
                {/* Laptop/phone icon SVG */}
                <svg
                  className="h-28 w-28 text-[#0033A0]"
                  viewBox="0 0 48 48"
                  fill="none"
                >
                  <rect x="4" y="10" width="34" height="22" rx="3" fill="currentColor" />
                  <rect x="2" y="34" width="38" height="3" rx="1.5" fill="currentColor" />
                  <rect x="26" y="16" width="14" height="24" rx="3" fill="white" />
                  <rect x="29" y="19" width="8" height="18" rx="1" fill="currentColor" />
                </svg>

                {/* Bell notification badge */}
                <div className="absolute -right-4 -top-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFC107] shadow-lg ring-4 ring-[#0033A0]/10">
                  <span className="text-2xl text-[#0b1a3d]">🔔</span>
                </div>
              </div>
            </motion.div>

            {/* Copy (Right) */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              {/* Top badge */}
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm"
              >
                📬 INQUIRE NOW
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="font-headline text-[32px] font-extrabold leading-[1.15] tracking-tight text-white sm:text-[40px] lg:text-[44px]"
              >
                Interested in Our Playgroup?
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.35, duration: 0.6 }}
                className="mt-5 max-w-md text-[16px] font-medium leading-relaxed text-white/80"
              >
                Have questions about registration, programs, or schedules? Send us an inquiry and our team will get back to you within 1–2 business days.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.45, duration: 0.5 }}
                className="mt-8"
              >
                <Link
                  href="/inquire"
                  id="inquire-now-btn"
                  className="group inline-flex items-center gap-2 rounded-full bg-[#FFC107] px-8 py-3.5 text-[15px] font-bold text-[#0b1a3d] shadow-lg transition-all hover:bg-[#FFB800] hover:-translate-y-0.5"
                >
                  Inquire Now
                  <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
