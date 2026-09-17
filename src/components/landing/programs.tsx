"use client";

import { useState } from "react";
import Link from "next/link";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import { BALLET } from "@/data/landing";
import { ArrowRightIcon } from "./icons";

// ─── Adventure 1 Program Data ────────────────────────────────────────────────

const CURIOUS_EXPLORER = {
  club: "Discovery Club",
  name: "Curious Explorer",
  tagline: "Little Steps. Big Discoveries.",
  ageLabel: "Ages 1.5 – 4.11 years old",
  maxChildren: 4,
  bgTop: "#0066CC",
  titleColor: "white",
  subtitleColor: "rgba(255,255,255,0.85)",
  pillBg: "#FFC107",
  pillText: "#0033A0",
  iconLeft: "🔍",
  iconRight: "⭐",
  keywords: ["Explore", "Create", "Connect", "Together"],
  description: "A gentle, guided class for little ones who are new to learning, still need a guardian, and are slowly transitioning to a learning environment.",
  schedules: [
    { label: "Morning Class", days: "Monday & Wednesday", time: "9:45 AM – 11:00 AM" },
    { label: "Afternoon Class", days: "Monday & Wednesday", time: "1:30 PM – 2:45 PM" },
  ],
};

const CREATIVE_EXPLORER = {
  club: "Discovery Club",
  name: "Creative Explorer",
  tagline: "Plays. Discovers. Creates.",
  ageLabel: "Ages 2.6 – 4.11 years old",
  maxChildren: 6,
  bgTop: "#FFC107",
  titleColor: "#0033A0",
  subtitleColor: "#0033A0",
  pillBg: "#0066CC",
  pillText: "white",
  iconLeft: "🎨",
  iconRight: "✏️",
  keywords: ["Create", "Explore", "Build", "Grow", "Belong"],
  description: "Hands-on, engaging activities that spark curiosity and build foundational skills through play, exploration and discovery.",
  schedules: [
    { label: "Morning Class",   days: "Tuesday, Thursday & Friday", time: "9:45 AM – 11:00 AM" },
    { label: "Mid-Day Class",   days: "Tuesday, Thursday & Friday", time: "11:15 AM – 12:30 PM" },
    { label: "Afternoon Class", days: "Tuesday, Thursday & Friday", time: "1:30 PM – 2:45 PM" },
  ],
};

const BRAVE_EXPLORER = {
  club: "Trailblazer",
  name: "Brave Explorer",
  tagline: "More Ready. More Capable.",
  ageLabel: "Ages 3 – 4.11 years old",
  maxChildren: 6,
  bgTop: "#1a2e6b",
  titleColor: "white",
  subtitleColor: "rgba(255,255,255,0.75)",
  pillBg: "#FFC107",
  pillText: "#1a2e6b",
  iconLeft: "💡",
  iconRight: "📋",
  keywords: ["Braver", "Kinder", "More Me"],
  description: "A longer, richer experience designed to build confidence, independence and a love for learning, with a more structured approach and daily routines.",
  schedule: { days: "Monday – Friday", time: "3:00 PM – 4:15 PM" },
  journalNote: "Every explorer must present their explorer journal at the end of the adventure to receive a certificate of completion.",
  prerequisite: "Must be able to grip, can stay independently with teachers, and can sit still for at least 3 minutes in a classroom set up.",
};

const SATURDAY_PLAYDATE = {
  club: "Weekend Adventures",
  name: "Saturday Playdate",
  tagline: "Play. Explore. Make Friends.",
  ageLabel: "Little Explorers",
  maxChildren: 10,
  bgTop: "#0ea5e9",
  titleColor: "white",
  subtitleColor: "rgba(255,255,255,0.9)",
  pillBg: "#FFC107",
  pillText: "#0033A0",
  iconLeft: "🧩",
  iconRight: "💙",
  keywords: ["Creative Play", "Hands-on Activities", "Make Friends"],
  description: "A fun and engaging play experience for little explorers on their weekend adventure! Same merry heart, new adventures.",
  schedules: [
    { label: "Morning Class", days: "Saturdays", time: "10:30 AM – 11:45 AM" },
  ],
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function ProgramCard({
  data,
  delay = 0,
  animateFrom = "left",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  delay?: number;
  animateFrom?: "left" | "right" | "bottom";
}) {
  const reduce = useReducedMotion();
  const initial =
    animateFrom === "left"
      ? { opacity: 0, x: -40 }
      : animateFrom === "right"
      ? { opacity: 0, x: 40 }
      : { opacity: 0, y: 40 };

  return (
    <m.article
      initial={reduce ? false : initial}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className="relative flex flex-col overflow-hidden rounded-[2.5rem] bg-white/80 backdrop-blur-2xl border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_24px_80px_-10px_rgba(0,51,160,0.10)] transition-all duration-300 hover:-translate-y-2"
    >
      {/* Header */}
      <div className="relative px-6 pb-7 pt-8 text-center" style={{ backgroundColor: data.bgTop }}>
        <span className="absolute left-6 top-6 text-2xl">{data.iconLeft}</span>
        <span className="absolute right-6 top-6 text-2xl">{data.iconRight}</span>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: data.subtitleColor }}>
          {data.club}
        </p>
        <h3 className="font-headline text-[22px] font-extrabold uppercase tracking-wider mt-0.5" style={{ color: data.titleColor }}>
          {data.name}
        </h3>
        <p className="mt-1 text-[12px] font-semibold italic" style={{ color: data.subtitleColor }}>
          {data.tagline}
        </p>
      </div>

      {/* Age pill */}
      <div className="relative z-10 -mt-3.5 flex justify-center">
        <span
          className="whitespace-nowrap rounded-full px-5 py-1.5 text-[11px] font-bold uppercase tracking-wider shadow-sm"
          style={{ backgroundColor: data.pillBg, color: data.pillText }}
        >
          {data.ageLabel}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Max children */}
        <div className="flex items-center gap-2 text-[12px] font-semibold text-[#64748b]">
          <span>👨‍👩‍👧</span>
          <span>Maximum of <strong className="text-[#0033A0]">{data.maxChildren} children</strong> per session</span>
        </div>

        {/* Description */}
        <p className="text-[13px] font-medium leading-relaxed text-[#475569]">
          {data.description}
        </p>

        {/* Schedules */}
        <div className="rounded-2xl border border-[#0066CC]/10 bg-[#F0F5FF] p-4">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-[#0033A0]">
            📅 Schedules
          </p>
          <div className="flex flex-col gap-2">
            {data.schedules?.map((s: { label: string; days: string; time: string }) => (
              <div key={s.label} className="rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#0033A0]">{s.label}</p>
                <p className="text-[11px] font-bold text-[#0066CC]">{s.days}</p>
                <p className="text-[13px] font-bold text-[#334155]">{s.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </m.article>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

type TabCategory = "discovery" | "weekend" | "trailblazer";

export function ProgramsSection() {
  const reduce = useReducedMotion();
  const [activeTab, setActiveTab] = useState<TabCategory>("discovery");

  return (
    <section id="programs" className="relative py-16 sm:py-24">
      {/* Decorative background grid */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230033A0' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">

        {/* Heading */}
        <m.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-4 text-center"
        >
          <m.span
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mb-3 inline-block text-3xl"
          >
            🗺️
          </m.span>
          <h2 className="font-headline text-[32px] font-extrabold tracking-tight text-[#0033A0] sm:text-[40px]">
            Our Programs
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] font-medium leading-relaxed text-[#0066CC]">
            Adventure 1 · Different Explorers. Different Paths. One Merry Adventure.
          </p>
        </m.div>

        {/* Tab Navigation */}
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {[
            { id: "discovery", label: "Discovery Club" },
            { id: "trailblazer", label: "Trailblazer" },
            { id: "weekend", label: "Weekend Adventures" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabCategory)}
                className={`relative overflow-hidden rounded-full px-6 py-3 text-[14px] font-bold transition-all duration-300 ${
                  isActive 
                    ? "text-white shadow-md shadow-[#0033A0]/20" 
                    : "bg-white text-[#475569] shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-[#0033A0] hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                {isActive && (
                  <m.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-[#0033A0]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {tab.label}
                  {!isActive && <span className="text-[10px] opacity-60">👆</span>}
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "discovery" && (
            <m.div
              key="discovery"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="grid gap-8 lg:grid-cols-2 mb-8"
            >
              <ProgramCard data={CURIOUS_EXPLORER} delay={0} animateFrom="left" />
              <ProgramCard data={CREATIVE_EXPLORER} delay={0.1} animateFrom="right" />
            </m.div>
          )}

          {activeTab === "trailblazer" && (
            <m.div
              key="trailblazer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
        {/* ── Trailblazer: Brave Explorer (full-width) ── */}
        <m.article
          initial={reduce ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="relative mb-8 flex flex-col overflow-hidden rounded-[2.5rem] bg-white/80 backdrop-blur-2xl border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_24px_80px_-10px_rgba(26,46,107,0.12)] transition-all duration-300 hover:-translate-y-2"
        >
          {/* Header */}
          <div className="relative px-6 pb-7 pt-8 text-center" style={{ backgroundColor: BRAVE_EXPLORER.bgTop }}>
            <span className="absolute left-6 top-6 text-2xl">{BRAVE_EXPLORER.iconLeft}</span>
            <span className="absolute right-6 top-6 text-2xl">{BRAVE_EXPLORER.iconRight}</span>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: BRAVE_EXPLORER.subtitleColor }}>
              {BRAVE_EXPLORER.club}
            </p>
            <h3 className="font-headline text-[22px] font-extrabold uppercase tracking-wider mt-0.5" style={{ color: BRAVE_EXPLORER.titleColor }}>
              {BRAVE_EXPLORER.name}
            </h3>
            <p className="mt-1 text-[12px] font-semibold italic" style={{ color: BRAVE_EXPLORER.subtitleColor }}>
              {BRAVE_EXPLORER.tagline}
            </p>
            {/* Keyword tags */}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {BRAVE_EXPLORER.keywords.map((kw) => (
                <span key={kw} className="rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-bold text-white">
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Age pill */}
          <div className="relative z-10 -mt-3.5 flex justify-center">
            <span
              className="whitespace-nowrap rounded-full px-5 py-1.5 text-[11px] font-bold uppercase tracking-wider shadow-sm"
              style={{ backgroundColor: BRAVE_EXPLORER.pillBg, color: BRAVE_EXPLORER.pillText }}
            >
              {BRAVE_EXPLORER.ageLabel}
            </span>
          </div>

          {/* Body — 3-column on desktop */}
          <div className="grid gap-5 p-6 sm:grid-cols-3">
            {/* Description + max */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[#64748b]">
                <span>👨‍👩‍👧</span>
                <span>Max <strong className="text-[#1a2e6b]">{BRAVE_EXPLORER.maxChildren} children</strong> / session</span>
              </div>
              <p className="text-[13px] font-medium leading-relaxed text-[#475569]">
                {BRAVE_EXPLORER.description}
              </p>
            </div>

            {/* Schedule */}
            <div className="rounded-2xl border border-[#1a2e6b]/10 bg-[#f0f2f8] p-4">
              <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-[#1a2e6b]">
                📅 Schedule
              </p>
              <div className="rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-black/5">
                <p className="text-[13px] font-bold text-[#1a2e6b]">{BRAVE_EXPLORER.schedule.days}</p>
                <p className="text-[15px] font-extrabold text-[#334155]">{BRAVE_EXPLORER.schedule.time}</p>
              </div>
            </div>

            {/* Journal + Prerequisite */}
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl bg-[#FFF8E1] border border-[#FFC107]/20 p-3 text-[12px] font-medium leading-relaxed text-[#92400e]">
                📖 <span className="font-bold">Explorer Journal:</span> {BRAVE_EXPLORER.journalNote}
              </div>
              <div className="rounded-2xl bg-[#f0f2f8] border border-[#1a2e6b]/10 p-3 text-[12px] font-medium leading-relaxed text-[#475569]">
                ✅ <span className="font-bold text-[#1a2e6b]">Prerequisite:</span> {BRAVE_EXPLORER.prerequisite}
              </div>
            </div>
          </div>
        </m.article>
            </m.div>
          )}

          {activeTab === "weekend" && (
            <m.div
              key="weekend"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-8 mb-8"
            >
              <ProgramCard data={SATURDAY_PLAYDATE} delay={0} animateFrom="bottom" />
        {/* ── Ballet Card (full-width) ── */}
        <m.article
          initial={reduce ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="relative mb-10 overflow-hidden rounded-[2.5rem] bg-white/80 backdrop-blur-2xl border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_24px_80px_-10px_rgba(194,24,91,0.12)] transition-all duration-300"
        >
          {/* Top bar */}
          <div className="h-2 w-full" style={{ backgroundColor: BALLET.accent }} />

          <div className="flex flex-col gap-8 p-7 sm:p-10">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#FCE4EC] pb-6">
              <div className="flex items-center gap-4">
                <m.span
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="text-6xl"
                >
                  {BALLET.emoji}
                </m.span>
                <div>
                  <span className="mb-1 inline-block rounded-full px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest"
                    style={{ backgroundColor: BALLET.accentSoft, color: BALLET.accent }}>
                    Special Program
                  </span>
                  <h3 className="font-headline text-[32px] font-extrabold tracking-tight" style={{ color: BALLET.accent }}>
                    {BALLET.name}
                  </h3>
                  <p className="mt-1 text-[14px] font-bold text-[#880E4F]">
                    {BALLET.schedule}
                  </p>
                </div>
              </div>
              
              {/* Rate Highlight */}
              <div className="flex flex-col items-center justify-center rounded-3xl bg-[#FFF3CD] px-6 py-4 shadow-sm border border-[#FFE082]">
                <span className="text-[12px] font-bold uppercase tracking-widest text-[#B78103]">Rate</span>
                <span className="text-[28px] font-extrabold text-[#795548] leading-none mt-1">₱550</span>
                <span className="text-[13px] font-bold text-[#B78103] mt-1">per session</span>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Left Column: Classes & Rates */}
              <div className="flex flex-col gap-6">
                
                {/* Classes */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {BALLET.classes.map((c, i) => (
                    <div key={i} className="flex flex-col rounded-2xl bg-white p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#F06292]" />
                      <h4 className="font-headline text-[18px] font-extrabold text-[#C2185B]">{c.name}</h4>
                      <span className="mt-1 inline-flex w-fit items-center rounded-md bg-[#FCE4EC] px-2 py-0.5 text-[11px] font-bold text-[#880E4F]">
                        {c.ageRange}
                      </span>
                      <p className="mt-2 text-[13px] text-[#64748b] leading-relaxed">{c.description}</p>
                      <div className="mt-4 flex items-center gap-2 text-[14px] font-bold text-[#0033A0]">
                        <span className="text-lg">⏰</span> {c.time}
                      </div>
                    </div>
                  ))}
                </div>

                {/* To Confirm Slot */}
                <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                  <h4 className="flex items-center gap-2 font-headline text-[16px] font-bold text-[#334155]">
                    <span className="text-xl">💌</span> To Confirm a Slot
                  </h4>
                  <ul className="mt-3 space-y-2 text-[14px] text-[#475569]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#C2185B] mt-0.5">•</span>
                      <span>{BALLET.rate.downpaymentNote}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#C2185B] mt-0.5">•</span>
                      <span>{BALLET.rate.paymentMethods}</span>
                    </li>
                  </ul>
                </div>

              </div>

              {/* Right Column: Recital */}
              <div className="flex flex-col">
                <div className="flex-1 rounded-3xl bg-gradient-to-br from-[#FCE4EC] to-white p-6 sm:p-8 border border-[#F8BBD0] shadow-sm relative overflow-hidden">
                  {/* Decorative ribbon */}
                  <div className="absolute -right-6 -top-6 text-[100px] opacity-10 rotate-12 pointer-events-none">🎀</div>
                  
                  <span className="inline-block rounded-full bg-[#E91E63] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm mb-3">
                    For Recital Participants
                  </span>
                  
                  <h4 className="font-headline text-[22px] font-extrabold text-[#880E4F] leading-tight">
                    {BALLET.recital.title}
                  </h4>
                  <p className="mt-2 text-[14px] font-medium text-[#C2185B]">
                    {BALLET.recital.note}
                  </p>

                  <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm border border-[#FCE4EC]">
                    <div className="flex items-end justify-between border-b border-slate-100 pb-3 mb-3">
                      <span className="font-headline text-[18px] font-bold text-[#334155]">Recital Kit</span>
                      <span className="text-[20px] font-extrabold text-[#E91E63]">{BALLET.recital.kitPrice}</span>
                    </div>
                    <p className="text-[13px] font-medium text-[#64748b] leading-relaxed">
                      {BALLET.recital.kitDetails}
                    </p>
                    
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px] font-semibold text-[#475569] border border-slate-200">
                        🎫 2 Guest Passes
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px] font-semibold text-[#475569] border border-slate-200">
                        💐 1 Mini Bouquet
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px] font-semibold text-[#475569] border border-slate-200">
                        👗 1 Set of Costume
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Corner glow */}
          <div aria-hidden className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-[#C2185B] opacity-10 blur-3xl" />
        </m.article>
            </m.div>
          )}
        </AnimatePresence>

        {/* Inquire CTA */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          className="mt-4 text-center"
        >
          <p className="mb-4 text-[14px] font-medium text-[#64748b]">
            Secure your slot and enroll online today! 🎒
          </p>
          <Link
            href="/register"
            id="programs-register-btn"
            className="group inline-flex items-center gap-4 rounded-[1.25rem] bg-[#0033A0] px-8 py-4 text-[17px] font-bold text-white shadow-[0_12px_24px_rgba(0,51,160,0.2)] transition-all duration-300 hover:bg-[#002f76] hover:shadow-[0_16px_32px_rgba(0,51,160,0.3)] hover:-translate-y-1"
          >
            Register Now
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:translate-x-1">
              <ArrowRightIcon className="h-4 w-4" />
            </div>
          </Link>
        </m.div>

      </div>
    </section>
  );
}
