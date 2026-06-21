type TrendChartProps = {
  chartPath: string;
  days: readonly { day: string; value: number }[];
};

export function TrendChart({ chartPath, days }: TrendChartProps) {
  return (
    <article className="rounded-[1.5rem] border-none bg-white p-6 pb-4 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-[#0050d5] text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm4.5 7.5a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0v-2.25a.75.75 0 0 1 .75-.75Zm3.75-1.5a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0V12Zm2.25-3a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 1-1.5 0V9.75A.75.75 0 0 1 13.5 9Z" clipRule="evenodd" /></svg>
          </div>
          <h2 className="font-headline text-[22px] font-extrabold text-[#002f76]">Teacher Performance Trends</h2>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-[#f0f4f8] px-3 py-1.5 text-[13px] font-bold text-[#002f76]">
          Last 7 Days
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clipRule="evenodd" /></svg>
        </button>
      </div>

      <div className="mt-8 flex gap-4">
        <div className="relative text-[11px] font-bold text-[#002f76]/60 h-[280px] w-6 shrink-0">
          {[50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0].map((val, i) => (
            <span key={val} className="absolute left-0 w-full text-right" style={{ top: `${(i / 10) * 100}%`, transform: 'translateY(-50%)' }}>
              {val}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {/* Stretched SVG for curve and area */}
          <svg viewBox="0 0 360 220" className="h-[280px] w-full overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0050d5" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#0050d5" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <line key={i} x1="0" y1={i * 22} x2="360" y2={i * 22} stroke="#f0f4f8" strokeWidth="1.5" />
            ))}
            
            {/* Area Fill */}
            {chartPath && <path d={`${chartPath} L360,220 L0,220 Z`} fill="url(#chartFill)" />}
            
            {/* Line */}
            <path d={chartPath} fill="none" stroke="#0050d5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          {/* Unstretched SVG for perfect circular dots */}
          <svg className="absolute top-0 left-0 h-[280px] w-full overflow-visible pointer-events-none">
            {days.map((point, i) => {
              const xPercent = (i / Math.max(days.length - 1, 1)) * 100;
              const yPercent = 100 - (point.value / 50) * 100;
              return (
                <circle key={i} cx={`${xPercent}%`} cy={`${yPercent}%`} r="5" fill="#ffb800" stroke="#0050d5" strokeWidth="2.5" />
              );
            })}
          </svg>

          <div className="mt-4 flex justify-between text-[12px] font-bold text-[#002f76]">
            {days.map((point, i) => (
              <span key={i} className="text-center">{point.day}</span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
