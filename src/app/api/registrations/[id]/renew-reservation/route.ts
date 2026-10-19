import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { PROGRAM_SLOTS } from "@/data/landing";
import { getAdventureCycleRegistrationQuery, getTargetRegistrationAdventureNumber, getRegistrationAdventureStartDate, getProgramAdventureSetting } from "@/lib/adventure-cycle";
import { connectToDatabase } from "@/lib/mongodb";
import { activeRegistrationSlotQuery, countUniqueActiveRegistrationSlots } from "@/lib/registration-slots";

export const dynamic = "force-dynamic";

const HOLD_DURATION_MS = 60 * 60 * 1000;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const registrations = db.collection("student_registrations");
    const registrationId = new ObjectId(id);
    const registration = await registrations.findOne({ _id: registrationId });
    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const now = new Date();
    const expiredReserved = registration.status === "reserved" &&
      (!registration.reservedUntil || new Date(registration.reservedUntil).getTime() <= now.getTime());
    if (registration.status !== "expired" && !expiredReserved) {
      return NextResponse.json({ error: "This reservation does not need to be renewed." }, { status: 409 });
    }

    const programConfig = PROGRAM_SLOTS[registration.program as keyof typeof PROGRAM_SLOTS];
    const classConfig = programConfig?.classes.find((entry) => {
      const alias = entry.name.includes("Session")
        ? entry.name.replace("Session", "Class")
        : entry.name.replace("Class", "Session");
      return entry.name === registration.classTime || alias === registration.classTime;
    });
    if (!classConfig) {
      return NextResponse.json({ error: "Please contact Merry Explorers to renew this reservation." }, { status: 409 });
    }

    const settingsDoc = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
    const settings = settingsDoc?.programs || [];
    const adventureSetting = getProgramAdventureSetting(registration.program, settings);
    const adventureNumber = adventureSetting ? getTargetRegistrationAdventureNumber(registration.program, settings, now) : null;
    const adventureStartDate = adventureSetting ? getRegistrationAdventureStartDate(registration.program, settings, now) : null;
    const cycleQuery = adventureNumber === null
      ? []
      : getAdventureCycleRegistrationQuery(adventureNumber, adventureStartDate);
    if (cycleQuery.length && !(await registrations.findOne({ _id: registrationId, $or: cycleQuery }))) {
      return NextResponse.json({ error: "This registration is from a previous program cycle. Please contact Merry Explorers for help." }, { status: 409 });
    }
    const taken = await countUniqueActiveRegistrationSlots(
      registrations,
      activeRegistrationSlotQuery({
        program: registration.program,
        classTime: registration.classTime,
        cycleQuery,
        now,
        excludeId: registrationId,
      })
    );

    if (taken >= classConfig.maxSlots) {
      return NextResponse.json({ error: "This class is currently full. Please contact Merry Explorers so we can help you." }, { status: 409 });
    }

    const reservedUntil = new Date(now.getTime() + HOLD_DURATION_MS);
    const result = await registrations.updateOne(
      {
        _id: registrationId,
        $or: [
          { status: "expired" },
          { status: "reserved", reservedUntil: { $lte: now } },
          { status: "reserved", reservedUntil: { $exists: false } },
          { status: "reserved", reservedUntil: null },
        ],
      },
      { $set: { status: "reserved", reservedUntil, reservationRenewedAt: now } }
    );
    if (!result.modifiedCount) {
      return NextResponse.json({ error: "This reservation changed. Refresh the page and try again." }, { status: 409 });
    }

    return NextResponse.json({ success: true, reservedUntil });
  } catch (error) {
    console.error("[renew reservation POST] Error:", error);
    return NextResponse.json({ error: "Failed to renew the reservation" }, { status: 500 });
  }
}
