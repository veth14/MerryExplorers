import { ReactNode } from "react";

type ReportsMetricCardProps = {
  label: string;
  value: string;
  unit?: string;
  type: "punctuality" | "clockins" | "attendance";
};

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
    </svg>
  );
}

const configs = {
  punctuality: {
    iconBg: "bg-[#e8f0fe]",
    iconColor: "text-[#005cc8]",
    icon: <ClockIcon />,
    labelColor: "text-[#005cc8]",
    accentBorder: "border-[#005cc8]/10",
  },
  clockins: {
    iconBg: "bg-[#fff9e6]",
    iconColor: "text-[#ffb800]",
    icon: <LoginIcon />,
    labelColor: "text-[#ffb800]",
    accentBorder: "border-[#ffb800]/10",
  },
  attendance: {
    iconBg: "bg-[#e6f4ea]",
    iconColor: "text-[#2da05b]",
    icon: <UsersIcon />,
    labelColor: "text-[#2da05b]",
    accentBorder: "border-[#2da05b]/10",
  },
};

export function ReportsMetricCard({ label, value, unit, type }: ReportsMetricCardProps) {
  const cfg = configs[type];
  
  return (
    <article
      id={`metric-card-${type}`}
      className={`group flex items-center gap-5 rounded-[1.25rem] bg-white px-6 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-transparent hover:border-[#005cc8]/10 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,92,200,0.08)] cursor-default`}
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${cfg.iconBg} ${cfg.iconColor} transition-transform duration-300 group-hover:scale-110`}>
        {cfg.icon}
      </div>
      <div>
        <p className={`text-[9px] font-black uppercase tracking-[0.15em] ${cfg.labelColor}`}>
          {label}
        </p>
        <p className="font-headline text-[30px] font-black leading-none tracking-tight text-[#002f76] mt-1 flex items-baseline gap-0.5">
          {value}
          {unit && <span className="text-[18px] font-bold text-[#005cc8]/50">{unit}</span>}
        </p>
      </div>
    </article>
  );
}
