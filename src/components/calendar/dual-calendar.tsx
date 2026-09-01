"use client";

import { useState } from "react";

type SuspendedDay = {
  dateStr: string;
  type: "suspension" | "holiday";
  reason?: string;
};

interface DualMonthCalendarProps {
  suspendedDays: SuspendedDay[];
  onDateClick?: (dateStr: string, existingRecord: SuspendedDay | undefined) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DualMonthCalendar({ suspendedDays, onDateClick }: DualMonthCalendarProps) {
  // Start with current month
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Set to 1st of month to avoid overflow issues when adding months
    return d;
  });

  const nextMonthDate = new Date(currentDate);
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

  const suspendedMap = new Map<string, SuspendedDay>();
  for (const day of suspendedDays) {
    suspendedMap.set(day.dateStr, day);
  }

  const handlePrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const renderMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Get first day of month (0 = Sun, 1 = Mon...)
    const firstDay = new Date(year, month, 1).getDay();
    // Get number of days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Empty padding for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 rounded-xl bg-transparent" />);
    }

    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
      const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const susp = suspendedMap.get(dStr);
      const isWeekend = new Date(year, month, i).getDay() === 0 || new Date(year, month, i).getDay() === 6;

      let bgClass = "bg-white hover:bg-slate-50 border-[#e2e8f0]";
      let textClass = "text-[#002f76]";
      let badge = null;

      if (susp) {
        if (susp.type === "holiday") {
          bgClass = "bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-300";
          textClass = "text-amber-900";
          badge = (
            <div className="mt-1 flex flex-col gap-1">
              <span className="inline-flex items-center gap-1 rounded bg-amber-200/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                <span className="material-symbols-outlined text-[12px]">celebration</span>
                Holiday
              </span>
              {susp.reason && (
                <span className="text-[10px] font-semibold text-amber-700 leading-tight line-clamp-2">
                  {susp.reason}
                </span>
              )}
            </div>
          );
        } else {
          bgClass = "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300";
          textClass = "text-orange-900";
          badge = (
            <div className="mt-1 flex flex-col gap-1">
              <span className="inline-flex items-center gap-1 rounded bg-orange-200/60 px-1.5 py-0.5 text-[10px] font-bold text-orange-800">
                <span className="material-symbols-outlined text-[12px]">block</span>
                Suspended
              </span>
              {susp.reason && (
                <span className="text-[10px] font-semibold text-orange-700 leading-tight line-clamp-2">
                  {susp.reason}
                </span>
              )}
            </div>
          );
        }
      } else if (isWeekend) {
        bgClass = "bg-slate-50 border-slate-100";
        textClass = "text-slate-400";
      }

      const isHoliday = susp?.type === "holiday";
      const isClickable = !!onDateClick && !isHoliday;

      days.push(
        <div 
          key={dStr} 
          onClick={isClickable ? () => onDateClick(dStr, susp) : undefined}
          className={`h-24 rounded-xl border p-2 flex flex-col transition-colors ${isClickable ? "cursor-pointer" : ""} ${bgClass}`}
        >
          <span className={`text-[13px] font-black ${textClass}`}>{i}</span>
          {badge}
        </div>
      );
    }

    return (
      <div className="flex-1 min-w-[300px]">
        <h3 className="text-[18px] font-black text-[#002f76] mb-4 text-center">
          {MONTH_NAMES[month]} {year}
        </h3>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c]">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-lg border-2 border-brand-sky p-6 xl:p-8">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={handlePrev}
          className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-[#e2e8f0] text-[#002f76] hover:bg-[#f8faff] hover:border-[#0050d5] transition-all"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-300"></span>
            <span className="text-[12px] font-bold text-[#5a6e8c]">Public Holiday</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-300"></span>
            <span className="text-[12px] font-bold text-[#5a6e8c]">Suspension</span>
          </div>
        </div>
        <button
          onClick={handleNext}
          className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-[#e2e8f0] text-[#002f76] hover:bg-[#f8faff] hover:border-[#0050d5] transition-all"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      <div className="flex flex-col gap-8 xl:gap-12">
        {renderMonth(currentDate)}
      </div>
    </div>
  );
}
