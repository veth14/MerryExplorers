import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { PROGRAM_SLOTS } from "@/data/landing";

export const dynamic = "force-dynamic";

// PATCH /api/renewals/[id] - Record payment or update renewal status (2-way sync)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
    }

    const body = await request.json();
    const {
      action, // "record_payment" | "update_status" | "release_slot"
      amountPaid,
      paymentMethod,
      referenceNumber,
      receiptUrl,
      notes,
      newStatus, // "reserved" | "confirmed" | "for_release" | "released"
    } = body;

    const { db } = await connectToDatabase();

    const reg = await db.collection("student_registrations").findOne({ _id: new ObjectId(id) });
    if (!reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    // ── ACTION 1: RECORD PAYMENT ─────────────────────────────────────────────
    if (action === "record_payment") {
      const addedAmount = Number(amountPaid);
      if (isNaN(addedAmount) || addedAmount <= 0) {
        return NextResponse.json({ error: "Please enter a valid positive payment amount." }, { status: 400 });
      }

      const balancePaymentEntry = {
        id: new ObjectId().toString(),
        amountPaid: addedAmount,
        paymentMethod: paymentMethod || "manual",
        referenceNumber: referenceNumber || "",
        receiptUrl: receiptUrl || "",
        paidOn: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
        verified: true,
        adminNote: notes || "Recorded via Renewals page",
      };

      const progDef = (PROGRAM_SLOTS as Record<string, any>)[reg.program];
      const totalTuition = Number(reg.amountDue || (progDef ? progDef.rate : 0)) || 0;
      const downpaymentRequired = Math.round(totalTuition * 0.6) || (progDef ? progDef.downpayment : 0);

      const existingBalanceTotal = Array.isArray(reg.balancePayments)
        ? reg.balancePayments.reduce((s: number, b: any) => s + (Number(b.amountPaid) || 0), 0)
        : 0;
      const initialPaid = Number(reg.amountPaid) || 0;
      const newTotalPaid = initialPaid + existingBalanceTotal + addedAmount;

      // Status becomes confirmed once 60% downpayment is received
      const isDownpaymentMet = newTotalPaid >= downpaymentRequired;
      const updatedStatus = isDownpaymentMet ? "approved" : reg.status;
      const updatedRenewalStatus = isDownpaymentMet ? "confirmed" : "reserved";

      await db.collection("student_registrations").updateOne(
        { _id: new ObjectId(id) },
        {
          $push: { balancePayments: balancePaymentEntry } as any,
          $set: {
            status: updatedStatus,
            renewalStatus: updatedRenewalStatus,
            paymentMethod: reg.paymentMethod || paymentMethod || "manual",
            updatedAt: new Date(),
          },
        }
      );

      // Match and update renewal_families list record as well
      const childFull = `${reg.childInfo?.firstName || ""} ${reg.childInfo?.lastName || ""}`.trim();
      const parentEmail = (reg.parentInfo?.email || "").toLowerCase();
      if (parentEmail && childFull) {
        await db.collection("renewal_families").updateOne(
          {
            parentEmail,
            childName: { $regex: new RegExp(`^${childFull.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          },
          {
            $set: {
              renewalStatus: updatedRenewalStatus,
              updatedAt: new Date(),
            },
          }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Payment successfully recorded and synced across Renewals and Payments pages.",
        data: {
          newTotalPaid,
          status: updatedRenewalStatus,
        },
      });
    }

    // ── ACTION 2: UPDATE STATUS ──────────────────────────────────────────────
    if (action === "update_status" || action === "release_slot") {
      const targetStatus = action === "release_slot" ? "released" : newStatus;

      const updateData: Record<string, any> = {
        renewalStatus: targetStatus,
        updatedAt: new Date(),
      };

      if (targetStatus === "released") {
        updateData.status = "expired";
      } else if (targetStatus === "confirmed") {
        updateData.status = "approved";
      } else if (targetStatus === "reserved") {
        updateData.status = "reserved";
      }

      await db.collection("student_registrations").updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      // Sync to renewal_families
      const childFull = `${reg.childInfo?.firstName || ""} ${reg.childInfo?.lastName || ""}`.trim();
      const parentEmail = (reg.parentInfo?.email || "").toLowerCase();
      if (parentEmail && childFull) {
        await db.collection("renewal_families").updateOne(
          {
            parentEmail,
            childName: { $regex: new RegExp(`^${childFull.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          },
          {
            $set: {
              renewalStatus: targetStatus,
              updatedAt: new Date(),
            },
          }
        );
      }

      return NextResponse.json({ success: true, newStatus: targetStatus });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[renewals PATCH]", error);
    return NextResponse.json({ error: error.message || "Failed to update renewal" }, { status: 500 });
  }
}
