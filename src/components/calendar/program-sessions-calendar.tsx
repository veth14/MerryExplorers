"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ProgramScheduleResult,
  ProgramSessionItem,
  SkippedDateItem,
  formatFriendlyDate,
  PROGRAM_SCHEDULE_CONFIGS,
} from "@/lib/program-sessions";

interface ProgramSessionsCalendarProps {
  schedules?: ProgramScheduleResult[];
  loading?: boolean;
  initialProgramKey?: string;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay(); // 0 = Sun
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ProgramSessionsCalendar({
  schedules: propSchedules,
  loading = false,
  initialProgramKey = "all",
}: ProgramSessionsCalendarProps) {
  const [internalSchedules, setInternalSchedules] = useState<ProgramScheduleResult[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);

  useEffect(() => {
    if (propSchedules && propSchedules.length > 0) return;
    let mounted = true;
    setInternalLoading(true);
    fetch("/api/programs/schedules")
      .then((r) => r.json())
      .then((data) => {
        if (mounted && (data?.success || data?.ok) && Array.isArray(data.schedules)) {
          setInternalSchedules(data.schedules);
        }
      })
      .catch((err) => console.error("Failed to load program schedules:", err))
      .finally(() => {
        if (mounted) setInternalLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [propSchedules]);

  const schedules = propSchedules && propSchedules.length > 0 ? propSchedules : internalSchedules;
  const isCalendarLoading = loading || (schedules.length === 0 && internalLoading);

  const [selectedProgramKey, setSelectedProgramKey] = useState<string>(initialProgramKey);
  const [viewMode, setViewMode] = useState<"grid" | "roadmap">("grid");

  // Manila current date / month
  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }, []);

  const [currentMonth, setCurrentMonth] = useState<string>(() => todayStr.slice(0, 7));

  // Day detail drawer
  const [selectedDayInfo, setSelectedDayInfo] = useState<{
    dateStr: string;
    sessions: ProgramSessionItem[];
    skipped: Array<{ programKey: string; shortName: string; skipped: SkippedDateItem }>;
  } | null>(null);

  // Filtered schedules based on selected program
  const activeSchedules = useMemo(() => {
    if (selectedProgramKey === "all") return schedules;
    return schedules.filter(
      (s) => s.programKey === selectedProgramKey || s.slug === selectedProgramKey
    );
  }, [schedules, selectedProgramKey]);

  // Selected single program (if not "all")
  const singleSelectedProgram = useMemo(() => {
    if (selectedProgramKey === "all") return null;
    return schedules.find(
      (s) => s.programKey === selectedProgramKey || s.slug === selectedProgramKey
    );
  }, [schedules, selectedProgramKey]);

  // Fast lookups by date
  const sessionsByDate = useMemo(() => {
    const map: Record<string, ProgramSessionItem[]> = {};
    for (const sched of activeSchedules) {
      for (const s of sched.sessions) {
        if (!map[s.dateStr]) map[s.dateStr] = [];
        map[s.dateStr].push(s);
      }
    }
    return map;
  }, [activeSchedules]);

  const skippedByDate = useMemo(() => {
    const map: Record<
      string,
      Array<{ programKey: string; shortName: string; skipped: SkippedDateItem }>
    > = {};
    for (const sched of activeSchedules) {
      for (const item of sched.skippedDates) {
        if (!map[item.dateStr]) map[item.dateStr] = [];
        map[item.dateStr].push({
          programKey: sched.programKey,
          shortName: sched.shortName,
          skipped: item,
        });
      }
    }
    return map;
  }, [activeSchedules]);

  // Month navigation
  const [year, month] = currentMonth.split("-").map(Number);
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const goToday = () => {
    setCurrentMonth(todayStr.slice(0, 7));
  };

  // Month grid cells
  const daysCount = daysInMonth(year, month);
  const firstDow = firstDayOfMonth(year, month);
  const cells: (string | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from(
      { length: daysCount },
      (_, i) => `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Jump current month to program start date if clicked
  const handleSelectProgram = (key: string) => {
    setSelectedProgramKey(key);
    if (key !== "all") {
      const p = schedules.find((s) => s.programKey === key || s.slug === key);
      if (p?.startDate) {
        setCurrentMonth(p.startDate.slice(0, 7));
      }
    }
  };

  if (isCalendarLoading) {
    return (
      <div className="flex h-80 items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 shadow-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-[#0033a0]" />
          <p className="text-[12.5px] font-bold text-slate-500">
            Calculating program schedules, sessions &amp; skipped holidays…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* ── Top Navigation & Program Pills ── */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eef4ff] text-[#002f76] text-[11px] font-black uppercase tracking-wider mb-1.5 border border-[#c7d8f0]">
              🗓️ Programs &amp; Adventure Sessions
            </div>
            <h2 className="font-headline text-[20px] font-black text-[#002f76]">
              Program Sessions Calendar
            </h2>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Each program runs on its specific days. Holidays and class suspensions are
              automatically skipped and sessions move forward.
            </p>
          </div>

          {/* View Mode Toggle: Grid vs Roadmap */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1 self-start sm:self-auto border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-black transition-all ${
                viewMode === "grid"
                  ? "bg-white text-[#002f76] shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🗓️</span> Month Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("roadmap")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-black transition-all ${
                viewMode === "roadmap"
                  ? "bg-white text-[#002f76] shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📋</span> Session Roadmap
            </button>
          </div>
        </div>

        {/* Program Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => handleSelectProgram("all")}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[12px] font-black transition-all border ${
              selectedProgramKey === "all"
                ? "bg-[#0033a0] text-white border-[#0033a0] shadow-sm"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span>🎒</span> All Programs ({schedules.length})
          </button>

          {schedules.map((sched) => {
            const isSelected =
              selectedProgramKey === sched.programKey || selectedProgramKey === sched.slug;
            return (
              <button
                key={sched.programKey}
                type="button"
                onClick={() => handleSelectProgram(sched.programKey)}
                className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-[12px] font-black transition-all border ${
                  isSelected
                    ? "text-white shadow-sm"
                    : "hover:bg-slate-100"
                }`}
                style={{
                  backgroundColor: isSelected ? sched.config.color : sched.config.bg,
                  borderColor: isSelected ? sched.config.color : sched.config.border,
                  color: isSelected ? "#ffffff" : sched.config.color,
                }}
              >
                <span>{sched.config.emoji}</span>
                <span>{sched.shortName}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isSelected ? "bg-white/25 text-white" : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  Adv {sched.adventureNumber} · {sched.totalSessions}s
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Single Program Banner (if program selected) ── */}
      {singleSelectedProgram && (
        <div
          className="rounded-3xl border-2 p-5 sm:p-6 shadow-sm overflow-hidden relative"
          style={{
            backgroundColor: singleSelectedProgram.config.bg,
            borderColor: singleSelectedProgram.config.border,
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-xs shrink-0"
                style={{
                  backgroundColor: "#ffffff",
                  border: `2px solid ${singleSelectedProgram.config.border}`,
                }}
              >
                {singleSelectedProgram.config.emoji}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider text-white shadow-xs"
                    style={{ backgroundColor: singleSelectedProgram.config.color }}
                  >
                    Adventure {singleSelectedProgram.adventureNumber}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 bg-white/80 px-2.5 py-0.5 rounded-full border border-slate-200">
                    📅 {singleSelectedProgram.config.scheduleLabel}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 bg-white/80 px-2.5 py-0.5 rounded-full border border-slate-200">
                    🎯 {singleSelectedProgram.totalSessions} Total Sessions
                  </span>
                </div>
                <h3 className="font-headline text-[20px] font-black text-[#002f76]">
                  {singleSelectedProgram.programKey}
                </h3>
                <p className="text-[12.5px] font-semibold text-slate-600">
                  {singleSelectedProgram.hasStartDate ? (
                    <>
                      Starts on{" "}
                      <strong className="text-[#002f76]">
                        {singleSelectedProgram.formattedStartDate}
                      </strong>{" "}
                      &bull; Concludes on{" "}
                      <strong className="text-[#002f76]">
                        {singleSelectedProgram.formattedEndDate}
                      </strong>
                    </>
                  ) : (
                    <span className="text-amber-700">
                      ⚠️ No start date set yet. Set in Programs &amp; Adventure Settings.
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Progress Counters */}
            {singleSelectedProgram.hasStartDate && (
              <div className="flex items-center gap-3 bg-white/90 rounded-2xl p-3 border border-slate-200/80 shrink-0">
                <div className="text-center px-3 border-r border-slate-200">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Completed
                  </p>
                  <p className="text-[18px] font-black text-emerald-600">
                    {singleSelectedProgram.completedSessions}
                  </p>
                </div>
                <div className="text-center px-3 border-r border-slate-200">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Remaining
                  </p>
                  <p className="text-[18px] font-black text-[#0033a0]">
                    {singleSelectedProgram.remainingSessions}
                  </p>
                </div>
                <div className="text-center px-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Total
                  </p>
                  <p className="text-[18px] font-black text-[#002f76]">
                    {singleSelectedProgram.totalSessions}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Skipped dates notice */}
          {singleSelectedProgram.skippedDates.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50/80 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-900 font-black text-[12px]">
                <span>⚠️</span>
                <span>
                  {singleSelectedProgram.skippedDates.length} Meeting Day(s) Skipped (Holidays /
                  Suspensions) &bull; Sessions Automatically Shifted:
                </span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {singleSelectedProgram.skippedDates.map((item, idx) => (
                  <div
                    key={`${item.dateStr}-${idx}`}
                    className="flex items-center gap-2 bg-white/80 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-amber-900 border border-amber-200"
                  >
                    <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 text-[10px] uppercase">
                      {item.type}
                    </span>
                    <span className="font-extrabold">{formatFriendlyDate(item.dateStr)}:</span>
                    <span className="truncate flex-1">{item.reason}</span>
                    <span className="text-[10px] text-amber-700 font-extrabold">
                      (S{item.movedSessionNumber} Moved ➔)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ALL PROGRAMS SUMMARY GRID (if "all" selected) ── */}
      {selectedProgramKey === "all" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {schedules.map((sched) => (
            <div
              key={sched.programKey}
              onClick={() => handleSelectProgram(sched.programKey)}
              className="rounded-3xl border-2 p-4 transition-all hover:shadow-md cursor-pointer flex flex-col justify-between"
              style={{
                backgroundColor: sched.config.bg,
                borderColor: sched.config.border,
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xl">{sched.config.emoji}</span>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black text-white"
                    style={{ backgroundColor: sched.config.color }}
                  >
                    Adventure {sched.adventureNumber}
                  </span>
                </div>
                <div>
                  <h4 className="font-headline text-[15px] font-black text-[#002f76]">
                    {sched.shortName}
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {sched.config.scheduleLabel} &bull; {sched.totalSessions} Sessions
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Start &bull; End</span>
                  <span className="font-bold text-[#002f76]">
                    {sched.hasStartDate ? `${sched.formattedStartDate} ➔ ${sched.formattedEndDate}` : "Not set"}
                  </span>
                </div>
                {sched.skippedDates.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black">
                    {sched.skippedDates.length} skipped
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── View 1: Month Grid View ── */}
      {viewMode === "grid" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          {/* Navigation Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevMonth}
                className="h-9 w-9 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all font-black"
                title="Previous month"
              >
                ‹
              </button>
              <h3 className="font-headline text-[16px] font-black text-[#002f76] min-w-[160px] text-center">
                {monthLabel}
              </h3>
              <button
                type="button"
                onClick={nextMonth}
                className="h-9 w-9 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all font-black"
                title="Next month"
              >
                ›
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToday}
                className="px-3 py-1.5 rounded-xl border-2 border-slate-200 text-[11.5px] font-black text-slate-600 hover:bg-slate-50 transition-all"
              >
                Today
              </button>
            </div>
          </div>

          {/* DOW Header */}
          <div className="grid grid-cols-7 mb-1 text-center">
            {DOW.map((d) => (
              <div
                key={d}
                className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Cells Grid */}
          <div className="grid grid-cols-7 gap-px bg-[#e8edf5] rounded-2xl overflow-hidden border border-[#e8edf5]">
            {cells.map((dateStr, idx) => {
              if (!dateStr) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="bg-[#f8faff] min-h-[90px] sm:min-h-[105px]"
                  />
                );
              }

              const daySessions = sessionsByDate[dateStr] || [];
              const daySkipped = skippedByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const dayNum = parseInt(dateStr.split("-")[2], 10);
              const isSunday = idx % 7 === 0;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() =>
                    setSelectedDayInfo({
                      dateStr,
                      sessions: daySessions,
                      skipped: daySkipped,
                    })
                  }
                  className={`relative min-h-[90px] sm:min-h-[105px] p-1.5 text-left transition-colors group flex flex-col justify-between ${
                    isToday
                      ? "bg-[#eff6ff] hover:bg-[#e0efff]"
                      : isSunday
                        ? "bg-[#fafafa] hover:bg-[#f0f5ff]"
                        : "bg-white hover:bg-[#f8faff]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-black ${
                        isToday
                          ? "bg-[#0033a0] text-white"
                          : isSunday
                            ? "text-[#dc2626]"
                            : "text-[#002f76]"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {daySessions.length > 0 && (
                      <span className="text-[9px] font-black text-slate-400 sm:hidden">
                        {daySessions.length}s
                      </span>
                    )}
                  </div>

                  {/* Badges for sessions on this day */}
                  <div className="flex flex-col gap-1 my-1 overflow-hidden">
                    {/* Skipped notices */}
                    {daySkipped.map((skip, i) => (
                      <div
                        key={`skip-${skip.programKey}-${i}`}
                        className="truncate text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300"
                        title={`Skipped: ${skip.skipped.reason} — Session ${skip.skipped.movedSessionNumber} shifted to next meeting day`}
                      >
                        ⚠️ {skip.shortName}: Skipped ({skip.skipped.reason})
                      </div>
                    ))}

                    {/* Program Sessions - bold, readable badge */}
                    {daySessions.slice(0, 3).map((s, i) => {
                      const cfg = PROGRAM_SCHEDULE_CONFIGS[s.programKey];
                      return (
                        <div
                          key={`${s.programKey}-${s.sessionNumber}-${i}`}
                          className="flex items-center justify-between gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md border shadow-2xs"
                          style={{
                            backgroundColor: cfg ? cfg.bg : "#f0f5ff",
                            color: cfg ? cfg.color : "#0033a0",
                            borderColor: cfg ? cfg.border : "#c7d8f0",
                          }}
                          title={`${s.programKey} (Adv ${s.adventureNumber}) — Session ${s.sessionNumber} of ${s.totalSessions}`}
                        >
                          <div className="flex items-center gap-1 min-w-0 truncate">
                            <span className="text-[10px] shrink-0">{cfg?.emoji || "🎒"}</span>
                            <span className="font-black truncate text-[9.5px]">{cfg?.shortName || s.programShortName}</span>
                          </div>
                          <span
                            className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-black bg-white/95 border shadow-2xs"
                            style={{ borderColor: cfg ? cfg.border : "#cbd5e1" }}
                          >
                            <span className="text-[7.5px] font-extrabold uppercase opacity-60">S</span>
                            <span
                              className="text-[11px] sm:text-[12px] font-black leading-none"
                              style={{ color: cfg ? cfg.color : "#0033a0" }}
                            >
                              {s.sessionNumber}
                            </span>
                            <span className="text-[8px] font-bold text-slate-400">/{s.totalSessions}</span>
                          </span>
                        </div>
                      );
                    })}

                    {daySessions.length > 3 && (
                      <div className="text-[9px] font-black text-[#5a6e8c] px-1">
                        +{daySessions.length - 3} more
                      </div>
                    )}
                  </div>

                  <div className="h-1" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── View 2: Session Roadmap / Sequential List ── */}
      {viewMode === "roadmap" && (
        <div className="space-y-6">
          {activeSchedules.map((sched) => (
            <div
              key={sched.programKey}
              className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-2xs shrink-0"
                    style={{ backgroundColor: sched.config.bg, border: `1.5px solid ${sched.config.border}` }}
                  >
                    {sched.config.emoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline text-[16px] font-black text-[#002f76]">
                        {sched.programKey}
                      </h3>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                        style={{ backgroundColor: sched.config.color }}
                      >
                        Adventure {sched.adventureNumber}
                      </span>
                    </div>
                    <p className="text-[11.5px] font-semibold text-slate-500">
                      {sched.config.scheduleLabel} &bull; {sched.totalSessions} Sessions
                      {sched.hasStartDate && (
                        <>
                          {" "}&bull; Start: <strong>{sched.formattedStartDate}</strong> ➔ End:{" "}
                          <strong>{sched.formattedEndDate}</strong>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[11.5px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    {sched.completedSessions} / {sched.totalSessions} completed
                  </span>
                </div>
              </div>

              {/* Sessions Grid */}
              {!sched.hasStartDate ? (
                <p className="text-[12.5px] text-amber-700 font-bold p-4 bg-amber-50 rounded-2xl border border-amber-200">
                  ⚠️ No start date set for this program yet. Set it in Programs &amp; Adventure Settings.
                </p>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {sched.sessions.map((session) => (
                    <div
                      key={`${sched.programKey}-s${session.sessionNumber}`}
                      className={`rounded-2xl border-2 p-3.5 space-y-1.5 transition-all ${
                        session.isToday
                          ? "border-[#0050d5] bg-[#eef4ff] ring-2 ring-[#0050d5]/15 shadow-sm"
                          : session.isCompleted
                            ? "border-emerald-200 bg-emerald-50/40"
                            : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-black text-white"
                          style={{ backgroundColor: sched.config.color }}
                        >
                          Adv {session.adventureNumber} &bull; S{session.sessionNumber} of {session.totalSessions}
                        </span>
                        <span
                          className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            session.isToday
                              ? "bg-blue-600 text-white animate-pulse"
                              : session.isCompleted
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {session.isToday ? "Today!" : session.isCompleted ? "Completed" : "Upcoming"}
                        </span>
                      </div>

                      <div>
                        <p className="font-headline text-[13px] font-black text-[#002f76]">
                          Session {session.sessionNumber}
                        </p>
                        <p className="text-[11.5px] font-bold text-slate-600">
                          {session.formattedDate}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Day Detail Drawer / Modal ── */}
      {selectedDayInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setSelectedDayInfo(null)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Day Schedule Breakdown
                </p>
                <h3 className="font-headline text-[18px] font-black text-[#002f76]">
                  {formatFriendlyDate(selectedDayInfo.dateStr)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayInfo(null)}
                className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-black"
              >
                ✕
              </button>
            </div>

            {/* Skipped notices */}
            {selectedDayInfo.skipped.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                  ⚠️ Holidays &amp; Suspensions:
                </p>
                {selectedDayInfo.skipped.map((skip, i) => (
                  <div
                    key={`skip-detail-${i}`}
                    className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-[12px] font-bold text-amber-900"
                  >
                    <p className="font-black">
                      {skip.shortName}: {skip.skipped.reason} ({skip.skipped.type.toUpperCase()})
                    </p>
                    <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                      Session {skip.skipped.movedSessionNumber} was automatically moved forward to the
                      next regular class meeting day.
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Sessions on this day */}
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#002f76]">
                Sessions scheduled on this day ({selectedDayInfo.sessions.length}):
              </p>
              {selectedDayInfo.sessions.length === 0 ? (
                <p className="text-[12px] text-slate-400 p-4 rounded-2xl border border-dashed border-slate-200 text-center">
                  No program sessions scheduled on this date.
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {selectedDayInfo.sessions.map((s, i) => {
                    const cfg = PROGRAM_SCHEDULE_CONFIGS[s.programKey];
                    return (
                      <div
                        key={`modal-s-${i}`}
                        className="rounded-2xl border-2 p-3.5 space-y-1"
                        style={{
                          backgroundColor: cfg?.bg || "#f8faff",
                          borderColor: cfg?.border || "#c7d8f0",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                            style={{ backgroundColor: cfg?.color || "#0033a0" }}
                          >
                            Adventure {s.adventureNumber}
                          </span>
                          <span className="text-[11px] font-extrabold text-slate-600">
                            Session {s.sessionNumber} of {s.totalSessions}
                          </span>
                        </div>
                        <h4 className="font-headline text-[14px] font-black text-[#002f76]">
                          {cfg?.emoji} {s.programKey}
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-600">
                          {cfg?.scheduleLabel} &bull; {s.status.toUpperCase()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedDayInfo(null)}
              className="w-full rounded-2xl border border-slate-200 py-2.5 text-[12.5px] font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
