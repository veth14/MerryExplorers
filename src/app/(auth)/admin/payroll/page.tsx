"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { SummaryTable } from "@/components/payroll/summary-table";
import { OffsetMonitoring } from "@/components/payroll/offset-monitoring";
import { PayslipView } from "@/components/payroll/payslip-view";
import { TimekeepingView } from "@/components/payroll/timekeeping-view";

type Tab = "summary" | "payslip" | "timekeeping" | "offset";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "summary", label: "Summary", icon: "summarize" },
  { id: "payslip", label: "Payslip", icon: "receipt_long" },
  { id: "timekeeping", label: "Timekeeping", icon: "schedule" },
  { id: "offset", label: "Offset Monitoring", icon: "swap_horiz" },
];

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<Tab>("summary");

  return (
    <AppShell title="Payroll" description="Manage and generate payroll for staff.">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-[2rem] border-2 border-brand-sky shadow-sm w-fit max-w-full overflow-x-auto print:hidden">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileTap={{ scale: 0.96 }}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-black transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? "bg-brand-blue text-white shadow-md"
                  : "text-brand-navy/60 hover:bg-brand-sky hover:text-brand-navy"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: "16px",
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {tab.icon}
              </span>
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {activeTab === "summary" && <SummaryTable />}
            {activeTab === "payslip" && <PayslipView />}
            {activeTab === "timekeeping" && <TimekeepingView />}
            {activeTab === "offset" && <OffsetMonitoring />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="h-4" />
    </AppShell>
  );
}
