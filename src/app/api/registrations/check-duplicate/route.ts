import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

const ADVENTURE_2_START = new Date("2026-10-12T00:00:00+08:00");

// GET /api/registrations/check-duplicate?email=...&firstName=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = (searchParams.get("email") || "").toLowerCase().trim();
    const firstName = (searchParams.get("firstName") || "").trim();

    if (!email || !firstName) {
      return NextResponse.json({ exists: false });
    }

    const { db } = await connectToDatabase();

    // Escape regex special chars
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const firstWord = firstName.split(/\s+/)[0];

    // 1. Check student_registrations for Adventure 2
    const regQuery: any = {
      "parentInfo.email": { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") },
      $or: [
        { "childInfo.firstName": { $regex: new RegExp(`^${escapeRegex(firstName)}$`, "i") } },
        { "childInfo.firstName": { $regex: new RegExp(`^${escapeRegex(firstWord)}`, "i") } },
      ],
      status: { $in: ["pending", "approved", "reserved"] },
      $and: [
        {
          $or: [
            { period: "adventure-2" },
            { submittedAt: { $gte: ADVENTURE_2_START } },
          ],
        },
      ],
    };

    const existingReg = await db.collection("student_registrations").findOne(regQuery);

    if (existingReg) {
      return NextResponse.json({
        exists: true,
        registrationId: existingReg._id.toString(),
        childName: existingReg.childInfo?.firstName || firstName,
        program: existingReg.program,
        status: existingReg.status,
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
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error: any) {
    console.error("[check-duplicate GET]", error);
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }
}
