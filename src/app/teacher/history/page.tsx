"use client";

import { useState } from "react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import { historyMetrics, shiftHistory } from "@/data/teacher-dashboard";
import type { ShiftStatus } from "@/data/teacher-dashboard";

const statusStyle: Record<ShiftStatus, string> = {
  Completed: "bg-[#e8f9f0] text-[#2da05b]",
  "In Progress": "bg-[#e8f0fe] text-[#005cc8]",
  Absent: "bg-[#fff0f0] text-[#ef4444]",
  "On Leave": "bg-[#f0f4f9] text-[#9aa3b2]",
};

export default function TeacherHistoryPage() {
  const [weekFilter, setWeekFilter] = useState<"this-week" | "last-week">("this-week");

  return (
    <TeacherShell
      title="Shift History"
      description="View your past timesheets and worked hours."
    >
      <div className="flex flex-col gap-6 w-full">
        {/* Section header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-[3px] bg-[#ffb800]" />
          <h1 className="text-[14px] font-black uppercase tracking-[0.1em] text-[#002f76]">
            Weekly Overview
          </h1>
        </div>

        {/* Metric cards */}
        <section className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
          {historyMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[1.25rem] bg-white border border-[#e8effe] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-[#5a6e8c] mb-2">
                {metric.label}
              </p>
              <p className="font-headline text-[28px] font-extrabold leading-none text-[#002f76]">
                {metric.value}
              </p>
            </div>
          ))}
        </section>

        {/* Shift table section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-[3px] bg-[#ffb800]" />
              <h2 className="text-[14px] font-black uppercase tracking-[0.1em] text-[#002f76]">
                Shift Log
              </h2>
            </div>

            {/* Week filter tabs */}
            <div className="inline-flex rounded-full border border-[#e2e8f0] bg-[#f0f4f9] p-1">
              <button
                onClick={() => setWeekFilter("this-week")}
                className={`rounded-full px-4 py-1.5 text-[12px] font-bold transition-all ${
                  weekFilter === "this-week"
                    ? "bg-white text-[#002f76] shadow-sm"
                    : "text-[#5a6e8c] hover:text-[#002f76]"
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setWeekFilter("last-week")}
                className={`rounded-full px-4 py-1.5 text-[12px] font-bold transition-all ${
                  weekFilter === "last-week"
                    ? "bg-white text-[#002f76] shadow-sm"
                    : "text-[#5a6e8c] hover:text-[#002f76]"
                }`}
              >
                Last Week
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-[1.25rem] border border-[#e8effe] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-[#e8effe] bg-[#f8fafd]">
                    <th className="px-6 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-[#5a6e8c]">
                      Date
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-[#5a6e8c]">
                      Clock In
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-[#5a6e8c]">
                      Clock Out
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-[#5a6e8c]">
                      Break
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-[#5a6e8c]">
                      Total Hours
                    </th>
                    <th className="px-6 py-3.5 text-right text-[11px] font-black uppercase tracking-wider text-[#5a6e8c]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shiftHistory.map((shift) => (
                    <tr
                      key={shift.id}
                      className="border-b border-[#f0f4f9] last:border-b-0 transition-colors hover:bg-[#f8fafd]"
                    >
                      <td className="px-6 py-4 text-[13px] font-bold text-[#002f76]">
                        {shift.date}
                      </td>
                      <td className="px-6 py-4 text-[13px] font-medium text-[#1f2a44]">
                        {shift.clockIn}
                      </td>
                      <td className="px-6 py-4 text-[13px] font-medium text-[#1f2a44]">
                        {shift.clockOut}
                      </td>
                      <td className="px-6 py-4 text-[13px] font-medium text-[#5a6e8c]">
                        {shift.breakDuration}
                      </td>
                      <td className="px-6 py-4 text-[13px] font-bold text-[#002f76]">
                        {shift.totalHours}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold ${statusStyle[shift.status]}`}
                        >
                          {shift.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}
