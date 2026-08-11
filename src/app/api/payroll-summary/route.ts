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
      role: { $in: ["Lead Teacher", "Assistant Teacher", "Executive Partner", "Executive Assistant"] }
    }).toArray();

    // 2. Fetch Attendance for the period
    const attendanceRecords = await db.collection("attendance").find({
      dateStr: { $gte: startDateStr, $lte: endDateStr }
    }).toArray();

    // Group attendance by teacherUid -> dateStr -> record
    const attendanceMap = new Map<string, Map<string, any>>();
    for (const rec of attendanceRecords) {
      const uid = rec.teacherUid;
      if (!attendanceMap.has(uid)) attendanceMap.set(uid, new Map());
      attendanceMap.get(uid)!.set(rec.dateStr, rec);
    }

    // 3. Process each account to compute payroll
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const days = eachDayInRange(start, end);

    const records = [];
    let totalGross = 0;
    let totalNet = 0;

    for (const acc of accounts) {
      const uid = acc._id.toString();
      const hourlyRate = acc.hourlyRate ?? 0;
      const accountWorkDays = new Set(acc.workDays ?? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
      const empAttendance = attendanceMap.get(uid) || new Map();

      let totalHours = 0;
      let daysPresent = 0;
      let totalLateDeduction = 0;
      const noTimeLog: boolean = acc.noTimeLog ?? false;
      const dailyRate = acc.dailyRate ?? 0;

      for (const day of days) {
        const dow = day.getDay();
        const abbr = (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const)[dow];
        const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;

        const isWorkDay = accountWorkDays.has(abbr);
        const rec = empAttendance.get(dateStr);

        if (isWorkDay && rec && rec.clockInTime) {
          daysPresent++;
          // Late deduction — separate from credited hours, independent of graceUntil/status
          const lateResult = computeLateDeduction(rec.clockInTime, hourlyRate, noTimeLog);
          totalLateDeduction += lateResult.deduction;

          // Regular credited hours — clamped to scheduled window (ONLY regular hours)
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

      let basicPay = totalHours * hourlyRate;
      if (hourlyRate === 0 && dailyRate > 0) {
        basicPay = daysPresent * dailyRate;
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
        rate: hourlyRate,
        dailyRate,
        basic: parseFloat(basicPay.toFixed(2)),
        comms,
        perfectAttendance,
        birthdayGift,
        gross: parseFloat(grossPay.toFixed(2)),
        lateDeduction,
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
