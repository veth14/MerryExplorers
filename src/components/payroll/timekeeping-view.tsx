"use client";

import { useState, useEffect } from "react";
import { m, AnimatePresence, type Variants  } from "framer-motion";
import {
  getBreakMinutes,
  BASE_SCHEDULE,
  type DayAbbr,
  computeLateDeduction,
  computeCreditedHours,
  type LateDeductionResult,
} from "@/lib/attendance-rules";

// ─── Types ────────────────────────────────────────────────────────────────────

type DayType = "WORK" | "DAY-OFF" | "HOLIDAY" | "ABSENT" | "LEAVE" | "FUTURE" | "SUSPENDED" | "FLEXIBLE";

type TimekeepingRow = {
  id: string;
  date: string;
  dayLabel: string;
  type: DayType;
  timeIn: string | null;
  timeOut: string | null;
  /** Raw clock-to-clock elapsed hours before breaks. Informational only — NOT used for pay. */
  numHours: number | null;
  breakHours: number | null;
  /** Schedule-clamped credited hours. Used for reference only. */
  totalHours: number | null;
  /** Late-arrival deduction amount for this day. null when not applicable. */
  lateDeduction: number | null;
  /** Which deduction method was applied. null when not applicable. */
  lateMethod: "none" | "per-minute" | "threshold" | null;
  remarks: string;
};

type TimekeepingSheet = {
  employeeId: string;
  name: string;
  position: string;
  monthlyRate: number;
  dailyRate: number;
  salaryDate: string;
  cutOffPeriod: string;
  grandTotal: number;
  /** Sum of all per-day late deductions for this cut-off period. */
  totalLateDeduction: number;
  weeklyHoursTarget?: number;
  rows: TimekeepingRow[];
};

type Account = {
  id: string;
  fullName: string;
  role?: string;
  employeeId?: string;
  monthlyRate?: number;
  dailyRate?: number;
  noTimeLog?: boolean;
  sssContribution?: number;
  philhealthContribution?: number;
  pagibigContribution?: number;
  communicationAllowance?: number;
  perfectAttendanceIncentive?: number;
  birthdayGift?: number;
  workDays?: string[];
  weeklyHoursTarget?: number;
};

type AttendanceRecord = {
  _id: string;
  teacherUid: string;
  name: string;
  dateStr: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  breaks: { start: string; end: string | null }[];
  group?: string;
  timeInStatus?: string;
};

// ─── Cut-off presets ──────────────────────────────────────────────────────────

function generateCutOffs(): { label: string; value: string; start: Date; end: Date }[] {
  const cutOffs = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthName = d.toLocaleString("en-US", { month: "long" });

    // Second half: 11–25
    const start2 = new Date(year, month, 11);
    const end2 = new Date(year, month, 25);
    const pay2 = new Date(year, month, 31);
    cutOffs.push({
      label: `${monthName} ${pay2.getDate()}, ${year} (${monthName.slice(0, 3)} 11–25)`,
      value: `${year}-${month}-2h`,
      start: start2,
      end: end2,
    });

    // First half: prev 26 – 10
    const start1 = new Date(year, month - 1, 26);
    const end1 = new Date(year, month, 10);
    const pay1 = new Date(year, month, 15);
    cutOffs.push({
      label: `${monthName} ${pay1.getDate()}, ${year} (${new Date(year, month - 1).toLocaleString("en-US", { month: "short" })} 26–${monthName.slice(0, 3)} 10)`,
      value: `${year}-${month}-1h`,
      start: start1,
      end: end1,
    });
  }

  // System began operation August 1, 2026. Earliest cutoff ends Aug 10.
  const cutoffLimit = new Date(2026, 7, 10);
  return cutOffs.filter(c => c.end >= cutoffLimit).slice(0, 10);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WORK_DAY_ABBRS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtTime12(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  });
}

function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

function fmtDateLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function eachDayInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function buildSheet(
  account: Account,
  attendanceMap: Map<string, AttendanceRecord>,
  cutOff: { label: string; value: string; start: Date; end: Date },
  leaveSet: Set<string>,
  suspendedSet: Set<string>
): TimekeepingSheet {
  const dailyRate = account.dailyRate ?? 0;
  const monthlyRate = account.monthlyRate ?? 0;
  const noTimeLog = account.noTimeLog ?? false;

  // Derive the rate used for late-deduction math only.
  // hourlyRate is no longer stored — computed from daily or monthly rate.
  // Assumes 8-hour workday and 22 working days per month.
  const rateForLate = monthlyRate > 0 ? monthlyRate / (22 * 8) : dailyRate / 8;

  // Work days abbreviated (e.g. ["Mon","Tue","Wed","Thu","Fri","Sat"])
  const accountWorkDays = new Set(account.workDays ?? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);

  const days = eachDayInRange(cutOff.start, cutOff.end);
  let grandTotal = 0;
  let totalLateDeduction = 0;
  const rows: TimekeepingRow[] = [];

  for (const day of days) {
    const dow = day.getDay(); // 0=Sun
    const abbr = WORK_DAY_ABBRS[dow];
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    const dayLabel = DAY_NAMES[dow];
    const dateLabel = fmtDateLabel(day);
    const isWorkDay = accountWorkDays.has(abbr);
    const rec = attendanceMap.get(dateStr);
    const isOnLeave = leaveSet.has(dateStr);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(day);
    dayDate.setHours(0, 0, 0, 0);
    const isFuture = dayDate > today;

    const isSuspendedDay = suspendedSet.has(dateStr);

    let type: DayType;
    if (!isWorkDay) {
      type = "DAY-OFF";
    } else if (isOnLeave) {
      type = "LEAVE";
    } else if (isSuspendedDay) {
      type = "SUSPENDED";
    } else if (!rec || !rec.clockInTime) {
      if (isFuture) type = "FUTURE";
      else if (account.weeklyHoursTarget) type = "FLEXIBLE"; // Neutral label instead of ABSENT or DAY-OFF
      else type = "ABSENT";
    } else {
      type = "WORK";
    }

    if (type !== "WORK") {
      rows.push({
        id: dateStr,
        date: dateLabel,
        dayLabel,
        type,
        timeIn: null,
        timeOut: null,
        numHours: null,
        breakHours: null,
        totalHours: type === "ABSENT" ? 0 : null,
        lateDeduction: null,
        lateMethod: null,
        remarks: type === "ABSENT" ? "Absent" : type === "LEAVE" ? "On Leave" : type === "FUTURE" ? "" : type === "SUSPENDED" ? "Suspended" : "",
      });
      continue;
    }

    // WORK day
    const clockIn = new Date(rec!.clockInTime!);
    const clockOut = rec?.clockOutTime ? new Date(rec.clockOutTime) : null;

    const timeIn = fmtTime12(rec!.clockInTime!);
    const timeOut = clockOut ? fmtTime12(rec!.clockOutTime!) : "–";

    // Flexible-schedule override: if admin marked this day as Exempt,
    // skip the late deduction entirely regardless of clock-in time.
    const isExempt = rec?.timeInStatus === "Exempt";

    // # of Hours — raw clock-to-clock elapsed time. Informational only, NOT used for pay.
    const rawMs = clockOut ? clockOut.getTime() - clockIn.getTime() : 0;
    const numHours = rawMs > 0 ? parseFloat((rawMs / 3600000).toFixed(2)) : 0;

    const breakMins = getBreakMinutes(dow);
    const breakHours = parseFloat((breakMins / 60).toFixed(2));

    // Total Hours — schedule-clamped credited hours (ONLY for regular payroll).
    // Early arrivals and late departures are excluded. Does not affect OT/offset.
    const schedule = abbr !== "Sun" ? BASE_SCHEDULE[abbr as Exclude<DayAbbr, "Sun">] : null;
    const totalHours = clockOut && schedule
      ? computeCreditedHours(rec!.clockInTime!, rec!.clockOutTime!, schedule.start, schedule.normalEnd, breakMins)
      : 0;

    grandTotal += totalHours;

    // Late deduction — skipped when:
    //   1. Employee has a weeklyHoursTarget (Jasmin's flexible arrangement), OR
    //   2. This specific day was marked Exempt via the Flexible Schedule Override.
    let lateResult: LateDeductionResult = { deduction: 0, method: "none", lateMinutes: 0 };
    if (!account.weeklyHoursTarget && !isExempt) {
      lateResult = computeLateDeduction(rec!.clockInTime!, rateForLate, noTimeLog);
      totalLateDeduction += lateResult.deduction;
    }

    // Build remarks
    const lateRemark = isExempt
      ? "Flexible Schedule"
      : lateResult.method === "threshold"
      ? "Late (threshold)"
      : lateResult.method === "per-minute"
      ? `Late (${lateResult.lateMinutes} min)`
      : "";

    rows.push({
      id: dateStr,
      date: dateLabel,
      dayLabel,
      type: "WORK",
      timeIn,
      timeOut: clockOut ? timeOut : "–",
      numHours: parseFloat(numHours.toFixed(2)),
      breakHours: breakHours > 0 ? breakHours : null,
      totalHours: parseFloat(totalHours.toFixed(2)),
      lateDeduction: lateResult.deduction > 0 ? parseFloat(lateResult.deduction.toFixed(2)) : null,
      lateMethod: lateResult.method !== "none" ? lateResult.method : null,
      remarks: lateRemark,
    });
  }

  // Salary date = end of cut-off period's pay date
  const salaryDate = cutOff.label.split("(")[0].trim().toUpperCase();

  return {
    employeeId: account.employeeId ?? account.id,
    name: account.fullName,
    position: account.role ?? "–",
    monthlyRate,
    dailyRate,
    salaryDate: "TBD",
    cutOffPeriod: cutOff.label,
    grandTotal: parseFloat(grandTotal.toFixed(2)),
    totalLateDeduction: parseFloat(totalLateDeduction.toFixed(2)),
    weeklyHoursTarget: account.weeklyHoursTarget,
    rows,
  };
}

// ─── Style map ────────────────────────────────────────────────────────────────

const DAY_TYPE_STYLES: Record<DayType, { bg: string; text: string; badge: string; badgeText: string }> = {
  WORK: { bg: "bg-white", text: "text-brand-navy", badge: "", badgeText: "" },
  "DAY-OFF": { bg: "bg-brand-blue/8", text: "text-brand-blue/50", badge: "bg-brand-blue/10 text-brand-blue/60", badgeText: "DAY OFF" },
  HOLIDAY: { bg: "bg-brand-orange/8", text: "text-brand-orange/70", badge: "bg-brand-orange/15 text-brand-orange", badgeText: "HOLIDAY" },
  ABSENT: { bg: "bg-brand-red/8", text: "text-brand-red/70", badge: "bg-brand-red/10 text-brand-red", badgeText: "ABSENT" },
  LEAVE: { bg: "bg-pink-50", text: "text-pink-500/70", badge: "bg-pink-100 text-pink-500", badgeText: "LEAVE" },
  FUTURE: { bg: "bg-white/40", text: "text-brand-navy/30", badge: "", badgeText: "" },
  SUSPENDED: { bg: "bg-brand-sky/20", text: "text-brand-navy/60", badge: "bg-brand-sky text-brand-blue", badgeText: "SUSPENDED" },
  FLEXIBLE: { bg: "bg-white/40", text: "text-brand-navy/40", badge: "bg-slate-100 text-slate-500", badgeText: "NO LOG" },
};

const fmt2 = (val: number) =>
  new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, duration: 0.25 },
  }),
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TimekeepingView() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [suspended, setSuspended] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [empOpen, setEmpOpen] = useState(false);
  const [cutOffOpen, setCutOffOpen] = useState(false);

  const CUT_OFFS = generateCutOffs();

  // Find current cutoff containing today
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const currentCutOff = CUT_OFFS.find(c => now >= c.start && now <= c.end) || CUT_OFFS[0];

  const [selectedCutOffValue, setSelectedCutOffValue] = useState(currentCutOff.value);

  // Fetch accounts list on mount
  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data: Account[]) => {
        if (Array.isArray(data)) {
          const eligibleAccounts = data.filter((a) =>
            ["Lead Teacher", "Assistant Teacher", "Executive Assistant", "Executive Assistant"].includes(a.role as string)
          );
          setAccounts(eligibleAccounts);
          if (eligibleAccounts.length > 0) setSelectedEmployeeId(eligibleAccounts[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch attendance whenever the selected account changes
  useEffect(() => {
    if (!selectedEmployeeId) return;
    setLoading(true);
    fetch(`/api/attendance?uid=${selectedEmployeeId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setAttendance(json.data);
          if (Array.isArray(json.suspendedDays)) {
            setSuspended(json.suspendedDays);
          }
        }
        else setAttendance([]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedEmployeeId]);

  const selectedAccount = accounts.find((a) => a.id === selectedEmployeeId);
  const selectedCutOff = CUT_OFFS.find((c) => c.value === selectedCutOffValue) ?? CUT_OFFS[0];

  // Build attendance map: dateStr → record
  const attendanceMap = new Map<string, AttendanceRecord>();
  for (const r of attendance) {
    attendanceMap.set(r.dateStr, r);
  }

  // TODO: integrate approved leaves; for now empty
  const leaveSet = new Set<string>();
  const suspendedSet = new Set<string>(suspended);

  const sheet: TimekeepingSheet | null =
    selectedAccount
      ? buildSheet(selectedAccount, attendanceMap, selectedCutOff, leaveSet, suspendedSet)
      : null;

  return (
    <m.div
      className="flex flex-col gap-6 w-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Filter Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between rounded-[2rem] bg-white px-6 py-4 shadow-lg border-2 border-brand-sky gap-4 w-full">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "20px" }}>tune</span>
            <span className="text-[13px] font-black text-brand-navy">Timekeeping Options:</span>
          </div>

          {/* Employee Selector */}
          <div className="relative">
            <button
              onClick={() => { setEmpOpen(!empOpen); setCutOffOpen(false); }}
              className={`flex items-center gap-3 rounded-full border px-4 py-2 text-[12px] font-bold transition-all duration-200 whitespace-nowrap min-w-[200px] justify-between ${empOpen ? "border-brand-blue/40 bg-brand-sky text-brand-blue shadow-sm" : "border-brand-sky bg-brand-sky/40 text-brand-navy hover:bg-brand-sky"}`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "15px" }}>person</span>
                {selectedAccount?.fullName ?? "Select Employee…"}
              </div>
              <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "16px" }}>expand_more</span>
            </button>
            <AnimatePresence>
              {empOpen && (
                <m.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-[calc(100%+6px)] left-0 z-50 min-w-[240px] rounded-2xl bg-white border-2 border-brand-sky shadow-lg max-h-[300px] overflow-y-auto"
                >
                  <div className="py-1.5">
                    {accounts.map((acc) => (
                      <button key={acc.id} onClick={() => { setSelectedEmployeeId(acc.id); setEmpOpen(false); }}
                        className={`w-full px-5 py-2 text-left text-[13px] font-bold transition-colors flex items-center gap-2 ${selectedEmployeeId === acc.id ? "bg-brand-sky/40 text-brand-blue" : "text-brand-navy/70 hover:bg-brand-sky/20"}`}
                      >
                        {selectedEmployeeId === acc.id ? <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "15px" }}>check</span> : <div className="w-4" />}
                        {acc.fullName}
                      </button>
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Cut-Off Selector */}
          <div className="relative">
            <button
              onClick={() => { setCutOffOpen(!cutOffOpen); setEmpOpen(false); }}
              className={`flex items-center gap-3 rounded-full border px-4 py-2 text-[12px] font-bold transition-all duration-200 whitespace-nowrap min-w-[260px] justify-between ${cutOffOpen ? "border-brand-blue/40 bg-brand-sky text-brand-blue shadow-sm" : "border-brand-sky bg-brand-sky/40 text-brand-navy hover:bg-brand-sky"}`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "15px" }}>calendar_month</span>
                {selectedCutOff.label}
              </div>
              <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "16px" }}>expand_more</span>
            </button>
            <AnimatePresence>
              {cutOffOpen && (
                <m.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-[calc(100%+6px)] left-0 z-50 min-w-[260px] rounded-2xl bg-white border-2 border-brand-sky shadow-lg max-h-[300px] overflow-y-auto"
                >
                  <div className="py-1.5">
                    {CUT_OFFS.map((c) => (
                      <button key={c.value} onClick={() => { setSelectedCutOffValue(c.value); setCutOffOpen(false); }}
                        className={`w-full px-5 py-2 text-left text-[13px] font-bold transition-colors flex items-center gap-2 ${selectedCutOffValue === c.value ? "bg-brand-sky/40 text-brand-blue" : "text-brand-navy/70 hover:bg-brand-sky/20"}`}
                      >
                        {selectedCutOffValue === c.value ? <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "15px" }}>check</span> : <div className="w-4" />}
                        {c.label}
                      </button>
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {(["DAY-OFF", "HOLIDAY", "ABSENT", "LEAVE", "FLEXIBLE"] as DayType[]).map((type) => (
            <span key={type} className={`text-[10px] font-black px-2.5 py-1 rounded-full ${DAY_TYPE_STYLES[type].badge}`}>
              {DAY_TYPE_STYLES[type].badgeText}
            </span>
          ))}
        </div>
      </div>

      {/* Timekeeping Card */}
      <AnimatePresence mode="wait">
        {loading ? (
          <m.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[2rem] bg-white border-2 border-brand-blue shadow-[var(--shadow-card)] flex items-center justify-center py-24"
          >
            <div className="flex flex-col items-center gap-4">
              <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-blue/20 border-t-brand-blue" />
              <p className="text-[13px] font-bold text-brand-navy/60">Loading timekeeping data…</p>
            </div>
          </m.div>
        ) : !sheet ? (
          <m.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[2rem] bg-white border-2 border-brand-blue shadow-[var(--shadow-card)] flex items-center justify-center py-24"
          >
            <p className="text-[13px] font-bold text-brand-navy/60">No data found for the selected employee and cut-off period.</p>
          </m.div>
        ) : (
          <m.div
            key={`${selectedEmployeeId}-${selectedCutOffValue}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="rounded-[2rem] bg-white border-2 border-brand-blue shadow-[var(--shadow-card)] overflow-hidden"
          >
            {/* Card Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between px-8 py-5 bg-brand-navy border-b-2 border-brand-blue/30 gap-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-brand-yellow mt-0.5" style={{ fontSize: "22px", fontVariationSettings: "'FILL' 1" }}>
                  schedule
                </span>
                <div>
                  <h3 className="font-headline text-[17px] font-black text-white">{sheet.name}</h3>
                  <p className="text-[12px] font-bold text-brand-sky/80">{sheet.position}</p>
                  <p className="text-[11px] font-bold text-brand-sky/60 mt-1">{sheet.cutOffPeriod}</p>
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: "Monthly Rate", val: sheet.monthlyRate > 0 ? `₱ ${fmt2(sheet.monthlyRate)}` : null },
                  { label: "Daily Rate", val: sheet.dailyRate > 0 ? `₱ ${fmt2(sheet.dailyRate)}` : null },
                ].filter(x => x.val !== null).map(({ label, val }) => (
                  <div key={label} className="bg-white/10 rounded-xl px-4 py-2 text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-sky/60">{label}</p>
                    <p className="text-[14px] font-black text-white">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-sky">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/60">Date</th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/60 text-center">Time In</th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/60 text-center">Time Out</th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/60 text-center"># of Hours</th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/60 text-center">Break</th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/60 text-center">Total Hours</th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-red/60 text-right bg-brand-red/5">Late Ded.</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/60">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.map((row, i) => {
                    const styles = DAY_TYPE_STYLES[row.type];
                    const isOff = row.type !== "WORK";
                    return (
                      <m.tr
                        key={row.id}
                        custom={i}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        className={`border-b border-brand-sky/30 hover:brightness-[0.97] transition-all ${styles.bg}`}
                        style={{ height: "46px" }}
                      >
                        <td className="px-6 py-2.5">
                          <div>
                            <span className={`text-[13px] font-black ${styles.text}`}>{row.date}</span>
                            <span className={`block text-[10px] font-bold ${styles.text} opacity-70`}>{row.dayLabel}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {isOff ? (
                            <span className={`text-[11px] font-black px-3 py-1 rounded-full ${styles.badge}`}>
                              {styles.badgeText}
                            </span>
                          ) : (
                            <span className="text-[12px] font-bold text-brand-blue">{row.timeIn}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {!isOff && <span className="text-[12px] font-bold text-brand-blue">{row.timeOut}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {row.numHours != null && !isOff && (
                            <span className="text-[12px] font-bold text-brand-navy/80">{row.numHours}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {row.breakHours != null && !isOff && (
                            <span className="text-[12px] font-bold text-brand-orange">{row.breakHours}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {row.totalHours != null && !isOff && (
                            <span className="text-[12px] font-black text-brand-navy">
                              {row.totalHours} hrs
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right bg-brand-red/5">
                          {!isOff && (
                            row.lateDeduction != null && row.lateDeduction > 0
                              ? <span className="text-[12px] font-bold text-brand-red/80">−{fmt2(row.lateDeduction)}</span>
                              : <span className="text-[11px] text-brand-navy/30">—</span>
                          )}
                        </td>
                        <td className="px-6 py-2.5">
                          {row.remarks && (
                            <span className={`text-[11px] font-bold ${
                              row.lateMethod === "threshold" ? "text-brand-red" :
                              row.lateMethod === "per-minute" ? "text-brand-orange" :
                              "text-brand-navy/50"
                            }`}>{row.remarks}</span>
                          )}
                        </td>
                      </m.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Grand Total Footer */}
            <div className="flex items-center justify-between px-8 py-5 border-t-2 border-brand-sky bg-brand-sky/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "18px" }}>calculate</span>
                <span className="text-[13px] font-black text-brand-navy uppercase tracking-wide">Grand Total</span>
              </div>
              <div className="flex items-center gap-6">
                {sheet.totalLateDeduction > 0 && (
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-red/60">Late Deduction</p>
                    <p className="text-[14px] font-black text-brand-red">−{fmt2(sheet.totalLateDeduction)}</p>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-widest text-brand-blue/60">Total Hours</p>
                  <p className="text-[18px] font-black text-brand-blue">{fmt2(sheet.grandTotal)}</p>
                </div>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}