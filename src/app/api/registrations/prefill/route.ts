import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAdventureCycleRegistrationQuery, getTargetRegistrationAdventureNumber, getRegistrationAdventureStartDate, getProgramAdventureSetting } from "@/lib/adventure-cycle";
import { pioneerEmailQuery } from "@/lib/pioneer-families";

export const dynamic = "force-dynamic";

/**
 * GET /api/registrations/prefill?ref=...&email=...
 *
 * Lookup order (richest data wins):
 *   1. renewal_families     — by ObjectId ref OR parentEmail
 *   2. students             — by parentInfo.email OR childInfo.firstName
 *   3. accounts             — by Firebase UID (ref) OR email
 *   4. student_registrations — by parentInfo.email OR childInfo.firstName
 *
 * Data is merged so Trailblazer families that only exist in `students`/
 * `accounts` are pre-filled correctly even without a renewal_families entry.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get("ref");
    const email = searchParams.get("email");

    if (!ref && !email) {
      return NextResponse.json({ success: false, error: "Missing lookup identifier" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const cleanEmail = (email || "").trim().toLowerCase();

    // ── 1. renewal_families ──────────────────────────────────────────────────
    let familyDoc: any = null;
    if (ref && ObjectId.isValid(ref)) {
      familyDoc = await db.collection("renewal_families").findOne({ _id: new ObjectId(ref) });
    }
    if (!familyDoc && cleanEmail) {
      familyDoc = await db.collection("renewal_families").findOne({
        parentEmail: { $regex: new RegExp(`^${cleanEmail}$`, "i") },
      });
    }

    const lookupEmail = cleanEmail || (familyDoc?.parentEmail || "").trim().toLowerCase();
    const familyChildName = (familyDoc?.childName || "").trim();
    const familyChildFirst = familyChildName.split(" ")[0] || "";
    const familyChildLast = familyChildName.split(" ").slice(1).join(" ") || "";

    // ── 2. students collection ────────────────────────────────────────────────
    let studentDoc: any = null;
    if (lookupEmail) {
      studentDoc = await db.collection("students").findOne({
        "parentInfo.email": { $regex: new RegExp(`^${lookupEmail}$`, "i") },
      });
    }
    if (!studentDoc && familyChildFirst) {
      studentDoc = await db.collection("students").findOne({
        "childInfo.firstName": { $regex: new RegExp(`^${familyChildFirst}$`, "i") },
      });
    }
    // If ref looks like a Firebase UID, resolve via accounts → students
    if (!studentDoc && ref && !ObjectId.isValid(ref)) {
      const acct = await db.collection("accounts").findOne({ _id: ref } as any);
      if (acct?.email) {
        studentDoc = await db.collection("students").findOne({
          "parentInfo.email": { $regex: new RegExp(`^${acct.email}$`, "i") },
        });
      }
    }

    // ── 3. accounts collection ────────────────────────────────────────────────
    let accountDoc: any = null;
    if (ref && !ObjectId.isValid(ref)) {
      accountDoc = await db.collection("accounts").findOne({ _id: ref } as any);
    }
    if (!accountDoc && lookupEmail) {
      accountDoc = await db.collection("accounts").findOne({
        email: { $regex: new RegExp(`^${lookupEmail}$`, "i") },
      });
    }

    // ── 4. student_registrations ──────────────────────────────────────────────
    const regOr: any[] = [];
    if (ref && ObjectId.isValid(ref)) regOr.push({ _id: new ObjectId(ref) });
    if (lookupEmail) regOr.push({ "parentInfo.email": { $regex: new RegExp(`^${lookupEmail}$`, "i") } });
    if (familyChildFirst) regOr.push({ "childInfo.firstName": { $regex: new RegExp(`^${familyChildFirst}$`, "i") } });
    if (studentDoc?.childInfo?.firstName && studentDoc.childInfo.firstName !== familyChildFirst) {
      regOr.push({ "childInfo.firstName": { $regex: new RegExp(`^${studentDoc.childInfo.firstName}$`, "i") } });
    }
    const prevReg: any = regOr.length > 0
      ? await db.collection("student_registrations").findOne({ $or: regOr })
      : null;

    // Check if an active registration already exists for the current adventure cycle.
    const settingsDoc = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
    const settings = settingsDoc?.programs || [];
    const currentProgram = studentDoc?.program || prevReg?.program || "curious-explorer";
    const programSetting = getProgramAdventureSetting(currentProgram, settings);

    // Resolve target adventure: check the most recently active renewal_period first (most reliable),
    // because nextAdventureStart may not be set yet in program settings.
    const activePeriod = await db.collection("renewal_periods").findOne(
      { isActive: true, targetAdventure: { $exists: true } },
      { sort: { createdAt: -1 } }
    );
    const targetAdventureFromPeriod = activePeriod?.targetAdventure ? Number(activePeriod.targetAdventure) : null;
    const adventureNumber = targetAdventureFromPeriod
      || (programSetting ? getTargetRegistrationAdventureNumber(currentProgram, settings) : 2);
    const adventureStartDate = programSetting ? getRegistrationAdventureStartDate(currentProgram, settings) : null;
    const cycleQuery: Record<string, unknown>[] = getAdventureCycleRegistrationQuery(adventureNumber, adventureStartDate);
    const activeCurrentCycleReg = regOr.length > 0
      ? await db.collection("student_registrations").findOne({
          $or: regOr,
          status: { $in: ["pending", "approved", "reserved", "expired"] },
          $and: [{ $or: cycleQuery }],
        }, { sort: { submittedAt: -1 } })
      : null;

    // Only treat as "already registered" if the registration actually belongs to the TARGET adventure.
    // familyDoc.registrationId may point to a PREVIOUS cycle — do NOT use it to block a new renewal.
    let existingRegistrationId: string | null = null;
    let linkedRegistration: any = null;

    if (activeCurrentCycleReg) {
      const regPeriod: string = activeCurrentCycleReg.period || `adventure-${activeCurrentCycleReg.adventureNumber}`;
      const targetPeriod = `adventure-${adventureNumber}`;
      if (regPeriod === targetPeriod || activeCurrentCycleReg.adventureNumber === adventureNumber) {
        existingRegistrationId = activeCurrentCycleReg._id?.toString() || null;
        linkedRegistration = activeCurrentCycleReg;
      }
    }

    // If no active target-cycle registration found, check familyDoc.registrationId.
    // Only use it if it belongs to the TARGET adventure — otherwise it's historical data for prefill only.
    if (!existingRegistrationId && familyDoc?.registrationId && ObjectId.isValid(familyDoc.registrationId)) {
      const familyLinkedReg = await db.collection("student_registrations").findOne({ _id: new ObjectId(familyDoc.registrationId) });
      if (familyLinkedReg) {
        const regPeriod: string = familyLinkedReg.period || `adventure-${familyLinkedReg.adventureNumber}`;
        const targetPeriod = `adventure-${adventureNumber}`;
        if (regPeriod === targetPeriod || familyLinkedReg.adventureNumber === adventureNumber) {
          // Same cycle — this IS the existing registration for the target adventure
          existingRegistrationId = familyDoc.registrationId;
          linkedRegistration = familyLinkedReg;
        } else {
          // Different cycle (e.g. Adventure 2 reg when targeting Adventure 3):
          // use only for prefill data, not to block renewal
          linkedRegistration = familyLinkedReg;
        }
      }
    }

    // ── Nothing found ─────────────────────────────────────────────────────────
    if (!familyDoc && !studentDoc && !accountDoc && !prevReg) {
      return NextResponse.json({ success: false, error: "Family not found" }, { status: 404 });
    }

    // ── Merge — students > student_registrations > renewal_families > accounts ─
    const childInfo = {
      firstName: studentDoc?.childInfo?.firstName || prevReg?.childInfo?.firstName || familyChildFirst,
      lastName: studentDoc?.childInfo?.lastName || prevReg?.childInfo?.lastName || familyChildLast,
      nickname: studentDoc?.childInfo?.nickname || prevReg?.childInfo?.nickname || studentDoc?.childInfo?.firstName || familyChildFirst,
      dateOfBirth: studentDoc?.childInfo?.dateOfBirth || prevReg?.childInfo?.dateOfBirth || "",
      gender: studentDoc?.childInfo?.gender || prevReg?.childInfo?.gender || "",
      favoriteSong: studentDoc?.childInfo?.favoriteSong || prevReg?.childInfo?.favoriteSong || "",
      favoriteColor: studentDoc?.childInfo?.favoriteColor || prevReg?.childInfo?.favoriteColor || "",
      favoriteCharacter: studentDoc?.childInfo?.favoriteCharacter || prevReg?.childInfo?.favoriteCharacter || "",
      healthProfile: studentDoc?.childInfo?.healthProfile || prevReg?.childInfo?.healthProfile || "",
    };

    const parentInfo = {
      name: familyDoc?.parentName || studentDoc?.parentInfo?.name || prevReg?.parentInfo?.name || accountDoc?.name || "",
      email: lookupEmail || studentDoc?.parentInfo?.email || prevReg?.parentInfo?.email || "",
      phone: familyDoc?.phone || studentDoc?.parentInfo?.phone || prevReg?.parentInfo?.phone || "",
      relationship: studentDoc?.parentInfo?.relationship || prevReg?.parentInfo?.relationship || "Mother",
    };

    const emergencyContact =
      studentDoc?.emergencyContact ||
      prevReg?.emergencyContact || {
        name: parentInfo.name,
        phone: parentInfo.phone,
        relationship: parentInfo.relationship,
      };

    const previousProgram =
      studentDoc?.programName ||
      studentDoc?.program ||
      prevReg?.program ||
      familyDoc?.previousProgram ||
      "Trailblazer: Brave Explorer";

    // ── 5. Pioneer status & prices ──────────────────────────────────────────
    let isPioneer = false;
    const finalEmail = (parentInfo.email || lookupEmail || "").toLowerCase().trim();
    const finalChildFirst = (childInfo.firstName || familyChildFirst || "").trim();

    const pioneerOr: any[] = [];
    if (finalEmail) {
      pioneerOr.push(...pioneerEmailQuery(finalEmail).$or);
    }
    if (finalChildFirst) {
      pioneerOr.push({ childName: { $regex: new RegExp(`^${finalChildFirst.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`, "i") } });
    }

    if (pioneerOr.length > 0) {
      const pioneerDoc = await db.collection("pioneer_families").findOne({ $or: pioneerOr });
      if (pioneerDoc) isPioneer = true;
    }

    const pioneerSettingsDoc = await db.collection("settings").findOne({ _key: "pioneer_settings_v1" });
    const pioneerPrices = pioneerSettingsDoc?.pioneerPrices || {};
    const pioneerPrice = pioneerSettingsDoc?.pioneerPrice ?? null;

    const prefillData = {
      isPrefilled: true,
      familyId: familyDoc?._id?.toString() || null,
      isNewFamily: false,
      isPioneer,
      pioneerPrices,
      pioneerPrice,
      previousProgram,
      parentInfo,
      childInfo,
      emergencyContact,
      alreadyRegistered: Boolean(existingRegistrationId),
      existingRegistrationId,
      existingProgram: (existingRegistrationId && linkedRegistration?.program) || null,
      existingRegistrationSubmittedAt: existingRegistrationId ? (linkedRegistration?.submittedAt || null) : null,
      existingRegistrationStatus: existingRegistrationId ? (linkedRegistration?.status || null) : null,
      existingReservationExpiresAt: existingRegistrationId ? (linkedRegistration?.reservedUntil || null) : null,
      existingPromoCode: existingRegistrationId ? (linkedRegistration?.promoCode || null) : null,
    };

    return NextResponse.json({ success: true, data: prefillData });
  } catch (error: any) {
    console.error("[prefill GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load prefill data" }, { status: 500 });
  }
}
