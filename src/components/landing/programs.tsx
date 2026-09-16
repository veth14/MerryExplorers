"use client";

import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";
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

export function ProgramsSection() {
  const reduce = useReducedMotion();

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

        {/* Which explorer banner */}
        <m.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="mb-10 mx-auto max-w-2xl rounded-[1.5rem] bg-gradient-to-r from-[#0033A0] to-[#0066CC] px-6 py-4 text-center text-white shadow-[0_12px_32px_rgba(0,51,160,0.2)]"
        >
          <p className="text-[16px] font-extrabold">Which kind of explorer is your little one?</p>
          <p className="mt-1 text-[13px] font-medium text-white/80">
            Different playgroup programs — all in one merry adventure. 💛
          </p>
        </m.div>

        {/* ── Discovery Club Cards (2-col) ── */}
        <div className="grid gap-8 lg:grid-cols-2 mb-8">
          <ProgramCard data={CURIOUS_EXPLORER} delay={0} animateFrom="left" />
          <ProgramCard data={CREATIVE_EXPLORER} delay={0.1} animateFrom="right" />
        </div>

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

        {/* ── Ballet Card (full-width) ── */}
        <m.article
          initial={reduce ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="relative mb-10 overflow-hidden rounded-[2.5rem] bg-white/80 backdrop-blur-2xl border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_24px_80px_-10px_rgba(194,24,91,0.12)] transition-all duration-300 hover:-translate-y-2"
        >
          {/* Top bar */}
          <div className="h-2 w-full" style={{ backgroundColor: BALLET.accent }} />

          <div className="flex flex-col gap-6 p-7 sm:flex-row sm:items-center sm:justify-between">

            {/* Left: Title */}
            <div className="flex items-center gap-4">
              <m.span
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="text-5xl"
              >
                {BALLET.emoji}
              </m.span>
              <div>
                <span className="mb-1 inline-block rounded-full px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest"
                  style={{ backgroundColor: BALLET.accentSoft, color: BALLET.accent }}>
                  Special Program
                </span>
                <h3 className="font-headline text-[26px] font-extrabold tracking-tight" style={{ color: BALLET.accent }}>
                  Ballet
                </h3>
              </div>
            </div>

            {/* Center: Schedule details */}
            <div className="flex flex-wrap gap-3 sm:justify-center">
              <div className="flex items-center gap-2 rounded-2xl bg-[#FCE4EC]/60 px-4 py-3 border border-[#C2185B]/10">
                <span className="text-xl">📅</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Day</p>
                  <p className="text-[14px] font-extrabold text-[#C2185B]">{BALLET.day}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-[#FCE4EC]/60 px-4 py-3 border border-[#C2185B]/10">
                <span className="text-xl">⏰</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Time</p>
                  <p className="text-[14px] font-extrabold text-[#C2185B]">{BALLET.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-[#FCE4EC]/60 px-4 py-3 border border-[#C2185B]/10">
                <span className="text-xl">🏅</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Sessions</p>
                  <p className="text-[14px] font-extrabold text-[#C2185B]">{BALLET.sessions} Sessions</p>
                </div>
              </div>
            </div>

            {/* Right: Feature */}
            <div className="flex items-center gap-3 rounded-2xl border border-[#C2185B]/15 bg-[#FCE4EC]/40 px-5 py-4 sm:max-w-[220px]">
              <p className="text-[13px] font-bold leading-snug text-[#880E4F]">
                {BALLET.feature}
              </p>
            </div>
          </div>

          {/* Corner glow */}
          <div aria-hidden className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-[#C2185B] opacity-10 blur-3xl" />
        </m.article>

        {/* Inquire CTA */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          className="mt-4 text-center"
        >
          <p className="mb-4 text-[14px] font-medium text-[#64748b]">
            Message us on Facebook to check available slots! 💛
          </p>
          <Link
            href="/inquire"
            id="programs-inquire-btn"
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
