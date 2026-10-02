import { NextResponse } from "next/server";
import { requireInternalAuth } from "@/lib/auth-guard";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const maxDuration = 60; // Allow more time for upload
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { base64 } = await request.json();

    if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
      return NextResponse.json({ error: "Missing or invalid image data" }, { status: 400 });
    }

    // No incoming transformation: store exactly what the browser sent.
    const result = await cloudinary.uploader.upload(base64, {
      folder: "merry_explorers_student_albums",
      resource_type: "image",
    });

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      cloudinaryPublicId: result.public_id,
    });
  } catch (error: any) {
    console.error("[upload-photo POST]", error);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}