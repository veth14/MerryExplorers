import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PROGRAM_SLOTS } from "@/data/landing";
import { getAdventureCycleRegistrationQuery, getTargetRegistrationAdventureNumber, getRegistrationAdventureStartDate, getProgramAdventureSetting } from "@/lib/adventure-cycle";
import { activeRegistrationSlotQuery, countUniqueActiveRegistrationSlots } from "@/lib/registration-slots";

export const dynamic = "force-dynamic";

// GET /api/registrations/slots — Public, shows slot availability per program/class
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const settingsDoc = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
    const settings = settingsDoc?.programs || [];
    const now = new Date();

    const result: Record<string, Record<string, { maxSlots: number; taken: number; available: number; closed?: boolean }>> = {};

    for (const [programId, config] of Object.entries(PROGRAM_SLOTS)) {
      result[programId] = {};
      for (const cls of config.classes) {
        const adventureSetting = getProgramAdventureSetting(programId, settings);
        const adventureNumber = adventureSetting ? getTargetRegistrationAdventureNumber(programId, settings, now) : null;
        const adventureStartDate = adventureSetting ? getRegistrationAdventureStartDate(programId, settings, now) : null;
        const cycleQuery = adventureNumber === null
          ? []
          : getAdventureCycleRegistrationQuery(adventureNumber, adventureStartDate);
        // Keep public availability aligned with admin tracking and submission validation.
        const taken = await countUniqueActiveRegistrationSlots(
          db.collection("student_registrations"),
          activeRegistrationSlotQuery({ program: programId, classTime: cls.name, cycleQuery, now })
        );

        const isClassClosed = Array.isArray((adventureSetting as any)?.closedClasses) && (adventureSetting as any).closedClasses.includes(cls.name);
        result[programId][cls.name] = {
          maxSlots: cls.maxSlots,
          taken,
          available: isClassClosed ? 0 : Math.max(0, cls.maxSlots - taken),
          closed: isClassClosed,
        };
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[slots GET]", error);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}
