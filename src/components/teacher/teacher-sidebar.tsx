"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.855 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.855-1.567h-1.844ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" clipRule="evenodd" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const iconMap: Record<string, React.ComponentType<{ active?: boolean }>> = {
  Dashboard: DashboardIcon,
  "Clock In/Out": ClockInOutIcon,
  History: HistoryIcon,
  Profile: ProfileIcon,
};

export function TeacherSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-r border-[#e4e2e1]/50 bg-white hidden lg:block w-[250px] shrink-0 h-screen overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-6">
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

        {/* Footer */}
        <div className="p-3 mb-2 space-y-1">
          <Link href="#" className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-bold text-[#005cc8] hover:bg-[#005cc8]/10 transition-colors">
            <span className="text-[#005cc8]"><SettingsIcon /></span>
            <span>Settings</span>
          </Link>
          <Link href="/login" className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-bold text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors">
            <span className="text-[#ef4444]"><LogoutIcon /></span>
            <span>Logout</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
