type ReportsMetricCardProps = {
  label: string;
  value: string;
  unit?: string;
  type: "punctuality" | "clockins" | "attendance";
};

const configs = {
  punctuality: {
    iconName: "schedule",
    iconBg: "bg-brand-sky/60",
    iconColor: "text-brand-blue",
    labelColor: "text-brand-blue",
    borderColor: "border-brand-sky",
  },
  clockins: {
    iconName: "login",
    iconBg: "bg-brand-orange/15",
    iconColor: "text-brand-orange",
    labelColor: "text-brand-orange",
    borderColor: "border-brand-orange",
  },
  attendance: {
    iconName: "groups",
    iconBg: "bg-brand-green/15",
    iconColor: "text-brand-green",
    labelColor: "text-brand-green",
    borderColor: "border-brand-green",
  },
} as const;

export function ReportsMetricCard({ label, value, unit, type }: ReportsMetricCardProps) {
  const cfg = configs[type];

  return (
    <article
      id={`metric-card-${type}`}
      className={`group flex items-center gap-5 rounded-[2rem] bg-white px-6 py-5 shadow-lg border-2 ${cfg.borderColor} transition-all duration-300 hover:shadow-xl cursor-default`}
    >
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${cfg.iconBg} ${cfg.iconColor} transition-transform duration-300 group-hover:scale-110`}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: "28px",
            fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
          }}
        >
          {cfg.iconName}
        </span>
      </div>
      <div>
        <p className={`text-[10px] font-black uppercase tracking-[0.15em] ${cfg.labelColor}`}>
          {label}
        </p>
        <p className="font-headline text-[32px] font-black leading-none tracking-tight text-brand-navy mt-1 flex items-baseline gap-0.5">
          {value}
          {unit && <span className="text-[18px] font-bold text-brand-navy/50">{unit}</span>}
        </p>
      </div>
    </article>
  );
}
