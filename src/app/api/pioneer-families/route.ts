import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

const PIONEER_SETTINGS_KEY = "pioneer_settings_v1";

// GET - returns all pioneer families + per-program pioneer prices
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const [families, settings] = await Promise.all([
      db.collection("pioneer_families").find({}).sort({ createdAt: -1 }).toArray(),
      db.collection("settings").findOne({ _key: PIONEER_SETTINGS_KEY }),
    ]);
    return NextResponse.json({
      families: families.map((f) => ({ ...f, id: f._id.toString() })),
      // Support both old single price and new per-program prices
      pioneerPrice: settings?.pioneerPrice ?? null,
      pioneerPrices: settings?.pioneerPrices ?? {},
      updatedAt: settings?.updatedAt ?? null,
    });
  } catch (err) {
    console.error("[pioneer-families GET]", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

// POST - add/update a pioneer family OR set pioneer prices
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { db } = await connectToDatabase();

    // Per-program prices object: { "curious-explorer": 4295, "creative-explorer": 4820 }
    if ("pioneerPrices" in body) {
      const prices = body.pioneerPrices as Record<string, number>;
      for (const v of Object.values(prices)) {
        if (typeof v !== "number" || v <= 0) return NextResponse.json({ error: "Invalid price value" }, { status: 400 });
      }
      const setDoc = { _key: PIONEER_SETTINGS_KEY, pioneerPrices: prices, updatedAt: new Date().toISOString() };
      await db.collection("settings").updateOne(
        { _key: PIONEER_SETTINGS_KEY },
        { $set: setDoc },
        { upsert: true }
      );
      return NextResponse.json({ ok: true, pioneerPrices: prices });
    }

    // Legacy single price support
    if ("pioneerPrice" in body) {
      const price = Number(body.pioneerPrice);
      if (isNaN(price) || price <= 0) return NextResponse.json({ error: "Invalid price" }, { status: 400 });
      const setDoc = { _key: PIONEER_SETTINGS_KEY, pioneerPrice: price, updatedAt: new Date().toISOString() };
      await db.collection("settings").updateOne(
        { _key: PIONEER_SETTINGS_KEY },
        { $set: setDoc },
        { upsert: true }
      );
      return NextResponse.json({ ok: true, pioneerPrice: price });
    }

    // Add or update a pioneer family
    const { parentName, childName, email, email2, id } = body;
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
    const primaryEmail = String(email).trim().toLowerCase();
    const secondaryEmail = String(email2 || "").trim().toLowerCase();
    if (secondaryEmail && secondaryEmail === primaryEmail) return NextResponse.json({ error: "Enter two different email addresses" }, { status: 400 });
    const doc = {
      parentName: (parentName || "").trim(),
      childName: (childName || "").trim(),
      email: primaryEmail,
      email2: secondaryEmail || "",
      updatedAt: new Date().toISOString(),
    };

    if (id && ObjectId.isValid(id)) {
      await db.collection("pioneer_families").updateOne({ _id: new ObjectId(id) }, { $set: doc });
      await db.collection("renewal_families").updateMany(
        { parentEmail: { $regex: new RegExp(`^${doc.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
        { $set: { isPioneer: true } }
      );
      return NextResponse.json({ ok: true, id });
    }
    const result = await db.collection("pioneer_families").insertOne({ ...doc, createdAt: new Date().toISOString() });
    await db.collection("renewal_families").updateMany(
      { parentEmail: { $regex: new RegExp(`^${doc.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
      { $set: { isPioneer: true } }
    );
    return NextResponse.json({ ok: true, id: result.insertedId.toString() });
  } catch (err) {
    console.error("[pioneer-families POST]", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

// DELETE - remove a pioneer family by id
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    const { db } = await connectToDatabase();
    const existing = await db.collection("pioneer_families").findOne({ _id: new ObjectId(id) });
    await db.collection("pioneer_families").deleteOne({ _id: new ObjectId(id) });
    if (existing?.email) {
      await db.collection("renewal_families").updateMany(
        { parentEmail: { $regex: new RegExp(`^${existing.email.toLowerCase().trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
        { $set: { isPioneer: false } }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[pioneer-families DELETE]", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
