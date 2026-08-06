"use client";

import { AppShell } from "@/components/app-shell";

export default function PayrollPage() {
  return (
    <AppShell title="Payroll" description="Manage and generate payroll for staff.">
      <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-[2rem] border-2 border-[#e4e2e1] shadow-[0_15px_35px_-5px_rgba(37,89,189,0.12)] p-8 text-center mt-4">
        <div className="w-20 h-20 bg-[#005cc8]/10 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-[#005cc8]">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
            <path d="M7 15h.01" />
            <path d="M11 15h2" />
          </svg>
        </div>
        <h2 className="text-[28px] font-headline font-extrabold text-[#002f76] mb-2 leading-tight">
          Under Development
        </h2>
        <p className="text-[15px] font-semibold text-[#5a6e8c] max-w-md">
          The Payroll module is currently being built. Soon you will be able to automatically compute teacher pay based on attendance, deductions, and leave status.
        </p>
      </div>
    </AppShell>
  );
}
