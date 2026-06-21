import { AppShell } from "@/components/app-shell";
import { attendanceMetrics, attendanceRoster } from "@/data/attendance";
import { AttendanceMetricCard } from "@/components/attendance/attendance-metric-card";
import { AttendanceRoster } from "@/components/attendance/attendance-roster";

export default function AttendancePage() {
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
        <AttendanceRoster data={attendanceRoster} />
      </section>
    </AppShell>
  );
}
