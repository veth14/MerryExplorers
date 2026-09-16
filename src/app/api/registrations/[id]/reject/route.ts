import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  const resolvedParams = await params;
  const { id } = resolvedParams;
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { reason, actorUid, actorName, actorRole } = body;

    const { db } = await connectToDatabase();

    const registration = await db
      .collection("student_registrations")
      .findOne({ _id: new ObjectId(id) });

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    await db.collection("student_registrations").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "rejected",
          rejectedAt: new Date(),
          rejectedBy: actorName || actorUid || "Admin",
          rejectionReason: reason || "",
        },
      }
    );

    // Audit log
    if (actorUid) {
      await db.collection("audit_log").insertOne({
        actorUid,
        actorName: actorName || "Unknown",
        actorRole: actorRole || "Unknown",
        action: "REJECT",
        category: "registration",
        targetId: id,
        details: `Rejected registration for ${registration.childInfo?.firstName} ${registration.childInfo?.lastName}. Reason: ${reason || "None"}`,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[reject POST]", error);
    return NextResponse.json({ error: error.message || "Failed to reject" }, { status: 500 });
  }
}
