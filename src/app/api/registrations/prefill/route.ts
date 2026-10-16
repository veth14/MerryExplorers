import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAdventureCycleRegistrationQuery, getCurrentAdventureNumber, getCurrentAdventureStartDate, getProgramAdventureSetting } from "@/lib/adventure-cycle";

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
    const adventureNumber = programSetting ? getCurrentAdventureNumber(currentProgram, settings) : 2;
    const adventureStartDate = programSetting ? getCurrentAdventureStartDate(currentProgram, settings) : null;
    const cycleQuery: Record<string, unknown>[] = getAdventureCycleRegistrationQuery(adventureNumber, adventureStartDate);
    const activeCurrentCycleReg = regOr.length > 0
      ? await db.collection("student_registrations").findOne({
          $or: regOr,
          status: { $in: ["pending", "approved", "reserved"] },
          $and: [{ $or: cycleQuery }],
        })
      : null;

    // Also check if familyDoc has an existing registrationId
    let existingRegistrationId = activeCurrentCycleReg?._id?.toString() || null;
    if (!existingRegistrationId && familyDoc?.registrationId) {
      existingRegistrationId = familyDoc.registrationId;
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
      pioneerOr.push({ email: finalEmail });
      pioneerOr.push({ email: { $regex: new RegExp(`^${finalEmail.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, "i") } });
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
      promoCode: "A1RENEWAL2026",
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
      existingProgram: activeCurrentCycleReg?.program || null,
    };

    return NextResponse.json({ success: true, data: prefillData });
  } catch (error: any) {
    console.error("[prefill GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load prefill data" }, { status: 500 });
  }
}
