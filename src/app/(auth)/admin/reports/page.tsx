"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";
import { ReportsTable } from "@/components/reports/reports-table";
import { getScheduleTableForDate, getDayAbbr, getBreakMinutes } from "@/lib/attendance-rules";

const ReportsChart = dynamic(() => import("@/components/reports/reports-chart").then(m => m.ReportsChart), {
  loading: () => <div className="flex items-center justify-center h-48 text-[#5a6e8c] font-bold text-sm">Loading chart…</div>,
  ssr: false,
});
import { ReportsFilterBar } from "@/components/reports/reports-filter-bar";
import { ReportsMetricCard } from "@/components/reports/reports-metric-card";
import { ReportsFooterBanner } from "@/components/reports/reports-footer-banner";
import { Skeleton } from "@/components/ui/skeleton";

type AttendanceRecord = {
  _id: string;
  name: string;
  teacherId?: string;
  group?: string;
  dateStr: string;
  clockInTime: string;
  clockOutTime: string | null;
  breaks: { start: string; end: string | null }[];
  status: string;
};

type AccountRecord = {
  id: string;
  fullName: string;
  shiftTime?: string;
  role?: string;
};

const COLORS = ["#0066cc", "#ffb800", "#339933", "#9333ea", "#ef4444", "#0891b2", "#d97706", "#16a34a"];

function calcTotalHours(record: AttendanceRecord) {
  if (!record.clockInTime || !record.clockOutTime) return "–";
  let ms = new Date(record.clockOutTime).getTime() - new Date(record.clockInTime).getTime();
  
  // Deduct automatic break time based on the day (from shared attendance-rules)
  const [y, m, d] = record.dateStr.split("-").map(Number);
  const dayOfWeek = new Date(y, m - 1, d).getDay();
  const breakMs = getBreakMinutes(dayOfWeek) * 60000;
  ms = Math.max(0, ms - breakMs);

  const h = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${min.toString().padStart(2, "0")}m`;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getWeekOfMonth(dateStr: string) {
  const d = Number(dateStr.split("-")[2]);
  return `W${Math.ceil(d / 7)}`;
}

function sortAttendanceNewestFirst(records: AttendanceRecord[]) {
  return [...records].sort((a, b) => {
    const dateOrder = b.dateStr.localeCompare(a.dateStr);
    if (dateOrder !== 0) return dateOrder;

    const aClockIn = Date.parse(a.clockInTime) || 0;
    const bClockIn = Date.parse(b.clockInTime) || 0;
    return bClockIn - aClockIn;
  });
}

function calcBreakDuration(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayOfWeek = new Date(y, m - 1, d).getDay();
  const mins = getBreakMinutes(dayOfWeek);
  if (mins === 0) return "–";
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  if (h > 0) return `${h}h ${rem > 0 ? `${rem}m` : ""}`;
  return `${rem}m`;
}

export default function ReportsPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [accounts, setAccounts] = useState<Record<string, AccountRecord>>({});
  const [loading, setLoading] = useState(true);

  // Filter Bar State
  const [selectedRole, setSelectedRole] = useState("All Staff");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [attRes, accRes] = await Promise.all([
          fetch("/api/attendance"),
          fetch("/api/accounts"),
        ]);
        const [attJson, accJson] = await Promise.all([attRes.json(), accRes.json()]);
        if (attJson.success) {
          const newestFirst = sortAttendanceNewestFirst(attJson.data);
          setRecords(newestFirst);
          setFilteredRecords(newestFirst);
        }
        if (Array.isArray(accJson)) {
          const map: Record<string, AccountRecord> = {};
          for (const a of accJson) map[a.id] = a;
          setAccounts(map);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function handleGenerate() {
    let result = [...records];
    
    if (selectedRole !== "All Staff") {
      const selected = selectedRole.toLowerCase();
      result = result.filter((r) => {
        const role = (accounts[r.teacherId ?? ""]?.role || "").toLowerCase();
        const group = (r.group || "").toLowerCase();
        if (selected === "teachers") return role.includes("teacher") || group.includes("teacher");
        return role.includes(selected) || group.includes(selected);
      });
    }
    
    if (startDate && endDate) {
      result = result.filter(r => r.dateStr >= startDate && r.dateStr <= endDate);
    } else if (startDate) {
      result = result.filter(r => r.dateStr >= startDate);
    } else if (endDate) {
      result = result.filter(r => r.dateStr <= endDate);
    }
    
    setFilteredRecords(sortAttendanceNewestFirst(result));
  }

  function handleExportCSV() {
    if (filteredRecords.length === 0) return alert("No records to export.");
    
    // Create CSV headers
    const headers = ["Date", "Teacher Name", "Group/Room", "Scheduled In", "Actual In", "Clock Out", "Breaks Duration", "Status", "Total Hours"];
    
    // Create CSV rows
    const rows = logs.map(l => [
      `"${l.date}"`,
      `"${l.teacherName}"`,
      `"${l.group}"`,
      `"${l.scheduledIn}"`,
      `"${l.actualIn}"`,
      `"${l.clockOut}"`,
      `"${l.breaksDuration === "–" ? "None" : l.breaksDuration}"`,
      `"${l.status}"`,
      `"${l.totalHours === "–" ? "0h" : l.totalHours}"`
    ].join(","));
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${startDate || "all"}_to_${endDate || "all"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Build detailed logs from attendance records
  const logs = filteredRecords.map((r, i) => ({
    id: r._id,
    date: formatDate(r.dateStr),
    teacherName: r.name,
    initials: r.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
    group: r.group || "Unassigned",
    scheduledIn: (() => {
      // Use stored shiftTime from account if available
      const shiftStart = accounts[r.teacherId ?? ""]?.shiftTime?.split(" - ")[0];
      if (shiftStart) return shiftStart;
      // Otherwise derive from BASE_SCHEDULE for that day
      const [y, mo, d] = r.dateStr.split("-").map(Number);
      const dateObj = new Date(y, mo - 1, d, 12); // noon avoids DST edge cases
      const day = getDayAbbr(dateObj);
      const schedTable = getScheduleTableForDate(dateObj);
      const sched = day !== "Sun" ? schedTable[day] : null;
      if (!sched) return "08:30 AM";
      const [h, m] = sched.start.split(":").map(Number);
      const ampm = h < 12 ? "AM" : "PM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
    })(),
    actualIn: r.clockInTime
      ? new Date(r.clockInTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })
      : "–",
    clockOut: r.clockOutTime
      ? new Date(r.clockOutTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })
      : "Missing",
    breaksDuration: calcBreakDuration(r.dateStr),
    status: ((r as any).timeInStatus === "On Time" ? "ON TIME" : (r as any).timeInStatus === "Late" ? "LATE" : "ON TIME") as "ON TIME" | "LATE",
    totalHours: calcTotalHours(r),
    color: COLORS[i % COLORS.length],
  }));

  // Build chart trends grouped by week
  const weekMap: Record<string, { clockIns: number; onTime: number }> = {};
  for (const r of filteredRecords) {
    const week = getWeekOfMonth(r.dateStr);
    if (!weekMap[week]) weekMap[week] = { clockIns: 0, onTime: 0 };
    weekMap[week].clockIns += 1;
    if ((r as any).timeInStatus === "On Time") weekMap[week].onTime += 1;
  }
  const trends = Object.entries(weekMap).map(([week, data]) => {
    const rate = data.clockIns > 0 ? Math.round((data.onTime / data.clockIns) * 100) : 0;
    return {
      week,
      value: rate,
      color: rate < 80 ? "#ffb800" : "#92bdf2",
      clockIns: data.clockIns,
      onTime: data.onTime,
    };
  });

  // Compute metric cards
  const totalClockIns = filteredRecords.length;
  const onTimeCount = logs.filter((l) => l.status === "ON TIME").length;
  const lateCount = totalClockIns - onTimeCount;
  const avgPunctuality = totalClockIns > 0 ? Math.round((onTimeCount / totalClockIns) * 100) : 0;

  const reportMetrics = [
    { label: "Average punctuality", value: avgPunctuality.toString(), unit: "%", meta: `${onTimeCount} of ${totalClockIns} arrivals on time`, type: "punctuality" as const },
    { label: "Total clock-ins", value: totalClockIns.toString(), meta: "Attendance records in this report", type: "clockins" as const },
    { label: "Late arrivals", value: lateCount.toString(), meta: "Arrivals that missed the scheduled start", type: "attendance" as const },
  ];

  return (
    <AppShell title="Reports" description="Attendance performance, punctuality, and staff activity at a glance.">
      <div id="reports-print-root" className="reports-print-root space-y-5 pb-10">
        <style>{`@media print { body * { visibility: hidden !important; } .reports-print-root, .reports-print-root * { visibility: visible !important; } .reports-print-root { position: fixed; inset: 0; z-index: 99999; width: 100%; overflow: visible; background: white; padding: 20px; } .reports-no-print { display: none !important; } }`}</style>

        <div className="reports-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[18px] text-[#0050d5]">insights</span>
            <p className="text-[12px] font-semibold text-[#31547f]">Review attendance trends and export a report for your selected staff and dates.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#31547f]">{filteredRecords.length} records</span>
        </div>

        <div className="reports-no-print">
          <ReportsFilterBar
            selectedRole={selectedRole}
            setSelectedRole={setSelectedRole}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            onGenerate={handleGenerate}
            onExport={handleExportCSV}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {reportMetrics.map((metric) => (
            <ReportsMetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              meta={metric.meta}
              unit={"unit" in metric ? metric.unit : undefined}
              type={metric.type}
            />
          ))}
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full rounded-3xl" />
        ) : (
          <ReportsChart trends={trends.length > 0 ? trends : undefined} onPrint={() => window.print()} />
        )}

        {loading ? (
          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : (
          <ReportsTable logs={logs as any} />
        )}

        <div className="reports-no-print"><ReportsFooterBanner /></div>
      </div>
    </AppShell>
  );
}
