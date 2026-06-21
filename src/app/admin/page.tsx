import { AppShell } from "@/components/app-shell";
import { AttendanceHub } from "@/components/dashboard/attendance-hub";
import { DailyTeamOverview } from "@/components/dashboard/daily-team-overview";
import { MetricCard } from "@/components/dashboard/metric-card";
import { activeStatus, metrics, teamMembers, todayHistory } from "@/data/dashboard";

export default function Home() {
  return (
    <AppShell title="Welcome back, Admin!" description="Here's what's happening today across all playgroups.">
      {/* Metric cards */}
      <section className="grid gap-4 grid-cols-2 xl:grid-cols-4 shrink-0">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            meta={metric.meta}
            type={metric.type}
          />
        ))}
      </section>

      {/* Daily Team Overview */}
      <DailyTeamOverview members={teamMembers} activeCount={5} />

      {/* Attendance Hub — grows to fill remaining height */}
      <div className="flex-1 min-h-0">
        <AttendanceHub activeStatus={activeStatus} history={todayHistory} />
      </div>
    </AppShell>
  );
}
