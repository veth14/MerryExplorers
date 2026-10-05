import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

const BUCKET = process.env.B2_BUCKET_NAME || "merry-explorers-files";

export const dynamic = "force-dynamic";
// Allow large files (e.g. PDFs, videos up to 150 MB)
export const maxDuration = 60;

/**
 * Lazy-initialize the S3 client so that missing env vars produce a clear
 * 500 error message instead of crashing with "Resolved credential object
 * is not valid" during module load.
 */
function getS3Client(): S3Client {
  const keyId = process.env.B2_KEY_ID;
  const appKey = process.env.B2_APPLICATION_KEY;

  if (!keyId || !appKey) {
    throw new Error(
      "Backblaze credentials are not configured. Add B2_KEY_ID and B2_APPLICATION_KEY to your Vercel environment variables."
    );
  }

  return new S3Client({
    region: process.env.B2_REGION || "us-east-005",
    endpoint: process.env.B2_ENDPOINT || "https://s3.us-east-005.backblazeb2.com",
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: appKey,
    },
    // Suppress CRC-32 checksum headers that AWS SDK v3 adds by default —
    // Backblaze B2 rejects them with a 400 error.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

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

    // Upload to Backblaze B2 — NO ACL (B2 does not support canned ACLs).
    // Bucket stays Private; access is via presigned URLs generated on demand.
    const s3 = getS3Client();
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
        key,
        type: "file" as const,
        contentType: file.type || "application/octet-stream",
        size: file.size,
        uploadedBy: uid,
        uploadedAt: new Date().toISOString(),
      };
      await db
        .collection("accounts")
        .updateOne({ _id: uid as any }, { $push: { studyMaterials: newMaterial } as any });
    }

    return NextResponse.json({ success: true, key });
  } catch (error: any) {
    console.error("[upload] Backblaze error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
