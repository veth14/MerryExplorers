import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { teacherId, teacherName, title, description } = data;

    if (!title || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    const newBug = {
      teacherId: teacherId || "Unknown",
      teacherName: teacherName || "Unknown",
      title,
      description,
      status: "Open",
      createdAt: new Date(),
    };

    const result = await db.collection("bugs").insertOne(newBug);
    return NextResponse.json({ success: true, data: { ...newBug, _id: result.insertedId } });
  } catch (error: any) {
    console.error("Failed to report bug:", error);
    return NextResponse.json({ error: "Failed to report bug" }, { status: 500 });
  }
}
