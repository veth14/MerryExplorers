type TeacherMetricCardProps = {
  label: string;
  value: string;
  meta: string;
  type: "total" | "active" | "leave";
};

function TotalTeachersGraphic() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full">
      <circle cx="40" cy="22" r="14" fill="#d1dff9" />
      <circle cx="40" cy="22" r="10" fill="#6c98ff" opacity="0.5" />
      <ellipse cx="40" cy="48" rx="22" ry="10" fill="#d1dff9" />
      <circle cx="18" cy="26" r="9" fill="#d1dff9" />
      <ellipse cx="10" cy="44" rx="14" ry="8" fill="#e8effe" />
      <circle cx="62" cy="26" r="9" fill="#d1dff9" />
      <ellipse cx="70" cy="44" rx="14" ry="8" fill="#e8effe" />
    </svg>
  );
}

function ActiveTodayGraphic() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full">
      <circle cx="40" cy="28" r="22" fill="none" stroke="#d4f0e2" strokeWidth="5" />
      <circle cx="40" cy="28" r="22" fill="none" stroke="#2da05b" strokeWidth="5"
        strokeDasharray={`${(18 / 22) * 138.2} 138.2`}
        strokeDashoffset="34.5"
        strokeLinecap="round"
        transform="rotate(-90 40 28)"
      />
      <circle cx="40" cy="28" r="14" fill="#e8f9f0" />
      <text x="40" y="33" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#2da05b">18/22</text>
    </svg>
  );
}

function OnLeaveGraphic() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full">
      <circle cx="40" cy="28" r="22" fill="#fff9e6" stroke="#ffb800" strokeWidth="2" />
      <path d="M32 20 Q40 12 48 20 L48 36 Q40 44 32 36 Z" fill="#ffb800" opacity="0.25" />
      <path d="M36 28 L39 31 L44 24" stroke="#ffb800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <text x="40" y="52" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ffb800">ON LEAVE</text>
    </svg>
  );
}

const configs = {
  total: {
    labelColor: "text-[#0050d5]",
    metaIcon: "↑",
    metaColor: "text-[#2da05b]",
    borderColor: "border-[#0050d5]",
    graphic: <TotalTeachersGraphic />,
  },
  active: {
    labelColor: "text-[#2da05b]",
    metaIcon: "📅",
    metaColor: "text-[#555]",
    borderColor: "border-[#2da05b]",
    graphic: <ActiveTodayGraphic />,
  },
  leave: {
    labelColor: "text-[#ffb800]",
    metaIcon: "🔄",
    metaColor: "text-[#555]",
    borderColor: "border-[#ffb800]",
    graphic: <OnLeaveGraphic />,
  },
};

export function TeacherMetricCard({ label, value, meta, type }: TeacherMetricCardProps) {
  const cfg = configs[type];
  return (
    <article
      className={`relative overflow-hidden rounded-[1.25rem] bg-white px-5 pb-5 pt-5 border-b-[4px] ${cfg.borderColor} shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)]`}
    >
      <div className="absolute right-2 top-2 w-[72px] h-[54px] opacity-70 pointer-events-none">
        {cfg.graphic}
      </div>
      <p className={`text-[11.5px] font-extrabold uppercase tracking-widest ${cfg.labelColor}`}>
        {label}
      </p>
      <p className="font-headline text-[42px] font-extrabold leading-none tracking-tight text-[#002f76] mt-2">
        {value}
      </p>
      <p className={`mt-2.5 text-[13px] font-bold ${cfg.metaColor} flex items-center gap-1.5`}>
        <span>{cfg.metaIcon}</span>
        {meta}
      </p>
    </article>
  );
}
