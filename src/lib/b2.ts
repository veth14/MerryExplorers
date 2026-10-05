import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const B2_BUCKET = process.env.B2_BUCKET_NAME || "merry-explorers-files";

/**
 * Lazy-initialize the S3 client for Backblaze B2.
 */
export function getS3Client(): S3Client {
  const keyId = process.env.B2_KEY_ID;
  const appKey = process.env.B2_APPLICATION_KEY;

  if (!keyId || !appKey) {
    throw new Error(
      "Backblaze credentials are not configured. Add B2_KEY_ID and B2_APPLICATION_KEY to your environment variables."
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

/**
 * Permanently deletes an object from the Backblaze B2 bucket by key.
 */
export async function deleteB2File(key: string): Promise<boolean> {
  if (!key) return false;
  try {
    const s3 = getS3Client();
    await s3.send(
      new DeleteObjectCommand({
        Bucket: B2_BUCKET,
        Key: key,
      })
    );
    return true;
  } catch (err) {
    console.error("[B2] Failed to delete file from bucket:", key, err);
    return false;
  }
}
