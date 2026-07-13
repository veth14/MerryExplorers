import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// PATCH /api/leaves/[id] - approve or reject a leave
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status } = await request.json(); // "Approved" | "Rejected"

    if (!["Approved", "Rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const result = await db.collection("leaves").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    const leave = await db.collection("leaves").findOne({ _id: new ObjectId(id) });
    if (leave?.teacherId) {
      if (status === "Approved") {
        await db.collection("accounts").updateOne(
          { _id: leave.teacherId as any },
          { $set: { status: "on-leave", updatedAt: new Date() } }
        );
      }
      
      // Send notification to the teacher
      await db.collection("notifications").insertOne({
        userId: leave.teacherId, // Target the specific teacher
        title: `Leave Request ${status}`,
        message: `Your leave request for ${leave.startDate} to ${leave.endDate} has been ${status.toLowerCase()}.`,
        type: status === "Approved" ? "success" : "error",
        read: false,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
