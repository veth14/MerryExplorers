import Image from "next/image";

type ActiveStatusItem = {
  name: string;
  time: string;
  status: "ON TIME" | "LATE (5M)" | "COMPLETED";
  avatar?: string;
};

type HistoryItem = {
  name: string;
  time: string;
  type: "in" | "out";
};

type AttendanceHubProps = {
  activeStatus: readonly ActiveStatusItem[];
  history: readonly HistoryItem[];
};

function MemberAvatar({ name, avatar, isCompleted }: { name: string; avatar?: string; isCompleted: boolean }) {
  const initials = name
    .split(" ")
    .filter((w) => w.match(/^[A-Z]/))
    .slice(0, 1)
    .map((w) => w[0])
    .join("");

  return (
    <div className={`w-9 h-9 rounded-full border-[2px] flex items-center justify-center overflow-hidden relative bg-white flex-shrink-0 ${isCompleted ? 'border-[#0050d5]' : 'border-[#2da05b]'}`}>
      {avatar ? (
        <Image src={avatar} alt={name} fill className="object-cover" />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-[13px] font-extrabold text-[#0050d5]"
          style={{ background: "linear-gradient(135deg, #e8f4ff 0%, #d1e8ff 100%)" }}
        >
          {initials || "?"}
        </div>
      )}
    </div>
  );
}

export function AttendanceHub({ activeStatus, history }: AttendanceHubProps) {
  return (
    <section className="h-full rounded-[1.25rem] bg-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.08)] border-[2px] border-[#ffb800]/60 relative overflow-hidden flex flex-col">
      {/* LIVE NOW badge */}
      <div className="absolute top-0 right-0 bg-[#2da05b] text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-bl-[1rem] rounded-tr-[1.1rem] flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
        LIVE NOW
      </div>

      <div className="px-6 pt-5 pb-6 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[#0050d5]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0 1 18 9.375v9.375a3 3 0 0 0 3-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 0 0-.673-.05A3 3 0 0 0 15 1.5h-1.5a3 3 0 0 0-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6ZM13.5 3A1.5 1.5 0 0 0 12 4.5h4.5A1.5 1.5 0 0 0 15 3h-1.5Z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V9.375Zm9.586 4.594a.75.75 0 0 0-1.172-.938l-2.476 3.096-.908-.907a.75.75 0 0 0-1.06 1.06l1.5 1.5a.75.75 0 0 0 1.116-.062l3-3.75Z" clipRule="evenodd" />
            </svg>
          </span>
          <h2 className="font-headline text-[18px] font-extrabold text-[#002f76]">Attendance Hub</h2>
        </div>

        {/* Two columns - stacks on mobile, side-by-side on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1 min-h-0 overflow-auto">
          {/* Active Status */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#0050d5] inline-block" />
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#0050d5]">Active Status</p>
            </div>
            <div className="flex flex-col gap-2">
              {activeStatus.map((item) => {
                const isOnTime = item.status === "ON TIME";
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-3 bg-[#f8faff] rounded-[10px] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <MemberAvatar name={item.name} avatar={item.avatar} isCompleted={item.status === "COMPLETED"} />
                      <div>
                        <p className="text-[14px] font-bold text-[#002f76] leading-tight">{item.name}</p>
                        <p className="text-[11px] font-semibold text-[#0050d5]/60">{item.time}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full whitespace-nowrap ${
                        item.status === "ON TIME"
                          ? "bg-[#2da05b] text-white"
                          : item.status === "COMPLETED"
                          ? "bg-[#0050d5] text-white"
                          : "bg-[#ffb800] text-[#002f76]"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#0050d5]">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
                </svg>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#0050d5]">Today&apos;s History</p>
              </div>
              <button className="text-[10px] font-bold text-[#0050d5] hover:underline uppercase tracking-wide">
                View All
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              {history.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  {/* Clock in / out icon */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.type === "in" ? "bg-[#e8f9f0]" : "bg-[#ffeaea]"
                    }`}
                  >
                    {item.type === "in" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#2da05b]">
                        <path fillRule="evenodd" d="M15.75 2.25H21a.75.75 0 0 1 .75.75v5.25a.75.75 0 0 1-1.5 0V4.81L8.03 17.03a.75.75 0 0 1-1.06-1.06L19.19 3.75h-3.44a.75.75 0 0 1 0-1.5Zm-10.5 4.5a1.5 1.5 0 0 0-1.5 1.5v10.5a1.5 1.5 0 0 0 1.5 1.5h10.5a1.5 1.5 0 0 0 1.5-1.5V10.5a.75.75 0 0 1 1.5 0v8.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V8.25a3 3 0 0 1 3-3H13.5a.75.75 0 0 1 0 1.5H5.25Z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#ba1a1a]">
                        <path fillRule="evenodd" d="M9.53 2.47a.75.75 0 0 1 0 1.06L4.81 8.25H13.5a.75.75 0 0 1 0 1.5H4.81l4.72 4.72a.75.75 0 1 1-1.06 1.06l-6-6a.75.75 0 0 1 0-1.06l6-6a.75.75 0 0 1 1.06 0Zm10.44 11.47a3 3 0 0 1-3 3H5.25a.75.75 0 0 1 0-1.5H16.97a1.5 1.5 0 0 0 1.5-1.5V6.44a.75.75 0 0 1 1.5 0v7.5Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#0050d5] leading-tight">{item.name}</p>
                    <p className="text-[11px] font-semibold text-[#0050d5]/50">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
