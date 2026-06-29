"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRightIcon } from "./icons";

export function HeroSection() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-white"
    >
      {/* Yellow glow — top right corner */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-[480px] w-[480px]"
        style={{
          background:
            "radial-gradient(circle at 90% 10%, #FFF8C5 0%, #FFFBDD 35%, transparent 65%)",
          borderRadius: "0 0 0 100%",
        }}
      />

      {/* Top-left: 4-point gold sparkle */}
      <motion.div
        aria-hidden="true"
        animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute left-8 top-12"
      >
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path
            d="M18 1 L20.5 15.5 L35 18 L20.5 20.5 L18 35 L15.5 20.5 L1 18 L15.5 15.5 Z"
            fill="#FFC107"
          />
        </svg>
      </motion.div>

      {/* Small blue + cross near gold star */}
      <motion.div
        aria-hidden="true"
        animate={{ rotate: [0, 20, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="pointer-events-none absolute left-[72px] top-[105px]"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="6" y="0" width="2" height="14" rx="1" fill="#60A5FA" />
          <rect x="0" y="6" width="14" height="2" rx="1" fill="#60A5FA" />
        </svg>
      </motion.div>

      {/* Paper plane — top center */}
      <motion.div
        aria-hidden="true"
        animate={{ x: [0, 5, 0], y: [0, -3, 0], rotate: [-18, -12, -18] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        className="pointer-events-none absolute left-[30%] top-8"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
            stroke="#60A5FA"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>

      {/* Cloud — above the circle */}
      <motion.div
        aria-hidden="true"
        animate={{ y: [0, -5, 0], opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="pointer-events-none absolute top-6 right-[42%]"
      >
        <svg width="52" height="28" viewBox="0 0 52 28" fill="#E2E8F0">
          <ellipse cx="26" cy="21" rx="24" ry="7" />
          <ellipse cx="18" cy="15" rx="13" ry="9" />
          <ellipse cx="34" cy="17" rx="11" ry="8" />
        </svg>
      </motion.div>

      {/* Cloud — bottom left */}
      <motion.div
        aria-hidden="true"
        animate={{ y: [0, -4, 0], opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
        className="pointer-events-none absolute bottom-20 left-2"
      >
        <svg width="60" height="32" viewBox="0 0 60 32" fill="#E2E8F0">
          <ellipse cx="30" cy="24" rx="28" ry="8" />
          <ellipse cx="20" cy="17" rx="15" ry="11" />
          <ellipse cx="40" cy="19" rx="13" ry="10" />
        </svg>
      </motion.div>

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-2 lg:gap-10 lg:pb-20 lg:pt-14">
        {/* ── Left: Copy ── */}
        <div className="flex flex-col items-start">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="font-headline text-[42px] font-extrabold leading-[1.1] tracking-tight text-[#0b1a3d] sm:text-[52px] lg:text-[56px]"
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
            className="mt-5 max-w-sm text-[16px] font-medium leading-relaxed text-[#0066CC]"
          >
            A safe, creative, and fun environment where your little explorers
            can dream, discover, and grow.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.42, ease: "easeOut" }}
            className="mt-8"
          >
            <Link
              href="#admissions"
              id="hero-enroll-btn"
              className="group flex items-center gap-2 rounded-full bg-[#0033A0] px-8 py-3.5 text-[15px] font-extrabold text-white shadow-[0_10px_28px_-6px_rgba(0,51,160,0.45)] transition-all hover:bg-[#002888] hover:shadow-[0_14px_34px_-6px_rgba(0,51,160,0.55)] hover:-translate-y-0.5"
            >
              Enroll Now
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        {/* ── Right: Logo circle ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="relative mx-auto flex w-full max-w-[420px] items-center justify-center lg:max-w-none"
        >
          {/*
            Outer ring: solid white with thick navy border
          */}
          <div
            className="relative flex h-[360px] w-[360px] items-center justify-center rounded-full bg-white sm:h-[460px] sm:w-[460px]"
            style={{
              border: "6px solid #0033A0",
              boxShadow: "0 20px 60px -10px rgba(0,51,160,0.15)",
            }}
          >
            {/* Floating logo */}
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
                className="object-contain drop-shadow-xl"
                priority
              />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Wavy white divider */}
      <div className="relative -mb-1">
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 70"
          className="block h-[48px] w-full text-white sm:h-[64px]"
          preserveAspectRatio="none"
        >
          <path
            d="M0 40C240 80 480 80 720 50C960 20 1200 20 1440 50V70H0V40Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  );
}