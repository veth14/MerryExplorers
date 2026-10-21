"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  CalendarEvent,
  CalendarEventType,
  EVENT_TYPE_META,
  getManilaDateStr,
} from "@/lib/calendar-events";

const EVENT_IMAGES: Record<string, string> = {
  adventure_start: "/images/events/adventure_start.jpg",
  renewal: "/images/events/renewal.jpg",
  registration_open: "/images/events/renewal.jpg",
  merry_event: "/images/events/merry_event.jpg",
  main_event: "/images/events/merry_event.jpg",
};

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  adventure_start:
    "Classes and joyful exploration begin for our young learners! Get ready for playful discovery, guided hands-on activities, and curious minds growing together.",
  renewal:
    "Priority renewal window is now officially open for our pioneer families. Reserve your child's schedule and secure their spot for the upcoming adventure cycle.",
  registration_open:
    "Public registration opens for new explorer families! Discover our nurturing playgroup environment, meet our caring educators, and enroll your little ones.",
  merry_event:
    "A special celebration of joy, community, and childhood milestones. Join us for fun activities, festive moments, and joyful memories at Merry Explorers.",
  main_event:
    "A major community milestone event at Merry Explorers! Come celebrate playful growth, friendships, and shared family moments.",
};

function formatShortDate(dateStr: string): { month: string; day: number } {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const month = new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "short" });
  return { month, day: d };
}

function formatFullDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeDays(dateStr: string): string {
  const todayStr = getManilaDateStr();
  const [y1, m1, d1] = dateStr.split("-").map(Number);
  const [y2, m2, d2] = todayStr.split("-").map(Number);
  const target = new Date(y1, m1 - 1, d1).getTime();
  const today = new Date(y2, m2 - 1, d2).getTime();
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Happening Today! 🎉";
  if (diffDays === 1) return "Starts Tomorrow! 🚀";
  if (diffDays > 1 && diffDays <= 7) return `Starts in ${diffDays} days! ✨`;
  if (diffDays > 7 && diffDays <= 30) return `In ${diffDays} days`;
  return "";
}

function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const [y, m, d] = event.startDate.split("-").map(Number);
  const startYmd = `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`;
  const nextDay = new Date(y, m - 1, d + 1);
  const endYmd = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, "0")}${String(nextDay.getDate()).padStart(2, "0")}`;
  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent(
    [
      EVENT_TYPE_META[event.type]?.label ? `Category: ${EVENT_TYPE_META[event.type].label}` : "",
      event.description || event.notes || DEFAULT_DESCRIPTIONS[event.type] || "",
      "Merry Explorers Playgroup & Learning Center",
    ]
      .filter(Boolean)
      .join("\n\n")
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startYmd}/${endYmd}&details=${details}&location=${encodeURIComponent("Merry Explorers, Caloocan")}`;
}

const MAJOR_EVENT_TYPES: CalendarEventType[] = [
  "adventure_start",
  "merry_event",
  "main_event",
  "renewal",
  "registration_open",
];

// ─── Event Detail Modal ───────────────────────────────────────────────────────

function EventDetailModal({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const meta = EVENT_TYPE_META[event.type as CalendarEventType] ?? {
    emoji: "📅",
    label: "Event",
    color: "#0033a0",
    bg: "#eef4ff",
    border: "#c7d8f0",
  };
  const fullDate = formatFullDate(event.startDate);
  const relativeBadge = formatRelativeDays(event.startDate);
  const imgUrl = event.imageUrl || EVENT_IMAGES[event.type] || "/images/events/adventure_start.jpg";
  const description =
    event.description ||
    event.notes ||
    DEFAULT_DESCRIPTIONS[event.type] ||
    "Join us for our upcoming school milestone at Merry Explorers!";
  const gcalUrl = buildGoogleCalendarUrl(event);
  const { month, day } = formatShortDate(event.startDate);
  const endDateStr =
    event.endDate && event.endDate !== event.startDate ? formatFullDate(event.endDate) : null;

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <m.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/55 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Panel */}
        <m.div
          key="panel"
          initial={{ opacity: 0, y: 60, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full sm:max-w-xl bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]"
        >
          {/* Image Banner */}
          <div className="relative h-56 sm:h-64 w-full shrink-0 overflow-hidden bg-slate-100">
            <Image
              src={imgUrl}
              alt={event.title}
              fill
              sizes="(max-width: 640px) 100vw, 576px"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center text-lg backdrop-blur-xs transition-all cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>

            {/* Date Badge */}
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-xs rounded-2xl px-3.5 py-2 shadow-lg border border-white/60 text-center min-w-[56px]">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-[#718096] block leading-none mb-0.5">
                {month}
              </span>
              <span className="text-[26px] font-black text-[#002f76] leading-none block">
                {day}
              </span>
            </div>

            {/* Category Pill */}
            <div className="absolute bottom-4 left-4">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-md border bg-white"
                style={{ color: meta.color, borderColor: meta.border }}
              >
                {meta.emoji} {meta.label}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-4">
            <div className="space-y-2">
              {relativeBadge && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black text-[#855300] bg-[#FFF8E7] border border-[#FDE68A]">
                  {relativeBadge}
                </span>
              )}
              <h2 className="font-fredoka text-[26px] sm:text-[30px] font-bold text-[#002f76] leading-tight">
                {event.title}
              </h2>
              <p className="text-[13px] font-semibold text-[#64748b]">
                📅 {fullDate}
                {endDateStr && <span className="ml-1">→ {endDateStr}</span>}
              </p>
            </div>

            <div className="rounded-2xl bg-[#f7f9fe] border border-[#e2eaf7] p-4">
              <p className="text-[14px] sm:text-[15px] text-[#3d5580] leading-relaxed font-medium">
                {description}
              </p>
            </div>
          </div>

          {/* Footer CTAs */}
          <div className="shrink-0 px-6 sm:px-8 pb-8 sm:pb-6 pt-4 border-t border-[#edf2f7] flex flex-col sm:flex-row items-center gap-3">
            <a
              href={gcalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#0033A0] hover:bg-[#002270] text-white text-[13.5px] font-black shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <span>📅</span> Add to Google Calendar
            </a>
            <button
              onClick={onClose}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-[#e2e8f0] bg-white hover:bg-[#f0f5ff] text-[#002f76] text-[13.5px] font-bold transition-all active:scale-95 cursor-pointer"
            >
              Close
            </button>
          </div>
        </m.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Featured Event Card ───────────────────────────────────────────────────────

function FeaturedEventCard({ event }: { event: CalendarEvent }) {
  const [showModal, setShowModal] = useState(false);
  const meta = EVENT_TYPE_META[event.type as CalendarEventType] ?? {
    emoji: "📅",
    label: "Event",
    color: "#0033a0",
    bg: "#eef4ff",
    border: "#c7d8f0",
  };
  const { month, day } = formatShortDate(event.startDate);
  const fullDate = formatFullDate(event.startDate);
  const relativeBadge = formatRelativeDays(event.startDate);
  const imgUrl = event.imageUrl || EVENT_IMAGES[event.type] || "/images/events/adventure_start.jpg";
  const description =
    event.description ||
    event.notes ||
    DEFAULT_DESCRIPTIONS[event.type] ||
    "Join us for our upcoming school milestone at Merry Explorers!";
  const gcalUrl = buildGoogleCalendarUrl(event);
  const reduce = useReducedMotion();

  return (
    <>
      <m.div
        initial={reduce ? false : { opacity: 0, y: 28, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        onClick={() => setShowModal(true)}
        className="group w-full max-w-3xl mx-auto rounded-[2.5rem] bg-white border-2 border-[#dbe6f6] shadow-[0_20px_50px_-15px_rgba(0,51,160,0.12)] hover:shadow-[0_25px_65px_-10px_rgba(0,51,160,0.18)] hover:border-[#93c5fd] transition-all overflow-hidden flex flex-col md:flex-row cursor-pointer"
      >
        {/* Visual picture on left / top */}
        <div className="relative md:w-5/12 h-64 md:h-auto min-h-[240px] overflow-hidden bg-slate-100">
          <Image
            src={imgUrl}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/10" />

          {/* Date Glass Badge */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-xs rounded-2xl px-3.5 py-2 shadow-lg border border-white/60 text-center min-w-[58px]">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#718096] block leading-none mb-1">
              {month}
            </span>
            <span className="text-[26px] font-black text-[#002f76] leading-none block">
              {day}
            </span>
          </div>

          {/* Category Pill Floating on Image */}
          <div className="absolute bottom-4 left-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-md border"
              style={{ color: meta.color, backgroundColor: "white", borderColor: meta.border }}
            >
              <span>{meta.emoji}</span> {meta.label}
            </span>
          </div>
        </div>

        {/* Content on right */}
        <div className="p-7 sm:p-8 md:w-7/12 flex flex-col justify-between bg-gradient-to-br from-white via-white to-[#fbfdff]">
          <div className="space-y-3">
            {/* Top meta row */}
            <div className="flex items-center gap-2 flex-wrap">
              {relativeBadge && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black text-[#855300] bg-[#FFF8E7] border border-[#FDE68A] shadow-xs">
                  {relativeBadge}
                </span>
              )}
              <span className="text-[12px] font-bold text-[#64748b]">
                {fullDate}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-fredoka text-[24px] sm:text-[28px] font-bold text-[#002f76] leading-tight group-hover:text-[#0050d5] transition-colors">
              {event.title}
            </h3>

            {/* Description */}
            <p className="text-[13.5px] sm:text-[14.5px] text-[#4a5f82] leading-relaxed font-medium line-clamp-3">
              {description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 mt-4 border-t border-[#edf2f7] flex items-center justify-between gap-3 flex-wrap">
            <a
              href={gcalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#eef4ff] hover:bg-[#dbeafe] text-[#0033a0] text-[12px] font-bold border border-[#bfdbfe] shadow-xs hover:shadow-sm transition-all active:scale-95"
            >
              <span>📅</span> Add to Google Calendar
            </a>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#0050d5] hover:text-[#002270] transition-colors py-1 px-2 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <span>View Details</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </m.div>

      {showModal && <EventDetailModal event={event} onClose={() => setShowModal(false)} />}
    </>
  );
}

// ─── Event Card (multi-event grid) ────────────────────────────────────────────

function EventCard({ event, index }: { event: CalendarEvent; index: number }) {
  const [showModal, setShowModal] = useState(false);
  const meta = EVENT_TYPE_META[event.type as CalendarEventType] ?? {
    emoji: "📅",
    label: "Event",
    color: "#0033a0",
    bg: "#eef4ff",
    border: "#c7d8f0",
  };
  const { month, day } = formatShortDate(event.startDate);
  const relativeBadge = formatRelativeDays(event.startDate);
  const imgUrl = event.imageUrl || EVENT_IMAGES[event.type] || "/images/events/adventure_start.jpg";
  const gcalUrl = buildGoogleCalendarUrl(event);
  const reduce = useReducedMotion();

  return (
    <>
      <m.div
        initial={reduce ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
        onClick={() => setShowModal(true)}
        className="group w-full sm:w-[350px] flex flex-col rounded-[2.2rem] bg-white border-2 border-[#e8f1fa] shadow-[0_16px_40px_-15px_rgba(0,51,160,0.08)] hover:border-[#93c5fd] hover:shadow-[0_22px_55px_-10px_rgba(0,51,160,0.16)] transition-all overflow-hidden cursor-pointer"
      >
        {/* Picture Banner on top */}
        <div className="relative h-44 w-full overflow-hidden bg-slate-100">
          <Image
            src={imgUrl}
            alt={event.title}
            fill
            sizes="350px"
            className="object-cover group-hover:scale-105 transition-transform duration-600 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

          {/* Date Glass Badge */}
          <div className="absolute top-3.5 left-3.5 bg-white/95 backdrop-blur-xs rounded-2xl px-3 py-1.5 shadow-md border border-white/60 text-center min-w-[50px]">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-[#718096] block leading-none mb-0.5">
              {month}
            </span>
            <span className="text-[22px] font-black text-[#002f76] leading-none block">
              {day}
            </span>
          </div>

          {/* Category Pill Floating */}
          <div className="absolute bottom-3 left-3.5">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border bg-white"
              style={{ color: meta.color, borderColor: meta.border }}
            >
              <span>{meta.emoji}</span> {meta.label}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-6 flex flex-col justify-between flex-1 gap-4">
          <div>
            {relativeBadge && (
              <span className="inline-block text-[10.5px] font-black text-[#855300] bg-[#FFF8E7] border border-[#FDE68A] px-2.5 py-0.5 rounded-full mb-2">
                {relativeBadge}
              </span>
            )}
            <h3 className="font-fredoka text-[18px] font-bold text-[#002f76] leading-snug group-hover:text-[#0050d5] transition-colors">
              {event.title}
            </h3>
          </div>

          <div className="pt-3 border-t border-[#f1f5f9] flex items-center justify-between gap-2">
            <a
              href={gcalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eef4ff] hover:bg-[#dbeafe] text-[#0033a0] text-[11px] font-bold border border-[#bfdbfe] transition-all active:scale-95"
            >
              <span>📅</span> Add to GCal
            </a>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
              className="text-[11.5px] font-bold text-[#0050d5] hover:text-[#002270] transition-colors py-1 px-2 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Details →
            </button>
          </div>
        </div>
      </m.div>

      {showModal && <EventDetailModal event={event} onClose={() => setShowModal(false)} />}
    </>
  );
}

// ─── Calendar Section ─────────────────────────────────────────────────────────

export function CalendarSection({ events }: { events: CalendarEvent[] }) {
  const reduce = useReducedMotion();
  const majorEvents = events.filter((e) =>
    MAJOR_EVENT_TYPES.includes(e.type as CalendarEventType)
  );

  return (
    <section id="calendar" className="relative py-12 sm:py-20 overflow-hidden bg-[#f7f9fe]">
      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230033A0' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="absolute top-8 right-6 sm:right-16 pointer-events-none z-0 select-none text-[80px] opacity-5 hidden sm:block">
        🗓️
      </div>

      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 relative z-10">
        {/* Section Header */}
        <m.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="font-fredoka text-[13px] font-semibold uppercase tracking-wider text-[#0050d5] bg-[#edf5ff] px-4 py-1.5 rounded-full inline-block mb-3 border border-[#d6e7ff] shadow-sm">
            🗺️ Events &amp; Important Dates
          </span>
          <h2 className="font-fredoka text-[32px] sm:text-[42px] font-bold text-[#002f76] tracking-normal">
            Mark Your Calendar
          </h2>
          <p className="mt-2 text-[15px] sm:text-[16px] text-[#5b7294] max-w-xl mx-auto font-medium">
            Upcoming adventure starts, registration openings, renewal windows, and special events — all in one place.
          </p>
        </m.div>

        {majorEvents.length === 0 ? (
          <m.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center py-12"
          >
            <div className="text-5xl mb-4">📅</div>
            <p className="font-fredoka text-[18px] font-semibold text-[#5b7294]">
              No upcoming major events right now.
            </p>
            <p className="text-[14px] text-[#9aa3b2] mt-1">
              Check back soon — new adventures and registration dates are always around the corner!
            </p>
          </m.div>
        ) : majorEvents.length === 1 ? (
          <FeaturedEventCard event={majorEvents[0]} />
        ) : (
          <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
            {majorEvents.map((event, i) => (
              <EventCard key={event._id} event={event} index={i} />
            ))}
          </div>
        )}

        {/* CTA */}
        <m.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            href="/under-development"
            className="inline-flex items-center gap-2.5 rounded-2xl bg-[#0033A0] hover:bg-[#002270] text-white px-6 py-3.5 text-[14px] font-black shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <span>📅</span>
            <span>View Full Calendar</span>
          </Link>
          <Link
            href="/api/calendar.ics"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#e2e8f0] bg-white hover:bg-[#f0f5ff] text-[#002f76] px-5 py-3.5 text-[13px] font-bold transition-all"
          >
            <span>📥</span>
            <span>Subscribe to Calendar</span>
          </Link>
        </m.div>
      </div>
    </section>
  );
}


