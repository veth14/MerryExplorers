import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
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
const PHT_OFFSET_MS = 8 * 60 * 60 * 1000; // Asia/Manila is UTC+8, no DST

function generateAccessCode(): string {
  return randomBytes(5).toString("base64url").toUpperCase().slice(0, 8);
}

// Same label format POST and PATCH both use: "<classTime> · Mon, Oct 5, 2026"
function buildSessionLabel(classTime: string, sessionDate: string): string {
  return `${classTime} · ${new Date(sessionDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`;
}

// Trailblazer = program slug "brave-explorer", or the display name says so
function isTrailblazerProgram(program?: string, programName?: string): boolean {
  return program === "brave-explorer" || /trailblazer|brave explorer/i.test(programName || "");
}

// Saturday 23:59:00 PHT, returned as a real UTC Date.
// Created Sun–Fri -> this coming Saturday. Created on Saturday -> next Saturday
// (the photos for that week are sent the following Thu/Fri).
function getTrailblazerExpiry(now = new Date()): Date {
  const manila = new Date(now.getTime() + PHT_OFFSET_MS);
  const day = manila.getUTCDay();
  const daysUntilSaturday = day === 6 ? 7 : 6 - day;
  const utcMs =
    Date.UTC(
      manila.getUTCFullYear(),
      manila.getUTCMonth(),
      manila.getUTCDate() + daysUntilSaturday,
      23,
      59,
      0,
      0
    ) - PHT_OFFSET_MS;
  return new Date(utcMs);
}

// Removed sweepExpiredAlbums to allow manual deletion via Archive tab.

// GET /api/photo-albums — Admin only, list all albums
export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { db } = await connectToDatabase();

    // Auto-delete removed per user request: albums are now moved to Archive tab in UI

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
      photos, // array of { url, cloudinaryPublicId, caption }
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

    // Generate a unique access code and a 4-digit PIN
    const { db } = await connectToDatabase();
    let accessCode = generateAccessCode();
    // Ensure uniqueness (extremely unlikely collision, but check anyway)
    let existing = await db.collection("student_photo_albums").findOne({ accessCode });
    while (existing) {
      accessCode = generateAccessCode();
      existing = await db.collection("student_photo_albums").findOne({ accessCode });
    }

    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const now = new Date();
    const isTrailblazer = isTrailblazerProgram(program, programName);

    // Trailblazers: deleted Saturday 11:59 PM PHT (set at creation so the
    // album can't expire before the Thu/Fri send). Everyone else: TTL_DAYS.
    const expiresAt = isTrailblazer
      ? getTrailblazerExpiry(now)
      : new Date(now.getTime() + TTL_DAYS * 24 * 60 * 60 * 1000);

    const sessionLabel = buildSessionLabel(classTime, sessionDate);

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
      pin,
      emailSent: false,
      emailSentAt: null,
      isTrailblazer,
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

// PATCH /api/photo-albums — Admin only, edit date / note / photos
export async function PATCH(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const body = await request.json();
    const { id, sessionDate, note, photos, removedPublicIds, actorUid, actorName } = body;

    if (!id || typeof id !== "string" || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Missing or invalid album id" }, { status: 400 });
    }
    if (!Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json({ error: "An album needs at least one photo" }, { status: 400 });
    }
    if (photos.length > MAX_PHOTOS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PHOTOS} photos allowed per album.` },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const col = db.collection("student_photo_albums");

    const album = await col.findOne({ _id: new ObjectId(id) });
    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // Clean the incoming photo list
    const cleanPhotos = (photos as any[])
      .filter((p) => p && typeof p.url === "string" && p.url.startsWith("https://"))
      .map((p) => ({
        url: p.url as string,
        caption: String(p.caption || "").slice(0, 200),
        ...(p.cloudinaryPublicId ? { cloudinaryPublicId: String(p.cloudinaryPublicId) } : {}),
      }));

    if (cleanPhotos.length === 0) {
      return NextResponse.json({ error: "No valid photos provided" }, { status: 400 });
    }

    // Only delete Cloudinary files that belonged to THIS album and were removed
    const keptIds = new Set(cleanPhotos.map((p: any) => p.cloudinaryPublicId).filter(Boolean));
    const ownedIds = new Set(
      ((album.photos || []) as any[]).map((p) => p.cloudinaryPublicId).filter(Boolean)
    );
    const toDelete = ((removedPublicIds || []) as string[]).filter(
      (pid) => ownedIds.has(pid) && !keptIds.has(pid)
    );

    const set: Record<string, any> = {
      photos: cleanPhotos,
      note: String(note || "").trim().slice(0, 1000),
      updatedAt: new Date(),
    };

    // Same "YYYY-MM-DD" format POST stores; rebuild the label so it stays in sync
    if (typeof sessionDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
      set.sessionDate = sessionDate;
      set.sessionLabel = buildSessionLabel(album.classTime, sessionDate);
    }

    // 1. Save first, so a failed save never loses photos.
    //    $set leaves expiresAt alone, so the TTL index and the Trailblazer
    //    Saturday expiry keep working.
    await col.updateOne({ _id: album._id }, { $set: set });

    // 2. Then remove the Cloudinary files that are no longer in the album
    if (toDelete.length > 0) {
      const results = await Promise.allSettled(
        toDelete.map((pid) => cloudinary.uploader.destroy(pid))
      );
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.warn("[photo-albums PATCH] Cloudinary delete failed for", toDelete[i]);
        }
      });
    }

    // Audit log
    if (actorUid) {
      await db.collection("audit_log").insertOne({
        actorUid,
        actorName: actorName || "Admin",
        actorRole: "admin",
        action: "UPDATE",
        category: "photo_albums",
        targetId: id,
        details: `Edited photo album for ${album.childFirstName} (${set.sessionLabel || album.sessionLabel}): ${cleanPhotos.length} photos, ${toDelete.length} removed`,
        createdAt: new Date(),
      });
    }

    // Return only the changed fields; the page merges these into the album
    return NextResponse.json({
      success: true,
      data: {
        id,
        photos: set.photos,
        note: set.note,
        ...(set.sessionDate ? { sessionDate: set.sessionDate, sessionLabel: set.sessionLabel } : {}),
      },
    });
  } catch (error: any) {
    console.error("[photo-albums PATCH]", error);
    return NextResponse.json({ error: error.message || "Failed to update album" }, { status: 500 });
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

    const { db } = await connectToDatabase();

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