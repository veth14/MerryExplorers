"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { TeacherSidebar } from "@/components/teacher/teacher-sidebar";
import { TeacherTopbar } from "@/components/teacher/teacher-topbar";
import { useAuth } from "@/lib/auth-context";

type AppShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function AppShell({ title, description = "", children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { userProfile } = useAuth();

  // Teachers who are granted access to specific admin pages (e.g. photo-albums)
  // should still see their own teacher sidebar, not the admin one.
  const isTeacher = (userProfile?.role || "").toLowerCase() === "teacher" ||
    (userProfile?.role || "").toLowerCase() === "lead teacher" ||
    (userProfile?.role || "").toLowerCase() === "assistant teacher";

  return (
    <div className="h-screen bg-[#f0f4f9] text-on-background flex overflow-hidden print:h-auto print:overflow-visible print:block">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="print:hidden">
        {isTeacher ? (
          <TeacherSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        ) : (
          <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        )}
      </div>

      <main className="flex-1 px-4 sm:px-6 py-5 h-screen overflow-y-auto w-full min-w-0 print:h-auto print:overflow-visible print:p-0">
        <div className="w-full flex flex-col gap-4 print:gap-0">
          <div className="print:hidden">
            {isTeacher ? (
              <TeacherTopbar
                title={title}
                description={description}
                onMenuClick={() => setMobileOpen(true)}
              />
            ) : (
              <Topbar
                title={title}
                description={description}
                onMenuClick={() => setMobileOpen(true)}
              />
            )}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

