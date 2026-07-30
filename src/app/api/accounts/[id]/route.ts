import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const { db } = await connectToDatabase();

    // Try matching by string _id (Firebase UID stored as MongoDB _id)
    let account = await db.collection("accounts").findOne({ _id: id as any });

    // Fallback: try ObjectId in case the document was created differently
    if (!account) {
      try {
        account = await db.collection("accounts").findOne({ _id: new ObjectId(id) });
      } catch {
        // id is not a valid ObjectId, ignore
      }
    }

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Dynamically compute 'on-leave' status
    const today = new Date().toISOString().split("T")[0];
    const activeLeave = await db.collection("leaves").findOne({
      teacherId: id,
      status: "Approved",
      startDate: { $lte: today },
      endDate: { $gte: today }
    });

    let status = account.status;
    if (activeLeave) {
      status = "on-leave";
    } else if (status === "on-leave") {
      status = "active";
    }

    return NextResponse.json({ ...account, id: account._id?.toString() ?? id, status }, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60"
      }
    });
  } catch (error) {
    console.error("Failed to fetch account:", error);
    return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 });
  }
}


export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const data = await request.json();
    const { id: _, _id: __, ...updateData } = data; // don't update ID fields

    const { db } = await connectToDatabase();

    const result = await db.collection("accounts").updateOne(
      { _id: id as any },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update account:", error);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const { db } = await connectToDatabase();

    const result = await db.collection("accounts").deleteOne({ _id: id as any });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete account:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
