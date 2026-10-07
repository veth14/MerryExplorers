import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { sendPaymentSubmittedEmail, sendPaymentVerifiedEmail } from "@/lib/virtual-session-emails";

export const dynamic = "force-dynamic";

// POST — Parent submits a session payment (any amount, any time)
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { uid, paymentMethod, receiptBase64, referenceNumber, amountPaid } = data;

    if (!uid || !paymentMethod || !receiptBase64) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Parents can pay any amount, but it has to be a real positive number.
    const amount = Math.round(Number(amountPaid) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Please enter a valid amount greater than zero." }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const account = await db.collection("accounts").findOne({ _id: uid as any });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const payment = {
      id: crypto.randomUUID(),
      paymentMethod,
      receiptBase64,
      referenceNumber: referenceNumber || "",
      amountPaid: amount,
      submittedAt: new Date().toISOString(),
      verified: false,
      rejected: false,
      adminNote: "",
    };

    // Submitting a payment no longer touches needsSessionPayment: families are not blocked.
    await db.collection("accounts").updateOne(
      { _id: uid as any },
      { $push: { sessionPayments: payment } as any }
    );

    // Send confirmation email (non-fatal)
    if (account.email) {
      try {
        await sendPaymentSubmittedEmail(account.email, account.fullName || account.email, payment.amountPaid);
      } catch (emailErr: any) {
        console.error("[session-payment POST] Email failed:", emailErr.message);
      }
    }

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    console.error("Failed to submit session payment:", error);
    return NextResponse.json({ error: error.message || "Failed to submit" }, { status: 500 });
  }
}

// GET — Fetch session payment history for a parent
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const account = await db.collection("accounts").findOne({ _id: uid as any });

    return NextResponse.json({
      success: true,
      payments: [...(account?.sessionPayments || [])].reverse(),
    });
  } catch (error: any) {
    console.error("Failed to fetch session payments:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}

// PATCH — Admin verifies or rejects a session payment
export async function PATCH(request: Request) {
  try {
    const data = await request.json();
    const { uid, paymentId, action, adminNote } = data;

    if (!uid || !paymentId || !action) {
      return NextResponse.json({ error: "uid, paymentId, and action are required" }, { status: 400 });
    }
    if (action !== "verify" && action !== "reject") {
      return NextResponse.json({ error: "action must be 'verify' or 'reject'" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const result = await db.collection("accounts").updateOne(
      { _id: uid as any, "sessionPayments.id": paymentId },
      {
        $set: {
          "sessionPayments.$.verified": action === "verify",
          "sessionPayments.$.rejected": action === "reject",
          "sessionPayments.$.reviewedAt": new Date().toISOString(),
          "sessionPayments.$.adminNote": adminNote || "",
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // If verified, email the parent
    if (action === "verify") {
      const account = await db.collection("accounts").findOne({ _id: uid as any });
      if (account?.email) {
        try {
          await sendPaymentVerifiedEmail(account.email, account.fullName || account.email);
        } catch (emailErr: any) {
          console.error("[session-payment PATCH] Email failed:", emailErr.message);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to review session payment:", error);
    return NextResponse.json({ error: error.message || "Failed to review" }, { status: 500 });
  }
}