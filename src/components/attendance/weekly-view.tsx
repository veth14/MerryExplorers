"use client";

import { useState, useEffect } from "react";
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

type WeeklyViewProps = {
  weekStart: Date; // Always a Monday
  onWeekChange: (delta: number) => void;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  "On Time":   { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500" },
  "Late":      { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-500" },
  "Absent":    { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500" },
  "Completed": { bg: "bg-slate-100",  text: "text-slate-600",  dot: "bg-slate-400" },
  "Suspended": { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400" },
  "Holiday":   { bg: "bg-amber-50",   text: "text-amber-800",  dot: "bg-amber-300" },
  "Exempt (Flexible)": { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  "No Record": { bg: "bg-slate-50",   text: "text-slate-400",  dot: "bg-slate-200" },
  "Future":    { bg: "bg-slate-50",   text: "text-slate-400",  dot: "bg-slate-200" },
  "No Work Day": { bg: "bg-gray-50",  text: "text-gray-300",   dot: "bg-gray-200" },
};

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toManila(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" });
}

export function WeeklyView({ weekStart, onWeekChange }: WeeklyViewProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountDoc[]>([]);
  const [suspendedDays, setSuspendedDays] = useState<SuspendedDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{ record: AttendanceRecord | null; dateStr: string; name: string; status: string } | null>(null);

  // Build week dates (Mon–Sat)
  const weekDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const startStr = toDateStr(weekDates[0]);
  const endStr = toDateStr(weekDates[5]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/attendance?startDate=${startStr}&endDate=${endStr}`).then(r => r.json()),
      fetch("/api/accounts").then(r => r.json()),
    ]).then(([attJson, accJson]) => {
      if (attJson?.success) {
        setRecords(attJson.data || []);
        setSuspendedDays(attJson.suspendedDays || []);
      }
      if (Array.isArray(accJson)) {
        setAccounts(accJson.filter((a: AccountDoc) => a.role === "teacher" || a.role === "staff"));
      }
    }).finally(() => setLoading(false));
  }, [startStr, endStr]);

  const suspMap = new Map<string, SuspendedDay>();
  for (const s of suspendedDays) suspMap.set(s.dateStr, s);

  // Build lookup: teacherName+dateStr → record
  const recMap = new Map<string, AttendanceRecord>();
  for (const r of records) recMap.set(`${r.teacherUid}__${r.dateStr}`, r);

  // Unique staff from accounts + records
  const staffList = accounts.length
    ? accounts.map(a => ({ 
        uid: (a._id || "") as string, 
        name: a.fullName || "Unknown", 
        color: a.avatarColor || "#005cc8", 
        room: a.assignedRoom || "—", 
        workDays: a.workDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        noTimeLog: !!a.noTimeLog,
        weeklyHoursTarget: a.weeklyHoursTarget ?? null
      }))
    : [...new Map(records.map(r => [r.teacherUid, r])).values()].map(r => ({ 
        uid: r.teacherUid, 
        name: r.name, 
        color: "#005cc8", 
        room: r.group, 
        workDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        noTimeLog: false,
        weeklyHoursTarget: null
      }));

  const DAY_NAMES_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const getCellStatus = (uid: string, date: Date): string => {
    const dStr = toDateStr(date);
    const susp = suspMap.get(dStr);
    const rec = recMap.get(`${uid}__${dStr}`);
    const staff = staffList.find(s => s.uid === uid);
    
    const computedStatus = computeDailyStatus(
      rec || null,
      {
        workDays: staff?.workDays ?? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        noTimeLog: !!staff?.noTimeLog,
        weeklyHoursTarget: staff?.weeklyHoursTarget ?? null,
      },
      date,
      !!susp,
      susp?.type ?? "suspension"
    );
    
    // Convert Exempt to display friendly version for the legend
    if (computedStatus === "Exempt") return "Exempt (Flexible)";
    return computedStatus;
  };

  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (loading) {
    return (
      <div className="bg-white rounded-[1.5rem] p-8 border border-[#e2e8f0] shadow animate-pulse">
        <div className="h-6 bg-slate-100 rounded w-48 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-slate-50 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-[1.5rem] border border-[#e2e8f0] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
          <div>
            <h2 className="text-[#002f76] text-[20px] font-extrabold tracking-tight">Weekly Attendance</h2>
            <p className="text-[13px] font-semibold text-[#5a6e8c] mt-0.5">
              {fmt(weekDates[0])} – {fmt(weekDates[5])}, {weekDates[0].getFullYear()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onWeekChange(-1)} className="w-9 h-9 rounded-full border-2 border-[#e2e8f0] flex items-center justify-center text-[#002f76] hover:bg-[#f8faff] hover:border-[#0050d5] transition-all">
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_left</span>
            </button>
            <button onClick={() => onWeekChange(1)} className="w-9 h-9 rounded-full border-2 border-[#e2e8f0] flex items-center justify-center text-[#002f76] hover:bg-[#f8faff] hover:border-[#0050d5] transition-all">
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_right</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-2.5 border-b border-[#f1f5f9] bg-[#fafbff]">
          {(["On Time", "Late", "Absent", "Completed", "Holiday", "Suspended", "No Record"] as const).map(s => {
            const c = STATUS_COLOR[s];
            return (
              <span key={s} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5a6e8c]">
                <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />{s}
              </span>
            );
          })}
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#f1f5f9] bg-[#f8faff]">
                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] w-[180px]">Staff</th>
                {weekDates.map((d, i) => {
                  const susp = suspMap.get(toDateStr(d));
                  return (
                    <th key={i} className="px-2 py-3 text-center text-[11px] font-extrabold uppercase tracking-widest min-w-[90px]">
                      <div className={susp?.type === "holiday" ? "text-amber-600" : susp ? "text-orange-600" : "text-[#5a6e8c]"}>
                        {DAY_LABELS[i]}
                      </div>
                      <div className={`text-[10px] font-semibold normal-case tracking-normal mt-0.5 ${susp?.type === "holiday" ? "text-amber-500" : susp ? "text-orange-500" : "text-[#9aa3b2]"}`}>
                        {fmt(d)}
                        {susp && <div>{susp.type === "holiday" ? "🎉" : "⛔"}</div>}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f8fafc]">
              {staffList.map(staff => (
                <tr key={staff.uid} className="hover:bg-[#fafbff] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ backgroundColor: staff.color }}>
                        {staff.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-[#002f76] leading-tight">{staff.name.split(" ")[0]}</div>
                        <div className="text-[10px] text-[#9aa3b2] font-medium">{staff.room}</div>
                      </div>
                    </div>
                  </td>
                  {weekDates.map((d, i) => {
                    const dStr = toDateStr(d);
                    const status = getCellStatus(staff.uid, d);
                    const c = STATUS_COLOR[status] || STATUS_COLOR["No Record"];
                    const rec = recMap.get(`${staff.uid}__${dStr}`);
                    const isClickable = status !== "No Work Day";
                    return (
                      <td key={i} className="px-2 py-2 text-center">
                        <button
                          disabled={!isClickable}
                          onClick={() => isClickable && setSelectedCell({ record: rec || null, dateStr: dStr, name: staff.name, status })}
                          className={`inline-flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all w-full ${c.bg} ${c.text} ${isClickable ? "hover:brightness-95 cursor-pointer" : "cursor-default opacity-40"}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                          <span className="leading-none">{status === "Exempt (Flexible)" ? "Exempt" : status}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cell Detail Modal */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCell(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 z-10 overflow-hidden">
            <div className="bg-gradient-to-br from-[#002f76] to-[#0050d5] px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white text-[16px] font-extrabold">{selectedCell.name}</h3>
                  <p className="text-white/60 text-[12px] font-semibold mt-0.5">
                    {new Date(`${selectedCell.dateStr}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <button onClick={() => setSelectedCell(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>
                </button>
              </div>
            </div>
            <div className="p-6">
              {/* Status */}
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#f1f5f9]">
                <span className="text-[12px] font-extrabold uppercase tracking-widest text-[#5a6e8c]">Status</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold border ${STATUS_COLOR[selectedCell.status]?.bg} ${STATUS_COLOR[selectedCell.status]?.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLOR[selectedCell.status]?.dot}`} />
                  {selectedCell.status}
                </span>
              </div>

              {/* Time Info */}
              {selectedCell.record ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#f8fafc] rounded-xl p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">Clock In</p>
                    <p className="text-[18px] font-extrabold text-[#002f76]">
                      {selectedCell.record.clockInTime ? toManila(selectedCell.record.clockInTime) : "—"}
                    </p>
                  </div>
                  <div className="bg-[#f8fafc] rounded-xl p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">Clock Out</p>
                    <p className="text-[18px] font-extrabold text-[#002f76]">
                      {selectedCell.record.clockOutTime ? toManila(selectedCell.record.clockOutTime) : "—"}
                    </p>
                  </div>
                  {selectedCell.record.clockInTime && selectedCell.record.clockOutTime && (
                    <div className="col-span-2 bg-[#f0f5ff] rounded-xl p-4">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">Total Hours</p>
                      <p className="text-[18px] font-extrabold text-[#002f76]">
                        {(() => {
                          const diff = new Date(selectedCell.record!.clockOutTime!).getTime() - new Date(selectedCell.record!.clockInTime!).getTime();
                          const h = Math.floor(diff / 3600000);
                          const m = Math.floor((diff % 3600000) / 60000);
                          return `${h}h ${m}m`;
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <span className="material-symbols-outlined text-[#d1d5db] mb-2" style={{ fontSize: "40px" }}>
                    {selectedCell.status === "Holiday" ? "celebration" : selectedCell.status === "Suspended" ? "block" : "event_busy"}
                  </span>
                  <p className="text-[13px] font-semibold text-[#9aa3b2]">
                    {selectedCell.status === "Holiday" ? "Public Holiday — No class." :
                     selectedCell.status === "Suspended" ? "Classes suspended for this day." :
                     "No attendance record found."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
