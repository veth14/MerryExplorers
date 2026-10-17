import type { Db } from "mongodb";
import { ObjectId } from "mongodb";

/** Recognize an established family even when the current registration uses another email. */
export async function isReturningFamilyRecord(
  db: Db,
  registration: any,
  excludeRegistrationId?: string,
) {
  const firstName = String(registration.childInfo?.firstName || "").trim();
  const firstWord = firstName.split(/\s+/)[0];
  const lastName = String(registration.childInfo?.lastName || "").trim();
  const parentName = String(registration.parentInfo?.name || "").trim();
  const phone = String(registration.parentInfo?.phone || "").replace(/\D/g, "");
  if (!firstWord) return false;

  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const firstNamePattern = new RegExp(`^${escapeRegex(firstWord)}(?:\\s|$)`, "i");
  const parentMatches: Record<string, unknown>[] = [];
  if (parentName) parentMatches.push({ "parentInfo.name": new RegExp(`^${escapeRegex(parentName)}$`, "i") });
  if (phone) parentMatches.push({ "parentInfo.phone": { $regex: new RegExp(`${escapeRegex(phone)}$`) } });

  const previousRegistrationQuery: Record<string, unknown> = {
    status: { $in: ["approved", "active", "early-bird", "scholar"] },
  };
  const childMatch = lastName
    ? { "childInfo.firstName": { $regex: firstNamePattern }, "childInfo.lastName": new RegExp(`^${escapeRegex(lastName)}$`, "i") }
    : null;
  const identityMatches = [...parentMatches, ...(childMatch ? [childMatch] : [])];
  if (identityMatches.length) previousRegistrationQuery.$or = identityMatches;
  else previousRegistrationQuery["childInfo.firstName"] = { $regex: firstNamePattern };
  if (excludeRegistrationId && ObjectId.isValid(excludeRegistrationId)) {
    previousRegistrationQuery._id = { $ne: new ObjectId(excludeRegistrationId) };
  }

  const previousRegistration = await db.collection("student_registrations").findOne(previousRegistrationQuery);
  if (previousRegistration) return true;

  const renewalFamilyQuery: Record<string, unknown> = {
    renewalStatus: { $in: ["submitted", "reserved", "confirmed", "paid"] },
  };
  if (parentMatches.length) {
    renewalFamilyQuery.$or = parentMatches.map((match) => {
      const key = Object.keys(match)[0];
      if (key === "parentInfo.name") return { parentName: (match as any)[key] };
      if (key === "parentInfo.phone") return { phone: (match as any)[key] };
      return match;
    });
  } else {
    renewalFamilyQuery.childName = { $regex: firstNamePattern };
  }
  if (await db.collection("renewal_families").findOne(renewalFamilyQuery)) return true;

  if (!lastName) return false;
  const studentQuery: Record<string, unknown> = {
    "childInfo.firstName": { $regex: firstNamePattern },
    "childInfo.lastName": { $regex: new RegExp(`^${escapeRegex(lastName)}$`, "i") },
  };
  if (excludeRegistrationId) studentQuery.registrationId = { $ne: excludeRegistrationId };
  return Boolean(await db.collection("students").findOne(studentQuery));
}
