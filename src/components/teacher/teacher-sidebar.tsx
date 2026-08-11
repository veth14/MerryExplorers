"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { teacherNavItems } from "@/data/teacher-dashboard";

// ─── Icons ───────────────────────────────────────────────────────────────────

function DashboardIcon({ active }: { active?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[17px] h-[17px]">
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill={active ? "#fff" : "currentColor"} />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity={active ? 0.7 : 1} />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity={active ? 0.7 : 1} />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity={active ? 0.7 : 1} />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <path d="M21 12a9 9 0 1 1-9-9" /><path d="M21 3v5h-5" /><path d="M12 7v5l4 2" />
    </svg>
  );
}
function HistoryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[17px] h-[17px]">
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
    </svg>
  );
}
function LeaveIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" /><path d="M9 16l2 2 4-4" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[17px] h-[17px]">
      <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568 6.787 6.787 0 0 1 1.019-4.38Z" clipRule="evenodd" />
      <path d="M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135 9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135 3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z" />
    </svg>
  );
}
function PayrollIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <path d="M7 15h.01" /><path d="M11 15h2" />
    </svg>
  );
}
function AttendanceIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
    </svg>
  );
}
function InquiriesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function ReportsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <path d="M3 3v18h18" /><path d="M18 9l-5 5-4-4-6 6" />
    </svg>
  );
}
function AnnouncementsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function AuditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function BugReportIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <path d="m8 2 1.88 1.88" /><path d="M14.12 3.88 16 2" /><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6Z" />
      <path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" /><path d="M6 12H2" />
      <path d="M3 15c2.1 0 3.9-1.4 4.5-3.3" /><path d="M17.47 9c1.93-.2 3.53-1.9 3.53-4" />
      <path d="M18 12h4" /><path d="M21 15c-2.1 0-3.9-1.4-4.5-3.3" />
    </svg>
  );
}

const teacherIconMap: Record<string, React.ComponentType<{ active?: boolean }>> = {
  Dashboard: DashboardIcon,
  "Clock In/Out": ClockIcon,
  History: HistoryIcon,
  Leaves: LeaveIcon,
  Profile: ProfileIcon,
};

type TeacherSidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

// ─── Nav item ─────────────────────────────────────────────────────────────────
function NavItem({
  href, label, icon, isActive, onClick, size = "md",
}: {
  href: string; label: string; icon: React.ReactNode;
  isActive: boolean; onClick?: () => void; size?: "sm" | "md";
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "group relative flex items-center gap-3 rounded-xl transition-all duration-200 ease-out select-none",
        size === "sm" ? "px-3 py-[7px] text-[12.5px]" : "px-3 py-[9px] text-[13.5px]",
        isActive
          ? "bg-[#002f76] text-white shadow-[0_4px_18px_rgba(0,47,118,0.24)]"
          : "text-[#3d5a8a] hover:bg-[#eaf0fe] hover:text-[#002f76]",
      ].join(" ")}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-[56%] rounded-r-full bg-[#ffb800]" aria-hidden="true" />
      )}
      <span className={[
        "flex items-center justify-center rounded-lg shrink-0 transition-all duration-200",
        size === "sm" ? "w-7 h-7" : "w-[30px] h-[30px]",
        isActive
          ? "bg-white/20 text-white"
          : "bg-[#eef1fb] text-[#002f76] group-hover:bg-[#dde7fa] group-hover:scale-[1.08]",
      ].join(" ")}>
        {icon}
      </span>
      <span className={["leading-none tracking-[-0.01em]", isActive ? "font-bold" : "font-semibold"].join(" ")}>
        {label}
      </span>
    </Link>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 mb-2">
      <span className="w-[7px] h-[7px] rounded-full bg-[#ffb800] shrink-0 shadow-[0_0_0_2px_rgba(255,184,0,0.2)]" aria-hidden="true" />
      <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#002f76]/55 leading-none whitespace-nowrap">
        {children}
      </p>
    </div>
  );
}

// ─── Collapsible nav group ────────────────────────────────────────────────────
function NavGroup({
  title,
  items,
  pathname,
  expandedGroup,
  setExpandedGroup,
  onNavClick,
}: {
  title: string;
  items: { label: string; href: string; icon: React.ReactNode }[];
  pathname: string;
  expandedGroup: string | null;
  setExpandedGroup: (v: string | null) => void;
  onNavClick: () => void;
}) {
  const isExpanded = expandedGroup === title;
  const hasActiveItem = items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <div className="mt-px">
      <button
        onClick={() => setExpandedGroup(isExpanded ? null : title)}
        className={[
          "flex w-full items-center justify-between px-3 py-[7px] rounded-xl text-[10.5px] font-bold uppercase tracking-[0.09em] transition-all duration-150",
          hasActiveItem
            ? "text-[#002f76]/75 bg-[#002f76]/[0.05]"
            : "text-[#002f76]/35 hover:text-[#002f76]/60 hover:bg-[#002f76]/[0.03]",
        ].join(" ")}
      >
        <span className="flex items-center gap-1.5">
          {hasActiveItem && <span className="w-1.5 h-1.5 rounded-full bg-[#ffb800]" aria-hidden="true" />}
          {title}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="mt-0.5 space-y-0.5 pl-3 relative">
          <span className="absolute left-[22px] top-2 bottom-2 w-px bg-[#c5d0ed]" aria-hidden="true" />
          {items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <NavItem
                key={item.label}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={isActive}
                onClick={onNavClick}
                size="sm"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TeacherSidebar({ mobileOpen = false, onClose }: TeacherSidebarProps) {
  const pathname = usePathname();
  const { signOut, userProfile } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>("HR & People");

  const isExecPartner = (userProfile?.role || "").toLowerCase() === "executive partner";
  const isDeveloper = (userProfile?.role || "").toLowerCase() === "developer";

  async function handleLogout() { setUserMenuOpen(false); await signOut(); }
  function handleNavClick() { onClose?.(); }

  // Admin groups for executive partner & developer view
  const adminGroups = useMemo(() => [
    {
      title: "HR & People",
      items: [
        { label: "Teachers", href: "/admin/teachers", icon: <UsersIcon /> },
        { label: "Accounts", href: "/admin/users", icon: <UsersIcon /> },
        { label: "Payroll", href: "/admin/payroll", icon: <PayrollIcon /> },
      ],
    },
    {
      title: "Time & Attendance",
      items: [
        { label: "Attendance", href: "/admin/attendance", icon: <AttendanceIcon /> },
        { label: "Leave Requests", href: "/admin/leaves", icon: <LeaveIcon /> },
      ],
    },
    {
      title: "Operations",
      items: [
        { label: "Inquiries", href: "/admin/inquiries", icon: <InquiriesIcon /> },
        { label: "Reports", href: "/admin/reports", icon: <ReportsIcon /> },
        { label: "Announcements", href: "/admin/announcements", icon: <AnnouncementsIcon /> },
        { label: "Audit Log", href: "/admin/audit-log", icon: <AuditIcon /> },
      ],
    },
  ], []);

  useEffect(() => {
    const activeGroup = adminGroups.find(g =>
      g.items.some(item => pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href)))
    );
    if (activeGroup) {
      setExpandedGroup(activeGroup.title);
    }
  }, [pathname, adminGroups]);

  const sidebarContent = (
    <div className="flex h-full flex-col">

      {/* ── Brand strip at top ── */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#002f76] via-[#005cc8] to-[#ffb800] shrink-0" aria-hidden="true" />

      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <button onClick={onClose} className="lg:hidden mr-1 p-1.5 rounded-lg text-[#002f76] hover:bg-[#002f76]/10 transition-colors" aria-label="Close menu">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white shadow-[0_2px_8px_rgba(0,47,118,0.12)] ring-1 ring-[#002f76]/8 relative">
          <Image src="/LOGO.jpg" alt="Merry Explorers Logo" fill className="object-contain" />
        </div>
        <div className="leading-[1.2]">
          <p className="font-headline text-[16.5px] font-extrabold text-[#002f76] tracking-tight">Merry</p>
          <p className="font-headline text-[16.5px] font-extrabold text-[#ffb800] tracking-tight">Explorers</p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-4 h-px bg-gradient-to-r from-[#002f76]/12 via-[#ffb800]/25 to-transparent" />

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 pb-3 flex flex-col gap-5 overflow-y-auto">

        {/* Teacher Tools */}
        <div>
          <SectionLabel>Teacher Tools</SectionLabel>
          <div className="space-y-0.5">
            {teacherNavItems.map((item) => {
              const Icon = teacherIconMap[item.label];
              const isActive = pathname === item.href;
              return (
                <NavItem
                  key={item.label}
                  href={item.href}
                  label={item.label}
                  icon={Icon ? <Icon active={isActive} /> : null}
                  isActive={isActive}
                  onClick={handleNavClick}
                />
              );
            })}
          </div>
        </div>

        {/* Admin View — Executive Partners & Developer only */}
        {(isExecPartner || isDeveloper) && (
          <div>
            {/* Section separator */}
            <div className="mx-0 mb-4 h-px bg-gradient-to-r from-[#002f76]/12 via-[#ffb800]/25 to-transparent" />
            <SectionLabel>Admin View</SectionLabel>
            <div className="space-y-px">
              {/* Dashboard standalone */}
              <NavItem
                href="/admin"
                label="Dashboard"
                icon={<DashboardIcon active={pathname === "/admin"} />}
                isActive={pathname === "/admin"}
                onClick={handleNavClick}
              />
              {/* Grouped sections */}
              {adminGroups.map((group) => (
                <NavGroup
                  key={group.title}
                  title={group.title}
                  items={group.items}
                  pathname={pathname}
                  expandedGroup={expandedGroup}
                  setExpandedGroup={setExpandedGroup}
                  onNavClick={handleNavClick}
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* ── User footer ── */}
      <div className="px-3 pb-4 pt-2 shrink-0">
        <div className="mb-3 h-px bg-gradient-to-r from-transparent via-[#002f76]/12 to-transparent" />
        <div className="relative">
          {userMenuOpen && (
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => { e.stopPropagation(); setUserMenuOpen(false); }}
            />
          )}

          {/* User button */}
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            aria-label="Open user menu"
            aria-expanded={userMenuOpen}
            className={[
              "relative z-50 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 border transition-all duration-200",
              userMenuOpen
                ? "bg-[#eaf0fe] border-[#002f76]/20 shadow-sm"
                : "bg-white border-[#dde4f0] shadow-[0_1px_6px_rgba(0,47,118,0.08)] hover:border-[#002f76]/25 hover:shadow-[0_3px_12px_rgba(0,47,118,0.13)] hover:bg-[#fafcff]",
            ].join(" ")}
          >
            {/* Avatar */}
            <div
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white ring-2 ring-[#ffb800] ring-offset-1 ring-offset-white overflow-hidden"
              style={{ backgroundColor: userProfile?.avatarColor || "#002f76" }}
            >
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-[2px] border-white bg-[#22c55e] z-10" />
              {userProfile?.avatarUrl ? (
                <Image src={userProfile.avatarUrl} alt="Avatar" width={36} height={36} className="w-full h-full object-cover" />
              ) : (
                userProfile?.initials || "T"
              )}
            </div>

            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-[13.5px] font-bold text-[#002f76] leading-tight">
                {userProfile?.fullName || "Teacher"}
              </p>
              <p className="truncate text-[11px] font-medium text-[#3d5a8a]/70 leading-tight mt-0.5">
                {userProfile?.role || "Staff"}
              </p>
            </div>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              className={`h-3.5 w-3.5 shrink-0 text-[#002f76]/35 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Dropdown */}
          <div className={[
            "absolute bottom-full left-0 right-0 mb-2 z-50 overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_rgba(0,47,118,0.16)] border border-[#e2e8f5] transition-all duration-200 origin-bottom",
            userMenuOpen ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 translate-y-2 pointer-events-none",
          ].join(" ")}>
            <Link
              href="/teacher/contact"
              onClick={() => { setUserMenuOpen(false); onClose?.(); }}
              className="flex items-center gap-3 px-4 py-3 text-[13px] font-semibold text-[#3d5a8a] hover:bg-[#eaf0fe] transition-colors"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#eef1fb] text-[#002f76]">
                <BugReportIcon />
              </span>
              <span>Report a Bug</span>
            </Link>
            <div className="h-px bg-[#f0f4fa] mx-3" />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3 text-[13px] font-semibold text-[#c0392b] hover:bg-[#fef2f2] transition-colors"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#fef2f2] text-[#c0392b]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col w-[256px] shrink-0 h-screen bg-gradient-to-b from-[#f0f4ff] to-[#f5f7ff] border-r border-[#dde4f0] shadow-[2px_0_16px_rgba(0,47,118,0.06)] z-10 relative overflow-y-auto">
        {sidebarContent}
      </aside>
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[272px] bg-gradient-to-b from-[#f0f4ff] to-[#f5f7ff] shadow-[4px_0_40px_rgba(0,47,118,0.18)] transform transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Mobile navigation"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
