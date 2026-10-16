import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";
import { getAdventureCycleTimeline, getProgramAdventureSetting, getRegistrationAdventureNumber } from "@/lib/adventure-cycle";

export const dynamic = "force-dynamic";

// GET /api/students — Admin only
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { db } = await connectToDatabase();
    const url = new URL(request.url);
    const program = url.searchParams.get("program");

    const query = program && program !== "all" ? { program } : {};
    const students = await db
      .collection("students")
      .find(query)
      .sort({ enrolledAt: -1 })
      .toArray();

    const registrationIds = students
      .map((student) => student.registrationId)
      .filter((id): id is string => typeof id === "string" && ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    const registrations = registrationIds.length
      ? await db.collection("student_registrations").find({ _id: { $in: registrationIds } }).toArray()
      : [];
    const registrationMap = new Map(registrations.map((registration) => [registration._id.toString(), registration]));
    const renewalSettings = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
    const adventureSettings = renewalSettings?.programs || [];

    // Fetch parent accounts to get consent and waiver data
    const parentEmails = [...new Set(students.map(s => s.parentInfo?.email))].filter(Boolean);
    const parents = await db
      .collection("accounts")
      .find({ email: { $in: parentEmails } })
      .toArray();
    
    const parentMap = new Map(parents.map(p => [p.email, p]));

    const formatted = students.map((s) => {
      const parentAcc = parentMap.get(s.parentInfo?.email);
      const registration = registrationMap.get(s.registrationId);
      const adventureNumber = s.adventureNumber ?? registration?.adventureNumber ?? (
        getProgramAdventureSetting(s.program, adventureSettings)
          ? getRegistrationAdventureNumber({
              adventureNumber: registration?.adventureNumber,
              period: registration?.period,
              submittedAt: registration?.submittedAt || s.enrolledAt,
            }, s.program, adventureSettings)
          : null
      );
      const timeline = getProgramAdventureSetting(s.program, adventureSettings)
        ? getAdventureCycleTimeline(s.program, adventureSettings)
        : null;
      return {
        ...s,
        adventureNumber,
        adventureStartDate: s.adventureStartDate || registration?.adventureStartDate || null,
        activeAdventureNumber: timeline?.activeAdventureNumber ?? null,
        upcomingAdventureNumber: timeline?.upcomingAdventureNumber ?? null,
        previousAdventureNumber: timeline?.previousAdventureNumber ?? null,
        upcomingAdventureStartDate: timeline?.upcomingAdventureStartDate ?? null,
        id: s._id.toString(),
        _id: undefined,
        photoConsent: parentAcc?.photoConsent !== undefined ? parentAcc.photoConsent : s.photoConsent,
        waiverSignedAt: parentAcc?.waiverSignedAt || s.waiverSignedAt,
        waiverSignature: parentAcc?.waiverSignature || s.waiverSignature,
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("[students GET]", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

// GET /api/students/[id] — handled separately; this also supports fetching a single student by registrationId
export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    await db.collection("students").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 });
  }
}
