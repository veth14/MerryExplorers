"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

type AppShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AppShell({ title, description, children }: AppShellProps) {
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

      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="flex-1 px-4 sm:px-6 py-5 h-screen overflow-y-auto w-full min-w-0">
        <div className="w-full flex flex-col gap-4">
          <Topbar
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
