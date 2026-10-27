"use client";

import { useState } from "react";

type TrendItem = { week: string; value: number; color: string; clockIns: number; onTime: number };

export function ReportsChart({ trends = [], onPrint }: { trends?: TrendItem[]; onPrint?: () => void }) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const maxValue = Math.max(...trends.map((t) => t.value), 100);
  const isEmpty = trends.length === 0;

  return (
    <div
      id="punctuality-trends-chart"
      className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-[#f8faff] via-white to-white px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <span className="material-symbols-outlined text-[22px]">monitoring</span>
          </span>
          <div>
            <h2 className="font-headline text-[17px] font-extrabold text-[#002f76]">Punctuality Trends</h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">On-time arrival rate grouped by week</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Weekly</span>
          {onPrint && (
            <button type="button" onClick={onPrint} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-bold text-[#31547f] transition-colors hover:bg-slate-50">
              <span className="material-symbols-outlined text-[16px]">print</span>
              Print / Save PDF
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-end gap-4 px-5 pt-4 text-[11px] font-semibold text-slate-500 sm:px-6">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#92bdf2]" />
          On track (80%+)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffb800]" />
          Below target (&lt;80%)
        </div>
      </div>

      {/* Chart Area: empty state OR bars */}
      {isEmpty ? (
        <div className="flex h-[260px] flex-col items-center justify-center gap-3 px-6 text-center text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 opacity-40">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <p className="text-[13px] font-bold text-[#31547f]">No attendance data in this report.</p>
          <p className="text-[11px] font-medium text-slate-400">Choose another date range or staff filter to see weekly trends.</p>
        </div>
      ) : (
        <div className="flex w-full px-5 pb-6 pt-3 sm:px-6">
          {/* Y-axis scale (0–100%) */}
          <div className="flex h-[200px] flex-col justify-between pr-3 text-right">
            {[100, 75, 50, 25, 0].map((tick) => (
              <span key={tick} className="text-[10px] font-semibold leading-none text-slate-400">
                {tick}%
              </span>
            ))}
          </div>

          {/* Plot region */}
          <div className="relative h-[200px] flex-1">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-px w-full bg-slate-100" />
              ))}
            </div>

            {/* Bars */}
            <div className="h-full w-full flex items-end justify-around relative">
              {trends.map((trend, index) => {
                const isHighlighted = trend.color === "#ffb800";
                const isHovered = hoveredBar === index;

                return (
                  <div
                    key={trend.week}
                    className="group relative z-10 flex h-full flex-col items-center justify-end gap-2"
                    onMouseEnter={() => setHoveredBar(index)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    <div
                      className="relative w-10 sm:w-12"
                      style={{ height: `${(trend.value / maxValue) * 100}%` }}
                    >
                      {/* Tooltip */}
                      <div
                        className={`absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#002f76] px-3 py-1.5 text-[11px] font-bold text-white shadow-lg transition-all duration-200 pointer-events-none ${
                          isHovered ? "opacity-100 -translate-y-1" : "opacity-0 translate-y-1"
                        }`}
                      >
                        {trend.value}%
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-brand-navy" />
                      </div>

                      {/* Bar fill */}
                      <div
                        className={`h-full w-full rounded-t-xl rounded-b-md transition-all duration-500 ease-out ${
                          isHovered ? "opacity-90 scale-x-110" : ""
                        }`}
                        style={{
                          backgroundColor: trend.color,
                          boxShadow: isHighlighted
                            ? "0 4px 15px rgba(255, 184, 0, 0.4)"
                            : isHovered
                              ? "0 4px 15px rgba(0, 102, 204, 0.25)"
                              : "none",
                        }}
                      />
                    </div>

                    {/* Week label */}
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-200 ${
                        isHighlighted
                          ? "rounded-full bg-amber-50 px-2.5 py-0.5 text-amber-700"
                          : "text-slate-400"
                      }`}
                    >
                      {trend.week}
                    </span>

                    {/* Clock-ins */}
                    <div className="text-center leading-tight">
                      <div className="text-[12px] font-extrabold text-[#002f76]">{trend.clockIns}</div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">clock-ins</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
