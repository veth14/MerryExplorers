"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export function CustomDatePicker({
  selectedDate,
  onChange,
  triggerClassName,
}: {
  selectedDate: string;
  onChange: (date: string) => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      const parsed = new Date(selectedDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  // Detect mobile on mount and resize
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
    // Lock body scroll when open on mobile
    if (open && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, isMobile]);

  useEffect(() => {
    function handleScroll(e: Event) {
      if (isMobile) return; // Don't close on mobile (it's a bottom sheet)
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
      // Clamp left so the 280px picker doesn't overflow the viewport
      const pickerWidth = 288;
      const maxLeft = window.innerWidth - pickerWidth - 12;
      setCoords({
        top: rect.bottom + 8,
        left: Math.min(rect.left, maxLeft < 0 ? 8 : maxLeft),
        width: rect.width,
      });
    }
    setOpen(!open);
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelect = (day: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    setOpen(false);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Display value
  let displayValue = "dd/mm/yyyy";
  if (selectedDate) {
    if (selectedDate.includes("-")) {
      const parts = selectedDate.split("-");
      if (parts.length === 3) {
        displayValue = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        displayValue = selectedDate;
      }
    } else {
      const parsed = new Date(selectedDate);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, "0");
        const d = String(parsed.getDate()).padStart(2, "0");
        displayValue = `${d}/${m}/${y}`;
      } else {
        displayValue = selectedDate;
      }
    }
  }

  // The calendar panel (shared between mobile bottom-sheet and desktop dropdown)
  const calendarPanel = (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-[14px] font-extrabold text-brand-navy">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <div className="flex gap-1">
          <button onClick={handlePrevMonth} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-sky/60 text-brand-blue transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>chevron_left</span>
          </button>
          <button onClick={handleNextMonth} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-sky/60 text-brand-blue transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>chevron_right</span>
          </button>
        </div>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 mb-3">
        {daysOfWeek.map((d) => (
          <div key={d} className="text-center text-[11px] font-extrabold text-[#94a3b8]">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-y-1.5 gap-x-1">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const ddStr = String(d.getDate()).padStart(2, "0");
          const dateStr = `${yyyy}-${mm}-${ddStr}`;
          const isSelected = selectedDate === dateStr;
          const now = new Date();
          const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

          return (
            <button
              key={day}
              onClick={() => handleSelect(day)}
              className={`h-9 w-full rounded-full flex items-center justify-center text-[13px] font-bold transition-all
                ${isSelected ? "bg-[#0033A0] text-white shadow-md scale-105" : ""}
                ${!isSelected && isToday ? "bg-[#FFB800] text-white shadow-sm" : ""}
                ${!isSelected && !isToday ? "text-[#334155] hover:bg-brand-sky/60" : ""}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => { setOpen(false); onChange(""); }}
          className="flex-1 py-2 rounded-xl border border-[#d0d8e8] text-[12px] font-bold text-[#5a6e8c] hover:bg-[#f0f4f9] transition-colors"
        >
          Clear
        </button>
        <button
          onClick={() => {
            const t = new Date();
            const y = t.getFullYear();
            const m = String(t.getMonth() + 1).padStart(2, "0");
            const d = String(t.getDate()).padStart(2, "0");
            onChange(`${y}-${m}-${d}`);
            setOpen(false);
          }}
          className="flex-1 py-2 rounded-xl bg-brand-sky/50 border border-brand-sky text-[12px] font-bold text-brand-navy hover:bg-brand-sky transition-colors"
        >
          Today
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggleOpen}
        className={triggerClassName || `flex items-center justify-between gap-2.5 rounded-full border px-4 py-2 text-[12px] font-bold transition-all duration-200 whitespace-nowrap ${
          open || selectedDate
            ? "border-brand-blue/40 bg-brand-sky text-brand-blue shadow-sm"
            : "border-brand-sky bg-brand-sky/40 text-brand-navy hover:bg-brand-sky"
        }`}
      >
        {displayValue}
        <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "16px" }}>
          calendar_month
        </span>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        isMobile ? (
          // ── Mobile: centered bottom sheet ──────────────────────────────────
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[99998] bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            {/* Sheet */}
            <div
              ref={portalRef}
              className="fixed bottom-0 left-0 right-0 z-[99999] bg-white rounded-t-3xl shadow-2xl border-t-2 border-brand-sky"
              style={{ maxHeight: "85vh", overflowY: "auto" }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-[#d0d8e8]" />
              </div>
              <p className="text-center text-[13px] font-black text-brand-navy uppercase tracking-widest pb-1">
                Select Date
              </p>
              {calendarPanel}
              {/* Safe area for iOS home indicator */}
              <div className="h-4" />
            </div>
          </>
        ) : (
          // ── Desktop: fixed dropdown ─────────────────────────────────────────
          <div
            ref={portalRef}
            style={{ position: "fixed", top: coords.top, left: coords.left }}
            className="z-[99999] w-[288px] rounded-3xl bg-white border-2 border-brand-sky shadow-[0_20px_60px_-15px_rgba(0,51,160,0.15)] origin-top animate-in fade-in zoom-in-95 duration-200"
          >
            {calendarPanel}
          </div>
        ),
        document.body
      )}
    </div>
  );
}
