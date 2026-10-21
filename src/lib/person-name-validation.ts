const PLACEHOLDER_NAME_WORDS = new Set([
  "abc",
  "asdf",
  "asda",
  "child",
  "dummy",
  "firstname",
  "lastname",
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
  if (!normalized) return false;

  // Reject digits, URLs, html tags, and symbols not found in real names
  if (/\d/.test(normalized)) return false;
  if (!/^[\p{L}\p{M}'’ʼ.,()\-–— ]+$/u.test(normalized)) return false;

  // Cannot start with punctuation or end with trailing hyphens/commas
  if (/^[,.\-–—]/.test(normalized)) return false;
  if (/[,–—-]$/.test(normalized)) return false;

  // No excessive repeated punctuation like ".." or "--" or ",,"
  if (/[.,\-–—]{2,}/.test(normalized)) return false;

  // Balanced parentheses if present
  const openParens = (normalized.match(/\(/g) || []).length;
  const closeParens = (normalized.match(/\)/g) || []).length;
  if (openParens !== closeParens) return false;

  const letters = normalized.match(/\p{L}/gu) || [];
  if (letters.length < 2) return false;

  const words = normalized.toLocaleLowerCase().match(/[\p{L}\p{M}]+/gu) || [];
  if (words.length === 0) return false;

  // Single word placeholder check (e.g. "na", "n/a", "none")
  if (words.length === 1 && (words[0] === "na" || words[0] === "none")) return false;

  if (words.some((word) => PLACEHOLDER_NAME_WORDS.has(word))) return false;
  if (words.some((word) => /(.)\1{3,}/u.test(word) || /qwerty|asdf|zxcv|hjkl/u.test(word))) return false;

  if (requireFullName && (words.length < 2 || letters.length < 4)) return false;

  return true;
}

const ROMAN_NUMERALS = new Set(["ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]);

/**
 * Automatically formats person names into proper Title Case.
 * - Converts ALL CAPS (e.g. "MARIA CLARISSE ANN TOLENTINO") -> "Maria Clarisse Ann Tolentino"
 * - Converts all lowercase (e.g. "maria clarisse") -> "Maria Clarisse"
 * - Preserves Roman numerals (e.g. "Juan Dela Cruz III" -> "Juan Dela Cruz III")
 * - Handles hyphens and apostrophes (e.g. "VILLARIN-SUAVERDEZ" -> "Villarin-Suaverdez", "O'CONNOR" -> "O'Connor")
 * - Preserves intentional mixed case (e.g. "McDonald", "DeLaCruz")
 */
export function formatPersonName(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  return trimmed.replace(/[\p{L}\p{M}]+/gu, (word) => {
    const lower = word.toLowerCase();
    if (ROMAN_NUMERALS.has(lower)) {
      return lower.toUpperCase();
    }
    // If the word is already mixed case (e.g. McDonald, DeLaCruz), keep it
    const isAllCaps = word === word.toUpperCase() && word.length > 1;
    const isAllLower = word === word.toLowerCase();
    if (isAllCaps || isAllLower) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    return word;
  });
}

