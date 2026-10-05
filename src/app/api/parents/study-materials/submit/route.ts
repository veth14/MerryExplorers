import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { uid, materialId, key, fileName, fileType, size } = data;

    if (!uid || !materialId || !key) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const submission = {
      key,
      fileName,
      fileType,
      size,
      submittedAt: new Date().toISOString(),
    };

    const result = await db.collection("accounts").updateOne(
      { _id: uid as any, "studyMaterials.id": materialId },
      { 
        $set: {
          "studyMaterials.$.submission": submission
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Material or account not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, submission });
  } catch (error: any) {
    console.error("Failed to submit work:", error);
    return NextResponse.json({ error: "Failed to submit work" }, { status: 500 });
  }
}
