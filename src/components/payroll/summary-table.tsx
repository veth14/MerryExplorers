"use client";

import { useState, useEffect } from "react";
import { m, AnimatePresence, type Variants  } from "framer-motion";

function generateCutOffs(): { label: string; value: string; start: Date; end: Date; startStr: string; endStr: string }[] {
  const cutOffs = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthName = d.toLocaleString("en-US", { month: "long" });

    const start2 = new Date(year, month, 11);
    const end2 = new Date(year, month, 25);
    const pay2 = new Date(year, month, 31);
    cutOffs.push({
      label: `${monthName} ${pay2.getDate()}, ${year} (${monthName.slice(0, 3)} 11–25)`,
      value: `${year}-${month}-2h`,
      start: start2,
      end: end2,
      startStr: `${year}-${String(month+1).padStart(2, "0")}-11`,
      endStr: `${year}-${String(month+1).padStart(2, "0")}-25`,
    });

    const start1 = new Date(year, month - 1, 26);
    const end1 = new Date(year, month, 10);
    const pay1 = new Date(year, month, 15);
    cutOffs.push({
      label: `${monthName} ${pay1.getDate()}, ${year} (${new Date(year, month - 1).toLocaleString("en-US", { month: "short" })} 26–${monthName.slice(0, 3)} 10)`,
      value: `${year}-${month}-1h`,
      start: start1,
      end: end1,
      startStr: `${year}-${String(month).padStart(2, "0")}-26`,
      endStr: `${year}-${String(month+1).padStart(2, "0")}-10`,
    });
  }
  // System began operation August 1, 2026. Earliest cutoff ends Aug 10.
  const cutoffLimit = new Date(2026, 7, 10);
  return cutOffs.filter(c => c.end >= cutoffLimit).slice(0, 10);
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

type PayrollRecord = {
  id: string;
  name: string;
  hours: number;
  daysPresent: number;
  totalScheduledWorkDays?: number;
  monthlyRate: number;
  dailyRate: number;
  basic: number;
  comms: number;
  perfectAttendance: number;
  birthdayGift: number;
  gross: number;
  lateDeduction?: number;
  sss: number;
  philhealth: number;
  pagibig: number;
  net: number;
  employer?: {
    sss: number;
    philhealth: number;
    pagibig: number;
    total: number;
  };
};

type SummaryResponse = {
  success: boolean;
  totalGross: number;
  totalNet: number;
  records: PayrollRecord[];
};

const fmt = (val: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(val);

export function SummaryTable() {
  const CUT_OFFS = generateCutOffs();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const currentCutOff = CUT_OFFS.find(c => now >= c.start && now <= c.end) || CUT_OFFS[0];

  const [selectedCutOffValue, setSelectedCutOffValue] = useState(currentCutOff.value);
  const [cutOffOpen, setCutOffOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"employee" | "accounting">("employee");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SummaryResponse | null>(null);

  // New state for Mark as Paid feature
  const [isPaid, setIsPaid] = useState(false);
  const [isTogglingPaid, setIsTogglingPaid] = useState(false);

  const selectedCutOff = CUT_OFFS.find((c) => c.value === selectedCutOffValue) ?? CUT_OFFS[0];

  useEffect(() => {
    // 1. Fetch Payroll Data
    fetch(`/api/payroll-summary?startDate=${selectedCutOff.startStr}&endDate=${selectedCutOff.endStr}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) setData(json);
        else setData(null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // 2. Fetch Paid Status
    fetch(`/api/payroll-status?cutoffValue=${selectedCutOff.value}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) setIsPaid(json.isPaid);
      })
      .catch(console.error);
  }, [selectedCutOff.startStr, selectedCutOff.endStr, selectedCutOff.value]);

  const togglePaidStatus = async () => {
    setIsTogglingPaid(true);
    try {
      const res = await fetch("/api/payroll-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cutoffValue: selectedCutOff.value, isPaid: !isPaid }),
      });
      const json = await res.json();
      if (json.success) {
        setIsPaid(json.isPaid);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTogglingPaid(false);
    }
  };

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
            <span className="text-[13px] font-black text-brand-navy">Summary Options:</span>
          </div>

          {/* View Toggle */}
          <div className="flex bg-brand-sky/30 rounded-full p-1 border border-brand-sky">
            <button
              onClick={() => setViewMode("employee")}
              className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${viewMode === "employee" ? "bg-white text-brand-blue shadow-sm" : "text-brand-navy/60 hover:text-brand-navy"}`}
            >
              Part 1: Employee
            </button>
            <button
              onClick={() => setViewMode("accounting")}
              className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${viewMode === "accounting" ? "bg-brand-orange/10 text-brand-orange shadow-sm" : "text-brand-navy/60 hover:text-brand-navy"}`}
            >
              Part 2: Accounting
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setCutOffOpen(!cutOffOpen)}
              className={`flex items-center gap-3 rounded-full border px-4 py-2 text-[12px] font-bold transition-all duration-200 whitespace-nowrap min-w-[260px] justify-between ${cutOffOpen ? "border-brand-blue/40 bg-brand-sky text-brand-blue shadow-sm" : "border-brand-sky bg-brand-sky/40 text-brand-navy hover:bg-brand-sky"}`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "15px" }}>calendar_month</span>
                {selectedCutOff.label}
                {isPaid && (
                  <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-700 uppercase tracking-wider border border-green-200">
                    Paid
                  </span>
                )}
              </div>
              <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "16px" }}>expand_more</span>
            </button>
            <AnimatePresence>
              {cutOffOpen && (
                <m.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-[calc(100%+6px)] left-0 z-50 min-w-[260px] rounded-2xl bg-white border-2 border-brand-sky shadow-lg max-h-[300px] overflow-y-auto"
                >
                  <div className="py-1.5">
                    {CUT_OFFS.map((c) => (
                      <button key={c.value} onClick={() => { setSelectedCutOffValue(c.value); setCutOffOpen(false); }}
                        className={`w-full px-5 py-2 text-left text-[13px] font-bold transition-colors flex items-center gap-2 ${selectedCutOffValue === c.value ? "bg-brand-sky/40 text-brand-blue" : "text-brand-navy/70 hover:bg-brand-sky/20"}`}
                      >
                        {selectedCutOffValue === c.value ? <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "15px" }}>check</span> : <div className="w-4" />}
                        {c.label}
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
              <p className="text-[13px] font-bold text-brand-navy/60">Computing payroll summary…</p>
            </div>
          </m.div>
        ) : !data || data.records.length === 0 ? (
          <m.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[2rem] bg-white border-2 border-brand-blue shadow-[var(--shadow-card)] flex items-center justify-center py-24 w-full"
          >
            <p className="text-[13px] font-bold text-brand-navy/60">No payroll data found for the selected cut-off period.</p>
          </m.div>
        ) : (
          <m.div
            key="content"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="rounded-[2rem] bg-white border-2 border-brand-blue shadow-[var(--shadow-card)] w-full overflow-hidden"
          >
            {/* Card Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-8 py-5 bg-brand-navy border-b-2 border-brand-blue/30 gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-brand-yellow"
                  style={{ fontSize: "24px", fontVariationSettings: "'FILL' 1" }}
                >
                  payments
                </span>
                <div>
                  <h3 className="font-headline text-[17px] font-black text-white">
                    Salary for {selectedCutOff.label.split("(")[0].trim().toUpperCase()}
                  </h3>
                  <p className="text-[12px] font-bold text-brand-sky/80 mt-0.5">
                    Cut-off Period: {selectedCutOff.start.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} to {selectedCutOff.end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 text-center items-center">
                <button
                  onClick={togglePaidStatus}
                  disabled={isTogglingPaid}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all duration-200 border-2 ${
                    isPaid
                      ? "bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30"
                      : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                  } ${isTogglingPaid ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                    {isPaid ? "check_circle" : "payments"}
                  </span>
                  {isPaid ? "Paid" : "Mark as Paid"}
                </button>
                <div className="bg-white/15 rounded-full px-5 py-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-sky/80">Total Gross</p>
                  <p className="text-[16px] font-black text-white">{fmt(data.totalGross)}</p>
                </div>
                <div className="bg-[#294870] rounded-full px-5 py-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-yellow/90">Total Net</p>
                  <p className="text-[16px] font-black text-brand-yellow">{fmt(data.totalNet)}</p>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-sky">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/60">Employee</th>
                    {viewMode === "employee" ? (
                      <>
                        <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/60 text-center">Days</th>
                        <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/60 text-right">Rate</th>
                        <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/60 text-right">Basic Pay</th>
                        <th className="px-3 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-red/60 text-center bg-brand-red/5">Late Ded.</th>
                        <th className="px-3 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-orange/70 text-center bg-brand-orange/5">Comms</th>
                        <th className="px-3 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-orange/70 text-center bg-brand-orange/5">Attendance</th>
                        <th className="px-3 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-orange/70 text-center bg-brand-orange/5">B-day Gift</th>
                        <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue text-right">Gross Pay</th>
                        <th className="px-3 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-red/60 text-center bg-brand-red/5">SSS</th>
                        <th className="px-3 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-red/60 text-center bg-brand-red/5">Philhealth</th>
                        <th className="px-3 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-red/60 text-center bg-brand-red/5">Pag-ibig</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-green text-right">Net Pay</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue/60 text-right">Gross Pay</th>
                        <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-orange/80 text-center bg-brand-orange/10">ER SSS</th>
                        <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-orange/80 text-center bg-brand-orange/10">ER Philhealth</th>
                        <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-orange/80 text-center bg-brand-orange/10">ER Pag-ibig</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-brand-orange text-right bg-brand-orange/10">Total ER Cost</th>
                      </>
                    )}
                  </tr>
                </thead>
                <m.tbody variants={containerVariants} initial="hidden" animate="visible">
                  {data.records.map((r) => (
                    <m.tr
                      key={r.id}
                      variants={rowVariants}
                      className="border-b border-brand-sky/40 hover:bg-brand-sky/20 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 group-hover:scale-110 transition-transform ${viewMode === "employee" ? "bg-brand-blue" : "bg-brand-orange"}`}>
                            {r.name.split(",")[0].trim().slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-[13px] font-black text-brand-navy">{r.name}</span>
                        </div>
                      </td>
                      {viewMode === "employee" ? (
                        <>
                          <td className="px-4 py-4 text-center">
                            <span className="text-[13px] font-bold text-brand-blue">
                              {r.daysPresent > 0 ? `${r.daysPresent} days` : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-[13px] font-bold text-brand-navy/70">
                              {r.monthlyRate > 0 ? `${fmt(r.monthlyRate)}/mo` : r.dailyRate > 0 ? `${fmt(r.dailyRate)}/d` : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-[13px] font-bold text-brand-navy">{fmt(r.basic)}</span>
                          </td>
                          <td className="px-3 py-4 text-center bg-brand-red/5">
                            {r.lateDeduction != null && r.lateDeduction > 0
                              ? <span className="text-[12px] font-bold text-brand-red/80">−{fmt(r.lateDeduction)}</span>
                              : <span className="text-[11px] text-brand-navy/30">—</span>
                            }
                          </td>
                          <td className="px-3 py-4 text-center bg-brand-orange/5">
                            <span className="text-[12px] font-bold text-brand-navy/60">{r.comms > 0 ? fmt(r.comms) : "—"}</span>
                          </td>
                          <td className="px-3 py-4 text-center bg-brand-orange/5">
                            <span className="text-[12px] font-bold text-brand-navy/60">{r.perfectAttendance > 0 ? fmt(r.perfectAttendance) : "—"}</span>
                          </td>
                          <td className="px-3 py-4 text-center bg-brand-orange/5">
                            <span className="text-[12px] font-bold text-brand-navy/60">{r.birthdayGift > 0 ? fmt(r.birthdayGift) : "—"}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-[13px] font-black text-brand-blue">{fmt(r.gross)}</span>
                          </td>
                          <td className="px-3 py-4 text-center bg-brand-red/5">
                            <span className="text-[12px] font-bold text-brand-red/70">{r.sss > 0 ? r.sss.toFixed(2) : "—"}</span>
                          </td>
                          <td className="px-3 py-4 text-center bg-brand-red/5">
                            <span className="text-[12px] font-bold text-brand-red/70">{r.philhealth > 0 ? r.philhealth.toFixed(2) : "—"}</span>
                          </td>
                          <td className="px-3 py-4 text-center bg-brand-red/5">
                            <span className="text-[12px] font-bold text-brand-red/70">{r.pagibig > 0 ? r.pagibig.toFixed(2) : "—"}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-block bg-brand-green/10 text-brand-green text-[13px] font-black rounded-full px-3 py-1">
                              {fmt(r.net)}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-4 text-right">
                            <span className="text-[13px] font-black text-brand-blue">{fmt(r.gross)}</span>
                          </td>
                          <td className="px-4 py-4 text-center bg-brand-orange/10">
                            <span className="text-[12px] font-bold text-brand-orange/80">{r.employer?.sss ? fmt(r.employer.sss) : "—"}</span>
                          </td>
                          <td className="px-4 py-4 text-center bg-brand-orange/10">
                            <span className="text-[12px] font-bold text-brand-orange/80">{r.employer?.philhealth ? fmt(r.employer.philhealth) : "—"}</span>
                          </td>
                          <td className="px-4 py-4 text-center bg-brand-orange/10">
                            <span className="text-[12px] font-bold text-brand-orange/80">{r.employer?.pagibig ? fmt(r.employer.pagibig) : "—"}</span>
                          </td>
                          <td className="px-6 py-4 text-right bg-brand-orange/10">
                            <span className="inline-block bg-brand-orange/20 text-brand-orange text-[13px] font-black rounded-full px-3 py-1">
                              {r.employer?.total ? fmt(r.employer.total) : "—"}
                            </span>
                          </td>
                        </>
                      )}
                    </m.tr>
                  ))}
                </m.tbody>
              </table>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}
