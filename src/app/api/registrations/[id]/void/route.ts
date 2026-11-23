import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Voided by admin";
    const actorName = body.actorName || (auth as any).user?.name || (auth as any).user?.email || "Admin";
    const actorUid = body.actorUid || (auth as any).user?.uid || "";

    const { db } = await connectToDatabase();
    const registration = await db.collection("student_registrations").findOne({ _id: new ObjectId(id) });
    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const childName = `${registration.childInfo?.firstName || ""} ${registration.childInfo?.lastName || ""}`.trim() || "Explorer";

    // 1. Mark status as voided
    await db.collection("student_registrations").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "voided",
          voidedAt: new Date(),
          voidedBy: actorName,
          voidReason: reason,
        },
      }
    );

    // 2. Remove associated student record from active students roster
    await db.collection("students").deleteMany({ registrationId: id });

    // 3. If linked to a renewal family, relink to any remaining active registration or reset
    if (registration.familyId) {
      const otherActive = await db.collection("student_registrations").findOne({
        familyId: registration.familyId,
        _id: { $ne: new ObjectId(id) },
        status: { $in: ["approved", "active", "pending", "reserved"] },
      });
      if (!otherActive) {
        try {
          await db.collection("renewal_families").updateOne(
            { _id: new ObjectId(registration.familyId) },
            { $set: { renewalStatus: "not_yet_submitted", registrationId: null, updatedAt: new Date() } }
          );
        } catch {}
      } else {
        try {
          await db.collection("renewal_families").updateOne(
            { _id: new ObjectId(registration.familyId) },
            { $set: { registrationId: otherActive._id.toString(), updatedAt: new Date() } }
          );
        } catch {}
      }
    }

    // 4. Audit log
    await db.collection("audit_log").insertOne({
      actorUid,
      actorName,
      action: "VOID_REGISTRATION",
      category: "registration",
      targetId: id,
      details: `Voided registration for ${childName} (${registration.program} - ${registration.classTime}). Reason: ${reason}`,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      action: "void",
      message: `Registration for ${childName} voided and slot released.`,
    });
  } catch (error: any) {
    console.error("[registrations POST void] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to void registration" }, { status: 500 });
  }
}
