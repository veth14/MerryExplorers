"use client";

import { useState, useRef, useEffect } from "react";
import { notifications as initialNotifications, notificationMeta, AppNotification, NotificationType } from "@/data/notifications";

type TopbarProps = {
  title: string;
  description: string;
  onMenuClick?: () => void;
};

export function Topbar({ title, description, onMenuClick }: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchNotifs() {
      try {
        const res = await fetch("/api/notifications");
        const json = await res.json();
        if (json.success) setItems(json.data);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    }
    fetchNotifs();
  }, []);

  const unreadCount = items.filter((n) => !n.read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleNotif() {
    setNotifOpen((open) => !open);
  }

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const [clientDate, setClientDate] = useState<string | null>(null);
  useEffect(() => {
    setClientDate(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }));
  }, []);

  function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  return (
    <header className="flex items-center justify-between gap-3 shrink-0">
      {/* Left: hamburger (mobile) + greeting */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — only on mobile */}
        <button
          onClick={onMenuClick}
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-[#e2e8f0]/80 text-[#0050d5] hover:bg-[#f0f4f9] transition-all flex-shrink-0"
          aria-label="Open navigation menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        <div className="min-w-0">
          <h1 className="font-headline text-[22px] sm:text-[28px] font-extrabold tracking-tight text-[#002f76] flex items-center gap-2 leading-tight">
            <span className="truncate">{title}</span> <span className="text-[20px] sm:text-[26px] flex-shrink-0">👋</span>
          </h1>
          <p className="mt-0.5 text-[13px] sm:text-[14px] font-semibold text-[#0050d5]/70 truncate">{description}</p>
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

        {/* Bell + Notification dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={toggleNotif}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            className="relative flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-[#e2e8f0]/80 text-[#0050d5] transition-all hover:bg-[#f0f4f9]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 24.585 24.585 0 0 1-4.831-1.244.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z" clipRule="evenodd" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute right-[6px] top-[6px] flex h-[16px] min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-[#ba1a1a] px-1 text-[9px] font-black text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          <div
            className={`absolute right-0 top-[calc(100%+10px)] z-50 w-[320px] sm:w-[360px] origin-top-right rounded-2xl bg-white border-2 border-[#e2e8f0] shadow-xl transition-all duration-200 ${
              notifOpen
                ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <h3 className="font-headline text-[15px] font-black text-[#002f76]">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-[#ba1a1a]/10 px-2 py-0.5 text-[10px] font-black text-[#ba1a1a]">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] font-bold text-[#0050d5] hover:underline transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[340px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center">
                  <span className="material-symbols-outlined text-[#a0aec0]" style={{ fontSize: "32px" }}>
                    notifications_off
                  </span>
                  <p className="text-[12px] font-bold text-[#a0aec0]">No notifications yet</p>
                </div>
              ) : (
                items.map((n) => {
                  const meta = notificationMeta[n.type] ?? notificationMeta["info"];
                  return (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[#f0f4f9] ${
                        !n.read ? "bg-[#f0f4f9]/60" : ""
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: meta.bg }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "18px", color: meta.color }}
                        >
                          {meta.icon}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[12px] font-black text-[#002f76] truncate">{n.title}</p>
                          {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-[#ba1a1a]" />}
                        </div>
                        <p className="mt-0.5 text-[11px] font-semibold text-[#4a5568] leading-snug">{n.message}</p>
                        <p className="mt-1 text-[10px] font-bold text-[#a0aec0]">{n.time}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#e2e8f0] px-5 py-3 text-center">
              <button className="text-[11px] font-black text-[#0050d5] hover:underline transition-colors">
                View all notifications
              </button>
            </div>
          </div>
        </div>

        {/* Calendar — hidden on small screens */}
        <button className="hidden sm:flex items-center gap-1.5 h-[40px] rounded-full border border-[#e2e8f0]/80 bg-white px-3 sm:px-4 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#ffb800]">
            <path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
            <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" />
          </svg>
          <span className="text-[13px] font-extrabold text-[#002f76]">
            {clientDate}
          </span>
        </button>
      </div>
    </header>
  );
}
