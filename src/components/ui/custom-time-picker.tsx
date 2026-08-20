"use client";

import React, { useState, useRef, useEffect } from "react";

type CustomTimePickerProps = {
  value: string; // 24-hour format "HH:mm"
  onChange: (value: string) => void;
};

export function CustomTimePicker({ value, onChange }: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  let initialH = 12;
  let initialM = 0;
  let initialAmPm = "am";

  if (value) {
    const [hStr, mStr] = value.split(":");
    const h24 = parseInt(hStr, 10);
    initialM = parseInt(mStr, 10);
    if (!isNaN(h24) && !isNaN(initialM)) {
      initialAmPm = h24 >= 12 ? "pm" : "am";
      initialH = h24 % 12 || 12;
    }
  }

  const [hour, setHour] = useState(initialH);
  const [minute, setMinute] = useState(initialM);
  const [ampm, setAmPm] = useState(initialAmPm);

  // Sync internal state if external value changes (e.g. pre-filling)
  useEffect(() => {
    if (value) {
      const [hStr, mStr] = value.split(":");
      const h24 = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (!isNaN(h24) && !isNaN(m)) {
        setAmPm(h24 >= 12 ? "pm" : "am");
        setHour(h24 % 12 || 12);
        setMinute(m);
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleApply = (newH: number, newM: number, newAmPm: string) => {
    let h24 = newH;
    if (newAmPm === "pm" && newH !== 12) h24 += 12;
    if (newAmPm === "am" && newH === 12) h24 = 0;
    
    const hStr = String(h24).padStart(2, "0");
    const mStr = String(newM).padStart(2, "0");
    onChange(`${hStr}:${mStr}`);
  };

  const updateHour = (h: number) => {
    setHour(h);
    handleApply(h, minute, ampm);
  };

  const updateMinute = (m: number) => {
    setMinute(m);
    handleApply(hour, m, ampm);
  };

  const updateAmPm = (ap: string) => {
    setAmPm(ap);
    handleApply(hour, minute, ap);
  };

  const displayTime = value 
    ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm}`
    : "--:-- --";

  const hoursList = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutesList = Array.from({ length: 60 }, (_, i) => i);
  const ampmList = ["am", "pm"];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-full border border-[#e2e8f0] bg-white px-4 py-2 text-[14px] font-bold text-[#002f76] outline-none focus:border-[#0050d5] focus:ring-1 focus:ring-[#0050d5] transition-all"
      >
        <span>{displayTime}</span>
        <span className="material-symbols-outlined text-[#5a6e8c]" style={{ fontSize: "16px" }}>schedule</span>
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-[#e2e8f0] flex w-[260px] z-[60] overflow-hidden p-2"
          style={{ 
            // Hide scrollbar globally for this component just to be safe
            msOverflowStyle: 'none', 
            scrollbarWidth: 'none' 
          }}
        >
          <style dangerouslySetInnerHTML={{__html: `
            .hide-scroll::-webkit-scrollbar {
              display: none;
            }
            .hide-scroll {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}} />

          {/* Hours Column */}
          <div className="flex-1 max-h-[200px] overflow-y-auto hide-scroll px-1 space-y-1">
            {hoursList.map(h => {
              const isSelected = h === hour;
              return (
                <button
                  key={`h-${h}`}
                  type="button"
                  onClick={() => updateHour(h)}
                  className={`w-full py-2 text-[14px] font-bold text-center rounded transition-all ${
                    isSelected 
                      ? 'bg-[#0066ff] text-white border-2 border-[#001a4d]' 
                      : 'text-[#002f76] hover:bg-[#f0f5ff] border-2 border-transparent'
                  }`}
                >
                  {String(h).padStart(2, "0")}
                </button>
              );
            })}
          </div>

          {/* Minutes Column */}
          <div className="flex-1 max-h-[200px] overflow-y-auto hide-scroll px-1 space-y-1">
            {minutesList.map(m => {
              const isSelected = m === minute;
              return (
                <button
                  key={`m-${m}`}
                  type="button"
                  onClick={() => updateMinute(m)}
                  className={`w-full py-2 text-[14px] font-bold text-center rounded transition-all ${
                    isSelected 
                      ? 'bg-[#0066ff] text-white border-2 border-[#001a4d]' 
                      : 'text-[#002f76] hover:bg-[#f0f5ff] border-2 border-transparent'
                  }`}
                >
                  {String(m).padStart(2, "0")}
                </button>
              );
            })}
          </div>

          {/* AM/PM Column */}
          <div className="flex-1 max-h-[200px] overflow-y-auto hide-scroll px-1 space-y-1">
            {ampmList.map(ap => {
              const isSelected = ap === ampm;
              return (
                <button
                  key={`ap-${ap}`}
                  type="button"
                  onClick={() => updateAmPm(ap)}
                  className={`w-full py-2 text-[14px] font-bold text-center rounded transition-all ${
                    isSelected 
                      ? 'bg-[#0066ff] text-white border-2 border-[#001a4d]' 
                      : 'text-[#002f76] hover:bg-[#f0f5ff] border-2 border-transparent'
                  }`}
                >
                  {ap}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
