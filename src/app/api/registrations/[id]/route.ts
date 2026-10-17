import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { isReturningFamilyRecord } from "@/lib/returning-family";
import { requireAdmin } from "@/lib/auth-guard";
import { calcRegistrationTerms, FALLBACK_PIONEER_RATES, getManilaTodayIso, getRegistrationAdventureStart, getRegistrationTotal, getStudentSessionInfo, isRegistrationVerified } from "@/lib/payment-terms";
import { pioneerEmailQuery } from "@/lib/pioneer-families";

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
    const fallbackTotal = (getRegistrationTotal({ ...pricingRegistration, uniformOrdered: false }, Number(registration.amountDue) || 0) || 0)
      + (registration.uniformOrdered ? 650 : 0);
    const terms = calcRegistrationTerms(pricingRegistration, student, paidVerified, fallbackTotal);
    const balanceInfo = isRegistrationVerified(registration.status) && terms.balance != null
      ? {
          total: terms.due,
          paid: paidVerified,
          balance: terms.balance,
          interest: terms.interest,
          weeksOfInterest: terms.mondays,
          totalPayable: terms.totalPayable,
          dueDate: terms.dueDate,
        }
      : null;

    // Only return non-sensitive fields needed for the payment page
    const publicData = {
      id: registration._id.toString(),
      status: registration.status,
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
    if (typeof body.isNewFamily !== "boolean") {
      return NextResponse.json({ error: "Choose whether this is a new or returning family." }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const result = await db.collection("student_registrations").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isNewFamily: body.isNewFamily,
          familyTypeOverride: body.isNewFamily,
          ...(body.isNewFamily ? {} : { welcomeKitOrdered: false }),
        },
      }
    );
    if (!result.matchedCount) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, isNewFamily: body.isNewFamily });
  } catch (error: any) {
    console.error("[registrations PATCH family type] Error:", error);
    return NextResponse.json({ error: "Failed to update family type" }, { status: 500 });
  }
}
