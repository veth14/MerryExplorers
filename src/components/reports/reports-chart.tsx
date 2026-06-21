"use client";

import { useState } from "react";
import { punctualityTrends } from "@/data/reports";

function TrendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#005cc8]">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function ReportsChart() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const maxValue = Math.max(...punctualityTrends.map(t => t.value), 100);

  return (
    <div id="punctuality-trends-chart" className="rounded-[1.25rem] bg-white px-8 py-7 shadow-[0_4px_20px_rgba(0,0,0,0.04)] w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <TrendIcon />
          <h2 className="text-[18px] font-black text-[#002f76]">Punctuality Trends</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            id="chart-monthly-toggle"
            className="rounded-full bg-[#e8f0fe] px-4 py-1.5 text-[11px] font-extrabold text-[#005cc8] tracking-wider transition-all duration-200 hover:bg-[#d6e5fc] hover:shadow-sm"
          >
            MONTHLY
          </button>
          <button
            id="download-pdf-button"
            className="flex items-center gap-2 rounded-full border border-[#e2e8f0]/80 px-4 py-1.5 text-[12px] font-bold text-[#005cc8] transition-all duration-200 hover:bg-[#f8fafc] hover:border-[#005cc8]/30 hover:shadow-sm"
          >
            <DownloadIcon />
            Download PDF
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-[200px] w-full flex items-end justify-around px-6 relative">
        {/* Subtle grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-full h-[1px] bg-[#f0f4f9]" />
          ))}
        </div>

        {punctualityTrends.map((trend, index) => {
          const isHighlighted = trend.color === "#ffb800";
          const isHovered = hoveredBar === index;

          return (
            <div
              key={trend.week}
              className="flex flex-col items-center gap-3 h-full justify-end group relative z-10"
              onMouseEnter={() => setHoveredBar(index)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {/* Tooltip */}
              <div
                className={`absolute -top-2 bg-[#002f76] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-lg transition-all duration-200 pointer-events-none ${
                  isHovered ? "opacity-100 -translate-y-1" : "opacity-0 translate-y-1"
                }`}
              >
                {trend.value}%
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-[#002f76]" />
              </div>

              {/* Bar */}
              <div
                className={`w-12 rounded-t-xl rounded-b-md transition-all duration-500 ease-out cursor-pointer ${
                  isHovered ? "opacity-90 scale-x-110" : ""
                }`}
                style={{
                  height: `${(trend.value / maxValue) * 100}%`,
                  backgroundColor: trend.color,
                  boxShadow: isHighlighted
                    ? "0 4px 15px rgba(255, 184, 0, 0.3)"
                    : isHovered
                      ? "0 4px 15px rgba(0, 92, 200, 0.2)"
                      : "none",
                }}
              />

              {/* Label */}
              <span
                className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-200 ${
                  isHighlighted
                    ? "text-[#ffb800] bg-[#fff9e6] px-2.5 py-0.5 rounded-full"
                    : "text-[#005cc8]/50"
                }`}
              >
                {trend.week}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
