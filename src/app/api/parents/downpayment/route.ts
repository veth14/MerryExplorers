import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { uid, paymentMethod, receiptBase64, referenceNumber, amountPaid } = data;

    if (!uid || !paymentMethod || !receiptBase64) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Save the downpayment submission on the parent's account
    await db.collection("accounts").updateOne(
      { _id: uid as any },
      {
        $set: {
          "renewalStatus.downpayment": {
            submitted: true,
            paymentMethod,
            receiptBase64,
            referenceNumber: referenceNumber || "",
            amountPaid: amountPaid || 0,
            submittedAt: new Date().toISOString(),
            verified: false,
            rejected: false,
          },
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to submit downpayment:", error);
    return NextResponse.json({ error: error.message || "Failed to submit" }, { status: 500 });
  }
}

// ─── PATCH — Admin verifies or rejects a downpayment ─────────────────────────

export async function PATCH(request: Request) {
  try {
    const data = await request.json();
    const { uid, action, adminNote } = data; // action: "verify" | "reject"

    if (!uid || !action) {
      return NextResponse.json({ error: "uid and action are required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const updateFields: Record<string, any> = {
      "renewalStatus.downpayment.verified": action === "verify",
      "renewalStatus.downpayment.rejected": action === "reject",
      "renewalStatus.downpayment.reviewedAt": new Date().toISOString(),
      "renewalStatus.downpayment.adminNote": adminNote || "",
    };

    // If verified, mark slot as secured
    if (action === "verify") {
      updateFields["renewalStatus.slotSecured"] = true;
    }

    await db.collection("accounts").updateOne(
      { _id: uid as any },
      { $set: updateFields }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to review downpayment:", error);
    return NextResponse.json({ error: error.message || "Failed to review" }, { status: 500 });
  }
}
