import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

function isUntaggedAdventure(registration: { adventureNumber?: unknown; period?: unknown }) {
  const adventureNumber = Number(registration.adventureNumber);
  if (Number.isInteger(adventureNumber) && adventureNumber > 0) return false;
  return !String(registration.period || "").match(/adventure\s*[-_ ]?\s*\d+/i);
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const rawIds = Array.isArray(body?.ids) ? body.ids : [];
    const validIds = rawIds.filter((id: unknown): id is string => typeof id === "string" && ObjectId.isValid(id));
    const ids: string[] = Array.from(new Set<string>(validIds));

    if (ids.length === 0 || ids.length > 100 || ids.length !== rawIds.length) {
      return NextResponse.json({ error: "Provide between 1 and 100 valid registration IDs." }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const registrations = db.collection("student_registrations");
    const objectIds = ids.map((id) => new ObjectId(id));
    const records = await registrations
      .find<{ _id: ObjectId; adventureNumber?: unknown; period?: unknown }>(
        { _id: { $in: objectIds } },
        { projection: { adventureNumber: 1, period: 1 } }
      )
      .toArray();

    if (records.length !== ids.length || records.some((record) => !isUntaggedAdventure(record))) {
      return NextResponse.json({ error: "The selected registrations changed or are no longer untagged. Refresh and try again." }, { status: 409 });
    }

    const updatedAt = new Date();
    await registrations.updateMany(
      { _id: { $in: objectIds } },
      { $set: { adventureNumber: 1, period: "adventure-1", updatedAt } }
    );
    await db.collection("students").updateMany(
      { registrationId: { $in: ids } },
      { $set: { adventureNumber: 1, period: "adventure-1", updatedAt } }
    );

    return NextResponse.json({ success: true, updatedCount: ids.length });
  } catch (error) {
    console.error("[registrations tag-adventure POST]", error);
    return NextResponse.json({ error: "Failed to tag the selected registrations." }, { status: 500 });
  }
}
