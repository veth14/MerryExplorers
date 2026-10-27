import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// GET /api/renewals/periods
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { db } = await connectToDatabase();
    const periods = await db
      .collection("renewal_periods")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: periods.map((p) => {
        const targetAdventureFromName = Number((String(p.targetProgram || "").match(/adventure\s*(\d+)/i) || [])[1]);
        const legacyPreviousAdventure = Number((String(p.slug || "").match(/^adventure-(\d+)-renewal$/i) || [])[1]);
        const targetAdventure = Number(p.targetAdventure) || targetAdventureFromName || (legacyPreviousAdventure ? legacyPreviousAdventure + 1 : null);
        return {
          ...p,
          targetAdventure,
          _id: p._id.toString(),
        };
      }),
    });
  } catch (error: any) {
    console.error("[renewal_periods GET]", error);
    return NextResponse.json({ error: error.message || "Failed to fetch renewal periods" }, { status: 500 });
  }
}

// POST /api/renewals/periods - Create new renewal period
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const { name, targetProgram, previousProgram } = body;

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Period name is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const cleanName = name.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!slug) {
      return NextResponse.json({ error: "Period name must contain letters or numbers." }, { status: 400 });
    }
    const targetAdventure = Number(body.targetAdventure) ||
      Number((String(targetProgram || "").match(/adventure\s*(\d+)/i) || [])[1]);
    if (!Number.isInteger(targetAdventure) || targetAdventure < 1) {
      return NextResponse.json({ error: "Choose a valid target adventure number." }, { status: 400 });
    }

    const existingPeriod = await db.collection("renewal_periods").findOne({ slug });
    if (existingPeriod) {
      return NextResponse.json({ error: "A renewal period with this name already exists." }, { status: 409 });
    }

    await db.collection("renewal_periods").updateMany({ isActive: true }, { $set: { isActive: false } });

    const newPeriod = {
      name: cleanName,
      slug,
      targetProgram: targetProgram || `Adventure ${targetAdventure}`,
      targetAdventure,
      previousProgram: previousProgram || "",
      createdAt: new Date(),
      isDefault: false,
      isActive: true,
    };

    const res = await db.collection("renewal_periods").insertOne(newPeriod);

    return NextResponse.json({
      success: true,
      data: { ...newPeriod, _id: res.insertedId.toString() },
    });
  } catch (error: any) {
    console.error("[renewal_periods POST]", error);
    return NextResponse.json({ error: error.message || "Failed to create renewal period" }, { status: 500 });
  }
}
