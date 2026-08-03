import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

/**
 * GET /api/announcements/read?uid=<teacherUid>&ids=id1,id2,id3
 * Returns the subset of the given announcement IDs that this teacher has already read.
 */
export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const teacherUid = searchParams.get("uid");
    const idsParam = searchParams.get("ids");

    if (!teacherUid || !idsParam) {
      return NextResponse.json({ success: true, readIds: [] });
    }

    const ids = idsParam.split(",").filter(Boolean);
    const { db } = await connectToDatabase();

    const reads = await db.collection("announcement_reads").find({
      teacherUid,
      announcementId: { $in: ids },
    }).toArray();

    const readIds = reads.map((r) => r.announcementId as string);
    return NextResponse.json({ success: true, readIds });
  } catch (error: any) {
    console.error("Failed to fetch read status:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}

/**
 * POST /api/announcements/read
 * Body: { uid: string, announcementId: string }
 * Marks a single announcement as read for this teacher (upsert — safe to call multiple times).
 */
export async function POST(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const body = await request.json();
    const { uid, announcementId } = body;

    if (!uid || !announcementId) {
      return NextResponse.json({ error: "Missing uid or announcementId" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    await db.collection("announcement_reads").updateOne(
      { teacherUid: uid, announcementId },
      { $setOnInsert: { teacherUid: uid, announcementId, readAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to mark as read:", error);
    return NextResponse.json({ error: error.message || "Failed to mark read" }, { status: 500 });
  }
}
