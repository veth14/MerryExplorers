import Image from "next/image";

type TeamMember = {
  name: string;
  initials: string;
  status: "WORKING" | "ON BREAK" | "NOT STARTED" | "COMPLETED";
  hours: string;
  color: string;
  avatar?: string;
  isLogo?: boolean;
};

type DailyTeamOverviewProps = {
  members: readonly TeamMember[];
  activeCount: number;
};

const statusStyles: Record<TeamMember["status"], { label: string; color: string }> = {
  WORKING: { label: "WORKING", color: "text-[#2da05b]" },
  "ON BREAK": { label: "ON BREAK", color: "text-[#ffb800]" },
  "NOT STARTED": { label: "NOT STARTED", color: "text-[#a0aec0]" },
  COMPLETED: { label: "COMPLETED", color: "text-[#0050d5]" },
};

export function DailyTeamOverview({ members, activeCount }: DailyTeamOverviewProps) {
  return (
    <section className="rounded-[1.25rem] bg-white px-6 py-5 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.08)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-[#0050d5]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.233.96 10.088 10.088 0 0 0 5.06-1.01.75.75 0 0 0 .42-.643 4.875 4.875 0 0 0-6.957-4.611 8.586 8.586 0 0 1 1.71 5.157v.003Z" />
            </svg>
          </span>
          <h2 className="font-headline text-[18px] font-extrabold text-[#002f76]">Daily Team Overview</h2>
        </div>
        <span className="text-[12px] font-bold text-[#0050d5]">{activeCount} Members Active</span>
      </div>

      {/* Members — horizontally scrollable on mobile, spread on desktop */}
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex items-start justify-start gap-4 sm:justify-around min-w-max sm:min-w-0">
        {members.map((member) => {
          const style = statusStyles[member.status];
          const isNotStarted = member.status === "NOT STARTED";
          const isOnBreak = member.status === "ON BREAK";
          const isCompleted = member.status === "COMPLETED";

          // First name only for inside avatar
          const firstName = member.name.replace(/^(Ms\.|Mr\.)\s*/, "").split(" ")[0];

          return (
            <div key={member.name} className="flex flex-col items-center gap-2">
              {/* Avatar */}
              <div className="relative">
                <div
                  className={`w-[65px] h-[65px] rounded-full border-[3px] flex items-center justify-center overflow-hidden relative ${
                    isNotStarted
                      ? "border-[#444] bg-[#333]"
                      : isOnBreak
                      ? "border-[#ffb800] bg-white"
                      : isCompleted
                      ? "border-[#0050d5] bg-white"
                      : "border-[#2da05b] bg-white"
                  }`}
                >
                  {member.isLogo ? (
                    <Image src="/LOGO.jpg" alt={member.name} fill className="object-contain" />
                  ) : isNotStarted ? (
                    <div className="w-full h-full flex items-center justify-center bg-[#333]">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-8 h-8 opacity-70">
                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : member.avatar ? (
                    <Image src={member.avatar} alt={member.name} fill className="object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-[15px] font-extrabold"
                      style={{
                        background: isOnBreak
                          ? "linear-gradient(135deg, #fff9e6 0%, #fff0cc 100%)"
                          : "linear-gradient(135deg, #e8f4ff 0%, #d1e8ff 100%)",
                        color: isOnBreak ? "#b07800" : "#0050d5",
                      }}
                    >
                      {firstName}
                    </div>
                  )}
                </div>
                {/* Status dot */}
                <span
                  className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                    isNotStarted ? "bg-[#a0aec0]" : isOnBreak ? "bg-[#ffb800]" : isCompleted ? "bg-[#0050d5]" : "bg-[#2da05b]"
                  }`}
                />
              </div>

              {/* Full name */}
              <p className="text-[13px] font-extrabold text-[#002f76] text-center leading-tight whitespace-nowrap">
                {member.name}
              </p>

              {/* Status label */}
              <span className={`text-[10px] font-extrabold uppercase tracking-wide ${style.color}`}>
                {style.label}
              </span>

              {/* Hours */}
              <p className={`text-[13px] font-bold ${isNotStarted ? "text-[#a0aec0]" : "text-[#0050d5]"}`}>
                {member.hours}
              </p>
            </div>
          );
        })}
        </div>
      </div>
    </section>
  );
}
