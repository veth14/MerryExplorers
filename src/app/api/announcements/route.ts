import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

// GET /api/announcements
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    // Sort by most recent first
    const announcements = await db.collection("announcements").find({}).sort({ createdAt: -1 }).toArray();

    // If empty, return a default set based on the static data for the demo
    if (announcements.length === 0) {
      const defaultData = [
        {
          title: "Fire Drill Practice Tomorrow",
          timeAgo: "2 hrs ago", // We'll store strings for demo simplicity, or timestamps
          content: "Please ensure all toddlers are familiarized with the exit routes. Practice will be at 10:30 AM.",
          type: "alert",
          createdAt: new Date()
        },
        {
          title: "Staff Meeting Moved",
          timeAgo: "Yesterday",
          content: "The Friday staff meeting has been moved to Thursday afternoon during nap time (1:00 PM) in the main hall.",
          type: "info",
          createdAt: new Date(Date.now() - 86400000) // 1 day ago
        },
      ];
      await db.collection("announcements").insertMany(defaultData);
      return NextResponse.json({ success: true, data: defaultData });
    }

    return NextResponse.json({ success: true, data: announcements }, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60"
      }
    });
  } catch (error: any) {
    console.error("Failed to fetch announcements:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}

// POST /api/announcements (Admin only)
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { title, content, type } = data;

    if (!title || !content || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const newRecord = {
      title,
      content,
      type,
      timeAgo: "Just now", // In a real app, compute this on the frontend using createdAt
      createdAt: new Date(),
    };

    const result = await db.collection("announcements").insertOne(newRecord);
    return NextResponse.json({ success: true, data: { ...newRecord, _id: result.insertedId } });
  } catch (error: any) {
    console.error("Failed to create announcement:", error);
    return NextResponse.json({ error: error.message || "Failed to create" }, { status: 500 });
  }
}
