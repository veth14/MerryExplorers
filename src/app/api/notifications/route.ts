import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    const { db } = await connectToDatabase();
    
    // If userId is provided, fetch notifications for that user OR global notifications (no userId)
    const query = userId ? { $or: [{ userId }, { userId: { $exists: false } }] } : {};
    
    const notifications = await db.collection("notifications").find(query).sort({ createdAt: -1 }).toArray();
    
    // Map _id to id
    const mapped = notifications.map(n => ({
      ...n,
      id: n._id.toString(),
      _id: undefined
    }));
    
    return NextResponse.json({ success: true, data: mapped }, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60"
      }
    });
  } catch (error: any) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}
