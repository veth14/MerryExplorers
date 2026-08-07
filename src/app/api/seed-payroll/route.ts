import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * GET /api/seed-payroll
 * One-time route to inject payroll rates for teachers that don't have them set yet.
 * Only updates documents where the payroll fields are missing (0 or undefined).
 * Safe to run multiple times.
 */
export async function GET() {
  try {
    const { db } = await connectToDatabase();

    const payrollData = [
      {
        fullName: "Angel Villegas",
        monthlyRate: 20500,
        dailyRate: 942.53,
        hourlyRate: 117.82,
      },
      {
        fullName: "Ann Kyle Ebuenga",
        monthlyRate: 15290,
        dailyRate: 695.00,
        hourlyRate: 86.88,
      },
    ];

    const results = [];

    for (const teacher of payrollData) {
      const result = await db.collection("accounts").updateMany(
        {
          fullName: teacher.fullName,
          // Only update if not already set
          $or: [
            { monthlyRate: { $exists: false } },
            { monthlyRate: 0 },
            { monthlyRate: null },
          ],
        },
        {
          $set: {
            monthlyRate: teacher.monthlyRate,
            dailyRate: teacher.dailyRate,
            hourlyRate: teacher.hourlyRate,
          },
        }
      );
      results.push({
        name: teacher.fullName,
        matched: result.matchedCount,
        updated: result.modifiedCount,
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Seed payroll failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
