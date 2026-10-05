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

    if (student) {
      // Merge childInfo for existing student
      const updatedChildInfo = {
        ...student.childInfo,
        ...childInfo,
      };

      await db.collection("students").updateOne(
        { _id: student._id },
        { $set: { childInfo: updatedChildInfo, emergencyContact } }
      );
    } else {
      // No student record exists (e.g. manually created account).
      // Save directly to the account document as a fallback.
      await db.collection("accounts").updateOne(
        { _id: uid },
        { $set: { childInfo, emergencyContact } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[parents profile PATCH]", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
