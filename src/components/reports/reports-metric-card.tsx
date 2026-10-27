type ReportsMetricCardProps = {
  label: string;
  value: string;
  unit?: string;
  meta?: string;
  type: "punctuality" | "clockins" | "attendance";
};

const configs = {
  punctuality: {
    iconName: "schedule",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-700",
    labelColor: "text-blue-700",
    accent: "bg-blue-600",
  },
  clockins: {
    iconName: "login",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
    labelColor: "text-amber-700",
    accent: "bg-amber-500",
  },
  attendance: {
    iconName: "schedule",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-700",
    labelColor: "text-rose-700",
    accent: "bg-rose-500",
  },
} as const;

export function ReportsMetricCard({ label, value, unit, meta, type }: ReportsMetricCardProps) {
  const cfg = configs[type];

  return (
    <article
      id={`metric-card-${type}`}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${cfg.accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-[10px] font-extrabold uppercase tracking-[0.14em] ${cfg.labelColor}`}>
            {label}
          </p>
          <p className="mt-2 flex items-baseline gap-1 font-headline text-[34px] font-extrabold leading-none tracking-tight text-[#002f76]">
            {value}
            {unit && <span className="text-[18px] font-bold text-slate-400">{unit}</span>}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg} ${cfg.iconColor}`}
        >
          <span
            className="material-symbols-outlined text-[22px]"
            style={{
              fontSize: "28px",
              fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
            }}
          >
            {cfg.iconName}
          </span>
        </div>
      </div>
      {meta && <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-500">{meta}</p>}
    </article>
  );
}
