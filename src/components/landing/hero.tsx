"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRightIcon } from "./icons";

export function HeroSection() {
  return (
    <section
      id="home"
      className="relative"
    >
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-2 lg:gap-10 lg:pb-20 lg:pt-14">
        {/* ── Left: Copy ── */}
        <div className="flex flex-col items-start">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="font-headline text-[42px] font-extrabold leading-[1.1] tracking-tight text-[#0b1a3d] sm:text-[52px] lg:text-[56px] mobile-no-animate"
          >
            Nurturing
            <br />
            {/* Blue "Joyful Hearts," with yellow zigzag highlight behind it */}
            <span className="relative inline-block text-[#0033A0]">
              <span className="relative z-10">Joyful Hearts,</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 360 40"
                className="absolute left-0 top-1/2 h-[75%] w-full -translate-y-1/2"
                preserveAspectRatio="none"
              >
                <motion.path
                  d="M 5 20 L 40 8 L 80 32 L 120 8 L 160 32 L 200 8 L 240 32 L 280 8 L 320 32 L 355 20"
                  stroke="#FFC107"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.9, delay: 0.65, ease: "easeInOut" }}
                />
              </svg>
            </span>
            <br />
            Inspiring Young
            <br />
            Minds.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="mt-5 max-w-sm text-[16px] font-medium leading-relaxed text-[#0066CC] mobile-no-animate"
          >
            A safe, creative, and fun environment where your little explorers
            can dream, discover, and grow.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.42, ease: "easeOut" }}
            className="mt-8 mobile-no-animate"
          >
            <Link
              href="/inquire"
              id="hero-enroll-btn"
              className="group flex items-center gap-3 rounded-[1rem] bg-gradient-to-r from-[#0033A0] to-[#0047df] px-8 py-4 text-[16px] font-extrabold text-white shadow-[0_12px_32px_rgba(0,51,160,0.3)] hover:shadow-[0_16px_40px_rgba(0,51,160,0.4)] transition-all hover:-translate-y-1"
            >
              Register Now
              <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        {/* ── Right: Logo circle ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="relative mx-auto flex w-full max-w-[420px] items-center justify-center lg:max-w-none mobile-no-animate"
        >
          {/* Frosted Glass Orb */}
          <div className="relative flex h-[360px] w-[360px] items-center justify-center rounded-full bg-white/60 backdrop-blur-3xl sm:h-[460px] sm:w-[460px] shadow-[0_24px_80px_rgba(0,51,160,0.1)] border border-white">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
              className="relative z-10 flex h-72 w-72 items-center justify-center sm:h-[380px] sm:w-[380px]"
            >
              <Image
                src="/LOGO-noBG.png"
                alt="Merry Explorers"
                fill
                sizes="(max-width: 640px) 288px, 380px"
                className="object-contain drop-shadow-2xl"
                priority
                // @ts-ignore
                fetchpriority="high"
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}