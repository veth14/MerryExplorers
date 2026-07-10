type MetricCardProps = {
  label: string;
  value: string;
  meta: string;
  type: "teachers" | "sessions" | "punctuality" | "clockins";
};

function TeachersGraphic() {
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

function SessionsGraphic() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full">
      <circle cx="40" cy="30" r="24" fill="none" stroke="#d4f0e2" strokeWidth="5" />
      <circle cx="40" cy="30" r="24" fill="none" stroke="#2da05b" strokeWidth="5"
        strokeDasharray={`${(10 / 12) * 150.8} 150.8`}
        strokeDashoffset="37.7"
        strokeLinecap="round"
        transform="rotate(-90 40 30)"
      />
      <circle cx="40" cy="30" r="15" fill="#e8f9f0" />
      <text x="40" y="35" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#2da05b">10/12</text>
    </svg>
  );
}

function PunctualityGraphic() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full">
      <circle cx="40" cy="32" r="24" fill="none" stroke="#fff3cc" strokeWidth="5" />
      <circle cx="40" cy="32" r="24" fill="none" stroke="#ffb800" strokeWidth="5"
        strokeDasharray={`${0.94 * 150.8} 150.8`}
        strokeDashoffset="37.7"
        strokeLinecap="round"
        transform="rotate(-90 40 32)"
      />
      <circle cx="40" cy="32" r="15" fill="#fff9e6" />
      <path d="M40 20 L43 29 L52 29 L45 35 L47 44 L40 38 L33 44 L35 35 L28 29 L37 29 Z" fill="#ffb800" opacity="0.6" />
    </svg>
  );
}

function ClockInsGraphic() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full">
      <circle cx="40" cy="32" r="22" fill="#fff9e6" stroke="#ffb800" strokeWidth="2" />
      <line x1="40" y1="14" x2="40" y2="32" stroke="#ffb800" strokeWidth="3" strokeLinecap="round" />
      <line x1="40" y1="32" x2="54" y2="40" stroke="#002f76" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="32" r="3" fill="#002f76" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = Number((40 + 18 * Math.cos(rad)).toFixed(3));
        const y1 = Number((32 + 18 * Math.sin(rad)).toFixed(3));
        const x2 = Number((40 + 22 * Math.cos(rad)).toFixed(3));
        const y2 = Number((32 + 22 * Math.sin(rad)).toFixed(3));
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffb800" strokeWidth={i % 3 === 0 ? 2 : 1} />;
      })}
    </svg>
  );
}

const configs = {
  teachers: {
    labelColor: "text-[#0050d5]",
    valueColor: "text-[#002f76]",
    metaIcon: "✅",
    metaColor: "text-[#2da05b]",
    borderColor: "border-[#0050d5]",
    graphic: <TeachersGraphic />,
  },
  sessions: {
    labelColor: "text-[#2da05b]",
    valueColor: "text-[#002f76]",
    metaIcon: "✅",
    metaColor: "text-[#2da05b]",
    borderColor: "border-[#2da05b]",
    graphic: <SessionsGraphic />,
  },
  punctuality: {
    labelColor: "text-[#ffb800]",
    valueColor: "text-[#002f76]",
    metaIcon: "⭐",
    metaColor: "text-[#ffb800]",
    borderColor: "border-[#ffb800]",
    graphic: <PunctualityGraphic />,
  },
  clockins: {
    labelColor: "text-[#ffb800]",
    valueColor: "text-[#002f76]",
    metaIcon: "🔄",
    metaColor: "text-[#ffb800]",
    borderColor: "border-[#ffb800]",
    graphic: <ClockInsGraphic />,
  },
};

export function MetricCard({ label, value, meta, type }: MetricCardProps) {
  const cfg = configs[type];

  const formatValue = (val: string) => {
    if (val.includes("/")) {
      const [first, second] = val.split("/");
      return (
        <>
          {first}
          <span className="text-[#a0aec0] text-[28px] font-bold">/{second}</span>
        </>
      );
    }
    return val;
  };

  return (
    <article
      className={`relative overflow-hidden rounded-[1.25rem] bg-white px-5 pb-5 pt-5 border-b-[4px] ${cfg.borderColor} shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)]`}
    >
      {/* Graphic decoration top-right */}
      <div className="absolute right-2 top-2 w-[72px] h-[54px] opacity-70 pointer-events-none">
        {cfg.graphic}
      </div>

      <p className={`text-[11.5px] font-extrabold uppercase tracking-widest ${cfg.labelColor}`}>
        {label}
      </p>

      <p className="font-headline text-[42px] font-extrabold leading-none tracking-tight text-[#002f76] mt-2 flex items-baseline">
        {formatValue(value)}
      </p>

      <p className={`mt-2.5 text-[13px] font-bold ${cfg.metaColor} flex items-center gap-1.5`}>
        <span>{cfg.metaIcon}</span>
        {meta}
      </p>
    </article>
  );
}
