"use client";

import { useState, useRef, useEffect } from "react";

export function CustomDatePicker({
  selectedDate,
  onChange,
}: {
  selectedDate: string;
  onChange: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Default to today or selected date
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) return new Date(selectedDate);
    return new Date();
  });
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    const [y, m, d] = selectedDate.split("-");
    displayValue = `${d}/${m}/${y}`;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2.5 rounded-full border px-4 py-2 text-[12px] font-bold transition-all duration-200 whitespace-nowrap ${
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

      {open && (
        <div className="absolute top-[calc(100%+8px)] left-0 z-50 w-[280px] rounded-3xl bg-white border-2 border-brand-sky shadow-[0_20px_60px_-15px_rgba(0,51,160,0.15)] p-5 overflow-hidden origin-top animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-[14px] font-extrabold text-brand-navy">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <div className="flex gap-1">
              <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-sky/60 text-brand-blue transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>chevron_left</span>
              </button>
              <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-sky/60 text-brand-blue transition-colors">
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
              
              // Check if today
              const today = new Date();
              const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => handleSelect(day)}
                  className={`h-8 w-full rounded-full flex items-center justify-center text-[12px] font-bold transition-all
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
          <div className="mt-5 pt-3 border-t-2 border-brand-sky/40 flex justify-between">
            <button 
              onClick={() => { onChange(""); setOpen(false); }}
              className="text-[12px] font-bold text-[#64748b] hover:text-[#0f172a] transition-colors"
            >
              Clear
            </button>
            <button 
              onClick={() => {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, "0");
                const dd = String(today.getDate()).padStart(2, "0");
                onChange(`${yyyy}-${mm}-${dd}`);
                setOpen(false);
              }}
              className="text-[12px] font-bold text-[#0033A0] hover:text-[#002080] transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
