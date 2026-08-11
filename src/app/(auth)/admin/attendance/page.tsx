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
  const [suspendReason, setSuspendReason] = useState<string | null>(null);
  const [exemptions, setExemptions] = useState<string[]>([]);
  const [exemptLoading, setExemptLoading] = useState(false);

  // Suspend modal state
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendInput, setSuspendInput] = useState("");
  const [suspendLoading, setSuspendLoading] = useState(false);

  const [viewDateStr, setViewDateStr] = useState(() => {
    const manilaStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    const d = new Date(manilaStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [attendanceJson, accountsJson] = await Promise.all([
        cachedFetch<any>(`dashboard:attendance:${viewDateStr}`, `/api/attendance?date=${viewDateStr}`, 20_000),
        cachedFetch<any[]>("accounts:all", "/api/accounts", 60_000),
      ]);
      if (attendanceJson?.success) {
        setRecords(attendanceJson.data);
        setIsSuspended(attendanceJson.isSuspended ?? false);
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

  // Safe parse for local day checking (e.g. "2026-08-01T00:00:00")
  const viewDate = new Date(`${viewDateStr}T00:00:00`);
  
  // Keep todayStr for defaulting Suspend modal
  const today = new Date();
  const todayStr = (() => {
    const manilaStr = today.toLocaleString("en-US", { timeZone: "Asia/Manila" });
    const d = new Date(manilaStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  })();

  const [suspendDateInput, setSuspendDateInput] = useState(todayStr);
  const [autoAnnounce, setAutoAnnounce] = useState(true);

  const handleSuspend = async () => {
    setSuspendLoading(true);
    try {
      await fetch("/api/attendance/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateStr: suspendDateInput, reason: suspendInput.trim() || "Suspension announced" }),
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
            category: "suspension",
            targetId: suspendDateInput,
            targetTitle: suspendDateInput,
            details: `Suspended classes on ${suspendDateInput} for: ${suspendInput.trim() || "Suspension announced"}`,
          }),
        });
      } catch { /* non-fatal */ }

      if (autoAnnounce) {
        const suspendReason = suspendInput.trim() || "Suspension announced";
        const startDate = new Date().toISOString(); // Start immediately
        // End date at 11:59 PM of the suspended day
        const endDateObj = new Date(suspendDateInput);
        endDateObj.setHours(23, 59, 59, 999);
        
        await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Classes Suspended: ${suspendDateInput}`,
            content: `Please be advised that classes are suspended on ${suspendDateInput}. Reason: ${suspendReason}.`,
            type: "alert",
            startDate: startDate,
            endDate: endDateObj.toISOString(),
          }),
        });
      }

      invalidateCache(`dashboard:attendance:${viewDateStr}`);
      setShowSuspendModal(false);
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

  const handleUndoSuspend = async () => {
    setSuspendLoading(true);
    try {
      await fetch(`/api/attendance/suspend?dateStr=${viewDateStr}`, { method: "DELETE" });
      
      // Write audit log
      try {
        await fetch("/api/audit-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorUid: user?.uid || null,
            actorName: userProfile?.fullName || user?.email || "Unknown",
            actorRole: userProfile?.role || "Unknown",
            action: "DELETE",
            category: "suspension",
            targetId: viewDateStr,
            targetTitle: viewDateStr,
            details: `Lifted suspension for ${viewDateStr}`,
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

  // Build a map of teacherUid → record for today
  const recordByUid = new Map<string, AttendanceRecord>();
  for (const r of records) {
    recordByUid.set(r.teacherUid, r);
  }

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
  type AccountStatus = "On Time" | "Late" | "Absent" | "Exempt" | "No Work Day" | "Suspended";
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
      isSuspended
    ) as AccountStatus;
    return { account: acc, dailyStatus };
  });

  // Metrics
  const workingToday = accountStatuses.filter((a) => a.dailyStatus !== "No Work Day");
  const present = workingToday.filter((a) => a.dailyStatus === "On Time" || a.dailyStatus === "Late" || a.dailyStatus === "Exempt").length;
  const late = isSuspended ? 0 : workingToday.filter((a) => a.dailyStatus === "Late").length;
  const absent = isSuspended ? 0 : workingToday.filter((a) => a.dailyStatus === "Absent").length;
  const onLeave = accounts.filter((a) => a.status === "on-leave").length;
  const suspendedCount = isSuspended ? workingToday.filter((a) => a.dailyStatus === "Suspended").length : 0;

  const attendanceMetrics = isSuspended
    ? [
        { label: "CAME IN", value: present.toString(), type: "present" as const },
        { label: "SUSPENDED", value: suspendedCount.toString(), type: "absent" as const },
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
    else if (dailyStatus === "On Time") displayStatus = "On Time";
    else if (dailyStatus === "Late") displayStatus = "Late";
    else if (dailyStatus === "Exempt") displayStatus = "On Time";
    else if (dailyStatus === "Absent") displayStatus = "Absent";

    const isExempt = exemptions.includes(uid) || !!account.noTimeLog;
    if (isExempt && displayStatus === "Absent") displayStatus = "Exempt";

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

          {/* Suspend / Undo Button */}
          {isSuspended ? (
            <button
              onClick={handleUndoSuspend}
              disabled={suspendLoading}
              className="flex items-center gap-2 rounded-xl border-2 border-orange-200 bg-orange-50 px-4 py-2 text-[12px] font-bold text-orange-700 hover:bg-orange-100 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>undo</span>
              Undo Suspension
            </button>
          ) : (
            <button
              onClick={() => setShowSuspendModal(true)}
              className="flex items-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-[12px] font-bold text-red-700 hover:bg-red-100 transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>block</span>
              Suspend Classes
            </button>
          )}
        </div>
      </div>

      {/* Suspension Banner */}
      {isSuspended && (
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
          />
        )}
      </section>

      {/* Suspend Classes Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !suspendLoading && setShowSuspendModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md mx-4 z-10">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4 mx-auto">
              <span className="material-symbols-outlined text-red-600" style={{ fontSize: "30px" }}>block</span>
            </div>

            <h2 className="text-[18px] font-black text-[#002f76] text-center mb-1">Suspend Classes</h2>
            <p className="text-[12px] font-medium text-[#5a6e8c] text-center mb-5">
              All staff will be marked <span className="font-bold text-orange-600">"Suspended"</span> for the selected date. No one will be penalized as Late or Absent.
            </p>

            {/* Target Date Input */}
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

            {/* Reason Input */}
            <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">
              Reason <span className="text-[#9aa3b2] font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Typhoon, Public Holiday, Emergency..."
              value={suspendInput}
              onChange={(e) => setSuspendInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !suspendLoading && handleSuspend()}
              className="w-full rounded-xl border-2 border-[#e2e8f0] bg-[#f8faff] px-4 py-2.5 text-[13px] font-bold text-[#002f76] outline-none focus:border-[#0050d5] focus:bg-white transition-all mb-4"
            />

            {/* Auto Announce Checkbox */}
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
                onClick={() => { setShowSuspendModal(false); setSuspendInput(""); }}
                disabled={suspendLoading}
                className="flex-1 rounded-xl border-2 border-[#e2e8f0] py-2.5 text-[13px] font-bold text-[#5a6e8c] hover:bg-[#f0f4f9] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={suspendLoading}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-[13px] font-bold text-white hover:bg-red-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {suspendLoading ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>block</span>
                )}
                {suspendLoading ? "Suspending..." : "Suspend Classes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
