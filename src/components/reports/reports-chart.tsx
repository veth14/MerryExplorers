"use client";

import { useState } from "react";
import { punctualityTrends } from "@/data/reports";

export function ReportsChart() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const maxValue = Math.max(...punctualityTrends.map((t) => t.value), 100);

  return (
    <div
      id="punctuality-trends-chart"
      className="rounded-[2rem] bg-white border-2 border-brand-yellow shadow-lg px-8 py-7 w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined text-brand-orange"
            style={{
              fontSize: "26px",
              fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
            }}
          >
            monitoring
          </span>
          <h2 className="font-headline text-[20px] font-black text-brand-navy">Punctuality Trends</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="chart-monthly-toggle"
            className="rounded-full bg-brand-sky/60 px-4 py-1.5 text-[11px] font-black text-brand-blue tracking-wider transition-all duration-200 hover:bg-brand-sky"
          >
            MONTHLY
          </button>
          <button
            id="download-pdf-button"
            className="flex items-center gap-2 rounded-full border border-brand-sky px-4 py-1.5 text-[12px] font-bold text-brand-blue transition-all duration-200 hover:bg-brand-sky/60"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              file_download
            </span>
            Download PDF
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-end gap-4 mb-4 text-[11px] font-bold text-brand-navy/60">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#92bdf2]" />
          On track week
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#ffb800]" />
          Below target
        </div>
      </div>

      {/* Chart Area: Y-axis + plot */}
      <div className="flex w-full">
        {/* Y-axis scale (0–100%) */}
        <div className="flex flex-col justify-between h-[200px] pr-2 text-right">
          {[100, 75, 50, 25, 0].map((tick) => (
            <span key={tick} className="text-[10px] font-bold text-brand-blue/40 leading-none">
              {tick}%
            </span>
          ))}
        </div>

        {/* Plot region */}
        <div className="flex-1 h-[200px] relative">
          {/* Grid lines aligned to the Y-axis ticks */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="w-full h-[1px] bg-brand-sky/40" />
            ))}
          </div>

          {/* Bars */}
          <div className="h-full w-full flex items-end justify-around relative">
            {punctualityTrends.map((trend, index) => {
              const isHighlighted = trend.color === "#ffb800";
              const isHovered = hoveredBar === index;

              return (
                <div
                  key={trend.week}
                  className="flex flex-col items-center gap-2 h-full justify-end group relative z-10"
                  onMouseEnter={() => setHoveredBar(index)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Bar wrapper: holds its height so the tooltip can anchor to the bar's top.
                      The fill is a separate child so hover scale never distorts the tooltip. */}
                  <div
                    className="relative w-12"
                    style={{ height: `${(trend.value / maxValue) * 100}%` }}
                  >
                    {/* Tooltip — anchored to the bar's top, always rendered above it */}
                    <div
                      className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 whitespace-nowrap bg-brand-navy text-white px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-lg transition-all duration-200 pointer-events-none ${
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
                        ? "text-brand-orange bg-brand-orange/15 px-2.5 py-0.5 rounded-full"
                        : "text-brand-blue/50"
                    }`}
                  >
                    {trend.week}
                  </span>

                  {/* Extra data: total clock-ins this week */}
                  <div className="text-center leading-tight">
                    <div className="text-[12px] font-black text-brand-navy">{trend.clockIns}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-brand-blue/40">clock-ins</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
