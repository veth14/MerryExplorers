"use client";

import { useState } from "react";
import { TeacherSidebar } from "@/components/teacher/teacher-sidebar";
import { TeacherTopbar } from "@/components/teacher/teacher-topbar";

type TeacherShellProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
};

export function TeacherShell({ title, description, children }: TeacherShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="h-screen bg-[#f0f4f9] text-on-background flex overflow-hidden">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <TeacherSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 h-screen overflow-y-auto w-full min-w-0">
        <div className="w-full h-full flex flex-col gap-4">
          <TeacherTopbar
            title={title}
            description={description}
            onMenuClick={() => setMobileOpen(true)}
          />
          {children}
        </div>
      </main>
    </div>
  );
}
