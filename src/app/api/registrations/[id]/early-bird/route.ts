import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { paymentDeadline, actorName } = body;

    const { db } = await connectToDatabase();

    const reg = await db.collection("student_registrations").findOne({ _id: new ObjectId(id) });
    if (!reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    await db.collection("student_registrations").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "early-bird",
          earlyBirdAt: new Date(),
          earlyBirdBy: actorName || "Admin",
          paymentDeadline: paymentDeadline ? new Date(paymentDeadline) : null,
          paymentPortalOpen: false,
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[early-bird POST]", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}