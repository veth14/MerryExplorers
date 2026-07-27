import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { teacherNavItems } from "@/data/teacher-dashboard";

function DashboardIcon({ active }: { active?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill={active ? "#fff" : "currentColor"} />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity={active ? 0.7 : 1} />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity={active ? 0.7 : 1} />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity={active ? 0.7 : 1} />
    </svg>
  );
}

function ClockInOutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 12a9 9 0 1 1-9-9" />
      <path d="M21 3v5h-5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
    </svg>
  );
}

function BugReportIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="m8 2 1.88 1.88" />
      <path d="M14.12 3.88 16 2" />
      <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6Z" />
      <path d="M12 20v-9" />
      <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
      <path d="M6 12H2" />
      <path d="M3 15c2.1 0 3.9-1.4 4.5-3.3" />
      <path d="M17.47 9c1.93-.2 3.53-1.9 3.53-4" />
      <path d="M18 12h4" />
      <path d="M21 15c-2.1 0-3.9-1.4-4.5-3.3" />
    </svg>
  );
}

function LeaveIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M9 16l2 2 4-4" />
    </svg>
  );
}

const iconMap: Record<string, React.ComponentType<{ active?: boolean }>> = {
  Dashboard: DashboardIcon,
  "Clock In/Out": ClockInOutIcon,
  History: HistoryIcon,
  Leaves: LeaveIcon,
  Profile: ProfileIcon,
};

type TeacherSidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

export function TeacherSidebar({ mobileOpen = false, onClose }: TeacherSidebarProps) {
  const pathname = usePathname();
  const { signOut, userProfile } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  async function handleLogout() {
    setUserMenuOpen(false);
    await signOut();
  }

  function handleNavClick() {
    onClose?.();
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-6">
        {/* Close button on mobile */}
        <button
          onClick={onClose}
          className="lg:hidden mr-1 p-1 rounded-lg text-[#005cc8] hover:bg-[#005cc8]/10 transition-colors"
          aria-label="Close menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full overflow-hidden border-2 border-white bg-white shadow-sm relative">
          <Image src="/LOGO.jpg" alt="Merry Explorers Logo" fill className="object-contain" />
        </div>
        <div className="leading-[1.1]">
          <p className="font-headline text-[18px] font-extrabold text-[#002f76]">Merry</p>
          <p className="font-headline text-[18px] font-extrabold text-[#ffb800]">Explorers</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 mt-4">
        <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-[#005cc8] mb-3">TEACHER TOOLS</p>
        <div className="space-y-1">
          {teacherNavItems.map((item) => {
            const Icon = iconMap[item.label];
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={handleNavClick}
                className={[
                  "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-bold transition-colors",
                  isActive
                    ? "bg-[#005cc8] text-white shadow-sm"
                    : "text-[#005cc8] hover:bg-[#005cc8]/10 font-semibold",
                ].join(" ")}
              >
                <span className={isActive ? "text-white" : "text-[#005cc8]"}>
                  {Icon && <Icon active={isActive} />}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer: clickable user with dropdown */}
      <div className="p-3 mb-2">
        <div className="relative">
          {/* Transparent Overlay for click-outside */}
          {userMenuOpen && (
            <div 
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setUserMenuOpen(false);
              }}
            />
          )}

          <button
            onClick={() => setUserMenuOpen((open) => !open)}
            aria-label="Open user menu"
            aria-expanded={userMenuOpen}
            className={[
              "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 transition-colors relative z-50",
              userMenuOpen ? "bg-[#005cc8]/10" : "hover:bg-[#005cc8]/10",
            ].join(" ")}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#ffb800] bg-[#1a1a1a] text-[10px] font-black text-white relative overflow-hidden" style={{ backgroundColor: userProfile?.avatarColor }}>
              {userProfile?.avatarUrl ? (
                <Image src={userProfile.avatarUrl} alt="Avatar" width={36} height={36} className="w-full h-full object-cover" />
              ) : (
                userProfile?.initials || "T"
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#2da05b]"></span>
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-[13px] font-bold text-[#005cc8] leading-tight">{userProfile?.fullName || "Teacher"}</p>
              <p className="truncate text-[10px] font-semibold text-[#005cc8]/80">{userProfile?.role || "Staff"}</p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-4 w-4 shrink-0 text-[#005cc8] transition-transform duration-200 ${
                userMenuOpen ? "rotate-180" : ""
              }`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Dropdown */}
          <div
            className={`absolute bottom-full left-0 right-0 mb-2 z-50 overflow-hidden rounded-2xl bg-white border-2 border-[#e2e8f0] shadow-xl transition-all duration-200 origin-bottom ${
              userMenuOpen
                ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                : "opacity-0 scale-95 translate-y-1 pointer-events-none"
            }`}
          >
            {/* Report a Bug */}
            <Link
              href="/teacher/contact"
              onClick={() => { setUserMenuOpen(false); onClose?.(); }}
              className="flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-[#005cc8] hover:bg-[#005cc8]/10 transition-colors"
            >
              <span className="text-[#005cc8]"><BugReportIcon /></span>
              <span>Report a Bug</span>
            </Link>
            {/* Divider */}
            <div className="h-[1px] w-full bg-[#e2e8f0]" />
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3 text-[13px] font-bold text-[#ba1a1a] hover:bg-[#ba1a1a]/10 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="border-r border-[#e4e2e1]/50 bg-white hidden lg:block w-[250px] shrink-0 h-screen overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
        {sidebarContent}
      </aside>

      {/* Mobile drawer — slides in from left on small screens */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile navigation"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
