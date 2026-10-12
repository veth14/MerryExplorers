import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

// GET /api/renewals/families
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const { db } = await connectToDatabase();

    const query: Record<string, any> = {};
    if (status && status !== "all") {
      query.renewalStatus = status;
    }
    // General families contact list is persistent across renewal cycles
    // (A family is a master contact record, not locked to only one period)
    if (period && period !== "all" && period !== "all-periods") {
      query.$or = [
        { renewalPeriod: period },
        { lastRenewalPeriod: period },
        { renewalPeriod: { $exists: false } },
        { renewalPeriod: null },
        { _id: { $exists: true } }, // Keep families available across cycles
      ];
    }
    if (search) {
      const reg = new RegExp(search.trim(), "i");
      query.$or = [
        { parentName: reg },
        { parentEmail: reg },
        { childName: reg },
        { phone: reg },
        { notes: reg },
      ];
    }

    // Exclude testing accounts from families list
    const TESTING_EMAILS = ["iangelovalmores@gmail.com", "ian.valmores@gmail.com"];
    const TESTING_NAMES = ["ian angelo valmores"];

    const allFamilies = await db
      .collection("renewal_families")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const families = allFamilies.filter((f) => {
      const emailLower = (f.parentEmail || "").toLowerCase().trim();
      const nameLower = (f.parentName || "").toLowerCase().trim();
      return (
        !TESTING_EMAILS.includes(emailLower) &&
        !TESTING_NAMES.some((n) => nameLower.includes(n))
      );
    });

    return NextResponse.json({
      success: true,
      data: families.map((f) => ({
        ...f,
        _id: f._id.toString(),
      })),
    });
  } catch (error: any) {
    console.error("[renewal_families GET]", error);
    return NextResponse.json({ error: error.message || "Failed to fetch families" }, { status: 500 });
  }
}

// POST /api/renewals/families - Create single or bulk import
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db } = await connectToDatabase();

    // Case 1: Bulk import array
    if (Array.isArray(body.families)) {
      const inputList = body.families;
      const results = {
        inserted: 0,
        duplicates: [] as string[],
        errors: [] as string[],
      };

      for (const item of inputList) {
        const parentEmail = (item.parentEmail || "").trim().toLowerCase();
        const childName = (item.childName || "").trim();
        const parentName = (item.parentName || "").trim();
        const phone = (item.phone || item.phoneNumber || "").trim();
        const previousProgram = (item.previousProgram || "Adventure 1").trim();
        const renewingTo = (item.renewingTo || "Adventure 2").trim();
        const notes = (item.notes || "").trim();

        if (!parentEmail || !childName) {
          results.errors.push(`Missing email or child name for entry: ${parentName || "Unknown"}`);
          continue;
        }

        // Email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
          results.errors.push(`Invalid email format: ${parentEmail}`);
          continue;
        }

        // Duplicate check: same email + same child name
        const existing = await db.collection("renewal_families").findOne({
          parentEmail: parentEmail,
          childName: { $regex: new RegExp(`^${childName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        });

        if (existing) {
          results.duplicates.push(`${parentEmail} (${childName})`);
          continue;
        }

        await db.collection("renewal_families").insertOne({
          parentName,
          parentEmail,
          phone,
          childName,
          previousProgram,
          renewingTo,
          renewalStatus: item.renewalStatus || "not_yet_submitted", // not_yet_submitted, reserved, confirmed, released
          lastEmailSent: null,
          lastEmailDate: null,
          emailHistory: [],
          notes,
          renewalPeriod: item.renewalPeriod || "adventure-1-renewal",
          registrationId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        results.inserted++;
      }

      return NextResponse.json({ success: true, data: results });
    }

    // Case 2: Single family entry
    const {
      parentName,
      parentEmail,
      phone,
      childName,
      previousProgram,
      renewingTo,
      renewalStatus,
      notes,
      renewalPeriod,
    } = body;

    const cleanEmail = (parentEmail || "").trim().toLowerCase();
    const cleanChild = (childName || "").trim();

    if (!cleanEmail || !cleanChild) {
      return NextResponse.json({ error: "Parent email and child's name are required." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // Duplicate check
    const existing = await db.collection("renewal_families").findOne({
      parentEmail: cleanEmail,
      childName: { $regex: new RegExp(`^${cleanChild.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A record for ${cleanEmail} with child ${cleanChild} already exists.` },
        { status: 409 }
      );
    }

    const newFamily = {
      parentName: (parentName || "").trim(),
      parentEmail: cleanEmail,
      phone: (phone || "").trim(),
      childName: cleanChild,
      previousProgram: (previousProgram || "Adventure 1").trim(),
      renewingTo: (renewingTo || "Adventure 2").trim(),
      renewalStatus: renewalStatus || "not_yet_submitted",
      lastEmailSent: null,
      lastEmailDate: null,
      emailHistory: [],
      notes: (notes || "").trim(),
      renewalPeriod: renewalPeriod || "adventure-1-renewal",
      registrationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await db.collection("renewal_families").insertOne(newFamily);

    return NextResponse.json({
      success: true,
      data: { ...newFamily, _id: res.insertedId.toString() },
    });
  } catch (error: any) {
    console.error("[renewal_families POST]", error);
    return NextResponse.json({ error: error.message || "Failed to add family" }, { status: 500 });
  }
}
