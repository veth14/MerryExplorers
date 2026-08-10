"use client";

import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";
import { BALLET } from "@/data/landing";
import { ArrowRightIcon } from "./icons";

// ─── Static schedule data (sourced from official flyer) ──────────────────────

const LITTLE_EXPLORERS = {
  name: "Little Explorers",
  tagline: "PLAYGROUP",
  ageLabel: "For aged 2.6 to 4.11 years old ⭐",
  bgTop: "#0066CC",
  titleColor: "white",
  subtitleColor: "rgba(255,255,255,0.85)",
  pillBg: "#FFC107",
  pillText: "#0033A0",
  iconLeft: "🚀",
  iconRight: "🧩",
  fullTime: {
    label: "FULL TIME LITTLE EXPLORERS PLAYGROUP",
    sessions: 12,
    daysLabel: "Every Tuesday, Thursday & Friday",
    times: [
      "9:00 – 10:15 AM",
      "10:30 – 11:45 AM",
      "12:45 – 2:00 PM",
      "2:15 – 3:30 PM",
    ],
  },
  partTime: [
    {
      daysLabel: "Every Monday & Wednesday",
      sessions: 8,
      time: "12:45 – 2:00 PM",
    },
    {
      daysLabel: "Every Saturday",
      sessions: 5,
      time: "10:30 – 11:45 AM",
    },
  ],
};

const TINY_EXPLORERS = {
  name: "Tiny Explorers",
  tagline: "PLAYGROUP",
  ageLabel: "For aged 1.6 to 2.5 years old",
  note: "Also open to 2.6 to 4.11 year olds transitioning to playgroup routine and socialization — a fun interactive start to learning!",
  bgTop: "#FFC107",
  titleColor: "#0033A0",
  subtitleColor: "#0033A0",
  pillBg: "#0066CC",
  pillText: "white",
  iconLeft: "🧸",
  iconRight: "🖍️",
  sessions: 8,
  schedules: [
    {
      icon: "☀️",
      label: "Morning Session",
      days: "Every Monday & Wednesday",
      time: "9:15 – 10:15 AM",
      dayColor: "#0066CC",
    },
    {
      icon: "🌤️",
      label: "Midday Session",
      days: "Every Monday & Wednesday",
      time: "10:30 – 11:30 AM",
      dayColor: "#0066CC",
    },
    {
      icon: "🌙",
      label: "Afternoon Session",
      days: "Every Tuesday & Thursday",
      time: "4:00 – 5:00 PM",
      dayColor: "#FF8A3D",
    },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ProgramsSection() {
  return (
    <section id="programs" className="relative py-16 sm:py-24">
      {/* Decorative background grid */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230033A0' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">

        {/* Heading */}
        <m.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12 text-center"
        >
          <m.span
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mb-3 inline-block text-3xl"
          >
            🚀
          </m.span>
          <h2 className="font-headline text-[32px] font-extrabold tracking-tight text-[#0033A0] sm:text-[40px]">
            Our Programs
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] font-medium leading-relaxed text-[#0066CC]">
            Every child learns differently — we have a schedule that fits your family.
          </p>
        </m.div>

        {/* ── Playgroup Cards ── */}
        <div className="grid gap-8 lg:grid-cols-2">

          {/* ── Little Explorers ── */}
          <m.article
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative flex flex-col overflow-hidden rounded-[2.5rem] bg-white/80 backdrop-blur-2xl border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_24px_80px_-10px_rgba(0,51,160,0.10)] transition-all duration-300 hover:-translate-y-2"
          >
            {/* Header */}
            <div className="relative px-6 pb-7 pt-8 text-center" style={{ backgroundColor: LITTLE_EXPLORERS.bgTop }}>
              <span className="absolute left-6 top-6 text-2xl">{LITTLE_EXPLORERS.iconLeft}</span>
              <span className="absolute right-6 top-6 text-2xl">{LITTLE_EXPLORERS.iconRight}</span>
              <h3 className="font-headline text-[22px] font-extrabold uppercase tracking-wider" style={{ color: LITTLE_EXPLORERS.titleColor }}>
                {LITTLE_EXPLORERS.name}
              </h3>
              <p className="mt-0.5 text-[12px] font-bold uppercase tracking-[0.15em]" style={{ color: LITTLE_EXPLORERS.subtitleColor }}>
                {LITTLE_EXPLORERS.tagline}
              </p>
            </div>

            {/* Age pill */}
            <div className="relative z-10 -mt-3.5 flex justify-center">
              <span className="whitespace-nowrap rounded-full px-5 py-1.5 text-[11px] font-bold uppercase tracking-wider shadow-sm"
                style={{ backgroundColor: LITTLE_EXPLORERS.pillBg, color: LITTLE_EXPLORERS.pillText }}>
                {LITTLE_EXPLORERS.ageLabel}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-4 p-5">

              {/* Full Time block */}
              <div className="rounded-2xl border border-[#0066CC]/10 bg-[#F0F5FF] p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#0033A0]">
                    🏅 {LITTLE_EXPLORERS.fullTime.label}
                  </p>
                  <span className="rounded-full bg-[#0033A0] px-2.5 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">
                    {LITTLE_EXPLORERS.fullTime.sessions} Sessions
                  </span>
                </div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#0066CC]">
                  📅 {LITTLE_EXPLORERS.fullTime.daysLabel}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {LITTLE_EXPLORERS.fullTime.times.map((t) => (
                    <span key={t} className="rounded-xl bg-white px-3 py-2 text-center text-[12px] font-bold text-[#334155] shadow-sm ring-1 ring-black/5">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Part Time block */}
              <div className="rounded-2xl border border-[#FFC107]/20 bg-[#FFFBEC] p-4">
                <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-[#B8860B]">
                  ⏰ Part Time Little Explorers Playgroup
                </p>
                <div className="flex flex-col gap-2.5">
                  {LITTLE_EXPLORERS.partTime.map((pt) => (
                    <div key={pt.daysLabel} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/5">
                      <div>
                        <p className="text-[12px] font-bold text-[#0033A0]">{pt.daysLabel}</p>
                        <p className="text-[11px] font-semibold text-[#94a3b8]">{pt.sessions} Sessions</p>
                      </div>
                      <span className="rounded-lg bg-[#FFF3CD] px-2.5 py-1.5 text-[12px] font-bold text-[#B8860B] whitespace-nowrap">
                        {pt.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </m.article>

          {/* ── Tiny Explorers ── */}
          <m.article
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="relative flex flex-col overflow-hidden rounded-[2.5rem] bg-white/80 backdrop-blur-2xl border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_24px_80px_-10px_rgba(255,193,7,0.15)] transition-all duration-300 hover:-translate-y-2"
          >
            {/* Header */}
            <div className="relative px-6 pb-7 pt-8 text-center" style={{ backgroundColor: TINY_EXPLORERS.bgTop }}>
              <span className="absolute left-6 top-6 text-2xl">{TINY_EXPLORERS.iconLeft}</span>
              <span className="absolute right-6 top-6 text-2xl">{TINY_EXPLORERS.iconRight}</span>
              <h3 className="font-headline text-[22px] font-extrabold uppercase tracking-wider" style={{ color: TINY_EXPLORERS.titleColor }}>
                {TINY_EXPLORERS.name}
              </h3>
              <p className="mt-0.5 text-[12px] font-bold uppercase tracking-[0.15em]" style={{ color: TINY_EXPLORERS.subtitleColor }}>
                {TINY_EXPLORERS.tagline}
              </p>
            </div>

            {/* Age pill */}
            <div className="relative z-10 -mt-3.5 flex justify-center">
              <span className="whitespace-nowrap rounded-full px-5 py-1.5 text-[11px] font-bold uppercase tracking-wider shadow-sm"
                style={{ backgroundColor: TINY_EXPLORERS.pillBg, color: TINY_EXPLORERS.pillText }}>
                {TINY_EXPLORERS.ageLabel} ✨
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-4 p-5">

              {/* Transition note */}
              <p className="rounded-2xl bg-[#FFF8E1] px-4 py-3 text-[12px] font-medium leading-relaxed text-[#92400e] border border-[#FFC107]/20">
                💡 {TINY_EXPLORERS.note}
              </p>

              {/* Sessions badge */}
              <div className="flex justify-center">
                <span className="rounded-full bg-[#FFC107] px-5 py-1.5 text-[12px] font-extrabold uppercase tracking-wider text-[#0033A0] shadow-sm">
                  {TINY_EXPLORERS.sessions} Sessions
                </span>
              </div>

              {/* Schedule rows */}
              <div className="flex flex-col gap-2.5">
                {TINY_EXPLORERS.schedules.map((s) => (
                  <div key={s.label} className="rounded-2xl border border-black/5 bg-[#F8FAFC] p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{s.icon}</span>
                        <span className="text-[12px] font-extrabold uppercase tracking-wider text-[#334155]">
                          {s.label}
                        </span>
                      </div>
                      <span className="rounded-lg bg-white px-2.5 py-1 text-[12px] font-bold text-[#0033A0] shadow-sm ring-1 ring-black/5 whitespace-nowrap">
                        {s.time}
                      </span>
                    </div>
                    <p className="pl-7 text-[11px] font-bold uppercase tracking-wider" style={{ color: s.dayColor }}>
                      📅 {s.days}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </m.article>
        </div>

        {/* ── Ballet Card (full-width) ── */}
        <m.article
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="relative mt-8 overflow-hidden rounded-[2.5rem] bg-white/80 backdrop-blur-2xl border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_24px_80px_-10px_rgba(194,24,91,0.12)] transition-all duration-300 hover:-translate-y-2"
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
                  New Program
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
          className="mt-10 text-center"
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
