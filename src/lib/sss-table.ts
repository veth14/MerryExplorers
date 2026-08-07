/**
 * sss-table.ts
 *
 * Official SSS contribution table based on SSS Circular No. 2024-006
 * Effective January 2025.
 *
 * Source: SSS Circular No. 2024-006 dated 19 December 2024
 * "Schedule of SSS Contributions Effective January 2025"
 *
 * Contribution rate: 15% total
 *   - Employer Regular SS: 10% of Regular SS MSC
 *   - Employee Regular SS: 5% of Regular SS MSC
 *   - Employer EC (Employees' Compensation): ₱10 (MSC ≤ ₱14,500) or ₱30 (MSC ≥ ₱15,000)
 *   - MPF: applies to MSC above ₱20,000 up to max ₱35,000 (Employer 10%, Employee 5%)
 *
 * DO NOT calculate SSS as a simple salary × percentage.
 * Always use a bracket lookup against this table.
 */

export type SSSRow = {
  /** Lower bound of compensation range (0 = "Below 5,250") */
  minSalary: number;
  /** Upper bound of compensation range (Infinity = last bracket and above) */
  maxSalary: number;
  /** MSC used for Regular SS computation */
  regularSSMSC: number;
  /** MSC used for Mandatory Provident Fund (0 if not applicable) */
  mpfMSC: number;
  /** Total MSC = regularSSMSC + mpfMSC */
  totalMSC: number;

  // ── Employee amounts (deductible from employee salary) ───────────────────
  employeeRegularSS: number;
  employeeMPF: number;
  /** Total employee SSS deduction = employeeRegularSS + employeeMPF */
  employeeTotal: number;

  // ── Employer amounts (NOT deducted from employee — for accounting only) ──
  employerRegularSS: number;
  /** EC (Employees' Compensation) — paid by employer only */
  employerEC: number;
  employerMPF: number;
  /** Total employer cost = employerRegularSS + employerEC + employerMPF */
  employerTotal: number;

  /** Combined (employer + employee) total */
  grandTotal: number;
};

/**
 * Full SSS contribution table from Circular No. 2024-006.
 *
 * Rows are ordered from lowest to highest compensation range.
 * Use `lookupSSS(monthlySalary)` for the correct bracket — do not iterate manually.
 */
export const SSS_TABLE: SSSRow[] = [
  // ─── No MPF (salary up to ≈20,249) ──────────────────────────────────────
  // EC = ₱10 for Regular SS MSC ≤ 14,500; ₱30 for MSC ≥ 15,000
  { minSalary: 0,      maxSalary: 5249.99,  regularSSMSC: 5000,  mpfMSC: 0, totalMSC: 5000,  employeeRegularSS: 250,  employeeMPF: 0,   employeeTotal: 250,  employerRegularSS: 500,  employerEC: 10, employerMPF: 0,   employerTotal: 510,  grandTotal: 760  },
  { minSalary: 5250,   maxSalary: 5749.99,  regularSSMSC: 5500,  mpfMSC: 0, totalMSC: 5500,  employeeRegularSS: 275,  employeeMPF: 0,   employeeTotal: 275,  employerRegularSS: 550,  employerEC: 10, employerMPF: 0,   employerTotal: 560,  grandTotal: 835  },
  { minSalary: 5750,   maxSalary: 6249.99,  regularSSMSC: 6000,  mpfMSC: 0, totalMSC: 6000,  employeeRegularSS: 300,  employeeMPF: 0,   employeeTotal: 300,  employerRegularSS: 600,  employerEC: 10, employerMPF: 0,   employerTotal: 610,  grandTotal: 910  },
  { minSalary: 6250,   maxSalary: 6749.99,  regularSSMSC: 6500,  mpfMSC: 0, totalMSC: 6500,  employeeRegularSS: 325,  employeeMPF: 0,   employeeTotal: 325,  employerRegularSS: 650,  employerEC: 10, employerMPF: 0,   employerTotal: 660,  grandTotal: 985  },
  { minSalary: 6750,   maxSalary: 7249.99,  regularSSMSC: 7000,  mpfMSC: 0, totalMSC: 7000,  employeeRegularSS: 350,  employeeMPF: 0,   employeeTotal: 350,  employerRegularSS: 700,  employerEC: 10, employerMPF: 0,   employerTotal: 710,  grandTotal: 1060 },
  { minSalary: 7250,   maxSalary: 7749.99,  regularSSMSC: 7500,  mpfMSC: 0, totalMSC: 7500,  employeeRegularSS: 375,  employeeMPF: 0,   employeeTotal: 375,  employerRegularSS: 750,  employerEC: 10, employerMPF: 0,   employerTotal: 760,  grandTotal: 1135 },
  { minSalary: 7750,   maxSalary: 8249.99,  regularSSMSC: 8000,  mpfMSC: 0, totalMSC: 8000,  employeeRegularSS: 400,  employeeMPF: 0,   employeeTotal: 400,  employerRegularSS: 800,  employerEC: 10, employerMPF: 0,   employerTotal: 810,  grandTotal: 1210 },
  { minSalary: 8250,   maxSalary: 8749.99,  regularSSMSC: 8500,  mpfMSC: 0, totalMSC: 8500,  employeeRegularSS: 425,  employeeMPF: 0,   employeeTotal: 425,  employerRegularSS: 850,  employerEC: 10, employerMPF: 0,   employerTotal: 860,  grandTotal: 1285 },
  { minSalary: 8750,   maxSalary: 9249.99,  regularSSMSC: 9000,  mpfMSC: 0, totalMSC: 9000,  employeeRegularSS: 450,  employeeMPF: 0,   employeeTotal: 450,  employerRegularSS: 900,  employerEC: 10, employerMPF: 0,   employerTotal: 910,  grandTotal: 1360 },
  { minSalary: 9250,   maxSalary: 9749.99,  regularSSMSC: 9500,  mpfMSC: 0, totalMSC: 9500,  employeeRegularSS: 475,  employeeMPF: 0,   employeeTotal: 475,  employerRegularSS: 950,  employerEC: 10, employerMPF: 0,   employerTotal: 960,  grandTotal: 1435 },
  { minSalary: 9750,   maxSalary: 10249.99, regularSSMSC: 10000, mpfMSC: 0, totalMSC: 10000, employeeRegularSS: 500,  employeeMPF: 0,   employeeTotal: 500,  employerRegularSS: 1000, employerEC: 10, employerMPF: 0,   employerTotal: 1010, grandTotal: 1510 },
  { minSalary: 10250,  maxSalary: 10749.99, regularSSMSC: 10500, mpfMSC: 0, totalMSC: 10500, employeeRegularSS: 525,  employeeMPF: 0,   employeeTotal: 525,  employerRegularSS: 1050, employerEC: 10, employerMPF: 0,   employerTotal: 1060, grandTotal: 1585 },
  { minSalary: 10750,  maxSalary: 11249.99, regularSSMSC: 11000, mpfMSC: 0, totalMSC: 11000, employeeRegularSS: 550,  employeeMPF: 0,   employeeTotal: 550,  employerRegularSS: 1100, employerEC: 10, employerMPF: 0,   employerTotal: 1110, grandTotal: 1660 },
  { minSalary: 11250,  maxSalary: 11749.99, regularSSMSC: 11500, mpfMSC: 0, totalMSC: 11500, employeeRegularSS: 575,  employeeMPF: 0,   employeeTotal: 575,  employerRegularSS: 1150, employerEC: 10, employerMPF: 0,   employerTotal: 1160, grandTotal: 1735 },
  { minSalary: 11750,  maxSalary: 12249.99, regularSSMSC: 12000, mpfMSC: 0, totalMSC: 12000, employeeRegularSS: 600,  employeeMPF: 0,   employeeTotal: 600,  employerRegularSS: 1200, employerEC: 10, employerMPF: 0,   employerTotal: 1210, grandTotal: 1810 },
  { minSalary: 12250,  maxSalary: 12749.99, regularSSMSC: 12500, mpfMSC: 0, totalMSC: 12500, employeeRegularSS: 625,  employeeMPF: 0,   employeeTotal: 625,  employerRegularSS: 1250, employerEC: 10, employerMPF: 0,   employerTotal: 1260, grandTotal: 1885 },
  { minSalary: 12750,  maxSalary: 13249.99, regularSSMSC: 13000, mpfMSC: 0, totalMSC: 13000, employeeRegularSS: 650,  employeeMPF: 0,   employeeTotal: 650,  employerRegularSS: 1300, employerEC: 10, employerMPF: 0,   employerTotal: 1310, grandTotal: 1960 },
  { minSalary: 13250,  maxSalary: 13749.99, regularSSMSC: 13500, mpfMSC: 0, totalMSC: 13500, employeeRegularSS: 675,  employeeMPF: 0,   employeeTotal: 675,  employerRegularSS: 1350, employerEC: 10, employerMPF: 0,   employerTotal: 1360, grandTotal: 2035 },
  { minSalary: 13750,  maxSalary: 14249.99, regularSSMSC: 14000, mpfMSC: 0, totalMSC: 14000, employeeRegularSS: 700,  employeeMPF: 0,   employeeTotal: 700,  employerRegularSS: 1400, employerEC: 10, employerMPF: 0,   employerTotal: 1410, grandTotal: 2110 },
  { minSalary: 14250,  maxSalary: 14749.99, regularSSMSC: 14500, mpfMSC: 0, totalMSC: 14500, employeeRegularSS: 725,  employeeMPF: 0,   employeeTotal: 725,  employerRegularSS: 1450, employerEC: 10, employerMPF: 0,   employerTotal: 1460, grandTotal: 2185 },
  // EC switches to ₱30 at MSC ≥ 15,000
  { minSalary: 14750,  maxSalary: 15249.99, regularSSMSC: 15000, mpfMSC: 0, totalMSC: 15000, employeeRegularSS: 750,  employeeMPF: 0,   employeeTotal: 750,  employerRegularSS: 1500, employerEC: 30, employerMPF: 0,   employerTotal: 1530, grandTotal: 2280 },
  { minSalary: 15250,  maxSalary: 15749.99, regularSSMSC: 15500, mpfMSC: 0, totalMSC: 15500, employeeRegularSS: 775,  employeeMPF: 0,   employeeTotal: 775,  employerRegularSS: 1550, employerEC: 30, employerMPF: 0,   employerTotal: 1580, grandTotal: 2355 },
  { minSalary: 15750,  maxSalary: 16249.99, regularSSMSC: 16000, mpfMSC: 0, totalMSC: 16000, employeeRegularSS: 800,  employeeMPF: 0,   employeeTotal: 800,  employerRegularSS: 1600, employerEC: 30, employerMPF: 0,   employerTotal: 1630, grandTotal: 2430 },
  { minSalary: 16250,  maxSalary: 16749.99, regularSSMSC: 16500, mpfMSC: 0, totalMSC: 16500, employeeRegularSS: 825,  employeeMPF: 0,   employeeTotal: 825,  employerRegularSS: 1650, employerEC: 30, employerMPF: 0,   employerTotal: 1680, grandTotal: 2505 },
  { minSalary: 16750,  maxSalary: 17249.99, regularSSMSC: 17000, mpfMSC: 0, totalMSC: 17000, employeeRegularSS: 850,  employeeMPF: 0,   employeeTotal: 850,  employerRegularSS: 1700, employerEC: 30, employerMPF: 0,   employerTotal: 1730, grandTotal: 2580 },
  { minSalary: 17250,  maxSalary: 17749.99, regularSSMSC: 17500, mpfMSC: 0, totalMSC: 17500, employeeRegularSS: 875,  employeeMPF: 0,   employeeTotal: 875,  employerRegularSS: 1750, employerEC: 30, employerMPF: 0,   employerTotal: 1780, grandTotal: 2655 },
  { minSalary: 17750,  maxSalary: 18249.99, regularSSMSC: 18000, mpfMSC: 0, totalMSC: 18000, employeeRegularSS: 900,  employeeMPF: 0,   employeeTotal: 900,  employerRegularSS: 1800, employerEC: 30, employerMPF: 0,   employerTotal: 1830, grandTotal: 2730 },
  { minSalary: 18250,  maxSalary: 18749.99, regularSSMSC: 18500, mpfMSC: 0, totalMSC: 18500, employeeRegularSS: 925,  employeeMPF: 0,   employeeTotal: 925,  employerRegularSS: 1850, employerEC: 30, employerMPF: 0,   employerTotal: 1880, grandTotal: 2805 },
  { minSalary: 18750,  maxSalary: 19249.99, regularSSMSC: 19000, mpfMSC: 0, totalMSC: 19000, employeeRegularSS: 950,  employeeMPF: 0,   employeeTotal: 950,  employerRegularSS: 1900, employerEC: 30, employerMPF: 0,   employerTotal: 1930, grandTotal: 2880 },
  { minSalary: 19250,  maxSalary: 19749.99, regularSSMSC: 19500, mpfMSC: 0, totalMSC: 19500, employeeRegularSS: 975,  employeeMPF: 0,   employeeTotal: 975,  employerRegularSS: 1950, employerEC: 30, employerMPF: 0,   employerTotal: 1980, grandTotal: 2955 },
  { minSalary: 19750,  maxSalary: 20249.99, regularSSMSC: 20000, mpfMSC: 0, totalMSC: 20000, employeeRegularSS: 1000, employeeMPF: 0,   employeeTotal: 1000, employerRegularSS: 2000, employerEC: 30, employerMPF: 0,   employerTotal: 2030, grandTotal: 3030 },

  // ─── With MPF (salary ≥ 20,250) ─────────────────────────────────────────
  // Regular SS MSC is capped at 20,000. MPF MSC covers the excess up to 15,000.
  { minSalary: 20250,  maxSalary: 20749.99, regularSSMSC: 20000, mpfMSC: 500,  totalMSC: 20500, employeeRegularSS: 1000, employeeMPF: 25,  employeeTotal: 1025, employerRegularSS: 2000, employerEC: 30, employerMPF: 50,  employerTotal: 2080, grandTotal: 3105 },
  { minSalary: 20750,  maxSalary: 21249.99, regularSSMSC: 20000, mpfMSC: 1000, totalMSC: 21000, employeeRegularSS: 1000, employeeMPF: 50,  employeeTotal: 1050, employerRegularSS: 2000, employerEC: 30, employerMPF: 100, employerTotal: 2130, grandTotal: 3180 },
  { minSalary: 21250,  maxSalary: 21749.99, regularSSMSC: 20000, mpfMSC: 1500, totalMSC: 21500, employeeRegularSS: 1000, employeeMPF: 75,  employeeTotal: 1075, employerRegularSS: 2000, employerEC: 30, employerMPF: 150, employerTotal: 2180, grandTotal: 3255 },
  { minSalary: 21750,  maxSalary: 22249.99, regularSSMSC: 20000, mpfMSC: 2000, totalMSC: 22000, employeeRegularSS: 1000, employeeMPF: 100, employeeTotal: 1100, employerRegularSS: 2000, employerEC: 30, employerMPF: 200, employerTotal: 2230, grandTotal: 3330 },
  { minSalary: 22250,  maxSalary: 22749.99, regularSSMSC: 20000, mpfMSC: 2500, totalMSC: 22500, employeeRegularSS: 1000, employeeMPF: 125, employeeTotal: 1125, employerRegularSS: 2000, employerEC: 30, employerMPF: 250, employerTotal: 2280, grandTotal: 3405 },
  { minSalary: 22750,  maxSalary: 23249.99, regularSSMSC: 20000, mpfMSC: 3000, totalMSC: 23000, employeeRegularSS: 1000, employeeMPF: 150, employeeTotal: 1150, employerRegularSS: 2000, employerEC: 30, employerMPF: 300, employerTotal: 2330, grandTotal: 3480 },
  { minSalary: 23250,  maxSalary: 23749.99, regularSSMSC: 20000, mpfMSC: 3500, totalMSC: 23500, employeeRegularSS: 1000, employeeMPF: 175, employeeTotal: 1175, employerRegularSS: 2000, employerEC: 30, employerMPF: 350, employerTotal: 2380, grandTotal: 3555 },
  { minSalary: 23750,  maxSalary: 24249.99, regularSSMSC: 20000, mpfMSC: 4000, totalMSC: 24000, employeeRegularSS: 1000, employeeMPF: 200, employeeTotal: 1200, employerRegularSS: 2000, employerEC: 30, employerMPF: 400, employerTotal: 2430, grandTotal: 3630 },
  { minSalary: 24250,  maxSalary: 24749.99, regularSSMSC: 20000, mpfMSC: 4500, totalMSC: 24500, employeeRegularSS: 1000, employeeMPF: 225, employeeTotal: 1225, employerRegularSS: 2000, employerEC: 30, employerMPF: 450, employerTotal: 2480, grandTotal: 3705 },
  { minSalary: 24750,  maxSalary: 25249.99, regularSSMSC: 20000, mpfMSC: 5000, totalMSC: 25000, employeeRegularSS: 1000, employeeMPF: 250, employeeTotal: 1250, employerRegularSS: 2000, employerEC: 30, employerMPF: 500, employerTotal: 2530, grandTotal: 3780 },
  { minSalary: 25250,  maxSalary: 25749.99, regularSSMSC: 20000, mpfMSC: 5500, totalMSC: 25500, employeeRegularSS: 1000, employeeMPF: 275, employeeTotal: 1275, employerRegularSS: 2000, employerEC: 30, employerMPF: 550, employerTotal: 2580, grandTotal: 3855 },
  { minSalary: 25750,  maxSalary: 26249.99, regularSSMSC: 20000, mpfMSC: 6000, totalMSC: 26000, employeeRegularSS: 1000, employeeMPF: 300, employeeTotal: 1300, employerRegularSS: 2000, employerEC: 30, employerMPF: 600, employerTotal: 2630, grandTotal: 3930 },
  { minSalary: 26250,  maxSalary: 26749.99, regularSSMSC: 20000, mpfMSC: 6500, totalMSC: 26500, employeeRegularSS: 1000, employeeMPF: 325, employeeTotal: 1325, employerRegularSS: 2000, employerEC: 30, employerMPF: 650, employerTotal: 2680, grandTotal: 4005 },
  { minSalary: 26750,  maxSalary: 27249.99, regularSSMSC: 20000, mpfMSC: 7000, totalMSC: 27000, employeeRegularSS: 1000, employeeMPF: 350, employeeTotal: 1350, employerRegularSS: 2000, employerEC: 30, employerMPF: 700, employerTotal: 2730, grandTotal: 4080 },
  { minSalary: 27250,  maxSalary: 27749.99, regularSSMSC: 20000, mpfMSC: 7500, totalMSC: 27500, employeeRegularSS: 1000, employeeMPF: 375, employeeTotal: 1375, employerRegularSS: 2000, employerEC: 30, employerMPF: 750, employerTotal: 2780, grandTotal: 4155 },
  { minSalary: 27750,  maxSalary: 28249.99, regularSSMSC: 20000, mpfMSC: 8000, totalMSC: 28000, employeeRegularSS: 1000, employeeMPF: 400, employeeTotal: 1400, employerRegularSS: 2000, employerEC: 30, employerMPF: 800, employerTotal: 2830, grandTotal: 4230 },
  { minSalary: 28250,  maxSalary: 28749.99, regularSSMSC: 20000, mpfMSC: 8500, totalMSC: 28500, employeeRegularSS: 1000, employeeMPF: 425, employeeTotal: 1425, employerRegularSS: 2000, employerEC: 30, employerMPF: 850, employerTotal: 2880, grandTotal: 4305 },
  { minSalary: 28750,  maxSalary: 29249.99, regularSSMSC: 20000, mpfMSC: 9000, totalMSC: 29000, employeeRegularSS: 1000, employeeMPF: 450, employeeTotal: 1450, employerRegularSS: 2000, employerEC: 30, employerMPF: 900, employerTotal: 2930, grandTotal: 4380 },
  { minSalary: 29250,  maxSalary: 29749.99, regularSSMSC: 20000, mpfMSC: 9500, totalMSC: 29500, employeeRegularSS: 1000, employeeMPF: 475, employeeTotal: 1475, employerRegularSS: 2000, employerEC: 30, employerMPF: 950, employerTotal: 2980, grandTotal: 4455 },
  { minSalary: 29750,  maxSalary: 30249.99, regularSSMSC: 20000, mpfMSC: 10000, totalMSC: 30000, employeeRegularSS: 1000, employeeMPF: 500, employeeTotal: 1500, employerRegularSS: 2000, employerEC: 30, employerMPF: 1000, employerTotal: 3030, grandTotal: 4530 },
  { minSalary: 30250,  maxSalary: 30749.99, regularSSMSC: 20000, mpfMSC: 10500, totalMSC: 30500, employeeRegularSS: 1000, employeeMPF: 525, employeeTotal: 1525, employerRegularSS: 2000, employerEC: 30, employerMPF: 1050, employerTotal: 3080, grandTotal: 4605 },
  { minSalary: 30750,  maxSalary: 31249.99, regularSSMSC: 20000, mpfMSC: 11000, totalMSC: 31000, employeeRegularSS: 1000, employeeMPF: 550, employeeTotal: 1550, employerRegularSS: 2000, employerEC: 30, employerMPF: 1100, employerTotal: 3130, grandTotal: 4680 },
  { minSalary: 31250,  maxSalary: 31749.99, regularSSMSC: 20000, mpfMSC: 11500, totalMSC: 31500, employeeRegularSS: 1000, employeeMPF: 575, employeeTotal: 1575, employerRegularSS: 2000, employerEC: 30, employerMPF: 1150, employerTotal: 3180, grandTotal: 4755 },
  { minSalary: 31750,  maxSalary: 32249.99, regularSSMSC: 20000, mpfMSC: 12000, totalMSC: 32000, employeeRegularSS: 1000, employeeMPF: 600, employeeTotal: 1600, employerRegularSS: 2000, employerEC: 30, employerMPF: 1200, employerTotal: 3230, grandTotal: 4830 },
  { minSalary: 32250,  maxSalary: 32749.99, regularSSMSC: 20000, mpfMSC: 12500, totalMSC: 32500, employeeRegularSS: 1000, employeeMPF: 625, employeeTotal: 1625, employerRegularSS: 2000, employerEC: 30, employerMPF: 1250, employerTotal: 3280, grandTotal: 4905 },
  { minSalary: 32750,  maxSalary: 33249.99, regularSSMSC: 20000, mpfMSC: 13000, totalMSC: 33000, employeeRegularSS: 1000, employeeMPF: 650, employeeTotal: 1650, employerRegularSS: 2000, employerEC: 30, employerMPF: 1300, employerTotal: 3330, grandTotal: 4980 },
  { minSalary: 33250,  maxSalary: 33749.99, regularSSMSC: 20000, mpfMSC: 13500, totalMSC: 33500, employeeRegularSS: 1000, employeeMPF: 675, employeeTotal: 1675, employerRegularSS: 2000, employerEC: 30, employerMPF: 1350, employerTotal: 3380, grandTotal: 5055 },
  { minSalary: 33750,  maxSalary: 34249.99, regularSSMSC: 20000, mpfMSC: 14000, totalMSC: 34000, employeeRegularSS: 1000, employeeMPF: 700, employeeTotal: 1700, employerRegularSS: 2000, employerEC: 30, employerMPF: 1400, employerTotal: 3430, grandTotal: 5130 },
  { minSalary: 34250,  maxSalary: 34749.99, regularSSMSC: 20000, mpfMSC: 14500, totalMSC: 34500, employeeRegularSS: 1000, employeeMPF: 725, employeeTotal: 1725, employerRegularSS: 2000, employerEC: 30, employerMPF: 1450, employerTotal: 3480, grandTotal: 5205 },
  // Last row: 34,750 and Over — capped at max total MSC of 35,000 (MPF max = 15,000)
  { minSalary: 34750,  maxSalary: Infinity,  regularSSMSC: 20000, mpfMSC: 15000, totalMSC: 35000, employeeRegularSS: 1000, employeeMPF: 750, employeeTotal: 1750, employerRegularSS: 2000, employerEC: 30, employerMPF: 1500, employerTotal: 3530, grandTotal: 5280 },
];

/**
 * Look up the SSS contribution row for a given monthly salary.
 *
 * @param monthlySalary  The employee's gross monthly salary.
 * @returns The matching SSSRow from the 2024-006 table.
 *
 * @example
 * const row = lookupSSS(20500);
 * // row.employeeTotal === 1025 (₱1,000 Regular SS + ₱25 MPF)
 * // per cutoff: 1025 / 2 === 512.50
 */
export function lookupSSS(monthlySalary: number): SSSRow {
  const row = SSS_TABLE.find(
    (r) => monthlySalary >= r.minSalary && monthlySalary <= r.maxSalary
  );
  // Should always find a row; fallback to first row if somehow below minimum
  return row ?? SSS_TABLE[0];
}
