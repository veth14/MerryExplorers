"use client";

import { useState } from "react";
import type { LogStatus } from "@/data/reports";

type LogEntry = {
  id: string;
  date: string;
  teacherName: string;
  initials: string;
  scheduledIn: string;
  actualIn: string;
  status: LogStatus;
  totalHours: string;
  color: string;
};

const ROWS_PER_PAGE = 5;
const ROW_HEIGHT = 56;

function ChevronLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function ReportsTable({ logs = [] }: { logs?: LogEntry[] }) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(logs.length / ROWS_PER_PAGE));
  const start = (page - 1) * ROWS_PER_PAGE;
  const visibleLogs = logs.slice(start, start + ROWS_PER_PAGE);

  // Always pad to exactly ROWS_PER_PAGE so height never changes
  const paddedLogs: (LogEntry | null)[] = [
    ...visibleLogs,
    ...Array(ROWS_PER_PAGE - visibleLogs.length).fill(null),
  ];

  function goTo(p: number) {
    if (p >= 1 && p <= totalPages) setPage(p);
  }

  const pageNumbers: (number | "...")[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (page > 3) pageNumbers.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pageNumbers.push(i);
    }
    if (page < totalPages - 2) pageNumbers.push("...");
    pageNumbers.push(totalPages);
  }

  return (
    <div
      id="detailed-logs-table"
      className="rounded-[2rem] bg-white border-2 border-brand-blue shadow-lg w-full overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-brand-sky">
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined text-brand-blue"
            style={{ fontSize: "26px", fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
          >
            list_alt
          </span>
          <h2 className="font-headline text-[20px] font-black text-brand-navy">Detailed Logs</h2>
        </div>
        <span className="text-[11px] font-bold text-brand-blue/60">
          Showing {logs.length === 0 ? 0 : start + 1}–{Math.min(start + ROWS_PER_PAGE, logs.length)} of {logs.length} entries
        </span>
      </div>

      {/* ── Table wrapper: thead outside scroll, fixed-height div for rows ── */}
      <div className="w-full overflow-x-auto">

        {/* Column headers — always visible, never scrolls away */}
        <table className="w-full min-w-[800px] text-left border-collapse table-fixed">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[22%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-brand-sky">
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/50">Date</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/50">Teacher Name</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/50">Scheduled In</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/50">Actual In</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/50">Status</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/50">Total Hours</th>
            </tr>
          </thead>
        </table>

        {/* Body rows in a fixed-height container */}
        <div style={{ height: `${ROW_HEIGHT * ROWS_PER_PAGE}px`, overflow: "hidden" }}>
          <table className="w-full min-w-[800px] text-left border-collapse table-fixed">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[22%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
            </colgroup>
            <tbody>
              {paddedLogs.map((log, idx) =>
                log ? (
                  <tr
                    key={log.id}
                    className="border-b border-brand-sky/40 hover:bg-brand-sky/20 transition-colors group"
                    style={{ height: `${ROW_HEIGHT}px` }}
                  >
                    <td className="px-8 whitespace-nowrap">
                      <span className="text-[13px] font-bold text-brand-blue">{log.date}</span>
                    </td>
                    <td className="px-8 whitespace-nowrap">
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
                    <td className="px-8 whitespace-nowrap">
                      <span className="text-[13px] font-bold text-brand-navy/60">{log.scheduledIn}</span>
                    </td>
                    <td className="px-8 whitespace-nowrap">
                      <span className={`text-[13px] font-black ${log.status === "LATE" ? "text-brand-red" : "text-brand-blue"}`}>
                        {log.actualIn}
                      </span>
                    </td>
                    <td className="px-8 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black tracking-[0.1em] uppercase ${
                        log.status === "ON TIME" ? "bg-brand-green/15 text-brand-green" : "bg-brand-red/10 text-brand-red"
                      }`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${log.status === "ON TIME" ? "bg-brand-green" : "bg-brand-red"}`} />
                        {log.status}
                      </div>
                    </td>
                    <td className="px-8 whitespace-nowrap">
                      <span className="text-[13px] font-bold text-brand-blue">{log.totalHours}</span>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={`empty-${idx}`}
                    className="border-b border-brand-sky/10"
                    style={{ height: `${ROW_HEIGHT}px` }}
                  >
                    <td colSpan={6} />
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination Footer ── */}
      <div className="flex items-center justify-between px-8 py-4 border-t border-brand-sky/40">
        <p className="text-[11px] font-bold text-brand-navy/50">
          Page {page} of {totalPages}
        </p>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => goTo(page - 1)}
            disabled={page === 1}
            className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-brand-sky text-brand-blue hover:bg-brand-sky/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft />
          </button>

          {pageNumbers.map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-[12px] font-bold text-brand-navy/40">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => goTo(p as number)}
                className={`w-8 h-8 flex items-center justify-center rounded-xl text-[12px] font-black transition-all ${
                  page === p
                    ? "bg-brand-blue text-white shadow-sm"
                    : "border-2 border-brand-sky text-brand-navy hover:bg-brand-sky/30"
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => goTo(page + 1)}
            disabled={page === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-brand-sky text-brand-blue hover:bg-brand-sky/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight />
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-bold text-brand-navy/50">
          Go to
          <input
            type="number"
            min={1}
            max={totalPages}
            defaultValue={page}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = parseInt((e.target as HTMLInputElement).value);
                goTo(val);
              }
            }}
            className="w-12 h-8 rounded-xl border-2 border-brand-sky text-center text-[12px] font-black text-brand-navy outline-none focus:border-brand-blue transition-colors"
          />
        </div>
      </div>
    </div>
  );
}