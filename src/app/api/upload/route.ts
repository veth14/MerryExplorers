import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * S3 client pointed at Backblaze B2.
 *
 * requestChecksumCalculation / responseChecksumValidation are set to
 * "WHEN_REQUIRED" because the AWS SDK v3 added automatic CRC-32 checksum
 * headers in recent versions (aws-crc32, x-amz-checksum-*).
 * Backblaze B2 rejects those headers with a 400 "Unsupported header" error,
 * so we tell the SDK only to add them when the specific API operation
 * actually requires them (none of the ones we use do).
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

export const dynamic = "force-dynamic";
// Allow large files (e.g. PDFs, videos up to 150 MB)
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "study-materials";
    const uid = (formData.get("uid") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Build a deterministic, filesystem-safe key
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeName = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_\-]/g, "_")
      .substring(0, 60);
    const key = `${folder}/${Date.now()}_${safeName}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Backblaze B2 — NO ACL field (B2 does not support canned ACLs).
    // The bucket stays Private; access is via presigned URLs generated on demand.
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    // Persist only the key + metadata in MongoDB, never a public URL.
    if (uid) {
      const { db } = await connectToDatabase();
      const newMaterial = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^.]+$/, ""),
        key,                                     // B2 object key — used to generate presigned URLs
        type: "file" as const,
        contentType: file.type || "application/octet-stream",
        size: file.size,
        uploadedBy: uid,
        uploadedAt: new Date().toISOString(),
      };
      await (await connectToDatabase()).db
        .collection("accounts")
        .updateOne({ _id: uid as any }, { $push: { studyMaterials: newMaterial } as any });
    }

    // Return the key so the caller can store it and generate presigned URLs later.
    return NextResponse.json({ success: true, key });
  } catch (error: any) {
    console.error("[upload] Backblaze error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
