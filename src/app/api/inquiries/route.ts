import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const inquiries = await db
      .collection("inquiries")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const formatted = inquiries.map((inq) => ({
      ...inq,
      id: inq._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch inquiries" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { parentName, email, phone, childName, childAge, message } = data;

    if (!parentName || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const newInquiry = {
      parentName,
      email,
      phone: phone || "",
      childName: childName || "",
      childAge: childAge || "",
      message,
      status: "New",
      createdAt: new Date(),
    };

    const result = await db.collection("inquiries").insertOne(newInquiry);
    return NextResponse.json({
      success: true,
      data: { ...newInquiry, id: result.insertedId.toString() },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to submit inquiry" }, { status: 500 });
  }
}
