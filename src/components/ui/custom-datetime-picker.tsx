"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export function CustomDateTimePicker({
  selectedDateTime,
  onChange,
  triggerClassName,
  placeholder = "dd/mm/yyyy --:-- --",
}: {
  selectedDateTime: string;
  onChange: (dateTime: string) => void;
  triggerClassName?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Parse initial state or use current time
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDateTime) {
      const parsed = new Date(selectedDateTime);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    if (selectedDateTime) {
      const parsed = new Date(selectedDateTime);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, "0");
        const d = String(parsed.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
    }
    return "";
  });

  const [hour, setHour] = useState<string>(() => {
    if (selectedDateTime) {
      const parsed = new Date(selectedDateTime);
      if (!isNaN(parsed.getTime())) {
        let h = parsed.getHours();
        h = h % 12 || 12;
        return String(h).padStart(2, "0");
      }
    }
    return "12";
  });

  const [minute, setMinute] = useState<string>(() => {
    if (selectedDateTime) {
      const parsed = new Date(selectedDateTime);
      if (!isNaN(parsed.getTime())) {
        return String(parsed.getMinutes()).padStart(2, "0");
      }
    }
    return "00";
  });

  const [period, setPeriod] = useState<"am" | "pm">(() => {
    if (selectedDateTime) {
      const parsed = new Date(selectedDateTime);
      if (!isNaN(parsed.getTime())) {
        return parsed.getHours() >= 12 ? "pm" : "am";
      }
    }
    return "am";
  });

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  // Auto-scroll time lists to selected values when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (hourRef.current) {
          const selected = hourRef.current.querySelector('[data-selected="true"]');
          if (selected) selected.scrollIntoView({ block: "center", behavior: "instant" });
        }
        if (minuteRef.current) {
          const selected = minuteRef.current.querySelector('[data-selected="true"]');
          if (selected) selected.scrollIntoView({ block: "center", behavior: "instant" });
        }
      }, 0); // next tick after render
    }
  }, [open]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, isAbove: false });

  // Update external onChange whenever parts change, ONLY if a date is selected.
  // We don't want to fire onChange with today's date if they only clicked to open it and didn't select a date.
  // Wait, actually, let's keep it simple: apply changes immediately.
  const handleApply = (dStr: string, h: string, m: string, p: "am" | "pm") => {
    if (!dStr) return; // Don't output until a date is picked
    const [y, mo, d] = dStr.split("-");
    let hourNum = parseInt(h, 10);
    if (p === "pm" && hourNum < 12) hourNum += 12;
    if (p === "am" && hourNum === 12) hourNum = 0;

    // Construct local ISO string (YYYY-MM-DDTHH:mm) which datetime-local uses
    const dt = `${y}-${mo}-${d}T${String(hourNum).padStart(2, "0")}:${m}`;
    onChange(dt);
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        (!portalRef.current || !portalRef.current.contains(target))
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, isMobile]);

  useEffect(() => {
    function handleScroll(e: Event) {
      if (isMobile) return;
      if (portalRef.current && portalRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    if (open) {
      window.addEventListener("scroll", handleScroll, true);
    }
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [open, isMobile]);

  const handleToggleOpen = () => {
    if (!open && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const pickerWidth = isMobile ? window.innerWidth : 420;
      const maxLeft = window.innerWidth - pickerWidth - 12;
      
      const spaceBelow = window.innerHeight - rect.bottom;
      const pickerHeightEstimate = 320;
      const projectAbove = spaceBelow < pickerHeightEstimate && rect.top > pickerHeightEstimate;

      setCoords({
        top: projectAbove ? rect.top - 8 : rect.bottom + 8,
        left: Math.min(rect.left, maxLeft < 0 ? 8 : maxLeft),
        width: rect.width,
        isAbove: projectAbove,
      });
    }
    setOpen(!open);
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handleSelectDate = (day: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const str = `${yyyy}-${mm}-${dd}`;
    setSelectedDateStr(str);
    handleApply(str, hour, minute, period);
  };

  const handleChangeTime = (type: "hour" | "minute" | "period", val: string) => {
    let newH = hour;
    let newM = minute;
    let newP = period;
    if (type === "hour") { setHour(val); newH = val; }
    if (type === "minute") { setMinute(val); newM = val; }
    if (type === "period") { setPeriod(val as "am" | "pm"); newP = val as "am" | "pm"; }

    // Only apply if a date is already selected
    if (selectedDateStr) {
      handleApply(selectedDateStr, newH, newM, newP);
    }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Display value formatting
  let displayValue = placeholder;
  if (selectedDateTime) {
    const parsed = new Date(selectedDateTime);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const mo = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      let h = parsed.getHours();
      const p = h >= 12 ? "pm" : "am";
      h = h % 12 || 12;
      const hStr = String(h).padStart(2, "0");
      const mStr = String(parsed.getMinutes()).padStart(2, "0");
      displayValue = `${mo}/${d}/${y} ${hStr}:${mStr} ${p}`;
    }
  }

  const hoursList = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

  const calendarPanel = (
    <div className="flex flex-col sm:flex-row bg-white overflow-hidden rounded-3xl sm:rounded-[24px] w-full sm:w-max">
      {/* Date Section */}
      <div className="p-5 sm:w-[288px] sm:border-r border-[#e2e8f0] shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-1">
            <select
              value={currentMonth.getMonth()}
              onChange={(e) => setCurrentMonth(new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1))}
              className="text-[14px] font-extrabold text-[#002f76] bg-transparent outline-none cursor-pointer hover:bg-[#f0f5ff] rounded px-1 -ml-1 appearance-none"
            >
              {monthNames.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={currentMonth.getFullYear()}
              onChange={(e) => setCurrentMonth(new Date(parseInt(e.target.value), currentMonth.getMonth(), 1))}
              className="text-[14px] font-extrabold text-[#002f76] bg-transparent outline-none cursor-pointer hover:bg-[#f0f5ff] rounded px-1 appearance-none"
            >
              {Array.from({ length: 130 }, (_, i) => 1920 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-sky/60 text-brand-blue transition-colors">
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-sky/60 text-brand-blue transition-colors">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-3">
          {daysOfWeek.map((d) => (
            <div key={d} className="text-center text-[11px] font-extrabold text-[#94a3b8]">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1.5 gap-x-1">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const isSelected = selectedDateStr === dateStr;
            const now = new Date();
            const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleSelectDate(day)}
                className={`h-9 w-full rounded-full flex items-center justify-center text-[13px] font-bold transition-all
                  ${isSelected ? "bg-[#0050d5] text-white shadow-md scale-105" : ""}
                  ${!isSelected && isToday ? "bg-[#FFB800] text-white shadow-sm" : ""}
                  ${!isSelected && !isToday ? "text-[#334155] hover:bg-brand-sky/60" : ""}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedDateStr("");
              onChange(""); // Clear external value
            }}
            className="flex-1 py-2 rounded-xl border border-[#d0d8e8] text-[12px] font-bold text-[#5a6e8c] hover:bg-[#f0f4f9] transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              const t = new Date();
              const str = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
              setSelectedDateStr(str);
              handleApply(str, hour, minute, period);
            }}
            className="flex-1 py-2 rounded-xl bg-brand-sky/50 border border-brand-sky text-[12px] font-bold text-brand-navy hover:bg-brand-sky transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Time Section */}
      <div className="p-5 flex gap-2 h-[250px] sm:h-[350px] overflow-hidden bg-[#f8faff] sm:bg-white border-t sm:border-t-0 border-l-0 sm:border-l border-[#e2e8f0]">
        {/* Hours */}
        <div ref={hourRef} className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 min-w-[56px] items-center mask-image-y" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`.mask-image-y::-webkit-scrollbar { display: none; }`}</style>
          {hoursList.map(h => (
            <button
              key={h}
              type="button"
              data-selected={hour === h}
              onClick={() => handleChangeTime("hour", h)}
              className={`w-full py-2.5 rounded-lg text-[14px] font-black transition-colors shrink-0 ${hour === h ? "bg-[#0050d5] text-white shadow-md" : "text-[#5a6e8c] hover:bg-[#e2e8f0]"
                }`}
            >
              {h}
            </button>
          ))}
        </div>
        {/* Minutes */}
        <div ref={minuteRef} className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 min-w-[56px] items-center mask-image-y" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {minutesList.map(m => (
            <button
              key={m}
              type="button"
              data-selected={minute === m}
              onClick={() => handleChangeTime("minute", m)}
              className={`w-full py-2.5 rounded-lg text-[14px] font-black transition-colors shrink-0 ${minute === m ? "bg-[#0050d5] text-white shadow-md" : "text-[#5a6e8c] hover:bg-[#e2e8f0]"
                }`}
            >
              {m}
            </button>
          ))}
        </div>
        {/* AM/PM */}
        <div ref={periodRef} className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 min-w-[56px] items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {["am", "pm"].map(p => (
            <button
              key={p}
              type="button"
              data-selected={period === p}
              onClick={() => handleChangeTime("period", p)}
              className={`w-full py-2.5 rounded-lg text-[14px] font-black transition-colors uppercase tracking-wider shrink-0 ${period === p ? "bg-[#0050d5] text-white shadow-md" : "text-[#5a6e8c] hover:bg-[#e2e8f0]"
                }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggleOpen}
        className={triggerClassName || `flex items-center justify-between gap-2.5 w-full rounded-xl border px-4 py-2.5 text-[13.5px] font-semibold transition-all duration-200 whitespace-nowrap ${open || selectedDateTime
            ? "border-[#0050d5] ring-2 ring-[#0050d5]/15 bg-white text-[#002f76]"
            : "border-[#d0d8e8] bg-[#f8faff] text-[#002f76] hover:border-[#0050d5]"
          }`}
      >
        <span>{displayValue}</span>
        <span className="material-symbols-outlined text-[#9aa3b2]" style={{ fontSize: "18px" }}>
          calendar_month
        </span>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        isMobile ? (
          <>
            <div
              className="fixed inset-0 z-[99998] bg-black/40 backdrop-blur-sm transition-opacity"
              onClick={() => setOpen(false)}
            />
            <div
              ref={portalRef}
              className="fixed bottom-0 left-0 right-0 z-[99999] bg-white rounded-t-[24px] shadow-2xl border-t-2 border-[#e2e8f0] animate-in slide-in-from-bottom-full duration-300"
              style={{ maxHeight: "85vh", overflowY: "auto" }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-[#d0d8e8]" />
              </div>
              <div className="flex items-center justify-between px-5 pb-3 pt-2 border-b border-[#e2e8f0]">
                <p className="text-[14px] font-black text-[#002f76] uppercase tracking-widest">
                  Select Date & Time
                </p>
                <button type="button" onClick={() => setOpen(false)} className="text-[#005cc8] font-bold text-[13px]">Done</button>
              </div>
              {calendarPanel}
              <div className="h-6 bg-[#f8faff]" />
            </div>
          </>
        ) : (
          <div
            ref={portalRef}
            style={{ position: "fixed", top: coords.top, left: coords.left }}
            className={`z-[99999] rounded-[24px] bg-white border-2 border-[#e2e8f0] shadow-[0_20px_60px_-15px_rgba(0,51,160,0.15)] animate-in fade-in zoom-in-95 duration-200 w-max ${
              coords.isAbove ? "origin-bottom -translate-y-full" : "origin-top"
            }`}
          >
            {calendarPanel}
          </div>
        ),
        document.body
      )}
    </div>
  );
}
