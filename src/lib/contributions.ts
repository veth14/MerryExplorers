/**
 * contributions.ts
 *
 * Pure utility module for computing mandatory government contributions.
 * No React, no DB imports — safe to use in both API routes and client pages.
 *
 * Rules implemented:
 *   SSS     — SSS Circular No. 2024-006 (effective January 2025); bracket lookup only.
 *   PhilHealth — 5% total, 2.5% employee / 2.5% employer of monthly basic salary.
 *   Pag-IBIG — Tiered: 1% (≤1,500), 2% (1,501–10,000), capped ₱200/month (>10,000).
 *
 * IMPORTANT:
 *   - Only EMPLOYEE share should be deducted from employee pay / shown on payslip.
 *   - EMPLOYER share is tracked separately for accounting — NOT part of employee deductions.
 *   - Monthly contributions are divided by 2 for each payroll cutoff.
 */

import { lookupSSS } from "./sss-table";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ContributionSplit = {
  employeeShare: number;
  employerShare: number;
  monthlyTotal: number;
};

export type ContributionSet = {
  sss: ContributionSplit & {
    regularSSMSC: number;
    mpfMSC: number;
    employeeRegularSS: number;
    employeeMPF: number;
    employerRegularSS: number;
    employerEC: number;
    employerMPF: number;
  };
  philhealth: ContributionSplit;
  pagibig: ContributionSplit;
  /** Per-cutoff amounts (employeeShare / 2, rounded to 2 dp) */
  perCutoff: {
    sss: number;
    philhealth: number;
    pagibig: number;
    totalEmployeeDeductions: number;
  };
  /** Employer-side per-cutoff amounts (for accounting/reporting only) */
  employerPerCutoff: {
    sss: number;
    philhealth: number;
    pagibig: number;
    totalEmployerCost: number;
  };
};

// ── PhilHealth ─────────────────────────────────────────────────────────────────

/**
 * Computes the monthly PhilHealth contributions.
 *
 * Rate: 5% of monthly salary (2.5% employee + 2.5% employer).
 * No cap applied per the 2024 rules (the cap was removed in the latest PhilHealth circular).
 *
 * @param monthlySalary  Employee's gross monthly salary.
 */
export function computePhilHealth(monthlySalary: number): ContributionSplit {
  const total = round2(monthlySalary * 0.05);
  const employeeShare = round2(total / 2);
  const employerShare = round2(total - employeeShare); // avoids floating-point drift
  return { employeeShare, employerShare, monthlyTotal: total };
}

// ── Pag-IBIG ───────────────────────────────────────────────────────────────────

/**
 * Computes the monthly Pag-IBIG (HDMF) contributions.
 *
 * Employee tier:
 *   - Salary ≤ ₱1,500            → 1%
 *   - Salary ₱1,501 – ₱10,000   → 2%
 *   - Salary > ₱10,000           → capped at ₱200/month
 *
 * Employer share mirrors employee rate (1%/2%) up to capped ₱100 at >₱10,000.
 * NOTE: Pag-IBIG employer cap is also ₱200/month.
 *
 * @param monthlySalary  Employee's gross monthly salary.
 */
export function computePagIbig(monthlySalary: number): ContributionSplit {
  let employeeShare: number;
  let employerShare: number;

  if (monthlySalary <= 1500) {
    employeeShare = round2(monthlySalary * 0.01);
    employerShare = round2(monthlySalary * 0.02); // employer pays 2% regardless
  } else if (monthlySalary <= 10000) {
    employeeShare = round2(monthlySalary * 0.02);
    employerShare = round2(monthlySalary * 0.02);
  } else {
    // Above ₱10,000: employee capped at ₱200, employer also capped at ₱200
    employeeShare = 200;
    employerShare = 200;
  }

  return { employeeShare, employerShare, monthlyTotal: round2(employeeShare + employerShare) };
}

// ── SSS (using official 2024-006 table) ────────────────────────────────────────

/**
 * Computes SSS contributions by looking up the employee's monthly salary in the
 * official SSS Circular No. 2024-006 contribution table.
 *
 * DO NOT use a simple salary × percentage formula — the SSS uses MSC brackets.
 *
 * @param monthlySalary  Employee's gross monthly salary.
 */
export function computeSSS(monthlySalary: number): ContributionSet["sss"] {
  const row = lookupSSS(monthlySalary);
  return {
    employeeShare: row.employeeTotal,
    employerShare: row.employerTotal,
    monthlyTotal: row.grandTotal,
    regularSSMSC: row.regularSSMSC,
    mpfMSC: row.mpfMSC,
    employeeRegularSS: row.employeeRegularSS,
    employeeMPF: row.employeeMPF,
    employerRegularSS: row.employerRegularSS,
    employerEC: row.employerEC,
    employerMPF: row.employerMPF,
  };
}

// ── Master function ────────────────────────────────────────────────────────────

/**
 * Computes all mandatory government contributions for an employee.
 *
 * Returns employee and employer shares separately, and the per-cutoff amounts.
 *
 * @param monthlySalary  The employee's gross monthly salary.
 *
 * @example
 * // Angel Villegas: ₱20,500 monthly
 * const c = computeContributions(20500);
 * c.perCutoff.sss         // → 512.50  (₱1,025 ÷ 2)
 * c.perCutoff.philhealth  // → 256.25  (₱512.50 ÷ 2)
 * c.perCutoff.pagibig     // → 100.00  (₱200 ÷ 2)
 * c.perCutoff.totalEmployeeDeductions  // → 868.75
 */
export function computeContributions(monthlySalary: number): ContributionSet {
  if (monthlySalary <= 0) {
    return {
      sss: { employeeShare: 0, employerShare: 0, monthlyTotal: 0, regularSSMSC: 0, mpfMSC: 0, employeeRegularSS: 0, employeeMPF: 0, employerRegularSS: 0, employerEC: 0, employerMPF: 0 },
      philhealth: { employeeShare: 0, employerShare: 0, monthlyTotal: 0 },
      pagibig: { employeeShare: 0, employerShare: 0, monthlyTotal: 0 },
      perCutoff: { sss: 0, philhealth: 0, pagibig: 0, totalEmployeeDeductions: 0 },
      employerPerCutoff: { sss: 0, philhealth: 0, pagibig: 0, totalEmployerCost: 0 },
    };
  }

  const sss = computeSSS(monthlySalary);
  const philhealth = computePhilHealth(monthlySalary);
  const pagibig = computePagIbig(monthlySalary);

  const perCutoffSSS       = round2(sss.employeeShare / 2);
  const perCutoffPhilHealth = round2(philhealth.employeeShare / 2);
  const perCutoffPagIbig   = round2(pagibig.employeeShare / 2);

  const employerPerCutoffSSS        = round2(sss.employerShare / 2);
  const employerPerCutoffPhilHealth = round2(philhealth.employerShare / 2);
  const employerPerCutoffPagIbig    = round2(pagibig.employerShare / 2);

  return {
    sss,
    philhealth,
    pagibig,
    perCutoff: {
      sss: perCutoffSSS,
      philhealth: perCutoffPhilHealth,
      pagibig: perCutoffPagIbig,
      totalEmployeeDeductions: round2(perCutoffSSS + perCutoffPhilHealth + perCutoffPagIbig),
    },
    employerPerCutoff: {
      sss: employerPerCutoffSSS,
      philhealth: employerPerCutoffPhilHealth,
      pagibig: employerPerCutoffPagIbig,
      totalEmployerCost: round2(employerPerCutoffSSS + employerPerCutoffPhilHealth + employerPerCutoffPagIbig),
    },
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}
