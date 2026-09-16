import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// GET /api/registrations/slots — Public, shows slot availability per program/class
export async function GET() {
  try {
    const { db } = await connectToDatabase();

    const programConfig = {
      "curious-explorer": {
        classes: [
          { name: "Morning Class", maxSlots: 4 },
          { name: "Afternoon Class", maxSlots: 4 },
        ],
      },
      "creative-explorer": {
        classes: [
          { name: "Morning Class", maxSlots: 6 },
          { name: "Mid-Day Class", maxSlots: 6 },
          { name: "Afternoon Class", maxSlots: 6 },
        ],
      },
      "brave-explorer": {
        classes: [
          { name: "Afternoon Class", maxSlots: 6 },
        ],
      },
    };

    const result: Record<string, Record<string, { maxSlots: number; taken: number; available: number }>> = {};

    for (const [programId, config] of Object.entries(programConfig)) {
      result[programId] = {};
      for (const cls of config.classes) {
        const taken = await db.collection("student_registrations").countDocuments({
          program: programId,
          classTime: cls.name,
          status: { $in: ["pending", "approved"] },
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
