import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PROGRAM_SLOTS } from "@/data/landing";
import { getAdventureCycleRegistrationQuery, getCurrentAdventureNumber, getCurrentAdventureStartDate, getProgramAdventureSetting } from "@/lib/adventure-cycle";

export const dynamic = "force-dynamic";

// Testing accounts — excluded from all slot counts
const TESTING_EMAILS = ["iangelovalmores@gmail.com", "ian.valmores@gmail.com"];

// GET /api/registrations/slots — Public, shows slot availability per program/class
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const settingsDoc = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
    const settings = settingsDoc?.programs || [];
    const now = new Date();

    const result: Record<string, Record<string, { maxSlots: number; taken: number; available: number }>> = {};

    for (const [programId, config] of Object.entries(PROGRAM_SLOTS)) {
      result[programId] = {};
      for (const cls of config.classes) {
        // Normalise "Session" ↔ "Class" aliases stored in the DB
        const altName = cls.name.includes("Session")
          ? cls.name.replace("Session", "Class")
          : cls.name.replace("Class", "Session");

        const adventureSetting = getProgramAdventureSetting(programId, settings);
        const adventureNumber = adventureSetting ? getCurrentAdventureNumber(programId, settings) : null;
        const adventureStartDate = adventureSetting ? getCurrentAdventureStartDate(programId, settings) : null;
        const cycleQuery = adventureNumber === null
          ? []
          : getAdventureCycleRegistrationQuery(adventureNumber, adventureStartDate);
        const taken = await db.collection("student_registrations").countDocuments({
          program: programId,
          classTime: { $in: [cls.name, altName] },
          status: { $in: ["pending", "approved", "reserved"] },
          // Exclude testing accounts
          "parentInfo.email": { $nin: TESTING_EMAILS },
          // Exclude "reserved" slots whose hold window has already lapsed.
          // The UI marks them "⏰ Expired Slot" via isRegExpired() but the DB
          // status field may still read "reserved" until admin explicitly releases.
          $and: [
            ...(cycleQuery.length ? [{ $or: cycleQuery }] : []),
            { $or: [
            { status: { $in: ["pending", "approved"] } }, // non-reserved always counts
            { reservedUntil: { $exists: false } },         // no expiry set → count
            { reservedUntil: null },                       // explicit null → count
            { reservedUntil: { $gte: now } },              // deadline still in future → count
            ] },
          ],
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
