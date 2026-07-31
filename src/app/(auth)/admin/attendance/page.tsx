"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AttendanceMetricCard } from "@/components/attendance/attendance-metric-card";
import { AttendanceRoster } from "@/components/attendance/attendance-roster";
import type { StaffAttendance } from "@/data/attendance";
import { cachedFetch } from "@/lib/cache";
import { Skeleton } from "@/components/ui/skeleton";
import { computeDailyStatus } from "@/lib/attendance-rules";

type AttendanceRecord = {
  _id: string;
  teacherUid: string;
  name: string;
  group: string;
  dateStr: string;
  clockInTime: string;
  clockOutTime: string | null;
  status: string;
  timeInStatus?: string;
  clockInPhotoUrl?: string;
  clockOutPhotoUrl?: string;
};

type AccountDoc = {
  id?: string;
  _id?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  status?: string;
  workDays?: string[];
  noTimeLog?: boolean;
  weeklyHoursTarget?: number | null;
  assignedRoom?: string;
  avatarUrl?: string;
  avatarColor?: string;
};

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [attendanceJson, accountsJson] = await Promise.all([
          cachedFetch<any>("dashboard:attendance", "/api/attendance?date=today", 20_000),
          cachedFetch<any[]>("accounts:all", "/api/accounts", 60_000),
        ]);
        if (attendanceJson?.success) setRecords(attendanceJson.data);
        if (Array.isArray(accountsJson)) {
          // Only non-admin accounts
          setAccounts(accountsJson.filter((a) => (a.role || "").toLowerCase() !== "admin"));
        }
      } catch (err) {
        console.error("Failed to fetch attendance:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const today = new Date();

  // Build a map of teacherUid → record for today
  const recordByUid = new Map<string, AttendanceRecord>();
  for (const r of records) {
    recordByUid.set(r.teacherUid, r);
  }

  // Compute per-account daily statuses
  type AccountStatus = "On Time" | "Late" | "Absent" | "Exempt" | "No Work Day";
  const accountStatuses: { account: AccountDoc; dailyStatus: AccountStatus }[] = accounts.map((acc) => {
    const uid = acc.id || acc._id || "";
    const record = recordByUid.get(uid) ?? null;
    const dailyStatus = computeDailyStatus(
      record,
      {
        workDays: acc.workDays ?? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        noTimeLog: acc.noTimeLog ?? false,
        weeklyHoursTarget: acc.weeklyHoursTarget ?? null,
      },
      today
    ) as AccountStatus;
    return { account: acc, dailyStatus };
  });

  // Metrics — only count teachers who are expected today
  const workingToday = accountStatuses.filter((a) => a.dailyStatus !== "No Work Day");
  const present = workingToday.filter((a) => a.dailyStatus === "On Time" || a.dailyStatus === "Late" || a.dailyStatus === "Exempt").length;
  const late = workingToday.filter((a) => a.dailyStatus === "Late").length;
  const absent = workingToday.filter((a) => a.dailyStatus === "Absent").length;
  const onLeave = accounts.filter((a) => a.status === "on-leave").length;

  const attendanceMetrics = [
    { label: "TOTAL PRESENT", value: present.toString(), type: "present" as const },
    { label: "LATE ARRIVALS", value: late.toString(), type: "late" as const },
    { label: "ABSENT", value: absent.toString(), type: "absent" as const },
    { label: "ON LEAVE", value: onLeave.toString(), type: "leave" as const },
  ];

  // Build roster from accounts who are supposed to work today (or have a record)
  const rosterAccounts = accountStatuses.filter(
    (a) => a.dailyStatus !== "No Work Day" || recordByUid.has(a.account.id || a.account._id || "")
  );

  const COLORS = ["#ffb347", "#4a90d9", "#9b9b9b", "#6c5ce7", "#e17055", "#00b894"];

  const roster: StaffAttendance[] = rosterAccounts.map(({ account, dailyStatus }) => {
    const uid = account.id || account._id || "";
    const record = recordByUid.get(uid);
    const name = account.fullName || `${(account as any).firstName ?? ""} ${(account as any).lastName ?? ""}`.trim() || "Unknown";
    const colorIndex = name.charCodeAt(0) % COLORS.length;

    // Map internal status to display status
    let displayStatus: StaffAttendance["status"] = "Absent";
    if (dailyStatus === "On Time") displayStatus = "On Time";
    else if (dailyStatus === "Late") displayStatus = "Late";
    else if (dailyStatus === "Exempt") displayStatus = "On Time"; // exempt shows as on-time visually
    else if (dailyStatus === "Absent") displayStatus = "Absent";

    return {
      id: uid,
      name,
      avatarInitials: name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
      avatarColor: account.avatarColor || COLORS[colorIndex],
      group: account.assignedRoom || "Unassigned",
      timeIn: record?.clockInTime
        ? new Date(record.clockInTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })
        : "—",
      timeOut: record?.clockOutTime
        ? new Date(record.clockOutTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })
        : "—",
      status: displayStatus,
      clockInPhotoUrl: record?.clockInPhotoUrl,
      clockOutPhotoUrl: record?.clockOutPhotoUrl,
    };
  });

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
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-10 flex-1 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : roster.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-[#9aa3b2] gap-2">
            <p className="font-bold text-sm">No staff scheduled today.</p>
            <p className="text-xs">Teachers will appear here based on their work day schedule.</p>
          </div>
        ) : (
          <AttendanceRoster data={roster} />
        )}
      </section>
    </AppShell>

  );
}
