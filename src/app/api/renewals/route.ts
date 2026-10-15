import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PROGRAM_SLOTS } from "@/data/landing";
import {
  RENEWAL_PROMO_CODE,
  RESERVATION_DEADLINE_ISO,
  MIN_STUDENTS_PER_SESSION,
  DOWNPAYMENT_RATE,
  type RenewalStatus,
  isAdmin,
  familyKey,
  safeDate,
  loadPricingContext,
  computeTuition,
} from "@/lib/renewals";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Config (move to @/data/renewal-config or settings doc when convenient)
// ---------------------------------------------------------------------------
// If true, "confirmed" requires a verified payment, not just a submitted amount.
// Set to true if confirmed should mean "admin checked the receipt".
const REQUIRE_VERIFIED_FOR_CONFIRMED = false;

// Testing accounts: set in env as comma-separated lists, e.g.
// RENEWALS_TEST_EMAILS="a@x.com,b@x.com"  RENEWALS_TEST_NAMES="ian angelo valmores"
const csv = (v?: string) =>
  (v || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
const TESTING_EMAILS = csv(process.env.RENEWALS_TEST_EMAILS);
const TESTING_NAMES = csv(process.env.RENEWALS_TEST_NAMES);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const isTestAccount = (email: string, name?: string) => {
  const emailLower = (email || "").toLowerCase().trim();
  const nameLower = (name || "").toLowerCase().trim();
  return (
    TESTING_EMAILS.includes(emailLower) ||
    TESTING_NAMES.some((n) => nameLower.includes(n))
  );
};

// ---------------------------------------------------------------------------
// GET /api/renewals
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "adventure-1-renewal";
    const statusFilter = searchParams.get("status");
    const program = searchParams.get("program");
    const search = (searchParams.get("search") || "").toLowerCase().trim();

    const { db } = await connectToDatabase();

    // 1. Families (excluding test accounts)
    const allFamilies = await db.collection("renewal_families").find({}).toArray();
    const families = allFamilies.filter((f) => !isTestAccount(f.parentEmail, f.parentName));

    const familyMap = new Map<string, any>();
    for (const f of families) {
      familyMap.set(familyKey(f.parentEmail, f.childName), f);
    }

    // Pricing context (shared with PATCH so both use identical tuition rules)
    const pricingCtx = await loadPricingContext(db);

    // 2. Registrations that count as renewals
    const regQuery: Record<string, any> = {
      $or: [
        { isPromoRegistration: true },
        { promoCode: RENEWAL_PROMO_CODE },
        { "parentInfo.isRenewal": true },
        { renewalPeriod: period },
      ],
    };
    if (program && program !== "all") regQuery.program = program;

    const allRegistrations = await db
      .collection("student_registrations")
      .find(regQuery)
      .sort({ submittedAt: -1 })
      .toArray();

    const registrations = allRegistrations.filter(
      (r) => !isTestAccount(r.parentInfo?.email || "", r.parentInfo?.name || "")
    );

    // 3. Build renewal records
    const now = new Date();

    const buildRecord = (r: any) => {
      const childFull = `${r.childInfo?.firstName || ""} ${r.childInfo?.lastName || ""}`.trim();
      const parentEmail = (r.parentInfo?.email || "").toLowerCase();
      const matchedFamily = familyMap.get(familyKey(parentEmail, childFull));

      // Financials (shared logic with PATCH)
      const { totalTuition, expectedDownpayment, isPioneer: isPioneerRecord } = computeTuition(
        r,
        pricingCtx,
        Boolean(matchedFamily?.isPioneer)
      );

      const initialPaid = Number(r.amountPaid) || 0;
      const balancePaid = Array.isArray(r.balancePayments)
        ? r.balancePayments.reduce((acc: number, b: any) => acc + (Number(b.amountPaid) || 0), 0)
        : 0;
      const amountPaid = initialPaid + balancePaid;
      const remainingBalance = Math.max(0, totalTuition - amountPaid);

      const isPromo = Boolean(r.isPromoRegistration || r.promoCode === RENEWAL_PROMO_CODE);
      const reservationType = isPromo ? "Promo code reservation" : "Direct payment (no code)";

      const reservedUntil = safeDate(r.reservedUntil, RESERVATION_DEADLINE_ISO);
      const isPastDeadline = now > reservedUntil;

      const isVerified =
        r.status === "approved" ||
        Boolean(r.approvedAt) ||
        Boolean(r.paymentVerified) ||
        (Array.isArray(r.balancePayments) && r.balancePayments.some((p: any) => p?.verified));

      // Guard: a record only counts as paid if tuition is known and money was actually paid
      const downpaymentMet =
        totalTuition > 0 && amountPaid > 0 && amountPaid >= expectedDownpayment;
      const confirmable = REQUIRE_VERIFIED_FOR_CONFIRMED
        ? downpaymentMet && isVerified
        : downpaymentMet || r.status === "approved";

      let renewalStatus: RenewalStatus;
      if (r.renewalStatus === "released" || r.status === "expired" || r.status === "rejected") {
        renewalStatus = "released";
      } else if (r.renewalStatus === "for_release") {
        renewalStatus = "for_release";
      } else if (confirmable) {
        renewalStatus = "confirmed";
      } else if (isPromo && isPastDeadline && !r.manualHold) {
        renewalStatus = "for_release";
      } else {
        renewalStatus = "reserved";
      }

      let paymentStatus: "unpaid" | "downpayment_received" | "fully_paid" = "unpaid";
      if (totalTuition > 0 && amountPaid >= totalTuition) {
        paymentStatus = "fully_paid";
      } else if (downpaymentMet) {
        paymentStatus = "downpayment_received";
      }

      const submittedAt = r.submittedAt || r.createdAt || new Date().toISOString();

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
        submittedAt,
        reservationType,
        isPromo,
        promoCode: r.promoCode || (isPromo ? RENEWAL_PROMO_CODE : null),
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
        status: r.status,
        isVerified,
        approvedAt: r.approvedAt ? safeDate(r.approvedAt, now.toISOString()).toISOString() : null,
        approvedBy: r.approvedBy || null,
        _dedupeKey: familyKey(parentEmail, childFull),
        _submittedMs: new Date(submittedAt).getTime() || 0,
      };
    };

    const builtRecords = registrations.map(buildRecord);

    // 3b. Dedupe resubmissions among ACTIVE records only: one per parent email + child.
    // Keep the one with the most money paid; tie -> most recent.
    // Released records are never deduped, so the archive and payment history stay intact.
    const releasedRecords = builtRecords.filter((r) => r.renewalStatus === "released");
    const activeBuilt = builtRecords.filter((r) => r.renewalStatus !== "released");

    const bestByKey = new Map<string, ReturnType<typeof buildRecord>>();
    for (const rec of activeBuilt) {
      const existing = bestByKey.get(rec._dedupeKey);
      if (
        !existing ||
        rec.amountPaid > existing.amountPaid ||
        (rec.amountPaid === existing.amountPaid && rec._submittedMs > existing._submittedMs)
      ) {
        bestByKey.set(rec._dedupeKey, rec);
      }
    }
    const allRecords = [...bestByKey.values(), ...releasedRecords].sort(
      (a, b) => b._submittedMs - a._submittedMs
    );

    // 4. Statistics (always computed on the full deduped set, not the filtered view)
    const totalFamilies = families.length;
    const submittedCount = allRecords.length;
    const submittedFamilyIds = new Set(
      allRecords.map((r) => r.familyId).filter((id): id is string => Boolean(id))
    );
    const matchedSubmittedFamilies = submittedFamilyIds.size;
    const notYetSubmitted = Math.max(0, totalFamilies - matchedSubmittedFamilies);

    const countByStatus = (s: RenewalStatus) => allRecords.filter((r) => r.renewalStatus === s).length;
    const countReserved = countByStatus("reserved");
    const countConfirmed = countByStatus("confirmed");
    const countForRelease = countByStatus("for_release");
    const countReleased = countByStatus("released");

    const promoReservations = allRecords.filter((r) => r.isPromo).length;
    const directPayments = allRecords.filter((r) => !r.isPromo).length;

    const renewalRate =
      totalFamilies > 0 ? +((matchedSubmittedFamilies / totalFamilies) * 100).toFixed(1) : 0;
    const conversionRate =
      countReserved + countConfirmed > 0
        ? +((countConfirmed / (countReserved + countConfirmed)) * 100).toFixed(1)
        : 0;

    const totalCollected = allRecords.reduce((acc, r) => acc + r.amountPaid, 0);
    const totalExpectedDownpayment = allRecords.reduce((acc, r) => acc + r.expectedDownpayment, 0);
    const totalOutstandingBalance = allRecords.reduce((acc, r) => acc + r.remainingBalance, 0);

    const countDownpaymentReceived = allRecords.filter((r) => r.paymentStatus === "downpayment_received").length;
    const countFullyPaid = allRecords.filter((r) => r.paymentStatus === "fully_paid").length;
    const countWithBalance = allRecords.filter((r) => r.remainingBalance > 0 && r.amountPaid > 0).length;

    const nowMs = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const countExpiringSoon = allRecords.filter((r) => {
      if (r.renewalStatus !== "reserved") return false;
      const expiryMs = new Date(r.reservedUntil).getTime();
      return expiryMs > nowMs && expiryMs - nowMs <= DAY_MS;
    }).length;

    // 5. Slot overview, driven by the SAME computed records (reserved + confirmed hold a slot)
    const slotOverview: Record<
      string,
      { totalMax: number; sessions: Record<string, { max: number; taken: number; belowMin: boolean }> }
    > = {};

    for (const [progKey, progData] of Object.entries(PROGRAM_SLOTS)) {
      if (progKey === "virtual-session" || progKey.includes("virtual")) continue;
      slotOverview[progKey] = { totalMax: 0, sessions: {} };
      for (const cls of (progData as any).classes) {
        slotOverview[progKey].totalMax += cls.maxSlots;
        slotOverview[progKey].sessions[cls.name] = { max: cls.maxSlots, taken: 0, belowMin: true };
      }
    }

    for (const r of allRecords) {
      if (r.renewalStatus !== "reserved" && r.renewalStatus !== "confirmed") continue;
      const prog = slotOverview[r.program];
      if (!prog) continue;
      const ct: string = r.classTime || "";
      const alt = ct.includes("Session") ? ct.replace("Session", "Class") : ct.replace("Class", "Session");
      const sessionKey = prog.sessions[ct] ? ct : alt && prog.sessions[alt] ? alt : null;
      if (sessionKey) prog.sessions[sessionKey].taken += 1;
    }

    for (const progKey of Object.keys(slotOverview)) {
      for (const s of Object.values(slotOverview[progKey].sessions)) {
        s.belowMin = s.taken < MIN_STUDENTS_PER_SESSION;
      }
    }

    // 6. Apply list filters (status / search) to the returned records only
    let records = allRecords;
    if (statusFilter && statusFilter !== "all") {
      records = records.filter((r) => r.renewalStatus === statusFilter);
    }
    if (search) {
      records = records.filter((r) =>
        [r.parentName, r.parentEmail, r.childName, r.phone, r.referenceNumber]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    // Strip internal fields
    const publicRecords = records.map(({ _dedupeKey, _submittedMs, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      data: {
        records: publicRecords,
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
          deadlineIso: RESERVATION_DEADLINE_ISO,
          minStudentsPerSession: MIN_STUDENTS_PER_SESSION,
          downpaymentRate: DOWNPAYMENT_RATE,
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
    return NextResponse.json({ error: "Failed to fetch renewals data" }, { status: 500 });
  }
}