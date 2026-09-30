import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function PATCH(request: Request) {
  try {
    const data = await request.json();
    const { uid, childInfo, emergencyContact } = data;

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Find the parent account
    const account = await db.collection("accounts").findOne({ _id: uid });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Find the student linked to this parent
    const student = await db.collection("students").findOne({ "parentInfo.email": account.email });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Merge childInfo
    const updatedChildInfo = {
      ...student.childInfo,
      ...childInfo,
    };

    await db.collection("students").updateOne(
      { _id: student._id },
      { $set: { childInfo: updatedChildInfo, emergencyContact } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[parents profile PATCH]", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
