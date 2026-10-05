import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * POST /api/parents/study-materials
 *
 * Body for a YouTube/link-type material:
 *   { uid, title, url, type: "link" }
 *
 * Body for a file uploaded to Backblaze:
 *   { uid, title, key, type: "file", contentType?, size? }
 *
 * We NEVER store a public Backblaze URL in MongoDB.
 * File materials store only the B2 `key`; presigned URLs are generated
 * on demand via GET /api/files/download-url.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, title, url, key, type, contentType, size } = body;

    if (!uid || !title) {
      return NextResponse.json({ error: "Missing uid or title" }, { status: 400 });
    }

    // Link-type must have url; file-type must have key
    if (type === "link" && !url) {
      return NextResponse.json({ error: "url is required for link-type material" }, { status: 400 });
    }
    if (type === "file" && !key) {
      return NextResponse.json({ error: "key is required for file-type material" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const newMaterial: Record<string, any> = {
      id: crypto.randomUUID(),
      title,
      type,
      createdAt: new Date().toISOString(),
    };

    if (type === "link") {
      newMaterial.url = url;          // External URL stored as-is
    } else {
      newMaterial.key = key;          // B2 object key — never a public URL
      if (contentType) newMaterial.contentType = contentType;
      if (size) newMaterial.size = size;
    }

    await db.collection("accounts").updateOne(
      { _id: uid as any },
      { $push: { studyMaterials: newMaterial } as any }
    );

    const account = await db.collection("accounts").findOne({ _id: uid as any });
    return NextResponse.json({ success: true, studyMaterials: account?.studyMaterials || [] });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to add material" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { uid, materialId } = await request.json();
    if (!uid || !materialId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // NOTE: We do NOT delete the file from B2 here on purpose — the admin
    // can clean up orphaned files in the B2 console. Deleting from B2 requires
    // listing object versions, which adds complexity. This can be added later.
    await db.collection("accounts").updateOne(
      { _id: uid as any },
      { $pull: { studyMaterials: { id: materialId } } as any }
    );

    const account = await db.collection("accounts").findOne({ _id: uid as any });
    return NextResponse.json({ success: true, studyMaterials: account?.studyMaterials || [] });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete material" }, { status: 500 });
  }
}
