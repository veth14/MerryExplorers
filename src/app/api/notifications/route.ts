import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    const { db } = await connectToDatabase();
    
    // If userId is provided, fetch notifications for that user OR global notifications (no userId).
    // If NO userId (admin), fetch ONLY global notifications (those without a userId).
    const query = userId
      ? { $or: [{ userId }, { userId: { $exists: false } }] }
      : { userId: { $exists: false } };
    
    const notifications = await db.collection("notifications").find(query).sort({ createdAt: -1 }).toArray();
    
    // Map _id to id and compute per-user read status from readBy array
    const mapped = notifications.map(n => ({
      ...n,
      id: n._id.toString(),
      _id: undefined,
      // A notification is read for this user if their uid is in readBy array
      read: userId
        ? Array.isArray(n.readBy) ? n.readBy.includes(userId) : !!n.read
        : Array.isArray(n.readBy) ? n.readBy.length > 0 : !!n.read,
    }));
    
    return NextResponse.json({ success: true, data: mapped }, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error: any) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Body: { userId: string, ids?: string[] }
 * Marks specific notification IDs (or ALL if ids omitted) as read for that user.
 */
export async function PATCH(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const body = await request.json();
    const { userId, ids } = body as { userId: string; ids?: string[] };

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const filter: any = ids && ids.length > 0
      ? { _id: { $in: ids.map(id => new ObjectId(id)) } }
      : {}; // no filter = all notifications

    await db.collection("notifications").updateMany(
      filter,
      { $addToSet: { readBy: userId } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to mark notifications as read:", error);
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 });
  }
}
