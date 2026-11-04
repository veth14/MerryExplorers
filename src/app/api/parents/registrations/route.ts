import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireParent } from "@/lib/auth-guard";
import { pioneerEmailQuery } from "@/lib/pioneer-families";
import {
  calcRegistrationTerms,
  FALLBACK_PIONEER_RATES,
  getManilaTodayIso,
  getRegistrationAdventureStart,
  getRegistrationTotal,
  getStudentSessionInfo,
  isRegistrationVerified,
} from "@/lib/payment-terms";
import { getHolidaySkipSet } from "@/lib/get-holiday-skip-set";

export const dynamic = "force-dynamic";

// Parent-only registration/payment data for the signed-in family.
// Do not use the admin-wide /api/registrations endpoint from the parent portal.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid") || "";
  if (!uid) return NextResponse.json({ error: "uid is required" }, { status: 400 });

  const auth = await requireParent(request, uid);
  if ("response" in auth) return auth.response;

  try {
    const { db } = await connectToDatabase();
    const account = (await db.collection("parent_accounts").findOne({ _id: uid }))
      || await db.collection("accounts").findOne({ _id: uid });
    if (!account || String(account.role || "").toLowerCase() !== "parent") {
      return NextResponse.json({ error: "Parent account not found" }, { status: 404 });
    }

    const email = String(account.email || auth.user.email || "").trim();
    if (!email) return NextResponse.json({ registrations: [] });
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const [records, pioneerFamily, pioneerSettings, renewalSettings, skipDates] = await Promise.all([
      db.collection("student_registrations")
        .find({ "parentInfo.email": { $regex: `^${escapedEmail}$`, $options: "i" } })
        .sort({ submittedAt: -1 })
        .toArray(),
      db.collection("pioneer_families").findOne(pioneerEmailQuery(email.toLowerCase())),
      db.collection("settings").findOne({ _key: "pioneer_settings_v1" }),
      db.collection("settings").findOne({ _key: "renewal_settings_v2" }),
      getHolidaySkipSet(db),
    ]);

    const registrations = records.map((record) => {
      const pioneer = Boolean(record.isPioneer || pioneerFamily);
      const customRate = pioneer
        ? record.customRate || pioneerSettings?.pioneerPrices?.[record.program] || FALLBACK_PIONEER_RATES[record.program] || null
        : record.customRate || null;
      const pricedRecord = { ...record, isPioneer: pioneer, customRate };
      const adventureStart = getRegistrationAdventureStart(renewalSettings?.programs || [], record, getManilaTodayIso());
      const student = getStudentSessionInfo(pricedRecord, account, adventureStart);
      const paidVerified = isRegistrationVerified(record.status)
        ? Number(record.amountPaid || record.amountDue || 0)
        : 0;
      const previousAdventureBalance = Math.max(0, Number(record.previousAdventureBalance) || 0);
      const paidToPrevious = Math.min(paidVerified, previousAdventureBalance);
      const appliedToCurrentSession = Math.max(0, paidVerified - paidToPrevious);
      const fallbackTotal = (getRegistrationTotal({ ...pricedRecord, uniformOrdered: false }, Number(record.amountDue) || 0) || 0)
        + (record.uniformOrdered ? 650 : 0);
      const baseTerms = calcRegistrationTerms(pricedRecord, student, appliedToCurrentSession, fallbackTotal, new Date(), skipDates);
      const remainingPreviousBalance = Math.max(0, previousAdventureBalance - paidToPrevious);
      const sessionBalance = baseTerms.balance;
      const totalBalance = sessionBalance != null
        ? sessionBalance + remainingPreviousBalance
        : remainingPreviousBalance > 0 ? remainingPreviousBalance : null;
      const paymentTerms = {
        ...baseTerms,
        paidToPrevious,
        appliedToCurrentSession,
        sessionBalance,
        previousAdventureBalance: remainingPreviousBalance,
        originalPreviousAdventureBalance: previousAdventureBalance,
        balance: totalBalance,
        totalPayable: baseTerms.totalPayable != null
          ? baseTerms.totalPayable + remainingPreviousBalance
          : totalBalance,
      };
      return {
        id: record._id.toString(),
        status: record.status,
        program: record.program,
        classTime: record.classTime,
        adventureNumber: record.adventureNumber,
        period: record.period,
        adventureStartDate: record.adventureStartDate,
        parentInfo: { email, name: account.fullName || "" },
        childInfo: {
          firstName: record.childInfo?.firstName || "",
          lastName: record.childInfo?.lastName || "",
        },
        submittedAt: record.submittedAt,
        approvedAt: record.approvedAt,
        paymentMethod: record.paymentMethod,
        amountDue: record.amountDue,
        amountPaid: record.amountPaid,
        balancePayments: (Array.isArray(record.balancePayments) ? record.balancePayments : []).map((payment: any) => ({
          id: payment.id,
          amountPaid: payment.amountPaid,
          paymentMethod: payment.paymentMethod,
          referenceNumber: payment.referenceNumber,
          paidOn: payment.paidOn,
          recordedAt: payment.recordedAt,
          submittedAt: payment.submittedAt,
          verified: payment.verified,
          rejected: payment.rejected,
          adminNote: payment.adminNote,
          interestWaived: payment.interestWaived,
        })),
        previousAdventureBalance: record.previousAdventureBalance,
        referenceNumber: record.referenceNumber,
        adminNote: record.adminNote,
        isPioneer: pioneer,
        customRate,
        isNewFamily: record.isNewFamily,
        familyTypeOverride: record.familyTypeOverride,
        uniformOrdered: record.uniformOrdered,
        welcomeKitOrdered: pioneer ? false : record.welcomeKitOrdered,
        uniformSetOnly: record.uniformSetOnly,
        uniformSet: record.uniformSet,
        lanyardOrdered: record.lanyardOrdered,
        paymentTerms,
      };
    });

    return NextResponse.json({ registrations }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Failed to load parent's registrations:", error);
    return NextResponse.json({ error: "Failed to load registrations" }, { status: 500 });
  }
}
