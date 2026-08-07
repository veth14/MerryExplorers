"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

type RenderedSession = {
  id: string;
  date: string;
  type: string;
  holiday: string;
  hours: number;
};

type PendingGroup = {
  id: string;
  holidayDate: string;
  holidayName: string;
  required: number;
  remaining: number;
};

type Account = {
  id: string;
  fullName: string;
  role?: string;
};

const EMPTY_ROWS = 6;

function RenderedTable({ records }: { records: RenderedSession[] }) {
  const isEmpty = records.length === 0;
  const padCount = Math.max(0, EMPTY_ROWS - records.length);

  return (
    <table className="w-full text-left border-collapse text-xs">
      <thead>
        <tr className="border-b border-brand-sky">
          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-brand-blue/50">Date</th>
          <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-brand-blue/50 text-center">Type</th>
          <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-brand-blue/50 text-center">Offset For</th>
          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-brand-blue/50 text-right">Hours</th>
        </tr>
      </thead>
      <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
        {records.map((r) => (
          <motion.tr key={r.id} variants={rowVariants} className="border-b border-brand-sky/30 hover:bg-brand-sky/20 transition-colors" style={{ height: "44px" }}>
            <td className="px-4 py-2.5 font-bold text-brand-navy whitespace-nowrap">{r.date}</td>
            <td className="px-3 py-2.5 text-center font-bold text-brand-blue whitespace-nowrap uppercase text-[10px] tracking-wider">{r.type.replace("_", " ")}</td>
            <td className="px-3 py-2.5 text-center font-bold text-brand-blue whitespace-nowrap">{r.holiday}</td>
            <td className="px-4 py-2.5 text-right font-black text-brand-navy whitespace-nowrap">{r.hours.toFixed(2)}</td>
          </motion.tr>
        ))}
        {isEmpty && (
          <tr style={{ height: "44px" }}>
            <td colSpan={4} className="px-4 py-2.5 text-center text-[12px] font-bold text-brand-blue/30 italic">
              No rendered sessions
            </td>
          </tr>
        )}
        {Array.from({ length: isEmpty ? padCount - 1 : padCount }).map((_, i) => (
          <tr key={`pad-r-${i}`} className="border-b border-brand-sky/20" style={{ height: "44px" }}>
            <td colSpan={4} />
          </tr>
        ))}
      </motion.tbody>
    </table>
  );
}

function PendingTable({ records }: { records: PendingGroup[] }) {
  const isEmpty = records.length === 0;
  const padCount = Math.max(0, EMPTY_ROWS - records.length);

  return (
    <table className="w-full text-left border-collapse text-xs">
      <thead>
        <tr className="border-b border-brand-sky">
          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-brand-orange/70">Holiday</th>
          <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-brand-orange/70 text-center">Date</th>
          <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-brand-orange/70 text-center">Req'd</th>
          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-brand-orange/70 text-right">Remaining</th>
        </tr>
      </thead>
      <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
        {records.map((r) => (
          <motion.tr key={r.id} variants={rowVariants} className="border-b border-brand-sky/30 hover:bg-brand-sky/20 transition-colors" style={{ height: "44px" }}>
            <td className="px-4 py-2.5 font-bold text-brand-navy whitespace-nowrap">{r.holidayName}</td>
            <td className="px-3 py-2.5 text-center font-bold text-brand-orange whitespace-nowrap">{r.holidayDate}</td>
            <td className="px-3 py-2.5 text-center font-bold text-brand-orange whitespace-nowrap">{r.required.toFixed(2)}</td>
            <td className="px-4 py-2.5 text-right font-black text-brand-red whitespace-nowrap">{r.remaining.toFixed(2)}</td>
          </motion.tr>
        ))}
        {isEmpty && (
          <tr style={{ height: "44px" }}>
            <td colSpan={4} className="px-4 py-2.5 text-center text-[12px] font-bold text-brand-blue/30 italic">
              No pending offsets
            </td>
          </tr>
        )}
        {Array.from({ length: isEmpty ? padCount - 1 : padCount }).map((_, i) => (
          <tr key={`pad-p-${i}`} className="border-b border-brand-sky/20" style={{ height: "44px" }}>
            <td colSpan={4} />
          </tr>
        ))}
      </motion.tbody>
    </table>
  );
}

export function OffsetMonitoring() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [rendered, setRendered] = useState<RenderedSession[]>([]);
  const [pendingGroups, setPendingGroups] = useState<PendingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [empOpen, setEmpOpen] = useState(false);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data: Account[]) => {
        if (Array.isArray(data)) {
          const eligibleAccounts = data.filter((a) =>
            ["Lead Teacher", "Assistant Teacher", "Executive Partner", "Executive Assistant"].includes(a.role as string)
          );
          setAccounts(eligibleAccounts);
          if (eligibleAccounts.length > 0) setSelectedEmployeeId(eligibleAccounts[0].id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedEmployeeId) return;
    fetch(`/api/offsets?uid=${selectedEmployeeId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const allRendered: RenderedSession[] = [];
          const allPending: PendingGroup[] = [];

          for (const group of json.data) {
            if (group.remainingHours > 0) {
              allPending.push({
                id: group.id,
                holidayDate: group.sourceHoliday?.dateStr ?? "–",
                holidayName: group.sourceHoliday?.name ?? "Unknown",
                required: group.requiredHours,
                remaining: group.remainingHours,
              });
            }
            if (Array.isArray(group.renderedSessions)) {
              for (const s of group.renderedSessions) {
                allRendered.push({
                  id: `${group.id}-${s.attendanceDateStr}`,
                  date: s.attendanceDateStr,
                  type: s.type,
                  holiday: group.sourceHoliday?.name ?? "Unknown",
                  hours: s.hours,
                });
              }
            }
          }
          
          allRendered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          setRendered(allRendered);
          setPendingGroups(allPending);
        } else {
          setRendered([]);
          setPendingGroups([]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedEmployeeId]);

  const selectedAccount = accounts.find((a) => a.id === selectedEmployeeId);

  return (
    <motion.div
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
                <motion.div
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
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
          </motion.div>
        ) : !selectedAccount ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[2rem] bg-white border-2 border-brand-blue shadow-[var(--shadow-card)] flex items-center justify-center py-24 w-full"
          >
            <p className="text-[13px] font-bold text-brand-navy/60">Select an employee to view offsets.</p>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            variants={cardVariants}
            className="rounded-[2rem] bg-white border-2 border-brand-blue shadow-[var(--shadow-card)] overflow-hidden"
          >
            {/* Employee Header */}
            <div className="flex items-center gap-3 px-8 py-5 bg-brand-navy border-b-2 border-brand-blue/30">
              <span
                className="material-symbols-outlined text-brand-yellow"
                style={{ fontSize: "22px", fontVariationSettings: "'FILL' 1" }}
              >
                swap_horiz
              </span>
              <h3 className="font-headline text-[16px] font-black text-white tracking-wide">
                {selectedAccount.fullName}
              </h3>
              <div className="ml-auto flex gap-4 text-[12px] font-bold">
                <span className="bg-[#3261a8] text-[#93c5fd] rounded-full px-4 py-1.5">
                  {rendered.length} rendered
                </span>
                <span className="bg-[#294870] text-brand-yellow rounded-full px-4 py-1.5">
                  {pendingGroups.length} to render
                </span>
              </div>
            </div>

            {/* Split Table */}
            <div className="flex flex-col md:flex-row">
              {/* Rendered */}
              <div className="flex-1 border-b-2 md:border-b-0 md:border-r-2 border-brand-sky">
                <div className="flex items-center gap-2 px-6 py-3 bg-brand-sky/40 border-b border-brand-sky">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-blue" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-brand-blue">Rendered Sessions</span>
                </div>
                <RenderedTable records={rendered} />
              </div>

              {/* To Render */}
              <div className="flex-1">
                <div className="flex items-center gap-2 px-6 py-3 bg-brand-yellow/10 border-b border-brand-sky">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-orange" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-brand-orange">Pending Holidays</span>
                </div>
                <PendingTable records={pendingGroups} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
