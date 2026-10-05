import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const { uid, title, url, type } = await request.json();
    if (!uid || !title || !url) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { db } = await connectToDatabase();
    const newMaterial = { id: crypto.randomUUID(), title, url, type, createdAt: new Date().toISOString() };
    
    await db.collection("accounts").updateOne(
      { _id: uid },
      { $push: { studyMaterials: newMaterial } as any }
    );
    
    const account = await db.collection("accounts").findOne({ _id: uid });
    return NextResponse.json({ success: true, studyMaterials: account?.studyMaterials || [] });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to add material" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { uid, materialId } = await request.json();
    if (!uid || !materialId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { db } = await connectToDatabase();
    await db.collection("accounts").updateOne(
      { _id: uid },
      { $pull: { studyMaterials: { id: materialId } } as any }
    );
    
    const account = await db.collection("accounts").findOne({ _id: uid });
    return NextResponse.json({ success: true, studyMaterials: account?.studyMaterials || [] });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete material" }, { status: 500 });
  }
}
