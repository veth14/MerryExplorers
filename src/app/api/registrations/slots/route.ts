import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PROGRAM_SLOTS } from "@/data/landing";

export const dynamic = "force-dynamic";

// GET /api/registrations/slots — Public, shows slot availability per program/class
export async function GET() {
  try {
    const { db } = await connectToDatabase();

    // Only count registrations from Adventure 2 onward
    const ADVENTURE_2_START = new Date("2026-10-12T00:00:00+08:00");

    const result: Record<string, Record<string, { maxSlots: number; taken: number; available: number }>> = {};

    for (const [programId, config] of Object.entries(PROGRAM_SLOTS)) {
      result[programId] = {};
      for (const cls of config.classes) {
        const taken = await db.collection("student_registrations").countDocuments({
          program: programId,
          classTime: cls.name,
          status: { $in: ["pending", "approved", "reserved"] },
          submittedAt: { $gte: ADVENTURE_2_START },
        });
        result[programId][cls.name] = {
          maxSlots: cls.maxSlots,
          taken,
          available: Math.max(0, cls.maxSlots - taken),
        };
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[slots GET]", error);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}
