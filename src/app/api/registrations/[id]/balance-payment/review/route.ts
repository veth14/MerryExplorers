import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth-guard";
import { allocateBalancePayment } from "@/lib/balance-payment";
import { calcRegistrationTerms, FALLBACK_PIONEER_RATES, getManilaTodayIso, getRegistrationAdventureStart, getRegistrationTotal, getStudentSessionInfo, isRegistrationVerified } from "@/lib/payment-terms";
import { pioneerEmailQuery } from "@/lib/pioneer-families";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const paymentId = String(body.paymentId || "").trim();
    const action = body.action;
    const adminNote = String(body.adminNote || "").trim();
    if (!paymentId || !["verify", "reject"].includes(action)) {
      return NextResponse.json({ error: "A payment ID and a valid review action are required." }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const registrations = db.collection("student_registrations");
    const registration = await registrations.findOne({ _id: new ObjectId(id) });
    if (!registration) return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    if (!["approved", "active"].includes(registration.status)) {
      return NextResponse.json({ error: "Only approved registrations can have a balance payment reviewed." }, { status: 409 });
    }

    const payment = (registration.balancePayments || []).find((item: any) => String(item.id) === paymentId);
    if (!payment) return NextResponse.json({ error: "Balance payment not found" }, { status: 404 });
    if (payment.verified === true || payment.rejected === true) {
      return NextResponse.json({ error: "This balance payment has already been reviewed." }, { status: 409 });
    }

    const now = new Date();
    const match = {
      _id: new ObjectId(id),
      status: { $in: ["approved", "active"] },
      balancePayments: { $elemMatch: { id: paymentId, verified: { $ne: true }, rejected: { $ne: true } } },
    };

    if (action === "reject") {
      const result = await registrations.updateOne(match, {
        $set: {
          "balancePayments.$.verified": false,
          "balancePayments.$.rejected": true,
          "balancePayments.$.adminNote": adminNote,
          "balancePayments.$.reviewedAt": now,
          "balancePayments.$.reviewedBy": auth.user.uid,
        },
      });
      if (!result.matchedCount) return NextResponse.json({ error: "This payment changed while it was being reviewed. Refresh and try again." }, { status: 409 });
      return NextResponse.json({ success: true });
    }

    const parentEmail = String(registration.parentInfo?.email || "").trim().toLowerCase();
    const pioneerFamily = parentEmail ? await db.collection("pioneer_families").findOne(pioneerEmailQuery(parentEmail)) : null;
    const isPioneer = Boolean(registration.isPioneer || pioneerFamily);
    const pioneerSettings = await db.collection("settings").findOne({ _key: "pioneer_settings_v1" });
    const pioneerRate = Number(pioneerSettings?.pioneerPrices?.[registration.program]) || FALLBACK_PIONEER_RATES[registration.program];
    const pricedRegistration = {
      ...registration,
      isPioneer,
      ...(isPioneer && pioneerRate ? { customRate: pioneerRate } : {}),
    };
    const escapedEmail = parentEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parentAccount = parentEmail
      ? await db.collection("accounts").findOne({ email: { $regex: `^${escapedEmail}$`, $options: "i" } })
      : null;
    const renewalSettings = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
    const adventureStart = getRegistrationAdventureStart(renewalSettings?.programs || [], registration, getManilaTodayIso());
    const student = getStudentSessionInfo(registration, parentAccount, adventureStart);
    const paidVerified = isRegistrationVerified(registration.status) ? Number(registration.amountPaid || registration.amountDue || 0) : 0;
    const fallbackTotal = (getRegistrationTotal({ ...pricedRegistration, uniformOrdered: false }, Number(registration.amountDue) || 0) || 0)
      + (registration.uniformOrdered ? 650 : 0);
    const paidOn = payment.paidOn ? new Date(payment.paidOn) : payment.submittedAt ? new Date(payment.submittedAt) : now;
    const terms = calcRegistrationTerms(pricedRegistration, student, paidVerified, fallbackTotal, paidOn);
    const allocation = allocateBalancePayment(terms, Number(payment.amountPaid), false);
    if (!allocation.ok) return NextResponse.json({ error: allocation.error || "This payment cannot be applied to the current balance." }, { status: 409 });

    const amountPaidTotal = Math.round((paidVerified + Number(payment.amountPaid)) * 100) / 100;
    const creditBalance = Math.round(((Number(registration.creditBalance) || 0) + allocation.creditAdded) * 100) / 100;
    const result = await registrations.updateOne(match, {
      $set: {
        amountPaid: amountPaidTotal,
        creditBalance,
        "balancePayments.$.verified": true,
        "balancePayments.$.rejected": false,
        "balancePayments.$.adminNote": adminNote,
        "balancePayments.$.reviewedAt": now,
        "balancePayments.$.reviewedBy": auth.user.uid,
        "balancePayments.$.balanceBefore": allocation.balanceBefore,
        "balancePayments.$.interestAtTime": allocation.interest,
        "balancePayments.$.totalPayableAtTime": allocation.totalPayable,
        "balancePayments.$.balanceAfter": allocation.balanceAfter,
        "balancePayments.$.interestWaived": 0,
        "balancePayments.$.creditAdded": allocation.creditAdded,
      },
    });
    if (!result.matchedCount) return NextResponse.json({ error: "This payment changed while it was being reviewed. Refresh and try again." }, { status: 409 });

    await db.collection("audit_log").insertOne({
      actorUid: auth.user.uid,
      actorName: auth.user.email || "Admin",
      actorRole: auth.user.role || "admin",
      action: "VERIFY_BALANCE_PAYMENT",
      category: "payments",
      targetId: id,
      details: `Verified balance payment ₱${Number(payment.amountPaid).toLocaleString()} for ${registration.childInfo?.firstName || "student"} (ref ${payment.referenceNumber || "—"}).`,
      createdAt: now,
    });
    return NextResponse.json({ success: true, amountPaidTotal, balanceAfter: allocation.balanceAfter, totalPayable: allocation.totalPayable });
  } catch (error: any) {
    console.error("[balance-payment review] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to review balance payment" }, { status: 500 });
  }
}
