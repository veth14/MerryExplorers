"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";
import { ReportsTable } from "@/components/reports/reports-table";
const ReportsChart = dynamic(() => import("@/components/reports/reports-chart").then(m => m.ReportsChart), {
  loading: () => <div className="flex items-center justify-center h-48 text-[#5a6e8c] font-bold text-sm">Loading chart…</div>,
  ssr: false,
});
import { ReportsFilterBar } from "@/components/reports/reports-filter-bar";
import { ReportsMetricCard } from "@/components/reports/reports-metric-card";
import { ReportsFooterBanner } from "@/components/reports/reports-footer-banner";

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
  for (const b of record.breaks) {
    if (b.start && b.end) ms -= new Date(b.end).getTime() - new Date(b.start).getTime();
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getWeekOfMonth(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `W${Math.ceil(d / 7)}`;
}

function calcBreakDuration(breaks: { start: string; end: string | null }[]) {
  let ms = 0;
  for (const b of breaks) {
    if (b.start && b.end) ms += new Date(b.end).getTime() - new Date(b.start).getTime();
  }
  if (ms === 0) return "–";
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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
          setRecords(attJson.data);
          setFilteredRecords(attJson.data);
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
      result = result.filter(r => r.group === selectedRole || accounts[r.teacherId ?? ""]?.role === selectedRole);
    }
    
    if (startDate && endDate) {
      result = result.filter(r => r.dateStr >= startDate && r.dateStr <= endDate);
    } else if (startDate) {
      result = result.filter(r => r.dateStr >= startDate);
    } else if (endDate) {
      result = result.filter(r => r.dateStr <= endDate);
    }
    
    // Sort descending by date
    result.sort((a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime());
    
    setFilteredRecords(result);
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
    scheduledIn: accounts[r.teacherId ?? ""]?.shiftTime?.split(" - ")[0] ?? "08:00 AM", // default schedule if missing
    actualIn: r.clockInTime
      ? new Date(r.clockInTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : "–",
    clockOut: r.clockOutTime
      ? new Date(r.clockOutTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : "Missing",
    breaksDuration: r.breaks ? calcBreakDuration(r.breaks) : "–",
    status: (r.clockInTime && new Date(r.clockInTime).getHours() < 8 ? "ON TIME" : "LATE") as "ON TIME" | "LATE",
    totalHours: calcTotalHours(r),
    color: COLORS[i % COLORS.length],
  }));

  // Build chart trends grouped by week
  const weekMap: Record<string, { clockIns: number; onTime: number }> = {};
  for (const r of filteredRecords) {
    const week = getWeekOfMonth(r.dateStr);
    if (!weekMap[week]) weekMap[week] = { clockIns: 0, onTime: 0 };
    weekMap[week].clockIns += 1;
    const hour = r.clockInTime ? new Date(r.clockInTime).getHours() : 99;
    if (hour < 8) weekMap[week].onTime += 1;
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
    { label: "AVG PUNCTUALITY", value: avgPunctuality.toString(), unit: "%", type: "punctuality" as const },
    { label: "TOTAL CLOCK-INS", value: totalClockIns.toString(), type: "clockins" as const },
    { label: "TOTAL LATES", value: lateCount.toString(), type: "attendance" as const },
  ];

  return (
    <AppShell title="Reports" description="Explore key metrics and detailed data visualizations for your activities.">
      {/* Filter Bar */}
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

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reportMetrics.map((metric) => (
          <ReportsMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            unit={"unit" in metric ? metric.unit : undefined}
            type={metric.type}
          />
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-[#5a6e8c] font-bold text-sm">
          Loading chart data…
        </div>
      ) : (
        <ReportsChart trends={trends.length > 0 ? trends : undefined} />
      )}

      {/* Detailed Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-[#5a6e8c] font-bold text-sm">
          Loading logs…
        </div>
      ) : (
        <ReportsTable logs={logs as any} />
      )}

      {/* Footer Banner */}
      <ReportsFooterBanner />

      {/* Bottom spacing */}
      <div className="h-4" />
    </AppShell>
  );
}
