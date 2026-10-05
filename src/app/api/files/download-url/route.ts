import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { GetObjectCommandInput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

const BUCKET = process.env.B2_BUCKET_NAME || "merry-explorers-files";
const EXPIRES_IN = 300; // 5 minutes

export const dynamic = "force-dynamic";

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
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

/**
 * GET /api/files/download-url?uid=<uid>&materialId=<id>
 * GET /api/files/download-url?uid=<uid>&materialId=<id>&download=1
 *
 * Returns a presigned GET URL for the material.
 * When ?download=1 is present the URL includes ResponseContentDisposition=attachment
 * so the browser saves the file directly without opening a new tab.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid        = searchParams.get("uid");
    const materialId = searchParams.get("materialId");
    const asDownload = searchParams.get("download") === "1";

    if (!uid || !materialId) {
      return NextResponse.json(
        { error: "uid and materialId are required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

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

    if (material.type === "link" || !material.key) {
      return NextResponse.json({ success: true, url: material.url });
    }

    const s3 = getS3Client();

    const commandInput: GetObjectCommandInput = {
      Bucket: BUCKET,
      Key: material.key,
    };

    if (asDownload) {
      // Extract extension from the stored key (e.g. "materials/uuid-Report.pdf" → ".pdf")
      // The key always preserves the original extension from the upload sanitization.
      const keyExt = (material.key as string).match(/(\.[^./\\]+)$/)?.[1] ?? "";

      // Fallback: derive extension from contentType if the key has none
      const ctExtMap: Record<string, string> = {
        "application/pdf": ".pdf",
        "application/msword": ".doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "application/vnd.ms-powerpoint": ".ppt",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
        "application/vnd.ms-excel": ".xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
      };
      const ext = keyExt || (material.contentType ? ctExtMap[material.contentType] ?? "" : "");

      const baseName = (material.title || "file").replace(/\.[^.]+$/, ""); // strip if title already has ext
      const fullName = `${baseName}${ext}`;

      // RFC 5987 — use filename* for non-ASCII-safe names, plain filename as fallback
      const encoded = encodeURIComponent(fullName);
      commandInput.ResponseContentDisposition =
        `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`;

      if (material.contentType) {
        commandInput.ResponseContentType = material.contentType as string;
      }
    }


    const command   = new GetObjectCommand(commandInput);
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
