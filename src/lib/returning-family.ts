import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import { getRegistrationAdventureNumber } from "@/lib/adventure-cycle";

export interface ReturningFamilyMatchResult {
  isReturning: boolean;
  matchedChildName?: string;
  matchedParentName?: string;
  previousAdventureNumber?: number | null;
  previousProgram?: string | null;
  source?: "student_registrations" | "renewal_families" | "students";
}

/**
 * Searches student registrations, renewal families, and students collections
 * to recognize an established family (by child name + parent name/phone/email)
 * and retrieves their previous adventure number and details.
 */
export async function findReturningFamilyMatch(
  db: Db,
  registration: any,
  excludeRegistrationId?: string,
): Promise<ReturningFamilyMatchResult> {
  const firstName = String(registration.childInfo?.firstName || "").trim();
  const firstWord = firstName.split(/\s+/)[0];
  const lastName = String(registration.childInfo?.lastName || "").trim();
  const parentName = String(registration.parentInfo?.name || "").trim();
  const phone = String(registration.parentInfo?.phone || "").replace(/\D/g, "");
  const email = String(registration.parentInfo?.email || "").trim().toLowerCase();

  if (!firstWord) return { isReturning: false };

  // To prevent false positives on generic first names, require at least
  // a lastName, a parentPhone, an email, or a parentName.
  const hasDiscriminator = Boolean(lastName || phone || email || parentName);
  if (!hasDiscriminator) return { isReturning: false };

  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const firstNamePattern = new RegExp(`^${escapeRegex(firstWord)}(?:\\s|$)`, "i");
  const parentMatches: Record<string, unknown>[] = [];
  if (parentName) parentMatches.push({ "parentInfo.name": new RegExp(`^${escapeRegex(parentName)}$`, "i") });
  if (phone) parentMatches.push({ "parentInfo.phone": { $regex: new RegExp(`${escapeRegex(phone)}$`) } });
  if (email) parentMatches.push({ "parentInfo.email": new RegExp(`^${escapeRegex(email)}$`, "i") });

  // 1. Check student_registrations
  const previousRegistrationQuery: Record<string, unknown> = {
    status: { $in: ["approved", "active", "early-bird", "scholar", "reserved", "paid"] },
  };
  const childMatch = lastName
    ? { "childInfo.firstName": { $regex: firstNamePattern }, "childInfo.lastName": new RegExp(`^${escapeRegex(lastName)}$`, "i") }
    : null;
  const identityMatches = [...parentMatches, ...(childMatch ? [childMatch] : [])];
  if (identityMatches.length) {
    previousRegistrationQuery.$or = identityMatches;
  } else {
    previousRegistrationQuery["childInfo.firstName"] = { $regex: firstNamePattern };
  }
  if (excludeRegistrationId && ObjectId.isValid(excludeRegistrationId)) {
    previousRegistrationQuery._id = { $ne: new ObjectId(excludeRegistrationId) };
  }

  const previousRegistration = await db.collection("student_registrations").findOne(previousRegistrationQuery, {
    sort: { submittedAt: -1, createdAt: -1 },
  });

  if (previousRegistration) {
    let advNum: number | null = null;
    if (typeof previousRegistration.adventureNumber === "number" && previousRegistration.adventureNumber > 0) {
      advNum = previousRegistration.adventureNumber;
    } else {
      try {
        const settingsDoc = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
        const settings = settingsDoc?.programs || [];
        advNum = getRegistrationAdventureNumber(
          previousRegistration as any,
          (previousRegistration as any).program || "curious-explorer",
          settings,
          (previousRegistration as any).submittedAt ? new Date((previousRegistration as any).submittedAt) : new Date()
        );
      } catch {
        advNum = 1;
      }
    }

    const matchedChildName = [
      previousRegistration.childInfo?.firstName,
      previousRegistration.childInfo?.lastName,
    ].filter(Boolean).join(" ");

    return {
      isReturning: true,
      matchedChildName: matchedChildName || firstName,
      matchedParentName: previousRegistration.parentInfo?.name,
      previousAdventureNumber: advNum || 1,
      previousProgram: previousRegistration.program,
      source: "student_registrations",
    };
  }

  // 2. Check renewal_families
  const renewalFamilyQuery: Record<string, unknown> = {
    renewalStatus: { $in: ["submitted", "reserved", "confirmed", "paid"] },
  };
  if (parentMatches.length) {
    renewalFamilyQuery.$or = parentMatches.map((match) => {
      const key = Object.keys(match)[0];
      if (key === "parentInfo.name") return { parentName: (match as any)[key] };
      if (key === "parentInfo.phone") return { phone: (match as any)[key] };
      if (key === "parentInfo.email") return { parentEmail: (match as any)[key] };
      return match;
    });
  } else {
    renewalFamilyQuery.childName = { $regex: firstNamePattern };
  }

  const renewalFamily = await db.collection("renewal_families").findOne(renewalFamilyQuery);
  if (renewalFamily) {
    return {
      isReturning: true,
      matchedChildName: renewalFamily.childName || firstName,
      matchedParentName: renewalFamily.parentName,
      previousAdventureNumber: 1, // Renewal families are continuing from Adventure 1
      previousProgram: renewalFamily.previousProgram || "curious-explorer",
      source: "renewal_families",
    };
  }

  // 3. Check students collection
  if (lastName) {
    const studentQuery: Record<string, unknown> = {
      "childInfo.firstName": { $regex: firstNamePattern },
      "childInfo.lastName": new RegExp(`^${escapeRegex(lastName)}$`, "i"),
    };
    if (excludeRegistrationId) studentQuery.registrationId = { $ne: excludeRegistrationId };
    const student = await db.collection("students").findOne(studentQuery);
    if (student) {
      const matchedChildName = [
        student.childInfo?.firstName,
        student.childInfo?.lastName,
      ].filter(Boolean).join(" ");

      return {
        isReturning: true,
        matchedChildName: matchedChildName || firstName,
        matchedParentName: student.parentInfo?.name,
        previousAdventureNumber: student.adventureNumber ?? 1,
        previousProgram: student.program || student.programName || "curious-explorer",
        source: "students",
      };
    }
  }

  return { isReturning: false };
}

/** Recognize an established family even when the current registration uses another email. */
export async function isReturningFamilyRecord(
  db: Db,
  registration: any,
  excludeRegistrationId?: string,
): Promise<boolean> {
  const match = await findReturningFamilyMatch(db, registration, excludeRegistrationId);
  return match.isReturning;
}
