"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { AttendanceMetricCard } from "@/components/attendance/attendance-metric-card";
import { AttendanceRoster } from "@/components/attendance/attendance-roster";
import type { StaffAttendance } from "@/data/attendance";
import { cachedFetch, invalidateCache } from "@/lib/cache";
import { Skeleton } from "@/components/ui/skeleton";
import { computeDailyStatus } from "@/lib/attendance-rules";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { useAuth } from "@/lib/auth-context";

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
  const { user, userProfile } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendType, setSuspendType] = useState<"suspension" | "holiday" | null>(null);
  const [suspendReason, setSuspendReason] = useState<string | null>(null);
  const [exemptions, setExemptions] = useState<string[]>([]);
  const [exemptLoading, setExemptLoading] = useState(false);

  // Suspend modal state
  const [showMarkDayOffModal, setShowMarkDayOffModal] = useState(false);
  const [dayOffType, setDayOffType] = useState<"suspension" | "holiday">("suspension");
  const [suspendInput, setSuspendInput] = useState("");
  const [suspendLoading, setSuspendLoading] = useState(false);

  // PH Holiday loader state
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear().toString());
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [holidayResult, setHolidayResult] = useState<{ seeded: number } | null>(null);

  // Multi-date export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const [viewDateStr, setViewDateStr] = useState(() => {
    const manilaStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    const d = new Date(manilaStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [attendanceJson, accountsJson] = await Promise.all([
        cachedFetch<any>(`dashboard:attendance:${viewDateStr}`, `/api/attendance?date=${viewDateStr}&_t=${Date.now()}`, 30_000),
        cachedFetch<any[]>("accounts:all", "/api/accounts", 60_000),
      ]);
      if (attendanceJson?.success) {
        setRecords(attendanceJson.data);
        setIsSuspended(attendanceJson.isSuspended ?? false);
        setSuspendType(attendanceJson.suspendType ?? null);
        setSuspendReason(attendanceJson.suspendReason ?? null);
        setExemptions(attendanceJson.exemptions ?? []);
      }
      if (Array.isArray(accountsJson)) {
        setAccounts(accountsJson.filter((a) => (a.role || "").toLowerCase() !== "admin"));
      }
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
    } finally {
      setLoading(false);
    }
  }, [viewDateStr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Safe parse for local day checking
  const viewDate = new Date(`${viewDateStr}T00:00:00`);

  // Keep todayStr for defaulting modal date
  const today = new Date();
  const todayStr = (() => {
    const manilaStr = today.toLocaleString("en-US", { timeZone: "Asia/Manila" });
    const d = new Date(manilaStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const [suspendDateInput, setSuspendDateInput] = useState(todayStr);
  const [autoAnnounce, setAutoAnnounce] = useState(true);

  const handleMarkDayOff = async () => {
    setSuspendLoading(true);
    try {
      await fetch("/api/attendance/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateStr: suspendDateInput,
          reason: suspendInput.trim() || (dayOffType === "holiday" ? "Philippine Public Holiday" : "Suspension announced"),
          type: dayOffType,
        }),
      });

      // Write audit log
      try {
        await fetch("/api/audit-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorUid: user?.uid || null,
            actorName: userProfile?.fullName || user?.email || "Unknown",
            actorRole: userProfile?.role || "Unknown",
            action: "CREATE",
            category: dayOffType === "holiday" ? "holiday" : "suspension",
            targetId: suspendDateInput,
            targetTitle: suspendDateInput,
            details: `Marked ${suspendDateInput} as ${dayOffType === "holiday" ? "Holiday" : "Suspension"}: ${suspendInput.trim() || "No reason"}`,
          }),
        });
      } catch { /* non-fatal */ }

      if (autoAnnounce) {
        const reason = suspendInput.trim() || (dayOffType === "holiday" ? "Philippine Public Holiday" : "Suspension announced");
        const endDateObj = new Date(suspendDateInput);
        endDateObj.setHours(23, 59, 59, 999);

        await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: dayOffType === "holiday"
              ? `Holiday: ${suspendDateInput}`
              : `Classes Suspended: ${suspendDateInput}`,
            content: dayOffType === "holiday"
              ? `${suspendDateInput} is a public holiday. No classes will be held. Reason: ${reason}.`
              : `Please be advised that classes are suspended on ${suspendDateInput}. Reason: ${reason}.`,
            type: "alert",
            startDate: new Date().toISOString(),
            endDate: endDateObj.toISOString(),
          }),
        });
      }

      invalidateCache(`dashboard:attendance:${viewDateStr}`);
      setShowMarkDayOffModal(false);
      setSuspendInput("");
      setSuspendDateInput(todayStr);
      setLoading(true);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSuspendLoading(false);
    }
  };

  const handleUndoDayOff = async () => {
    setSuspendLoading(true);
    try {
      await fetch(`/api/attendance/suspend?dateStr=${viewDateStr}`, { method: "DELETE" });

      try {
        await fetch("/api/audit-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorUid: user?.uid || null,
            actorName: userProfile?.fullName || user?.email || "Unknown",
            actorRole: userProfile?.role || "Unknown",
            action: "DELETE",
            category: suspendType === "holiday" ? "holiday" : "suspension",
            targetId: viewDateStr,
            targetTitle: viewDateStr,
            details: `Lifted ${suspendType === "holiday" ? "holiday" : "suspension"} for ${viewDateStr}`,
          }),
        });
      } catch { /* non-fatal */ }

      invalidateCache(`dashboard:attendance:${viewDateStr}`);
      setLoading(true);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSuspendLoading(false);
    }
  };

  const handleLoadPHHolidays = async () => {
    setHolidayLoading(true);
    setHolidayResult(null);
    try {
      const res = await fetch(`/api/holidays?year=${holidayYear}`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setHolidayResult({ seeded: json.seeded });
        invalidateCache(`dashboard:attendance:${viewDateStr}`);
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHolidayLoading(false);
    }
  };

  // Multi-date range export
  const handleRangeExport = async () => {
    if (!exportStartDate || !exportEndDate) return;
    setExportLoading(true);
    try {
      // Fetch all attendance records for the range
      const res = await fetch(`/api/attendance?startDate=${exportStartDate}&endDate=${exportEndDate}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch");

      const rows: string[][] = [];
      const headers = ["Date", "Teacher Name", "Group", "Time In", "Time Out", "Status"];
      rows.push(headers);

      // Build a set of suspended dates with types for CSV labeling
      const suspMap = new Map<string, "suspension" | "holiday">();
      if (Array.isArray(json.suspendedDays)) {
        for (const sd of json.suspendedDays) {
          suspMap.set(sd.dateStr, sd.type);
        }
      }

      // Generate every date in range
      const start = new Date(`${exportStartDate}T00:00:00`);
      const end = new Date(`${exportEndDate}T00:00:00`);
      const recMap = new Map<string, AttendanceRecord[]>();
      for (const r of json.data as AttendanceRecord[]) {
        if (!recMap.has(r.dateStr)) recMap.set(r.dateStr, []);
        recMap.get(r.dateStr)!.push(r);
      }

      const cur = new Date(start);
      while (cur <= end) {
        const dStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
        const dateLabel = cur.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
        const dayRecs = recMap.get(dStr) || [];
        const suspType = suspMap.get(dStr);

        if (suspType) {
          rows.push([`"${dateLabel}"`, `"—"`, `"—"`, `"—"`, `"—"`, `"${suspType === "holiday" ? "Holiday" : "Suspended"}"`]);
        } else if (dayRecs.length === 0) {
          rows.push([`"${dateLabel}"`, `"(No records)"`, `""`, `""`, `""`, `""`]);
        } else {
          for (const r of dayRecs) {
            const timeIn = r.clockInTime
              ? new Date(r.clockInTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" })
              : "—";
            const timeOut = r.clockOutTime
              ? new Date(r.clockOutTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" })
              : "—";
            rows.push([`"${dateLabel}"`, `"${r.name}"`, `"${r.group}"`, `"${timeIn}"`, `"${timeOut}"`, `"${r.status}"`]);
          }
        }
        cur.setDate(cur.getDate() + 1);
      }

      const csv = rows.map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `attendance_${exportStartDate}_to_${exportEndDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowExportModal(false);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExportLoading(false);
    }
  };

  // Build a map of teacherUid → record for today
  const recordByUid = new Map<string, AttendanceRecord>();
  for (const r of records) {
    recordByUid.set(r.teacherUid, r);
  }

  const handleCorrectTimes = async (
    recordId: string,
    teacherName: string,
    clockInTime: string | null,
    clockOutTime: string | null
  ) => {
    try {
      await fetch("/api/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: recordId,
          action: "correct-times",
          clockInTime,
          clockOutTime,
          correctedBy: userProfile?.fullName || user?.email || "admin",
        }),
      });

      try {
        const parts: string[] = [];
        if (clockInTime) {
          const t = new Date(clockInTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" });
          parts.push(`Clock-in set to ${t}`);
        }
        if (clockOutTime) {
          const t = new Date(clockOutTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" });
          parts.push(`Clock-out set to ${t}`);
        }
        await fetch("/api/audit-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorUid: user?.uid || null,
            actorName: userProfile?.fullName || user?.email || "Unknown",
            actorRole: userProfile?.role || "admin",
            action: "EDIT",
            category: "attendance",
            targetId: recordId,
            targetTitle: teacherName,
            details: `Manual time correction for ${teacherName} on ${viewDateStr}: ${parts.join(", ")}`,
          }),
        });
      } catch { /* non-fatal */ }

      invalidateCache(`dashboard:attendance:${viewDateStr}`);
      await fetchData();
    } catch (e) {
      console.error("Failed to correct times:", e);
    }
  };

  const handleToggleExempt = async (uid: string, currentlyExempt: boolean) => {
    setExemptLoading(true);
    try {
      const action = currentlyExempt ? "remove" : "exempt";
      await fetch("/api/attendance/exempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherUid: uid, dateStr: viewDateStr, action })
      });
      invalidateCache(`dashboard:attendance:${viewDateStr}`);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setExemptLoading(false);
    }
  };

  // Compute per-account daily statuses
  type AccountStatus = "On Time" | "Late" | "Absent" | "Exempt" | "No Work Day" | "Suspended" | "Holiday";
  const accountStatuses: { account: AccountDoc; dailyStatus: AccountStatus }[] = accounts.map((acc) => {
    const uid = acc.id || acc._id || "";
    const record = recordByUid.get(uid) ?? null;
    const dailyStatus = computeDailyStatus(
      record,
      {
        workDays: acc.workDays ?? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        noTimeLog: acc.noTimeLog || exemptions.includes(uid),
        weeklyHoursTarget: acc.weeklyHoursTarget ?? null,
      },
      viewDate,
      isSuspended,
      suspendType ?? "suspension"
    ) as AccountStatus;
    return { account: acc, dailyStatus };
  });

  // Metrics
  const workingToday = accountStatuses.filter((a) => a.dailyStatus !== "No Work Day");
  const present = workingToday.filter((a) => a.dailyStatus === "On Time" || a.dailyStatus === "Late" || a.dailyStatus === "Exempt").length;
  const late = isSuspended ? 0 : workingToday.filter((a) => a.dailyStatus === "Late").length;
  const absent = isSuspended ? 0 : workingToday.filter((a) => a.dailyStatus === "Absent").length;
  const onLeave = accounts.filter((a) => a.status === "on-leave").length;
  const dayOffCount = isSuspended ? workingToday.filter((a) => a.dailyStatus === "Suspended" || a.dailyStatus === "Holiday").length : 0;

  const isHolidayDay = isSuspended && suspendType === "holiday";

  const attendanceMetrics = isSuspended
    ? [
        { label: "CAME IN", value: present.toString(), type: "present" as const },
        { label: isHolidayDay ? "HOLIDAY" : "SUSPENDED", value: dayOffCount.toString(), type: "absent" as const },
        { label: "ON LEAVE", value: onLeave.toString(), type: "leave" as const },
      ]
    : [
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

    let displayStatus: StaffAttendance["status"] = "Absent";
    if (dailyStatus === "Suspended") displayStatus = "Suspended";
    else if (dailyStatus === "Holiday") displayStatus = "Holiday";
    else if (dailyStatus === "On Time") displayStatus = "On Time";
    else if (dailyStatus === "Late") displayStatus = "Late";
    else if (dailyStatus === "Exempt") displayStatus = "Exempt";
    else if (dailyStatus === "Absent") displayStatus = "Absent";

    const isExempt = exemptions.includes(uid) || !!account.noTimeLog;
    if (isExempt && displayStatus === "Absent") displayStatus = "Exempt";

    return {
      id: uid,
      recordId: record?._id,
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
      isExempt,
    };
  });

  return (
    <AppShell title="Attendance" description="Track daily check-ins and monitor staff availability.">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-[3px] bg-[#ffb800]" />
          <h1 className="text-[14px] font-black uppercase tracking-[0.1em] text-[#002f76]">
            Daily Attendance Overview
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-[180px]">
            <CustomDatePicker
              selectedDate={viewDateStr}
              onChange={(d) => d && setViewDateStr(d)}
              triggerClassName="flex items-center justify-between w-full rounded-xl border-2 border-[#e2e8f0] bg-white px-4 py-2 text-[12px] font-bold text-[#002f76] transition-all hover:bg-[#f8faff] focus:border-[#0050d5]"
            />
          </div>

          {/* Export Range Button */}
          <button
            onClick={() => {
              setExportStartDate(viewDateStr);
              setExportEndDate(viewDateStr);
              setShowExportModal(true);
            }}
            className="flex items-center gap-2 rounded-xl border-2 border-[#d6e4ff] bg-[#f0f5ff] px-4 py-2 text-[12px] font-bold text-[#005cc8] hover:bg-[#dbeafe] transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>download</span>
            Export Range
          </button>

          {/* PH Holiday Loader */}
          <button
            onClick={() => { setShowHolidayModal(true); setHolidayResult(null); }}
            className="flex items-center gap-2 rounded-xl border-2 border-[#fef08a] bg-[#fefce8] px-4 py-2 text-[12px] font-bold text-[#854d0e] hover:bg-[#fef9c3] transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>calendar_today</span>
            PH Holidays
          </button>

          {/* Mark Day Off / Undo Button */}
          {isSuspended ? (
            <button
              onClick={handleUndoDayOff}
              disabled={suspendLoading}
              className="flex items-center gap-2 rounded-xl border-2 border-orange-200 bg-orange-50 px-4 py-2 text-[12px] font-bold text-orange-700 hover:bg-orange-100 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>undo</span>
              {suspendType === "holiday" ? "Undo Holiday" : "Undo Suspension"}
            </button>
          ) : (
            <button
              onClick={() => { setShowMarkDayOffModal(true); setSuspendDateInput(viewDateStr); }}
              className="flex items-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-[12px] font-bold text-red-700 hover:bg-red-100 transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>event_busy</span>
              Mark Day Off
            </button>
          )}
        </div>
      </div>

      {/* Day-Off Banner */}
      {isSuspended && (
        isHolidayDay ? (
          /* Holiday Banner — gold/green */
          <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-amber-600" style={{ fontSize: "20px" }}>celebration</span>
            </div>
            <div>
              <p className="font-black text-[13px] text-amber-800 uppercase tracking-wide">Public Holiday — No Classes Today</p>
              {suspendReason && (
                <p className="text-[12px] font-semibold text-amber-700 mt-0.5">
                  {suspendReason}
                </p>
              )}
              <p className="text-[11px] text-amber-600 mt-1">
                This is a paid holiday for monthly staff. Daily-rate staff follow no-work-no-pay rules.
              </p>
            </div>
          </div>
        ) : (
          /* Suspension Banner — orange */
          <div className="flex items-start gap-3 rounded-2xl border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 p-4 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-orange-600" style={{ fontSize: "20px" }}>warning</span>
            </div>
            <div>
              <p className="font-black text-[13px] text-orange-800 uppercase tracking-wide">Classes Suspended Today</p>
              {suspendReason && (
                <p className="text-[12px] font-semibold text-orange-700 mt-0.5">
                  Reason: <span className="font-bold">{suspendReason}</span>
                </p>
              )}
              <p className="text-[11px] text-orange-600 mt-1">
                No staff will be marked Late or Absent for today. Teachers who came in can still clock out normally.
              </p>
            </div>
          </div>
        )
      )}

      {/* Metric cards */}
      <section className={`grid gap-5 shrink-0 ${isSuspended ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
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
          <AttendanceRoster
            data={roster}
            dateStr={viewDateStr}
            onToggleExempt={handleToggleExempt}
            exemptLoading={exemptLoading}
            onCorrectTimes={handleCorrectTimes}
          />
        )}
      </section>

      {/* ── Mark Day Off Modal ── */}
      {showMarkDayOffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !suspendLoading && setShowMarkDayOffModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md mx-4 z-10">
            {/* Type toggle */}
            <div className="flex rounded-2xl border-2 border-[#e2e8f0] overflow-hidden mb-5">
              <button
                onClick={() => setDayOffType("suspension")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-black transition-all ${dayOffType === "suspension" ? "bg-red-600 text-white" : "text-[#5a6e8c] hover:bg-[#f8faff]"}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>block</span>
                Suspension
              </button>
              <button
                onClick={() => setDayOffType("holiday")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-black transition-all ${dayOffType === "holiday" ? "bg-amber-500 text-white" : "text-[#5a6e8c] hover:bg-[#f8faff]"}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>celebration</span>
                Holiday
              </button>
            </div>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mx-auto ${dayOffType === "holiday" ? "bg-amber-50" : "bg-red-50"}`}>
              <span className={`material-symbols-outlined ${dayOffType === "holiday" ? "text-amber-500" : "text-red-600"}`} style={{ fontSize: "30px" }}>
                {dayOffType === "holiday" ? "celebration" : "block"}
              </span>
            </div>

            <h2 className="text-[18px] font-black text-[#002f76] text-center mb-1">
              {dayOffType === "holiday" ? "Mark as Holiday" : "Suspend Classes"}
            </h2>
            <p className="text-[12px] font-medium text-[#5a6e8c] text-center mb-5">
              {dayOffType === "holiday"
                ? <>All staff will be marked <span className="font-bold text-amber-600">&quot;Holiday&quot;</span> for the selected date. Monthly staff (Angel) will be paid; daily staff will not.</>
                : <>All staff will be marked <span className="font-bold text-orange-600">&quot;Suspended&quot;</span> for the selected date. No one will be penalized as Late or Absent.</>
              }
            </p>

            {/* Target Date */}
            <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">
              Target Date
            </label>
            <div className="mb-4">
              <CustomDatePicker
                selectedDate={suspendDateInput}
                onChange={(d) => setSuspendDateInput(d || todayStr)}
                triggerClassName="w-full flex items-center justify-between gap-2.5 rounded-xl border-2 border-[#e2e8f0] bg-[#f8faff] px-4 py-2.5 text-[13px] font-bold text-[#002f76] transition-all hover:bg-white focus:border-[#0050d5]"
              />
            </div>

            {/* Reason */}
            <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">
              Reason <span className="text-[#9aa3b2] font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder={dayOffType === "holiday" ? "e.g. Ninoy Aquino Day, National Heroes Day..." : "e.g. Typhoon, Emergency..."}
              value={suspendInput}
              onChange={(e) => setSuspendInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !suspendLoading && handleMarkDayOff()}
              className="w-full rounded-xl border-2 border-[#e2e8f0] bg-[#f8faff] px-4 py-2.5 text-[13px] font-bold text-[#002f76] outline-none focus:border-[#0050d5] focus:bg-white transition-all mb-4"
            />

            {/* Auto Announce */}
            <div className="flex items-center gap-2 mb-6 ml-1">
              <input
                type="checkbox"
                id="autoAnnounce"
                checked={autoAnnounce}
                onChange={(e) => setAutoAnnounce(e.target.checked)}
                className="w-4 h-4 text-[#005cc8] rounded border-gray-300 focus:ring-[#005cc8]"
              />
              <label htmlFor="autoAnnounce" className="text-[12px] font-bold text-[#002f76] cursor-pointer">
                Auto-generate announcement
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowMarkDayOffModal(false); setSuspendInput(""); }}
                disabled={suspendLoading}
                className="flex-1 rounded-xl border-2 border-[#e2e8f0] py-2.5 text-[13px] font-bold text-[#5a6e8c] hover:bg-[#f0f4f9] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkDayOff}
                disabled={suspendLoading}
                className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${dayOffType === "holiday" ? "bg-amber-500 hover:bg-amber-600" : "bg-red-600 hover:bg-red-700"}`}
              >
                {suspendLoading ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                    {dayOffType === "holiday" ? "celebration" : "block"}
                  </span>
                )}
                {suspendLoading ? "Saving..." : dayOffType === "holiday" ? "Mark as Holiday" : "Suspend Classes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PH Holiday Loader Modal ── */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !holidayLoading && setShowHolidayModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm mx-4 z-10">
            <div className="w-14 h-14 rounded-2xl bg-yellow-50 flex items-center justify-center mb-4 mx-auto">
              <span className="material-symbols-outlined text-yellow-500" style={{ fontSize: "30px" }}>calendar_today</span>
            </div>
            <h2 className="text-[18px] font-black text-[#002f76] text-center mb-1">Load PH Holidays</h2>
            <p className="text-[12px] font-medium text-[#5a6e8c] text-center mb-5">
              Automatically import Philippine public holidays from the official calendar via Nager.Date.
            </p>

            <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">Year</label>
            <input
              type="number"
              value={holidayYear}
              onChange={(e) => setHolidayYear(e.target.value)}
              className="w-full rounded-xl border-2 border-[#e2e8f0] bg-[#f8faff] px-4 py-2.5 text-[13px] font-bold text-[#002f76] outline-none focus:border-[#0050d5] focus:bg-white transition-all mb-4"
            />

            {holidayResult && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl mb-4">
                <span className="material-symbols-outlined text-green-600" style={{ fontSize: "16px" }}>check_circle</span>
                <p className="text-[12px] font-bold text-green-700">
                  Loaded {holidayResult.seeded} holidays for {holidayYear}!
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowHolidayModal(false)}
                disabled={holidayLoading}
                className="flex-1 rounded-xl border-2 border-[#e2e8f0] py-2.5 text-[13px] font-bold text-[#5a6e8c] hover:bg-[#f0f4f9] transition-all disabled:opacity-50"
              >
                Close
              </button>
              <button
                onClick={handleLoadPHHolidays}
                disabled={holidayLoading}
                className="flex-1 rounded-xl bg-yellow-500 hover:bg-yellow-600 py-2.5 text-[13px] font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {holidayLoading ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>download</span>
                )}
                {holidayLoading ? "Loading..." : `Load ${holidayYear} Holidays`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Multi-date Export Modal ── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !exportLoading && setShowExportModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md mx-4 z-10">
            <div className="w-14 h-14 rounded-2xl bg-[#f0f5ff] flex items-center justify-center mb-4 mx-auto">
              <span className="material-symbols-outlined text-[#005cc8]" style={{ fontSize: "30px" }}>table_chart</span>
            </div>
            <h2 className="text-[18px] font-black text-[#002f76] text-center mb-1">Export Attendance Range</h2>
            <p className="text-[12px] font-medium text-[#5a6e8c] text-center mb-5">
              Download a CSV with all attendance records between the selected dates.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">Start Date</label>
                <CustomDatePicker
                  selectedDate={exportStartDate}
                  onChange={(d) => d && setExportStartDate(d)}
                  triggerClassName="w-full flex items-center justify-between gap-2 rounded-xl border-2 border-[#e2e8f0] bg-[#f8faff] px-3 py-2 text-[12px] font-bold text-[#002f76] transition-all hover:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">End Date</label>
                <CustomDatePicker
                  selectedDate={exportEndDate}
                  onChange={(d) => d && setExportEndDate(d)}
                  triggerClassName="w-full flex items-center justify-between gap-2 rounded-xl border-2 border-[#e2e8f0] bg-[#f8faff] px-3 py-2 text-[12px] font-bold text-[#002f76] transition-all hover:bg-white"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                disabled={exportLoading}
                className="flex-1 rounded-xl border-2 border-[#e2e8f0] py-2.5 text-[13px] font-bold text-[#5a6e8c] hover:bg-[#f0f4f9] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRangeExport}
                disabled={exportLoading || !exportStartDate || !exportEndDate}
                className="flex-1 rounded-xl bg-[#005cc8] hover:bg-[#004bb0] py-2.5 text-[13px] font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {exportLoading ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>download</span>
                )}
                {exportLoading ? "Exporting..." : "Download CSV"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
