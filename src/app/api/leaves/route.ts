import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

// GET /api/leaves - get all leave requests
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const leaves = await db
      .collection("leaves")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const mapped = leaves.map((l) => ({ ...l, id: l._id.toString(), _id: undefined }));
    return NextResponse.json({ success: true, data: mapped }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/leaves - submit a leave request (called from teacher-card)
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { teacherId, teacherName, type, startDate, endDate, reason } = data;

    if (!teacherId || !type || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const record = {
      teacherId,
      teacherName,
      type,
      startDate,
      endDate,
      reason: reason || "",
      status: "Pending",
      createdAt: new Date(),
    };

    const result = await db.collection("leaves").insertOne(record);
    return NextResponse.json({ success: true, data: { ...record, id: result.insertedId.toString() } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
