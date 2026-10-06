import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = "force-dynamic";

// POST /api/parents/waiver — Save parent's waiver signature
export async function POST(request: Request) {
  try {
    const { uid, signature, photoConsent } = await request.json();

    if (!uid || !signature) {
      return NextResponse.json({ error: "uid and signature are required" }, { status: 400 });
    }

    let signatureUrl = signature;
    if (signature.startsWith("data:image")) {
      const uploadRes = await cloudinary.uploader.upload(signature, {
        folder: "merry_explorers_waivers",
      });
      signatureUrl = uploadRes.secure_url;
    }

    const { db } = await connectToDatabase();

    const result = await db.collection("accounts").updateOne(
      { _id: uid as any },
      {
        $set: {
          waiverSignature: signatureUrl,
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
