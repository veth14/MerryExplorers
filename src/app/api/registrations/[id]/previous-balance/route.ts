import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid registration ID." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const amount = body && typeof body.amount === "number" ? body.amount : Number.NaN;
    if (!Number.isFinite(amount) || amount < 0 || Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001) {
      return NextResponse.json({ error: "Enter a valid balance of ₱0 or more, with up to two decimal places." }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const now = new Date();
    const result = await db.collection("student_registrations").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          previousAdventureBalance: Math.round(amount * 100) / 100,
          previousAdventureBalanceUpdatedAt: now,
          previousAdventureBalanceUpdatedBy: {
            uid: auth.user.uid,
            email: auth.user.email,
          },
        },
      }
    );

    if (!result.matchedCount) {
      return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, previousAdventureBalance: Math.round(amount * 100) / 100 });
  } catch (error) {
    console.error("[previous-adventure-balance PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update the previous adventure balance." }, { status: 500 });
  }
}
