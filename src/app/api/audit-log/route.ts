import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";

// GET /api/audit-log
// Returns audit log entries, sorted newest first.
// Optional: ?limit=50&category=announcement
export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const category = searchParams.get("category");

    const { db } = await connectToDatabase();

    const query: any = {};
    if (category) query.category = category;

    const entries = await db
      .collection("audit_log")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const mapped = entries.map((e) => ({
      ...e,
      id: e._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data: mapped }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("Failed to fetch audit log:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}

// POST /api/audit-log  — internal helper used by other API routes to write entries
export async function POST(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const data = await request.json();
    const { actorUid, actorName, actorRole, action, category, targetId, targetTitle, details } = data;

    if (!actorUid || !action || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const entry = {
      actorUid,
      actorName: actorName || "Unknown",
      actorRole: actorRole || "Unknown",
      action,       // e.g. "CREATE", "EDIT", "DELETE"
      category,     // e.g. "announcement", "suspension", "attendance"
      targetId: targetId || null,
      targetTitle: targetTitle || null,
      details: details || null,
      createdAt: new Date(),
    };

    const result = await db.collection("audit_log").insertOne(entry);
    return NextResponse.json({ success: true, id: result.insertedId.toString() });
  } catch (error: any) {
    console.error("Failed to write audit log:", error);
    return NextResponse.json({ error: error.message || "Failed to write" }, { status: 500 });
  }
}
