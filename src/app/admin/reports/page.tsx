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
  dateStr: string;
  clockInTime: string;
  clockOutTime: string | null;
  breaks: { start: string; end: string | null }[];
  status: string;
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

export default function ReportsPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/attendance");
        const json = await res.json();
        if (json.success) setRecords(json.data);
      } catch (err) {
        console.error("Failed to fetch attendance records:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Build detailed logs from attendance records
  const logs = records.map((r, i) => ({
    id: r._id,
    date: formatDate(r.dateStr),
    teacherName: r.name,
    initials: r.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
    scheduledIn: "08:00 AM",
    actualIn: r.clockInTime
      ? new Date(r.clockInTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : "–",
    status: (r.clockInTime && new Date(r.clockInTime).getHours() < 8 ? "ON TIME" : "LATE") as "ON TIME" | "LATE",
    totalHours: calcTotalHours(r),
    color: COLORS[i % COLORS.length],
  }));

  // Build chart trends grouped by week
  const weekMap: Record<string, { clockIns: number; onTime: number }> = {};
  for (const r of records) {
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
  const totalClockIns = records.length;
  const onTimeCount = logs.filter((l) => l.status === "ON TIME").length;
  const avgPunctuality = totalClockIns > 0 ? Math.round((onTimeCount / totalClockIns) * 100) : 0;
  const completedToday = records.filter((r) => {
    const today = new Date().toISOString().slice(0, 10);
    return r.dateStr === today;
  }).length;

  const reportMetrics = [
    { label: "AVG PUNCTUALITY", value: avgPunctuality.toString(), unit: "%", type: "punctuality" as const },
    { label: "TOTAL CLOCK-INS", value: totalClockIns.toString(), type: "clockins" as const },
    { label: "DAILY ATTENDANCE", value: completedToday.toString(), unit: " today", type: "attendance" as const },
  ];

  return (
    <AppShell title="Reports" description="Explore key metrics and detailed data visualizations for your activities.">
      {/* Filter Bar */}
      <ReportsFilterBar />

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
        <ReportsTable logs={logs} />
      )}

      {/* Footer Banner */}
      <ReportsFooterBanner />

      {/* Bottom spacing */}
      <div className="h-4" />
    </AppShell>
  );
}
