"use client";

import Link from "next/link";
import Image from "next/image";
import { m, useReducedMotion } from "framer-motion";
import { ArrowRightIcon } from "./icons";

export function HeroSection() {
  const reduce = useReducedMotion();

  return (
    <section id="home" className="relative flex flex-col justify-center overflow-hidden pt-28 pb-16 lg:pt-36 lg:pb-24 lg:min-h-[90vh]">
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230033A0' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-[1280px] items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">

        {/* ── Left: Copy ── */}
        <div className="flex flex-col items-start relative z-20">
          <m.h1
            initial={reduce ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="font-headline text-[48px] font-extrabold leading-[1.1] tracking-tight text-[#0b1a3d] sm:text-[60px] lg:text-[72px] mobile-no-animate"
          >
            Nurturing
            <br />
            <span className="relative inline-block mt-2 mb-1">
              <span className="relative z-10 text-[#0033A0]">Joyful Hearts,</span>
              <svg aria-hidden="true" viewBox="0 0 400 40" className="absolute -bottom-3 left-0 w-full h-auto" preserveAspectRatio="none">
                <m.path
                  d="M 10 25 Q 100 10 200 20 T 390 15"
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
            Inspiring Young
            <br />
            Minds.
          </m.h1>

          <m.p
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
            className="mt-8 max-w-lg text-[18px] font-medium leading-[1.7] text-[#4a5f82] mobile-no-animate"
          >
            A safe, creative, and fun environment where your little explorers
            can dream, discover, and grow, nurturing joyful hearts and inspiring young minds.
          </m.p>

          <m.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="mt-10 mobile-no-animate"
          >
            <Link
              href="/inquire"
              id="hero-enroll-btn"
              className="group inline-flex items-center gap-4 rounded-[1.25rem] bg-[#0033A0] px-8 py-4 text-[17px] font-bold text-white shadow-[0_12px_24px_rgba(0,51,160,0.2)] transition-all duration-300 hover:bg-[#002f76] hover:shadow-[0_16px_32px_rgba(0,51,160,0.3)] hover:-translate-y-1"
            >
              Register Now
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:translate-x-1">
                <ArrowRightIcon className="h-4 w-4" />
              </div>
            </Link>
          </m.div>
        </div>

        {/* ── Right: Visual ── */}
        <m.div
          initial={reduce ? false : { opacity: 0, scale: 0.88, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto flex w-full max-w-[500px] items-center justify-center lg:max-w-none mobile-no-animate"
        >
          <m.div
            animate={{ borderRadius: ["60% 40% 30% 70% / 60% 30% 70% 40%", "30% 60% 70% 40% / 50% 60% 30% 60%", "60% 40% 30% 70% / 60% 30% 70% 40%"] }}
            transition={{ duration: 15, ease: "easeInOut", repeat: Infinity }}
            className="absolute inset-4 bg-gradient-to-br from-white to-[#f5f7ff] shadow-[0_32px_80px_rgba(0,51,160,0.08)] border border-white"
          />
          <m.div
            animate={reduce ? {} : { y: [-8, 8, -8] }}
            transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
            className="relative z-10 flex h-[360px] w-[360px] sm:h-[460px] sm:w-[460px] items-center justify-center"
          >
            <Image
              src="/LOGO-noBG.png"
              alt="Merry Explorers"
              fill
              sizes="(max-width: 640px) 360px, 460px"
              className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.06)] p-8"
              priority
              // @ts-expect
              fetchPriority="high"
            />
          </m.div>
        </m.div>
      </div>
    </section>
  );
}