import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { v2 as cloudinary } from "cloudinary";
import { isReturningFamilyRecord } from "@/lib/returning-family";
import { requireAdmin } from "@/lib/auth-guard";
import { calcRegistrationTerms, FALLBACK_PIONEER_RATES, getManilaTodayIso, getRegistrationAdventureStart, getRegistrationTotal, getStudentSessionInfo, isRegistrationVerified } from "@/lib/payment-terms";
import { getHolidaySkipSet } from "@/lib/get-holiday-skip-set";
import { pioneerEmailQuery } from "@/lib/pioneer-families";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function extractCloudinaryPublicId(url?: string | null): string | null {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com")) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
  return match?.[1] || null;
}

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const registration = await db.collection("student_registrations").findOne({
      _id: new ObjectId(id)
    });

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const inferredReturningFamily = registration.isNewFamily === false || Boolean(
      registration.isPioneer || registration.parentInfo?.isRenewal || await isReturningFamilyRecord(db, registration, id)
    );
    const isNewFamily = typeof registration.familyTypeOverride === "boolean"
      ? registration.familyTypeOverride
      : !inferredReturningFamily;
    const isReturningFamily = !isNewFamily;
    const parentEmail = String(registration.parentInfo?.email || "").trim().toLowerCase();
    const pioneerFamily = parentEmail
      ? await db.collection("pioneer_families").findOne(pioneerEmailQuery(parentEmail))
      : null;
    const isPioneer = Boolean(registration.isPioneer || pioneerFamily);
    const pioneerSettings = await db.collection("settings").findOne({ _key: "pioneer_settings_v1" });
    const pioneerRate = Number(pioneerSettings?.pioneerPrices?.[registration.program]) || FALLBACK_PIONEER_RATES[registration.program];
    const pricingRegistration = {
      ...registration,
      isPioneer,
      isNewFamily,
      ...(isPioneer && pioneerRate ? { customRate: pioneerRate } : {}),
      welcomeKitOrdered: isReturningFamily ? false : registration.welcomeKitOrdered,
    };
    const parentAccount = parentEmail
      ? await db.collection("accounts").findOne({ email: { $regex: `^${parentEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } })
      : null;
    const renewalSettings = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
    const adventureStart = getRegistrationAdventureStart(renewalSettings?.programs || [], registration, getManilaTodayIso());
    const student = getStudentSessionInfo(registration, parentAccount, adventureStart);
    const paidVerified = isRegistrationVerified(registration.status)
      ? Number(registration.amountPaid || registration.amountDue || 0)
      : 0;
    const prevAdventureBal = typeof registration.previousAdventureBalance === "number"
      ? registration.previousAdventureBalance
      : 0;
    // Deduct previous adventure unpaid balance first from the receipt payment
    const paidToPrevious = Math.min(paidVerified, prevAdventureBal);
    const appliedToCurrentSession = Math.max(0, paidVerified - paidToPrevious);
    const fallbackTotal = (getRegistrationTotal({ ...pricingRegistration, uniformOrdered: false }, Number(registration.amountDue) || 0) || 0)
      + (registration.uniformOrdered ? 650 : 0);
    const skipDates = await getHolidaySkipSet(db);
    const terms = calcRegistrationTerms(pricingRegistration, student, appliedToCurrentSession, fallbackTotal, new Date(), skipDates, renewalSettings?.programs || []);
    const remainingPrevious = Math.max(0, prevAdventureBal - paidToPrevious);
    const sessionBalance = terms.balance;
    const totalBalance = sessionBalance != null ? sessionBalance + remainingPrevious : (remainingPrevious > 0 ? remainingPrevious : null);
    const totalPayable = terms.totalPayable != null ? terms.totalPayable + remainingPrevious : totalBalance;
    const balanceInfo = isRegistrationVerified(registration.status) && totalBalance != null
      ? {
          total: terms.due,
          paid: paidVerified,
          paidToPrevious,
          appliedToCurrentSession,
          sessionBalance,
          previousAdventureBalance: remainingPrevious,
          originalPreviousAdventureBalance: prevAdventureBal,
          balance: totalBalance,
          interest: terms.interest,
          weeksOfInterest: terms.mondays,
          totalPayable,
          dueDate: terms.dueDate,
          interestStart: terms.interestStart,
        }
      : null;
    const reservationIsExpired = registration.status === "expired" || (
      registration.status === "reserved" &&
      registration.reservedUntil &&
      new Date(registration.reservedUntil).getTime() <= Date.now()
    );

    // Reveal the registration email only on an expired reservation so the two parents can identify the record.
    const publicData = {
      id: registration._id.toString(),
      status: registration.status,
      customDueDate: registration.customDueDate || null,
      downpaymentDeferred: Boolean(registration.downpaymentDeferred),
      downpaymentStartDate: registration.downpaymentStartDate || null,
      adventureNumber: registration.adventureNumber || null,
      childName: registration.childInfo?.firstName || null,
      ...(reservationIsExpired ? { parentEmail: String(registration.parentInfo?.email || "").trim() } : {}),
      program: registration.program,
      classTime: registration.classTime,
      reservedUntil: registration.reservedUntil,
      paymentDeadline: registration.paymentDeadline || null,
      earlyBirdBy: registration.earlyBirdBy || null,
      isNewFamily,
      uniformOrdered: registration.uniformOrdered || false,
      lanyardOrdered: registration.lanyardOrdered || false,
      welcomeKitOrdered: isReturningFamily ? false : registration.welcomeKitOrdered || false,
      isPioneer,
      customRate: isPioneer && pioneerRate ? pioneerRate : registration.customRate || null,
      amountDue: registration.amountDue || null,
      amountPaid: paidVerified,
      balanceInfo,
    };

    return NextResponse.json({ success: true, data: publicData });
  } catch (error: any) {
    console.error("[registrations GET id] Error:", error);
    return NextResponse.json({ error: "Failed to fetch registration" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const updateFields: Record<string, any> = {};

    if (typeof body.isNewFamily === "boolean") {
      updateFields.isNewFamily = body.isNewFamily;
      updateFields.familyTypeOverride = body.isNewFamily;
      if (!body.isNewFamily) {
        updateFields.welcomeKitOrdered = false;
      }
    }

    if (typeof body.selfDeclaredPreviousAdventure === "boolean") {
      updateFields.selfDeclaredPreviousAdventure = body.selfDeclaredPreviousAdventure;
      if (body.selfDeclaredPreviousAdventure) {
        updateFields.isNewFamily = false;
        updateFields.familyTypeOverride = false;
        updateFields.welcomeKitOrdered = false;
      }
    }

    if (body.customDueDate !== undefined) {
      const val = body.customDueDate;
      if (!val || val === "") {
        updateFields.customDueDate = null;
      } else if (typeof val === "string") {
        const trimmed = val.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          return NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD." }, { status: 400 });
        }
        updateFields.customDueDate = trimmed;
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const result = await db.collection("student_registrations").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );
    if (!result.matchedCount) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ...updateFields,
    });
  } catch (error: any) {
    console.error("[registrations PATCH family type] Error:", error);
    return NextResponse.json({ error: "Failed to update family type" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
    }

    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const action = body.action || url.searchParams.get("action") || (url.searchParams.get("permanent") === "true" ? "delete" : "void");
    const reason = body.reason || url.searchParams.get("reason") || "Voided by admin";
    const actorName = body.actorName || (auth as any).user?.name || (auth as any).user?.email || "Admin";
    const actorUid = body.actorUid || (auth as any).user?.uid || "";

    const { db } = await connectToDatabase();
    const registration = await db.collection("student_registrations").findOne({ _id: new ObjectId(id) });
    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const childName = `${registration.childInfo?.firstName || ""} ${registration.childInfo?.lastName || ""}`.trim() || "Explorer";

    if (action === "delete") {
      // 1. Clean up Cloudinary assets (receipt, signature, balance payments) if not shared by other registrations
      try {
        const publicIdsToCheck: string[] = [];
        const regReceiptPid = registration.receiptPublicId || extractCloudinaryPublicId(registration.receiptUrl);
        if (regReceiptPid) publicIdsToCheck.push(regReceiptPid);

        const regSigPid = registration.signaturePublicId || extractCloudinaryPublicId(registration.signatureUrl);
        if (regSigPid) publicIdsToCheck.push(regSigPid);

        if (Array.isArray(registration.balancePayments)) {
          for (const bp of registration.balancePayments) {
            const bpPid = bp.receiptPublicId || extractCloudinaryPublicId(bp.receiptUrl);
            if (bpPid) publicIdsToCheck.push(bpPid);
          }
        }

        const uniquePids = [...new Set(publicIdsToCheck)];
        for (const pid of uniquePids) {
          // Verify no other registration references this same public ID or URL
          const sharedCount = await db.collection("student_registrations").countDocuments({
            _id: { $ne: new ObjectId(id) },
            $or: [
              { receiptPublicId: pid },
              { signaturePublicId: pid },
              { "balancePayments.receiptPublicId": pid },
              { receiptUrl: { $regex: pid } },
              { signatureUrl: { $regex: pid } },
            ],
          });
          if (sharedCount === 0) {
            await cloudinary.uploader.destroy(pid, { resource_type: "image" }).catch((cErr) => {
              console.warn(`[registrations DELETE] Failed to destroy Cloudinary image ${pid}:`, cErr?.message || cErr);
            });
          }
        }
      } catch (cloudinaryErr) {
        console.error("[registrations DELETE] Error cleaning up Cloudinary assets:", cloudinaryErr);
      }

      // 2. Permanently delete from student_registrations
      await db.collection("student_registrations").deleteOne({ _id: new ObjectId(id) });

      // 3. Remove any student record created by this registration
      await db.collection("students").deleteMany({ registrationId: id });

      // 3. If linked to a renewal family, relink to any remaining active registration or reset
      if (registration.familyId) {
        const otherActive = await db.collection("student_registrations").findOne({
          familyId: registration.familyId,
          _id: { $ne: new ObjectId(id) },
          status: { $in: ["approved", "active", "pending", "reserved"] },
        });
        if (!otherActive) {
          try {
            await db.collection("renewal_families").updateOne(
              { _id: new ObjectId(registration.familyId) },
              { $set: { renewalStatus: "not_yet_submitted", registrationId: null, updatedAt: new Date() } }
            );
          } catch {
            // Ignore ObjectId cast errors if legacy familyId
          }
        } else {
          try {
            await db.collection("renewal_families").updateOne(
              { _id: new ObjectId(registration.familyId) },
              { $set: { registrationId: otherActive._id.toString(), updatedAt: new Date() } }
            );
          } catch {}
        }
      }

      // 4. Audit log
      await db.collection("audit_log").insertOne({
        actorUid,
        actorName,
        action: "DELETE_REGISTRATION",
        category: "registration",
        targetId: id,
        details: `Permanently deleted registration for ${childName} (${registration.program} - ${registration.classTime}). Reason: ${reason}`,
        createdAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        action: "delete",
        message: `Registration for ${childName} permanently deleted.`,
      });
    } else {
      // Default: VOID
      // 1. Mark status as voided
      await db.collection("student_registrations").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "voided",
            voidedAt: new Date(),
            voidedBy: actorName,
            voidReason: reason,
          },
        }
      );

      // 2. Remove associated student record from active students roster
      await db.collection("students").deleteMany({ registrationId: id });

      // 3. If linked to a renewal family, relink to any remaining active registration or reset
      if (registration.familyId) {
        const otherActive = await db.collection("student_registrations").findOne({
          familyId: registration.familyId,
          _id: { $ne: new ObjectId(id) },
          status: { $in: ["approved", "active", "pending", "reserved"] },
        });
        if (!otherActive) {
          try {
            await db.collection("renewal_families").updateOne(
              { _id: new ObjectId(registration.familyId) },
              { $set: { renewalStatus: "not_yet_submitted", registrationId: null, updatedAt: new Date() } }
            );
          } catch {}
        } else {
          try {
            await db.collection("renewal_families").updateOne(
              { _id: new ObjectId(registration.familyId) },
              { $set: { registrationId: otherActive._id.toString(), updatedAt: new Date() } }
            );
          } catch {}
        }
      }

      // 4. Audit log
      await db.collection("audit_log").insertOne({
        actorUid,
        actorName,
        action: "VOID_REGISTRATION",
        category: "registration",
        targetId: id,
        details: `Voided registration for ${childName} (${registration.program} - ${registration.classTime}). Reason: ${reason}`,
        createdAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        action: "void",
        message: `Registration for ${childName} voided and slot released.`,
      });
    }
  } catch (error: any) {
    console.error("[registrations DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process request" }, { status: 500 });
  }
}
