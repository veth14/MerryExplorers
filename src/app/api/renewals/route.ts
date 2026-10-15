import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { PROGRAM_SLOTS } from "@/data/landing";

export const dynamic = "force-dynamic";

// GET /api/renewals - List all renewals, slot overview, and statistics
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "adventure-1-renewal";
    const status = searchParams.get("status");
    const program = searchParams.get("program");
    const search = searchParams.get("search");

    const { db } = await connectToDatabase();

    // Testing accounts to exclude from all KPI calculations
    const TESTING_EMAILS = ["iangelovalmores@gmail.com", "ian.valmores@gmail.com"];
    const TESTING_NAMES = ["ian angelo valmores"];

    const isTestAccount = (email: string, name?: string) => {
      const emailLower = (email || "").toLowerCase().trim();
      const nameLower = (name || "").toLowerCase().trim();
      return (
        TESTING_EMAILS.includes(emailLower) ||
        TESTING_NAMES.some((n) => nameLower.includes(n))
      );
    };

    // 1. Fetch renewal_families first (excluding test accounts)
    const allFamilies = await db
      .collection("renewal_families")
      .find({})
      .toArray();

    const families = allFamilies.filter(
      (f) => !isTestAccount(f.parentEmail, f.parentName)
    );

    // Create lookup map for families by email+childName
    const familyMap = new Map<string, any>();
    for (const f of families) {
      const key = `${(f.parentEmail || "").toLowerCase()}___${(f.childName || "").toLowerCase().replace(/\s+/g, "")}`;
      familyMap.set(key, f);
    }

    // Fetch pioneer settings & pioneer families for accurate pricing
    const pioneerSettings = await db.collection("settings").findOne({ _key: "pioneer_settings_v1" });
    const pioneerPrices: Record<string, number> = pioneerSettings?.pioneerPrices || {};

    const pioneerDocs = await db.collection("pioneer_families").find({}).toArray();
    const pioneerEmails = new Set(pioneerDocs.map((p: any) => (p.email || "").toLowerCase().trim()).filter(Boolean));

    // 2. Fetch registrations
    // A registration is a renewal ONLY if:
    // a) It used promoCode "A1RENEWAL2026" or has isPromoRegistration: true
    // b) It is explicitly tagged with renewalPeriod: period
    // c) It has parentInfo.isRenewal: true
    // d) Or it matches a registered family from renewal_families that has renewalStatus !== "not_yet_submitted"
    const regQuery: Record<string, any> = {
      $or: [
        { isPromoRegistration: true },
        { promoCode: "A1RENEWAL2026" },
        { "parentInfo.isRenewal": true },
        { renewalPeriod: period },
      ],
    };

    if (program && program !== "all") {
      regQuery.program = program;
    }

    const allRegistrations = await db
      .collection("student_registrations")
      .find(regQuery)
      .sort({ submittedAt: -1 })
      .toArray();

    // Exclude testing accounts from registrations
    const registrations = allRegistrations.filter(
      (r) => !isTestAccount(r.parentInfo?.email || "", r.parentInfo?.name || "")
    );

    // 3. Process each renewal record and determine exact renewal state and payment math
    const renewalRecords = registrations.map((r: any) => {
      const childFull = `${r.childInfo?.firstName || ""} ${r.childInfo?.lastName || ""}`.trim();
      const parentEmail = (r.parentInfo?.email || "").toLowerCase();
      const matchKey = `${parentEmail}___${childFull.toLowerCase().replace(/\s+/g, "")}`;
      const matchedFamily = familyMap.get(matchKey);

      // Financials
      const progDef = (PROGRAM_SLOTS as Record<string, any>)[r.program];
      const isPioneerRecord = Boolean(r.isPioneer || pioneerEmails.has(parentEmail) || matchedFamily?.isPioneer);
      const progPioneerRate = pioneerPrices[r.program] || (r.program === "creative-explorer" ? 4820 : null);
      const totalTuition = Number(r.customRate) || (isPioneerRecord && progPioneerRate ? progPioneerRate : 0) || Number(r.amountDue) || (progDef ? progDef.rate : 0);
      const expectedDownpayment = Math.round(totalTuition * 0.6) || (progDef ? progDef.downpayment : 0);
      
      // Calculate total paid across initial payment + balance payments
      const initialPaid = Number(r.amountPaid) || 0;
      const balancePaid = Array.isArray(r.balancePayments)
        ? r.balancePayments.reduce((acc: number, b: any) => acc + (Number(b.amountPaid) || 0), 0)
        : 0;
      const amountPaid = initialPaid + balancePaid;
      const remainingBalance = Math.max(0, totalTuition - amountPaid);

      // Promo vs Direct
      const isPromo = Boolean(r.isPromoRegistration || r.promoCode === "A1RENEWAL2026");
      const reservationType = isPromo ? "Promo code reservation" : "Direct payment (no code)";

      // Reservation expiry: October 16, 1:00 PM for promo code
      const reservedUntil = r.reservedUntil ? new Date(r.reservedUntil) : new Date("2026-10-16T13:00:00+08:00");
      const now = new Date();
      const isPastDeadline = now > reservedUntil;

      // Status determination
      let renewalStatus: "reserved" | "confirmed" | "for_release" | "released" = "reserved";
      
      if (r.renewalStatus === "released" || r.status === "expired" || r.status === "rejected") {
        renewalStatus = "released";
      } else if (r.renewalStatus === "for_release") {
        renewalStatus = "for_release";
      } else if (amountPaid >= expectedDownpayment || r.status === "approved") {
        renewalStatus = "confirmed";
      } else if (isPromo && isPastDeadline && amountPaid < expectedDownpayment) {
        renewalStatus = "for_release"; // Flagged for release, awaiting admin confirmation
      } else {
        renewalStatus = "reserved"; // Still within window or waiting for downpayment
      }

      // Payment Status
      let paymentStatus: "unpaid" | "downpayment_received" | "fully_paid" = "unpaid";
      if (amountPaid >= totalTuition && totalTuition > 0) {
        paymentStatus = "fully_paid";
      } else if (amountPaid >= expectedDownpayment && amountPaid > 0) {
        paymentStatus = "downpayment_received";
      }

      return {
        _id: r._id.toString(),
        registrationId: r._id.toString(),
        familyId: matchedFamily?._id?.toString() || null,
        parentName: r.parentInfo?.name || matchedFamily?.parentName || "—",
        parentEmail: r.parentInfo?.email || matchedFamily?.parentEmail || "—",
        phone: r.parentInfo?.phone || matchedFamily?.phone || "—",
        childName: childFull || matchedFamily?.childName || "—",
        program: r.program,
        classTime: r.classTime,
        submittedAt: r.submittedAt || r.createdAt || new Date().toISOString(),
        reservationType,
        isPromo,
        promoCode: r.promoCode || (isPromo ? "A1RENEWAL2026" : null),
        reservedOn: r.submittedAt || r.createdAt,
        reservedUntil: reservedUntil.toISOString(),
        renewalStatus,
        paymentStatus,
        totalTuition,
        expectedDownpayment,
        amountPaid,
        remainingBalance,
        paymentMethod: r.paymentMethod || "—",
        referenceNumber: r.referenceNumber || "—",
        receiptUrl: r.receiptUrl || "",
        isResubmission: Boolean(r.isResubmission),
        matchedFamily: Boolean(matchedFamily),
        isPioneer: isPioneerRecord,
      };
    });

    // 4. Compute statistics
    const totalFamilies = families.length;
    const submittedCount = renewalRecords.length;
    const notYetSubmitted = Math.max(0, totalFamilies - families.filter((f) => f.renewalStatus && f.renewalStatus !== "not_yet_submitted").length);

    const countReserved = renewalRecords.filter((r) => r.renewalStatus === "reserved").length;
    const countConfirmed = renewalRecords.filter((r) => r.renewalStatus === "confirmed").length;
    const countForRelease = renewalRecords.filter((r) => r.renewalStatus === "for_release").length;
    const countReleased = renewalRecords.filter((r) => r.renewalStatus === "released").length;

    const promoReservations = renewalRecords.filter((r) => r.isPromo).length;
    const directPayments = renewalRecords.filter((r) => !r.isPromo).length;

    const renewalRate = totalFamilies > 0 ? +((submittedCount / totalFamilies) * 100).toFixed(1) : 0;
    const conversionRate = (countReserved + countConfirmed) > 0
      ? +((countConfirmed / (countReserved + countConfirmed)) * 100).toFixed(1)
      : 0;

    // Financial summaries
    const totalCollected = renewalRecords.reduce((acc, r) => acc + r.amountPaid, 0);
    const totalExpectedDownpayment = renewalRecords.reduce((acc, r) => acc + r.expectedDownpayment, 0);
    const totalOutstandingBalance = renewalRecords.reduce((acc, r) => acc + r.remainingBalance, 0);

    const countDownpaymentReceived = renewalRecords.filter((r) => r.paymentStatus === "downpayment_received").length;
    const countFullyPaid = renewalRecords.filter((r) => r.paymentStatus === "fully_paid").length;
    const countWithBalance = renewalRecords.filter((r) => r.remainingBalance > 0 && r.amountPaid > 0).length;

    // Expiring within 24 hours
    const nowMs = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    const countExpiringSoon = renewalRecords.filter((r) => {
      if (r.renewalStatus !== "reserved") return false;
      const expiryMs = new Date(r.reservedUntil).getTime();
      return expiryMs > nowMs && expiryMs - nowMs <= twentyFourHoursMs;
    }).length;

    // Slot breakdown per program and session
    const slotOverview: Record<string, { totalMax: number; sessions: Record<string, { max: number; taken: number; belowMin: boolean }> }> = {};

    for (const [progKey, progData] of Object.entries(PROGRAM_SLOTS)) {
      // Exclude virtual session / virtual tutorial from on-site class tracker
      if (progKey === "virtual-session" || progKey.includes("virtual")) continue;
      slotOverview[progKey] = {
        totalMax: 0,
        sessions: {},
      };
      for (const cls of progData.classes) {
        slotOverview[progKey].totalMax += cls.maxSlots;
        slotOverview[progKey].sessions[cls.name] = {
          max: cls.maxSlots,
          taken: 0,
          belowMin: true,
        };
      }
    }

    // Count slots taken from confirmed + reserved registrations
    for (const r of registrations) {
      if (r.status === "rejected" || r.status === "expired" || r.renewalStatus === "released") continue;
      const prog = slotOverview[r.program];
      if (prog && prog.sessions[r.classTime]) {
        prog.sessions[r.classTime].taken += 1;
      }
    }

    // Evaluate belowMin (< 3 students)
    for (const progKey of Object.keys(slotOverview)) {
      for (const sessionKey of Object.keys(slotOverview[progKey].sessions)) {
        const s = slotOverview[progKey].sessions[sessionKey];
        s.belowMin = s.taken < 3;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        records: renewalRecords,
        stats: {
          totalFamilies,
          submittedCount,
          notYetSubmitted,
          countReserved,
          countConfirmed,
          countForRelease,
          countReleased,
          promoReservations,
          directPayments,
          renewalRate,
          conversionRate,
          countExpiringSoon,
          deadlineIso: "2026-10-16T13:00:00+08:00",
          totalCollected,
          totalExpectedDownpayment,
          totalOutstandingBalance,
          countDownpaymentReceived,
          countFullyPaid,
          countWithBalance,
        },
        slotOverview,
      },
    });
  } catch (error: any) {
    console.error("[renewals GET]", error);
    return NextResponse.json({ error: error.message || "Failed to fetch renewals data" }, { status: 500 });
  }
}
