"use client";

import { useState } from "react";
import { TeacherShell } from "@/components/teacher/teacher-shell";

const THIS_WEEK = [
  { date: "Mon, Jun 16", in: "7:48 AM", out: "1:05 PM", brk: "20m", hrs: "4h 57m", pct: 90, status: "completed" },
  { date: "Tue, Jun 17", in: "7:50 AM", out: "1:00 PM", brk: "15m", hrs: "4h 55m", pct: 88, status: "completed" },
  { date: "Wed, Jun 18", in: "7:55 AM", out: "1:10 PM", brk: "30m", hrs: "4h 45m", pct: 85, status: "completed" },
  { date: "Thu, Jun 19", in: "8:15 AM", out: "1:00 PM", brk: "10m", hrs: "4h 35m", pct: 82, status: "completed" },
  { date: "Fri, Jun 20", in: "7:45 AM", out: "1:15 PM", brk: "25m", hrs: "5h 05m", pct: 100, status: "completed" },
  { date: "Sat, Jun 21", in: "7:58 AM", out: "–",       brk: "–",   hrs: "–",      pct: 0,  status: "inprogress" },
];

const LAST_WEEK = [
  { date: "Mon, Jun 9",  in: "8:02 AM", out: "1:00 PM",  brk: "20m", hrs: "4h 38m", pct: 83, status: "completed" },
  { date: "Tue, Jun 10", in: "7:55 AM", out: "1:05 PM",  brk: "15m", hrs: "4h 55m", pct: 88, status: "completed" },
  { date: "Wed, Jun 11", in: "8:20 AM", out: "1:10 PM",  brk: "20m", hrs: "4h 30m", pct: 80, status: "completed" },
  { date: "Thu, Jun 12", in: "–",       out: "–",        brk: "–",   hrs: "–",      pct: 0,  status: "absent" },
  { date: "Fri, Jun 13", in: "7:48 AM", out: "1:00 PM",  brk: "30m", hrs: "4h 42m", pct: 84, status: "completed" },
  { date: "Sat, Jun 14", in: "8:05 AM", out: "12:45 PM", brk: "15m", hrs: "4h 25m", pct: 78, status: "completed" },
];

type ShiftStatus = "completed" | "inprogress" | "absent";

const STATUS_STYLES: Record<ShiftStatus, string> = {
  completed:  "bg-green-100 text-green-800",
  inprogress: "bg-blue-100 text-blue-800",
  absent:     "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<ShiftStatus, string> = {
  completed:  "Completed",
  inprogress: "In Progress",
  absent:     "Absent",
};

interface StatCardProps {
  label: string;
  value: string;
  borderColor: string;
  labelColor: string;
  dotColor: string;
}

function StatCard({ label, value, borderColor, labelColor, dotColor }: StatCardProps) {
  return (
    <div
      className={`bg-white rounded-[1.25rem] p-5 relative overflow-hidden border-2`}
      style={{ borderColor }}
    >
      {/* Decorative accent dot */}
      <div
        className="absolute -top-4 -right-4 w-14 h-14 rounded-full opacity-10"
        style={{ background: dotColor }}
      />
      <p
        className="text-[10px] font-black uppercase tracking-widest mb-2"
        style={{ color: labelColor }}
      >
        {label}
      </p>
      <p className="text-3xl font-black text-brand-navy leading-none">{value}</p>
    </div>
  );
}

export default function ShiftHistoryPage() {
  const [activeTab, setActiveTab] = useState<"this" | "last">("this");
  const rows = activeTab === "this" ? THIS_WEEK : LAST_WEEK;

  return (
    <TeacherShell title="Shift History">
      <div className="flex flex-col gap-6 w-full">

        {/* ── Section Label ── */}
        <div className="flex items-center gap-3">
          <span className="block w-7 h-[3px] rounded-full bg-brand-yellow" />
          <span className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
            Weekly Overview
          </span>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total hours this week"
            value="32h 15m"
            borderColor="#F5A623"
            labelColor="#D97706"
            dotColor="#F5A623"
          />
          <StatCard
            label="Shifts completed"
            value="5 / 6"
            borderColor="#3B82F6"
            labelColor="#2563EB"
            dotColor="#3B82F6"
          />
          <StatCard
            label="Avg clock-in"
            value="7:52 AM"
            borderColor="#38BDF8"
            labelColor="#0284C7"
            dotColor="#38BDF8"
          />
          <StatCard
            label="On-time rate"
            value="94%"
            borderColor="#F87171"
            labelColor="#DC2626"
            dotColor="#F87171"
          />
        </div>

        {/* ── Shift Log Card ── */}
        <div className="bg-white rounded-[1.25rem] border-2 border-slate-100 shadow-sm p-6">

          {/* Card header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="block w-7 h-[3px] rounded-full bg-brand-yellow" />
              <span className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
                Shift Log
              </span>
            </div>

            {/* Tab switcher */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              {(["this", "last"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all ${
                    activeTab === tab
                      ? "bg-white text-brand-navy shadow-sm"
                      : "text-slate-500 hover:text-brand-navy"
                  }`}
                >
                  {tab === "this" ? "This Week" : "Last Week"}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Date", "Clock In", "Clock Out", "Break", "Total Hours", "Status"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 pb-3 px-3"
                      style={{ textAlign: h === "Status" ? "right" : "left" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.date}
                    className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Date */}
                    <td className="px-3 py-3.5 text-sm font-black text-brand-navy">
                      {row.date}
                    </td>

                    {/* Clock In */}
                    <td className="px-3 py-3.5 text-sm text-slate-500">{row.in}</td>

                    {/* Clock Out */}
                    <td className="px-3 py-3.5 text-sm text-slate-500">{row.out}</td>

                    {/* Break */}
                    <td className="px-3 py-3.5 text-xs text-slate-400">{row.brk}</td>

                    {/* Total Hours + mini bar */}
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-brand-navy">{row.hrs}</span>
                        {row.pct > 0 && (
                          <div className="w-14 h-1 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand-yellow"
                              style={{ width: `${row.pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="px-3 py-3.5 text-right">
                      <span
                        className={`inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                          STATUS_STYLES[row.status as ShiftStatus]
                        }`}
                      >
                        {STATUS_LABELS[row.status as ShiftStatus]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}