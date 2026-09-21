import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { v2 as cloudinary } from "cloudinary";
import { randomBytes } from "crypto";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = "force-dynamic";

const MAX_PHOTOS = 30;
const TTL_DAYS = 3;

function generateAccessCode(): string {
  return randomBytes(5).toString("base64url").toUpperCase().slice(0, 8);
}

// GET /api/photo-albums — Admin only, list all albums
export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { db } = await connectToDatabase();
    const albums = await db
      .collection("student_photo_albums")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const formatted = albums.map((a) => ({
      ...a,
      id: a._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("[photo-albums GET]", error);
    return NextResponse.json({ error: "Failed to fetch albums" }, { status: 500 });
  }
}

// POST /api/photo-albums — Admin only, create album + upload photos
export async function POST(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const data = await request.json();
    const {
      studentRegistrationId,
      childFirstName,
      childNickname,
      parentEmail,
      program,
      programName,
      classTime,
      sessionDate,
      note,
      photos, // array of { base64, caption }
      actorUid,
      actorName,
    } = data;

    if (!studentRegistrationId || !childFirstName || !parentEmail || !sessionDate || !photos?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (photos.length > MAX_PHOTOS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PHOTOS} photos allowed per album.` },
        { status: 400 }
      );
    }

    // Photos are now pre-uploaded individually by the client
    const uploadedPhotos: { url: string; cloudinaryPublicId: string; caption: string }[] = photos.map((p: any) => ({
      url: p.url,
      cloudinaryPublicId: p.cloudinaryPublicId,
      caption: p.caption || "",
    }));

    // Generate a unique access code
    const { db } = await connectToDatabase();
    let accessCode = generateAccessCode();
    // Ensure uniqueness (extremely unlikely collision, but check anyway)
    let existing = await db.collection("student_photo_albums").findOne({ accessCode });
    while (existing) {
      accessCode = generateAccessCode();
      existing = await db.collection("student_photo_albums").findOne({ accessCode });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TTL_DAYS * 24 * 60 * 60 * 1000);

    const sessionLabel = `${classTime} · ${new Date(sessionDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`;

    const album = {
      accessCode,
      studentRegistrationId,
      childFirstName: childFirstName.trim(),
      childNickname: childNickname?.trim() || "",
      parentEmail: parentEmail.trim().toLowerCase(),
      program,
      programName,
      classTime,
      sessionLabel,
      sessionDate,
      note: note?.trim() || "",
      photos: uploadedPhotos,
      emailSent: false,
      emailSentAt: null,
      expiresAt,
      createdAt: now,
      createdBy: actorUid || null,
      createdByName: actorName || "Admin",
    };

    const result = await db.collection("student_photo_albums").insertOne(album);

    // Audit log
    if (actorUid) {
      await db.collection("audit_log").insertOne({
        actorUid,
        actorName: actorName || "Admin",
        actorRole: "admin",
        action: "CREATE",
        category: "photo_albums",
        targetId: result.insertedId.toString(),
        details: `Created photo album for ${childFirstName} (${sessionLabel}) with ${uploadedPhotos.length} photos`,
        createdAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      data: { ...album, id: result.insertedId.toString() },
    });
  } catch (error: any) {
    console.error("[photo-albums POST]", error);
    return NextResponse.json({ error: error.message || "Failed to create album" }, { status: 500 });
  }
}

// DELETE /api/photo-albums?id=... — Admin only
export async function DELETE(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const actorUid = searchParams.get("actorUid");
    const actorName = searchParams.get("actorName") || "Admin";

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { db, client } = await connectToDatabase();
    const { ObjectId } = await import("mongodb");

    const album = await db.collection("student_photo_albums").findOne({ _id: new ObjectId(id) });
    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // Delete all photos from Cloudinary
    if (Array.isArray(album.photos)) {
      for (const photo of album.photos) {
        if (photo.cloudinaryPublicId) {
          try {
            await cloudinary.uploader.destroy(photo.cloudinaryPublicId);
          } catch (e) {
            console.warn("Cloudinary delete failed for", photo.cloudinaryPublicId);
          }
        }
      }
    }

    await db.collection("student_photo_albums").deleteOne({ _id: new ObjectId(id) });

    // Audit log
    if (actorUid) {
      await db.collection("audit_log").insertOne({
        actorUid,
        actorName,
        actorRole: "admin",
        action: "DELETE",
        category: "photo_albums",
        targetId: id,
        details: `Deleted photo album for ${album.childFirstName} (${album.sessionLabel})`,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[photo-albums DELETE]", error);
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 });
  }
}
