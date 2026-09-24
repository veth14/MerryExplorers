import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "ID and status are required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    await db.collection("discovery_day_results").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating discovery day result:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
