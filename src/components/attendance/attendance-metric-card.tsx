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
    labelColor: "text-[#005cc8]",
    borderColor: "border-[#005cc8]",
    graphic: <PresentGraphic />,
  },
  late: {
    labelColor: "text-[#ffb800]",
    borderColor: "border-[#ffb800]",
    graphic: <LateGraphic />,
  },
  absent: {
    labelColor: "text-[#ef4444]",
    borderColor: "border-[#ef4444]",
    graphic: <AbsentGraphic />,
  },
  leave: {
    labelColor: "text-[#2da05b]",
    borderColor: "border-[#2da05b]",
    graphic: <LeaveGraphic />,
  },
};

export function AttendanceMetricCard({ label, value, type }: AttendanceMetricCardProps) {
  const cfg = configs[type];
  return (
    <article
      className={`relative overflow-hidden rounded-[1.25rem] bg-white px-6 pb-6 pt-5 border-b-[5px] ${cfg.borderColor} shadow-[0_4px_20px_rgba(0,0,0,0.04)]`}
    >
      <div className="absolute right-4 top-4 w-[60px] h-[45px] opacity-80 pointer-events-none">
        {cfg.graphic}
      </div>
      <p className={`text-[11px] font-black uppercase tracking-widest ${cfg.labelColor}`}>
        {label}
      </p>
      <p className="font-headline text-[42px] font-black leading-none tracking-tight text-[#002f76] mt-3">
        {value}
      </p>
    </article>
  );
}
