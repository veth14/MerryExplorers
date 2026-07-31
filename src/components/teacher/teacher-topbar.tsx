"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";

type TeacherTopbarProps = {
  title?: string;
  description?: string;
  onMenuClick?: () => void;
};

export function TeacherTopbar({ title, description, onMenuClick }: TeacherTopbarProps) {
  const { user, userProfile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    async function fetchNotifs() {
      try {
        const res = await fetch(`/api/notifications?userId=${user?.uid}`);
        const json = await res.json();
        if (json.success) {
          setNotifications(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    }
    fetchNotifs();
    
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="flex items-center justify-between gap-3 shrink-0 mb-4 lg:mb-6 relative">
      {/* Left: hamburger (mobile) + greeting */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — only on mobile */}
        <button
          onClick={onMenuClick}
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-[#e2e8f0]/80 text-[#0050d5] hover:bg-[#f0f5ff] transition-colors flex-shrink-0"
          aria-label="Open navigation menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        <div className="min-w-0">
          <h1 className="font-headline text-[22px] sm:text-[28px] font-extrabold tracking-tight text-[#002f76] flex items-center gap-2 leading-tight">
            <span className="truncate">{title || `Welcome back, ${userProfile?.fullName?.split(' ')[0] || 'Teacher'}!`}</span>
            <span className="text-[20px] sm:text-[26px] flex-shrink-0">👋</span>
          </h1>
          <p className="mt-0.5 text-[13px] sm:text-[14px] font-semibold text-[#0050d5]/70 truncate">
            {description || "Here's what's happening today across all playgroups."}
          </p>
        </div>
      </div>

      {/* Right: search + icons */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Search — hidden on small screens */}
        <label className="hidden sm:flex items-center gap-2.5 rounded-full bg-white px-4 py-2.5 shadow-sm border border-[#e2e8f0]/80 w-[180px] lg:w-[220px] cursor-text">
          <span className="text-[#a0aec0] flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search activities..."
            className="bg-transparent border-none outline-none text-[13px] font-semibold text-[#002f76] placeholder:text-[#a0aec0] w-full"
          />
        </label>

        {/* Bell / Notifications */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-[#e2e8f0]/80 text-[#0050d5] hover:bg-[#f0f5ff] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 24.585 24.585 0 0 1-4.831-1.244.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z" clipRule="evenodd" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute right-[9px] top-[9px] h-2.5 w-2.5 rounded-full border-2 border-white bg-[#e53935]" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-[300px] sm:w-[320px] bg-white rounded-2xl shadow-xl border border-[#e2e8f0] overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
                <h3 className="font-extrabold text-[13px] text-[#002f76]">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-[#0050d5] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-[12px] font-semibold text-[#9aa3b2]">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-4 border-b border-[#f0f4f9] last:border-0 hover:bg-[#f8fafc] transition-colors ${!n.read ? 'bg-[#f0f5ff]/30' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                          n.type === 'success' ? 'bg-[#2da05b]' : 
                          n.type === 'error' ? 'bg-[#e53935]' : 
                          'bg-[#0050d5]'
                        }`} />
                        <div>
                          <p className={`text-[12px] font-bold ${!n.read ? 'text-[#002f76]' : 'text-[#4a5568]'}`}>
                            {n.title}
                          </p>
                          <p className="text-[11px] font-semibold text-[#5a6e8c] mt-0.5 leading-snug">
                            {n.message}
                          </p>
                          <p className="text-[10px] font-bold text-[#a0aec0] mt-1.5 uppercase tracking-wider">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Calendar — hidden on small screens */}
        <button className="hidden sm:flex items-center gap-1.5 h-[40px] rounded-full border border-[#e2e8f0]/80 bg-white px-3 sm:px-4 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#ffb800]">
            <path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
            <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" />
          </svg>
          <span className="text-[13px] font-extrabold text-[#002f76]">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })}
          </span>
        </button>
      </div>
    </header>
  );
}
