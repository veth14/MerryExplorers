import type { Db } from "mongodb";

const normalizeReference = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");

/**
 * Checks every payment source used by Payment Tracking before a receipt is stored.
 * Whitespace and letter casing are ignored, matching the admin duplicate warning.
 */
export async function hasDuplicatePaymentReference(db: Db, value: unknown): Promise<boolean> {
  const reference = normalizeReference(value);
  if (reference.length < 4) return false;

  const spacedPattern = `^${[...reference].map((character) => character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s*")}$`;
  const referencePattern = new RegExp(spacedPattern, "i");
  const paymentReferenceQuery = {
    $or: [
      { referenceNumber: referencePattern },
      { "balancePayments.referenceNumber": referencePattern },
      { "sessionPayments.referenceNumber": referencePattern },
      { "renewalStatus.downpayment.referenceNumber": referencePattern },
    ],
  };

  const matches = await Promise.all([
    db.collection("student_registrations").findOne(paymentReferenceQuery, { projection: { _id: 1 } }),
    db.collection("parent_accounts").findOne(paymentReferenceQuery, { projection: { _id: 1 } }),
    db.collection("accounts").findOne(paymentReferenceQuery, { projection: { _id: 1 } }),
  ]);

  return matches.some(Boolean);
}
