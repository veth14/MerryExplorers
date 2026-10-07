"use client";

import { useState, useEffect } from "react";
import { m, AnimatePresence, type Variants  } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

type LedgerEntry = {
  id: string;
  date: string;
  timeIn: string;
  timeOut: string;
  type: "debt" | "credit";
  hours: number;
  label: string;
};

type OffsetData = {
  totalDebt: number;
  totalCredit: number;
  remainingOffset: number;
  ledger: LedgerEntry[];
};

type Account = {
  id: string;
  fullName: string;
  role?: string;
};

const EMPTY_ROWS = 6;

function formatHours(decimalHours: number): string {
  if (!decimalHours) return "0 hrs 0 mins";
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  return `${h} hrs ${m} mins`;
}

function LedgerTable({ records }: { records: LedgerEntry[] }) {
  const isEmpty = records.length === 0;
  const padCount = Math.max(0, EMPTY_ROWS - records.length);

  return (
    <table className="w-full text-left border-collapse text-xs">
      <thead>
        <tr className="border-b border-brand-sky">
          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-brand-blue/50">Date</th>
          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-brand-blue/50">Type</th>
          <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-brand-blue/50 text-center whitespace-nowrap">Time In</th>
          <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-brand-blue/50 text-center whitespace-nowrap">Time Out</th>
          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-brand-blue/50 text-right">Hours</th>
        </tr>
      </thead>
      <m.tbody variants={containerVariants} initial="hidden" animate="visible">
        {records.map((r) => (
          <m.tr key={r.id} variants={rowVariants} className="border-b border-brand-sky/30 hover:bg-brand-sky/20 transition-colors" style={{ height: "44px" }}>
            <td className="px-4 py-2.5 font-bold text-brand-navy whitespace-nowrap">{r.date}</td>
            <td className="px-4 py-2.5 font-bold whitespace-nowrap">
              {r.type === "debt" ? (
                <span className="text-brand-orange bg-brand-yellow/10 px-2 py-1 rounded-md">{r.label}</span>
              ) : (
                <span className="text-brand-blue bg-brand-sky/40 px-2 py-1 rounded-md">{r.label}</span>
              )}
            </td>
            <td className="px-3 py-2.5 text-center font-bold text-brand-blue whitespace-nowrap">{r.timeIn || "—"}</td>
            <td className="px-3 py-2.5 text-center font-bold text-brand-blue whitespace-nowrap">{r.timeOut || "—"}</td>
            <td className="px-4 py-2.5 text-right font-black whitespace-nowrap">
               <span className={r.type === "debt" ? "text-brand-orange" : "text-brand-blue"}>
                 {r.type === "debt" ? "+" : "-"}{formatHours(r.hours)}
               </span>
            </td>
          </m.tr>
        ))}
        {isEmpty && (
          <tr style={{ height: "44px" }}>
            <td colSpan={5} className="px-4 py-2.5 text-center text-[12px] font-bold text-brand-blue/30 italic">
              No offset records found
            </td>
          </tr>
        )}
        {Array.from({ length: isEmpty ? padCount - 1 : padCount }).map((_, i) => (
          <tr key={`pad-${i}`} className="border-b border-brand-sky/20" style={{ height: "44px" }}>
            <td colSpan={5} />
          </tr>
        ))}
      </m.tbody>
    </table>
  );
}

export function OffsetMonitoring() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [offsetData, setOffsetData] = useState<OffsetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [empOpen, setEmpOpen] = useState(false);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data: Account[]) => {
        if (Array.isArray(data)) {
          const eligibleAccounts = data.filter((a) => {
            const r = (a.role || "").toLowerCase();
            return r !== "admin" && r !== "owner" && r !== "parent" && !(a.fullName && a.fullName.toLowerCase().includes("merry"));
          });
          setAccounts(eligibleAccounts);
          if (eligibleAccounts.length > 0) setSelectedEmployeeId(eligibleAccounts[0].id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedEmployeeId) return;
    setLoading(true);
    fetch(`/api/offsets?uid=${selectedEmployeeId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setOffsetData(json.data);
        } else {
          setOffsetData({ totalDebt: 0, totalCredit: 0, remainingOffset: 0, ledger: [] });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedEmployeeId]);

  const selectedAccount = accounts.find((a) => a.id === selectedEmployeeId);

  return (
    <m.div
      className="flex flex-col gap-6 w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Options Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between rounded-[2rem] bg-white px-6 py-4 shadow-lg border-2 border-brand-sky gap-4 w-full">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "20px" }}>tune</span>
            <span className="text-[13px] font-black text-brand-navy">Offset Options:</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setEmpOpen(!empOpen)}
              className={`flex items-center gap-3 rounded-full border px-4 py-2 text-[12px] font-bold transition-all duration-200 whitespace-nowrap min-w-[200px] justify-between ${empOpen ? "border-brand-blue/40 bg-brand-sky text-brand-blue shadow-sm" : "border-brand-sky bg-brand-sky/40 text-brand-navy hover:bg-brand-sky"}`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "15px" }}>person</span>
                {selectedAccount?.fullName ?? "Select Employee…"}
              </div>
              <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "16px" }}>expand_more</span>
            </button>
            <AnimatePresence>
              {empOpen && (
                <m.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-[calc(100%+6px)] left-0 z-50 min-w-[240px] rounded-2xl bg-white border-2 border-brand-sky shadow-lg max-h-[300px] overflow-y-auto"
                >
                  <div className="py-1.5">
                    {accounts.map((acc) => (
                      <button key={acc.id} onClick={() => { setSelectedEmployeeId(acc.id); setEmpOpen(false); }}
                        className={`w-full px-5 py-2 text-left text-[13px] font-bold transition-colors flex items-center gap-2 ${selectedEmployeeId === acc.id ? "bg-brand-sky/40 text-brand-blue" : "text-brand-navy/70 hover:bg-brand-sky/20"}`}
                      >
                        {selectedEmployeeId === acc.id ? <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "15px" }}>check</span> : <div className="w-4" />}
                        {acc.fullName}
                      </button>
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <m.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[2rem] bg-white border-2 border-brand-blue shadow-[var(--shadow-card)] flex items-center justify-center py-24 w-full"
          >
            <div className="flex flex-col items-center gap-4">
              <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-blue/20 border-t-brand-blue" />
              <p className="text-[13px] font-bold text-brand-navy/60">Loading offsets data…</p>
            </div>
          </m.div>
        ) : !selectedAccount || !offsetData ? (
          <m.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[2rem] bg-white border-2 border-brand-blue shadow-[var(--shadow-card)] flex items-center justify-center py-24 w-full"
          >
            <p className="text-[13px] font-bold text-brand-navy/60">Select an employee to view offsets.</p>
          </m.div>
        ) : (
          <m.div
            key="content"
            variants={cardVariants}
            className="rounded-[2rem] bg-white border-2 border-brand-blue shadow-[var(--shadow-card)] overflow-hidden"
          >
            {/* Employee Header & Summary */}
            <div className="flex flex-col md:flex-row md:items-center gap-6 px-8 py-6 bg-brand-navy border-b-2 border-brand-blue/30">
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-brand-yellow"
                  style={{ fontSize: "28px", fontVariationSettings: "'FILL' 1" }}
                >
                  history_toggle_off
                </span>
                <div>
                  <h3 className="font-headline text-[18px] font-black text-white tracking-wide">
                    {selectedAccount.fullName}
                  </h3>
                  <p className="text-brand-sky/70 text-[12px] font-bold">Offset Ledger (from Sept 29, 2026)</p>
                </div>
              </div>
              
              <div className="ml-auto flex gap-4 text-[13px] font-black">
                <div className="flex flex-col items-end">
                   <span className="text-brand-sky/60 text-[10px] uppercase tracking-wider">Accrued Debt</span>
                   <span className="text-brand-orange">{formatHours(offsetData.totalDebt)}</span>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-brand-sky/60 text-[10px] uppercase tracking-wider">Worked Credit</span>
                   <span className="text-brand-sky">{formatHours(offsetData.totalCredit)}</span>
                </div>
                <div className="flex flex-col items-end border-l-2 border-brand-sky/20 pl-4 ml-2">
                   <span className="text-brand-sky/60 text-[10px] uppercase tracking-wider">Remaining Offset</span>
                   <span className="text-brand-yellow text-[16px]">{formatHours(offsetData.remainingOffset)}</span>
                </div>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="w-full">
              <LedgerTable records={offsetData.ledger} />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}