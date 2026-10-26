"use client";

import { useState } from "react";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import {
  DayAbbr,
  ScheduleTable,
  SCHEDULE_OCT_26_DEFAULT,
  BREAK_SCHEDULE,
  toManilaDateStr,
} from "@/lib/attendance-rules";

type ScheduleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialEffectiveDate?: string;
  currentSchedule?: ScheduleTable;
  currentBreaks?: Record<Exclude<DayAbbr, "Sun">, number>;
};

const WORK_DAYS: Exclude<DayAbbr, "Sun">[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ScheduleModal({
  isOpen,
  onClose,
  onSaved,
  initialEffectiveDate,
  currentSchedule,
  currentBreaks,
}: ScheduleModalProps) {
  const todayStr = toManilaDateStr(new Date());
  const [effectiveDate, setEffectiveDate] = useState(initialEffectiveDate || todayStr);

  const [schedule, setSchedule] = useState<ScheduleTable>(
    currentSchedule || { ...SCHEDULE_OCT_26_DEFAULT }
  );

  const [breaks, setBreaks] = useState<Record<Exclude<DayAbbr, "Sun">, number>>(
    currentBreaks || { ...BREAK_SCHEDULE }
  );

  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick preset fields
  const [bulkStart, setBulkStart] = useState("09:00");
  const [bulkEnd, setBulkEnd] = useState("17:00");
  const [bulkBreak, setBulkBreak] = useState("60");

  if (!isOpen) return null;

  const handleApplyToWeekdays = () => {
    setSchedule((prev) => ({
      ...prev,
      Mon: { start: bulkStart, graceUntil: bulkStart, normalEnd: bulkEnd },
      Tue: { start: bulkStart, graceUntil: bulkStart, normalEnd: bulkEnd },
      Wed: { start: bulkStart, graceUntil: bulkStart, normalEnd: bulkEnd },
      Thu: { start: bulkStart, graceUntil: bulkStart, normalEnd: bulkEnd },
      Fri: { start: bulkStart, graceUntil: bulkStart, normalEnd: bulkEnd },
    }));

    setBreaks((prev) => ({
      ...prev,
      Mon: Number(bulkBreak) || 60,
      Tue: Number(bulkBreak) || 60,
      Wed: Number(bulkBreak) || 60,
      Thu: Number(bulkBreak) || 60,
      Fri: Number(bulkBreak) || 60,
    }));
  };

  const handleDayChange = (
    day: Exclude<DayAbbr, "Sun">,
    field: "start" | "normalEnd",
    value: string
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
        graceUntil: field === "start" ? value : prev[day].graceUntil,
      },
    }));
  };

  const handleBreakChange = (day: Exclude<DayAbbr, "Sun">, value: number) => {
    setBreaks((prev) => ({
      ...prev,
      [day]: Math.max(0, value),
    }));
  };

  const calculateDayStats = (day: Exclude<DayAbbr, "Sun">) => {
    const s = schedule[day];
    const b = breaks[day] ?? 60;
    const [sH, sM] = s.start.split(":").map(Number);
    const [eH, eM] = s.normalEnd.split(":").map(Number);
    const totalSpanMins = Math.max(0, eH * 60 + eM - (sH * 60 + sM));
    const effectiveBreak = totalSpanMins > 240 ? b : 0;
    const workedMins = Math.max(0, totalSpanMins - effectiveBreak);
    const workedHours = workedMins / 60;
    const isWeekend = day === "Sat";
    const offsetOwed = isWeekend ? 0 : Math.max(0, 8 - workedHours);

    return {
      spanHours: (totalSpanMins / 60).toFixed(1),
      breakHours: (effectiveBreak / 60).toFixed(1),
      workedHours: workedHours.toFixed(1),
      offsetOwed: offsetOwed.toFixed(1),
    };
  };

  const handleSave = async () => {
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      const res = await fetch("/api/attendance/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          effectiveFrom: effectiveDate,
          schedule,
          breaks,
          requiredDailyHours: 8,
          note: note || `Shift hours updated effective from ${effectiveDate}`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save schedule");
      }

      setSuccessMsg("Schedule saved successfully! Changes are active from " + effectiveDate);
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => !saving && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-[#e2e8f0] overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f1f5f9] px-6 py-5 bg-gradient-to-r from-[#f8faff] to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 shadow-sm">
              <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
                schedule
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-black text-[#002f76]">
                  Shift &amp; Schedule Settings
                </h2>
                <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-700 border border-purple-200">
                  Admin Controls
                </span>
              </div>
              <p className="text-[12px] font-medium text-[#5a6e8c]">
                Configure standard employee shift hours and breaks dynamically without hardcoding.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#334155] transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              close
            </span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Effective Date Bar */}
          <div className="rounded-2xl border-2 border-brand-sky/30 bg-blue-50/40 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-[#002f76] mb-1">
                  Effective Starting Date
                </label>
                <p className="text-[11.5px] text-[#5a6e8c]">
                  Attendance records <strong>before</strong> this date will strictly retain their historical schedules.
                </p>
              </div>
              <div className="w-[180px]">
                <CustomDatePicker
                  selectedDate={effectiveDate}
                  onChange={(d) => d && setEffectiveDate(d)}
                  triggerClassName="w-full flex items-center justify-between rounded-xl border-2 border-[#cbd5e1] bg-white px-3.5 py-2 text-[12px] font-bold text-[#002f76] hover:bg-[#f8faff] focus:border-[#0050d5]"
                />
              </div>
            </div>
          </div>

          {/* Preset / Bulk Apply Row */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8faff] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#002f76]">
                Quick Set: Weekdays (Mon – Fri)
              </span>
              <span className="text-[11px] text-[#5a6e8c]">
                Fill values and click Apply
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-[#5a6e8c] mb-1">
                  Time In
                </label>
                <input
                  type="time"
                  value={bulkStart}
                  onChange={(e) => setBulkStart(e.target.value)}
                  className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-[12px] font-bold text-[#002f76] outline-none focus:border-[#0050d5]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-[#5a6e8c] mb-1">
                  Time Out
                </label>
                <input
                  type="time"
                  value={bulkEnd}
                  onChange={(e) => setBulkEnd(e.target.value)}
                  className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-[12px] font-bold text-[#002f76] outline-none focus:border-[#0050d5]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-[#5a6e8c] mb-1">
                  Break (Mins)
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={bulkBreak}
                  onChange={(e) => setBulkBreak(e.target.value)}
                  className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-[12px] font-bold text-[#002f76] outline-none focus:border-[#0050d5]"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleApplyToWeekdays}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#0050d5] py-2 px-3 text-[12px] font-bold text-white hover:bg-[#003ea8] shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                    done_all
                  </span>
                  Apply to Mon–Fri
                </button>
              </div>
            </div>
          </div>

          {/* Daily Schedule List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#5a6e8c]">
                Day-by-Day Configuration
              </span>
              <span className="text-[11px] font-medium text-[#94a3b8]">
                24-Hour format (HH:MM)
              </span>
            </div>

            {WORK_DAYS.map((day) => {
              const stats = calculateDayStats(day);
              const isSat = day === "Sat";

              return (
                <div
                  key={day}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                    isSat
                      ? "border-amber-200 bg-amber-50/40"
                      : "border-[#e2e8f0] bg-white hover:border-[#cbd5e1]"
                  }`}
                >
                  {/* Day Badge */}
                  <div className="flex items-center gap-2.5 w-[110px]">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl text-[12px] font-black ${
                        isSat
                          ? "bg-amber-500 text-white"
                          : "bg-[#002f76] text-white"
                      }`}
                    >
                      {day}
                    </span>
                    <span className="text-[13px] font-extrabold text-[#002f76]">
                      {isSat ? "Saturday" : day}
                    </span>
                  </div>

                  {/* Inputs */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#f8faff] rounded-xl border border-[#cbd5e1] px-2 py-1">
                      <span className="text-[10px] font-bold text-[#5a6e8c]">In:</span>
                      <input
                        type="time"
                        value={schedule[day].start}
                        onChange={(e) => handleDayChange(day, "start", e.target.value)}
                        className="bg-transparent text-[12px] font-bold text-[#002f76] outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-[#f8faff] rounded-xl border border-[#cbd5e1] px-2 py-1">
                      <span className="text-[10px] font-bold text-[#5a6e8c]">Out:</span>
                      <input
                        type="time"
                        value={schedule[day].normalEnd}
                        onChange={(e) => handleDayChange(day, "normalEnd", e.target.value)}
                        className="bg-transparent text-[12px] font-bold text-[#002f76] outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-[#f8faff] rounded-xl border border-[#cbd5e1] px-2 py-1">
                      <span className="text-[10px] font-bold text-[#5a6e8c]">Break:</span>
                      <input
                        type="number"
                        min="0"
                        max="180"
                        value={breaks[day] ?? 60}
                        onChange={(e) => handleBreakChange(day, Number(e.target.value))}
                        className="w-12 bg-transparent text-[12px] font-bold text-[#002f76] outline-none text-right"
                      />
                      <span className="text-[10px] text-[#94a3b8]">m</span>
                    </div>
                  </div>

                  {/* Calculations Preview */}
                  <div className="text-right sm:min-w-[160px]">
                    <div className="text-[11.5px] font-black text-[#002f76]">
                      {stats.workedHours}h work{" "}
                      <span className="text-[10px] font-medium text-[#94a3b8]">
                        ({stats.spanHours}h - {stats.breakHours}h brk)
                      </span>
                    </div>
                    {!isSat ? (
                      <div className="text-[10.5px] font-bold text-amber-600">
                        {Number(stats.offsetOwed) > 0
                          ? `+${stats.offsetOwed}h offset for Sat`
                          : "0h offset owed"}
                      </div>
                    ) : (
                      <div className="text-[10.5px] font-bold text-blue-600">
                        Offset Credit Day
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Special Notes & Exceptions Banner */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 text-[11.5px] text-purple-900 leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-purple-600 shrink-0" style={{ fontSize: "18px" }}>
                info
              </span>
              <div>
                <p className="font-extrabold mb-0.5">Special Arrangement Rules:</p>
                <ul className="list-disc list-inside space-y-0.5 text-purple-800">
                  <li>
                    <strong>Ian Angelo Valmores:</strong> Retains his fixed shift (<strong>09:30 AM – 06:30 PM</strong>).
                  </li>
                  <li>
                    <strong>Angel Villegas:</strong> Now follows the standard schedule set here (<strong>09:00 AM – 05:00 PM</strong>) with her cutoff salary proration.
                  </li>
                  <li>
                    <strong>Saturday Alternating Shifts:</strong> Both teachers arrive at <strong>9:00 AM</strong>. The teacher leaving at <strong>12:00 PM</strong> receives <strong>3.0h</strong> offset credit (no break deducted). The teacher staying until <strong>3:00 PM</strong> receives <strong>5.25h</strong> offset credit.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] font-bold text-red-700">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-[12px] font-bold text-green-700">
              {successMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#f1f5f9] bg-[#f8faff] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-[#cbd5e1] bg-white px-5 py-2.5 text-[13px] font-bold text-[#5a6e8c] hover:bg-[#f1f5f9] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#002f76] px-6 py-2.5 text-[13px] font-black text-white hover:bg-[#001d4a] shadow-md transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: "16px" }}>
                  progress_activity
                </span>
                Saving Schedule…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                  save
                </span>
                Save &amp; Activate Schedule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
