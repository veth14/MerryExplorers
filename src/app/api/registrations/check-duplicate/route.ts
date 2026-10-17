import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAdventureCycleRegistrationQuery, getCurrentAdventureNumber, getCurrentAdventureStartDate, getProgramAdventureSetting } from "@/lib/adventure-cycle";
import { isReturningFamilyRecord } from "@/lib/returning-family";

export const dynamic = "force-dynamic";

// GET /api/registrations/check-duplicate?email=...&firstName=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = (searchParams.get("email") || "").toLowerCase().trim();
    const firstName = (searchParams.get("firstName") || "").trim();
    const lastName = (searchParams.get("lastName") || "").trim();
    const parentName = (searchParams.get("parentName") || "").trim();
    const parentPhone = (searchParams.get("parentPhone") || "").trim();
    const program = searchParams.get("program") || "curious-explorer";

    if (!email || !firstName) {
      return NextResponse.json({ exists: false });
    }

    const { db } = await connectToDatabase();
    const settingsDoc = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
    const settings = settingsDoc?.programs || [];
    const programSetting = getProgramAdventureSetting(program, settings);
    const adventureNumber = programSetting ? getCurrentAdventureNumber(program, settings) : 2;
    const adventureStartDate = programSetting ? getCurrentAdventureStartDate(program, settings) : null;
    const cycleQuery: Record<string, unknown>[] = getAdventureCycleRegistrationQuery(adventureNumber, adventureStartDate);

    // Escape regex special chars
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const firstWord = firstName.split(/\s+/)[0];
    const isReturning = await isReturningFamilyRecord(db, {
      childInfo: { firstName, lastName },
      parentInfo: { name: parentName, phone: parentPhone },
    });

    // 1. Check student_registrations for the current adventure cycle
    const regQuery: any = {
      "parentInfo.email": { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") },
      $and: [
        { $or: [
          { "childInfo.firstName": { $regex: new RegExp(`^${escapeRegex(firstName)}$`, "i") } },
          { "childInfo.firstName": { $regex: new RegExp(`^${escapeRegex(firstWord)}`, "i") } },
        ] },
        { $or: cycleQuery },
      ],
      status: { $in: ["pending", "approved", "reserved"] },
    };

    const existingReg = await db.collection("student_registrations").findOne(regQuery);

    if (existingReg) {
      return NextResponse.json({
        exists: true,
        registrationId: existingReg._id.toString(),
        childName: existingReg.childInfo?.firstName || firstName,
        program: existingReg.program,
        status: existingReg.status,
        isReturningFamily: Boolean(isReturning || existingReg.isNewFamily === false || existingReg.isPioneer),
      });
    }

    // 2. Check renewal_families for existing submitted/reserved/confirmed renewal
    const familyMatch = await db.collection("renewal_families").findOne({
      parentEmail: { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") },
      childName: { $regex: new RegExp(`^${escapeRegex(firstWord)}`, "i") },
      renewalStatus: { $in: ["submitted", "reserved", "confirmed", "paid"] },
    });

    if (familyMatch?.registrationId) {
      return NextResponse.json({
        exists: true,
        registrationId: familyMatch.registrationId,
        childName: familyMatch.childName || firstName,
        status: familyMatch.renewalStatus,
        isReturningFamily: true,
      });
    }

    return NextResponse.json({ exists: false, isReturningFamily: isReturning });
  } catch (error: any) {
    console.error("[check-duplicate GET]", error);
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }
}
