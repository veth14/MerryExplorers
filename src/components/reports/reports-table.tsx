"use client";

import { detailedLogs } from "@/data/reports";

function ListIcon() {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ffb800] text-white shadow-sm shadow-[#ffb800]/20">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    </div>
  );
}

export function ReportsTable() {
  return (
    <div id="detailed-logs-table" className="rounded-[1.25rem] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] w-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-[#f0f4f9]">
        <div className="flex items-center gap-3">
          <ListIcon />
          <h2 className="text-[18px] font-black text-[#002f76]">Detailed Logs</h2>
        </div>
        <span className="text-[11px] font-bold text-[#005cc8]/50">
          Showing 1-10 of 42 entries
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#f0f4f9]">
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-[#005cc8]/40 w-[15%]">Date</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-[#005cc8]/40 w-[20%]">Teacher Name</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-[#005cc8]/40 w-[15%]">Scheduled In</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-[#005cc8]/40 w-[15%]">Actual In</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-[#005cc8]/40 w-[20%]">Status</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-[#005cc8]/40 w-[15%]">Total Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f4f9]">
            {detailedLogs.map((log) => (
              <tr key={log.id} className="transition-all duration-200 hover:bg-[#f8fafc] group">
                <td className="px-8 py-5 whitespace-nowrap">
                  <span className="text-[13px] font-bold text-[#005cc8]">{log.date}</span>
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black text-white shadow-sm transition-transform duration-200 group-hover:scale-110"
                      style={{ backgroundColor: log.color }}
                    >
                      {log.initials}
                    </div>
                    <span className="text-[13px] font-black text-[#002f76]">{log.teacherName}</span>
                  </div>
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                  <span className="text-[13px] font-bold text-[#005cc8]/60">{log.scheduledIn}</span>
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                  <span className={`text-[13px] font-black ${log.status === "LATE" ? "text-[#ef4444]" : "text-[#005cc8]"}`}>
                    {log.actualIn}
                  </span>
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                  <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black tracking-[0.1em] uppercase ${
                    log.status === "ON TIME" 
                      ? "bg-[#e6f4ea] text-[#2da05b]" 
                      : "bg-[#fef2f2] text-[#ef4444]"
                  }`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${log.status === "ON TIME" ? "bg-[#2da05b]" : "bg-[#ef4444]"}`} />
                    {log.status}
                  </div>
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                  <span className="text-[13px] font-bold text-[#005cc8]">{log.totalHours}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Footer Padding */}
      <div className="h-3 w-full bg-white"></div>
    </div>
  );
}
