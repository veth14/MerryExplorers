import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

// PATCH /api/renewals/families/[id] - Update family details or status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid family ID" }, { status: 400 });
    }

    const body = await request.json();
    const { db } = await connectToDatabase();

    const updateFields: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.parentName !== undefined) updateFields.parentName = body.parentName.trim();
    if (body.parentEmail !== undefined) {
      const email = body.parentEmail.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }
      updateFields.parentEmail = email;
    }
    if (body.phone !== undefined) updateFields.phone = body.phone.trim();
    if (body.childName !== undefined) updateFields.childName = body.childName.trim();
    if (body.previousProgram !== undefined) updateFields.previousProgram = body.previousProgram.trim();
    if (body.renewingTo !== undefined) updateFields.renewingTo = body.renewingTo.trim();
    if (body.renewalStatus !== undefined) updateFields.renewalStatus = body.renewalStatus;
    if (body.notes !== undefined) updateFields.notes = body.notes.trim();
    if (body.renewalPeriod !== undefined) updateFields.renewalPeriod = body.renewalPeriod;

    if (body.isPioneer !== undefined) {
      updateFields.isPioneer = Boolean(body.isPioneer);

      // Bidirectional sync with pioneer_families
      const familyDoc = await db.collection("renewal_families").findOne({ _id: new ObjectId(id) });
      const targetEmail = (updateFields.parentEmail || familyDoc?.parentEmail || "").trim().toLowerCase();
      const targetParent = updateFields.parentName || familyDoc?.parentName || "";
      const targetChild = updateFields.childName || familyDoc?.childName || "";

      if (targetEmail) {
        if (body.isPioneer) {
          await db.collection("pioneer_families").updateOne(
            { email: targetEmail },
            {
              $set: {
                parentName: targetParent.trim(),
                childName: targetChild.trim(),
                email: targetEmail,
                updatedAt: new Date().toISOString(),
              },
              $setOnInsert: { createdAt: new Date().toISOString() },
            },
            { upsert: true }
          );
        } else {
          await db.collection("pioneer_families").deleteMany({ email: targetEmail });
        }
      }
    }

    await db.collection("renewal_families").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[renewal_families PATCH]", error);
    return NextResponse.json({ error: error.message || "Failed to update family" }, { status: 500 });
  }
}

// DELETE /api/renewals/families/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid family ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    await db.collection("renewal_families").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[renewal_families DELETE]", error);
    return NextResponse.json({ error: error.message || "Failed to delete family" }, { status: 500 });
  }
}
