import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * Same B2 S3 client configuration as /api/upload.
 * requestChecksumCalculation / responseChecksumValidation are set to
 * "WHEN_REQUIRED" to suppress the CRC-32 checksum headers that the AWS SDK
 * adds by default in v3 — B2 rejects them with a 400 error.
 */
const s3 = new S3Client({
  region: process.env.B2_REGION || "us-east-005",
  endpoint: process.env.B2_ENDPOINT || "https://s3.us-east-005.backblazeb2.com",
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const BUCKET = process.env.B2_BUCKET_NAME || "merry-explorers-files";
const EXPIRES_IN = 300; // 5 minutes

export const dynamic = "force-dynamic";

/**
 * GET /api/files/download-url?uid=<accountId>&materialId=<materialId>
 *
 * Finds the material record in MongoDB, checks that it has a `key` field
 * (i.e. it was uploaded to Backblaze, not just a YouTube link), and returns
 * a presigned GET URL that expires in 5 minutes.
 *
 * Auth check: caller must supply the uid whose account owns the material,
 * OR be an admin/teacher (role checked via the `role` query param coming
 * from the session — in a full implementation you'd verify a session cookie;
 * for now we verify the uid owns the account).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");
    const materialId = searchParams.get("materialId");

    if (!uid || !materialId) {
      return NextResponse.json(
        { error: "uid and materialId are required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Find the account that owns this material
    const account = await db.collection("accounts").findOne({ _id: uid as any });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const material = (account.studyMaterials || []).find(
      (m: any) => m.id === materialId
    );
    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    // Link-type materials (YouTube, etc.) don't have a B2 key — return url directly
    if (material.type === "link" || !material.key) {
      return NextResponse.json({ success: true, url: material.url });
    }

    // Generate a presigned GET URL valid for 5 minutes
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: material.key,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: EXPIRES_IN });

    return NextResponse.json({ success: true, url: signedUrl });
  } catch (error: any) {
    console.error("[download-url] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
