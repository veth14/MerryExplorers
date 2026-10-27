"use client";

import { useState, useRef, useEffect } from "react";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";

const roleOptions = ["All Staff", "Lead", "Teachers", "Assistant"] as const;

export function ReportsFilterBar({
  selectedRole,
  setSelectedRole,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onGenerate,
  onExport,
}: {
  selectedRole: string;
  setSelectedRole: (role: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  onGenerate: () => void;
  onExport: () => void;
}) {
  const [roleOpen, setRoleOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRoleOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <section className="overflow-visible rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-[#f8faff] via-white to-white px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0050d5]">
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </span>
          <div>
            <h2 className="text-[14px] font-extrabold text-[#002f76]">Build an attendance report</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Choose a date range and staff group, then generate the summary.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#31547f]">
          <span className="material-symbols-outlined text-[14px]">summarize</span>
          Attendance summary
        </span>
      </div>

      <div className="grid grid-cols-1 items-end gap-4 p-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(160px,0.8fr)_auto] sm:p-6">
        <div>
          <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">From</label>
          <CustomDatePicker
            selectedDate={startDate}
            onChange={setStartDate}
            triggerClassName="h-[44px] w-full rounded-xl border px-3.5 text-[12px] font-bold"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">To</label>
          <CustomDatePicker
            selectedDate={endDate}
            onChange={setEndDate}
            triggerClassName="h-[44px] w-full rounded-xl border px-3.5 text-[12px] font-bold"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Staff group</label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              aria-expanded={roleOpen}
              onClick={() => setRoleOpen(!roleOpen)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3.5 py-[11px] text-[12px] font-bold transition-colors ${roleOpen ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-200"}`}
            >
              <span className="truncate text-[#002f76]">{selectedRole}</span>
              <span className={`material-symbols-outlined text-[17px] text-slate-400 transition-transform ${roleOpen ? "rotate-180" : ""}`}>expand_more</span>
            </button>

            {roleOpen && (
              <div className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                {roleOptions.map((role) => (
                  <button
                    type="button"
                    key={role}
                    onClick={() => { setSelectedRole(role); setRoleOpen(false); }}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[12px] font-bold transition-colors ${selectedRole === role ? "bg-blue-50 text-[#0033A0]" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    {role}
                    {selectedRole === role && <span className="material-symbols-outlined text-[15px]">check</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end">
          <button
            type="button"
            onClick={onExport}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-bold text-[#31547f] transition-colors hover:bg-slate-50 sm:flex-none"
          >
            <span className="material-symbols-outlined text-[17px] text-emerald-600">download</span>
            Export CSV
          </button>
          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-5 py-2.5 text-[12px] font-extrabold text-white shadow-sm transition-all hover:bg-[#002f76] hover:shadow-md sm:flex-none"
          >
            <span className="material-symbols-outlined text-[17px]">autorenew</span>
            Generate report
          </button>
        </div>
      </div>
    </section>
  );
}
