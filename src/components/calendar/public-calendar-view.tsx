"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { m, AnimatePresence, useReducedMotion, Variants } from "framer-motion";
import {
  CalendarEvent,
  CalendarEventType,
  EVENT_TYPE_META,
  getManilaDateStr,
  addMonths,
  deduplicateCalendarEvents,
  openCalendarEvent,
} from "@/lib/calendar-events";

interface PublicCalendarViewProps {
  initialMonth: string; // "YYYY-MM"
  initialEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
  siteUrl: string;
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeDays(dateStr: string, todayStr: string): string {
  const [y1, m1, d1] = dateStr.split("-").map(Number);
  const [y2, m2, d2] = todayStr.split("-").map(Number);
  const target = new Date(y1, m1 - 1, d1).getTime();
  const today = new Date(y2, m2 - 1, d2).getTime();
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  return "";
}

function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const [y, m, d] = event.startDate.split("-").map(Number);
  const startYmd = `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`;

  // Next day for all-day exclusive end
  let endYmd = startYmd;
  if (event.endDate && event.endDate > event.startDate) {
    const [ey, em, ed] = event.endDate.split("-").map(Number);
    const endDateObj = new Date(ey, em - 1, ed + 1);
    endYmd = `${endDateObj.getFullYear()}${String(endDateObj.getMonth() + 1).padStart(2, "0")}${String(endDateObj.getDate()).padStart(2, "0")}`;
  } else {
    const nextDay = new Date(y, m - 1, d + 1);
    endYmd = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, "0")}${String(nextDay.getDate()).padStart(2, "0")}`;
  }

  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent(
    [
      EVENT_TYPE_META[event.type]?.label ? `Category: ${EVENT_TYPE_META[event.type].label}` : "",
      event.notes || "",
      "Merry Explorers Playgroup & Learning Center",
    ]
      .filter(Boolean)
      .join("\n\n")
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startYmd}/${endYmd}&details=${details}&location=${encodeURIComponent("Merry Explorers, Caloocan")}`;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function PublicCalendarView({
  initialMonth,
  initialEvents,
  upcomingEvents,
  siteUrl,
}: PublicCalendarViewProps) {
  const todayStr = useMemo(() => getManilaDateStr(), []);
  const todayMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);
  const reduceMotion = useReducedMotion();

  const [currentMonth, setCurrentMonth] = useState<string>(initialMonth);
  const [direction, setDirection] = useState<number>(0);
  const [monthCache, setMonthCache] = useState<Record<string, CalendarEvent[]>>({
    [initialMonth]: deduplicateCalendarEvents(initialEvents),
  });
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState<boolean>(false);
  const [copiedFeed, setCopiedFeed] = useState<boolean>(false);
  const [isClientMounted, setIsClientMounted] = useState(false);

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  const handleCopyFeed = useCallback(() => {
    const feedUrl = `${siteUrl}/api/calendar.ics`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(feedUrl);
    }
    setCopiedFeed(true);
    setTimeout(() => setCopiedFeed(false), 2500);
  }, [siteUrl]);

  // Month metadata
  const [year, month] = currentMonth.split("-").map(Number);
  const monthDate = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const monthLabel = useMemo(
    () =>
      monthDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [monthDate]
  );

  // Grid calculation
  const totalDays = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();

  const cells = useMemo(() => {
    const list: (string | null)[] = [
      ...Array(firstDow).fill(null),
      ...Array.from(
        { length: totalDays },
        (_, i) => `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
      ),
    ];
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [firstDow, totalDays, year, month]);

  // Current month's events
  const currentEvents = useMemo(() => {
    return monthCache[currentMonth] || [];
  }, [monthCache, currentMonth]);

  // Map events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of currentEvents) {
      if (!map[e.startDate]) map[e.startDate] = [];
      map[e.startDate].push(e);
    }
    return map;
  }, [currentEvents]);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch month data when changing months
  const loadMonthEvents = useCallback(async (targetMonth: string) => {
    if (monthCache[targetMonth]) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/calendar-events?month=${targetMonth}&includePrograms=true&visibility=public`
      );
      if (res.ok && isMountedRef.current) {
        const data = await res.json();
        const deduplicated = deduplicateCalendarEvents(data.events || []);
        setMonthCache((prev) => ({ ...prev, [targetMonth]: deduplicated }));
      }
    } catch (err) {
      console.error("Failed to load month events:", err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [monthCache]);

  const handleMonthChange = (delta: number) => {
    const nextM = addMonths(currentMonth, delta);
    setDirection(delta);
    setCurrentMonth(nextM);
    setSelectedDate(null);
    loadMonthEvents(nextM);

    // Update browser URL silently
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("month", nextM);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const handleJumpToToday = () => {
    if (currentMonth === todayMonthStr) {
      setSelectedDate(todayStr);
      return;
    }
    const delta = todayMonthStr > currentMonth ? 1 : -1;
    setDirection(delta);
    setCurrentMonth(todayMonthStr);
    setSelectedDate(todayStr);
    loadMonthEvents(todayMonthStr);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("month", todayMonthStr);
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedDate(null);
        setShowSubscribeModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[selectedDate] || [];
  }, [selectedDate, eventsByDate]);

  // Slide animation variants
  const slideVariants: Variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 32 : dir < 0 ? -32 : 0,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring" as const, stiffness: 380, damping: 32 },
        opacity: { duration: 0.2 },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -32 : dir < 0 ? 32 : 0,
      opacity: 0,
      transition: { duration: 0.18, ease: "easeIn" as const },
    }),
  };

  return (
    <div>
      {/* ── Redesigned Playful Hero (Soft, Warm, Merry Explorers Palette) ── */}
      <section className="relative pt-32 sm:pt-36 md:pt-40 pb-10 sm:pb-14 px-4 sm:px-8 overflow-hidden bg-gradient-to-b from-[#f0f6ff]/80 via-[#faf9f5] to-[#faf9f5]">
        {/* Soft playful background decorations */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-gradient-to-r from-[#ffe082]/20 via-[#90caf9]/20 to-[#a5d6a7]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-5xl text-center space-y-4">
          {/* Breadcrumb / Back Link */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#0033a0] hover:text-[#002270] transition-colors py-1 px-3 rounded-full hover:bg-white/80"
            >
              <span>←</span> Back to Home
            </Link>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFF8E7] text-[#855300] border-2 border-[#FDE68A] shadow-xs">
            <span className="text-[14px]">🗺️</span>
            <span className="text-[11.5px] font-fredoka font-bold tracking-wider uppercase">
              Adventure Calendar
            </span>
          </div>

          {/* Main Title */}
          <h1 className="font-fredoka text-[36px] sm:text-[48px] md:text-[54px] font-bold text-[#0033A0] tracking-tight leading-tight">
            Mark Your Calendar
          </h1>

          {/* Friendly Subtitle */}
          <p className="text-[15px] sm:text-[17px] text-[#4a5f82] max-w-2xl mx-auto font-medium leading-relaxed">
            Keep track of upcoming adventure start dates, public registration openings, renewal windows, and Philippine school holidays — all in one joyful place.
          </p>

          {/* Action CTAs */}
          <div className="flex items-center justify-center gap-3 pt-3 flex-wrap">
            <a
              href={`${siteUrl}/api/calendar.ics`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-[#f1f6fd] text-[#0033a0] font-fredoka text-[14px] font-bold border-2 border-[#d5e3f7] shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <span>📥</span> Download .ics
            </a>
            <button
              type="button"
              onClick={() => setShowSubscribeModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FFC107] hover:bg-[#ffb800] text-[#0a1835] font-fredoka text-[14px] font-bold shadow-[0_4px_14px_rgba(255,193,7,0.35)] hover:shadow-[0_6px_20px_rgba(255,193,7,0.45)] transition-all active:scale-95 hover:-translate-y-0.5 cursor-pointer"
            >
              <span>📆</span> Subscribe to Calendar
            </button>
          </div>
        </div>
      </section>

      {/* ── Main Interactive Calendar Section ── */}
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-8 pb-16 sm:pb-24 space-y-8">
        {/* ── Upcoming Events Quick Strip ── */}
        {upcomingEvents.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-6 bg-[#FFB800] rounded-full inline-block" />
                <h2 className="font-fredoka text-[22px] sm:text-[24px] font-bold text-[#002f76]">
                  Coming Up Next
              </h2>
            </div>
            <span className="text-[12px] font-bold text-[#64748b] bg-[#eef4ff] px-3 py-1 rounded-full">
              ✨ Next 4 Events
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {upcomingEvents.slice(0, 4).map((e) => {
              const meta = EVENT_TYPE_META[e.type] ?? {
                color: "#0033a0",
                bg: "#eef4ff",
                border: "#c7d8f0",
                emoji: "📅",
                label: "Event",
              };
              const [y, mStr, dStr] = e.startDate.split("-").map(Number);
              const monthAbbr = new Date(y, mStr - 1, 1).toLocaleDateString("en-US", {
                month: "short",
              });
              const relText = formatRelativeDays(e.startDate, todayStr);

              return (
                <button
                  type="button"
                  key={e._id}
                  onClick={() => {
                    const targetMonth = e.startDate.slice(0, 7);
                    if (targetMonth !== currentMonth) {
                      setDirection(targetMonth > currentMonth ? 1 : -1);
                      setCurrentMonth(targetMonth);
                      loadMonthEvents(targetMonth);
                    }
                    setSelectedDate(e.startDate);
                  }}
                  className="group text-left rounded-3xl bg-white border-2 border-[#e8f0fe] p-4 shadow-[0_8px_24px_rgba(0,51,160,0.04)] hover:shadow-[0_12px_32px_rgba(0,51,160,0.12)] hover:border-[#bfe0fb] transition-all hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: meta.color }}
                  />
                  <div className="flex items-start justify-between mb-2 pt-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-fredoka text-[28px] font-bold text-[#002f76] leading-none">
                        {dStr}
                      </span>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
                        {monthAbbr}
                      </span>
                    </div>
                    <span className="text-[24px] transform group-hover:scale-110 transition-transform">
                      {meta.emoji}
                    </span>
                  </div>

                  <p className="font-fredoka text-[14px] font-semibold text-[#002f76] leading-snug line-clamp-2 mb-2">
                    {e.title}
                  </p>

                  <div className="flex items-center justify-between gap-1 mt-auto">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
                      style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}
                    >
                      {meta.emoji} {meta.label}
                    </span>
                    {relText && (
                      <span className="text-[10px] font-bold text-[#ff9800] bg-[#fff8e7] px-2 py-0.5 rounded-full">
                        {relText}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Interactive Month Calendar ── */}
      <section className="rounded-3xl bg-white border-2 border-[#e2eaf5] shadow-[0_16px_40px_rgba(0,51,160,0.06)] overflow-hidden">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-b border-[#eef2f8] bg-gradient-to-r from-[#fbfdff] via-white to-[#fbfdff]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleMonthChange(-1)}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl border-2 border-[#e2eaf5] bg-white flex items-center justify-center text-[#0033a0] hover:bg-[#eef4ff] hover:border-[#0033a0] active:scale-95 transition-all font-bold text-xl shadow-xs"
              aria-label="Previous Month"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => handleMonthChange(1)}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl border-2 border-[#e2eaf5] bg-white flex items-center justify-center text-[#0033a0] hover:bg-[#eef4ff] hover:border-[#0033a0] active:scale-95 transition-all font-bold text-xl shadow-xs"
              aria-label="Next Month"
            >
              ›
            </button>
          </div>

          <div className="flex items-center gap-3">
            <h2 className="font-fredoka text-[20px] sm:text-[26px] font-bold text-[#002f76] tracking-tight text-center">
              {monthLabel}
            </h2>
            {loading && (
              <span className="inline-block w-4 h-4 border-2 border-[#0033a0] border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-3.5 py-2 rounded-2xl border-2 border-[#FFC107] bg-[#FFF8E7] hover:bg-[#FFC107] text-[#855300] hover:text-[#0a1835] font-fredoka text-[13px] font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
          >
            <span>🎈</span>
            <span className="hidden sm:inline">Jump to</span> Today
          </button>
        </div>

        {/* Mobile tap hint */}
        <div className="sm:hidden px-4 py-2 bg-[#f0f6ff] text-[#0033a0] text-[11px] font-bold text-center border-b border-[#e2eaf5] flex items-center justify-center gap-1.5">
          <span>👆</span> Tap any date to view scheduled events & details
        </div>

        {/* Calendar Body with Animation */}
        <div className="p-3 sm:p-6 overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 mb-2">
            {DOW.map((d, idx) => (
              <div
                key={d}
                className={`text-center text-[11px] font-black uppercase tracking-wider py-1.5 ${
                  idx === 0 ? "text-[#dc2626]" : "text-[#718096]"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Animated Month Grid */}
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <m.div
              key={currentMonth}
              custom={direction}
              variants={reduceMotion ? undefined : slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="grid grid-cols-7 gap-1 sm:gap-2"
            >
              {cells.map((dateStr, idx) => {
                if (!dateStr) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="bg-[#fafbff] rounded-2xl min-h-[72px] sm:min-h-[92px] border border-dashed border-[#edf2f7]"
                    />
                  );
                }

                const dayEvents = eventsByDate[dateStr] || [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const dayNum = parseInt(dateStr.split("-")[2], 10);
                const isSunday = idx % 7 === 0;
                const hasEvents = dayEvents.length > 0;

                return (
                  <button
                    type="button"
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`
                      relative flex flex-col justify-between rounded-2xl sm:rounded-3xl p-1.5 sm:p-2.5 text-left transition-all
                      min-h-[72px] sm:min-h-[92px] border-2 group cursor-pointer select-none
                      ${
                        isSelected
                          ? "bg-[#eef4ff] border-[#0033a0] shadow-md ring-2 ring-[#0033a0]/30 -translate-y-0.5"
                          : hasEvents
                          ? "bg-white border-[#dbe6f6] hover:border-[#93c5fd] hover:bg-[#f8faff] hover:shadow-sm"
                          : isSunday
                          ? "bg-[#fffdfd] border-[#f0e4e4] hover:bg-[#fff7f7]"
                          : "bg-white border-[#edf2f7] hover:bg-[#f8fafc]"
                      }
                    `}
                    aria-label={`${dateStr}, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}`}
                  >
                    {/* Top row: day number + indicator */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`
                          inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[12px] sm:text-[13px] font-black transition-all
                          ${
                            isToday
                              ? "bg-[#0033a0] text-white shadow-sm ring-2 ring-[#0033a0]/20"
                              : isSelected
                              ? "bg-[#002f76] text-white"
                              : isSunday
                              ? "text-[#dc2626]"
                              : "text-[#1e293b] group-hover:text-[#0033a0]"
                          }
                        `}
                      >
                        {dayNum}
                      </span>

                      {/* Small badge count on mobile if multiple */}
                      {hasEvents && (
                        <span className="sm:hidden text-[9px] font-black text-[#0033a0] bg-[#eef4ff] rounded-full px-1.5 py-0.5">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Desktop: Event Pills */}
                    <div className="hidden sm:flex flex-col gap-1 w-full mt-1">
                      {dayEvents.slice(0, 2).map((e, i) => {
                        const meta = EVENT_TYPE_META[e.type] ?? {
                          color: "#0033a0",
                          bg: "#eef4ff",
                          emoji: "📅",
                        };
                        return (
                          <div
                            key={`${e._id}-${i}`}
                            className="truncate text-[10.5px] font-bold px-1.5 py-0.5 rounded-lg border leading-tight transition-transform group-hover:translate-x-0.5"
                            style={{
                              backgroundColor: meta.bg,
                              color: meta.color,
                              borderColor: `${meta.color}25`,
                            }}
                            title={e.title}
                          >
                            <span className="mr-0.5">{meta.emoji}</span> {e.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-[9.5px] font-extrabold text-[#0033a0] px-1 bg-[#eef4ff] rounded-md self-start">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>

                    {/* Mobile: Colored dots preview */}
                    <div className="sm:hidden flex items-center gap-1 flex-wrap mt-auto pt-1">
                      {dayEvents.slice(0, 3).map((e, i) => {
                        const meta = EVENT_TYPE_META[e.type] ?? { color: "#0033a0" };
                        return (
                          <span
                            key={`dot-${i}`}
                            className="w-2 h-2 rounded-full inline-block shrink-0 shadow-xs"
                            style={{ backgroundColor: meta.color }}
                          />
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <span className="text-[8px] font-bold text-[#64748b] leading-none">
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </m.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── Day Detail Bottom Sheet / Modal (Portaled to document.body) ── */}
      {isClientMounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selectedDate && (
            <div className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 pointer-events-none">
              {/* Backdrop */}
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedDate(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs pointer-events-auto"
              />

              {/* Modal Dialog Content (Sticks 100% flush to bottom on mobile) */}
              <m.div
                initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
                animate={{ y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 350 }}
                style={{ transformOrigin: "bottom center" }}
                className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-[2rem] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl border-t-2 border-x-0 border-b-0 sm:border-2 border-[#dbe6f6] shadow-[0_-12px_40px_rgba(0,51,160,0.2)] sm:shadow-2xl max-h-[85dvh] flex flex-col overflow-hidden pointer-events-auto mb-0"
              >
              {/* Mobile grab handle */}
              <div className="sm:hidden pt-3 pb-1 flex justify-center">
                <div className="w-12 h-1.5 bg-[#cbd5e1] rounded-full" />
              </div>

              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-[#eef2f8] flex items-center justify-between bg-gradient-to-r from-[#fbfdff] to-white">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#FF9800] bg-[#FFF8E7] px-2.5 py-0.5 rounded-full inline-block mb-1">
                    {formatRelativeDays(selectedDate, todayStr) || "Selected Date"}
                  </span>
                  <h3 className="font-fredoka text-[18px] sm:text-[20px] font-bold text-[#002f76]">
                    {formatDisplayDate(selectedDate)}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="w-9 h-9 rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body: Events List */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-3.5 flex-1">
                {selectedDateEvents.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <span className="text-[44px] mb-2 inline-block">☀️</span>
                    <h4 className="font-fredoka text-[18px] font-bold text-[#002f76] mb-1">
                      No Events Scheduled
                    </h4>
                    <p className="text-[13px] text-[#64748b] max-w-xs mx-auto">
                      A wonderful day for joyful play, playful discovery, and growing curious minds! ✨
                    </p>
                  </div>
                ) : (
                  selectedDateEvents.map((e) => {
                    const meta = EVENT_TYPE_META[e.type] ?? {
                      color: "#0033a0",
                      bg: "#eef4ff",
                      border: "#c7d8f0",
                      emoji: "📅",
                      label: "Event",
                    };
                    const gcalUrl = buildGoogleCalendarUrl(e);

                    return (
                      <div
                        key={e._id}
                        className="rounded-2xl border-2 p-4 bg-white shadow-xs transition-all flex flex-col gap-2.5"
                        style={{ borderColor: `${meta.color}40` }}
                      >
                          <div className="flex items-start gap-3">
                            <span
                              className="w-10 h-10 rounded-2xl flex items-center justify-center text-[22px] shrink-0 border"
                              style={{
                                backgroundColor: meta.bg,
                                borderColor: meta.border,
                              }}
                            >
                              {meta.emoji}
                            </span>
                            <div>
                              <h4 className="font-fredoka text-[16px] font-bold text-[#002f76] leading-snug">
                                {e.title}
                              </h4>
                              <span
                                className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
                                style={{
                                  color: meta.color,
                                  backgroundColor: meta.bg,
                                  borderColor: meta.border,
                                }}
                              >
                                {meta.emoji} {meta.label}
                              </span>
                            </div>
                          </div>
                        {e.imageUrl && (
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-xs">
                            <img
                              src={e.imageUrl}
                              alt={e.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {e.notes && (
                          <div className="bg-[#f8fafc] rounded-xl p-2.5 text-[12px] text-[#475569] leading-relaxed border border-[#edf2f7]">
                            <p className="font-semibold text-[#1e293b] text-[11px] uppercase tracking-wider mb-0.5">
                              Details:
                            </p>
                            {e.notes}
                          </div>
                        )}

                        {/* Add to Calendar CTA */}
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => openCalendarEvent(e)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eef4ff] hover:bg-[#dbeafe] text-[#0033a0] text-[11px] font-bold border border-[#bfdbfe] transition-all active:scale-95 cursor-pointer"
                          >
                            <span>📅</span> Add to Calendar
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer - Extra bottom padding on mobile for safe area and zero cut-off */}
              <div className="px-6 pt-3.5 pb-8 sm:pb-3.5 bg-[#f8fafc] border-t border-[#eef2f8] flex items-center justify-between shrink-0">
                <span className="text-[12px] text-[#64748b] font-semibold">
                  {selectedDateEvents.length} event{selectedDateEvents.length === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#0033a0] hover:bg-[#002f76] text-white text-[13px] font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  Done
                </button>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

      {/* ── Month Event Agenda List ── */}
      {currentEvents.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-2.5 h-6 bg-[#0033a0] rounded-full inline-block" />
            <h2 className="font-fredoka text-[22px] sm:text-[24px] font-bold text-[#002f76]">
              All Events in {monthLabel}
            </h2>
          </div>

          <div className="space-y-2.5">
            {currentEvents.map((e) => {
              const meta = EVENT_TYPE_META[e.type] ?? {
                color: "#0033a0",
                bg: "#eef4ff",
                border: "#c7d8f0",
                emoji: "📅",
                label: "Event",
              };
              const isSelected = e.startDate === selectedDate;

              return (
                <div
                  key={e._id}
                  onClick={() => setSelectedDate(e.startDate)}
                  className={`
                    group flex items-center justify-between gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer
                    ${
                      isSelected
                        ? "bg-[#eef4ff] border-[#0033a0] shadow-sm"
                        : "bg-white border-[#e8f0fe] hover:border-[#bfe0fb] hover:shadow-xs"
                    }
                  `}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-[22px] shrink-0 border"
                      style={{ backgroundColor: meta.bg, borderColor: meta.border }}
                    >
                      {meta.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h4 className="font-fredoka text-[15px] font-semibold text-[#002f76] truncate">
                          {e.title}
                        </h4>
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
                          style={{
                            color: meta.color,
                            backgroundColor: meta.bg,
                            borderColor: meta.border,
                          }}
                        >
                          {meta.emoji} {meta.label}
                        </span>
                      </div>
                      <p className="text-[12px] font-semibold text-[#64748b]">
                        {formatDisplayDate(e.startDate)}
                        {e.endDate && e.endDate !== e.startDate && ` – ${formatDisplayDate(e.endDate)}`}
                      </p>
                    </div>
                  </div>

                  <span className="text-[12px] font-bold text-[#0033a0] opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                    View Details →
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Event Types Legend ── */}
      <section className="rounded-3xl border-2 border-[#e8f0fe] bg-white p-5 shadow-xs">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#64748b] mb-3">
          Event Categories
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(EVENT_TYPE_META) as [CalendarEventType, typeof EVENT_TYPE_META[CalendarEventType]][])
            .filter(([t]) => t !== "suspension")
            .map(([type, meta]) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-transform hover:scale-105"
                style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}
              >
                <span>{meta.emoji}</span> {meta.label}
              </span>
            ))}
        </div>
      </section>

      {/* ── Subscribable .ics Banner ── */}
      <section className="rounded-3xl bg-gradient-to-br from-[#002f76] via-[#0033a0] to-[#0d47a1] text-white p-6 sm:p-8 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[#FFC107] text-[11px] font-black uppercase tracking-wider">
            📆 Live Calendar Feed
          </div>
          <h3 className="font-fredoka text-[22px] sm:text-[26px] font-bold">
            Sync Directly to Your Phone
          </h3>
          <p className="text-[13px] text-blue-100 max-w-md">
            Subscribe once and automatically see school events, adventure start dates, and holiday closures in Apple Calendar, Google Calendar, or Outlook.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
          <a
            href={`${siteUrl}/api/calendar.ics`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-blue-50 text-[#0033a0] font-fredoka text-[14px] font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <span>📥</span> Download .ics
          </a>
          <button
            type="button"
            onClick={() => setShowSubscribeModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#FFC107] hover:bg-[#ffb800] text-[#0a1835] font-fredoka text-[14px] font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <span>🎈</span> Subscribe Feed
          </button>
        </div>
      </section>
      </div>

      {/* ── Custom Subscribe to Calendar Modal (Merry Explorers Branded) ── */}
      {isClientMounted && createPortal(
        <AnimatePresence>
          {showSubscribeModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              {/* Backdrop */}
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSubscribeModal(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              />

              {/* Modal Window */}
              <m.div
                initial={reduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 12 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="relative z-10 w-full max-w-lg bg-white rounded-3xl border-2 border-[#dbe6f6] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-[#002f76] to-[#0033a0] text-white flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-2xl shadow-inner border border-white/20">
                      📆
                    </span>
                    <div>
                      <h3 className="font-fredoka text-[20px] font-bold text-white leading-tight">
                        Subscribe to Calendar
                      </h3>
                      <p className="text-[12px] text-blue-100 font-medium mt-0.5">
                        Keep Merry Explorers events auto-synced with your schedule
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSubscribeModal(false)}
                    className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                {/* Options Content */}
                <div className="p-6 overflow-y-auto space-y-4">
                  <p className="text-[13px] text-[#4a5f82] font-medium leading-relaxed">
                    Choose your favorite calendar service below to automatically sync adventure starts, renewals, and holiday closures:
                  </p>

                  {/* Quick 1-Click Calendar Options */}
                  <div className="space-y-2.5">
                    {/* Google Calendar Web */}
                    <a
                      href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(siteUrl + "/api/calendar.ics")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between p-3.5 rounded-2xl border-2 border-[#e2e8f0] hover:border-[#4285F4] bg-[#f8fafc] hover:bg-[#f0f6ff] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-xl">
                          🌐
                        </div>
                        <div className="text-left">
                          <p className="font-fredoka text-[14px] font-bold text-[#002f76] group-hover:text-[#4285F4]">
                            Google Calendar (Web)
                          </p>
                          <p className="text-[11.5px] text-[#64748b]">
                            Opens Google Calendar directly to subscribe with zero popups
                          </p>
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-[#4285F4] px-2.5 py-1 rounded-lg bg-white border border-[#4285F4]/30 shadow-xs">
                        Connect →
                      </span>
                    </a>

                    {/* Apple Calendar / iOS / Mac */}
                    <a
                      href={`${siteUrl}/api/calendar.ics`.replace(/^https?:\/\//, "webcal://")}
                      className="group flex items-center justify-between p-3.5 rounded-2xl border-2 border-[#e2e8f0] hover:border-[#1e293b] bg-[#f8fafc] hover:bg-[#f8fafc] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-xl">
                          🍎
                        </div>
                        <div className="text-left">
                          <p className="font-fredoka text-[14px] font-bold text-[#002f76] group-hover:text-[#000]">
                            Apple Calendar (iPhone & Mac)
                          </p>
                          <p className="text-[11.5px] text-[#64748b]">
                            Directly syncs with Apple Calendar app on iOS & macOS
                          </p>
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-[#1e293b] px-2.5 py-1 rounded-lg bg-white border border-slate-300 shadow-xs">
                        Subscribe →
                      </span>
                    </a>

                    {/* Outlook Web */}
                    <a
                      href={`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(siteUrl + "/api/calendar.ics")}&name=Merry%20Explorers%20Calendar`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between p-3.5 rounded-2xl border-2 border-[#e2e8f0] hover:border-[#0078D4] bg-[#f8fafc] hover:bg-[#f0f8ff] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-xl">
                          📧
                        </div>
                        <div className="text-left">
                          <p className="font-fredoka text-[14px] font-bold text-[#002f76] group-hover:text-[#0078D4]">
                            Outlook / Microsoft 365
                          </p>
                          <p className="text-[11.5px] text-[#64748b]">
                            Adds live subscription feed into Outlook Web
                          </p>
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-[#0078D4] px-2.5 py-1 rounded-lg bg-white border border-[#0078D4]/30 shadow-xs">
                        Connect →
                      </span>
                    </a>
                  </div>

                  {/* Manual Feed URL with 1-click Copy */}
                  <div className="pt-2 border-t border-[#edf2f7] space-y-2">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#64748b]">
                      Or Copy Calendar Feed URL (.ics):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${siteUrl}/api/calendar.ics`}
                        className="flex-1 px-3 py-2 text-[12px] font-mono text-[#1e293b] bg-[#f1f5f9] rounded-xl border border-[#cbd5e1] focus:outline-none select-all"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        type="button"
                        onClick={handleCopyFeed}
                        className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
                          copiedFeed
                            ? "bg-[#16a34a] text-white"
                            : "bg-[#0033a0] hover:bg-[#002f76] text-white active:scale-95"
                        }`}
                      >
                        {copiedFeed ? "Copied! ✨" : "Copy Link"}
                      </button>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] leading-tight">
                      Paste this URL into any calendar app (Google, Apple, Outlook, etc.) that supports URL feeds.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-[#f8fafc] border-t border-[#eef2f8] flex items-center justify-between">
                  <a
                    href={`${siteUrl}/api/calendar.ics`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-bold text-[#0033a0] hover:underline inline-flex items-center gap-1"
                  >
                    <span>📥</span> Download .ics file
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowSubscribeModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-[#1e293b] text-[12px] font-bold transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </m.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
