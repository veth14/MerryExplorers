"use client";

import Link from "next/link";
import Image from "next/image";
import { m, useReducedMotion } from "framer-motion";
import { ArrowRightIcon } from "./icons";
import {
  PlayfulSun,
  PlayfulCloud,
  PlayfulAirplane,
  PlayfulStar,
  PlayfulRainbow,
  CloudSectionDivider,
} from "./playful-decorations";

const ADVENTURE_START = new Date("2026-09-28T00:00:00+08:00");

function useAdventureBadge() {
  const now = new Date();
  const hasStarted = now >= ADVENTURE_START;
  return hasStarted
    ? { label: "Adventure 1 · Now Ongoing 🎉", pulse: "#22c55e" }
    : { label: "Adventure 1 · Beginning September 28, 2026", pulse: "#FFC107" };
}

export function HeroSection() {
  const reduce = useReducedMotion();
  const badge = useAdventureBadge();

  return (
    <section id="home" className="relative flex flex-col justify-center overflow-hidden pt-28 pb-10 lg:pt-36 lg:pb-16 lg:min-h-[92vh]">
      {/* ── Background Subtle Pattern ── */}
      <div
        className="absolute inset-0 z-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230033A0' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      {/* ── Playgroup Atmospheric Accents: Sun, Clouds, Rainbow ── */}
      {/* Smiling Animated Sun (Top Right) */}
      <div className="absolute top-16 right-4 sm:top-20 sm:right-12 lg:right-24 z-0 pointer-events-none">
        <PlayfulSun size={140} className="sm:scale-110 lg:scale-125 drop-shadow-[0_12px_24px_rgba(255,193,7,0.2)]" />
      </div>

      {/* Cheerful Floating Clouds */}
      <m.div
        animate={reduce ? {} : { x: [-10, 10, -10] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 left-4 sm:left-14 z-0 pointer-events-none opacity-85"
      >
        <PlayfulCloud width={180} />
      </m.div>

      <m.div
        animate={reduce ? {} : { x: [8, -8, 8] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-48 right-1/3 z-0 pointer-events-none opacity-60 hidden md:block"
      >
        <PlayfulCloud width={130} />
      </m.div>

      {/* Mini Rainbow near top left */}
      <div className="absolute top-28 left-2 sm:left-8 z-0 pointer-events-none opacity-90 hidden sm:block">
        <PlayfulRainbow width={130} />
      </div>

      {/* Twinkling Stars */}
      <div className="absolute top-40 left-1/4 pointer-events-none z-10 hidden lg:block">
        <PlayfulStar size={26} rotate={12} delay={0.2} />
      </div>
      <div className="absolute top-28 right-1/4 pointer-events-none z-10 hidden sm:block">
        <PlayfulStar size={32} rotate={-15} delay={0.8} />
      </div>
      <div className="absolute bottom-28 left-16 pointer-events-none z-10 hidden md:block">
        <PlayfulStar size={22} rotate={25} delay={1.4} />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[1280px] items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">

        {/* ── Left: Copy ── */}
        <div className="flex flex-col items-start relative z-20">

          {/* Adventure badge */}
          <m.div
            initial={reduce ? false : { opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#FFF8E1] px-4 py-2 text-[14px] font-fredoka font-semibold text-[#B8860B] ring-2 ring-[#FFC107]/40 shadow-sm mobile-no-animate"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: badge.pulse }}
            />
            {badge.label}
          </m.div>

          <m.h1
            initial={reduce ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="font-fredoka text-[46px] font-bold leading-[1.08] tracking-normal text-[#0b1a3d] sm:text-[58px] lg:text-[70px] mobile-no-animate"
          >
            The Next Merry
            <br />
            <span className="relative inline-block mt-1 mb-1">
              <span className="relative z-10 text-[#0033A0]">Adventure</span>
              <svg aria-hidden="true" viewBox="0 0 300 40" className="absolute -bottom-3 left-0 w-full h-auto" preserveAspectRatio="none">
                <m.path
                  d="M 10 25 Q 75 10 150 20 T 290 15"
                  stroke="#FFC107"
                  strokeWidth="14"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }}
                />
              </svg>
            </span>
            <br />
            is Here!
          </m.h1>

          {/* Motto with playgroup charm */}
          <m.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/90 border border-[#bfe0fb] shadow-sm mobile-no-animate"
          >
            <span className="text-xl">🎈</span>
            <span className="font-fredoka text-[18px] font-semibold tracking-wide text-[#0033A0]">
              Dream · Discover · Explore
            </span>
            <span className="text-xl">💛</span>
          </m.div>

          <m.p
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="mt-4 max-w-lg text-[17px] font-medium leading-[1.7] text-[#4a5f82] mobile-no-animate"
          >
            North Caloocan&apos;s joyful playgroup &amp; learning center — a safe, creative, sensory-rich
            haven where your little explorers make friends, discover wonder, and grow with confidence.
          </m.p>

          <m.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
            className="mt-8 flex flex-wrap items-center gap-4 mobile-no-animate relative"
          >
            {/* Paper Airplane flying towards action */}
            <div className="absolute -top-14 right-2 pointer-events-none hidden md:block">
              <PlayfulAirplane />
            </div>

            <Link
              href="/register"
              id="hero-register-btn"
              className="group inline-flex items-center gap-4 rounded-[1.4rem] bg-[#0033A0] px-8 py-4 text-[17px] font-fredoka font-bold text-white shadow-[0_12px_24px_rgba(0,51,160,0.25)] ring-4 ring-[#0033A0]/10 transition-all duration-300 hover:bg-[#002f76] hover:shadow-[0_16px_36px_rgba(0,51,160,0.35)] hover:-translate-y-1"
            >
              Register Now
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:translate-x-1">
                <ArrowRightIcon className="h-4 w-4" />
              </div>
            </Link>

            {/* Same Merry Heart callout */}
            <span className="inline-flex items-center gap-2 rounded-full bg-white/95 border border-[#e2e8f4] px-4 py-2.5 text-[13.5px] font-fredoka font-medium text-[#4a5f82] shadow-sm">
              <span className="text-base">💛</span>
              Same Merry Heart. New Adventures!
            </span>
          </m.div>
        </div>

        {/* ── Right: Visual ── */}
        <m.div
          initial={reduce ? false : { opacity: 0, scale: 0.88, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto flex w-full max-w-[500px] items-center justify-center lg:max-w-none mobile-no-animate"
        >
          {/* Animated Blob backdrop */}
          <m.div
            animate={{ borderRadius: ["60% 40% 30% 70% / 60% 30% 70% 40%", "30% 60% 70% 40% / 50% 60% 30% 60%", "60% 40% 30% 70% / 60% 30% 70% 40%"] }}
            transition={{ duration: 15, ease: "easeInOut", repeat: Infinity }}
            className="absolute inset-4 bg-white/95 shadow-[0_32px_80px_rgba(0,51,160,0.12)] border-2 border-white"
          />

          {/* Cute Cloud behind logo */}
          <div className="absolute -bottom-6 -left-6 z-10 pointer-events-none opacity-90 hidden sm:block">
            <PlayfulCloud width={160} />
          </div>

          <m.div
            animate={reduce ? {} : { y: [-8, 8, -8] }}
            transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
            className="relative z-10 flex h-[360px] w-[360px] sm:h-[460px] sm:w-[460px] items-center justify-center"
          >
            <Image
              src="/LOGO-noBG.png"
              alt="Merry Explorers Playgroup & Learning Center"
              fill
              sizes="(max-width: 640px) 360px, 460px"
              className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.08)] p-8"
              priority
              // @ts-expect
              fetchPriority="high"
            />
          </m.div>

          {/* Floating "Different Explorers" sticker badge */}
          <m.div
            initial={reduce ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
            className="absolute -bottom-4 -right-2 sm:bottom-4 sm:-right-6 max-w-[170px] rounded-[1.4rem] bg-[#0033A0] p-4 text-white shadow-[0_16px_40px_rgba(0,51,160,0.3)] ring-4 ring-white/80 hidden sm:block mobile-no-animate z-20"
          >
            <p className="font-fredoka text-[13px] font-semibold leading-snug">
              Different Explorers.<br />
              Different Paths.<br />
              <span className="text-[#FFC107]">A Brighter Tomorrow! 💛</span>
            </p>
          </m.div>
        </m.div>
      </div>

      {/* ── Playful Cloud Wave Transition to next section ── */}
      <div className="mt-12 w-full">
        <CloudSectionDivider fill="#ffffff" />
      </div>
    </section>
  );
}