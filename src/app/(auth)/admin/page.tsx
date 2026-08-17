"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { cachedFetch, invalidateCachePrefix } from "@/lib/cache";
import { AttendanceHub } from "@/components/dashboard/attendance-hub";
import { DailyTeamOverview } from "@/components/dashboard/daily-team-overview";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Skeleton } from "@/components/ui/skeleton";

type MetricData = {
  totalTeachers: { value: string; meta: string };
  activeSessions: { value: string; meta: string };
  punctualityRate: { value: string; meta: string };
  totalClockIns: { value: string; meta: string };
};

type AttendanceRecord = {
  _id: string;
  teacherUid: string;
  name: string;
  group: string;
  dateStr: string;
  clockInTime: string;
  clockInPhotoUrl?: string;
  clockOutTime?: string;
  status: string;
  breaks?: { start: string; end?: string }[];
};

type AccountRecord = {
  id: string;
  fullName: string;
  role: string;
  avatarUrl?: string;
};

export default function Home() {
  const [metricsData, setMetricsData] = useState<MetricData | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [metricsJson, attendanceJson, accountsJson] = await Promise.all([
          cachedFetch<any>("dashboard:metrics", "/api/dashboard/metrics", 300_000),
          cachedFetch<any>("dashboard:attendance", "/api/attendance?date=today", 300_000),
          cachedFetch<any>("accounts:all", "/api/accounts", 300_000),
        ]);

        if (metricsJson?.success) setMetricsData(metricsJson.data);
        if (attendanceJson?.success) setTodayAttendance(attendanceJson.data);
        if (Array.isArray(accountsJson)) setAccounts(accountsJson);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const metrics = metricsData
    ? [
        { label: "Total Teachers", value: metricsData.totalTeachers.value, meta: metricsData.totalTeachers.meta, type: "teachers" as const },
        { label: "Punctuality Rate", value: metricsData.punctualityRate.value, meta: metricsData.punctualityRate.meta, type: "punctuality" as const },
        { label: "Total Clock-Ins", value: metricsData.totalClockIns.value, meta: metricsData.totalClockIns.meta, type: "clockins" as const },
      ]
    : [
        { label: "Total Teachers", value: "–", meta: "Loading...", type: "teachers" as const },
        { label: "Punctuality Rate", value: "–", meta: "Loading...", type: "punctuality" as const },
        { label: "Total Clock-Ins", value: "–", meta: "Loading...", type: "clockins" as const },
      ];

  // Build activeStatus from today's attendance (include completed)
  const activeStatus = todayAttendance
    .map((r) => {
      const isCompleted = !!r.clockOutTime;
      const timeLabel = isCompleted
        ? `Out: ${new Date(r.clockOutTime!).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })}`
        : `In: ${new Date(r.clockInTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })}`;
      return {
        name: r.name,
        time: timeLabel,
        status: isCompleted ? ("COMPLETED" as const) : ("ON TIME" as const),
        avatar: r.clockInPhotoUrl,
      };
    });

  // Build teamMembers from ALL teacher + executive assistant accounts
  const teamMembers = accounts
    .filter((acc) => {
      const role = (acc.role || "").toLowerCase();
      return role.includes("teacher") || role === "executive assistant";
    })
    .map((acc) => {
      const r = todayAttendance.find((att) => att.teacherUid === acc.id);
      
      let hoursStr = "–";
      let displayStatus = "NOT STARTED";
      let color = "#9aa3b2";

      if (r) {
        if (r.clockInTime && r.clockOutTime) {
          let ms = new Date(r.clockOutTime).getTime() - new Date(r.clockInTime).getTime();
          for (const b of (r.breaks || [])) {
            if (b.start && b.end) ms -= new Date(b.end).getTime() - new Date(b.start).getTime();
          }
          if (ms > 0) {
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            hoursStr = `${h}h ${m}m`;
          }
          displayStatus = "COMPLETED";
          color = "#0050d5";
        } else if (r.clockInTime) {
          // In progress - calculate elapsed time using `now` state
          let ms = now.getTime() - new Date(r.clockInTime).getTime();
          for (const b of (r.breaks || [])) {
            if (b.start) {
              const endMs = b.end ? new Date(b.end).getTime() : now.getTime();
              ms -= endMs - new Date(b.start).getTime();
            }
          }
          if (ms > 0) {
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            hoursStr = `${h}h ${m}m`;
          }
          
          // Check if currently on break
          const isBreak = r.breaks?.some((b) => b.start && !b.end);
          if (isBreak) {
            displayStatus = "ON BREAK";
            color = "#ffb800";
          } else {
            displayStatus = "WORKING";
            color = "#2da05b";
          }
        }
      }

      return {
        name: acc.fullName || acc.id,
        initials: (acc.fullName || acc.id).split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
        status: displayStatus as any,
        hours: hoursStr,
        color,
        avatar: acc.avatarUrl || (r ? r.clockInPhotoUrl : undefined), // Prefer profile photo from AccountProfile bucket, fallback to clock-in photo
      };
    });

  const todayHistory = todayAttendance
    .flatMap((r) => {
      const entries: { name: string; time: string; type: "in" | "out"; _ts: number }[] = [
        {
          name: `${r.name} Clocked In`,
          time: new Date(r.clockInTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }),
          type: "in",
          _ts: new Date(r.clockInTime).getTime(),
        },
      ];
      if (r.clockOutTime) {
        entries.push({
          name: `${r.name} Clocked Out`,
          time: new Date(r.clockOutTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }),
          type: "out",
          _ts: new Date(r.clockOutTime).getTime(),
        });
      }
      return entries;
    })
    .sort((a, b) => b._ts - a._ts) // newest first
    .map(({ _ts, ...rest }) => rest);

  return (
    <AppShell title="Welcome back, Admin!" description="Here's what's happening today across all playgroups.">
      {/* Metric cards */}
      <section className="grid gap-4 grid-cols-1 md:grid-cols-3 shrink-0">
        {loading ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : (
          metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              meta={metric.meta}
              type={metric.type}
            />
          ))
        )}
      </section>

      {/* Daily Team Overview */}
      {loading ? (
        <div className="rounded-[2rem] bg-white p-6 shadow-sm border-2 border-brand-sky flex flex-col gap-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-14 w-14 rounded-full" />
          </div>
        </div>
      ) : (
        <DailyTeamOverview members={teamMembers as any} activeCount={teamMembers.filter((m) => m.status === "WORKING" || m.status === "ON BREAK").length} />
      )}

      {/* Attendance Hub */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-full w-full rounded-[2rem]" />
            <Skeleton className="h-full w-full rounded-[2rem]" />
          </div>
        ) : (
          <AttendanceHub activeStatus={activeStatus} history={todayHistory} />
        )}
      </div>
    </AppShell>
  );
}
