import { TeacherShell } from "@/components/teacher/teacher-shell";
import { currentShift, teacherAnnouncements } from "@/data/teacher-dashboard";

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="m11.3 5.3 8.3 8.3" />
      <path d="m14 2 8 8" />
      <path d="M17 11V7" />
      <path d="M21 15v-4" />
      <path d="M22 22 2 2" />
      <path d="M8 8v4" />
      <path d="m5 5 1.4 1.4" />
      <path d="m8.6 15 11.3-11.3" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export default function TeacherDashboardPage() {
  return (
    <TeacherShell title="Good Morning, Sarah" description="Here's what's happening at Merry Explorers today.">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 w-full">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Today's Shift Card */}
          <div className="rounded-[1.25rem] bg-white border-2 border-[#ffb800] p-6 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2 bg-[#f0f4f9] px-3 py-1.5 rounded-full text-[11px] font-bold text-[#002f76]">
                <ClockIcon />
                {currentShift.type}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#005cc8]">
                  <span className="w-2 h-2 rounded-full bg-[#005cc8]" />
                  {currentShift.status}
                </div>
                <div className="text-[10px] font-semibold text-[#002f76]/60 mt-1">
                  {currentShift.since}
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-[28px] font-extrabold text-[#002f76] leading-tight">Today&apos;s Shift</h2>
              <p className="text-[14px] font-bold text-[#005cc8] mt-1">{currentShift.timeRange}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-[#fcfdfd] rounded-xl p-4 border border-[#f0f4f9]">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#005cc8]/60 mb-1">ASSIGNED GROUP</div>
                <div className="text-[16px] font-extrabold text-[#002f76]">{currentShift.group}</div>
              </div>
              <div className="bg-[#fcfdfd] rounded-xl p-4 border border-[#f0f4f9]">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#005cc8]/60 mb-1">STUDENTS</div>
                <div className="text-[16px] font-extrabold text-[#002f76]">{currentShift.students}</div>
              </div>
              <div className="bg-[#fcfdfd] rounded-xl p-4 border border-[#f0f4f9]">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#005cc8]/60 mb-1">CO-TEACHER</div>
                <div className="text-[16px] font-extrabold text-[#002f76]">{currentShift.coTeacher}</div>
              </div>
            </div>

            <div className="flex gap-4">
              <button className="flex-1 bg-white border border-[#e2e8f0] text-[#002f76] font-extrabold py-3.5 rounded-full hover:bg-[#f0f4f9] transition-colors shadow-sm">
                Take Break
              </button>
              <button className="flex-1 bg-[#ffb800] text-[#002f76] font-extrabold py-3.5 rounded-full hover:bg-[#ffb800]/90 transition-colors shadow-sm">
                Clock Out
              </button>
            </div>
          </div>

          {/* Announcements */}
          <div className="rounded-[1.25rem] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[20px] font-extrabold text-[#002f76]">Announcements</h2>
              <button className="text-[11px] font-black uppercase tracking-wider text-[#005cc8] hover:underline">
                VIEW ALL
              </button>
            </div>

            <div className="space-y-4">
              {teacherAnnouncements.map((announcement) => (
                <div key={announcement.id} className="flex gap-4 relative pl-4">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-full ${announcement.type === "alert" ? "bg-[#ffb800]" : "bg-[#005cc8]"}`} />
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${announcement.type === "alert" ? "bg-[#fff9e6] text-[#ffb800]" : "bg-[#e8f0fe] text-[#005cc8]"}`}>
                    {announcement.type === "alert" ? <AlertIcon /> : <InfoIcon />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-[14px] font-extrabold text-[#002f76]">{announcement.title}</h3>
                      <span className="text-[11px] font-bold text-[#002f76]/50">{announcement.timeAgo}</span>
                    </div>
                    <p className="text-[13px] font-medium text-[#002f76]/70 leading-relaxed">
                      {announcement.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <button className="rounded-[1.25rem] bg-white p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all flex flex-col items-center justify-center text-center group">
            <div className="w-14 h-14 rounded-full bg-[#e8f0fe] text-[#005cc8] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <HistoryIcon />
            </div>
            <h3 className="text-[18px] font-extrabold text-[#002f76]">Shift History</h3>
            <p className="text-[13px] font-medium text-[#002f76]/60 mt-1">View past timesheets</p>
          </button>

          <button className="rounded-[1.25rem] bg-white p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all flex flex-col items-center justify-center text-center group">
            <div className="w-14 h-14 rounded-full bg-[#e8f0fe] text-[#005cc8] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ProfileIcon />
            </div>
            <h3 className="text-[18px] font-extrabold text-[#002f76]">My Profile</h3>
            <p className="text-[13px] font-medium text-[#002f76]/60 mt-1">Update details</p>
          </button>
        </div>
      </div>
    </TeacherShell>
  );
}
