import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const cutoffValue = searchParams.get("cutoffValue");

    if (!cutoffValue) {
      return NextResponse.json({ error: "Missing cutoffValue" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const statusDoc = await db.collection("payroll_status").findOne({ cutoffValue });

    return NextResponse.json({
      success: true,
      isPaid: statusDoc?.isPaid || false,
      paidAt: statusDoc?.paidAt || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch payroll status" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const data = await request.json();
    const { cutoffValue, isPaid } = data;

    if (!cutoffValue || typeof isPaid !== "boolean") {
      return NextResponse.json({ error: "Missing cutoffValue or isPaid" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    await db.collection("payroll_status").updateOne(
      { cutoffValue },
      {
        $set: {
          cutoffValue,
          isPaid,
          paidAt: isPaid ? new Date() : null,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, isPaid });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update payroll status" }, { status: 500 });
  }
}
