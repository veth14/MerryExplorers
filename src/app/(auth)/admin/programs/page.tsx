"use client";

import { AppShell } from "@/components/app-shell";
import { RenewalSettingsManager } from "@/components/admin/RenewalSettingsManager";
import { RenewalPeriodsManager } from "@/components/admin/RenewalPeriodsManager";

export default function AdminProgramsPage() {
  return (
    <AppShell title="Programs & Adventure Settings">
      <div className="space-y-6 pb-12">
        <RenewalSettingsManager />
        <RenewalPeriodsManager />
      </div>
    </AppShell>
  );
}
