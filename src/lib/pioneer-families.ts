/** Build a case-insensitive exact match for either parent email on a Pioneer family. */
export function pioneerEmailQuery(email: string) {
  const escaped = email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const exact = new RegExp(`^${escaped}$`, "i");
  return { $or: [{ email: exact }, { email2: exact }] };
}

