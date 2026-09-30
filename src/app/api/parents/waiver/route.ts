import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// POST /api/parents/waiver — Save parent's waiver signature
export async function POST(request: Request) {
  try {
    const { uid, signature, photoConsent } = await request.json();

    if (!uid || !signature) {
      return NextResponse.json({ error: "uid and signature are required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const result = await db.collection("accounts").updateOne(
      { _id: uid as any },
      {
        $set: {
          waiverSignature: signature,
          waiverSignedAt: new Date(),
          photoConsent: photoConsent !== undefined ? photoConsent : true,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[parents/waiver POST]", error);
    return NextResponse.json({ error: "Failed to save waiver signature" }, { status: 500 });
  }
}
