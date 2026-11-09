import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { v2 as cloudinary } from "cloudinary";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

type PaymentType = "session" | "downpayment" | "registration";

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const uid = String(body.uid || "").trim();
    const paymentId = String(body.paymentId || "").trim();
    const type = body.type as PaymentType;
    if (!uid || !paymentId || !["session", "downpayment", "registration"].includes(type)) {
      return NextResponse.json({ error: "A valid payment and receipt are required." }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    let publicId = "";
    let matched = false;

    if (type === "session") {
      const id = paymentId.startsWith("s-") ? paymentId.slice(2) : paymentId;
      for (const collectionName of ["parent_accounts", "accounts"]) {
        const collection = db.collection(collectionName);
        const result = await collection.updateOne(
          { _id: uid as any, sessionPayments: { $elemMatch: { id, receiptBase64: { $exists: true, $ne: "" } } } },
          { $unset: { "sessionPayments.$[payment].receiptBase64": "", "sessionPayments.$[payment].receiptPublicId": "" } },
          { arrayFilters: [{ "payment.id": id }] }
        );
        matched ||= result.matchedCount > 0;
      }
    } else if (type === "downpayment") {
      for (const collectionName of ["parent_accounts", "accounts"]) {
        const result = await db.collection(collectionName).updateOne(
          { _id: uid as any, "renewalStatus.downpayment.receiptBase64": { $exists: true, $ne: "" } },
          { $unset: { "renewalStatus.downpayment.receiptBase64": "", "renewalStatus.downpayment.receiptPublicId": "" } }
        );
        matched ||= result.matchedCount > 0;
      }
    } else {
      if (!ObjectId.isValid(uid)) return NextResponse.json({ error: "Invalid registration ID." }, { status: 400 });
      const registrationId = new ObjectId(uid);
      const registrations = db.collection("student_registrations");

      if (paymentId.startsWith("bal-")) {
        const id = paymentId.slice(4);
        const registration = await registrations.findOne({ _id: registrationId, balancePayments: { $elemMatch: { id } } });
        const payment = (registration?.balancePayments || []).find((entry: any) => String(entry.id) === id);
        if (payment?.receiptPublicId) publicId = String(payment.receiptPublicId);
        const result = await registrations.updateOne(
          { _id: registrationId, balancePayments: { $elemMatch: { id, receiptUrl: { $exists: true, $ne: "" } } } },
          { $unset: { "balancePayments.$[payment].receiptUrl": "", "balancePayments.$[payment].receiptPublicId": "" } },
          { arrayFilters: [{ "payment.id": id }] }
        );
        matched = result.matchedCount > 0;
      } else {
        const registration = await registrations.findOne({ _id: registrationId });
        if (registration?.receiptPublicId) publicId = String(registration.receiptPublicId);
        const result = await registrations.updateOne(
          { _id: registrationId, $or: [{ receiptUrl: { $exists: true, $ne: "" } }, { receiptBase64: { $exists: true, $ne: "" } }] },
          { $unset: { receiptUrl: "", receiptBase64: "", receiptPublicId: "" } }
        );
        matched = result.matchedCount > 0;
      }
    }

    if (!matched) return NextResponse.json({ error: "Receipt not found or already removed." }, { status: 404 });

    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
      } catch (error) {
        // The payment record no longer exposes the image; report cleanup failure for follow-up.
        console.error("[payment receipt DELETE] Cloudinary cleanup failed:", error);
      }
    }

    try {
      await db.collection("audit_log").insertOne({
        actorUid: auth.user.uid,
        actorName: auth.user.email || "Admin",
        actorRole: auth.user.role || "admin",
        action: "REMOVE_DUPLICATE_PAYMENT_RECEIPT",
        category: "payments",
        targetId: uid,
        details: `Removed receipt image for ${type} payment ${paymentId}. Payment details were retained.`,
        createdAt: new Date(),
      });
    } catch (auditError) {
      console.error("[payment receipt DELETE] Audit log write failed:", auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[payment receipt DELETE] Failed:", error);
    return NextResponse.json({ error: "Could not remove the receipt. Please try again." }, { status: 500 });
  }
}
