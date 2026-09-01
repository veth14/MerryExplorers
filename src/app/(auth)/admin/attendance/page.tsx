"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { AttendanceMetricCard } from "@/components/attendance/attendance-metric-card";
import { AttendanceRoster } from "@/components/attendance/attendance-roster";
import type { StaffAttendance } from "@/data/attendance";
import { cachedFetch, invalidateCache } from "@/lib/cache";
import { Skeleton } from "@/components/ui/skeleton";
import { computeDailyStatus } from "@/lib/attendance-rules";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { useAuth } from "@/lib/auth-context";
import { WeeklyView } from "@/components/attendance/weekly-view";
import { MonthlyView } from "@/components/attendance/monthly-view";

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



  // Multi-date export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportGroupBy, setExportGroupBy] = useState<"date" | "teacher" | "group">("date");
  const [exportLoading, setExportLoading] = useState(false);

  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly">("daily");
  const [printHtml, setPrintHtml] = useState<string | null>(null);

  // Weekly navigation — start of current week (Monday)
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  });

  // Monthly navigation
  const [monthRef, setMonthRef] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

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

  // Multi-date range export — opens branded print-to-PDF window
  const handleRangeExport = async () => {
    if (!exportStartDate || !exportEndDate) return;
    setExportLoading(true);
    try {
      const res = await fetch(`/api/attendance?startDate=${exportStartDate}&endDate=${exportEndDate}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch");

      // Build suspended days map
      const suspMap = new Map<string, { type: "suspension" | "holiday"; reason?: string }>();
      if (Array.isArray(json.suspendedDays)) {
        for (const sd of json.suspendedDays) {
          suspMap.set(sd.dateStr, { type: sd.type, reason: sd.reason });
        }
      }

      // Build records map: dateStr → records[]
      const recMap = new Map<string, AttendanceRecord[]>();
      for (const r of json.data as AttendanceRecord[]) {
        if (!recMap.has(r.dateStr)) recMap.set(r.dateStr, []);
        recMap.get(r.dateStr)!.push(r);
      }

      // ── Build HTML rows ────────────────────────────────────────────────────
      type RowData = {
        dateLabel: string;
        name: string;
        group: string;
        timeIn: string;
        timeOut: string;
        status: string;
        rowType: "normal" | "suspension" | "holiday" | "norecord";
        dateStr?: string;
      };

      const tableRows: RowData[] = [];
      const start = new Date(`${exportStartDate}T00:00:00`);
      const end   = new Date(`${exportEndDate}T00:00:00`);
      const cur   = new Date(start);

      while (cur <= end) {
        const dStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
        const dateLabel = cur.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
        const susp = suspMap.get(dStr);
        const dayRecs = recMap.get(dStr) || [];

        if (susp) {
          tableRows.push({ dateLabel, name: "—", group: "—", timeIn: "—", timeOut: "—",
            status: susp.type === "holiday" ? "Holiday" : "Suspended",
            rowType: susp.type === "holiday" ? "holiday" : "suspension",
            dateStr: dStr
          });
        } else if (dayRecs.length === 0) {
          tableRows.push({ dateLabel, name: "(No records)", group: "", timeIn: "", timeOut: "", status: "", rowType: "norecord", dateStr: dStr });
        } else {
          for (const r of dayRecs) {
            const timeIn  = r.clockInTime  ? new Date(r.clockInTime).toLocaleTimeString("en-US",  { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" }) : "—";
            const timeOut = r.clockOutTime ? new Date(r.clockOutTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" }) : "—";
            tableRows.push({ dateLabel, name: r.name, group: r.group, timeIn, timeOut, status: r.status, rowType: "normal", dateStr: dStr });
          }
        }
        cur.setDate(cur.getDate() + 1);
      }

      // Grouping logic
      const groupedRows = new Map<string, RowData[]>();
      
      if (exportGroupBy === "date") {
        groupedRows.set("Chronological", tableRows);
      } else if (exportGroupBy === "teacher") {
        for (const r of tableRows) {
          const key = r.rowType === "normal" ? r.name : "System/Holidays";
          if (!groupedRows.has(key)) groupedRows.set(key, []);
          groupedRows.get(key)!.push(r);
        }
      } else if (exportGroupBy === "group") {
        for (const r of tableRows) {
          const key = r.rowType === "normal" ? r.group : "System/Holidays";
          if (!groupedRows.has(key)) groupedRows.set(key, []);
          groupedRows.get(key)!.push(r);
        }
      }

      // ── Generate row HTML ─────────────────────────────────────────────────
      const statusBadge = (status: string) => {
        const map: Record<string, string> = {
          "On Time":   "background:#e8f4fd;color:#005cc8;border:1px solid #bfdbfe;",
          "Late":      "background:#fffbeb;color:#d97706;border:1px solid #fde68a;",
          "Absent":    "background:#fef2f2;color:#dc2626;border:1px solid #fecaca;",
          "Completed": "background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;",
          "Suspended": "background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;",
          "Holiday":   "background:#fffbeb;color:#92400e;border:1px solid #fde68a;",
          "Exempt (Flexible)": "background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;",
        };
        const style = map[status] || "background:#f8fafc;color:#475569;border:1px solid #e2e8f0;";
        return status
          ? `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;white-space:nowrap;${style}">${status}</span>`
          : "";
      };

      const rowBg = (r: RowData, i: number) => {
        if (r.rowType === "holiday")    return "#fffbeb";
        if (r.rowType === "suspension") return "#fff7ed";
        if (r.rowType === "norecord")   return "#f8fafc";
        return i % 2 === 0 ? "#ffffff" : "#f8faff";
      };

      let tablesHtml = "";
      for (const [groupName, rows] of groupedRows.entries()) {
        const rowsHtml = rows.map((r, i) => `
          <tr style="background:${rowBg(r, i)};">
            <td>${r.dateLabel}</td>
            <td style="font-weight:${r.rowType === "normal" ? "600" : "400"};color:${r.rowType === "norecord" ? "#94a3b8" : "#002f76"};">${r.name}</td>
            <td style="color:#005cc8;font-weight:600;">${r.group}</td>
            <td>${r.timeIn}</td>
            <td>${r.timeOut}</td>
            <td>${statusBadge(r.status)}</td>
          </tr>`).join("");

        tablesHtml += `
          ${exportGroupBy !== "date" ? `<div class="group-title">${groupName}</div>` : ""}
          <table>
            <thead>
              <tr>
                <th style="width:15%">Date</th>
                <th style="width:22%">Teacher Name</th>
                <th style="width:18%">Group</th>
                <th style="width:12%">Time In</th>
                <th style="width:12%">Time Out</th>
                <th style="width:21%">Status</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <br/>
        `;
      }

      const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const generatedAt = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
      const logoSrc = `${window.location.origin}/LOGO-noBG.png`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Attendance Report — ${fmtDate(exportStartDate)} to ${fmtDate(exportEndDate)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Inter',sans-serif;color:#1e293b;background:#fff;font-size:11px;}
    @page{size:A4 landscape;margin:12mm 14mm;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}

    /* ── Header ── */
    .header{display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:3px solid #002f76;margin-bottom:12px;}
    .logo-wrap{display:flex;align-items:center;gap:10px;}
    .logo{width:48px;height:48px;object-fit:contain;}
    .school-name{font-size:18px;font-weight:900;color:#002f76;letter-spacing:-0.5px;line-height:1.15;}
    .school-sub{font-size:9px;font-weight:600;color:#5a6e8c;text-transform:uppercase;letter-spacing:1px;}
    .report-meta{text-align:right;}
    .report-title{font-size:13px;font-weight:800;color:#002f76;}
    .report-range{font-size:10px;color:#5a6e8c;font-weight:600;margin-top:2px;}
    .accent-bar{width:36px;height:3px;background:#ffb800;border-radius:4px;margin:4px 0 0 auto;}

    /* ── Summary badges ── */
    .summary{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;}
    .badge{display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:9px;font-weight:700;border:1px solid;}
    .b-total{background:#f0f5ff;color:#002f76;border-color:#bfdbfe;}
    .b-on-time{background:#f0fdf4;color:#15803d;border-color:#bbf7d0;}
    .b-late{background:#fffbeb;color:#d97706;border-color:#fde68a;}
    .b-absent{background:#fef2f2;color:#dc2626;border-color:#fecaca;}
    .b-holiday{background:#fffbeb;color:#92400e;border-color:#fde68a;}
    .b-susp{background:#fff7ed;color:#c2410c;border-color:#fed7aa;}

    /* ── Table ── */
    .group-title{font-size:14px;font-weight:900;color:#002f76;margin:15px 0 8px;padding-left:4px;border-left:4px solid #ffb800;}
    table{width:100%;border-collapse:collapse;margin-bottom:10px;}
    thead tr{background:linear-gradient(135deg,#002f76 0%,#0050d5 100%);}
    th{color:#fff;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;padding:6px 8px;text-align:left;}
    td{padding:5px 8px;font-size:10px;color:#334155;border-bottom:1px solid #f1f5f9;vertical-align:middle;}
    tr:last-child td{border-bottom:none;}

    /* ── Footer ── */
    .footer{margin-top:12px;display:flex;justify-content:space-between;align-items:flex-end;border-top:1.5px solid #e2e8f0;padding-top:8px;page-break-inside:avoid;}
    .footer-left{font-size:8.5px;color:#94a3b8;font-weight:500;}
    .footer-right{font-size:8.5px;color:#94a3b8;font-weight:500;text-align:right;}
    .sig-line{width:140px;border-top:1.5px solid #334155;padding-top:3px;margin-top:20px;font-size:8px;color:#5a6e8c;font-weight:600;text-align:center;}
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-wrap">
      <img class="logo" src="${logoSrc}" alt="Merry Explorers Logo"/>
      <div>
        <div class="school-name">Merry Explorers</div>
        <div class="school-sub">Learning Center</div>
      </div>
    </div>
    <div class="report-meta">
      <div class="report-title">Attendance Report</div>
      <div class="report-range">${fmtDate(exportStartDate)} &mdash; ${fmtDate(exportEndDate)}</div>
      <div class="accent-bar"></div>
    </div>
  </div>

  <div class="summary">
    <span class="badge b-total">📋 ${tableRows.filter(r => r.rowType === "normal").length} Records</span>
    <span class="badge b-on-time">✓ ${tableRows.filter(r => r.status === "On Time").length} On Time</span>
    <span class="badge b-late">⚠ ${tableRows.filter(r => r.status === "Late").length} Late</span>
    <span class="badge b-absent">✗ ${tableRows.filter(r => r.status === "Absent").length} Absent</span>
    <span class="badge b-holiday">🎉 ${tableRows.filter(r => r.rowType === "holiday").length} Holidays</span>
    <span class="badge b-susp">⛔ ${tableRows.filter(r => r.rowType === "suspension").length} Suspensions</span>
  </div>

  ${tablesHtml}

  <div class="footer">
    <div class="footer-left">
      Generated: ${generatedAt} (Philippine Time)<br/>
      Merry Explorers Attendance Management System
    </div>
    <div class="footer-right">
      <div class="sig-line">Authorized Signature &amp; Date</div>
    </div>
  </div>

  <\/div>

<\/body>
<\/html>`;

      setPrintHtml(html);
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

  if (printHtml) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white">
        <iframe
          srcDoc={printHtml}
          className="w-full h-full border-none"
          title="Print Preview"
        />
        <div className="absolute top-4 right-4 flex gap-3">
          <button
            onClick={() => setPrintHtml(null)}
            className="rounded-xl border-2 border-[#e2e8f0] bg-white px-5 py-2.5 text-[13px] font-bold text-[#5a6e8c] hover:bg-[#f8fafc] shadow-sm transition-all"
          >
            Close Preview
          </button>
        </div>
      </div>
    );
  }

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

      {/* View Tabs */}
      <div className="flex bg-[#f1f5f9] rounded-2xl p-1.5 w-fit">
        {(["daily", "weekly", "monthly"] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-6 py-2 rounded-xl text-[13px] font-bold capitalize transition-all ${viewMode === mode ? "bg-white text-[#002f76] shadow-sm" : "text-[#5a6e8c] hover:text-[#002f76]"}`}
          >
            {mode}
          </button>
        ))}
      </div>

      {viewMode === "weekly" && (
        <WeeklyView
          weekStart={weekStart}
          onWeekChange={(delta) => {
            const next = new Date(weekStart);
            next.setDate(next.getDate() + delta * 7);
            setWeekStart(next);
          }}
        />
      )}

      {viewMode === "monthly" && (
        <MonthlyView
          year={monthRef.year}
          month={monthRef.month}
          onMonthChange={(delta) => {
            const next = new Date(monthRef.year, monthRef.month + delta, 1);
            setMonthRef({ year: next.getFullYear(), month: next.getMonth() });
          }}
        />
      )}

      {viewMode === "daily" && (
        <>
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
      </>
      )}

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

      {/* ── Multi-date Export Modal ── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !exportLoading && setShowExportModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md mx-4 z-10">
            <div className="w-14 h-14 rounded-2xl bg-[#f0f5ff] flex items-center justify-center mb-4 mx-auto">
              <span className="material-symbols-outlined text-[#005cc8]" style={{ fontSize: "30px" }}>picture_as_pdf</span>
            </div>
            <h2 className="text-[18px] font-black text-[#002f76] text-center mb-1">Export Attendance as PDF</h2>
            <p className="text-[12px] font-medium text-[#5a6e8c] text-center mb-5">
              Opens a branded PDF preview with all attendance records between the selected dates. Print or save it as a file.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
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

            <div className="mb-5">
              <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">Group Records By</label>
              <select
                value={exportGroupBy}
                onChange={(e) => setExportGroupBy(e.target.value as any)}
                className="w-full rounded-xl border-2 border-[#e2e8f0] bg-[#f8faff] px-4 py-2.5 text-[13px] font-bold text-[#002f76] outline-none focus:border-[#0050d5] focus:bg-white transition-all appearance-none"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23002f76%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
              >
                <option value="date">Date (Chronological)</option>
                <option value="teacher">Teacher Name</option>
                <option value="group">Class / Group</option>
              </select>
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
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>picture_as_pdf</span>
                )}
                {exportLoading ? "Generating..." : "Generate PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
