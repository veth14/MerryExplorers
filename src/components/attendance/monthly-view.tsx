"use client";

import { useState, useEffect, useCallback } from "react";
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
};

type SuspendedDay = {
  dateStr: string;
  type: "suspension" | "holiday";
  reason?: string;
};

type AccountDoc = {
  _id?: string;
  fullName?: string;
  role?: string;
  workDays?: string[];
  avatarColor?: string;
  assignedRoom?: string;
  noTimeLog?: boolean;
  weeklyHoursTarget?: number | null;
};

type CutoffPeriod = {
  label: string;
  value: string;
  start: Date;
  end: Date;
};

type MonthlyViewProps = {
  year: number;
  month: number; // 0-indexed
  onMonthChange: (delta: number) => void;
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function totalHours(records: AttendanceRecord[]): number {
  let total = 0;
  for (const r of records) {
    if (r.clockInTime && r.clockOutTime) {
      total += new Date(r.clockOutTime).getTime() - new Date(r.clockInTime).getTime();
    }
  }
  return total;
}

function fmtHours(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function getCutoffs(year: number, month: number): CutoffPeriod[] {
  // 1st cutoff: prev 26 – this 10 (pay on 15th)
  const start1 = new Date(year, month - 1, 26);
  const end1   = new Date(year, month, 10);
  // 2nd cutoff: 11 – 25 (pay on 31st/last)
  const start2 = new Date(year, month, 11);
  const end2   = new Date(year, month, 25);
  const monthName = MONTH_NAMES[month];
  const prevMonthName = MONTH_NAMES[(month + 11) % 12];
  return [
    {
      label: `${prevMonthName} 26 – ${monthName} 10`,
      value: `${year}-${month}-1h`,
      start: start1,
      end: end1,
    },
    {
      label: `${monthName} 11 – 25`,
      value: `${year}-${month}-2h`,
      start: start2,
      end: end2,
    },
  ];
}

export function MonthlyView({ year, month, onMonthChange }: MonthlyViewProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [suspendedDays, setSuspendedDays] = useState<SuspendedDay[]>([]);
  const [accounts, setAccounts] = useState<AccountDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCutoff, setActiveCutoff] = useState<string | null>(null);

  const startStr = toDateStr(new Date(year, month, 1));
  const endStr   = toDateStr(new Date(year, month + 1, 0)); // last day of month

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [attJson, accJson] = await Promise.all([
        fetch(`/api/attendance?startDate=${startStr}&endDate=${endStr}`).then(r => r.json()),
        fetch("/api/accounts").then(r => r.json()),
      ]);
      if (attJson?.success) {
        setRecords(attJson.data || []);
        setSuspendedDays(attJson.suspendedDays || []);
      }
      if (Array.isArray(accJson)) {
        setAccounts(accJson.filter((a: AccountDoc) => a.role === "teacher" || a.role === "staff"));
      }
    } finally {
      setLoading(false);
    }
  }, [startStr, endStr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cutoffs = getCutoffs(year, month);
  const suspMap = new Map<string, SuspendedDay>();
  for (const s of suspendedDays) suspMap.set(s.dateStr, s);

  // Filter records by cutoff if selected
  const filteredRecords = activeCutoff
    ? (() => {
        const co = cutoffs.find(c => c.value === activeCutoff);
        if (!co) return records;
        return records.filter(r => {
          const d = new Date(`${r.dateStr}T00:00:00`);
          return d >= co.start && d <= co.end;
        });
      })()
    : records;

  // Build per-staff summaries
  const staffMap = new Map<string, {
    uid: string; name: string; group: string; color: string;
    workDays: string[]; noTimeLog: boolean; weeklyHoursTarget: number | null;
    records: AttendanceRecord[];
  }>();

  // Init from accounts
  for (const a of accounts) {
    const uid = (a._id || "") as string;
    staffMap.set(uid, { 
      uid, name: a.fullName || "Unknown", group: a.assignedRoom || "—", color: a.avatarColor || "#005cc8", 
      workDays: a.workDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      noTimeLog: !!a.noTimeLog,
      weeklyHoursTarget: a.weeklyHoursTarget ?? null,
      records: [] 
    });
  }
  // Add records
  for (const r of filteredRecords) {
    if (!staffMap.has(r.teacherUid)) {
      staffMap.set(r.teacherUid, { 
        uid: r.teacherUid, name: r.name, group: r.group, color: "#005cc8", 
        workDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        noTimeLog: false,
        weeklyHoursTarget: null,
        records: [] 
      });
    }
    staffMap.get(r.teacherUid)!.records.push(r);
  }

  const staffList = [...staffMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  const getSummary = (staff: typeof staffList[0]) => {
    let present = 0, late = 0, absent = 0, completed = 0, exempt = 0;
    let holidays = 0, suspensions = 0;
    
    const rangeStart = activeCutoff ? cutoffs.find(c => c.value === activeCutoff)?.start : new Date(year, month, 1);
    const rangeEnd   = activeCutoff ? cutoffs.find(c => c.value === activeCutoff)?.end   : new Date(year, month + 1, 0);
    
    if (rangeStart && rangeEnd) {
      const cur = new Date(rangeStart);
      while (cur <= rangeEnd) {
        const dStr = toDateStr(cur);
        const susp = suspMap.get(dStr);
        const rec = staff.records.find(r => r.dateStr === dStr) || null;
        
        const s = computeDailyStatus(
          rec,
          { workDays: staff.workDays, noTimeLog: staff.noTimeLog, weeklyHoursTarget: staff.weeklyHoursTarget },
          cur,
          !!susp,
          susp?.type ?? "suspension"
        );
        
        if (s === "On Time") present++;
        else if (s === "Late") { present++; late++; }
        else if (s === "Absent") absent++;
        else if (s === "Exempt") { present++; exempt++; }
        else if (s === "Holiday") holidays++;
        else if (s === "Suspended") suspensions++;
        
        if (rec?.status === "Completed") completed++;
        
        cur.setDate(cur.getDate() + 1);
      }
    }
    
    const totalMs = totalHours(staff.records);
    return { present, late, absent, completed, exempt, holidays, suspensions, totalMs };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[1.5rem] p-8 border border-[#e2e8f0] shadow animate-pulse">
        <div className="h-6 bg-slate-100 rounded w-48 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-slate-50 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[1.5rem] border border-[#e2e8f0] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-[#f1f5f9]">
        <div>
          <h2 className="text-[#002f76] text-[20px] font-extrabold tracking-tight">Monthly Summary</h2>
          <p className="text-[13px] font-semibold text-[#5a6e8c] mt-0.5">{MONTH_NAMES[month]} {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onMonthChange(-1)} className="w-9 h-9 rounded-full border-2 border-[#e2e8f0] flex items-center justify-center text-[#002f76] hover:bg-[#f8faff] hover:border-[#0050d5] transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_left</span>
          </button>
          <button onClick={() => onMonthChange(1)} className="w-9 h-9 rounded-full border-2 border-[#e2e8f0] flex items-center justify-center text-[#002f76] hover:bg-[#f8faff] hover:border-[#0050d5] transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_right</span>
          </button>
        </div>
      </div>

      {/* Cutoff tabs */}
      <div className="flex gap-2 px-6 py-3 border-b border-[#f1f5f9] bg-[#fafbff] flex-wrap">
        <button
          onClick={() => setActiveCutoff(null)}
          className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all border-2 ${!activeCutoff ? "bg-[#002f76] text-white border-[#002f76]" : "border-[#e2e8f0] text-[#5a6e8c] hover:bg-[#f0f5ff]"}`}
        >
          Full Month
        </button>
        {cutoffs.map(co => (
          <button
            key={co.value}
            onClick={() => setActiveCutoff(co.value)}
            className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all border-2 ${activeCutoff === co.value ? "bg-[#002f76] text-white border-[#002f76]" : "border-[#e2e8f0] text-[#5a6e8c] hover:bg-[#f0f5ff]"}`}
          >
            {co.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#f1f5f9] bg-[#f8faff]">
              <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c]">Staff</th>
              <th className="px-4 py-3 text-center text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c]">Present</th>
              <th className="px-4 py-3 text-center text-[11px] font-extrabold uppercase tracking-widest text-amber-500">Late</th>
              <th className="px-4 py-3 text-center text-[11px] font-extrabold uppercase tracking-widest text-red-400">Absent</th>
              <th className="px-4 py-3 text-center text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Completed</th>
              <th className="px-4 py-3 text-center text-[11px] font-extrabold uppercase tracking-widest text-amber-400">Holidays</th>
              <th className="px-4 py-3 text-center text-[11px] font-extrabold uppercase tracking-widest text-orange-400">Suspensions</th>
              <th className="px-4 py-3 text-center text-[11px] font-extrabold uppercase tracking-widest text-[#005cc8]">Total Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f8fafc]">
            {staffList.map(staff => {
              const s = getSummary(staff);
              return (
                <tr key={staff.uid} className="hover:bg-[#fafbff] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0" style={{ backgroundColor: staff.color }}>
                        {staff.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <div className="text-[14px] font-bold text-[#002f76]">{staff.name}</div>
                        <div className="text-[11px] text-[#9aa3b2] font-medium">{staff.group}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-[15px] font-extrabold text-[#002f76]">{s.present}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-[15px] font-extrabold ${s.late > 0 ? "text-amber-600" : "text-slate-300"}`}>{s.late}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-[15px] font-extrabold ${s.absent > 0 ? "text-red-500" : "text-slate-300"}`}>{s.absent}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-[15px] font-extrabold text-slate-400">{s.completed}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-[15px] font-extrabold ${s.holidays > 0 ? "text-amber-600" : "text-slate-300"}`}>{s.holidays}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-[15px] font-extrabold ${s.suspensions > 0 ? "text-orange-500" : "text-slate-300"}`}>{s.suspensions}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-[14px] font-extrabold ${s.totalMs > 0 ? "text-[#005cc8]" : "text-slate-300"}`}>
                      {s.totalMs > 0 ? fmtHours(s.totalMs) : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {staffList.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-[13px] font-semibold text-[#9aa3b2]">
                  No attendance records for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
