import { useEffect, useRef, useState } from "react";

export type SelectOption = { value: string; label: string; icon?: string; dot?: string };

export function CustomSelect({ 
  options, 
  value, 
  onChange, 
  fullWidth = true 
}: {
  options: SelectOption[];
  value: string;
  onChange: (v: string) => void;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={ref} className={`relative ${fullWidth ? "w-full" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 bg-white rounded-xl border px-3 py-2 sm:px-3 sm:py-2.5 shadow-sm transition-all select-none ${fullWidth ? "w-full justify-between" : ""} ${open ? "border-[#005cc8] shadow-[0_0_0_3px_rgba(0,92,200,0.10)] ring-1 ring-[#005cc8]" : "border-[#e2e8f0] hover:border-[#a8c4f0]"}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected.icon ? (
            <span className="material-symbols-outlined text-[16px] text-[#005cc8] shrink-0">{selected.icon}</span>
          ) : selected.dot ? (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selected.dot}`} />
          ) : null}
          <span className="text-[13px] font-bold text-[#002f76] truncate">{selected.label}</span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          className={`w-3.5 h-3.5 text-[#002f76] transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div className={`absolute top-[calc(100%+6px)] left-0 z-50 min-w-[170px] ${fullWidth ? "w-full" : ""} bg-white rounded-xl border-2 border-[#e2e8f0] shadow-[0_12px_40px_-10px_rgba(0,47,118,0.18)] overflow-hidden transition-all duration-200 origin-top-left ${open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 -translate-y-1 pointer-events-none"}`}>
        <div className="p-1 flex flex-col gap-0.5">
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button key={opt.value} type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-bold text-left transition-colors ${isActive ? "bg-[#005cc8] text-white" : "text-[#002f76] hover:bg-[#f0f5ff]"}`}
              >
                {opt.icon ? (
                  <span className={`material-symbols-outlined text-[16px] shrink-0 ${isActive ? "text-white" : "text-[#005cc8]"}`}>{opt.icon}</span>
                ) : opt.dot ? (
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? "bg-white/80" : opt.dot}`} />
                ) : null}
                <span className="flex-1 truncate">{opt.label}</span>
                {isActive && <span className="material-symbols-outlined text-[16px] text-white shrink-0">check</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
