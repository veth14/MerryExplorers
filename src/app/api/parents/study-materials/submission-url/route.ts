// app/api/parents/study-materials/submission-url/route.ts
import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Backblaze B2 speaks the S3 API. Use the SAME env var names as your /api/upload route.
// Endpoint looks like: https://s3.us-west-004.backblazeb2.com  (region = us-west-004)
const s3 = new S3Client({
    endpoint: process.env.B2_ENDPOINT!,
    region: process.env.B2_REGION!,
    credentials: {
        accessKeyId: process.env.B2_KEY_ID!,
        secretAccessKey: process.env.B2_APP_KEY!,
    },
});
const BUCKET = process.env.B2_BUCKET!;

export async function POST(req: Request) {
    const { uid, key } = await req.json();

    // TODO: verify the logged-in user actually is `uid` (same auth check your other parent routes use)

    // Only allow files inside this parent's own submissions folder
    if (typeof uid !== "string" || typeof key !== "string" || !key.startsWith(`submissions/${uid}/`) || key.includes("..")) {
        return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    try {
        const url = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: BUCKET, Key: key, ResponseContentDisposition: "inline" }),
            { expiresIn: 300 }
        );
        return NextResponse.json({ url });
    } catch {
        return NextResponse.json({ error: "Could not create link" }, { status: 500 });
    }
}