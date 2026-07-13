"use client";

import { useEffect, useState } from "react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import { useAuth } from "@/lib/auth-context";

type ShiftRecord = {
  _id: string;
  dateStr: string;
  clockInTime: string;
  clockOutTime: string | null;
  breaks: { start: string; end: string | null }[];
  status: string;
  group?: string;
};

type ShiftStatus = "completed" | "inprogress" | "absent";

const STATUS_STYLES: Record<ShiftStatus, string> = {
  completed: "bg-green-100 text-green-800",
  inprogress: "bg-blue-100 text-blue-800",
  absent: "bg-red-100 text-red-800",
};
const STATUS_LABELS: Record<ShiftStatus, string> = {
  completed: "Completed",
  inprogress: "In Progress",
  absent: "Absent",
};

function formatT(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function calcBreakDuration(breaks: { start: string; end: string | null }[]) {
  let ms = 0;
  for (const b of breaks) {
    if (b.start && b.end) ms += new Date(b.end).getTime() - new Date(b.start).getTime();
  }
  if (ms === 0) return "–";
  const mins = Math.floor(ms / 60000);
  return `${mins}m`;
}

function calcTotalHours(record: ShiftRecord) {
  if (!record.clockInTime || !record.clockOutTime) return "–";
  let ms = new Date(record.clockOutTime).getTime() - new Date(record.clockInTime).getTime();
  for (const b of record.breaks) {
    if (b.start && b.end) ms -= new Date(b.end).getTime() - new Date(b.start).getTime();
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function mapStatus(record: ShiftRecord): ShiftStatus {
  if (record.status === "Completed") return "completed";
  if (record.status === "In Progress") return "inprogress";
  return "absent";
}

interface StatCardProps {
  label: string;
  value: string;
  borderColor: string;
  labelColor: string;
  dotColor: string;
}

function StatCard({ label, value, borderColor, labelColor, dotColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-[1.25rem] p-5 relative overflow-hidden border-2" style={{ borderColor }}>
      <div className="absolute -top-4 -right-4 w-14 h-14 rounded-full opacity-10" style={{ background: dotColor }} />
      <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: labelColor }}>{label}</p>
      <p className="text-3xl font-black text-brand-navy leading-none">{value}</p>
    </div>
  );
}

export default function ShiftHistoryPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"this" | "last">("this");

  useEffect(() => {
    if (!user?.uid) return;
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/attendance?uid=${user!.uid}`);
        const json = await res.json();
        if (json.success) setRecords(json.data);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [user]);

  // Split records into this week and last week
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfWeek.getDate() - 7);

  const thisWeekRecords = records.filter((r) => {
    const d = new Date(r.clockInTime);
    return d >= startOfWeek;
  });
  const lastWeekRecords = records.filter((r) => {
    const d = new Date(r.clockInTime);
    return d >= startOfLastWeek && d < startOfWeek;
  });

  const rows = activeTab === "this" ? thisWeekRecords : lastWeekRecords;

  // Compute stats from this week
  const completedThisWeek = thisWeekRecords.filter((r) => r.status === "Completed");
  let totalMs = 0;
  for (const r of completedThisWeek) {
    if (r.clockInTime && r.clockOutTime) {
      let ms = new Date(r.clockOutTime).getTime() - new Date(r.clockInTime).getTime();
      for (const b of r.breaks) {
        if (b.start && b.end) ms -= new Date(b.end).getTime() - new Date(b.start).getTime();
      }
      totalMs += ms;
    }
  }
  const totalHours = totalMs > 0
    ? `${Math.floor(totalMs / 3600000)}h ${Math.floor((totalMs % 3600000) / 60000)}m`
    : "–";

  // Calculate Avg clock-in and On-time rate
  let avgClockInStr = "–";
  let onTimeRateStr = "–";

  if (thisWeekRecords.length > 0) {
    let totalMins = 0;
    let onTimeCount = 0;

    for (const r of thisWeekRecords) {
      if (r.clockInTime) {
        const d = new Date(r.clockInTime);
        const mins = d.getHours() * 60 + d.getMinutes();
        totalMins += mins;
        if (mins <= 8 * 60) onTimeCount++; // 8:00 AM or earlier is on-time
      }
    }

    const avgMins = Math.round(totalMins / thisWeekRecords.length);
    let h = Math.floor(avgMins / 60);
    const m = (avgMins % 60).toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    avgClockInStr = `${h}:${m} ${ampm}`;

    onTimeRateStr = `${Math.round((onTimeCount / thisWeekRecords.length) * 100)}%`;
  }

  return (
    <TeacherShell title="Shift History">
      <div className="flex flex-col gap-6 w-full">

        {/* Section Label */}
        <div className="flex items-center gap-3">
          <span className="block w-7 h-[3px] rounded-full bg-brand-yellow" />
          <span className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
            Weekly Overview
          </span>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total hours this week" value={totalHours} borderColor="#F5A623" labelColor="#D97706" dotColor="#F5A623" />
          <StatCard label="Shifts completed" value={`${completedThisWeek.length} / ${thisWeekRecords.length || "–"}`} borderColor="#3B82F6" labelColor="#2563EB" dotColor="#3B82F6" />
          <StatCard label="Avg clock-in" value={avgClockInStr} borderColor="#38BDF8" labelColor="#0284C7" dotColor="#38BDF8" />
          <StatCard label="On-time rate" value={onTimeRateStr} borderColor="#F87171" labelColor="#DC2626" dotColor="#F87171" />
        </div>

        {/* Shift Log Card */}
        <div className="bg-white rounded-[1.25rem] border-2 border-slate-100 shadow-sm p-6">
          {/* Card header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="block w-7 h-[3px] rounded-full bg-brand-yellow" />
              <span className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
                Shift Log
              </span>
            </div>
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              {(["this", "last"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all ${activeTab === tab ? "bg-white text-brand-navy shadow-sm" : "text-slate-500 hover:text-brand-navy"
                    }`}
                >
                  {tab === "this" ? "This Week" : "Last Week"}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-32 text-[#5a6e8c] font-bold text-sm">
              Loading shift history…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[#9aa3b2] font-bold text-sm">
              No shifts recorded for this period.
            </div>
          ) : (
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
                    <tr key={row._id} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-3.5 text-sm font-black text-brand-navy">{formatDate(row.dateStr)}</td>
                      <td className="px-3 py-3.5 text-sm text-slate-500">{formatT(row.clockInTime)}</td>
                      <td className="px-3 py-3.5 text-sm text-slate-500">{formatT(row.clockOutTime)}</td>
                      <td className="px-3 py-3.5 text-xs text-slate-400">{calcBreakDuration(row.breaks)}</td>
                      <td className="px-3 py-3.5">
                        <span className="text-sm font-black text-brand-navy">{calcTotalHours(row)}</span>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${STATUS_STYLES[mapStatus(row)]}`}>
                          {STATUS_LABELS[mapStatus(row)]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </TeacherShell>
  );
}