import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

// GET /api/students — Admin only
export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { db } = await connectToDatabase();
    const url = new URL(request.url);
    const program = url.searchParams.get("program");

    const query = program && program !== "all" ? { program } : {};
    const students = await db
      .collection("students")
      .find(query)
      .sort({ enrolledAt: -1 })
      .toArray();

    const formatted = students.map((s) => ({
      ...s,
      id: s._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("[students GET]", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

// GET /api/students/[id] — handled separately; this also supports fetching a single student by registrationId
export async function DELETE(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    await db.collection("students").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 });
  }
}
