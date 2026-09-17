import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Optional: Add authorization if needed, e.g. a secret token header
  // to ensure only a cron service like Vercel Cron can hit this endpoint.

  try {
    const { db } = await connectToDatabase();

    // Find all registrations that are "reserved" and whose reservedUntil is past the current time
    const result = await db.collection("student_registrations").updateMany(
      {
        status: "reserved",
        reservedUntil: { $lt: new Date() }
      },
      {
        $set: {
          status: "expired"
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: `Released ${result.modifiedCount} expired slot reservations.`
    });
  } catch (error: any) {
    console.error("[cron release-slots] Error:", error);
    return NextResponse.json({ error: "Failed to release slots" }, { status: 500 });
  }
}
