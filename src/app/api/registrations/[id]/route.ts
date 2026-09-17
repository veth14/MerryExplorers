import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const registration = await db.collection("student_registrations").findOne({
      _id: new ObjectId(id)
    });

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    // Only return non-sensitive fields needed for the payment page
    const publicData = {
      id: registration._id.toString(),
      status: registration.status,
      program: registration.program,
      classTime: registration.classTime,
      reservedUntil: registration.reservedUntil,
    };

    return NextResponse.json({ success: true, data: publicData });
  } catch (error: any) {
    console.error("[registrations GET id] Error:", error);
    return NextResponse.json({ error: "Failed to fetch registration" }, { status: 500 });
  }
}
