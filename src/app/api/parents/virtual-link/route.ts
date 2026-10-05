import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { sendSessionLinkEmail } from "@/lib/virtual-session-emails";

export async function PATCH(request: Request) {
  try {
    const { uid, virtualSessionLink, virtualSessionTime, sendEmail } = await request.json();
    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });

    const { db } = await connectToDatabase();
    
    const updateData: any = {};
    if (virtualSessionLink !== undefined) updateData.virtualSessionLink = virtualSessionLink;
    if (virtualSessionTime !== undefined) updateData.virtualSessionTime = virtualSessionTime;

    await db.collection("accounts").updateOne(
      { _id: uid },
      { $set: updateData }
    );

    // Optionally email the parent that their session is ready
    if (sendEmail) {
      const account = await db.collection("accounts").findOne({ _id: uid });
      if (account?.email) {
        try {
          await sendSessionLinkEmail(
            account.email, 
            account.fullName || account.email, 
            account.virtualSessionLink,
            account.virtualSessionTime
          );
        } catch (emailErr: any) {
          console.error("[virtual-link PATCH] Email failed:", emailErr.message);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update link" }, { status: 500 });
  }
}
