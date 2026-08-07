import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { computeContributions } from "@/lib/contributions";

/**
 * /api/payroll-deductions
 *
 * Tracks per-employee, per-cutoff deduction records.
 *
 * Rules:
 *  - Deductions are NOT automatically carried over from missed cutoffs.
 *  - If a deduction was missed, it is flagged for payroll staff review.
 *  - Payroll staff must explicitly approve a carryover via PATCH.
 *  - The same missed deduction cannot be applied twice (idempotent by cutoffId).
 *
 * GET  ?employeeId=&cutoffStart=&cutoffEnd=   — fetch or auto-create a deduction record
 * GET  ?employeeId=&pending=true              — fetch all flagged/unreviewed records
 * PATCH /api/payroll-deductions/[id]          — adjust amounts, approve carryover
 */

export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const employeeId   = searchParams.get("employeeId");
    const cutoffStart  = searchParams.get("cutoffStart");
    const cutoffEnd    = searchParams.get("cutoffEnd");
    const pendingOnly  = searchParams.get("pending") === "true";

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // If fetching pending/flagged records across cutoffs
    if (pendingOnly) {
      const pending = await db.collection("payroll_deductions").find({
        employeeId,
        status: { $in: ["draft", "flagged"] },
      }).sort({ cutoffStartDate: -1 }).toArray();
      return NextResponse.json({ success: true, data: pending });
    }

    if (!cutoffStart || !cutoffEnd) {
      return NextResponse.json({ error: "cutoffStart and cutoffEnd are required" }, { status: 400 });
    }

    // Look for existing record for this cutoff
    let record = await db.collection("payroll_deductions").findOne({
      employeeId,
      cutoffStartDate: cutoffStart,
      cutoffEndDate: cutoffEnd,
    });

    if (!record) {
      // Auto-create by computing contributions from the employee's current monthly rate
      const account = await db.collection("accounts").findOne({ _id: employeeId as any });
      if (!account) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      const monthlySalary = account.monthlyRate ?? 0;
      const contributions = computeContributions(monthlySalary);

      const now = new Date();
      const newRecord = {
        employeeId,
        cutoffStartDate: cutoffStart,
        cutoffEndDate: cutoffEnd,
        monthlySalary,
        sss: {
          calculated: contributions.perCutoff.sss,
          applied: contributions.perCutoff.sss,
          adjustedBy: null,
          adjustedAt: null,
          reason: null,
          // Breakdown detail
          regularSSMSC: contributions.sss.regularSSMSC,
          mpfMSC: contributions.sss.mpfMSC,
          employeeRegularSS: contributions.sss.employeeRegularSS,
          employeeMPF: contributions.sss.employeeMPF,
        },
        philhealth: {
          calculated: contributions.perCutoff.philhealth,
          applied: contributions.perCutoff.philhealth,
          adjustedBy: null,
          adjustedAt: null,
          reason: null,
        },
        pagibig: {
          calculated: contributions.perCutoff.pagibig,
          applied: contributions.perCutoff.pagibig,
          adjustedBy: null,
          adjustedAt: null,
          reason: null,
        },
        // Employer amounts (accounting only — not deducted from employee)
        employer: {
          sss: contributions.employerPerCutoff.sss,
          philhealth: contributions.employerPerCutoff.philhealth,
          pagibig: contributions.employerPerCutoff.pagibig,
          total: contributions.employerPerCutoff.totalEmployerCost,
        },
        /**
         * missedFromPrevCutoff: amount flagged but NOT yet applied.
         * Payroll staff must review and explicitly approve via PATCH.
         * This prevents the same missed deduction from being applied twice.
         */
        missedFromPrevCutoff: 0,
        carriedOverApproved: false,
        carriedOverApprovedBy: null,
        carriedOverApprovedAt: null,
        totalEmployeeDeductions: contributions.perCutoff.totalEmployeeDeductions,
        status: "draft" as const,  // draft → reviewed → finalized
        createdAt: now,
        updatedAt: now,
      };

      const result = await db.collection("payroll_deductions").insertOne(newRecord);
      return NextResponse.json({ success: true, data: { ...newRecord, id: result.insertedId.toString() } });
    }

    return NextResponse.json({ success: true, data: { ...record, id: record._id.toString() } });
  } catch (error: any) {
    console.error("Failed to fetch/create payroll deduction:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
