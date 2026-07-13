"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AttendanceMetricCard } from "@/components/attendance/attendance-metric-card";
import { AttendanceRoster } from "@/components/attendance/attendance-roster";
import type { StaffAttendance } from "@/data/attendance";
import { cachedFetch } from "@/lib/cache";

type AttendanceRecord = {
  _id: string;
  teacherUid: string;
  name: string;
  group: string;
  dateStr: string;
  clockInTime: string;
  clockOutTime: string | null;
  status: string;
};

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const json = await cachedFetch<any>("dashboard:attendance", "/api/attendance?date=today", 20_000);
        if (json?.success) setRecords(json.data);
      } catch (err) {
        console.error("Failed to fetch attendance:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const present = records.filter((r) => r.status === "In Progress" || r.status === "Completed").length;
  const late = 0; // Extend this later with a threshold check
  const absent = 0; // Extend this with accounts - records logic
  const onLeave = 0;

  const attendanceMetrics = [
    { label: "TOTAL PRESENT", value: present.toString(), type: "present" as const },
    { label: "LATE ARRIVALS", value: late.toString(), type: "late" as const },
    { label: "ABSENT", value: absent.toString(), type: "absent" as const },
    { label: "ON LEAVE", value: onLeave.toString(), type: "leave" as const },
  ];

  // Map MongoDB attendance records to the StaffAttendance shape
  const roster: StaffAttendance[] = records.map((r) => ({
    id: r._id,
    name: r.name,
    avatarInitials: r.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
    avatarColor: r.status === "In Progress" ? "#2da05b" : r.status === "Completed" ? "#0050d5" : "#e0e0e0",
    group: r.group,
    timeIn: r.clockInTime
      ? new Date(r.clockInTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : "-",
    timeOut: r.clockOutTime
      ? new Date(r.clockOutTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : "-",
    status: r.status === "In Progress" ? "On Time" : r.status === "Completed" ? "Completed" : "Absent",
  }));

  return (
    <AppShell title="Attendance" description="Track daily check-ins and monitor staff availability.">
      {/* Header Title with yellow line */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-[3px] bg-[#ffb800]" />
        <h1 className="text-[14px] font-black uppercase tracking-[0.1em] text-[#002f76]">
          Daily Attendance Overview
        </h1>
      </div>

      {/* Metric cards */}
      <section className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
        {attendanceMetrics.map((metric) => (
          <AttendanceMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            type={metric.type}
          />
        ))}
      </section>

      {/* Staff Roster Table */}
      <section className="mt-2">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#5a6e8c] font-bold text-sm">
            Loading attendance records…
          </div>
        ) : roster.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-[#9aa3b2] gap-2">
            <p className="font-bold text-sm">No clock-ins recorded today.</p>
            <p className="text-xs">Teachers will appear here once they clock in.</p>
          </div>
        ) : (
          <AttendanceRoster data={roster} />
        )}
      </section>
    </AppShell>
  );
}
