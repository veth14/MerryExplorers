import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import {
  getBreakMinutes,
  BASE_SCHEDULE,
  type DayAbbr,
  computeLateDeduction,
  computeCreditedHours,
} from "@/lib/attendance-rules";
import { computeContributions } from "@/lib/contributions";

function eachDayInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // 1. Fetch Accounts (Teachers & Executives)
    const accounts = await db.collection("accounts").find({
      role: { $in: ["Lead Teacher", "Assistant Teacher", "Executive Assistant", "Executive Assistant"] }
    }).toArray();

    // 3. Determine the required attendance date range.
    // For normal employees, we only need [startDateStr, endDateStr].
    // But for weekly evaluations, we must evaluate full Sun-Sat weeks that END within the cutoff.
    // So we must fetch attendance starting from the Sunday of the earliest Saturday in the cutoff.
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const days = eachDayInRange(start, end);

    const queryStartDateStr = startDateStr;

    // 2. Fetch Attendance for the expanded period
    const attendanceRecords = await db.collection("attendance").find({
      dateStr: { $gte: queryStartDateStr, $lte: endDateStr }
    }).toArray();

    // Group attendance by teacherUid -> dateStr -> record
    const attendanceMap = new Map<string, Map<string, any>>();
    for (const rec of attendanceRecords) {
      const uid = rec.teacherUid;
      if (!attendanceMap.has(uid)) attendanceMap.set(uid, new Map());
      attendanceMap.get(uid)!.set(rec.dateStr, rec);
    }

    const records = [];
    let totalGross = 0;
    let totalNet = 0;

    for (const acc of accounts) {
      const uid = acc._id.toString();
      // Derive rate for late-deduction math from daily/monthly rate (no stored hourlyRate)
      // Assumes 8-hour workday and 22 working days per month.
      const monthlyRate = acc.monthlyRate ?? 0;
      const dailyRate = acc.dailyRate ?? 0;
      const rateForLate = monthlyRate > 0 ? monthlyRate / (22 * 8) : dailyRate / 8;
      const accountWorkDays = new Set(acc.workDays ?? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
      const empAttendance = attendanceMap.get(uid) || new Map();

      let totalHours = 0;
      let daysPresent = 0;
      let totalScheduledWorkDays = 0; // Work days in the cutoff for this employee
      let totalLateDeduction = 0;
      const noTimeLog: boolean = acc.noTimeLog ?? false;

      // Fetch daily exemptions for this employee so we can skip late deductions on exempt days
      const exemptDocs = await db.collection("daily_exemptions").find({ teacherUid: uid }).toArray();
      const exemptDates = new Set(exemptDocs.map((d: any) => d.dateStr));

      // Also fetch suspended days to exclude from scheduled work day count
      const suspendedDocs = await db.collection("suspended_days").find({}).toArray();
      const suspendedDateSet = new Set(suspendedDocs.map((d: any) => d.dateStr));

      for (const day of days) {
        const dow = day.getDay();
        const abbr = (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const)[dow];
        const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;

        const isWorkDay = accountWorkDays.has(abbr);
        const rec = empAttendance.get(dateStr);
        const isSuspended = suspendedDateSet.has(dateStr);

        // Count scheduled work days (excluding Sundays and suspended days)
        // A day with a flexible override counts as a scheduled work day even if the employee didn't clock in
        if (isWorkDay && !isSuspended) {
          totalScheduledWorkDays++;
        }

        if (isWorkDay && !isSuspended && rec && rec.clockInTime) {
          daysPresent++;

          // Late deduction — only if this day is NOT a flexible/exempt override AND they don't have a weekly target
          if (!acc.weeklyHoursTarget) {
            const isDayExempt = noTimeLog || exemptDates.has(dateStr);
            const lateResult = computeLateDeduction(rec.clockInTime, rateForLate, isDayExempt);
            totalLateDeduction += lateResult.deduction;
          }

          // Credited hours — tracked for reference and offset calculations
          if (rec.clockOutTime && abbr !== "Sun") {
            const schedule = BASE_SCHEDULE[abbr as Exclude<DayAbbr, "Sun">];
            const breakMins = getBreakMinutes(dow);
            totalHours += computeCreditedHours(
              rec.clockInTime,
              rec.clockOutTime,
              schedule.start,
              schedule.normalEnd,
              breakMins,
            );
          }
        }
      }

      // Basic pay — ALL employees are no-work-no-pay
      //
      // Monthly salary (e.g. Angel):
      //   Full cutoff pay = monthlyRate / 2
      //   Prorate by attendance: (daysPresent / totalScheduledWorkDays) * (monthlyRate / 2)
      //   If no scheduled work days in range (e.g. empty cutoff), basicPay = 0
      //
      // Daily rate (e.g. Kyle, Jasmin):
      //   basicPay = daysPresent * dailyRate
      //
      // hourlyRate is NEVER used for basic pay — only for late-deduction math.
      let basicPay: number;
      if (monthlyRate > 0) {
        if (totalScheduledWorkDays === 0) {
          basicPay = 0;
        } else {
          const fullCutoffPay = monthlyRate / 2;
          basicPay = parseFloat(((daysPresent / totalScheduledWorkDays) * fullCutoffPay).toFixed(2));
        }
      } else {
        basicPay = parseFloat((daysPresent * dailyRate).toFixed(2));
      }
      
      const comms = acc.communicationAllowance ?? 0;
      const perfectAttendance = 0;
      const birthdayGift = 0;
      // Late deduction is applied after basic pay is computed and before contributions
      const lateDeduction = parseFloat(totalLateDeduction.toFixed(2));
      const grossPay = basicPay + comms + perfectAttendance + birthdayGift - lateDeduction;

      // Use live contribution calculation (SSS table lookup, not stored flat values)
      const monthlySalary = acc.monthlyRate ?? 0;
      const contributions = computeContributions(monthlySalary);

      // Employee deductions only — these reduce net pay
      const empSSS       = contributions.perCutoff.sss;
      const empPhilHealth = contributions.perCutoff.philhealth;
      const empPagIbig   = contributions.perCutoff.pagibig;
      const totalEmployeeDeductions = contributions.perCutoff.totalEmployeeDeductions;
      const netPay = grossPay - totalEmployeeDeductions;

      // Employer share — NOT deducted from employee; tracked for accounting
      const erSSS        = contributions.employerPerCutoff.sss;
      const erPhilHealth = contributions.employerPerCutoff.philhealth;
      const erPagIbig    = contributions.employerPerCutoff.pagibig;
      const totalEmployerCost = contributions.employerPerCutoff.totalEmployerCost;

      totalGross += grossPay;
      totalNet += netPay;

      records.push({
        id: uid,
        name: acc.fullName,
        hours: parseFloat(totalHours.toFixed(2)),
        daysPresent,
        totalScheduledWorkDays,
        monthlyRate,
        dailyRate,
        basic: parseFloat(basicPay.toFixed(2)),
        comms,
        perfectAttendance,
        birthdayGift,
        gross: parseFloat(grossPay.toFixed(2)),
        lateDeduction,
        weeklyShortfallDeduction: 0,
        // Employee deductions (payslip + net pay)
        sss: empSSS,
        philhealth: empPhilHealth,
        pagibig: empPagIbig,
        totalDeductions: totalEmployeeDeductions,
        net: parseFloat(netPay.toFixed(2)),
        // Employer share (accounting/internal only — NOT employee deductions)
        employer: {
          sss: erSSS,
          philhealth: erPhilHealth,
          pagibig: erPagIbig,
          total: totalEmployerCost,
          sssDetail: {
            regularSS: contributions.sss.employerRegularSS,
            mpf: contributions.sss.employerMPF,
            ec: contributions.sss.employerEC,
          },
        },
        // SSS bracket detail (for transparency)
        sssDetail: {
          regularSSMSC: contributions.sss.regularSSMSC,
          mpfMSC: contributions.sss.mpfMSC,
          employeeRegularSS: contributions.sss.employeeRegularSS,
          employeeMPF: contributions.sss.employeeMPF,
        },
      });
    }

    // Sort by name
    records.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      totalGross: parseFloat(totalGross.toFixed(2)),
      totalNet: parseFloat(totalNet.toFixed(2)),
      records
    }, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" }
    });

  } catch (error: any) {
    console.error("Failed to generate payroll summary:", error);
    return NextResponse.json({ error: error.message || "Failed to generate" }, { status: 500 });
  }
}
