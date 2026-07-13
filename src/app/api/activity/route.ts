import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

// GET /api/activity
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const activity = await db.collection("activity").find({}).sort({ createdAt: -1 }).toArray();

    // Seed default data if empty
    if (activity.length === 0) {
      const defaultData = [
        {
          author: "Ms. Iya",
          authorRole: "Little Explorers",
          timeAgo: "10m ago",
          content: "Morning art session was a messy success! 🎨 ✨",
          images: ["/next.svg", "/next.svg"],
          likes: 12,
          comments: 3,
          createdAt: new Date()
        },
        {
          author: "Mr. Michael",
          authorRole: "Tiny Explorers",
          timeAgo: "1h ago",
          content: "Story time with the little ones. 📚",
          images: ["/next.svg"],
          likes: 8,
          comments: 1,
          createdAt: new Date(Date.now() - 3600000)
        }
      ];
      await db.collection("activity").insertMany(defaultData);
      return NextResponse.json({ success: true, data: defaultData });
    }

    return NextResponse.json({ success: true, data: activity }, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60"
      }
    });
  } catch (error: any) {
    console.error("Failed to fetch activity:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}

// POST /api/activity
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { author, authorRole, content, images } = data;

    if (!author || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const newRecord = {
      author,
      authorRole: authorRole || "Teacher",
      content,
      images: images || [],
      timeAgo: "Just now",
      likes: 0,
      comments: 0,
      createdAt: new Date(),
    };

    const result = await db.collection("activity").insertOne(newRecord);
    return NextResponse.json({ success: true, data: { ...newRecord, _id: result.insertedId } });
  } catch (error: any) {
    console.error("Failed to create activity:", error);
    return NextResponse.json({ error: error.message || "Failed to create" }, { status: 500 });
  }
}
