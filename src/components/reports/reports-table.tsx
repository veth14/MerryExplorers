"use client";

import { useEffect, useState } from "react";
import { TablePagination } from "@/components/ui/table-pagination";
import type { LogStatus } from "@/data/reports";

type LogEntry = {
  id: string;
  date: string;
  teacherName: string;
  initials: string;
  group: string;
  scheduledIn: string;
  actualIn: string;
  clockOut: string;
  breaksDuration: string;
  status: LogStatus;
  totalHours: string;
  color: string;
};

export function ReportsTable({ logs = [] }: { logs?: LogEntry[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleLogs = logs.slice((safePage - 1) * pageSize, safePage * pageSize);
  const logsKey = logs.map((log) => log.id).join("|");

  useEffect(() => setPage(1), [logsKey]);

  return (
    <div
      id="detailed-logs-table"
      className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-[#f8faff] via-white to-white px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0050d5]">
            <span className="material-symbols-outlined text-[21px]">list_alt</span>
          </span>
          <div>
            <h2 className="font-headline text-[17px] font-extrabold text-[#002f76]">Detailed Logs</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Individual staff attendance records in the selected report.</p>
          </div>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-extrabold text-slate-500">{logs.length} {logs.length === 1 ? "entry" : "entries"}</span>
      </div>

      {/* ── Table wrapper: thead outside scroll, fixed-height div for rows ── */}
      <div className="w-full overflow-x-auto">

        {/* Column headers — always visible, never scrolls away */}
        <table className="w-full min-w-[1100px] text-left border-collapse table-fixed">
          <colgroup>
            <col className="w-[10%]" />
            <col className="w-[18%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-brand-sky">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/50">Date</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/50">Teacher Name</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/50">Group/Room</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/50">Scheduled In</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/50">Actual In</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/50">Clock Out</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/50">Breaks</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/50">Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/50">Total Hours</th>
            </tr>
          </thead>
        </table>

        {/* Body rows in a fixed-height container */}
        <div>
          <table className="w-full min-w-[1100px] text-left border-collapse table-fixed">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[18%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
            </colgroup>
            <tbody>
              {visibleLogs.length > 0 ? visibleLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-100 transition-colors hover:bg-blue-50/40 group"
                  >
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-[12px] font-bold text-[#31547f]">{log.date}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white shadow-sm group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: log.color }}
                        >
                          {log.initials}
                        </div>
                        <span className="text-[13px] font-black text-brand-navy truncate">{log.teacherName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-[13px] font-bold text-brand-navy/80">{log.group}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-[13px] font-bold text-brand-navy/60">{log.scheduledIn}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`text-[13px] font-black ${log.status === "LATE" ? "text-brand-red" : "text-brand-blue"}`}>
                        {log.actualIn}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-[13px] font-bold text-brand-navy/60">{log.clockOut}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-[13px] font-bold text-[#f59e0b]">{log.breaksDuration}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black tracking-[0.1em] uppercase ${
                        log.status === "ON TIME" ? "bg-brand-green/15 text-brand-green" : "bg-brand-red/10 text-brand-red"
                      }`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${log.status === "ON TIME" ? "bg-brand-green" : "bg-brand-red"}`} />
                        {log.status}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-[13px] font-bold text-brand-blue">{log.totalHours}</span>
                    </td>
                  </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center text-[13px] font-semibold text-slate-400">No attendance records match this report.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TablePagination
        total={logs.length}
        page={safePage}
        pageCount={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        itemLabel="entries"
        ariaLabel="Detailed attendance log pages"
      />
    </div>
  );
}
