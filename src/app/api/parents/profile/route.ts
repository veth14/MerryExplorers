import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function PATCH(request: Request) {
  try {
    const data = await request.json();
    const { uid, childInfo, emergencyContact, avatarUrl, hasCompletedVirtualSurvey } = data;

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
        ...(avatarUrl ? { avatarUrl } : {}),
      };

      await db.collection("students").updateOne(
        { _id: student._id },
        { 
          $set: { 
            childInfo: updatedChildInfo, 
            ...(emergencyContact ? { emergencyContact } : {}) 
          } 
        }
      );
    }

    // Always update accounts collection as well so avatar, survey flag, and childInfo are persisted
    const accountUpdates: any = {
      childInfo: {
        ...(account.childInfo || {}),
        ...childInfo,
      },
    };
    if (avatarUrl) {
      accountUpdates.avatarUrl = avatarUrl;
    }
    if (hasCompletedVirtualSurvey !== undefined) {
      accountUpdates.hasCompletedVirtualSurvey = hasCompletedVirtualSurvey;
    }
    if (emergencyContact) {
      accountUpdates.emergencyContact = emergencyContact;
    }

    await db.collection("accounts").updateOne(
      { _id: uid },
      { $set: accountUpdates }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[parents profile PATCH]", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
