import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// GET /api/photo-albums/[code] — Public, no auth required
// Only returns safe fields — no student personal data beyond first name
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || code.length < 6) {
      return NextResponse.json({ error: "Invalid access code" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const album = await db
      .collection("student_photo_albums")
      .findOne({ accessCode: code.toUpperCase() });

    if (!album) {
      return NextResponse.json({ error: "Album not found or link has expired." }, { status: 404 });
    }

    // Check if expired (belt-and-suspenders; TTL index handles eventual deletion)
    if (album.expiresAt && new Date(album.expiresAt) < new Date()) {
      return NextResponse.json({ error: "This link has expired." }, { status: 410 });
    }

    // Return only safe fields — never expose parentEmail, studentRegistrationId etc.
    const safeAlbum = {
      accessCode: album.accessCode,
      childFirstName: album.childFirstName,
      childNickname: album.childNickname,
      programName: album.programName,
      classTime: album.classTime,
      sessionLabel: album.sessionLabel,
      sessionDate: album.sessionDate,
      note: album.note,
      photos: album.photos.map((p: any) => ({ url: p.url, caption: p.caption })),
      expiresAt: album.expiresAt,
      createdAt: album.createdAt,
    };

    return NextResponse.json({ success: true, data: safeAlbum });
  } catch (error: any) {
    console.error("[photo-albums/[code] GET]", error);
    return NextResponse.json({ error: "Failed to fetch album" }, { status: 500 });
  }
}
