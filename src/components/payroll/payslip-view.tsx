"use client";

import { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { m, AnimatePresence  } from "framer-motion";
import Image from "next/image";

type PayrollRecord = {
  id: string;
  name: string;
  basic: number;
  hours: number;
  daysPresent: number;
  monthlyRate: number;
  dailyRate: number;
  comms: number;
  perfectAttendance: number;
  birthdayGift: number;
  gross: number;
  lateDeduction?: number;
  weeklyShortfallDeduction?: number;
  sss: number;
  philhealth: number;
  pagibig: number;
  totalDeductions: number;
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

function generateCutOffs(): { label: string; value: string; startStr: string; endStr: string; dateLabel: string; periodLabel: string }[] {
  const cutOffs = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthName = d.toLocaleString("en-US", { month: "long" });

    const pay2 = new Date(year, month, 31);
    cutOffs.push({
      label: `${monthName} ${pay2.getDate()}, ${year} (${monthName.slice(0, 3)} 11–25)`,
      value: `${year}-${month}-2h`,
      startStr: `${year}-${String(month + 1).padStart(2, "0")}-11`,
      endStr: `${year}-${String(month + 1).padStart(2, "0")}-25`,
      dateLabel: `${monthName.toUpperCase()} ${pay2.getDate()}, ${year}`,
      periodLabel: `${monthName} 11, ${year} to ${monthName} 25, ${year}`,
    });

    const pay1 = new Date(year, month, 15);
    cutOffs.push({
      label: `${monthName} ${pay1.getDate()}, ${year} (${new Date(year, month - 1).toLocaleString("en-US", { month: "short" })} 26–${monthName.slice(0, 3)} 10)`,
      value: `${year}-${month}-1h`,
      startStr: `${year}-${String(month).padStart(2, "0")}-26`,
      endStr: `${year}-${String(month + 1).padStart(2, "0")}-10`,
      dateLabel: `${monthName.toUpperCase()} 15, ${year}`,
      periodLabel: `${new Date(year, month - 1).toLocaleString("en-US", { month: "long" })} 26, ${year} to ${monthName} 10, ${year}`,
    });
  }
  
  // System began operation August 1, 2026. Earliest cutoff is Aug 15 (end date: Aug 10)
  return cutOffs.filter(c => c.endStr >= "2026-08-10");
}

const fmt = (val: number) =>
  new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

function PayslipCard({ data, variant, dateLabel, periodLabel }: { data: PayrollRecord; variant: "employee" | "accounting", dateLabel: string, periodLabel: string }) {
  const isEmployee = variant === "employee";

  // Choose which values to display based on the copy
  const sssVal = isEmployee ? data.sss : (data.employer?.sss ?? 0);
  const philhealthVal = isEmployee ? data.philhealth : (data.employer?.philhealth ?? 0);
  const pagibigVal = isEmployee ? data.pagibig : (data.employer?.pagibig ?? 0);
  const totalDeductionVal = isEmployee ? data.totalDeductions : (data.employer?.total ?? 0);

  return (
    <div className="flex-1 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-md print:shadow-none min-w-[340px]">
      {/* Payslip Header */}
      <div className="flex items-start gap-4 px-6 py-5 border-b-2 border-gray-100 bg-brand-sky/10">
        <div className="w-16 h-16 relative shrink-0">
          <Image
            src="/LOGO-noBG.png"
            alt="Merry Explorers Logo"
            fill
            className="object-contain"
          />
        </div>
        <div className="flex-1 pt-1">
          <p className="font-headline text-[12px] font-black uppercase tracking-wider text-brand-navy">
            Merry Explorers Playgroup and Learning Center
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
            <span className="text-brand-blue/60 font-bold uppercase tracking-wide">Employee Name:</span>
            <span className="font-black text-brand-navy">{data.name}</span>
            <span className="text-brand-blue/60 font-bold uppercase tracking-wide">{data.monthlyRate > 0 ? "Monthly Rate" : "Daily Rate"}:</span>
            <span className="font-bold text-brand-navy">{data.monthlyRate > 0 ? `₱ ${fmt(data.monthlyRate)}` : `₱ ${fmt(data.dailyRate)}/day`}</span>
          </div>
        </div>
        <div className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border-2 ${isEmployee ? "border-brand-blue/30 text-brand-blue/60 bg-brand-sky/30" : "border-brand-orange/30 text-brand-orange/80 bg-brand-orange/5"
          }`}>
          {isEmployee ? "Employee's Copy" : "Accounting's Copy"}
        </div>
      </div>

      {/* Payslip Period */}
      <div className="text-center py-3 border-b border-gray-100 bg-brand-sky/20">
        <p className="text-[11px] font-black text-brand-navy uppercase tracking-wider">
          Payslip | {dateLabel}
        </p>
        <p className="text-[10px] font-bold text-brand-blue/70 mt-0.5">
          For the cut-off period: {periodLabel}
        </p>
      </div>

      {/* Line Items */}
      <div className="px-6 py-4 space-y-0">
        {/* Basic Pay */}
        <div className="flex justify-between items-center py-2 border-b border-gray-50">
          <div>
            <p className="text-[12px] font-black text-brand-navy">Basic Pay</p>
            <p className="text-[10px] text-brand-blue/60 font-bold">
              {data.monthlyRate > 0
                ? `Monthly salary (prorated ${data.daysPresent} of ${(data as any).totalScheduledWorkDays ?? "?"} days)`
                : `${data.daysPresent} day${data.daysPresent !== 1 ? "s" : ""} × ₱${fmt(data.dailyRate)}`}
            </p>
          </div>
          <span className="text-[13px] font-black text-brand-navy">{fmt(data.basic)}</span>
        </div>

        {/* Incentives */}
        <div className="py-2 border-b border-gray-50">
          <p className="text-[11px] font-black text-brand-blue/60 uppercase tracking-wide mb-1.5">Incentives & Allowances</p>
          <div className="space-y-1 pl-3">
            {[
              { label: "Communication Allowance", val: data.comms },
              { label: "Perfect Attendance", val: data.perfectAttendance },
              { label: "Birthday Cash Gift", val: data.birthdayGift },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between">
                <span className="text-[11px] font-bold text-brand-navy/70">Add: {label}</span>
                <span className={`text-[11px] font-bold ${val > 0 ? "text-brand-green" : "text-brand-navy/40"}`}>
                  {fmt(val)}
                </span>
              </div>
            ))}
            <div className="flex justify-between pt-1 border-t border-gray-100">
              <span className="text-[11px] font-black text-brand-navy/60">Subtotal</span>
              <span className="text-[11px] font-black text-brand-navy">
                {fmt(data.comms + data.perfectAttendance + data.birthdayGift)}
              </span>
            </div>
          </div>
        </div>

        {/* Gross Pay */}
        <div className="flex justify-between items-center py-2.5 bg-brand-blue/5 rounded-lg px-3 my-1">
          <span className="text-[13px] font-black text-brand-navy">GROSS PAY</span>
          <span className="text-[14px] font-black text-brand-blue">{fmt(data.gross)}</span>
        </div>

        {/* Deductions or Contributions */}
        <div className="py-2 border-b border-gray-50">
          <p className={`text-[11px] font-black uppercase tracking-wide mb-1.5 ${isEmployee ? "text-brand-red/60" : "text-brand-orange/80"}`}>
            {isEmployee ? "Employee Deductions" : "Employer Contributions"}
          </p>
          <div className="space-y-1 pl-3">
            {/* Late Arrival Deduction — employee copy only, shown only when > 0 */}
            {isEmployee && data.lateDeduction != null && data.lateDeduction > 0 && (
              <div className="flex justify-between">
                <span className="text-[11px] font-bold text-brand-navy/70">Less: Late Arrival Deduction</span>
                <span className="text-[11px] font-bold text-brand-red/70">{fmt(data.lateDeduction)}</span>
              </div>
            )}
            {/* Weekly Shortfall Deduction — employee copy only, shown only when > 0 */}
            {isEmployee && data.weeklyShortfallDeduction != null && data.weeklyShortfallDeduction > 0 && (
              <div className="flex justify-between">
                <span className="text-[11px] font-bold text-brand-navy/70">Less: Weekly Hours Shortfall</span>
                <span className="text-[11px] font-bold text-brand-red/70">{fmt(data.weeklyShortfallDeduction)}</span>
              </div>
            )}
            {[
              { label: "SSS Contribution", val: sssVal },
              { label: "Philhealth Contribution", val: philhealthVal },
              { label: "Pag-ibig Contribution", val: pagibigVal },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between">
                <span className="text-[11px] font-bold text-brand-navy/70">{isEmployee ? "Less:" : "Employer Share:"} {label}</span>
                <span className={`text-[11px] font-bold ${isEmployee ? "text-brand-red/70" : "text-brand-orange/80"}`}>{fmt(val)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1 border-t border-gray-100">
              <span className="text-[11px] font-black text-brand-navy/60">{isEmployee ? "Total Deduction" : "Total ER Cost"}</span>
              <span className={`text-[11px] font-black ${isEmployee ? "text-brand-red" : "text-brand-orange"}`}>
                {isEmployee
                  ? fmt(totalDeductionVal + (data.lateDeduction ?? 0) + (data.weeklyShortfallDeduction ?? 0))
                  : fmt(totalDeductionVal)
                }
              </span>
            </div>
          </div>
        </div>

        {/* Net Pay (Only on Employee Copy) */}
        {isEmployee && (
          <div className="flex justify-between items-center py-3 mt-1">
            <span className="text-[15px] font-black text-brand-navy">NET PAY</span>
            <span className="text-[17px] font-black text-brand-green">{fmt(data.net)}</span>
          </div>
        )}

        {/* Signature */}
        <div className="pt-4 border-t-2 border-gray-100 mt-2">
          <p className="text-[10px] font-bold text-brand-navy/50 mb-4">Received by:</p>
          <div className="border-t border-gray-300 pt-1">
            <p className="text-[11px] font-black text-brand-navy text-center tracking-widest uppercase">
              {data.name.toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


export function PayslipView() {
  const CUT_OFFS = generateCutOffs();
  const [selectedCutOffValue, setSelectedCutOffValue] = useState(CUT_OFFS[0].value);
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [empOpen, setEmpOpen] = useState(false);
  const [cutOffOpen, setCutOffOpen] = useState(false);

  const selectedCutOff = CUT_OFFS.find((c) => c.value === selectedCutOffValue) ?? CUT_OFFS[0];

  useEffect(() => {
    fetch(`/api/payroll-summary?startDate=${selectedCutOff.startStr}&endDate=${selectedCutOff.endStr}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setData(json);
          if (json.records.length > 0 && !json.records.find((r: any) => r.id === selectedEmployeeId)) {
            setSelectedEmployeeId(json.records[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCutOff.startStr, selectedCutOff.endStr]);

  const payslipRecord = data?.records.find((r) => r.id === selectedEmployeeId) ?? null;

  return (
    <m.div
      className="flex flex-col gap-6 w-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <style type="text/css" media="print">
        {`
          @page { size: letter portrait; margin: 0; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-page-wrapper {
            width: 100%;
            height: 100vh; /* Exactly one page */
            page-break-after: always;
            break-after: page;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            margin: 0;
            overflow: hidden;
          }
          .print-payslip-card {
            width: 500px; /* Fixed base width */
            transform: scale(1.45); /* Scale up to fill 8.5x11 page (~725px scaled width) */
            transform-origin: center center;
            border: none !important;
            box-shadow: none !important;
          }
          /* Remove the last page break */
          .print-page-wrapper:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        `}
      </style>

      {/* Filter Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between rounded-[2rem] bg-white px-6 py-4 shadow-lg border-2 border-brand-sky gap-4 w-full print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "20px" }}>
              tune
            </span>
            <span className="text-[13px] font-black text-brand-navy">Payslip Options:</span>
          </div>

          {/* Employee Selector */}
          <div className="relative">
            <button
              onClick={() => { setEmpOpen(!empOpen); setCutOffOpen(false); }}
              className={`flex items-center gap-3 rounded-full border px-4 py-2 text-[12px] font-bold transition-all duration-200 whitespace-nowrap min-w-[160px] justify-between ${empOpen ? "border-brand-blue/40 bg-brand-sky text-brand-blue shadow-sm" : "border-brand-sky bg-brand-sky/40 text-brand-navy hover:bg-brand-sky"
                }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "15px" }}>person</span>
                {payslipRecord?.name ?? "Select Employee..."}
              </div>
              <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "16px", transform: empOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                expand_more
              </span>
            </button>
            <AnimatePresence>
              {empOpen && (
                <m.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-[calc(100%+6px)] left-0 z-50 min-w-[200px] rounded-2xl bg-white border-2 border-brand-sky shadow-lg"
                >
                  <div className="py-1.5">
                    {data?.records.map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => { setSelectedEmployeeId(emp.id); setEmpOpen(false); }}
                        className={`w-full px-5 py-2 text-left text-[13px] font-bold transition-colors flex items-center gap-2 ${selectedEmployeeId === emp.id ? "bg-brand-sky/40 text-brand-blue" : "text-brand-navy/70 hover:bg-brand-sky/20 hover:text-brand-navy"
                          }`}
                      >
                        {selectedEmployeeId === emp.id ? (
                          <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "15px" }}>check</span>
                        ) : <div className="w-4" />}
                        {emp.name}
                      </button>
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Cut-Off Selector */}
          <div className="relative">
            <button
              onClick={() => { setCutOffOpen(!cutOffOpen); setEmpOpen(false); }}
              className={`flex items-center gap-3 rounded-full border px-4 py-2 text-[12px] font-bold transition-all duration-200 whitespace-nowrap min-w-[220px] justify-between ${cutOffOpen ? "border-brand-blue/40 bg-brand-sky text-brand-blue shadow-sm" : "border-brand-sky bg-brand-sky/40 text-brand-navy hover:bg-brand-sky"
                }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "15px" }}>date_range</span>
                {selectedCutOff.label}
              </div>
              <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "16px", transform: cutOffOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                expand_more
              </span>
            </button>
            <AnimatePresence>
              {cutOffOpen && (
                <m.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-[calc(100%+6px)] left-0 z-50 min-w-[260px] rounded-2xl bg-white border-2 border-brand-sky shadow-lg"
                >
                  <div className="py-1.5">
                    {CUT_OFFS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => { setSelectedCutOffValue(c.value); setCutOffOpen(false); }}
                        className={`w-full px-5 py-2 text-left text-[13px] font-bold transition-colors flex items-center gap-2 ${selectedCutOffValue === c.value ? "bg-brand-sky/40 text-brand-blue" : "text-brand-navy/70 hover:bg-brand-sky/20 hover:text-brand-navy"
                          }`}
                      >
                        {selectedCutOffValue === c.value ? (
                          <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "15px" }}>check</span>
                        ) : <div className="w-4" />}
                        {c.label}
                      </button>
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Print Button */}
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-full bg-brand-blue px-6 py-2.5 text-[13px] font-bold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0 shrink-0"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>print</span>
          Print Payslips
        </button>
      </div>

      {/* Payslip Cards */}
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
              <p className="text-[13px] font-bold text-brand-navy/60">Fetching payslip data…</p>
            </div>
          </m.div>
        ) : !payslipRecord ? (
          <m.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[2rem] bg-white border-2 border-brand-blue shadow-[var(--shadow-card)] flex items-center justify-center py-24 w-full"
          >
            <p className="text-[13px] font-bold text-brand-navy/60">No payslip data found.</p>
          </m.div>
        ) : (
          <m.div
            key={`${selectedEmployeeId}-${selectedCutOffValue}`}
            className="flex flex-col lg:flex-row gap-5 w-full print:block print:w-auto"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <div className="print:hidden lg:flex lg:flex-row lg:gap-5 w-full">
              <PayslipCard data={payslipRecord} variant="employee" dateLabel={selectedCutOff.dateLabel} periodLabel={selectedCutOff.periodLabel} />
              <PayslipCard data={payslipRecord} variant="accounting" dateLabel={selectedCutOff.dateLabel} periodLabel={selectedCutOff.periodLabel} />
            </div>

            {/* Print-only layout */}
            <div className="hidden print:block w-full">
              <div className="print-page-wrapper">
                <div className="print-payslip-card">
                  <PayslipCard data={payslipRecord} variant="employee" dateLabel={selectedCutOff.dateLabel} periodLabel={selectedCutOff.periodLabel} />
                </div>
              </div>
              <div className="print-page-wrapper">
                <div className="print-payslip-card">
                  <PayslipCard data={payslipRecord} variant="accounting" dateLabel={selectedCutOff.dateLabel} periodLabel={selectedCutOff.periodLabel} />
                </div>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}
