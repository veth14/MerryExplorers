"use client";

import { useEffect, useState } from "react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import { useAuth } from "@/lib/auth-context";

type Announcement = {
  _id?: string;
  title: string;
  timeAgo: string;
  content: string;
  type: string;
  createdAt?: string;
};

type ShiftRecord = {
  _id: string;
  status: string;
  clockInTime: string;
  clockOutTime?: string;
  breaks?: { start: string; end: string | null }[];
  group: string;
  dateStr: string;
};

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
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
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

function GroupIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CoTeacherIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function timeAgoFromDate(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hrs > 0) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  if (mins > 0) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  return "Just now";
}

export default function TeacherDashboardPage() {
  const { user, userProfile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [todayShift, setTodayShift] = useState<ShiftRecord | null>(null);
  const [loadingAnn, setLoadingAnn] = useState(true);
  const [loadingShift, setLoadingShift] = useState(true);
  const [weeklyStats, setWeeklyStats] = useState({
    hours: "–",
    shifts: "–",
    onTime: "–",
    avgIn: "–"
  });

  useEffect(() => {
    if (!user?.uid) return;
    async function fetchAll() {
      try {
        const [annRes, shiftRes] = await Promise.all([
          fetch("/api/announcements"),
          fetch(`/api/attendance?uid=${user!.uid}`),
        ]);
        const [annJson, shiftJson] = await Promise.all([annRes.json(), shiftRes.json()]);
        
        if (annJson.success) setAnnouncements(annJson.data);
        
        if (shiftJson.success && Array.isArray(shiftJson.data)) {
          const records: ShiftRecord[] = shiftJson.data;
          
          // Find today's shift
          const todayStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
          const today = new Date(todayStr);
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          const todayDateStr = `${yyyy}-${mm}-${dd}`;
          
          const todaysRecord = records.find(r => r.dateStr === todayDateStr);
          if (todaysRecord) setTodayShift(todaysRecord);

          // Calculate weekly stats
          const now = new Date();
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday is 0
          startOfWeek.setHours(0, 0, 0, 0);

          const thisWeekRecords = records.filter((r) => {
            if (!r.clockInTime) return false;
            const d = new Date(r.clockInTime);
            return d >= startOfWeek;
          });

          // Shifts count
          const completedThisWeek = thisWeekRecords.filter((r) => r.status === "Completed");
          const shiftCountStr = `${completedThisWeek.length}`;

          // Hours
          let totalMs = 0;
          for (const r of completedThisWeek) {
            if (r.clockInTime && r.clockOutTime) {
              let ms = new Date(r.clockOutTime).getTime() - new Date(r.clockInTime).getTime();
              for (const b of r.breaks || []) {
                if (b.start && b.end) ms -= new Date(b.end).getTime() - new Date(b.start).getTime();
              }
              totalMs += ms;
            }
          }
          const hoursStr = totalMs > 0 
            ? `${Math.floor(totalMs / 3600000)}h ${Math.floor((totalMs % 3600000) / 60000)}m`
            : "0h 0m";

          // Avg In & On-Time Rate
          let avgInStr = "–";
          let onTimeStr = "–";

          if (thisWeekRecords.length > 0) {
            let totalMins = 0;
            let onTimeCount = 0;

            for (const r of thisWeekRecords) {
              const d = new Date(r.clockInTime);
              const m = d.getHours() * 60 + d.getMinutes();
              totalMins += m;
              if (m <= 8 * 60) onTimeCount++;
            }

            const avg = Math.floor(totalMins / thisWeekRecords.length);
            const ah = Math.floor(avg / 60);
            const am = avg % 60;
            const period = ah >= 12 ? "PM" : "AM";
            const h12 = ah % 12 || 12;
            avgInStr = `${h12}:${am.toString().padStart(2, "0")} ${period}`;

            const rate = Math.round((onTimeCount / thisWeekRecords.length) * 100);
            onTimeStr = `${rate}%`;
          }

          setWeeklyStats({
            hours: hoursStr,
            shifts: shiftCountStr,
            onTime: onTimeStr,
            avgIn: avgInStr
          });
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoadingAnn(false);
        setLoadingShift(false);
      }
    }
    fetchAll();
  }, [user]);

  const firstName = userProfile?.fullName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "Teacher";
  const isClocked = todayShift?.status === "In Progress";
  const isClockedOut = todayShift?.status === "Completed";
  const clockInTimeStr = todayShift?.clockInTime ? formatTime(todayShift.clockInTime) : null;

  return (
    <TeacherShell
      title={`Good Morning, ${firstName} 👋`}
      description="Here's what's happening at Merry Explorers today."
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 w-full">

        {/* ── Left Column ── */}
        <div className="flex flex-col gap-6">

          {/* Today's Shift Card */}
          <div className="bg-white rounded-[2rem] border-2 border-brand-yellow shadow-lg p-6 relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand-yellow/10 pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-brand-sky/20 pointer-events-none" />

            {/* Top row: shift type pill + status */}
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div className="flex items-center gap-2 bg-brand-sky/30 text-brand-navy px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider">
                <ClockIcon />
                Morning Shift
              </div>
              <div className="text-right">
                {loadingShift ? (
                  <span className="text-[12px] font-bold text-brand-navy/40">Loading…</span>
                ) : isClocked ? (
                  <>
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[12px] font-black text-green-600">Clocked In</span>
                    </div>
                    <div className="text-[10px] font-bold text-brand-navy/50 mt-0.5">Since {clockInTimeStr}</div>
                  </>
                ) : isClockedOut ? (
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[12px] font-black text-blue-600">Shift Complete</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                    <span className="text-[12px] font-black text-brand-navy/50">Not Started</span>
                  </div>
                )}
              </div>
            </div>

            {/* Shift title + time */}
            <div className="mb-6 relative z-10">
              <h2 className="text-[32px] font-black text-brand-navy leading-tight">Today&apos;s Shift</h2>
              <p className="text-[15px] font-bold text-brand-blue mt-1">{(userProfile as any)?.shiftTime || "08:00 AM - 05:00 PM"}</p>
            </div>

            {/* Info tiles */}
            <div className="grid grid-cols-3 gap-3 mb-6 relative z-10">
              {/* Role */}
              <div className="rounded-2xl bg-brand-yellow/10 border border-brand-yellow/30 p-4">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-brand-yellow mb-2">
                  <GroupIcon />
                  Role
                </div>
                <div className="text-[15px] font-black text-brand-navy">{(userProfile as any)?.role || "Teacher"}</div>
              </div>

              {/* Room */}
              <div className="rounded-2xl bg-brand-sky/20 border border-brand-sky/30 p-4">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-brand-blue mb-2">
                  <UsersIcon />
                  Room
                </div>
                <div className="text-[15px] font-black text-brand-navy">{(userProfile as any)?.assignedRoom || "Unassigned"}</div>
              </div>

              {/* Schedule */}
              <div className="rounded-2xl bg-purple-50 border border-purple-100 p-4">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-purple-400 mb-2">
                  <InfoIcon />
                  Schedule
                </div>
                <div className="text-[15px] font-black text-brand-navy">{(userProfile as any)?.scheduleType || "Full-Time"}</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 relative z-10">
              <a
                href="/teacher/clock"
                className="flex-1 text-center bg-brand-yellow text-brand-navy font-black py-3.5 rounded-2xl hover:brightness-95 transition-all text-[14px] shadow-md shadow-brand-yellow/30"
              >
                {isClocked ? "Manage Shift" : "Clock In"}
              </a>
            </div>
          </div>

          {/* Announcements Card */}
          <div className="bg-white rounded-[2rem] border-2 border-brand-sky shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <span className="block w-7 h-[3px] rounded-full bg-brand-yellow" />
                <h2 className="text-[20px] font-black text-brand-navy">Announcements</h2>
              </div>
              <button className="text-[10px] font-black uppercase tracking-widest text-brand-blue hover:underline">
                View All
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {loadingAnn ? (
                <p className="text-[13px] text-brand-navy/40 font-bold">Loading announcements…</p>
              ) : announcements.length === 0 ? (
                <p className="text-[13px] text-brand-navy/40 font-bold">No announcements right now.</p>
              ) : (
                announcements.slice(0, 3).map((a, i) => (
                  <div
                    key={a._id ?? i}
                    className={`flex gap-4 p-4 rounded-2xl border relative overflow-hidden ${
                      a.type === "alert"
                        ? "bg-amber-50/60 border-brand-yellow/30"
                        : "bg-blue-50/40 border-brand-sky/40"
                    }`}
                  >
                    {/* Left accent bar */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
                        a.type === "alert" ? "bg-brand-yellow" : "bg-brand-blue"
                      }`}
                    />
                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        a.type === "alert"
                          ? "bg-brand-yellow/20 text-amber-600"
                          : "bg-brand-sky/40 text-brand-blue"
                      }`}
                    >
                      {a.type === "alert" ? <AlertIcon /> : <InfoIcon />}
                    </div>
                    {/* Text */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-[13px] font-black text-brand-navy">{a.title}</h3>
                        <span className="text-[10px] font-bold text-brand-navy/40">
                          {a.createdAt ? timeAgoFromDate(a.createdAt) : a.timeAgo}
                        </span>
                      </div>
                      <p className="text-[12px] font-medium text-brand-navy/70 leading-relaxed">
                        {a.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="flex flex-col gap-4">
          {/* Shift History Button Card */}
          <a
            href="/teacher/history"
            className="bg-white rounded-[2rem] border-2 border-brand-sky shadow-lg p-8 hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col items-center justify-center text-center group"
          >
            <div className="w-16 h-16 rounded-full bg-brand-sky/30 text-brand-blue flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-brand-sky/50 transition-all">
              <HistoryIcon />
            </div>
            <h3 className="text-[17px] font-black text-brand-navy">Shift History</h3>
            <p className="text-[12px] font-bold text-brand-navy/50 mt-1">View past timesheets</p>
          </a>

          {/* My Profile Button Card */}
          <a
            href="/teacher/profile"
            className="bg-white rounded-[2rem] border-2 border-brand-orange shadow-lg p-8 hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col items-center justify-center text-center group"
          >
            <div className="w-16 h-16 rounded-full bg-orange-100 text-brand-orange flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-orange-200 transition-all">
              <ProfileIcon />
            </div>
            <h3 className="text-[17px] font-black text-brand-navy">My Profile</h3>
            <p className="text-[12px] font-bold text-brand-navy/50 mt-1">Update your details</p>
          </a>

          {/* Quick Stats mini card — loaded from history if available */}
          <div className="bg-white rounded-[2rem] border-2 border-purple-100 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="block w-5 h-[3px] rounded-full bg-brand-yellow" />
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-navy">
                This Week
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-brand-yellow/10 rounded-2xl p-3 text-center">
                <div className="text-[22px] font-black text-brand-navy">{weeklyStats.hours}</div>
                <div className="text-[9px] font-black uppercase tracking-wider text-amber-600 mt-0.5">Hours</div>
              </div>
              <div className="bg-brand-sky/20 rounded-2xl p-3 text-center">
                <div className="text-[22px] font-black text-brand-navy">{weeklyStats.shifts}</div>
                <div className="text-[9px] font-black uppercase tracking-wider text-brand-blue mt-0.5">Shifts</div>
              </div>
              <div className="bg-green-50 rounded-2xl p-3 text-center">
                <div className="text-[22px] font-black text-brand-navy">{weeklyStats.onTime}</div>
                <div className="text-[9px] font-black uppercase tracking-wider text-green-600 mt-0.5">On Time</div>
              </div>
              <div className="bg-purple-50 rounded-2xl p-3 text-center">
                <div className="text-[22px] font-black text-brand-navy">{weeklyStats.avgIn}</div>
                <div className="text-[9px] font-black uppercase tracking-wider text-purple-500 mt-0.5">Avg In</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </TeacherShell>
  );
}