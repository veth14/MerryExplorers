import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_PHOTOS = 30;

// GET /api/gallery (Public access)
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    // Sort by order ascending, then by uploadedAt descending
    const photos = await db.collection("gallery_photos").find().sort({ order: 1, uploadedAt: -1 }).toArray();

    const mapped = photos.map((p) => ({
      ...p,
      id: p._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (error: any) {
    console.error("Failed to fetch gallery:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}

// POST /api/gallery (Admin only)
export async function POST(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { db } = await connectToDatabase();

    // Check hard limit
    const count = await db.collection("gallery_photos").countDocuments();
    if (count >= MAX_PHOTOS) {
      return NextResponse.json(
        { error: `Gallery is full. You have reached the maximum limit of ${MAX_PHOTOS} photos. Please delete some before adding more.` },
        { status: 400 }
      );
    }

    const data = await request.json();
    const { base64Image, caption, order, actorUid, actorName, actorRole } = data;

    if (!base64Image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(base64Image, {
      folder: "merry_explorers_gallery",
    });

    const isPortrait = uploadResult.height > uploadResult.width;

    const newPhoto = {
      imageUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      isPortrait,
      caption: caption || "",
      order: order || count, // default to end of list
      uploadedAt: new Date(),
    };

    const result = await db.collection("gallery_photos").insertOne(newPhoto);

    // Audit log
    if (actorUid) {
      await db.collection("audit_log").insertOne({
        actorUid,
        actorName: actorName || "Unknown",
        actorRole: actorRole || "Unknown",
        action: "CREATE",
        category: "gallery",
        targetId: result.insertedId.toString(),
        details: "Uploaded a new gallery photo",
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ success: true, data: { ...newPhoto, id: result.insertedId.toString() } });
  } catch (error: any) {
    console.error("Failed to upload photo:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

// PATCH /api/gallery (Admin only)
export async function PATCH(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const data = await request.json();
    const { id, caption, order, actorUid, actorName, actorRole } = data;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const updateFields: any = {};
    if (caption !== undefined) updateFields.caption = caption;
    if (order !== undefined) updateFields.order = order;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const result = await db.collection("gallery_photos").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Audit log
    if (actorUid) {
      await db.collection("audit_log").insertOne({
        actorUid,
        actorName: actorName || "Unknown",
        actorRole: actorRole || "Unknown",
        action: "EDIT",
        category: "gallery",
        targetId: id,
        details: "Updated a gallery photo",
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update photo:", error);
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/gallery (Admin only)
export async function DELETE(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const actorUid = searchParams.get("actorUid");
    const actorName = searchParams.get("actorName") || "Unknown";
    const actorRole = searchParams.get("actorRole") || "Unknown";

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Get the photo to find the Cloudinary Public ID
    const photo = await db.collection("gallery_photos").findOne({ _id: new ObjectId(id) });
    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Delete from Cloudinary
    if (photo.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(photo.cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.error("Failed to delete from Cloudinary:", cloudinaryError);
        // Continue with DB deletion even if Cloudinary fails, to keep UI consistent
      }
    }

    // Delete from MongoDB
    await db.collection("gallery_photos").deleteOne({ _id: new ObjectId(id) });

    // Audit log
    if (actorUid) {
      await db.collection("audit_log").insertOne({
        actorUid,
        actorName,
        actorRole,
        action: "DELETE",
        category: "gallery",
        targetId: id,
        details: "Deleted a gallery photo",
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete photo:", error);
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 });
  }
}
