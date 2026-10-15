import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId, type Db } from "mongodb";
import {
  RENEWAL_STATUSES,
  childFullName,
  computeTuition,
  isAdmin,
  loadPricingContext,
  normName,
  totalPaid,
} from "@/lib/renewals";

export const dynamic = "force-dynamic";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isReleased = (reg: any) =>
  reg.renewalStatus === "released" || reg.status === "expired" || reg.status === "rejected";

// Find the matching renewal_families docs using the SAME rules GET uses:
// case-insensitive email + whitespace/case-insensitive child name.
async function findFamilies(db: Db, reg: any) {
  const email = (reg.parentInfo?.email || "").trim();
  const child = childFullName(reg);
  if (!email || !child) return [];
  const candidates = await db
    .collection("renewal_families")
    .find({ parentEmail: { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") } })
    .toArray();
  return candidates.filter((f) => normName(f.childName) === normName(child));
}

async function syncFamilyStatus(db: Db, reg: any, status: string) {
  const families = await findFamilies(db, reg);
  if (families.length === 0) return;
  await db.collection("renewal_families").updateMany(
    { _id: { $in: families.map((f) => f._id) } },
    { $set: { renewalStatus: status, updatedAt: new Date() } }
  );
}

// PATCH /api/renewals/[id] - Record payment or update renewal status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
    }

    const body = await request.json();
    const { action, amountPaid, paymentMethod, referenceNumber, receiptUrl, notes, newStatus } = body;

    if (!["record_payment", "update_status", "release_slot"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const _id = new ObjectId(id);

    const reg = await db.collection("student_registrations").findOne({ _id });
    if (!reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    // ── ACTION 1: RECORD PAYMENT ───────────────────────────────────────────
    if (action === "record_payment") {
      const addedAmount = Number(amountPaid);
      if (!Number.isFinite(addedAmount) || addedAmount <= 0) {
        return NextResponse.json({ error: "Please enter a valid positive payment amount." }, { status: 400 });
      }

      // Don't silently revive a released slot (it may now be taken by someone else).
      if (isReleased(reg)) {
        return NextResponse.json(
          { error: "This slot was released. Restore it first, then record the payment." },
          { status: 409 }
        );
      }

      // Block double-recording the same reference number
      const ref = (referenceNumber || "").trim();
      if (
        ref &&
        Array.isArray(reg.balancePayments) &&
        reg.balancePayments.some((b: any) => (b.referenceNumber || "").trim() === ref)
      ) {
        return NextResponse.json(
          { error: `A payment with reference ${ref} is already recorded.` },
          { status: 409 }
        );
      }

      // Same pricing rules as GET (customRate / pioneer rate / amountDue / program rate)
      const ctx = await loadPricingContext(db);
      const families = await findFamilies(db, reg);
      const { totalTuition, expectedDownpayment } = computeTuition(
        reg,
        ctx,
        families.some((f) => f.isPioneer)
      );

      if (totalTuition <= 0) {
        return NextResponse.json(
          { error: "Tuition is not set for this registration. Set the rate before recording payment." },
          { status: 400 }
        );
      }

      const now = new Date();
      const entry = {
        id: new ObjectId().toString(),
        amountPaid: addedAmount,
        paymentMethod: paymentMethod || "manual",
        referenceNumber: ref,
        receiptUrl: receiptUrl || "",
        paidOn: now.toISOString(),
        recordedAt: now.toISOString(),
        verified: true,
        adminNote: notes || "Recorded via Renewals page",
      };

      const newTotalPaid = totalPaid(reg) + addedAmount;
      const downpaymentMet = newTotalPaid >= expectedDownpayment;

      const $set: Record<string, any> = {
        paymentMethod: reg.paymentMethod || paymentMethod || "manual",
        updatedAt: now,
      };

      let resultingStatus: string;
      if (downpaymentMet) {
        resultingStatus = "confirmed";
        $set.renewalStatus = "confirmed";
        $set.status = "approved";
        $set.manualHold = false;
        if (!reg.approvedAt) $set.approvedAt = now;
      } else {
        // Partial payment: keep the current state (e.g. for_release stays for_release)
        resultingStatus = reg.renewalStatus || "reserved";
        $set.renewalStatus = resultingStatus;
      }

      await db.collection("student_registrations").updateOne(
        { _id },
        { $push: { balancePayments: entry } as any, $set }
      );

      if (downpaymentMet) await syncFamilyStatus(db, reg, "confirmed");

      return NextResponse.json({
        success: true,
        message: downpaymentMet
          ? "Payment recorded. Downpayment met, so the slot is now confirmed."
          : "Payment recorded. Downpayment not yet met.",
        data: { newTotalPaid, expectedDownpayment, totalTuition, status: resultingStatus },
      });
    }

    // ── ACTION 2: UPDATE STATUS / RELEASE SLOT ─────────────────────────────
    const targetStatus: string = action === "release_slot" ? "released" : newStatus;

    if (!(RENEWAL_STATUSES as readonly string[]).includes(targetStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Use one of: ${RENEWAL_STATUSES.join(", ")}.` },
        { status: 400 }
      );
    }

    const now = new Date();
    const $set: Record<string, any> = {
      renewalStatus: targetStatus,
      updatedAt: now,
      // Admin explicitly holding a slot must not be auto-flagged for release by GET after the deadline
      manualHold: targetStatus === "reserved",
    };

    if (targetStatus === "released") {
      $set.status = "expired";
    } else if (targetStatus === "confirmed") {
      $set.status = "approved";
      if (!reg.approvedAt) $set.approvedAt = now;
    } else if (targetStatus === "reserved") {
      $set.status = "reserved";
    } else if (targetStatus === "for_release") {
      // GET treats status "expired"/"rejected" as released, so restoring to for_release must clear it
      if (reg.status === "expired" || reg.status === "rejected") $set.status = "reserved";
    }

    await db.collection("student_registrations").updateOne({ _id }, { $set });
    await syncFamilyStatus(db, reg, targetStatus);

    return NextResponse.json({ success: true, newStatus: targetStatus });
  } catch (error: any) {
    console.error("[renewals PATCH]", error);
    return NextResponse.json({ error: "Failed to update renewal" }, { status: 500 });
  }
}