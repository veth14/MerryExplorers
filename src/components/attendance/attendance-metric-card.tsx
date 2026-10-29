type AttendanceMetricCardProps = {
  label: string;
  value: string;
  type: "present" | "late" | "absent" | "leave";
};

function PresentGraphic() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full">
      <circle cx="40" cy="22" r="14" fill="#e8effe" />
      <circle cx="40" cy="22" r="10" fill="#005cc8" opacity="0.1" />
      <ellipse cx="40" cy="48" rx="22" ry="10" fill="#e8effe" />
      <circle cx="18" cy="26" r="9" fill="#e8effe" />
      <ellipse cx="10" cy="44" rx="14" ry="8" fill="#f0f5ff" />
      <circle cx="62" cy="26" r="9" fill="#e8effe" />
      <ellipse cx="70" cy="44" rx="14" ry="8" fill="#f0f5ff" />
    </svg>
  );
}

function LateGraphic() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full">
      <circle cx="40" cy="30" r="22" fill="#fff9e6" />
      <circle cx="40" cy="30" r="18" fill="none" stroke="#ffe082" strokeWidth="3" />
      <path d="M40 20v10l6 4" stroke="#ffb800" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </svg>
  );
}

function AbsentGraphic() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full">
      <circle cx="40" cy="22" r="14" fill="#fee2e2" />
      <ellipse cx="40" cy="48" rx="22" ry="10" fill="#fee2e2" />
      <line x1="20" y1="15" x2="60" y2="55" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <line x1="20" y1="15" x2="60" y2="55" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

function LeaveGraphic() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full">
      <path d="M25 45h30" stroke="#dcfce7" strokeWidth="4" strokeLinecap="round" />
      <path d="M22 35l10-8 15-2 15 5" fill="none" stroke="#dcfce7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 25l10-5 10 5" fill="none" stroke="#2da05b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
    </svg>
  );
}

const configs = {
  present: {
    labelColor: "text-[#0066cc]",
    borderColor: "border-t-[#0066cc]",
    graphic: <PresentGraphic />,
  },
  late: {
    labelColor: "text-[#9a6a00]",
    borderColor: "border-t-[#ffcc00]",
    graphic: <LateGraphic />,
  },
  absent: {
    labelColor: "text-[#ef4444]",
    borderColor: "border-t-[#ef4444]",
    graphic: <AbsentGraphic />,
  },
  leave: {
    labelColor: "text-[#2da05b]",
    borderColor: "border-t-[#2da05b]",
    graphic: <LeaveGraphic />,
  },
};

export function AttendanceMetricCard({ label, value, type }: AttendanceMetricCardProps) {
  const cfg = configs[type];
  return (
    <article
      className={`relative overflow-hidden rounded-2xl border border-[#e2eaf4] border-t-4 bg-white px-5 pb-5 pt-4 shadow-sm ${cfg.borderColor}`}
    >
      <div className="pointer-events-none absolute right-4 top-4 h-[45px] w-[60px] opacity-60">
        {cfg.graphic}
      </div>
      <p className={`text-[11px] font-extrabold uppercase tracking-wide ${cfg.labelColor}`}>
        {label}
      </p>
      <p className="mt-3 font-headline text-[38px] font-extrabold leading-none tabular-nums text-[#003399]">
        {value}
      </p>
    </article>
  );
}
