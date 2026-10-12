import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

// GET /api/renewals/periods
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const periods = await db
      .collection("renewal_periods")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Default seed if no periods exist
    if (periods.length === 0) {
      const defaultPeriod = {
        name: "Adventure 1 Renewal",
        slug: "adventure-1-renewal",
        targetProgram: "Adventure 2",
        previousProgram: "Adventure 1",
        promoCode: "A1RENEWAL2026",
        deadline: new Date("2026-10-16T13:00:00+08:00"),
        createdAt: new Date(),
        isDefault: true,
      };
      const res = await db.collection("renewal_periods").insertOne(defaultPeriod);
      return NextResponse.json({
        success: true,
        data: [{ ...defaultPeriod, _id: res.insertedId.toString() }],
      });
    }

    return NextResponse.json({
      success: true,
      data: periods.map((p) => ({
        ...p,
        _id: p._id.toString(),
      })),
    });
  } catch (error: any) {
    console.error("[renewal_periods GET]", error);
    return NextResponse.json({ error: error.message || "Failed to fetch renewal periods" }, { status: 500 });
  }
}

// POST /api/renewals/periods - Create new renewal period
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, targetProgram, previousProgram, promoCode, deadline } = body;

    if (!name) {
      return NextResponse.json({ error: "Period name is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const newPeriod = {
      name,
      slug,
      targetProgram: targetProgram || "",
      previousProgram: previousProgram || "",
      promoCode: promoCode || "A1RENEWAL2026",
      deadline: deadline ? new Date(deadline) : new Date("2026-10-16T13:00:00+08:00"),
      createdAt: new Date(),
      isDefault: false,
    };

    const res = await db.collection("renewal_periods").insertOne(newPeriod);

    // Reusability rule: If resetStatuses is true, resets all families' renewalStatus to "not_yet_submitted" for this new period
    if (body.resetStatuses) {
      await db.collection("renewal_families").updateMany(
        {},
        {
          $set: {
            renewalStatus: "not_yet_submitted",
            renewingTo: targetProgram || "Adventure 2",
            registrationId: null,
            lastRenewalPeriod: slug,
            updatedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...newPeriod, _id: res.insertedId.toString() },
    });
  } catch (error: any) {
    console.error("[renewal_periods POST]", error);
    return NextResponse.json({ error: error.message || "Failed to create renewal period" }, { status: 500 });
  }
}
