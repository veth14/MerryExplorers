import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAdventureCycleRegistrationQuery, getTargetRegistrationAdventureNumber, getRegistrationAdventureStartDate, getProgramAdventureSetting } from "@/lib/adventure-cycle";
import { findReturningFamilyMatch } from "@/lib/returning-family";

export const dynamic = "force-dynamic";

// GET /api/registrations/check-duplicate?email=...&firstName=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = (searchParams.get("email") || "").toLowerCase().trim();
    const firstName = (searchParams.get("firstName") || "").trim();
    const lastName = (searchParams.get("lastName") || "").trim();
    const dateOfBirth = (searchParams.get("dateOfBirth") || "").trim();
    const parentName = (searchParams.get("parentName") || "").trim();
    const parentPhone = (searchParams.get("parentPhone") || "").trim();
    const program = searchParams.get("program") || "curious-explorer";

    if (!firstName || (!email && !lastName && !parentPhone && !parentName)) {
      return NextResponse.json({ exists: false, isReturningFamily: false });
    }

    const { db } = await connectToDatabase();
    const settingsDoc = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
    const settings = settingsDoc?.programs || [];
    const programSetting = getProgramAdventureSetting(program, settings);
    const adventureNumber = programSetting ? getTargetRegistrationAdventureNumber(program, settings) : 2;
    const adventureStartDate = programSetting ? getRegistrationAdventureStartDate(program, settings) : null;
    const cycleQuery: Record<string, unknown>[] = getAdventureCycleRegistrationQuery(adventureNumber, adventureStartDate);

    // Escape regex special chars
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const firstWord = firstName.split(/\s+/)[0];

    // Check returning student / previous adventure record
    const returningMatch = await findReturningFamilyMatch(db, {
      childInfo: { firstName, lastName, dateOfBirth },
      parentInfo: { name: parentName, phone: parentPhone, email },
    });

    // 1. Check student_registrations for the current adventure cycle (duplicate prevention)
    let existingReg: any = null;
    if (email || (lastName && dateOfBirth)) {
      const childNameMatch: any = {
        "childInfo.firstName": { $regex: new RegExp(`^${escapeRegex(firstName)}$`, "i") },
        ...(lastName ? { "childInfo.lastName": { $regex: new RegExp(`^${escapeRegex(lastName)}$`, "i") } } : {}),
      };
      const childIdentityMatch: any = (lastName && dateOfBirth)
        ? {
            ...childNameMatch,
            "childInfo.dateOfBirth": dateOfBirth,
          }
        : {
          "parentInfo.email": { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") },
          "childInfo.firstName": { $regex: new RegExp(`^${escapeRegex(firstName)}$`, "i") },
        };

      existingReg = await db.collection("student_registrations").findOne({
        $and: [
          childIdentityMatch,
          { $or: cycleQuery },
        ],
        status: { $in: ["pending", "approved", "reserved", "expired"] },
      }, { sort: { submittedAt: -1 } });
    }

    if (existingReg) {
      return NextResponse.json({
        exists: true,
        registrationId: existingReg._id.toString(),
        childName: existingReg.childInfo?.firstName || firstName,
        program: existingReg.program,
        status: existingReg.status,
        submittedAt: existingReg.submittedAt || null,
        reservedUntil: existingReg.reservedUntil || null,
        promoCode: existingReg.promoCode || null,
        reservationExpired: existingReg.status === "expired" || Boolean(existingReg.reservedUntil && new Date(existingReg.reservedUntil).getTime() <= Date.now()),
        isReturningFamily: Boolean(returningMatch.isReturning || existingReg.isNewFamily === false || existingReg.isPioneer),
        matchedChildName: returningMatch.matchedChildName || existingReg.childInfo?.firstName || firstName,
        previousAdventureNumber: returningMatch.previousAdventureNumber || null,
        previousProgram: returningMatch.previousProgram || null,
      });
    }

    // 2. Check renewal_families for existing submitted/reserved/confirmed renewal
    if (email) {
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
          matchedChildName: familyMatch.childName || firstName,
          previousAdventureNumber: 1,
          previousProgram: familyMatch.previousProgram || null,
        });
      }
    }

    return NextResponse.json({
      exists: false,
      isReturningFamily: returningMatch.isReturning,
      matchedChildName: returningMatch.matchedChildName || null,
      previousAdventureNumber: returningMatch.previousAdventureNumber || null,
      previousProgram: returningMatch.previousProgram || null,
    });
  } catch (error: any) {
    console.error("[check-duplicate GET]", error);
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }
}
