import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const maxDuration = 300; // max 5 minutes if on Pro plan

export async function GET(request: Request) {
  // Check authorization header for CRON_SECRET if provided in env
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    // If testing locally without a CRON_SECRET, this skips auth check
    // but in production Vercel requires the CRON_SECRET
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Find albums where the expiresAt date is in the past
    const now = new Date();
    const expiredAlbumsCursor = db.collection("student_photo_albums").find({
      expiresAt: { $lt: now }
    });

    const expiredAlbums = await expiredAlbumsCursor.toArray();
    let deletedAlbumsCount = 0;
    let deletedPhotosCount = 0;
    let errors: any[] = [];

    for (const album of expiredAlbums) {
      // 1. Delete all photos from Cloudinary
      let albumDeletedPhotos = 0;
      if (Array.isArray(album.photos)) {
        for (const photo of album.photos) {
          if (photo.cloudinaryPublicId) {
            try {
              await cloudinary.uploader.destroy(photo.cloudinaryPublicId);
              albumDeletedPhotos++;
            } catch (e: any) {
              console.warn(`[Cron] Cloudinary delete failed for ${photo.cloudinaryPublicId}:`, e.message);
              errors.push(`Cloudinary delete failed for ${photo.cloudinaryPublicId}`);
            }
          }
        }
      }

      // 2. Delete the album record from MongoDB
      try {
        await db.collection("student_photo_albums").deleteOne({ _id: album._id });
        
        // 3. Log it
        await db.collection("audit_log").insertOne({
          actorUid: "system-cron",
          actorName: "Auto-Cleanup Job",
          actorRole: "system",
          action: "DELETE",
          category: "photo_albums",
          targetId: album._id.toString(),
          details: `Auto-deleted expired album for ${album.childFirstName} (${album.sessionLabel}) with ${albumDeletedPhotos} photos`,
          createdAt: new Date(),
        });

        deletedAlbumsCount++;
        deletedPhotosCount += albumDeletedPhotos;
      } catch (e: any) {
        console.error(`[Cron] Failed to delete album ${album._id} from DB:`, e.message);
        errors.push(`Failed to delete album ${album._id} from DB`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cron job complete. Deleted ${deletedAlbumsCount} albums containing ${deletedPhotosCount} photos.`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("[Cron cleanup-photos error]", error);
    return NextResponse.json(
      { error: "Cron job failed", details: error.message },
      { status: 500 }
    );
  }
}
