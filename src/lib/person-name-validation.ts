const PLACEHOLDER_NAME_WORDS = new Set([
  "abc",
  "asdf",
  "asda",
  "child",
  "dummy",
  "firstname",
  "lastname",
  "na",
  "none",
  "parent",
  "qwerty",
  "sample",
  "student",
  "test",
  "unknown",
  "xxx",
]);

/** Basic safeguards for person-name fields; this is not an identity verification service. */
export function isPlausiblePersonName(value: unknown, requireFullName = false): boolean {
  if (typeof value !== "string") return false;

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || !/^[\p{L}\p{M}]+(?:[ '\u2019.-][\p{L}\p{M}]+)*$/u.test(normalized)) return false;

  const letters = normalized.match(/\p{L}/gu) || [];
  if (letters.length < 2) return false;

  const words = normalized.toLocaleLowerCase().split(/[ '\u2019.-]+/u).filter(Boolean);
  if (words.some((word) => PLACEHOLDER_NAME_WORDS.has(word))) return false;
  if (words.some((word) => /(.)\1{3,}/u.test(word) || /qwerty|asdf|zxcv|hjkl/u.test(word))) return false;
  if (requireFullName && (words.length < 2 || letters.length < 4)) return false;

  return true;
}
