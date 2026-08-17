import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

// GET /api/announcements
// Modes:
//   (default)   — active (now >= startDate) + upcoming (startDate in future), non-expired
//   ?all=true   — all records (admin manage view)
//   ?admin=true — all records + readCount + totalTeachers (admin stats view)
export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const { searchParams } = new URL(request.url);
    const fetchAll = searchParams.get("all") === "true";
    const adminView = searchParams.get("admin") === "true";

    const { db } = await connectToDatabase();
    
    let query: any = {};
    if (!fetchAll && !adminView) {
      // Teacher view: active + upcoming, no expired
      const now = new Date().toISOString();
      query = {
        $or: [
          // Expired check: endDate must be null, missing, or in the future
          { endDate: null },
          { endDate: { $exists: false } },
          { endDate: { $gte: now } },
        ],
      };
    }
    // fetchAll=true or admin=true → no filter, return everything

    const announcements = await db.collection("announcements").find(query).sort({ startDate: -1 }).toArray();

    let totalTeachers = 0;
    if (adminView) {
      totalTeachers = await db.collection("accounts").countDocuments({
        role: { $in: ["Lead Teacher", "Assistant Teacher", "executive assistant"] },
      });
    }

    // Map _id to id and optionally attach read stats
    const mapped = await Promise.all(
      announcements.map(async (a) => {
        const base = { ...a, id: a._id.toString(), _id: undefined };
        if (adminView) {
          const readCount = await db.collection("announcement_reads").countDocuments({
            announcementId: a._id.toString(),
          });
          return { ...base, readCount, totalTeachers };
        }
        return base;
      })
    );

    return NextResponse.json({ success: true, data: mapped }, {
      headers: {
        "Cache-Control": "no-store", // Read counts must stay fresh
      }
    });
  } catch (error: any) {
    console.error("Failed to fetch announcements:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}

// POST /api/announcements (Admin only)
export async function POST(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const data = await request.json();
    const { title, content, type, startDate, endDate, actorUid, actorName, actorRole } = data;

    if (!title || !content || !type || !startDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const newRecord = {
      title,
      content,
      type,
      startDate,
      endDate: endDate || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("announcements").insertOne(newRecord);

    // Write audit log
    if (actorUid) {
      await db.collection("audit_log").insertOne({
        actorUid,
        actorName: actorName || "Unknown",
        actorRole: actorRole || "Unknown",
        action: "CREATE",
        category: "announcement",
        targetId: result.insertedId.toString(),
        targetTitle: title,
        details: `Created announcement: "${title}"`,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ success: true, data: { ...newRecord, id: result.insertedId.toString() } });
  } catch (error: any) {
    console.error("Failed to create announcement:", error);
    return NextResponse.json({ error: error.message || "Failed to create" }, { status: 500 });
  }
}

// PUT /api/announcements (Admin only)
export async function PUT(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const data = await request.json();
    const { id, title, content, type, startDate, endDate, actorUid, actorName, actorRole } = data;

    if (!id || !title || !content || !type || !startDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const updateDoc = {
      $set: {
        title,
        content,
        type,
        startDate,
        endDate: endDate || null,
        updatedAt: new Date(),
      }
    };

    const result = await db.collection("announcements").updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    // Write audit log
    if (actorUid) {
      await db.collection("audit_log").insertOne({
        actorUid,
        actorName: actorName || "Unknown",
        actorRole: actorRole || "Unknown",
        action: "EDIT",
        category: "announcement",
        targetId: id,
        targetTitle: title,
        details: `Edited announcement: "${title}"`,
        createdAt: new Date(),
      });
    }

    const updated = await db.collection("announcements").findOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true, data: { ...updated, id: updated?._id.toString(), _id: undefined } });
  } catch (error: any) {
    console.error("Failed to update announcement:", error);
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/announcements (Admin only)
export async function DELETE(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const actorUid = searchParams.get("actorUid") || null;
    const actorName = searchParams.get("actorName") || "Unknown";
    const actorRole = searchParams.get("actorRole") || "Unknown";
    const targetTitle = searchParams.get("targetTitle") || null;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Fetch the title before deletion for the audit log
    const existing = await db.collection("announcements").findOne({ _id: new ObjectId(id) });

    const result = await db.collection("announcements").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    // Write audit log
    if (actorUid) {
      const title = existing?.title || targetTitle || "Unknown";
      await db.collection("audit_log").insertOne({
        actorUid,
        actorName,
        actorRole,
        action: "DELETE",
        category: "announcement",
        targetId: id,
        targetTitle: title,
        details: `Deleted announcement: "${title}"`,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete announcement:", error);
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 });
  }
}
