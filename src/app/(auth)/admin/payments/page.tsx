"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import type { CSSProperties } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { m } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  calcRegistrationTerms,
  getStudentSessionInfo,
  getProgramAdventureStart,
  firstInterestDate,
  isRegistrationVerified,
  fmtIsoDate,
  RESERVATION_RATE,
  WEEKLY_INTEREST_RATE,
  BALANCE_DUE_SESSION,
  FALLBACK_PIONEER_RATES,
  LEGACY_ADVENTURE_1_START,
} from "@/lib/payment-terms";
import { allocateBalancePayment } from "@/lib/balance-payment";
import { PROGRAM_SLOTS, UNIFORM_KIT } from "@/data/landing";
import { readReceipt, type ReceiptData } from "@/lib/receipt-ocr";
import { useAuth } from "@/lib/auth-context";
import { formatPersonName } from "@/lib/person-name-validation";
import { getAdventureStartFromHistory } from "@/lib/adventure-cycle";

type Payment = {
  id: string;
  amountPaid: number;
  paymentMethod: string;
  referenceNumber?: string;
  receiptBase64?: string;
  submittedAt: string;
  verified: boolean;
  rejected: boolean;
  amountDue?: number;
  adminNote?: string;
  reviewedAt?: string;
  /** true when this registration belongs to Adventure 2 or later (kept for older code paths) */
  isRenewal?: boolean;
  /** which Adventure this registration belongs to (1, 2, 3 ...) */
  advNum?: number;
};

type Account = {
  id: string;
  fullName?: string;
  email: string;
  role?: string;
  childName?: string;
  program?: string;
  sessionPayments?: Payment[];
  renewalStatus?: {
    hasSubmitted?: boolean;
    returning?: string; // "yes" | "no"
    reason?: string;
    slotSecured?: boolean;
    downpayment?: {
      submitted: boolean;
      amountPaid?: number;
      paymentMethod?: string;
      referenceNumber?: string;
      receiptBase64?: string;
      submittedAt: string;
      verified: boolean;
      rejected: boolean;
      adminNote?: string;
      reviewedAt?: string;
    };
  };
};

const FILTERS = [
  { id: "all", label: "All Payments" },
  { id: "pending", label: "Pending" },
  { id: "verified", label: "Verified" },
  { id: "rejected", label: "Rejected" },
];

// Filter pills of the Next Adventure tab
const NEXT_FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Awaiting verify" },
  { id: "intent", label: "No receipt yet" },
  { id: "renewed", label: "Confirmed" },
  { id: "rejected", label: "Rejected" },
];
// rows that need the admin first, confirmed ones last
const NEXT_RANK: Record<string, number> = { pending: 0, intent: 1, rejected: 2, renewed: 3, "not-renewed": 4, "not-returning": 5 };

const SORT_OPTIONS = [
  { id: "newest", label: "Sort: Latest payment" },
  { id: "pending", label: "Sort: Needs action first" },
  { id: "student", label: "Sort: Student A–Z" },
];

const TYPE_OPTIONS = [
  { id: "all", label: "All types" },
  { id: "registration", label: "Registration" },
  { id: "session", label: "Virtual session" },
];

// ── CONFIG ─────────────────────────────────────────────────────
// Adventure dates come from /api/renewal-settings (Curious Explorer is the master program).
// The settings route auto-rolls the cycle when the next start date arrives:
//   BEFORE: currentAdventure = 1, adventureStartDate = Adv 1 start, nextAdventureStart = Adv 2 start
//   AFTER : currentAdventure = 2, adventureStartDate = Adv 2 start, nextAdventureStart = null
// so this page reads all three fields. The fallback below is ONLY used when the settings have no dates
// or could not be loaded (a red banner is shown in that case).
const ADVENTURES_FALLBACK = {
  current: { label: "Adventure 1", start: "2026-06-01", end: "2026-10-31" },
  next: { label: "Adventure 2", start: "2026-11-01", end: "2027-03-31" },
};

const MASTER_PROGRAM = "Discovery Club: Curious Explorer";
const ADVENTURE_PROGRAMS = new Set([
  "Discovery Club: Curious Explorer",
  "Discovery Club: Creative Explorer",
  "Discovery Club: Everyday Explorer",
  "Trailblazer: Brave Explorer",
  "Saturday Playdate",
]);

// Same rule as api/renewal-settings (computeDeadline): renewals open 14 days before an Adventure starts.
// New-family registrations for the next Adventure open at the same time or later, so this date is the
// cut-off: a registration made on/after it is for the NEXT Adventure.
const RENEWAL_OPEN_LEAD_DAYS = 14;

// The Renewals page links here with ?search=<name>. Those links are always about Adventure 2.
const SEARCH_LINK_ADVENTURE = 2;

// Tuition for the NEXT adventure, by program name (as stored in account.program)
const NEXT_TUITION: Record<string, number> = {
  "Trailblazer: Brave Explorer": 0, // TODO: real fee
};

// ~5 months per adventure cycle (approximate, used for deriving date ranges that are not in the settings)
const ADVENTURE_DURATION_MONTHS = 5;

// Payment terms (60% reservation, 40% balance on the 6th session, 4% weekly interest),
// program fees, Welcome Kit / Uniform Set prices and the schedule fallbacks all live in
// "@/lib/payment-terms" so the admin page and the parent dashboards always agree.

// Payments belonging to these students are not tracked on this page.
// TESTING: Ian Angelo is temporarily included. Put "ian angelo" back in this list when done.
const EXCLUDED_STUDENTS: string[] = []; // was ["ian angelo"]

// Reference numbers that are NOT unique on purpose (so they never trigger the "duplicate ref" warning)
const IGNORED_REFS = new Set(["scholar", "none", "n/a", "na", "cash", "free"]);
// ─────────────────────────────────────────────────────────────────

// ── Manual payment encoding (admin enters a payment on behalf of a parent) ──
const PAYMENT_METHODS = [
  { id: "gcash", label: "GCash" },
  { id: "bpi", label: "BPI" },
  { id: "mari-bank", label: "Mari Bank" },
]; // same ids as the parent payment page

// TODO: connect this to however your app knows the logged-in admin (auth context / AppShell).
// The server writes these into the audit log. Until they are set, entries are logged as "Admin".
const ADMIN_ACTOR: { actorUid?: string; actorName?: string } = {};

// Registration statuses that can take a follow-up (balance) payment
const SETTLEABLE_STATUSES = ["approved", "active"];

const MAX_RECEIPT_BYTES = 1_200_000; // ~1.2MB after compression

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Images are resized + compressed in the browser; PDFs are passed through (with a size check)
function fileToReceipt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (file.type === "application/pdf") {
        return dataUrl.length > MAX_RECEIPT_BYTES * 1.37
          ? reject(new Error("PDF is too large. Please use an image or a smaller PDF."))
          : resolve(dataUrl);
      }
      if (!file.type.startsWith("image/")) return reject(new Error("Please upload an image or PDF."));
      const img = new Image();
      img.onerror = () => reject(new Error("That image could not be opened."));
      img.onload = () => {
        const MAX = 1400;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
// ─────────────────────────────────────────────────────────────────

function isExcluded(...values: (string | undefined | null)[]) {
  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  return EXCLUDED_STUDENTS.some((name) => haystack.includes(name));
}

function inRange(iso: string | undefined, a: { start: string; end: string }) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= new Date(a.start).getTime() && t <= new Date(a.end + "T23:59:59").getTime();
}

const fmtDate = fmtIsoDate; // "YYYY-MM-DD" -> "Jun 1, 2026"

type RenewalState = "renewed" | "pending" | "rejected" | "intent" | "not-renewed" | "not-returning";

function getRenewal(acc: Account): RenewalState {
  const rs = acc.renewalStatus;
  const dp = rs?.downpayment;
  if (rs?.returning === "no") return "not-returning";
  if (dp?.submitted && dp.verified) return "renewed";
  if (dp?.submitted && dp.rejected) return "rejected";
  if (dp?.submitted) return "pending";
  if (rs?.hasSubmitted && rs?.returning === "yes") return "intent";
  return "not-renewed";
}

const RENEWAL_BADGE: Record<RenewalState, { label: string; bg: string; color: string }> = {
  renewed: { label: "CONFIRMED", bg: "#f0fdf4", color: "#15803d" },
  pending: { label: "AWAITING VERIFY", bg: "#fffbeb", color: "#b45309" },
  rejected: { label: "DP REJECTED", bg: "#fef2f2", color: "#b91c1c" },
  intent: { label: "NO DOWNPAYMENT", bg: "#eff6ff", color: "#0050d5" },
  "not-renewed": { label: "NOT RENEWED", bg: "#f1f5f9", color: "#64748b" },
  "not-returning": { label: "NOT RETURNING", bg: "#fef2f2", color: "#b91c1c" },
};

function getStatus(p: Payment) {
  if (p.verified) return "verified";
  if (p.rejected) return "rejected";
  return "pending";
}

const AVATAR_COLORS = [
  "linear-gradient(135deg,#002f76,#0050d5)",
  "linear-gradient(135deg,#7c3aed,#a78bfa)",
  "linear-gradient(135deg,#047857,#34d399)",
  "linear-gradient(135deg,#b45309,#fbbf24)",
  "linear-gradient(135deg,#be123c,#fb7185)",
  "linear-gradient(135deg,#0e7490,#22d3ee)",
];

// The avatar colour belongs to the FAMILY (it is picked from the parent's email), not to the row position.
// This way every payment of the same family always has the same colour and initials.
function colorIndex(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % AVATAR_COLORS.length;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function fmtCurrency(n: number | undefined | null) {
  return `₱${(n ?? 0).toLocaleString()}`;
}

function fmtDateTime(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function daysSince(iso: string | undefined) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

const normRef = (r: string | undefined | null) => (r || "").trim().toLowerCase().replace(/\s+/g, "");

// A registration keeps its FIRST payment in amountPaid/receiptUrl and every later balance payment
// in a `balancePayments` array. amountPaid is the running total of both, so the first payment on its
// own is the total minus the balance payments.
const balancePaymentsOf = (r: any): any[] => (Array.isArray(r?.balancePayments) ? r.balancePayments : []);
const sumBalancePayments = (r: any) => balancePaymentsOf(r)
  .filter((b) => b.verified !== false && b.rejected !== true)
  .reduce((s, b) => s + (Number(b.amountPaid) || 0), 0);
const firstPaymentAmount = (r: any) => Math.max(0, (r.amountPaid || r.amountDue || 0) - sumBalancePayments(r));
const isBalanceRow = (p: { id: string }) => p.id.startsWith("bal-");

const fullChildName = (r: any) => `${r?.childInfo?.firstName ?? ""} ${r?.childInfo?.lastName ?? ""}`.trim();

function registrationSessionInfo(registration: any) {
  const program = (PROGRAM_SLOTS as Record<string, any>)[registration?.program];
  const sessionChoice = String(registration?.classTime || "").trim();
  const normalizedChoice = sessionChoice.replace(/\s+Class$/i, " Session").toLowerCase();
  const selectedSession = (program?.classes || []).find((sessionOption: any) =>
    String(sessionOption.name || "").toLowerCase() === normalizedChoice ||
    String(sessionOption.name || "").toLowerCase() === sessionChoice.toLowerCase()
  );
  const session = selectedSession
    ? `${selectedSession.name} · ${selectedSession.time}`
    : sessionChoice || "Session not set";
  return {
    days: program?.schedule || "Days not set",
    session,
  };
}

const fmtShort = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Shown when the Session 6 due date can't be calculated yet
const dueDateText = (dueDate: string | null | undefined, status?: string) =>
  dueDate ? fmtDate(dueDate) : isRegistrationVerified(status) ? "date not set" : "set after approval";

// Check if account belongs to test account
const isTestAccount = (acc?: Account | null) => {
  if (!acc) return false;
  const testPattern = /ian\s+angelo\s+valmores/i;
  return testPattern.test(acc.fullName || "") || testPattern.test(acc.childName || "");
};

// ── ADVENTURE TIMELINE (built from the renewal settings) ────────────────────────
type Tab = "current" | "next" | "past";
type AdvRange = { label: string; start: string; end: string };
type PastAdv = AdvRange & { num: number };
type Timeline = {
  ADVENTURES: { current: AdvRange; next: AdvRange; past: PastAdv[] };
  advNumbers: { current: number; next: number };
  curNum: number;
  curStart: string;          // YYYY-MM-DD, start of the current Adventure
  curStartKnown: boolean;    // false when curStart is only an estimate
  nextStart: string | null;  // YYYY-MM-DD, start of the next Adventure (null = not scheduled yet)
  curOpen: string | null;    // registrations for the CURRENT Adventure opened on this day
  nextOpen: string | null;   // registrations for the NEXT Adventure open on this day
  fromSettings: boolean;     // true = every date came from the renewal settings
  issues: string[];
};
type RegCtx = { tl: Timeline; renewalIds: Set<string> };

const isoDay = (v?: string | null) => (v ? String(v).slice(0, 10) : null);
function addDaysIso(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function addMonthsIso(iso: string, months: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}
const manilaFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" });
const manilaToday = () => manilaFmt.format(new Date());
function manilaDay(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : manilaFmt.format(d);
}

function pickMaster(programs: any[]) {
  const hasDates = (p: any) => !!(isoDay(p?.nextAdventureStart) || isoDay(p?.adventureStartDate));
  return (
    programs.find((p) => p.programKey === MASTER_PROGRAM && hasDates(p)) ??
    programs.find((p) => ADVENTURE_PROGRAMS.has(p.programKey) && hasDates(p)) ??
    null
  );
}

function buildTimeline(programs: any[], today: string): Timeline {
  const fb = ADVENTURES_FALLBACK;
  const fallback = (why: string): Timeline => ({
    ADVENTURES: { current: { ...fb.current }, next: { ...fb.next }, past: [] },
    advNumbers: { current: 1, next: 2 },
    curNum: 1,
    curStart: fb.current.start,
    curStartKnown: false,
    nextStart: fb.next.start,
    curOpen: null,
    nextOpen: addDaysIso(fb.next.start, -RENEWAL_OPEN_LEAD_DAYS),
    fromSettings: false,
    issues: [why],
  });

  const m = pickMaster(programs);
  if (!m) {
    return fallback(
      programs.length
        ? "Renewal Settings has no Adventure dates saved yet (Curious Explorer → “Adv N Started” / “Adv N Starts”). Built-in fallback dates are being used."
        : "Renewal Settings could not be loaded. Built-in fallback dates are being used."
    );
  }

  const issues: string[] = [];
  const n = Number(m.currentAdventure);
  let curNum = Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  const cycleHistory = Array.isArray(m.cycleHistory) ? m.cycleHistory
    .map((entry: any) => ({ num: Number(entry.adventureNumber), start: isoDay(entry.startDate) }))
    .filter((entry: any) => Number.isInteger(entry.num) && entry.num > 0 && !!entry.start) : [];
  let curStart = isoDay(m.adventureStartDate) || cycleHistory.find((entry: any) => entry.num === curNum)?.start || null;
  let nextStart = isoDay(m.nextAdventureStart);
  let curStartKnown = !!curStart;

  // The settings route rolls the cycle when the next start date arrives, but only when it is called.
  // If this page has been open past that date, do the same roll here so the switch still happens.
  if (nextStart && today >= nextStart) {
    curNum += 1;
    curStart = nextStart;
    curStartKnown = true;
    nextStart = null;
  }

  if (!curStart) {
    curStart = addMonthsIso(nextStart!, -ADVENTURE_DURATION_MONTHS);
    issues.push(
      `Adventure ${curNum}’s start date is not set in Renewal Settings (“Adv ${curNum} Started”). It is being estimated as ${fmtDate(curStart)}.`
    );
  }

  const curEnd = nextStart ? addDaysIso(nextStart, -1) : addDaysIso(addMonthsIso(curStart, ADVENTURE_DURATION_MONTHS), -1);
  const nStart = nextStart ?? addMonthsIso(curStart, ADVENTURE_DURATION_MONTHS);
  const nEnd = addDaysIso(addMonthsIso(nStart, ADVENTURE_DURATION_MONTHS), -1);
  const historicalPast: PastAdv[] = cycleHistory
    .filter((entry: any) => entry.num < curNum)
    .sort((a: any, b: any) => b.num - a.num)
    .map((entry: any) => {
      const nextCycleStart = cycleHistory.find((next: any) => next.num === entry.num + 1)?.start
        || (entry.num + 1 === curNum ? curStart : null);
      return {
        label: `Adventure ${entry.num}`,
        start: entry.start!,
        end: addDaysIso(nextCycleStart || addMonthsIso(entry.start!, ADVENTURE_DURATION_MONTHS), -1),
        num: entry.num,
      };
    });
  const past: PastAdv[] = historicalPast.length > 0
    ? historicalPast
    : curNum > 1
      ? [{
          label: `Adventure ${curNum - 1}`,
          // Legacy fallback for settings saved before cycle history was added.
          start: curNum === 2 && curStart === "2026-10-26"
            ? LEGACY_ADVENTURE_1_START
            : addMonthsIso(curStart, -ADVENTURE_DURATION_MONTHS),
          end: addDaysIso(curStart, -1),
          num: curNum - 1,
        }]
      : [];

  return {
    ADVENTURES: {
      current: { label: `Adventure ${curNum}`, start: curStart, end: curEnd },
      next: { label: `Adventure ${curNum + 1}`, start: nStart, end: nEnd },
      past,
    },
    advNumbers: { current: curNum, next: curNum + 1 },
    curNum,
    curStart,
    curStartKnown,
    nextStart,
    curOpen: curStartKnown ? addDaysIso(curStart, -RENEWAL_OPEN_LEAD_DAYS) : null,
    nextOpen: nextStart ? addDaysIso(nextStart, -RENEWAL_OPEN_LEAD_DAYS) : null,
    fromSettings: issues.length === 0,
    issues,
  };
}

const tabOfNum = (n: number, cur: number): Tab => (n === cur ? "current" : n < cur ? "past" : "next");

// Adventure a virtual-session payment belongs to (sessions have no registration, so the date decides)
function sessionAdvNum(tl: Timeline, day: string | null): number {
  if (!day) return tl.curNum;
  if (tl.nextStart && day >= tl.nextStart) return tl.curNum + 1;
  let n = tl.curNum;
  let s = tl.curStart;
  while (day < s && n > 1) {
    n -= 1;
    s = tl.ADVENTURES.past.find((adventure) => adventure.num === n)?.start
      || addMonthsIso(s, -ADVENTURE_DURATION_MONTHS);
  }
  return n;
}

// Adventure a registration made on `day` is for, going only by the "registrations open" dates
function advByOpenDate(tl: Timeline, day: string): number {
  const cycles = [
    ...tl.ADVENTURES.past,
    { ...tl.ADVENTURES.current, num: tl.curNum },
    { ...tl.ADVENTURES.next, num: tl.curNum + 1 },
  ].sort((a, b) => a.start.localeCompare(b.start));
  const first = cycles[0];
  if (!first) return tl.curNum;

  let selected = first;
  for (const cycle of cycles) {
    const opensOn = addDaysIso(cycle.start, -RENEWAL_OPEN_LEAD_DAYS);
    if (day >= opensOn) selected = cycle;
    else break;
  }
  return selected.num;
}

// For a registration that is known to be a renewal: the first Adventure that had NOT started yet on `day`
function firstUnstartedAdv(tl: Timeline, day: string): number | null {
  if (tl.curStartKnown && day < tl.curStart && day >= addMonthsIso(tl.curStart, -ADVENTURE_DURATION_MONTHS)) return tl.curNum;
  if (tl.nextStart && day < tl.nextStart && day >= tl.curStart) return tl.curNum + 1;
  return null;
}

// Earliest of created/submitted, so a registration made in September and paid in October stays in its own Adventure
function regDay(r: any): string | null {
  const days = [manilaDay(r?.createdAt), manilaDay(r?.submittedAt)].filter(Boolean) as string[];
  return days.sort()[0] ?? null;
}

// Must match the same criteria as the Renewals API (api/renewals/route.ts):
// - isPromoRegistration: true  (renewal promo flow)
// - parentInfo.isRenewal: true (explicit renewal flag from /renew page)
// - renewalPeriod is set       (tagged by admin or system)
// NOTE: isNewFamily === false is NOT used — it's too broad. A returning family's
// original Adventure 1 registration also has isNewFamily:false.
const isRenewalReg = (r: any): boolean =>
  Boolean(r.isPromoRegistration) ||
  Boolean(r.parentInfo?.isRenewal) ||
  Boolean(r.renewalPeriod);

// Which Adventure number is this registration for? The registration decides, never the payment date:
//   1. it carries an `adventure` number of 2 or more
//   2. it is listed in the Renewals records, or has a renewal marker (isRenewalReg)  -> the Adventure after the one running when it was made
//   3. otherwise the date it was made vs. the "registrations open" date of each Adventure (new families)
function regAdventureNum(r: any, ctx: RegCtx): number {
  const { tl } = ctx;
  const explicit = Math.floor(Number(r?.adventure ?? r?.adventureNumber));
  const day = regDay(r);

  // Older records made before Adventure 2 registration opened were incorrectly
  // stamped as Adventure 2. Keep those registrations in Adventure 1.
  if (explicit === 2 && tl.curNum === 2 && day && tl.curOpen && day < tl.curOpen) return 1;
  if (Number.isFinite(explicit) && explicit >= 2) return explicit;

  let n = day ? advByOpenDate(tl, day) : tl.curNum;
  if (ctx.renewalIds.has(String(r?.id)) || isRenewalReg(r)) {
    const up = day ? firstUnstartedAdv(tl, day) : tl.nextStart ? tl.curNum + 1 : tl.curNum;
    if (up != null) n = Math.max(n, up);
  }
  return n;
}

// Dynamic adventure badge — number based, so it keeps working after the switch
function advNumBadge(num: number, curNum: number): { label: string; short: string; bg: string; color: string } {
  const base = { label: `Adventure ${num}`, short: `ADVENTURE ${num}` };
  if (num === curNum) return { ...base, bg: "#eff6ff", color: "#0050d5" };
  if (num > curNum) return { ...base, bg: "#f5f3ff", color: "#7c3aed" };
  return { ...base, bg: "#f1f5f9", color: "#64748b" };
}
const advTagStyle = (num: number, curNum: number): CSSProperties => ({
  display: "inline-flex", padding: "2px 7px", borderRadius: "20px", fontSize: "10px", fontWeight: 800,
  background: advNumBadge(num, curNum).bg, color: advNumBadge(num, curNum).color, letterSpacing: "0.3px",
});

// Builders shared by the list AND the ledger, so a payment looks the same wherever it is opened from
const regAccountOf = (r: any): Account => ({
  id: r.id,
  fullName: r.parentInfo?.name,
  email: r.parentInfo?.email || "",
  childName: fullChildName(r), // full name so two siblings are never mixed up
  program: r.program,
});

const firstPaymentOf = (r: any, advNum?: number): Payment => ({
  id: "reg-" + r.id,
  amountPaid: firstPaymentAmount(r),
  paymentMethod: r.paymentMethod || "",
  referenceNumber: r.referenceNumber,
  receiptBase64: r.receiptUrl || r.receiptBase64,
  submittedAt: r.submittedAt || new Date().toISOString(),
  verified: isRegistrationVerified(r.status),
  rejected: r.status === "rejected",
  amountDue: r.amountDue,
  adminNote: r.adminNote,
  reviewedAt: r.reviewedAt || r.approvedAt,
  advNum,
  isRenewal: (advNum ?? 1) >= 2,
});
const balancePaymentOf = (r: any, b: any, advNum?: number): Payment => ({
  id: "bal-" + b.id,
  amountPaid: b.amountPaid || 0,
  paymentMethod: b.paymentMethod || "",
  referenceNumber: b.referenceNumber,
  receiptBase64: b.receiptUrl,
  submittedAt: b.paidOn || b.recordedAt || new Date().toISOString(),
  verified: b.verified !== false,
  rejected: false,
  adminNote: b.adminNote,
  reviewedAt: b.recordedAt,
  advNum,
  isRenewal: (advNum ?? 1) >= 2,
});
const sortedBalancesOf = (r: any): any[] =>
  [...balancePaymentsOf(r)].sort(
    (a, b) => new Date(a.paidOn || a.recordedAt || 0).getTime() - new Date(b.paidOn || b.recordedAt || 0).getTime()
  );

type PaymentKind = "session" | "downpayment" | "registration";
type DetailItem = { uid: string; acc: Account; payment: Payment; type: PaymentKind; seq?: number; seqTotal?: number };
type PaymentItem = { uid: string; acc: Account; payment: Payment; type: "session" | "registration"; seq: number; seqTotal: number; advNum: number; tab: Tab };
type LedgerRow = { key: string; kind: PaymentKind; label: string; date: string; method: string; ref: string; amount: number; verified: boolean; rejected: boolean; regId?: string; child?: string; advNum: number | null; item: DetailItem };
// One row of the list = one student (all of that student's payments grouped together)
type PaymentGroup = {
  key: string; uid: string; acc: Account; type: "session" | "registration";
  items: PaymentItem[]; status: "pending" | "verified" | "rejected";
  latest: PaymentItem; pendingItem: PaymentItem | null; verifiedCount: number;
  total: number; lastTime: number; firstTime: number;
};

// small coloured label used in the list rows
const tagStyle = (bg: string, color: string): CSSProperties => ({
  display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "20px", fontSize: "10px",
  fontWeight: 800, background: bg, color, letterSpacing: "0.3px", whiteSpace: "nowrap",
});

// what kind of payment is this row? (label + colours used everywhere so admins always read it the same way)
function kindTag(type: PaymentKind, payment: Payment) {
  const adv2 = (payment.advNum ?? 1) >= 2;
  if (type === "session") return { label: "VIRTUAL SESSION", bg: "#ecfeff", color: "#0e7490" };
  if (type === "downpayment") return { label: "RENEWAL DOWNPAYMENT", bg: "#f5f3ff", color: "#7c3aed" };
  if (isBalanceRow(payment)) return { label: adv2 ? `ADVENTURE ${payment.advNum} BALANCE` : "BALANCE PAYMENT", bg: "#fff7ed", color: "#c2410c" };
  if (adv2) return { label: `ADVENTURE ${payment.advNum} REGISTRATION`, bg: "#f5f3ff", color: "#7c3aed" };
  return { label: "REGISTRATION · 1ST PAYMENT", bg: "#eff6ff", color: "#0050d5" };
}

const EMPTY_FORM = {
  type: "registration" as PaymentKind,
  paymentOption: "downpayment" as "downpayment" | "full",
  isNewFamily: true,
  uniformOrdered: false,
  recitalKitOrdered: false,
  accountId: "",
  registrationId: "",
  amountPaid: "",
  paymentMethod: "gcash",
  referenceNumber: "",
  paidOn: "",
  adminNote: "",
  previousAdventureBalance: "",
  verifyNow: true,
  sendEmail: true,
  waiveInterest: false,
};

// turns an account's renewal downpayment into a Payment object for the details modal
function dpToPayment(acc: Account): Payment {
  const dp = acc.renewalStatus!.downpayment!;
  return {
    id: "dp-" + acc.id,
    amountPaid: dp.amountPaid || 0,
    paymentMethod: dp.paymentMethod || "",
    referenceNumber: dp.referenceNumber,
    receiptBase64: dp.receiptBase64,
    submittedAt: dp.submittedAt,
    verified: dp.verified,
    rejected: dp.rejected,
    adminNote: dp.adminNote,
    reviewedAt: dp.reviewedAt,
  };
}

const PAY_GRID = "2fr 1.4fr 1.3fr 1.1fr 1.3fr";

// numbers shown in the four stat cards of the Current and Past tabs
function calcStats(items: PaymentItem[]) {
  const statPayments = items.filter((p) => !isTestAccount(p.acc));
  const total = statPayments.length;
  const pending = statPayments.filter((p) => !p.payment.verified && !p.payment.rejected).length;
  const verified = statPayments.filter((p) => p.payment.verified).length;
  const totalRevenue = statPayments.filter((p) => p.payment.verified).reduce((s, p) => s + p.payment.amountPaid, 0);
  const students = new Set(statPayments.map((p) => `${p.type}-${p.uid}`)).size;
  return { total, pending, verified, totalRevenue, students };
}

function AdminPaymentsPageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<any[]>([]); // includes registrations with no payment yet (for manual encoding + the Next tab)
  const [mainLoading, setMainLoading] = useState(true);
  const [view, setView] = useState<Tab>("current");
  const [renewalSettings, setRenewalSettings] = useState<any[]>([]); // ProgramRenewalEntry[]
  const [settingsOk, setSettingsOk] = useState(false);
  const [today, setToday] = useState(manilaToday());
  const [renewalIds, setRenewalIds] = useState<Set<string>>(new Set());
  const [pioneerEmails, setPioneerEmails] = useState<Set<string>>(new Set());
  const [pioneerPrices, setPioneerPrices] = useState<Record<string, number>>({});
  const [renewalsFeed, setRenewalsFeed] = useState<"loading" | "ok" | "empty" | "failed">("loading");
  const [activeFilter, setActiveFilter] = useState("all");
  const [nextFilter, setNextFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [nextPage, setNextPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [urlSearch, setUrlSearch] = useState<string | null>(null); // ?search= from the Renewals page
  const searchApplied = useRef(false);
  const prevCurNum = useRef<number | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [approvalPreviousBalance, setApprovalPreviousBalance] = useState("");
  const [approvalPreviousBalanceSaved, setApprovalPreviousBalanceSaved] = useState(false);
  const [savingApprovalPreviousBalance, setSavingApprovalPreviousBalance] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ uid: string; paymentId: string | null; type: PaymentKind } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reminderPreview, setReminderPreview] = useState<{ uid: string; to: string; subject: string; html: string } | null>(null);

  // the page is "loading" until the main data AND the Renewals records are in, so rows never jump between tabs
  const loading = mainLoading || renewalsFeed === "loading";

  // ── Manual encoding state ──
  const [manualOpen, setManualOpen] = useState(false);
  const [manualAdventureMode, setManualAdventureMode] = useState<"past" | "current" | "next">("current");
  const [form, setForm] = useState({ ...EMPTY_FORM, paidOn: todayIso() });
  const [receipt, setReceipt] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState("");
  const [parentFilter, setParentFilter] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrAmount, setOcrAmount] = useState<number | null>(null);
  const [ocrInfo, setOcrInfo] = useState<ReceiptData | null>(null); // what the last receipt scan found
  const ocrRunRef = useRef(0); // lets a newer upload cancel the result of an older scan
  const lastOcrRef = useRef<ReceiptData | null>(null); // what the previous scan filled in (so a new receipt can replace it)
  const paidOnTouched = useRef(false); // the admin picked the date by hand: don't overwrite it
  const methodTouched = useRef(false); // same for the payment method
  // keeps the receipt's amount when another registration / parent is chosen after the receipt was uploaded
  const ocrAmountText = ocrAmount != null ? String(ocrAmount) : "";

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // re-check the date every 5 minutes so the page switches Adventures even if it is left open overnight
  useEffect(() => {
    const t = setInterval(() => setToday(manilaToday()), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const modalRef = useRef<HTMLDivElement>(null);

  function openDetail(item: DetailItem) {
    setImgFailed(false);
    const registration = item.type === "registration"
      ? allRegistrations.find((r) => String(r.id) === String(item.uid))
      : null;
    setApprovalPreviousBalance(typeof registration?.previousAdventureBalance === "number"
      ? String(registration.previousAdventureBalance)
      : "");
    setApprovalPreviousBalanceSaved(typeof registration?.previousAdventureBalance === "number");
    setDetail(item);
    // when switching payments from the ledger, jump back to the top so the new info is visible
    modalRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function copyText(text: string, what: string) {
    navigator.clipboard.writeText(text).then(() => showToast(`${what} copied`)).catch(() => showToast("Copy failed. Please try again.", "error"));
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/accounts").then((res) => res.json()),
      fetch("/api/registrations?status=all").then((res) => res.json()),
      fetch("/api/renewal-settings").then((res) => res.json()).catch(() => ({ programs: [] })),
      fetch("/api/pioneer-families").then((res) => res.json()).catch(() => ({ families: [], pioneerPrices: {} })),
    ])
      .then(([accountsData, regData, settingsData, pioneerData]) => {
        if (pioneerData) {
          const list: any[] = Array.isArray(pioneerData.families) ? pioneerData.families : [];
          const emails = new Set<string>();
          list.forEach((f) => {
            if (f.email) emails.add(String(f.email).toLowerCase().trim());
            if (f.email2) emails.add(String(f.email2).toLowerCase().trim());
          });
          setPioneerEmails(emails);
          if (pioneerData.pioneerPrices && typeof pioneerData.pioneerPrices === "object") {
            setPioneerPrices(pioneerData.pioneerPrices);
          }
        }
        if (Array.isArray(accountsData)) {
          setAllAccounts(
            accountsData.filter(
              (acc: Account) => (!acc.role || acc.role === "parent") && !isExcluded(acc.childName)
            )
          );
          setAccounts(
            accountsData.filter(
              (acc: Account) =>
                !isExcluded(acc.childName) &&
                ((acc.sessionPayments && acc.sessionPayments.length > 0) ||
                  acc.renewalStatus?.downpayment?.submitted)
            )
          );
        }
        if (regData?.success && Array.isArray(regData.data)) {
          setAllRegistrations(regData.data);
          setRegistrations(
            regData.data.filter(
              (r: any) =>
                !isExcluded(
                  r.childInfo?.firstName,
                  r.childInfo?.lastName,
                  `${r.childInfo?.firstName ?? ""} ${r.childInfo?.lastName ?? ""}`
                ) &&
                (r.receiptUrl || r.receiptBase64 || r.amountPaid > 0)
            )
          );
        }
        if (Array.isArray(settingsData?.programs) && settingsData.programs.length > 0 && !settingsData.error) {
          setRenewalSettings(settingsData.programs);
          setSettingsOk(true);
        }
      })
      .catch(console.error)
      .finally(() => setMainLoading(false));
  }, []);

  // ── Registration ids that appear on the Renewals page ──
  // /api/renewals/periods -> one /api/renewals?period=<slug> per period -> records[].registrationId
  // The response shapes are read defensively because those two routes were never shared.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pRes = await fetch("/api/renewals/periods");
        if (!pRes.ok) throw new Error(`periods ${pRes.status}`);
        const pData = await pRes.json();
        const list: any[] = Array.isArray(pData) ? pData : Array.isArray(pData?.periods) ? pData.periods : Array.isArray(pData?.data) ? pData.data : [];
        const slugs = list
          .map((p) => (typeof p === "string" ? p : p?.slug ?? p?.id ?? p?.period ?? p?.key))
          .filter(Boolean) as string[];
        const ids = new Set<string>();
        let failed = false;
        await Promise.all(
          slugs.map(async (slug) => {
            try {
              const res = await fetch(`/api/renewals?period=${encodeURIComponent(slug)}`);
              if (!res.ok) { failed = true; return; }
              const d = await res.json();
              const recs: any[] = Array.isArray(d?.records) ? d.records : Array.isArray(d?.data?.records) ? d.data.records : Array.isArray(d) ? d : [];
              recs.forEach((rec) => {
                const id = rec?.registrationId ?? rec?.regId;
                if (id) ids.add(String(id));
              });
            } catch {
              failed = true;
            }
          })
        );
        if (cancelled) return;
        setRenewalIds(ids);
        setRenewalsFeed(failed ? "failed" : ids.size === 0 ? "empty" : "ok");
      } catch {
        if (!cancelled) setRenewalsFeed("failed");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Auto-open the manual modal when redirected from the Renewals page ──
  useEffect(() => {
    const trigger = searchParams.get("record_payment");
    if (trigger !== "true") return;

    const regId = searchParams.get("regId") ?? "";
    const amount = searchParams.get("amount") ?? "";

    // Reset the form and pre-populate the known fields
    setForm({
      ...EMPTY_FORM,
      paidOn: todayIso(),
      type: "registration",
      registrationId: regId,
      amountPaid: amount,
    });
    setParentFilter(searchParams.get("childName") ?? searchParams.get("parentName") ?? "");
    setReceipt(null);
    setReceiptName("");
    setManualError("");
    setOcrLoading(false);
    setOcrAmount(null);
    setOcrInfo(null);
    ocrRunRef.current++;
    lastOcrRef.current = null;
    paidOnTouched.current = false;
    methodTouched.current = false;
    setManualAdventureMode("current");
    setManualOpen(true);

    // Clean the query params so a page refresh doesn't re-open the modal
    router.replace("/admin/payments", { scroll: false });
    // Only run once after data has loaded and searchParams are available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── ?search=<name> (links from the Renewals page): remember it, apply it once the data is loaded ──
  useEffect(() => {
    const s = searchParams.get("search");
    if (s) {
      searchApplied.current = false;
      setUrlSearch(s);
    }
  }, [searchParams]);

  // ── The Adventure timeline, built from the renewal settings ──
  const tl = useMemo(() => buildTimeline(renewalSettings, today), [renewalSettings, today]);
  const { ADVENTURES, advNumbers } = tl;

  const regCtx = useMemo<RegCtx>(() => ({ tl, renewalIds }), [tl, renewalIds]);
  const regAdvMap = useMemo(() => {
    const map = new Map<string, number>();
    allRegistrations.forEach((r) => map.set(String(r.id), regAdventureNum(r, regCtx)));
    return map;
  }, [allRegistrations, regCtx]);
  const advOf = (r: any): number => regAdvMap.get(String(r?.id)) ?? regAdventureNum(r, regCtx);

  // First day of the Adventure a registration belongs to, from THAT PROGRAM's own dates
  // (Programs & Registration Control). Falls back to the master program's dates.
  const advStartOf = (r: any): string | undefined => {
    const n = advOf(r);
    const historicalStart = getAdventureStartFromHistory(r.program, n, renewalSettings);
    if (historicalStart) return historicalStart;
    const own = getProgramAdventureStart(renewalSettings, r.program, n, today);
    if (own) return own;

    if (n === tl.curNum) return tl.curStart;
    if (n === tl.curNum + 1) return ADVENTURES.next.start;
    // For past adventures, prefer the registration's own stored adventureStartDate
    // (saved at approval time) over the backwards-estimated past[] start, which
    // is only approximate (curStart minus ADVENTURE_DURATION_MONTHS).
    const storedStart = r?.adventureStartDate ? String(r.adventureStartDate).slice(0, 10) : null;
    if (storedStart) return storedStart;
    return ADVENTURES.past.find((p) => p.num === n)?.start;
  };

  // everything that is not coming from the renewal settings or the Renewals records (shown in the red banner)
  const dateIssues = useMemo(() => {
    const out = [...tl.issues];
    if (renewalsFeed === "failed") out.push("The Renewals records could not be loaded (/api/renewals), so some Adventure 2 registrations may be showing under the wrong tab.");
    if (renewalsFeed === "empty") out.push("The Renewals records came back empty. Registrations are being sorted by their dates and renewal markers only.");
    return out;
  }, [tl, renewalsFeed]);

  // when the Adventures switch (current moves up by one), a user sitting on the old "Next" tab is moved to "Current"
  useEffect(() => {
    if (prevCurNum.current != null && tl.curNum > prevCurNum.current) setView((v) => (v === "next" ? "current" : v));
    prevCurNum.current = tl.curNum;
  }, [tl.curNum]);

  // apply ?search= and open the Adventure 2 tab (the "Current" tab once Adventure 2 has started)
  useEffect(() => {
    if (loading || urlSearch === null || searchApplied.current) return;
    searchApplied.current = true;
    setSearch(urlSearch);
    setView(tabOfNum(SEARCH_LINK_ADVENTURE, tl.curNum));
  }, [loading, urlSearch, tl.curNum]);

  // which Adventure a payment shown in the details modal belongs to
  function advNumOfDetail(d: DetailItem): number | null {
    if (d.type === "registration") {
      const r = allRegistrations.find((x) => x.id === d.uid);
      return r ? advOf(r) : null;
    }
    if (d.type === "downpayment") return tl.curNum + 1;
    return sessionAdvNum(tl, manilaDay(d.payment.submittedAt));
  }

  // ── EVERY payment (all Adventures), each tagged with the tab it belongs to ──
  const everyPayment = useMemo(() => {
    const flat: PaymentItem[] = [];
    accounts.forEach((acc) => {
      (acc.sessionPayments || []).forEach((p) => {
        const advNum = sessionAdvNum(tl, manilaDay(p.submittedAt));
        flat.push({ uid: acc.id, acc, payment: { ...p, advNum }, type: "session", seq: 1, seqTotal: 1, advNum, tab: tabOfNum(advNum, tl.curNum) });
      });
    });

    registrations.forEach((r) => {
      const regAcc = regAccountOf(r);
      const advNum = advOf(r);
      const tab = tabOfNum(advNum, tl.curNum);

      // the first payment
      flat.push({ uid: r.id, acc: regAcc, type: "registration", seq: 1, seqTotal: 1, payment: firstPaymentOf(r, advNum), advNum, tab });

      // later payments of the remaining balance (encoded by the admin) stay with their registration
      balancePaymentsOf(r).forEach((b: any) => {
        flat.push({ uid: r.id, acc: regAcc, type: "registration", seq: 1, seqTotal: 1, payment: balancePaymentOf(r, b, advNum), advNum, tab });
      });
    });

    // Number the payments of each student ("Payment 2 of 3"): the first payment is always #1,
    // balance payments follow in the order they were paid.
    const groups = new Map<string, PaymentItem[]>();
    flat.forEach((it) => {
      const k = `${it.type}-${it.uid}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(it);
    });
    groups.forEach((items) => {
      items.sort(
        (a, b) =>
          Number(isBalanceRow(a.payment)) - Number(isBalanceRow(b.payment)) ||
          new Date(a.payment.submittedAt).getTime() - new Date(b.payment.submittedAt).getTime()
      );
      items.forEach((it, i) => { it.seq = i + 1; it.seqTotal = items.length; });
    });

    return flat.sort((a, b) => new Date(b.payment.submittedAt).getTime() - new Date(a.payment.submittedAt).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, registrations, tl, regAdvMap]);

  // CURRENT tab: session + registration payments of the current Adventure
  const allPayments = useMemo(() => everyPayment.filter((p) => p.tab === "current"), [everyPayment]);
  // PAST tab: everything from Adventures that already ended
  const pastItems = useMemo(() => everyPayment.filter((p) => p.tab === "past"), [everyPayment]);

  const stats = useMemo(() => calcStats(allPayments), [allPayments]);
  const pastStats = useMemo(() => calcStats(pastItems), [pastItems]);

  // One group per student: all of that student's payments in one place
  const allGroups = useMemo<PaymentGroup[]>(() => {
    const map = new Map<string, PaymentItem[]>();
    allPayments.forEach((it) => {
      const k = `${it.type}-${it.uid}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    });
    const out: PaymentGroup[] = [];
    map.forEach((items, key) => {
      items.sort((a, b) => a.seq - b.seq);
      const time = (i: PaymentItem) => new Date(i.payment.submittedAt).getTime();
      const pending = items.filter((i) => getStatus(i.payment) === "pending");
      const verifiedItems = items.filter((i) => i.payment.verified);
      // pending wins (needs action), then verified, otherwise everything was rejected
      const status: PaymentGroup["status"] = pending.length ? "pending" : verifiedItems.length ? "verified" : "rejected";
      const latest = [...items].sort((a, b) => time(b) - time(a))[0];
      const counted = items.filter((i) => !i.payment.rejected);
      const total = (counted.length ? counted : items).reduce((sum, i) => sum + i.payment.amountPaid, 0);
      out.push({
        key, uid: items[0].uid, acc: items[0].acc, type: items[0].type, items, status, latest,
        pendingItem: pending[0] ?? null, verifiedCount: verifiedItems.length, total,
        lastTime: time(latest), firstTime: Math.min(...items.map(time)),
      });
    });
    return out.sort((a, b) => b.lastTime - a.lastTime);
  }, [allPayments]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: allGroups.length, pending: 0, verified: 0, rejected: 0 };
    allGroups.forEach((g) => { c[g.status]++; });
    return c;
  }, [allGroups]);

  // reference numbers used by more than one payment (possible double-encoding or re-used receipt) — across ALL Adventures
  const dupRefs = useMemo(() => {
    const counts = new Map<string, number>();
    everyPayment.forEach(({ payment }) => {
      const r = normRef(payment.referenceNumber);
      if (r.length < 4 || IGNORED_REFS.has(r)) return;
      counts.set(r, (counts.get(r) || 0) + 1);
    });
    const dups = new Set<string>();
    counts.forEach((n, r) => { if (n > 1) dups.add(r); });
    return dups;
  }, [everyPayment]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = allGroups.filter((g) => {
      const matchFilter = activeFilter === "all" || g.status === activeFilter;
      const matchType = typeFilter === "all" || g.type === typeFilter;
      const hasBalance = g.items.some((i) => isBalanceRow(i.payment));
      const typeText = g.type === "session" ? "virtual session" : hasBalance ? "registration balance payment" : "registration";
      const matchSearch = !q ||
        (g.acc.fullName || "").toLowerCase().includes(q) ||
        (g.acc.email || "").toLowerCase().includes(q) ||
        (g.acc.childName || "").toLowerCase().includes(q) ||
        (g.acc.program || "").toLowerCase().includes(q) ||
        g.items.some((i) => (i.payment.referenceNumber || "").toLowerCase().includes(q)) ||
        typeText.includes(q);
      return matchFilter && matchType && matchSearch;
    });

    if (sortBy === "pending") {
      const rank = (g: PaymentGroup) => (g.status === "pending" ? 0 : g.status === "rejected" ? 1 : 2);
      return [...list].sort((a, b) => rank(a) - rank(b) || b.lastTime - a.lastTime);
    }
    if (sortBy === "student") {
      return [...list].sort((a, b) =>
        (a.acc.childName || a.acc.fullName || "").localeCompare(b.acc.childName || b.acc.fullName || "")
      );
    }
    return list; // already newest first
  }, [allGroups, activeFilter, typeFilter, sortBy, search]);

  const currentPageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, currentPageCount);
  const paginatedPayments = filtered.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [view, activeFilter, typeFilter, sortBy, search, pageSize]);

  useEffect(() => {
    if (currentPage > currentPageCount) setCurrentPage(currentPageCount);
  }, [currentPage, currentPageCount]);

  // ── PAST tab: payments and unpaid registrations of Adventures that already ended ──
  const pastGroups = useMemo(() => {
    const q = search.toLowerCase();
    // The Past Adventures table lists each registration payment once. Balance
    // payments remain available in the payment details modal's account ledger.
    const rows = pastItems.filter(({ acc, payment }) =>
      !isBalanceRow(payment) && (
        !q ||
        (acc.fullName || "").toLowerCase().includes(q) ||
        (acc.email || "").toLowerCase().includes(q) ||
        (acc.childName || "").toLowerCase().includes(q) ||
        (acc.program || "").toLowerCase().includes(q) ||
        (payment.referenceNumber || "").toLowerCase().includes(q)
      )
    );
    const map = new Map<number, PaymentItem[]>();
    rows.forEach((it) => {
      if (!map.has(it.advNum)) map.set(it.advNum, []);
      map.get(it.advNum)!.push(it);
    });
    const unpaidRegistrations = allRegistrations.filter((r) => {
      if (tabOfNum(advOf(r), tl.curNum) !== "past" || String(r.status || "").toLowerCase() === "expired") return false;
      if (r.receiptUrl || r.receiptBase64 || Number(r.amountPaid) > 0) return false;
      if (isExcluded(r.childInfo?.firstName, r.childInfo?.lastName, fullChildName(r))) return false;
      if (!q) return true;
      return `${fullChildName(r)} ${r.parentInfo?.name || ""} ${r.parentInfo?.email || ""} ${r.program || ""}`.toLowerCase().includes(q);
    });
    const unpaidByAdventure = new Map<number, any[]>();
    unpaidRegistrations.forEach((r) => {
      const num = advOf(r);
      if (!unpaidByAdventure.has(num)) unpaidByAdventure.set(num, []);
      unpaidByAdventure.get(num)!.push(r);
    });

    const adventureNumbers = new Set([...map.keys(), ...unpaidByAdventure.keys()]);
    const out = Array.from(adventureNumbers).map((num) => ({
      num,
      items: [...(map.get(num) || [])].sort((a, b) => new Date(b.payment.submittedAt || 0).getTime() - new Date(a.payment.submittedAt || 0).getTime()),
      unpaid: unpaidByAdventure.get(num) || [],
    }));
    out.sort((a, b) => b.num - a.num);
    return { groups: out, count: rows.length, unpaidCount: unpaidRegistrations.length };
  }, [pastItems, allRegistrations, search, tl, regAdvMap]);

  // ── NEXT tab: every registration for the next Adventure (new OR existing family), paid or not ──
  // Source of truth: allRegistrations, assigned to this tab by the registration itself (regAdventureNum),
  // so families who have not paid yet still show up as "No receipt yet".
  const renewalRowsAll = useMemo(() => {
    return allRegistrations
      .filter((r) => tabOfNum(advOf(r), tl.curNum) === "next" && !isExcluded(
        r.childInfo?.firstName,
        r.childInfo?.lastName,
        `${r.childInfo?.firstName ?? ""} ${r.childInfo?.lastName ?? ""}`
      ))
      .map((r) => {
        const payment = firstPaymentOf(r, advOf(r));
        const hasReceipt = !!(r.receiptUrl || r.receiptBase64 || r.amountPaid > 0);
        let state: RenewalState;
        if (!hasReceipt) state = "intent";
        else if (isRegistrationVerified(r.status)) state = "renewed";
        else if (r.status === "rejected") state = "rejected";
        else state = "pending";

        const amountPaid = (Number(r.amountPaid) || 0);
        const paidVerified = isRegistrationVerified(r.status) ? amountPaid : 0;
        const acc = regAccountOf(r);
        return { r, acc, payment, state, paidVerified, hasReceipt };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRegistrations, tl, regAdvMap]);

  // filtered by the pills + search, and sorted: rows that need the admin first, newest first inside each group
  const renewalRows = useMemo(() => {
    const q = search.toLowerCase();
    return renewalRowsAll
      .filter(({ r, acc, state }) => {
        if (isTestAccount(acc)) return false;
        if (nextFilter !== "all" && state !== nextFilter) return false;
        if (!q) return true;
        const child = fullChildName(r).toLowerCase();
        return (
          child.includes(q) ||
          (acc.fullName || "").toLowerCase().includes(q) ||
          (r.parentInfo?.email || "").toLowerCase().includes(q) ||
          (r.program || "").toLowerCase().includes(q) ||
          (r.referenceNumber || "").toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          (NEXT_RANK[a.state] ?? 9) - (NEXT_RANK[b.state] ?? 9) ||
          new Date(b.r.submittedAt || b.r.createdAt || 0).getTime() - new Date(a.r.submittedAt || a.r.createdAt || 0).getTime()
      );
  }, [renewalRowsAll, search, nextFilter]);

  const nextPageCount = Math.max(1, Math.ceil(renewalRows.length / pageSize));
  const safeNextPage = Math.min(nextPage, nextPageCount);
  const paginatedRenewalRows = renewalRows.slice((safeNextPage - 1) * pageSize, safeNextPage * pageSize);

  useEffect(() => {
    setNextPage(1);
  }, [view, search, nextFilter, pageSize]);

  useEffect(() => {
    if (nextPage > nextPageCount) setNextPage(nextPageCount);
  }, [nextPage, nextPageCount]);

  const pastPageCount = Math.max(1, Math.ceil(pastGroups.groups.length / pageSize));
  const safePastPage = Math.min(pastPage, pastPageCount);
  const paginatedPastGroups = pastGroups.groups.slice((safePastPage - 1) * pageSize, safePastPage * pageSize);

  useEffect(() => {
    setPastPage(1);
  }, [view, search, pageSize]);

  useEffect(() => {
    if (pastPage > pastPageCount) setPastPage(pastPageCount);
  }, [pastPage, pastPageCount]);

  // numbers on the filter pills of the Next tab
  const nextCounts = useMemo(() => {
    const c: Record<string, number> = { all: 0, pending: 0, intent: 0, renewed: 0, rejected: 0 };
    renewalRowsAll.forEach(({ acc, state }) => {
      if (isTestAccount(acc)) return;
      c.all++;
      c[state] = (c[state] || 0) + 1;
    });
    return c;
  }, [renewalRowsAll]);

  const nextStats = useMemo(() => {
    const rows = renewalRowsAll.filter(({ acc }) => !isTestAccount(acc));
    const total = rows.length;
    const renewed = rows.filter((r) => r.state === "renewed").length;
    const awaiting = rows.filter((r) => r.state === "pending").length;
    const pending = rows.filter((r) => r.state === "intent").length;
    const collected = rows.filter((r) => r.state === "renewed").reduce((s, r) => s + r.paidVerified, 0);
    return { total, renewed, awaiting, pending, collected };
  }, [renewalRowsAll]);

  // Verify runs immediately; reject opens the custom reason modal first
  async function saveApprovalPreviousBalance() {
    if (!detail || detail.type !== "registration") return;
    const amount = Number(approvalPreviousBalance);
    if (
      approvalPreviousBalance.trim() === "" ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001
    ) {
      showToast("Enter a valid previous adventure balance, or clear the field to skip it.", "error");
      return;
    }

    setSavingApprovalPreviousBalance(true);
    try {
      const result = await postJson(`/api/registrations/${detail.uid}/previous-balance`, "PATCH", { amount });
      if (!result.ok) {
        setApprovalPreviousBalanceSaved(false);
        showToast(result.error || "Could not save the previous adventure balance.", "error");
        return;
      }

      setApprovalPreviousBalance(String(result.data.previousAdventureBalance));
      setApprovalPreviousBalanceSaved(true);
      setAllRegistrations((current) => current.map((registration) => String(registration.id) === String(detail.uid)
        ? { ...registration, previousAdventureBalance: result.data.previousAdventureBalance }
        : registration));
      setRegistrations((current) => current.map((registration) => String(registration.id) === String(detail.uid)
        ? { ...registration, previousAdventureBalance: result.data.previousAdventureBalance }
        : registration));
      showToast("Previous adventure balance saved. You can verify the payment now.");
    } catch {
      setApprovalPreviousBalanceSaved(false);
      showToast("Network error saving the previous adventure balance.", "error");
    } finally {
      setSavingApprovalPreviousBalance(false);
    }
  }

  function handleAction(uid: string, paymentId: string | null, action: "verify" | "reject", type: PaymentKind) {
    if (action === "reject") {
      setRejectReason("");
      setRejectTarget({ uid, paymentId, type });
      return;
    }
    runAction(uid, paymentId, "verify", type, "");
  }

  function confirmReject() {
    if (!rejectTarget) return;
    const { uid, paymentId, type } = rejectTarget;
    setRejectTarget(null);
    runAction(uid, paymentId, "reject", type, rejectReason.trim());
  }

  async function runAction(uid: string, paymentId: string | null, action: "verify" | "reject", type: PaymentKind, adminNote: string) {
    const key = `${uid}-${paymentId}-${action}`;
    setActioning(key);

    let url = "";
    let body: any = {};
    let method = "PATCH";

    if (type === "registration" && paymentId?.startsWith("bal-")) {
      url = `/api/registrations/${uid}/balance-payment/review`;
      body = { paymentId: paymentId.slice(4), action, adminNote };
    } else if (type === "registration") {
      url = `/api/registrations/${uid}/${action === "verify" ? "approve" : "reject"}`;
      method = "POST";
      body = { adminNote };
    } else {
      url = type === "session" ? "/api/parents/session-payment" : "/api/parents/downpayment";
      body = type === "session" ? { uid, paymentId, action, adminNote } : { uid, action, adminNote };
    }

    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) window.location.reload();
      else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Action failed. Please try again.", "error");
      }
    } catch { showToast("Network error. Please try again.", "error"); }
    finally { setActioning(null); }
  }

  async function sendRegistrationEmail(uid: string, emailAction: "reminder" | "confirmation") {
    const key = `${uid}-email-${emailAction}`;
    setActioning(key);
    try {
      const res = await fetch(
        emailAction === "reminder"
          ? `/api/registrations/${uid}/send-reminder`
          : `/api/registrations/${uid}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailAction === "reminder" ? { action: "preview" } : { emailAction: "resendConfirmation" }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (emailAction === "reminder") {
        if (!res.ok || !data.preview) {
          showToast(data.error || "The reminder preview could not be loaded.", "error");
          return;
        }
        setReminderPreview({ uid, ...data.preview });
        return;
      }
      if (!res.ok || !data.emailSent) {
        showToast(data.error || "The email could not be sent.", "error");
        return;
      }
      showToast("Corrected confirmation email sent.");
    } catch {
      showToast("Network error sending the email.", "error");
    } finally {
      setActioning(null);
    }
  }

  async function confirmSendReminder() {
    if (!reminderPreview) return;
    const { uid } = reminderPreview;
    setActioning(`${uid}-email-reminder-send`);
    try {
      const res = await fetch(`/api/registrations/${uid}/send-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.emailSent) {
        showToast(data.error || "The email could not be sent.", "error");
        return;
      }
      setReminderPreview(null);
      showToast("Payment reminder sent.");
    } catch {
      showToast("Network error sending the email.", "error");
    } finally {
      setActioning(null);
    }
  }

  async function updateRegistrationFamilyType(uid: string, isNewFamily: boolean) {
    const key = `${uid}-family-type`;
    setActioning(key);
    try {
      const { ok, error } = await postJson(`/api/registrations/${uid}`, "PATCH", { isNewFamily });
      if (!ok) {
        showToast(error || "Could not update the family type.", "error");
        return;
      }
      setAllRegistrations((current) => current.map((registration) =>
        String(registration.id) === String(uid)
          ? { ...registration, isNewFamily, familyTypeOverride: isNewFamily }
          : registration
      ));
      showToast(isNewFamily ? "Marked as a new family." : "Marked as a returning family.");
    } catch {
      showToast("Network error updating the family type.", "error");
    } finally {
      setActioning(null);
    }
  }

  // ── Manual payment encoding ──
  const setF = (patch: Partial<typeof EMPTY_FORM>) => setForm((f) => ({ ...f, ...patch }));

  function openManual() {
    setForm({ ...EMPTY_FORM, paidOn: todayIso() });
    setReceipt(null);
    setReceiptName("");
    setParentFilter("");
    setManualError("");
    setOcrLoading(false);
    setOcrAmount(null);
    setOcrInfo(null);
    ocrRunRef.current++;
    lastOcrRef.current = null;
    paidOnTouched.current = false;
    methodTouched.current = false;
    setManualAdventureMode("current");
    setManualOpen(true);
  }

  // Opens Encode Payment with one registration already chosen (used by the "No receipt yet" rows of the Next tab)
  function openManualFor(r: any) {
    setForm({
      ...EMPTY_FORM,
      paidOn: todayIso(),
      type: "registration",
      registrationId: r.id,
      previousAdventureBalance: typeof r.previousAdventureBalance === "number" ? String(r.previousAdventureBalance) : "",
    });
    setParentFilter(fullChildName(r));
    setReceipt(null);
    setReceiptName("");
    setManualError("");
    setOcrLoading(false);
    setOcrAmount(null);
    setOcrInfo(null);
    ocrRunRef.current++;
    lastOcrRef.current = null;
    paidOnTouched.current = false;
    methodTouched.current = false;
    const adventureNum = regAdventureNum(r, regCtx);
    setManualAdventureMode(adventureNum < tl.curNum ? "past" : adventureNum === tl.curNum + 1 ? "next" : "current");
    setManualOpen(true);
  }

  const parentOptions = useMemo(() => {
    const q = parentFilter.toLowerCase();
    return [...allAccounts]
      .filter((a) => !q || `${a.fullName ?? ""} ${a.childName ?? ""} ${a.email}`.toLowerCase().includes(q))
      .sort((a, b) => (a.fullName || a.email).localeCompare(b.fullName || b.email));
  }, [allAccounts, parentFilter]);

  const registrationOptions = useMemo(() => {
    const q = parentFilter.toLowerCase();
    const targetAdventure = tl.curNum + (manualAdventureMode === "next" ? 1 : manualAdventureMode === "past" ? -1 : 0);
    const matching = allRegistrations
      .filter((r) => {
        const name = `${r.childInfo?.firstName ?? ""} ${r.childInfo?.lastName ?? ""} ${r.parentInfo?.name ?? ""} ${r.parentInfo?.email ?? ""}`;
        return String(r.status || "").toLowerCase() !== "expired" &&
          regAdventureNum(r, regCtx) === targetAdventure &&
          (!q || name.toLowerCase().includes(q));
      })
      .sort((a, b) => new Date(b.submittedAt || b.createdAt || 0).getTime() - new Date(a.submittedAt || a.createdAt || 0).getTime());

    // A family can have separate registrations for different Adventures, but duplicate
    // records for the same child, parent, program, and Adventure should appear only once here.
    const unique = new Map<string, any>();
    for (const r of matching) {
      const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
      const child = normalize(fullChildName(r));
      const parent = normalize(r.parentInfo?.email || r.parentInfo?.name);
      const program = normalize(r.program);
      const adventure = regAdventureNum(r, regCtx);
      const key = [child, parent, program, adventure].join("|");
      if (!unique.has(key)) unique.set(key, r);
    }

    return [...unique.values()].sort((a, b) =>
      fullChildName(a).localeCompare(fullChildName(b)) ||
      regAdventureNum(a, regCtx) - regAdventureNum(b, regCtx) ||
      String(a.program || "").localeCompare(String(b.program || ""))
    );
  }, [allRegistrations, parentFilter, regCtx, manualAdventureMode, tl.curNum]);

  function enrichRegWithPioneer(raw: any) {
    if (!raw) return raw;
    const email = (raw.parentInfo?.email || "").toLowerCase().trim();
    const isPioneer = Boolean(raw.isPioneer || (email && pioneerEmails.has(email)));
    if (!isPioneer) return raw;
    const pPrice = pioneerPrices[raw.program] || (FALLBACK_PIONEER_RATES as any)[raw.program];
    return {
      ...raw,
      isPioneer: true,
      customRate: raw.customRate || pPrice || undefined,
      isNewFamily: false,
      welcomeKitOrdered: false,
    };
  }

  // Same rules as the details modal (calcRegistrationTerms) so the numbers always match.
  // `asOf` = the date interest is calculated up to. Omit it for "today" (list rows, details modal);
  // the Encode Payment form passes the "Date paid" so a payment made last Sunday isn't charged
  // for a Monday that only arrived afterwards.
  function regInfo(rawReg: any, asOf?: Date) {
    const reg = enrichRegWithPioneer(rawReg);
    const email = (reg?.parentInfo?.email || "").toLowerCase();
    const parentAcc = allAccounts.find((a) => (a.email || "").toLowerCase() === email);
    // CHANGED: sessions are never counted before the Adventure's own start date
    const student = getStudentSessionInfo(reg, parentAcc, advStartOf(reg));
    const paidVerified = isRegistrationVerified(reg?.status) ? reg?.amountPaid || reg?.amountDue || 0 : 0;
    const prevBal = typeof reg?.previousAdventureBalance === "number" ? reg.previousAdventureBalance : 0;
    const paidToPrev = Math.min(paidVerified, prevBal);
    const appliedToSession = Math.max(0, paidVerified - paidToPrev);
    const terms = calcRegistrationTerms(reg, student, appliedToSession, reg?.amountDue, asOf);
    // first payment = the one parents make on the "Secure Your Slot" page
    const isInitial = reg?.status === "reserved" || reg?.status === "early-bird";
    const prog = (PROGRAM_SLOTS as any)[reg?.program] ?? null;
    return { terms, paidVerified, paidToPrev, appliedToSession, isInitial, prog };
  }

  // Account balance per registration, shown on every row so the admin sees where the student stands
  const regSummary = useMemo(() => {
    const map = new Map<string, { due: number | null; balance: number | null; sessionBalance?: number | null; prevBalance?: number; interest: number; totalPayable: number | null; paid: number }>();
    registrations.forEach((r) => {
      try {
        const info = regInfo(r);
        const t: any = info.terms;
        const prevBal = typeof r.previousAdventureBalance === "number" ? r.previousAdventureBalance : 0;
        const paidToPrev = info.paidToPrev ?? Math.min(info.paidVerified, prevBal);
        const remainingPrev = Math.max(0, prevBal - paidToPrev);
        if (t) {
          const totalBal = t.balance != null ? t.balance + remainingPrev : (remainingPrev > 0 ? remainingPrev : null);
          const totalPayable = t.totalPayable != null ? t.totalPayable + remainingPrev : totalBal;
          map.set(r.id, {
            due: t.due ?? null,
            balance: totalBal,
            sessionBalance: t.balance ?? null,
            prevBalance: remainingPrev,
            interest: t.interest || 0,
            totalPayable,
            paid: info.paidVerified || 0,
          });
        }
      } catch {
        // a registration with odd data should never break the whole list
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrations, allAccounts, tl, regAdvMap, renewalSettings, today]); // CHANGED: also recalculates when each program's own dates load // CHANGED: also recalculates when the Adventure dates load

  // Interest in the Encode Payment form is calculated as of the DATE THE PARENT PAID, not today.
  // Noon is used so the date can't slip a day because of timezones.
  const paidAsOf = form.paidOn ? new Date(form.paidOn + "T12:00:00") : undefined;

  const selectedReg = useMemo(
    () => (form.type === "registration" ? allRegistrations.find((r) => r.id === form.registrationId) ?? null : null),
    [form.type, form.registrationId, allRegistrations]
  );

  const selectedAcc = useMemo(
    () => (form.type !== "registration" ? allAccounts.find((a) => a.id === form.accountId) ?? null : null),
    [form.type, form.accountId, allAccounts]
  );

  // registrations belonging to the selected parent (matched by email) – for the balance preview
  const familyRegs = useMemo(() => {
    if (!selectedAcc) return [];
    const e = (selectedAcc.email || "").toLowerCase();
    return allRegistrations.filter((r) => (r.parentInfo?.email || "").toLowerCase() === e);
  }, [selectedAcc, allRegistrations]);

  const nextRow = useMemo(() => {
    if (form.type !== "downpayment") return null;
    const row = renewalRowsAll.find((rr) => {
      const email = (rr.r?.parentInfo?.email || "").toLowerCase();
      const accEmail = (rr.acc?.email || "").toLowerCase();
      return rr.acc.id === form.accountId || (form.accountId && accEmail === (accounts.find((a) => a.id === form.accountId)?.email || "").toLowerCase());
    });
    if (!row) return null;
    const fee = NEXT_TUITION[row.r.program || ""] || 0;
    const paid = row.paidVerified;
    const balance = fee > 0 ? Math.max(0, fee - paid) : null;
    return { ...row, fee, paid, balance };
  }, [form.type, form.accountId, renewalRowsAll, accounts]);

  // Amount due for the FIRST registration payment (program rate/downpayment + kits), same as the parent page
  const regCalc = useMemo(() => {
    if (!selectedReg) return null;
    const info = regInfo(selectedReg, paidAsOf);
    const isBallet = selectedReg.program === "ballet";
    const addons: { label: string; amount: number }[] = [];
    if (isBallet) {
      if (form.recitalKitOrdered) addons.push({ label: "Recital Kit (Preorder)", amount: 1500 });
    } else if (form.isNewFamily) {
      addons.push({ label: "Welcome Kit", amount: UNIFORM_KIT.welcomeKitPrice });
    } else if (form.uniformOrdered) {
      addons.push({ label: "Uniform Set", amount: UNIFORM_KIT.price });
    }
    const addonCost = addons.reduce((s, a) => s + a.amount, 0);
    const base = info.prog ? (form.paymentOption === "full" ? info.prog.rate : info.prog.downpayment) : 0;
    const amountDue = info.isInitial && info.prog ? base + addonCost : null;
    return { ...info, isBallet, addons, addonCost, base, amountDue };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReg, form.paymentOption, form.isNewFamily, form.uniformOrdered, form.recitalKitOrdered, allAccounts, form.paidOn, tl, regAdvMap]); // CHANGED: + tl, regAdvMap

  const paidNum = Number(form.amountPaid) || 0;
  const expectedNow = regCalc?.amountDue ?? null;
  const creditBalance = expectedNow != null && paidNum > expectedNow ? +(paidNum - expectedNow).toFixed(2) : 0;
  const amountShort = expectedNow != null && paidNum > 0 && paidNum < expectedNow ? +(expectedNow - paidNum).toFixed(2) : 0;

  // ── Follow-up payment: paying off what's left on a registration that already has a payment ──
  const isFollowUp = form.type === "registration" && !!selectedReg && !!regCalc && !regCalc.isInitial;
  const needsPreviousAdventureBalance = !!selectedReg && !isFollowUp && advOf(selectedReg) >= 2;
  const followTerms = isFollowUp ? regCalc!.terms : null;

  // ── Interest rule: no interest is owed for a payment made before the first interest Monday ──
  // `followTerms` is calculated as of the DATE PAID. `serverTerms` is the same registration as of TODAY, which is what
  // the balance-payment route calculates. If interest only built up AFTER the payment date, that part is not charged.
  // TEMPORARY: once the balance-payment route counts interest up to `paidOn`, delete autoWaiveInterest / serverTerms
  // and send `expectedTotalPayable: followTerms?.totalPayable` and `waiveInterest: waivable && form.waiveInterest` again.
  const serverTerms = isFollowUp && selectedReg ? regInfo(selectedReg).terms : null;
  const lateInterest = followTerms && serverTerms ? Math.max(0, (serverTerms.interest || 0) - (followTerms.interest || 0)) : 0;
  const owedOnPaidDate = followTerms ? followTerms.totalPayable ?? followTerms.balance ?? 0 : 0;
  // only when the parent paid everything that was owed on the day they paid
  const autoWaiveInterest = lateInterest > 0 && paidNum > 0 && paidNum >= owedOnPaidDate;
  const settleDue = followTerms ? followTerms.totalPayable ?? followTerms.balance ?? null : null;
  // same function the server uses, so this preview always matches what gets saved
  const settleAlloc = followTerms && paidNum > 0 ? allocateBalancePayment(followTerms, paidNum, form.waiveInterest) : null;
  // paying the balance but not all of the overdue interest -> the admin must choose to waive the rest
  const waivable =
    !!followTerms && (followTerms.interest || 0) > 0 && paidNum >= (followTerms.balance || 0) && paidNum < (followTerms.totalPayable || 0);
  const followStatusBlocked = isFollowUp && !SETTLEABLE_STATUSES.includes(selectedReg?.status);
  // balance payments are recorded as verified, so the "verified" checkbox only applies to first payments
  const verifiedNow = isFollowUp || form.verifyNow;

  // Is the reference number being typed already used by another payment?
  const dupRefMatch = useMemo(() => {
    const r = normRef(form.referenceNumber);
    if (r.length < 4 || IGNORED_REFS.has(r)) return null;
    return everyPayment.find((p) => normRef(p.payment.referenceNumber) === r) ?? null;
  }, [form.referenceNumber, everyPayment]);

  async function handleReceiptFile(file: File | undefined) {
    if (!file) return;
    setManualError("");
    try {
      const data = await fileToReceipt(file);
      setReceipt(data);
      setReceiptName(file.name);
      // Read the reference no., amount, date and bank off the receipt and fill the form with them
      if (data.startsWith("data:image")) {
        const run = ++ocrRunRef.current;
        setOcrLoading(true);
        setOcrInfo(null);
        setOcrAmount(null);
        readReceipt(file, data)
          .then((res) => {
            if (run !== ocrRunRef.current) return; // a newer receipt was uploaded (or this one removed) meanwhile
            const prev = lastOcrRef.current;
            lastOcrRef.current = res;
            setOcrInfo(res);
            setOcrAmount(res.amount);
            setForm((f) => {
              const next = { ...f };
              // a field is only replaced when it is empty or still holds what the previous scan put there,
              // so anything the admin typed or changed by hand is never overwritten
              if (res.reference && (!f.referenceNumber || f.referenceNumber === prev?.reference)) next.referenceNumber = res.reference;
              if (res.amount != null && (!f.amountPaid || Number(f.amountPaid) === prev?.amount)) next.amountPaid = String(res.amount);
              if (res.date && !paidOnTouched.current) next.paidOn = res.date;
              if (res.method && !methodTouched.current) next.paymentMethod = res.method;
              return next;
            });
          })
          .catch(() => {
            if (run === ocrRunRef.current) setOcrInfo({ reference: "", amount: null, date: null, method: null });
          })
          .finally(() => {
            if (run === ocrRunRef.current) setOcrLoading(false);
          });
      } else {
        // a PDF can't be scanned here: the admin types the details in
        ocrRunRef.current++;
        setOcrLoading(false);
        setOcrInfo(null);
        setOcrAmount(null);
      }
    } catch (e: any) {
      setReceipt(null);
      setReceiptName("");
      setManualError(e.message || "Receipt upload failed.");
    }
  }

  // which Adventure tab will this payment show up in?
  // Registration payments follow their REGISTRATION; session payments follow the date paid.
  const landsIn = useMemo(() => {
    if (form.type === "registration") return selectedReg ? `Adventure ${advOf(selectedReg)}` : null;
    if (form.type === "downpayment") return `Adventure ${tl.curNum + 1}`;
    if (!form.paidOn) return null;
    return `Adventure ${sessionAdvNum(tl, form.paidOn)}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type, form.paidOn, selectedReg, tl, regAdvMap]);

  async function postJson(url: string, method: string, body: any) {
    const idToken = user ? await user.getIdToken(true) : null;
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok && data?.success !== false, error: (data?.error as string | undefined) || "", data };
  }

  // Emails the "payment received" confirmation to the parent (/api/payments/notify).
  // Only called after the payment was saved. For balance payments `result` is what the server returned,
  // so the email always shows the numbers that were actually stored.
  async function sendConfirmationEmail(to: string, amount: number, result: any | null) {
    let remaining: number | null = null;
    let dueNote = "";
    let settlement: { previousBalance: number; interest: number; totalPayable: number; interestWaived: number; creditAdded: number } | null = null;

    if (form.type === "registration" && result) {
      // follow-up (balance) payment
      remaining = result.balanceAfter;
      settlement = {
        previousBalance: result.balanceBefore ?? 0,
        // interest rows only make sense when this payment clears or waives it
        interest: result.fullySettled ? result.interest ?? 0 : 0,
        totalPayable: result.fullySettled ? result.totalPayable ?? 0 : result.balanceBefore ?? 0,
        interestWaived: result.interestWaived ?? 0,
        creditAdded: result.creditAdded ?? 0,
      };
      if (remaining && remaining > 0) {
        if ((result.interest ?? 0) > 0) {
          dueNote = `${Math.round(WEEKLY_INTEREST_RATE * 100)}% interest keeps applying every Monday to the remaining balance`;
        } else if (regCalc?.terms?.dueDate) {
          dueNote = `Balance due on session ${BALANCE_DUE_SESSION} (${fmtDate(regCalc.terms.dueDate)})`;
        }
      }
    } else if (form.type === "registration" && regCalc) {
      const t = regCalc.terms;
      if (regCalc.isInitial && regCalc.prog) {
        // first payment: full = nothing left, downpayment = the balance share (kits are paid up front)
        remaining = form.paymentOption === "full" ? 0 : Math.max(0, regCalc.prog.rate - regCalc.prog.downpayment);
      }
      if (remaining && remaining > 0 && t?.reservation != null && t.dueDate) {
        dueNote = `Balance due on session ${BALANCE_DUE_SESSION} (${fmtDate(t.dueDate)})`;
      }
    } else if (form.type === "downpayment" && nextRow?.balance != null) {
      remaining = Math.max(0, nextRow.balance - amount);
    }

    const reg = selectedReg;
    const r = await postJson("/api/payments/notify", "POST", {
      to,
      parentName: reg ? reg.parentInfo?.name : selectedAcc?.fullName,
      childName: reg ? `${reg.childInfo?.firstName ?? ""} ${reg.childInfo?.lastName ?? ""}`.trim() : selectedAcc?.childName,
      programName: reg ? reg.program : selectedAcc?.program,
      paymentLabel:
        form.type === "session"
          ? "Virtual Session Payment"
          : form.type === "registration"
            ? result ? "Registration Balance Payment" : "Registration Payment"
            : "Renewal Downpayment",
      amountPaid: amount,
      paymentMethod: form.paymentMethod,
      referenceNumber: form.referenceNumber.trim(),
      paidOn: new Date(form.paidOn + "T12:00:00").toISOString(),
      remainingBalance: remaining,
      dueNote,
      settlement,
      targetId: reg ? reg.id : form.accountId,
      ...ADMIN_ACTOR,
    });
    return r.ok;
  }

  async function submitManual() {
    setManualError("");
    const amount = Number(form.amountPaid);

    if (form.type === "registration" ? !form.registrationId : !form.accountId)
      return setManualError(form.type === "registration" ? "Please choose the registration." : "Please choose the parent account.");
    if (!amount || amount <= 0) return setManualError("Enter the amount paid (must be more than ₱0).");
    if (amountShort > 0) return setManualError(`The amount is short by ${fmtCurrency(amountShort)}. Amount due is ${fmtCurrency(expectedNow ?? 0)}.`);
    if (!form.paidOn) return setManualError("Enter the date the parent paid.");
    if (!form.referenceNumber.trim()) return setManualError("Reference number is required (copy it from the receipt).");
    if (!receipt) return setManualError("Please upload the receipt (photo or screenshot).");
    if (needsPreviousAdventureBalance && form.verifyNow && form.previousAdventureBalance.trim() !== "") {
      const previousBalance = Number(form.previousAdventureBalance);
      if (!Number.isFinite(previousBalance) || previousBalance < 0 || Math.abs(Math.round(previousBalance * 100) - previousBalance * 100) > 0.000001) {
        return setManualError("Enter a valid previous adventure balance, or clear the field to skip it.");
      }
    }

    if (isFollowUp) {
      if (followStatusBlocked)
        return setManualError(
          `This registration is "${selectedReg?.status}". A balance payment can only be recorded once the first payment is approved. Verify or fix the first payment first.`
        );
      if (settleAlloc && !settleAlloc.ok) return setManualError(settleAlloc.error || "This payment can't be applied.");
    }

    const adminFields = {
      submittedAt: new Date(form.paidOn + "T12:00:00").toISOString(),
      adminNote: form.adminNote.trim(),
      encodedByAdmin: true,
      encodedAt: new Date().toISOString(),
    };

    setManualSaving(true);
    try {
      let balanceResult: any | null = null; // what the server stored for a balance payment
      let approveEmailed = false; // the approve route already emailed the parent ("Officially Registered")

      if (form.type === "registration" && !isFollowUp && needsPreviousAdventureBalance && form.verifyNow && form.previousAdventureBalance.trim() !== "") {
        const savedPreviousBalance = await postJson(`/api/registrations/${form.registrationId}/previous-balance`, "PATCH", {
          amount: Number(form.previousAdventureBalance),
        });
        if (!savedPreviousBalance.ok) {
          return setManualError(savedPreviousBalance.error || "Could not save the previous adventure balance.");
        }
      }

      if (form.type === "registration") {
        if (isFollowUp) {
          // Balance payment: its own admin endpoint. It never touches /payment (first payment only)
          // or /approve (would create a duplicate student and send the registration email again).
          const r = await postJson(`/api/registrations/${form.registrationId}/balance-payment`, "POST", {
            paymentMethod: form.paymentMethod,
            receiptBase64: receipt,
            referenceNumber: form.referenceNumber.trim(),
            amountPaid: amount,
            paidOn: adminFields.submittedAt,
            adminNote: [
              adminFields.adminNote,
              autoWaiveInterest
                ? `Interest not charged: paid on ${fmtDate(form.paidOn)}${followTerms?.interestStart ? `, before interest started on ${fmtDate(followTerms.interestStart)}` : ""}.`
                : "",
            ].filter(Boolean).join(" · "),
            waiveInterest: autoWaiveInterest || (waivable && form.waiveInterest),
            expectedTotalPayable: serverTerms?.totalPayable ?? followTerms?.totalPayable ?? null, // the server's own (today) total
            ...ADMIN_ACTOR,
          });
          if (!r.ok) return setManualError(r.error || "Could not save the payment. Please try again.");
          balanceResult = r.data;
        } else {
          // First payment: same body the parent's "Secure Your Slot" page sends to /api/registrations/:id/payment
          const isInitial = !!regCalc?.isInitial && regCalc.amountDue != null;
          if (!isInitial)
            return setManualError("The program rates for this registration were not found, so its first payment can't be encoded here.");
          // NOTE: that route ignores submittedAt / adminNote / encodedByAdmin (it stamps "now"), so for first
          // payments the "Date paid" and the admin note are not stored yet.
          const r1 = await postJson(`/api/registrations/${form.registrationId}/payment`, "POST", {
            paymentMethod: form.paymentMethod,
            receiptBase64: receipt,
            uniformOrdered: form.uniformOrdered,
            lanyardOrdered: false,
            welcomeKitOrdered: false,
            recitalKitOrdered: form.recitalKitOrdered,
            isNewFamily: form.isNewFamily,
            paymentType: form.paymentOption,
            amountDue: regCalc!.amountDue,
            amountPaid: amount,
            creditBalance,
            referenceNumber: form.referenceNumber.trim(),
            ...adminFields,
          });
          if (!r1.ok) return setManualError(r1.error || "Could not save the payment. Please try again.");

          if (form.verifyNow) {
            const r2 = await postJson(`/api/registrations/${form.registrationId}/approve`, "POST", { adminNote: adminFields.adminNote, ...ADMIN_ACTOR });
            if (!r2.ok) {
              setManualError("Payment was saved, but verifying it failed. Close this and press ✓ Verify on the list.");
              setTimeout(() => window.location.reload(), 2500);
              return;
            }
            approveEmailed = !!r2.data?.emailSent;
          }
        }
      } else {
        // ⚠️ TODO: confirm these accept a POST that creates the payment (their routes haven't been shared yet)
        const url = form.type === "session" ? "/api/parents/session-payment" : "/api/parents/downpayment";
        const r = await postJson(url, "POST", {
          uid: form.accountId,
          amountPaid: amount,
          paymentMethod: form.paymentMethod,
          referenceNumber: form.referenceNumber.trim(),
          receiptBase64: receipt,
          verified: form.verifyNow,
          ...adminFields,
        });
        if (!r.ok) return setManualError(r.error || "Could not save the payment. Please try again.");
      }

      // Email only after the save succeeded, and not when /approve already emailed the parent
      if (form.sendEmail && verifiedNow && !approveEmailed) {
        const email = (form.type === "registration" ? selectedReg?.parentInfo?.email : selectedAcc?.email) || "";
        const emailed = email ? await sendConfirmationEmail(email, amount, balanceResult) : false;
        if (!emailed) {
          setManualError(email
            ? "Payment saved, but the confirmation email could not be sent."
            : "Payment saved, but this parent has no email on record.");
          setTimeout(() => window.location.reload(), 2500);
          return;
        }
      }
      window.location.reload();
    } catch {
      setManualError("Network error. Please try again.");
    } finally {
      setManualSaving(false);
    }
  }

  // ── Payment details modal: ledger, breakdown, copy ──
  const ledger = useMemo<LedgerRow[]>(() => {
    if (!detail) return [];
    const email = (detail.acc.email || "").toLowerCase();
    const rows: LedgerRow[] = [];
    accounts.forEach((a) => {
      const match = a.id === detail.acc.id || (!!email && (a.email || "").toLowerCase() === email);
      if (!match) return;
      const sp = [...(a.sessionPayments || [])].sort((x, y) => new Date(x.submittedAt).getTime() - new Date(y.submittedAt).getTime());
      sp.forEach((p, i) =>
        rows.push({
          key: "s-" + p.id, kind: "session", label: "Virtual Session", date: p.submittedAt, method: p.paymentMethod, ref: p.referenceNumber || "",
          amount: p.amountPaid, verified: p.verified, rejected: p.rejected, child: a.childName,
          advNum: sessionAdvNum(tl, manilaDay(p.submittedAt)),
          item: { uid: a.id, acc: a, payment: p, type: "session", seq: i + 1, seqTotal: sp.length },
        })
      );
      const dp = a.renewalStatus?.downpayment;
      if (dp?.submitted)
        rows.push({
          key: "dp-" + a.id, kind: "downpayment", label: "Renewal Downpayment", date: dp.submittedAt, method: dp.paymentMethod || "", ref: dp.referenceNumber || "",
          amount: dp.amountPaid || 0, verified: dp.verified, rejected: dp.rejected, child: a.childName,
          advNum: tl.curNum + 1,
          item: { uid: a.id, acc: a, payment: dpToPayment(a), type: "downpayment", seq: 1, seqTotal: 1 },
        });
    });
    registrations.forEach((r) => {
      const rEmail = (r.parentInfo?.email || "").toLowerCase();
      if (r.id !== detail.uid && !(email && rEmail === email)) return;
      const regAcc = regAccountOf(r);
      const advNum = advOf(r);
      const bals = sortedBalancesOf(r);
      const total = 1 + bals.length;
      const first = firstPaymentOf(r, advNum);
      rows.push({
        key: "r-" + r.id, kind: "registration", label: "Registration (1st payment)",
        date: first.submittedAt, method: first.paymentMethod, ref: first.referenceNumber || "",
        amount: first.amountPaid, verified: first.verified, rejected: first.rejected,
        regId: r.id, child: fullChildName(r), advNum,
        item: { uid: r.id, acc: regAcc, payment: first, type: "registration", seq: 1, seqTotal: total },
      });
      bals.forEach((b: any, i: number) => {
        const bp = balancePaymentOf(r, b, advNum);
        rows.push({
          key: "b-" + b.id, kind: "registration", label: "Registration balance",
          date: bp.submittedAt, method: bp.paymentMethod, ref: bp.referenceNumber || "",
          amount: bp.amountPaid, verified: bp.verified, rejected: false,
          regId: r.id, child: fullChildName(r), advNum,
          item: { uid: r.id, acc: regAcc, payment: bp, type: "registration", seq: i + 2, seqTotal: total },
        });
      });
    });
    return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, accounts, registrations, tl, regAdvMap]);

  type Breakdown = {
    due: number | null;
    items: { key: string; label: string; amount: number }[];
    paidVerified: number;
    paidToPrevious?: number;
    appliedToSession?: number;
    originalPreviousAdventureBalance?: number;
    balance: number | null;
    sessionBalance?: number | null;
    previousAdventureBalance?: number;
    reservation: number | null;
    balanceShare: number | null;
    dueDate: string | null;
    interestStart: string | null;
    mondays: number;
    interest: number;
    totalPayable: number | null;
  };

  function calcBreakdown(): Breakdown | null {
    if (!detail) return null;
    const { acc, payment, type } = detail;

    const paidVerified = ledger
      .filter((l) => {
        if (!l.verified) return false;
        // only this child's registration (first payment + its balance payments), not a sibling's registered under the same email
        if (type === "registration") return l.regId === detail.uid;
        if (type === "downpayment") return l.kind === "downpayment" || (l.kind === "session" && inRange(l.date, ADVENTURES.next));
        return l.kind === "session";
      })
      .reduce((s, l) => s + l.amount, 0);

    // Registrations: shared rules (program + Welcome Kit / Uniform Set, 60/40 split, weekly 4% interest)
    if (type === "registration") {
      const rawReg = registrations.find((x) => x.id === detail.uid) || allRegistrations.find((x) => x.id === detail.uid);
      const reg = enrichRegWithPioneer(rawReg);
      const email = (reg?.parentInfo?.email || acc.email || "").toLowerCase();
      const parentAcc = allAccounts.find((a) => (a.email || "").toLowerCase() === email);
      // CHANGED: sessions are never counted before the Adventure's own start date
      const student = getStudentSessionInfo(reg, parentAcc, reg ? advStartOf(reg) : undefined);
      const prevBal = typeof reg?.previousAdventureBalance === "number" ? reg.previousAdventureBalance : 0;
      const paidToPrev = Math.min(paidVerified, prevBal);
      const appliedToSession = Math.max(0, paidVerified - paidToPrev);
      const baseTerms = calcRegistrationTerms(reg, student, appliedToSession, payment.amountDue ?? reg?.amountDue);
      if (!baseTerms) return null;
      const sessionBal = baseTerms.balance;
      const remainingPrev = Math.max(0, prevBal - paidToPrev);
      const totalBal = sessionBal != null ? sessionBal + remainingPrev : (remainingPrev > 0 ? remainingPrev : null);
      const totalPayable = baseTerms.totalPayable != null ? baseTerms.totalPayable + remainingPrev : totalBal;

      return {
        ...baseTerms,
        paidVerified,
        paidToPrevious: paidToPrev,
        appliedToSession,
        sessionBalance: sessionBal,
        previousAdventureBalance: remainingPrev,
        originalPreviousAdventureBalance: prevBal,
        balance: totalBal,
        totalPayable,
      };
    }

    // Renewal downpayments / session payments
    const rawDue = type === "downpayment" ? NEXT_TUITION[acc.program || ""] : undefined;
    const due = rawDue && rawDue > 0 ? rawDue : null;
    const balance = due != null ? Math.max(0, due - paidVerified) : null;
    return {
      due, items: [], paidVerified, balance,
      sessionBalance: balance,
      previousAdventureBalance: 0,
      reservation: null, balanceShare: null, dueDate: null, interestStart: null,
      mondays: 0, interest: 0, totalPayable: balance,
    };
  }

  function paymentTypeLabel(type: PaymentKind, payment: Payment) {
    const adv2 = (payment.advNum ?? 1) >= 2;
    if (type === "session") return "Virtual Session Payment";
    if (type === "registration") {
      if (isBalanceRow(payment)) {
        return adv2 ? `Adventure ${payment.advNum} Balance Payment` : "Registration Balance Payment";
      }
      return adv2 ? `Adventure ${payment.advNum} Registration (1st payment)` : "Registration Payment (1st payment)";
    }
    return "Renewal Downpayment";
  }

  function copyDetails(d: DetailItem) {
    const { acc, payment, type } = d;
    const bd = calcBreakdown();
    const typeLabel = paymentTypeLabel(type, payment);
    const advThis = advNumOfDetail(d);
    const lines = [
      "PAYMENT DETAILS",
      `Parent/Guardian: ${acc.fullName || "-"}`,
      `Email: ${acc.email || "-"}`,
      `Student: ${acc.childName || "-"}`,
      `Program: ${acc.program || "-"}`,
      `Type: ${typeLabel}`,
      ...(d.seq && d.seqTotal && d.seqTotal > 1 ? [`Payment no.: ${d.seq} of ${d.seqTotal}`] : []),
      `Amount paid: ${fmtCurrency(payment.amountPaid)}`,
      `Method: ${(payment.paymentMethod || "-").toUpperCase()}`,
      `Reference no.: ${payment.referenceNumber || "-"}`,
      `Date submitted: ${fmtDateTime(payment.submittedAt)}`,
      `Status: ${getStatus(payment).toUpperCase()}`,
      `Admin note: ${payment.adminNote || "-"}`,
      "",
      "BREAKDOWN",
      ...(bd?.items || []).map((it) => `${it.label}: ${fmtCurrency(it.amount)}`),
      `Total amount due: ${bd?.due != null ? fmtCurrency(bd.due) : "not set"}`,
      `Verified paid to date: ${fmtCurrency(bd?.paidVerified)}`,
      ...(bd && (bd as any).paidToPrevious > 0
        ? [
          `Deducted for Adventure ${(advThis || 2) - 1}: -${fmtCurrency((bd as any).paidToPrevious)} (cleared)`,
          `Applied to Adventure ${advThis || 2}: ${fmtCurrency((bd as any).appliedToSession)}`,
        ]
        : []),
      ...(bd?.sessionBalance != null
        ? [`Adventure ${advThis || 2} session balance: ${fmtCurrency(bd.sessionBalance)}`]
        : []),
      ...(bd?.previousAdventureBalance && bd.previousAdventureBalance > 0
        ? [`Previous Adventure unpaid balance: ${fmtCurrency(bd.previousAdventureBalance)}`]
        : []),
      `Remaining balance: ${bd?.balance != null ? fmtCurrency(bd.balance) : "-"}`,
      ...(bd?.reservation != null
        ? [
          `Reservation (${Math.round(RESERVATION_RATE * 100)}%, non-refundable): ${fmtCurrency(bd.reservation)}`,
          `Balance (${100 - Math.round(RESERVATION_RATE * 100)}%) due on session ${BALANCE_DUE_SESSION}: ${fmtCurrency(bd.balanceShare ?? 0)} — ${dueDateText(bd.dueDate, d.type === "registration" ? registrations.find((x) => x.id === d.uid)?.status : undefined)}`,
        ]
        : []),
      ...(bd?.reservation != null && bd.balance != null && bd.balance > 0
        ? [
          bd.interest > 0
            ? `Overdue interest (${Math.round(WEEKLY_INTEREST_RATE * 100)}% x ${bd.mondays} Monday${bd.mondays > 1 ? "s" : ""}): ${fmtCurrency(bd.interest)}`
            : `Overdue interest (${Math.round(WEEKLY_INTEREST_RATE * 100)}% weekly): none yet${bd.interestStart ? `, starts ${fmtDate(bd.interestStart)}` : ""}`,
          `Total payable now: ${fmtCurrency(bd.totalPayable ?? 0)}`,
        ]
        : []),
      "",
      "LEDGER",
      ...ledger.map((l) => `${new Date(l.date).toLocaleDateString("en-US")} | ${l.child ? l.child + " | " : ""}${l.label} | ${(l.method || "-").toUpperCase()} | ${l.ref || "-"} | ${l.verified ? "Verified" : l.rejected ? "Rejected" : "Pending"} | ${fmtCurrency(l.amount)}`),
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => showToast("Copied! Paste it into your SOA.")).catch(() => showToast("Copy failed. Please try again.", "error"));
  }

  const currentCards = (s: typeof stats) => [
    { label: "Total Payments", value: s.total, sub: `from ${s.students} student${s.students === 1 ? "" : "s"} / famil${s.students === 1 ? "y" : "ies"}`, icon: "📋", color: "#0050d5", bg: "linear-gradient(135deg,#eff6ff,#dbeafe)" },
    { label: "Pending Review", value: s.pending, sub: s.pending > 0 ? "Needs your action" : "All caught up 🎉", icon: "⏳", color: "#b45309", bg: "linear-gradient(135deg,#fffbeb,#fef3c7)" },
    { label: "Verified", value: s.verified, sub: "Counted in revenue", icon: "✅", color: "#15803d", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
    { label: "Total Revenue", value: fmtCurrency(s.totalRevenue), sub: "Verified payments only", icon: "💰", color: "#7c3aed", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)" },
  ];

  const statCards =
    view === "current"
      ? currentCards(stats)
      : view === "past"
        ? currentCards(pastStats)
        : [
          { label: "Confirmed", value: `${nextStats.renewed} / ${nextStats.total}`, sub: "Payment verified", icon: "✅", color: "#15803d", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
          { label: "Awaiting Verify", value: nextStats.awaiting, sub: nextStats.awaiting > 0 ? "Needs your action" : "All caught up 🎉", icon: "⏳", color: "#b45309", bg: "linear-gradient(135deg,#fffbeb,#fef3c7)" },
          { label: "No Receipt Yet", value: nextStats.pending, sub: nextStats.pending > 0 ? "Click a row to record the payment" : "Everyone has paid 🎉", icon: "📭", color: "#64748b", bg: "linear-gradient(135deg,#f1f5f9,#e2e8f0)" },
          { label: "Collected (Next)", value: fmtCurrency(nextStats.collected), sub: "Verified payments only", icon: "💰", color: "#7c3aed", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)" },
        ];

  const RENEWAL_GRID = "1.7fr 1.1fr 1.1fr 1.1fr 1fr 1fr";

  const selectStyle: CSSProperties = {
    padding: "8px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, border: "1.5px solid #e2e8f0",
    background: "white", color: "#64748b", cursor: "pointer", outline: "none", fontFamily: "inherit",
  };

  const showPastTab = tl.curNum > 1 || pastItems.length > 0;

  return (
    <AppShell title="Payment Tracking">
      <style>{`
        .pay-row { transition: background 0.15s; }
        .pay-row:hover { background: #f8faff !important; }
        .filter-pill { transition: all 0.15s; cursor: pointer; }
        .filter-pill:hover { transform: translateY(-1px); }
        .copy-ref { border: none; background: none; cursor: pointer; padding: 0 2px; font-size: 11px; opacity: 0.55; }
        .copy-ref:hover { opacity: 1; }
        .ledger-row:hover { background: #f1f5ff !important; }
        .record-row:hover { background: #f8fafc !important; }
        .record-row:hover .record-btn { background: #0050d5 !important; color: white !important; }
      `}</style>

      {/* Payment Details Modal */}
      {detail && (() => {
        const { acc, payment, type, seq, seqTotal } = detail;
        const status = getStatus(payment);
        const st = {
          verified: { bg: "#f0fdf4", color: "#15803d", label: "VERIFIED" },
          rejected: { bg: "#fef2f2", color: "#b91c1c", label: "REJECTED" },
          pending: { bg: "#fffbeb", color: "#b45309", label: "PENDING" },
        }[status];
        const typeLabel = paymentTypeLabel(type, payment);
        const advThis = advNumOfDetail(detail);
        const bd = calcBreakdown();
        const detailRegistration = type === "registration"
          ? allRegistrations.find((registration) => String(registration.id) === String(detail.uid))
          : null;
        const canEncodeBalance = Boolean(
          detailRegistration &&
          status === "verified" &&
          SETTLEABLE_STATUSES.includes(detailRegistration.status) &&
          bd?.balance != null && bd.balance > 0
        );
        // status of this registration, so the due date can say "set after approval" while it is pending
        const detailStatus = type === "registration" ? registrations.find((x) => x.id === detail.uid)?.status : undefined;
        const isMultiAdvReg = type === "registration" && !isBalanceRow(payment) && (advThis ?? 1) >= 2;
        const requiresPreviousBalance = status === "pending" && isMultiAdvReg;
        const previousBalanceNumber = Number(approvalPreviousBalance);
        const hasValidPreviousBalance = approvalPreviousBalance.trim() !== "" && Number.isFinite(previousBalanceNumber) && previousBalanceNumber >= 0 && Math.abs(Math.round(previousBalanceNumber * 100) - previousBalanceNumber * 100) <= 0.000001;
        const isLink = !!payment.receiptBase64 && payment.receiptBase64.startsWith("http");
        const pctRes = Math.round(RESERVATION_RATE * 100);
        const pctInt = Math.round(WEEKLY_INTEREST_RATE * 100);
        const showInterest = !!bd && bd.reservation != null && bd.balance != null && bd.balance > 0;
        const seqText = seq && seqTotal && seqTotal > 1 ? `Payment ${seq} of ${seqTotal}` : "Only payment so far";
        const currentLedgerKey =
          type === "session" ? "s-" + payment.id
            : type === "downpayment" ? payment.id
              : payment.id.replace(/^reg-/, "r-").replace(/^bal-/, "b-");
        const isDupRef = dupRefs.has(normRef(payment.referenceNumber));

        const rows: [string, string][] = [
          ["Parent / Guardian", acc.fullName || "—"],
          ["Email", acc.email || "—"],
          ["Student", acc.childName || "—"],
          ["Program", acc.program || "—"],
          ["Payment type", typeLabel],
          ["Payment no.", seq && seqTotal ? seqText : "—"],
          ["Adventure", advThis != null ? advNumBadge(advThis, tl.curNum).label : "Not assigned"],
          ...(bd?.previousAdventureBalance && bd.previousAdventureBalance > 0
            ? [["Previous adventure unpaid", fmtCurrency(bd.previousAdventureBalance)]] as [string, string][]
            : []),
          ["Payment method", (payment.paymentMethod || "—").toUpperCase()],
          ["Reference no.", payment.referenceNumber || "—"],
          ["Date submitted", fmtDateTime(payment.submittedAt)],
          ["Reviewed on", payment.reviewedAt ? fmtDateTime(payment.reviewedAt) : "—"],
          ["Admin note", payment.adminNote || "—"],
        ];

        const breakdownRows: [string, string][] = [
          ...((type === "registration" && bd ? bd.items.map((it) => [it.label, fmtCurrency(it.amount)]) : []) as [string, string][]),
          [type === "registration" ? "Total due" : "Amount due", bd?.due != null ? fmtCurrency(bd.due) : "not set"],
          ...((bd?.reservation != null
            ? [
              [`Reservation (${pctRes}%, non-refundable)`, fmtCurrency(bd.reservation)],
              [`Balance (${100 - pctRes}%) due on session ${BALANCE_DUE_SESSION}`, `${fmtCurrency(bd.balanceShare ?? 0)} · ${dueDateText(bd.dueDate, detailStatus)}`],
            ]
            : []) as [string, string][]),
          ["This payment", fmtCurrency(payment.amountPaid)],
          ["Verified paid to date", fmtCurrency(bd?.paidVerified)],
        ];

        const sectionTitle: CSSProperties = { fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "10px" };
        const tile: CSSProperties = { border: "1px solid #e8efff", borderRadius: "12px", padding: "10px 12px", background: "#f8faff" };
        const tileLabel: CSSProperties = { fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" };
        const tileValue: CSSProperties = { fontSize: "15px", fontWeight: 800, color: "#002f76", marginTop: "3px", wordBreak: "break-word" };
        const tileSub: CSSProperties = { fontSize: "11px", color: "#94a3b8", marginTop: "2px", fontWeight: 600 };
        let running = 0;
        const advTotals: Record<string, number> = {}; // key = Adventure number, or "other" when none could be assigned

        const pendingHelp =
          type === "registration" && isBalanceRow(payment)
            ? "Verifying applies this receipt to the registration's remaining balance. Check the receipt amount and reference no. against the payment provider first."
            : type === "registration"
            ? "Verifying APPROVES the registration, registers the student and emails the parent. Check the receipt amount and reference no. against GCash/BPI first."
            : type === "session"
              ? "Verifying counts this payment toward the family's balance. Check the receipt amount and reference no. first."
              : "Verifying confirms the renewal downpayment for the Next Adventure. Check the receipt amount and reference no. first.";

        return (
          <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div ref={modalRef} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "880px", width: "100%", maxHeight: "92vh", overflowY: "auto", background: "white", borderRadius: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "18px", color: "#002f76" }}>Payment Details</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>{typeLabel}{seq && seqTotal && seqTotal > 1 ? ` · ${seqText}` : ""}{advThis != null ? ` · ${advNumBadge(advThis, tl.curNum).label}` : ""}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {isTestAccount(acc) && (
                    <span style={{ padding: "4px 10px", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: "20px", fontSize: "11px", fontWeight: 800 }}>
                      🧪 TESTING ACCOUNT
                    </span>
                  )}
                  <span style={{ padding: "4px 10px", background: st.bg, color: st.color, borderRadius: "20px", fontSize: "11px", fontWeight: 800 }}>{st.label}</span>
                  {canEncodeBalance && detailRegistration && (
                    <button
                      type="button"
                      onClick={() => { setDetail(null); openManualFor(detailRegistration); }}
                      style={{ padding: "8px 12px", borderRadius: "10px", background: "#ecfdf5", color: "#047857", fontSize: "12px", fontWeight: 800, border: "1px solid #a7f3d0", cursor: "pointer" }}
                    >
                      ₱ Encode balance payment
                    </button>
                  )}
                  <button onClick={() => copyDetails(detail)} style={{ padding: "8px 12px", borderRadius: "10px", background: "#eff6ff", color: "#0050d5", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer" }}>📋 Copy for SOA</button>
                  <button onClick={() => setDetail(null)} style={{ padding: "8px", borderRadius: "12px", color: "#64748b", fontWeight: "bold", border: "none", background: "transparent", cursor: "pointer" }}>✕</button>
                </div>
              </div>

              {/* At-a-glance summary */}
              <div style={{ padding: "18px 24px 0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px" }}>
                  <div style={tile}>
                    <div style={tileLabel}>Student</div>
                    <div style={tileValue}>{acc.childName || "—"}</div>
                    <div style={tileSub}>Parent: {acc.fullName || acc.email || "—"}</div>
                  </div>
                  <div style={tile}>
                    <div style={tileLabel}>This payment</div>
                    <div style={tileValue}>{fmtCurrency(payment.amountPaid)}</div>
                    <div style={tileSub}>{seq && seqTotal ? seqText : typeLabel} · via {(payment.paymentMethod || "—").toUpperCase()}</div>
                  </div>
                  <div style={tile}>
                    <div style={tileLabel}>Verified paid to date</div>
                    <div style={tileValue}>{fmtCurrency(bd?.paidVerified)}</div>
                    <div style={tileSub}>{bd?.due != null ? `of ${fmtCurrency(bd.due)} total due` : "total due not set"}</div>
                  </div>
                  <div style={tile}>
                    <div style={tileLabel}>Remaining balance</div>
                    <div style={{ ...tileValue, color: bd?.balance === 0 ? "#15803d" : "#b45309" }}>{bd?.balance != null ? (bd.balance === 0 ? "✓ Fully paid" : fmtCurrency(bd.balance)) : "—"}</div>
                    <div style={tileSub}>
                      {bd?.previousAdventureBalance && bd.previousAdventureBalance > 0 ? (
                        <span style={{ color: "#b45309", fontWeight: 700 }}>
                          incl. {fmtCurrency(bd.previousAdventureBalance)} prev. adv.
                        </span>
                      ) : showInterest && bd && bd.interest > 0 ? (
                        `${fmtCurrency(bd.totalPayable ?? 0)} with interest`
                      ) : (
                        "no overdue interest"
                      )}
                    </div>
                  </div>
                </div>

                {isDupRef && (
                  <div style={{ marginTop: "12px", padding: "10px 14px", borderRadius: "12px", background: "#fef2f2", color: "#b91c1c", fontSize: "12px", fontWeight: 700 }}>
                    ⚠ This reference number appears on more than one payment. Check the receipts to make sure it was not entered twice or re-used.
                  </div>
                )}

                {status === "pending" && (
                  <div style={{ marginTop: "12px", padding: "12px 14px", borderRadius: "12px", background: "#fffbeb", border: "1px solid #fde68a", display: "flex", gap: "14px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                    <div style={{ fontSize: "12px", color: "#92400e", fontWeight: 600, flex: "1 1 320px" }}>
                      <b>Waiting for your review{daysSince(payment.submittedAt) > 0 ? ` (${daysSince(payment.submittedAt)} day${daysSince(payment.submittedAt) > 1 ? "s" : ""})` : ""}.</b> {pendingHelp}
                      {requiresPreviousBalance && (
                        <div style={{ marginTop: "10px", padding: "10px", borderRadius: "10px", background: "#fff7ed", border: "1px solid #fed7aa" }}>
                          <label htmlFor="approval-previous-adventure-balance" style={{ display: "block", marginBottom: "5px", fontWeight: 800, color: "#9a3412" }}>
                            Previous adventure unpaid balance (₱) · optional
                          </label>
                          <input
                            id="approval-previous-adventure-balance"
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={approvalPreviousBalance}
                            onChange={(event) => {
                              setApprovalPreviousBalance(event.target.value);
                              setApprovalPreviousBalanceSaved(false);
                            }}
                            placeholder="Leave blank if unknown; enter 0 if none"
                            style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", border: "1px solid #fdba74", borderRadius: "8px", background: "white", color: "#334155", fontSize: "13px", fontWeight: 700 }}
                          />
                          <div style={{ marginTop: "5px", color: "#9a3412", fontSize: "11px" }}>
                            Check the family&apos;s manual Adventure 1 record. This amount stays separate from the Adventure {advThis} payment.
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                            <span style={{ color: approvalPreviousBalanceSaved ? "#15803d" : "#9a3412", fontSize: "11px", fontWeight: 800 }}>
                              {approvalPreviousBalanceSaved ? "✓ Saved" : approvalPreviousBalance.trim() ? "Save the amount before verifying" : "Optional — you can verify without it"}
                            </span>
                            <button
                              type="button"
                              disabled={savingApprovalPreviousBalance || !hasValidPreviousBalance}
                              onClick={() => void saveApprovalPreviousBalance()}
                              style={{ padding: "7px 11px", borderRadius: "8px", border: "none", background: "#0050d5", color: "white", fontSize: "11px", fontWeight: 800, cursor: savingApprovalPreviousBalance || !hasValidPreviousBalance ? "not-allowed" : "pointer", opacity: savingApprovalPreviousBalance || !hasValidPreviousBalance ? 0.55 : 1 }}
                            >
                              {savingApprovalPreviousBalance ? "Saving…" : "Save balance"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        disabled={!!actioning || savingApprovalPreviousBalance || (requiresPreviousBalance && approvalPreviousBalance.trim() !== "" && (!hasValidPreviousBalance || !approvalPreviousBalanceSaved))}
                        onClick={() => { handleAction(detail.uid, type === "session" || (type === "registration" && isBalanceRow(payment)) ? payment.id : null, "verify", type); }}
                        style={{ padding: "8px 16px", borderRadius: "10px", background: "#10b981", color: "white", fontSize: "12px", fontWeight: 700, border: "none", cursor: actioning || savingApprovalPreviousBalance || (requiresPreviousBalance && approvalPreviousBalance.trim() !== "" && (!hasValidPreviousBalance || !approvalPreviousBalanceSaved)) ? "not-allowed" : "pointer", opacity: actioning || savingApprovalPreviousBalance || (requiresPreviousBalance && approvalPreviousBalance.trim() !== "" && (!hasValidPreviousBalance || !approvalPreviousBalanceSaved)) ? 0.55 : 1 }}
                      >
                        ✓ Verify
                      </button>
                      <button
                        disabled={!!actioning}
                        onClick={() => { const d = detail; setDetail(null); handleAction(d.uid, d.type === "session" || (d.type === "registration" && isBalanceRow(d.payment)) ? d.payment.id : null, "reject", d.type); }}
                        style={{ padding: "8px 16px", borderRadius: "10px", background: "#ef4444", color: "white", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer" }}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                )}

                {isMultiAdvReg && status === "verified" && (
                  <div style={{ marginTop: "12px", padding: "12px 14px", borderRadius: "12px", background: "#fff7ed", border: "1px solid #fed7aa", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ flex: "1 1 300px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 800, color: "#9a3412", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>🧾 Previous Adventure Unpaid Balance (Adventure {(advThis ?? 2) - 1})</span>
                        {approvalPreviousBalanceSaved && <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: 800 }}>✓ Recorded</span>}
                      </div>
                      <div style={{ fontSize: "11px", color: bd && (bd as any).paidToPrevious > 0 && bd.previousAdventureBalance === 0 ? "#15803d" : "#9a3412", marginTop: "3px", fontWeight: bd && (bd as any).paidToPrevious > 0 && bd.previousAdventureBalance === 0 ? 700 : 500 }}>
                        {bd && (bd as any).paidToPrevious > 0 && bd.previousAdventureBalance === 0
                          ? `✓ Fully cleared by Adventure ${advThis || 2} payment (${fmtCurrency((bd as any).paidToPrevious)} settled). Will not carry over to future Adventures.`
                          : bd && (bd as any).paidToPrevious > 0
                          ? `${fmtCurrency((bd as any).paidToPrevious)} settled from payment; ${fmtCurrency(bd.previousAdventureBalance)} remaining.`
                          : "Carried over from the manual record. This is factored into the total remaining balance."}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        id="approval-previous-adventure-balance-verified"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={approvalPreviousBalance}
                        onChange={(event) => {
                          setApprovalPreviousBalance(event.target.value);
                          setApprovalPreviousBalanceSaved(false);
                        }}
                        placeholder="0"
                        style={{ width: "110px", boxSizing: "border-box", padding: "7px 10px", border: "1px solid #fdba74", borderRadius: "8px", background: "white", color: "#334155", fontSize: "13px", fontWeight: 700 }}
                      />
                      <button
                        type="button"
                        disabled={savingApprovalPreviousBalance || !hasValidPreviousBalance}
                        onClick={() => void saveApprovalPreviousBalance()}
                        style={{ padding: "7px 12px", borderRadius: "8px", border: "none", background: "#0050d5", color: "white", fontSize: "11px", fontWeight: 800, cursor: savingApprovalPreviousBalance || !hasValidPreviousBalance ? "not-allowed" : "pointer", opacity: savingApprovalPreviousBalance || !hasValidPreviousBalance ? 0.55 : 1 }}
                      >
                        {savingApprovalPreviousBalance ? "Saving…" : approvalPreviousBalanceSaved ? "Saved" : "Update"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
                {/* Left: details + breakdown */}
                <div>
                  <div style={sectionTitle}>Payment information</div>
                  <div style={{ border: "1px solid #e8efff", borderRadius: "14px", overflow: "hidden", marginBottom: "20px" }}>
                    {rows.map(([k, v], i) => (
                      <div key={k} style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "12px", padding: "10px 14px", background: i % 2 ? "white" : "#f8faff", fontSize: "13px" }}>
                        <div style={{ color: "#94a3b8", fontWeight: 600 }}>{k}</div>
                        <div style={{ color: "#334155", fontWeight: 600, wordBreak: "break-all", minWidth: 0 }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={sectionTitle}>Amount breakdown</div>
                  <div style={{ border: "1px solid #e8efff", borderRadius: "14px", padding: "14px", fontSize: "13px" }}>
                    {breakdownRows.map(([k, v], i) => (
                      <div key={k + i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#334155", fontWeight: 600 }}>
                        <span style={{ color: "#94a3b8" }}>{k}</span><span style={{ wordBreak: "break-all" }}>{v}</span>
                      </div>
                    ))}
                    {bd && (bd as any).paidToPrevious > 0 && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#b91c1c", fontWeight: 600 }}>
                          <span>Deducted for Adventure {(advThis || 2) - 1}</span>
                          <span>- {fmtCurrency((bd as any).paidToPrevious)} (Adv {(advThis || 2) - 1} cleared)</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#0050d5", fontWeight: 700 }}>
                          <span>Applied to Adventure {advThis || 2}</span>
                          <span>{fmtCurrency((bd as any).appliedToSession)}</span>
                        </div>
                      </>
                    )}
                    {bd?.sessionBalance != null && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#334155", fontWeight: 600 }}>
                        <span style={{ color: "#94a3b8" }}>Adventure {advThis || 2} session balance</span>
                        <span>{fmtCurrency(bd.sessionBalance)}</span>
                      </div>
                    )}
                    {bd?.previousAdventureBalance != null && bd.previousAdventureBalance > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#b91c1c", fontWeight: 700 }}>
                        <span>Remaining Previous Adventure unpaid balance</span>
                        <span>+ {fmtCurrency(bd.previousAdventureBalance)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: "6px", borderTop: "1px dashed #e2e8f0", fontWeight: 800, fontSize: "15px" }}>
                      <span style={{ color: "#002f76" }}>Remaining balance</span>
                      <span style={{ color: bd?.balance === 0 ? "#15803d" : "#b45309" }}>{bd?.balance != null ? fmtCurrency(bd.balance) : "—"}</span>
                    </div>
                    {showInterest && bd && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "8px 0 0", fontSize: "13px", fontWeight: 600, color: bd.interest > 0 ? "#b91c1c" : "#94a3b8" }}>
                          <span>
                            {bd.interest > 0
                              ? `Overdue interest (${pctInt}% × ${bd.mondays} Monday${bd.mondays > 1 ? "s" : ""})`
                              : `Overdue interest (${pctInt}% weekly)${bd.interestStart ? ` · starts ${fmtDate(bd.interestStart)}` : ""}`}
                          </span>
                          <span>{fmtCurrency(bd.interest)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", fontWeight: 800, fontSize: "15px" }}>
                          <span style={{ color: "#002f76" }}>Total payable now</span>
                          <span style={{ color: bd.interest > 0 ? "#b91c1c" : "#334155" }}>{fmtCurrency(bd.totalPayable ?? 0)}</span>
                        </div>
                      </>
                    )}
                    {status !== "verified" && (
                      <div style={{ fontSize: "11px", color: "#b45309", marginTop: "8px" }}>This payment is not verified yet, so it is not counted in the balance.</div>
                    )}
                  </div>
                </div>

                {/* Right: receipt */}
                <div>
                  <div style={sectionTitle}>Receipt</div>
                  <div style={{ border: "1px solid #e8efff", borderRadius: "14px", padding: "10px", background: "#f8faff", textAlign: "center" }}>
                    {payment.receiptBase64 && !imgFailed ? (
                      <img key={payment.id} src={payment.receiptBase64} alt="Receipt" onError={() => setImgFailed(true)} style={{ width: "100%", maxHeight: "420px", objectFit: "contain", borderRadius: "10px" }} />
                    ) : (
                      <div style={{ padding: "40px 12px", fontSize: "13px", color: "#94a3b8" }}>
                        {payment.receiptBase64 ? "Receipt image could not be loaded." : "No receipt uploaded."}
                        {isLink && (
                          <div style={{ marginTop: "8px" }}>
                            <a href={payment.receiptBase64} target="_blank" rel="noreferrer" style={{ color: "#0050d5", fontWeight: 700 }}>Open receipt link</a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ledger */}
              <div style={{ padding: "0 24px 24px" }}>
                <div style={sectionTitle}>Account ledger (all payments from this family) <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 600, color: "#0050d5" }}>· click a payment to view it</span></div>
                <div style={{ border: "1px solid #e8efff", borderRadius: "14px", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 0.9fr 1fr", padding: "10px 14px", background: "#f8faff", fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
                    {["Description", "Date", "Method", "Reference", "Status", "Amount"].map((h) => <div key={h}>{h}</div>)}
                  </div>
                  {ledger.length === 0 ? (
                    <div style={{ padding: "16px", fontSize: "13px", color: "#94a3b8" }}>No other payments found.</div>
                  ) : ledger.map((l) => {
                    const adv = l.advNum;
                    if (l.verified) {
                      running += l.amount;
                      const k = adv != null ? String(adv) : "other";
                      advTotals[k] = (advTotals[k] || 0) + l.amount;
                    }
                    const ls = l.verified ? "Verified" : l.rejected ? "Rejected" : "Pending";
                    const lc = l.verified ? "#15803d" : l.rejected ? "#b91c1c" : "#b45309";
                    const isThis = l.key === currentLedgerKey;
                    return (
                      <div key={l.key} className={isThis ? undefined : "ledger-row"} title={isThis ? "You are viewing this payment" : "Click to view this payment"} onClick={() => { if (!isThis) openDetail(l.item); }} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 0.9fr 1fr", padding: "10px 14px", borderTop: "1px solid #f1f5f9", fontSize: "12px", color: "#334155", fontWeight: 600, background: isThis ? "#fffbeb" : "white", boxShadow: isThis ? "inset 3px 0 0 #f59e0b" : "none", cursor: isThis ? "default" : "pointer" }}>
                        <div>
                          {l.label}
                          <div style={{ marginTop: "3px", display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
                            {l.child && <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>{l.child}</span>}
                            {adv != null && <span style={advTagStyle(adv, tl.curNum)}>{advNumBadge(adv, tl.curNum).short}</span>}
                            {isThis && <span style={tagStyle("#fef3c7", "#92400e")}>◀ THIS PAYMENT</span>}
                          </div>
                        </div>
                        <div>{new Date(l.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                        <div style={{ textTransform: "uppercase" }}>{l.method || "—"}</div>
                        <div style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{l.ref || "—"}</div>
                        <div style={{ color: lc, fontWeight: 800 }}>{ls}</div>
                        <div>{fmtCurrency(l.amount)}</div>
                      </div>
                    );
                  })}
                  <div style={{ padding: "12px 14px", borderTop: "1px solid #e8efff", background: "#f8faff", fontSize: "13px" }}>
                    {Object.keys(advTotals)
                      .filter((k) => k !== "other" && advTotals[k] > 0)
                      .sort((a, b) => Number(a) - Number(b))
                      .map((k) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontWeight: 700, fontSize: "12px", color: advNumBadge(Number(k), tl.curNum).color }}>
                          <span>{advNumBadge(Number(k), tl.curNum).label}</span><span>{fmtCurrency(advTotals[k])}</span>
                        </div>
                      ))}
                    {(advTotals.other || 0) > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontWeight: 700, fontSize: "12px", color: "#94a3b8" }}>
                        <span>No Adventure assigned</span><span>{fmtCurrency(advTotals.other)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", paddingTop: "8px", borderTop: "1px dashed #e2e8f0", fontWeight: 800, color: "#002f76" }}>
                      <span>Total verified payments</span><span>{fmtCurrency(running)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Manual payment encoding modal */}
      {manualOpen && (() => {
        const label: CSSProperties = { fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px", display: "block" };
        const input: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", fontFamily: "inherit", color: "#334155", background: "#f8faff", outline: "none" };
        const field: CSSProperties = { marginBottom: "14px" };
        const card: CSSProperties = { border: "1px solid #e8efff", borderRadius: "14px", padding: "14px", fontSize: "13px", marginBottom: "14px", background: "#f8faff" };
        const row: CSSProperties = { display: "flex", justifyContent: "space-between", gap: "12px", padding: "4px 0", color: "#334155", fontWeight: 600 };
        const muted: CSSProperties = { color: "#94a3b8" };
        const useBtn: CSSProperties = { marginTop: "10px", width: "100%", padding: "9px 12px", borderRadius: "10px", border: "none", background: "#0050d5", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer" };
        const isImageReceipt = !!receipt && receipt.startsWith("data:image");
        const pctRes = Math.round(RESERVATION_RATE * 100);
        const pctInt = Math.round(WEEKLY_INTEREST_RATE * 100);

        // Remaining-balance box (same numbers as the Payment Details modal,
        // but interest is counted up to the "Date paid" chosen in this form)
        const balanceBox = (reg: any) => {
          const t = regInfo(reg, paidAsOf).terms;
          if (!t) return null;
          const childName = `${reg.childInfo?.firstName ?? ""} ${reg.childInfo?.lastName ?? ""}`.trim();
          const hasSplit = t.reservation != null;
          const showInt = hasSplit && t.balance != null && t.balance > 0;
          const payNow = t.totalPayable ?? t.balance ?? 0;
          return (
            <div key={reg.id} style={card}>
              <span style={label}>Account balance{childName ? ` — ${childName}` : ""}</span>
              {t.items.map((it: any) => (
                <div key={it.key} style={row}><span style={muted}>{it.label}</span><span>{fmtCurrency(it.amount)}</span></div>
              ))}
              <div style={row}><span style={muted}>Total due</span><span>{t.due != null ? fmtCurrency(t.due) : "not set"}</span></div>
              {hasSplit && (
                <>
                  <div style={row}><span style={muted}>Reservation ({pctRes}%, non-refundable)</span><span>{fmtCurrency(t.reservation ?? 0)}</span></div>
                  <div style={row}>
                    <span style={muted}>Balance ({100 - pctRes}%) due on session {BALANCE_DUE_SESSION}</span>
                    <span>{fmtCurrency(t.balanceShare ?? 0)} · {dueDateText(t.dueDate, reg.status)}</span>
                  </div>
                </>
              )}
              <div style={row}><span style={muted}>Verified paid to date</span><span>{fmtCurrency(t.paidVerified)}</span></div>
              <div style={{ ...row, borderTop: "1px dashed #e2e8f0", marginTop: "6px", paddingTop: "8px", fontWeight: 800, fontSize: "15px" }}>
                <span style={{ color: "#002f76" }}>Remaining balance</span>
                <span style={{ color: t.balance === 0 ? "#15803d" : "#b45309" }}>{t.balance != null ? fmtCurrency(t.balance) : "—"}</span>
              </div>
              {showInt && (
                <>
                  <div style={{ ...row, color: t.interest > 0 ? "#b91c1c" : "#94a3b8" }}>
                    <span>
                      {t.interest > 0
                        ? `Overdue interest (${pctInt}% × ${t.mondays} Monday${t.mondays > 1 ? "s" : ""})`
                        : `Overdue interest (${pctInt}% weekly)${t.interestStart ? ` · starts ${fmtDate(t.interestStart)}` : ""}`}
                    </span>
                    <span>{fmtCurrency(t.interest)}</span>
                  </div>
                  <div style={{ ...row, fontWeight: 800, fontSize: "14px" }}>
                    <span style={{ color: "#002f76" }}>Total payable now</span>
                    <span style={{ color: t.interest > 0 ? "#b91c1c" : "#334155" }}>{fmtCurrency(t.totalPayable ?? 0)}</span>
                  </div>
                </>
              )}
              {payNow > 0 && (
                <button type="button" onClick={() => setF({ amountPaid: String(payNow) })} style={useBtn}>
                  Use {fmtCurrency(payNow)} as amount paid
                </button>
              )}
            </div>
          );
        };

        const optBtn = (active: boolean, color: string, bg: string): CSSProperties => ({
          flex: 1, padding: "12px 8px", borderRadius: "12px", cursor: "pointer", textAlign: "center",
          border: active ? `2px solid ${color}` : "2px solid #e2e8f0", background: active ? bg : "white",
        });
        const checkRow = (active: boolean): CSSProperties => ({
          display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 12px", borderRadius: "12px",
          cursor: "pointer", marginBottom: "8px", border: active ? "2px solid #0033A0" : "2px solid #e2e8f0",
          background: active ? "rgba(0,51,160,0.05)" : "white", fontSize: "13px", color: "#002f76", fontWeight: 700,
        });

        const initialFlow = !!selectedReg && !!regCalc && regCalc.amountDue != null && !!regCalc.prog;
        const prog = regCalc?.prog;

        return (
          <div onClick={() => !manualSaving && setManualOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "960px", width: "100%", maxHeight: "92vh", overflowY: "auto", background: "white", borderRadius: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "18px", color: "#002f76" }}>Encode Payment</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>Enter a payment on behalf of a parent</div>
                </div>
                <button onClick={() => setManualOpen(false)} disabled={manualSaving} style={{ padding: "8px", border: "none", background: "transparent", color: "#64748b", fontWeight: "bold", cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
                {/* ── Left: who + what is owed ── */}
                <div>
                  <div style={field}>
                    <span style={label}>Payment type</span>
                    <select
                      value={form.type}
                      onChange={(e) => { setF({ type: e.target.value as PaymentKind, accountId: "", registrationId: "", amountPaid: ocrAmountText, waiveInterest: false }); setParentFilter(""); }}
                      style={input}
                    >
                      <option value="registration">Registration Payment (1st payment or balance)</option>
                      <option value="session">Virtual Session Payment</option>
                      <option value="downpayment">Renewal Downpayment (Next Adventure)</option>
                    </select>
                  </div>

                  {form.type === "registration" && (
                    <div style={field}>
                      <span style={label}>Adventure</span>
                      <div style={{ display: "flex", gap: "8px", padding: "4px", borderRadius: "12px", background: "#f1f5f9" }}>
                        {([
                          ...(tl.curNum > 1 ? [{ mode: "past" as const, title: `Past · Adventure ${tl.curNum - 1}` }] : []),
                          { mode: "current" as const, title: `Current · Adventure ${tl.curNum}` },
                          { mode: "next" as const, title: `Next · Adventure ${tl.curNum + 1}` },
                        ]).map(({ mode, title }) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              setManualAdventureMode(mode);
                              setF({ registrationId: "", amountPaid: ocrAmountText, previousAdventureBalance: "" });
                            }}
                            style={{ flex: 1, padding: "9px 10px", border: "none", borderRadius: "9px", background: manualAdventureMode === mode ? "white" : "transparent", color: manualAdventureMode === mode ? "#0033a0" : "#64748b", fontSize: "12px", fontWeight: 800, boxShadow: manualAdventureMode === mode ? "0 1px 3px rgba(15,23,42,0.12)" : "none", cursor: "pointer" }}
                          >
                            {title}
                          </button>
                        ))}
                      </div>
                      <div style={{ marginTop: "5px", fontSize: "11px", color: "#64748b" }}>
                        Choose whether you’re encoding a payment for the current or upcoming Adventure.
                      </div>
                    </div>
                  )}

                  <div style={field}>
                    <span style={label}>{form.type === "registration" ? `Registration · Adventure ${tl.curNum + (manualAdventureMode === "next" ? 1 : manualAdventureMode === "past" ? -1 : 0)}` : "Parent account"}</span>
                    <input value={parentFilter} onChange={(e) => setParentFilter(e.target.value)} placeholder="Type to filter by name or email…" style={{ ...input, marginBottom: "6px" }} />
                    {form.type === "registration" ? (
                      <select value={form.registrationId} onChange={(e) => {
                        const chosen = allRegistrations.find((r) => String(r.id) === e.target.value);
                        setF({
                          registrationId: e.target.value,
                          amountPaid: ocrAmountText,
                          waiveInterest: false,
                          previousAdventureBalance: typeof chosen?.previousAdventureBalance === "number" ? String(chosen.previousAdventureBalance) : "",
                        });
                      }} style={input}>
                        <option value="">Select registration…</option>
                        {registrationOptions.length === 0 && <option value="" disabled>No registrations for this Adventure</option>}
                        {registrationOptions.map((r) => (
                          <option key={r.id} value={r.id}>
                            {fullChildName(r)} — {r.parentInfo?.name || r.parentInfo?.email}{r.program ? ` · ${r.program}` : ""} · {registrationSessionInfo(r).days} · {registrationSessionInfo(r).session} · {r.status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select value={form.accountId} onChange={(e) => setF({ accountId: e.target.value, amountPaid: ocrAmountText })} style={input}>
                        <option value="">Select parent…</option>
                        {parentOptions.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.fullName || a.email}{a.childName ? ` — ${a.childName}` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Registration summary */}
                  {selectedReg && (
                    <div style={card}>
                      <span style={label}>Registration details</span>
                      <div style={row}><span style={muted}>Parent</span><span>{selectedReg.parentInfo?.name || "—"}</span></div>
                      <div style={row}><span style={muted}>Email</span><span style={{ wordBreak: "break-all", textAlign: "right" }}>{selectedReg.parentInfo?.email || "—"}</span></div>
                      <div style={row}><span style={muted}>Child</span><span>{`${selectedReg.childInfo?.firstName ?? ""} ${selectedReg.childInfo?.lastName ?? ""}`.trim() || "—"}</span></div>
                      <div style={row}><span style={muted}>Program</span><span>{selectedReg.program === "everyday-curious" ? "Everyday Explorer" : selectedReg.program || "—"}</span></div>
                      <div style={row}><span style={muted}>Days</span><span style={{ textAlign: "right", maxWidth: "65%" }}>{registrationSessionInfo(selectedReg).days}</span></div>
                      <div style={row}><span style={muted}>Session</span><span style={{ textAlign: "right", maxWidth: "65%" }}>{registrationSessionInfo(selectedReg).session}</span></div>
                      <div style={row}><span style={muted}>Adventure</span><span>{`Adventure ${advOf(selectedReg)}`}</span></div>
                      <div style={row}><span style={muted}>Status</span><span style={{ textTransform: "uppercase" }}>{selectedReg.status || "—"}</span></div>
                      <div style={row}>
                        <span style={muted}>This will be recorded as</span>
                        <span style={{ color: initialFlow ? "#0050d5" : "#c2410c", fontWeight: 800 }}>{initialFlow ? "1st payment" : "Balance payment"}</span>
                      </div>
                      {selectedReg.status === "expired" && (
                        <div style={{ marginTop: "8px", fontSize: "12px", color: "#b45309", fontWeight: 600 }}>
                          This slot reservation has expired. The server may refuse a payment for it.
                        </div>
                      )}
                    </div>
                  )}

                  {/* First payment: same options as the parent's payment page */}
                  {initialFlow && regCalc && prog && (
                    <>
                      <div style={field}>
                        <span style={label}>Payment option</span>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button type="button" onClick={() => setF({ paymentOption: "downpayment" })} style={optBtn(form.paymentOption === "downpayment", "#0033A0", "rgba(0,51,160,0.05)")}>
                            <div style={{ fontSize: "12px", fontWeight: 800, color: "#002f76" }}>💳 Downpayment</div>
                            <div style={{ fontSize: "16px", fontWeight: 800, color: "#0033A0", marginTop: "2px" }}>{fmtCurrency(prog.downpayment + regCalc.addonCost)}</div>
                          </button>
                          <button type="button" onClick={() => setF({ paymentOption: "full" })} style={optBtn(form.paymentOption === "full", "#22c55e", "#f0fdf4")}>
                            <div style={{ fontSize: "12px", fontWeight: 800, color: "#002f76" }}>🏆 Full Payment</div>
                            <div style={{ fontSize: "16px", fontWeight: 800, color: "#16a34a", marginTop: "2px" }}>{fmtCurrency(prog.rate + regCalc.addonCost)}</div>
                          </button>
                        </div>
                      </div>

                      <div style={field}>
                        <span style={label}>{regCalc.isBallet ? "Recital kit (optional preorder)" : "Uniform & add-ons"}</span>
                        {regCalc.isBallet ? (
                          <label style={checkRow(form.recitalKitOrdered)}>
                            <input type="checkbox" checked={form.recitalKitOrdered} onChange={(e) => setF({ recitalKitOrdered: e.target.checked })} style={{ marginTop: "2px" }} />
                            <span>Include Recital Kit — ₱1,500</span>
                          </label>
                        ) : (
                          <>
                            <label style={checkRow(form.isNewFamily)}>
                              <input
                                type="checkbox"
                                checked={form.isNewFamily}
                                onChange={(e) => setF({ isNewFamily: e.target.checked, uniformOrdered: e.target.checked ? false : form.uniformOrdered })}
                                style={{ marginTop: "2px" }}
                              />
                              <span>
                                New Family
                                <span style={{ display: "block", fontWeight: 500, color: "#64748b", fontSize: "12px" }}>Welcome Kit (₱{UNIFORM_KIT.welcomeKitPrice.toLocaleString()}) is required.</span>
                              </span>
                            </label>
                            {!form.isNewFamily && (
                              <label style={checkRow(form.uniformOrdered)}>
                                <input type="checkbox" checked={form.uniformOrdered} onChange={(e) => setF({ uniformOrdered: e.target.checked })} style={{ marginTop: "2px" }} />
                                <span>Uniform Set only — ₱{UNIFORM_KIT.price.toLocaleString()}</span>
                              </label>
                            )}
                          </>
                        )}
                      </div>

                      <div style={{ ...card, background: form.paymentOption === "full" ? "#f0fdf4" : "#eff6ff" }}>
                        <span style={label}>Amount due today</span>
                        <div style={{ fontSize: "28px", fontWeight: 800, color: form.paymentOption === "full" ? "#16a34a" : "#0033A0", lineHeight: 1.1 }}>
                          {fmtCurrency(regCalc.amountDue ?? 0)}
                        </div>
                        <div style={{ marginTop: "10px" }}>
                          <div style={row}><span style={muted}>{form.paymentOption === "full" ? "Program rate" : "Downpayment"}</span><span>{fmtCurrency(regCalc.base)}</span></div>
                          {regCalc.addons.map((a) => (
                            <div key={a.label} style={row}><span style={muted}>{a.label}</span><span>{fmtCurrency(a.amount)}</span></div>
                          ))}
                        </div>
                        <button type="button" onClick={() => setF({ amountPaid: String(regCalc.amountDue ?? 0) })} style={useBtn}>
                          Use {fmtCurrency(regCalc.amountDue ?? 0)} as amount paid
                        </button>
                      </div>
                    </>
                  )}

                  {/* Registration that already has a payment: show what's left */}
                  {selectedReg && !initialFlow && (
                    <>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "10px" }}>
                        This registration already has a payment on file, so this will be recorded as a follow-up payment on its remaining balance.
                      </div>
                      {followStatusBlocked && (
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#b91c1c", marginBottom: "10px", padding: "8px 10px", borderRadius: "10px", background: "#fef2f2" }}>
                          This registration is &quot;{selectedReg.status}&quot;, so a balance payment can&apos;t be recorded yet. The first payment must be approved first.
                        </div>
                      )}
                      {balanceBox(selectedReg)}
                    </>
                  )}

                  {/* Virtual session: balance of this family's registration(s) */}
                  {form.type === "session" && selectedAcc && (
                    familyRegs.length > 0
                      ? familyRegs.map((r) => balanceBox(r))
                      : <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "14px" }}>No registration found for this parent&apos;s email.</div>
                  )}

                  {/* Renewal: next adventure fee */}
                  {form.type === "downpayment" && nextRow && (
                    <div style={card}>
                      <span style={label}>Next Adventure balance</span>
                      <div style={row}><span style={muted}>Program</span><span>{nextRow.r?.program || nextRow.acc.program || "—"}</span></div>
                      <div style={row}><span style={muted}>Fee</span><span>{nextRow.fee > 0 ? fmtCurrency(nextRow.fee) : "not set"}</span></div>
                      <div style={row}><span style={muted}>Verified paid</span><span>{fmtCurrency(nextRow.paid)}</span></div>
                      <div style={{ ...row, borderTop: "1px dashed #e2e8f0", marginTop: "6px", paddingTop: "8px", fontWeight: 800, fontSize: "15px" }}>
                        <span style={{ color: "#002f76" }}>Remaining balance</span>
                        <span style={{ color: nextRow.balance === 0 ? "#15803d" : "#b45309" }}>{nextRow.balance != null ? fmtCurrency(nextRow.balance) : "—"}</span>
                      </div>
                      {nextRow.balance != null && nextRow.balance > 0 && (
                        <button type="button" onClick={() => setF({ amountPaid: String(nextRow.balance) })} style={useBtn}>
                          Use {fmtCurrency(nextRow.balance)} as amount paid
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Right: the payment itself + receipt ── */}
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "6px" }}>
                    <div>
                      <span style={label}>Amount paid (₱)</span>
                      <input type="number" min="0" inputMode="decimal" value={form.amountPaid} onChange={(e) => setF({ amountPaid: e.target.value })} placeholder="0.00" style={input} />
                    </div>
                    <div>
                      <span style={label}>Date paid</span>
                      <input type="date" max={todayIso()} value={form.paidOn} onChange={(e) => { paidOnTouched.current = true; setF({ paidOn: e.target.value }); }} style={input} />
                    </div>
                  </div>
                  {ocrAmount != null && (
                    <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "6px", color: Number(form.amountPaid) === ocrAmount ? "#15803d" : "#b45309" }}>
                      {Number(form.amountPaid) === ocrAmount
                        ? `Read ${fmtCurrency(ocrAmount)} from the receipt. Please double-check it.`
                        : `The receipt shows ${fmtCurrency(ocrAmount)}. `}
                      {Number(form.amountPaid) !== ocrAmount && (
                        <button type="button" onClick={() => setF({ amountPaid: String(ocrAmount) })} style={{ border: "none", background: "none", color: "#0050d5", fontWeight: 700, cursor: "pointer", fontSize: "12px", padding: 0 }}>
                          Use it
                        </button>
                      )}
                    </div>
                  )}
                  {settleAlloc && settleDue != null && (
                    <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "8px", padding: "8px 10px", borderRadius: "10px", background: !settleAlloc.ok ? "#fef2f2" : settleAlloc.balanceAfter === 0 ? "#f0fdf4" : "#fffbeb", color: !settleAlloc.ok ? "#b91c1c" : settleAlloc.balanceAfter === 0 ? "#15803d" : "#b45309" }}>
                      {settleAlloc.ok ? (
                        <>
                          {fmtCurrency(settleDue)} owed → {settleAlloc.balanceAfter === 0 ? "fully settled ✓" : `${fmtCurrency(settleAlloc.balanceAfter)} will still be left`}
                          {settleAlloc.creditAdded > 0 ? ` (overpaid by ${fmtCurrency(settleAlloc.creditAdded)}, kept as credit)` : ""}
                          {settleAlloc.interestWaived > 0 ? ` (${fmtCurrency(settleAlloc.interestWaived)} interest waived)` : ""}
                        </>
                      ) : (
                        settleAlloc.error
                      )}
                    </div>
                  )}
                  {waivable && followTerms && (
                    <label style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "12px", color: "#334155", fontWeight: 600, cursor: "pointer", marginBottom: "10px" }}>
                      <input type="checkbox" checked={form.waiveInterest} onChange={(e) => setF({ waiveInterest: e.target.checked })} style={{ marginTop: "2px" }} />
                      <span>
                        Waive the remaining {fmtCurrency(+((followTerms.totalPayable || 0) - paidNum).toFixed(2))} overdue interest
                        <span style={{ display: "block", fontWeight: 500, color: "#94a3b8", marginTop: "2px" }}>
                          The balance is cleared and the rest of the interest is not collected. This is saved in the audit log.
                        </span>
                      </span>
                    </label>
                  )}
                  {autoWaiveInterest && followTerms && (
                    <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "8px", padding: "8px 10px", borderRadius: "10px", background: "#f0fdf4", color: "#15803d" }}>
                      ✓ Paid on {fmtDate(form.paidOn)}{followTerms.interestStart ? `, before interest started on ${fmtDate(followTerms.interestStart)}` : ""}.
                      The {fmtCurrency(lateInterest)} interest that built up since then is not charged (waived automatically and noted in the audit log).
                    </div>
                  )}
                  {amountShort > 0 && (
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#b91c1c", marginBottom: "6px" }}>Short by {fmtCurrency(amountShort)}</div>
                  )}
                  {creditBalance > 0 && (
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#15803d", marginBottom: "6px" }}>Overpaid by {fmtCurrency(creditBalance)} (recorded as credit balance)</div>
                  )}
                  {landsIn && (
                    <div style={{ fontSize: "11px", marginBottom: "14px", color: "#15803d" }}>
                      Will appear under: {landsIn}
                    </div>
                  )}

                  <div style={field}>
                    <span style={label}>Payment method</span>
                    <select value={form.paymentMethod} onChange={(e) => { methodTouched.current = true; setF({ paymentMethod: e.target.value }); }} style={input}>
                      {PAYMENT_METHODS.map((mm) => <option key={mm.id} value={mm.id}>{mm.label}</option>)}
                    </select>
                  </div>

                  <div style={field}>
                    <span style={label}>Reference no. (required)</span>
                    <input value={form.referenceNumber} onChange={(e) => setF({ referenceNumber: e.target.value })} placeholder="Copy from the receipt" style={{ ...input, fontFamily: "monospace" }} />
                    {dupRefMatch && (
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#b91c1c", marginTop: "6px", padding: "8px 10px", borderRadius: "10px", background: "#fef2f2" }}>
                        ⚠ This reference no. is already recorded for {dupRefMatch.acc.childName || dupRefMatch.acc.fullName || dupRefMatch.acc.email} ({fmtCurrency(dupRefMatch.payment.amountPaid)} on {new Date(dupRefMatch.payment.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}). Make sure this is not a duplicate before saving.
                      </div>
                    )}
                  </div>

                  <span style={label}>Receipt (required)</span>
                  <label style={{ display: "block", border: "2px dashed #cbd5e1", borderRadius: "14px", padding: "12px", background: "#f8faff", textAlign: "center", cursor: "pointer" }}>
                    <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={(e) => { handleReceiptFile(e.target.files?.[0]); e.target.value = ""; }} />
                    {receipt ? (
                      isImageReceipt ? (
                        <img src={receipt} alt="Receipt preview" style={{ width: "100%", maxHeight: "260px", objectFit: "contain", borderRadius: "10px" }} />
                      ) : (
                        <div style={{ padding: "40px 0", fontSize: "13px", color: "#334155", fontWeight: 700 }}>📄 {receiptName}</div>
                      )
                    ) : (
                      <div style={{ padding: "40px 8px", color: "#94a3b8", fontSize: "13px", fontWeight: 600 }}>
                        <div style={{ fontSize: "30px", marginBottom: "6px" }}>📎</div>
                        Click to upload a photo, screenshot, or PDF
                      </div>
                    )}
                  </label>
                  {receipt && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "11px", color: "#64748b" }}>
                      <span>{receiptName}</span>
                      <button onClick={() => { ocrRunRef.current++; setOcrLoading(false); setOcrInfo(null); setReceipt(null); setReceiptName(""); setOcrAmount(null); }} style={{ border: "none", background: "none", color: "#b91c1c", fontWeight: 700, cursor: "pointer", fontSize: "11px" }}>Remove</button>
                    </div>
                  )}

                  {ocrLoading && (
                    <div style={{ marginTop: "8px", fontSize: "12px", fontWeight: 600, color: "#64748b" }}>🔎 Reading the receipt (reference no., amount and date)…</div>
                  )}
                  {!ocrLoading && ocrInfo && (() => {
                    const found = !!ocrInfo.reference || ocrInfo.amount != null || !!ocrInfo.date;
                    const methodLabel = PAYMENT_METHODS.find((mm) => mm.id === ocrInfo.method)?.label || null;
                    const line = (k: string, v: string | null, mono?: boolean) => (
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "2px 0" }}>
                        <span style={{ color: "#64748b" }}>{k}</span>
                        <span style={{ fontWeight: 800, color: v ? "#334155" : "#b45309", fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all", textAlign: "right" }}>{v || "not found"}</span>
                      </div>
                    );
                    return (
                      <div style={{ marginTop: "8px", padding: "10px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, background: found ? "#f0fdf4" : "#fffbeb", border: `1px solid ${found ? "#bbf7d0" : "#fde68a"}`, color: found ? "#15803d" : "#92400e" }}>
                        {found ? (
                          <>
                            <div style={{ fontWeight: 800, marginBottom: "4px" }}>✓ Read from the receipt. Please double-check it against the image.</div>
                            {line("Reference no.", ocrInfo.reference || null, true)}
                            {line("Amount", ocrInfo.amount != null ? fmtCurrency(ocrInfo.amount) : null)}
                            {line("Date", ocrInfo.date ? fmtDate(ocrInfo.date) : null)}
                            {line("Sent to", methodLabel)}
                          </>
                        ) : (
                          "Couldn't read this receipt automatically. Please type the reference no. and the amount yourself."
                        )}
                      </div>
                    );
                  })()}

                  {needsPreviousAdventureBalance && (
                    <div style={{ ...field, padding: "12px", borderRadius: "12px", background: "#fff7ed", border: "1px solid #fed7aa" }}>
                      <label htmlFor="manual-previous-adventure-balance" style={{ ...label, color: "#9a3412" }}>
                        Previous adventure unpaid balance (₱) · optional
                      </label>
                      <input
                        id="manual-previous-adventure-balance"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={form.previousAdventureBalance}
                        onChange={(event) => setF({ previousAdventureBalance: event.target.value })}
                        placeholder="Leave blank if unknown; enter 0 if none"
                        style={input}
                      />
                      <div style={{ marginTop: "5px", fontSize: "11px", lineHeight: 1.5, color: "#9a3412" }}>
                        Check the family&apos;s manual Adventure 1 record if available. Leave blank if unknown. This amount stays separate from this registration&apos;s Adventure {selectedReg ? advOf(selectedReg) : ""} payment.
                      </div>
                    </div>
                  )}

                  <div style={{ ...field, marginTop: "14px" }}>
                    <span style={label}>Admin note (optional)</span>
                    <textarea rows={2} value={form.adminNote} onChange={(e) => setF({ adminNote: e.target.value })} placeholder="e.g. Parent sent receipt via Messenger" style={{ ...input, resize: "none" }} />
                  </div>

                  {isFollowUp ? (
                    <div style={{ fontSize: "12px", color: "#334155", fontWeight: 600, padding: "8px 10px", borderRadius: "10px", background: "#f0fdf4" }}>
                      Balance payments are recorded as verified right away.
                    </div>
                  ) : (
                    <label style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "12px", color: "#334155", fontWeight: 600, cursor: "pointer" }}>
                      <input type="checkbox" checked={form.verifyNow} onChange={(e) => setF({ verifyNow: e.target.checked })} style={{ marginTop: "2px" }} />
                      <span>
                        Mark as verified right away
                        <span style={{ display: "block", fontWeight: 500, color: "#94a3b8", marginTop: "2px" }}>
                          Uncheck to send it to the Pending list for review.
                        </span>
                      </span>
                    </label>
                  )}

                  <label style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "12px", color: "#334155", fontWeight: 600, cursor: verifiedNow ? "pointer" : "default", marginTop: "12px", opacity: verifiedNow ? 1 : 0.5 }}>
                    <input type="checkbox" checked={form.sendEmail && verifiedNow} disabled={!verifiedNow} onChange={(e) => setF({ sendEmail: e.target.checked })} style={{ marginTop: "2px" }} />
                    <span>
                      📧 Email a confirmation to the parent
                      <span style={{ display: "block", fontWeight: 500, color: "#94a3b8", marginTop: "2px" }}>
                        {isFollowUp
                          ? "Sent after the payment is saved, with the balance statement."
                          : "Sent when the payment is marked verified. Skipped if the registration email was already sent."}
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {manualError && (
                <div style={{ margin: "0 24px", padding: "10px 14px", borderRadius: "10px", background: "#fef2f2", color: "#b91c1c", fontSize: "13px", fontWeight: 600 }}>
                  {manualError}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", padding: "20px 24px 24px" }}>
                <button onClick={() => setManualOpen(false)} disabled={manualSaving} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "white", color: "#64748b", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                <button onClick={submitManual} disabled={manualSaving} style={{ flex: 2, padding: "12px", borderRadius: "12px", border: "none", background: manualSaving ? "#94a3b8" : "#002f76", color: "white", fontSize: "13px", fontWeight: 700, cursor: manualSaving ? "default" : "pointer" }}>
                  {manualSaving ? "Saving…" : "Save payment"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {reminderPreview && (
        <div
          onClick={() => !actioning && setReminderPreview(null)}
          style={{ position: "fixed", inset: 0, zIndex: 62, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "760px", maxHeight: "92vh", display: "flex", flexDirection: "column", background: "white", borderRadius: "20px", boxShadow: "0 20px 40px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", padding: "18px 22px", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "18px", color: "#002f76" }}>Payment reminder preview</div>
                <div style={{ marginTop: "5px", fontSize: "12px", color: "#64748b", overflowWrap: "anywhere" }}>To: {reminderPreview.to}</div>
                <div style={{ marginTop: "4px", fontSize: "12px", color: "#334155" }}>Subject: <strong>{reminderPreview.subject}</strong></div>
              </div>
              <button
                type="button"
                onClick={() => setReminderPreview(null)}
                disabled={!!actioning}
                aria-label="Close reminder preview"
                style={{ border: 0, background: "transparent", color: "#64748b", fontSize: "22px", lineHeight: 1, cursor: actioning ? "wait" : "pointer" }}
              >×</button>
            </div>
            <div style={{ padding: "14px 18px", overflowY: "auto", background: "#f1f5f9" }}>
              <iframe
                title="Payment reminder email preview"
                srcDoc={reminderPreview.html}
                sandbox=""
                style={{ display: "block", width: "100%", height: "560px", border: "1px solid #dbe3ef", borderRadius: "12px", background: "white" }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "14px 22px", borderTop: "1px solid #e2e8f0" }}>
              <button
                type="button"
                onClick={() => setReminderPreview(null)}
                disabled={!!actioning}
                style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "white", color: "#475569", fontSize: "13px", fontWeight: 700, cursor: actioning ? "wait" : "pointer" }}
              >Cancel</button>
              <button
                type="button"
                onClick={() => void confirmSendReminder()}
                disabled={!!actioning}
                style={{ padding: "10px 18px", borderRadius: "10px", border: 0, background: "#0033a0", color: "white", fontSize: "13px", fontWeight: 800, cursor: actioning ? "wait" : "pointer" }}
              >{actioning === `${reminderPreview.uid}-email-reminder-send` ? "Sending…" : "Send this email"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject reason modal (replaces window.prompt) */}
      {rejectTarget && (
        <div onClick={() => setRejectTarget(null)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px", width: "100%", background: "white", borderRadius: "20px", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontWeight: 800, fontSize: "18px", color: "#002f76" }}>Reject payment</div>
            <div style={{ fontSize: "13px", color: "#64748b", marginTop: "6px", marginBottom: "14px" }}>Give a reason so the parent knows what to fix (optional).</div>
            <textarea
              autoFocus
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Receipt is unclear, please resubmit…"
              style={{ width: "100%", boxSizing: "border-box", padding: "12px", border: "1.5px solid #e2e8f0", borderRadius: "12px", fontSize: "13px", fontFamily: "inherit", color: "#334155", background: "#f8faff", outline: "none", resize: "none" }}
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => setRejectTarget(null)} style={{ flex: 1, padding: "11px", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "white", color: "#64748b", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmReject} style={{ flex: 1, padding: "11px", borderRadius: "12px", border: "none", background: "#ef4444", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>Confirm reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast (replaces alert) */}
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 70, padding: "12px 22px", borderRadius: "999px", background: toast.type === "error" ? "#b91c1c" : "#002f76", color: "white", fontSize: "13px", fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", whiteSpace: "nowrap" }}>
          {toast.type === "error" ? "❌ " : "✅ "}{toast.msg}
        </div>
      )}

      {/* ── Red banner: the Adventure dates are not fully coming from the Renewal Settings ── */}
      {!loading && dateIssues.length > 0 && (
        <div style={{ marginBottom: "16px", padding: "14px 18px", borderRadius: "14px", background: "#fef2f2", border: "1.5px solid #fca5a5", color: "#991b1b", fontSize: "13px", fontWeight: 600 }}>
          <div style={{ fontWeight: 800, marginBottom: "4px" }}>⚠ Adventure dates are not fully coming from Renewal Settings</div>
          <ul style={{ margin: 0, paddingLeft: "18px" }}>
            {dateIssues.map((msg, i) => <li key={i} style={{ marginBottom: "2px" }}>{msg}</li>)}
          </ul>
          <div style={{ marginTop: "6px", fontWeight: 500, color: "#b91c1c" }}>
            Fix it in Admin → Programs &amp; Registration Control (Curious Explorer), then save and refresh this page.
          </div>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "24px" }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: "white", borderRadius: "20px", padding: "20px 24px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: s.color, lineHeight: 1 }}>{loading ? "—" : s.value}</div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "3px" }}>{s.label}</div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#b6c2d4", marginTop: "1px" }}>{loading ? "" : s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ background: "white", borderRadius: "20px", padding: "16px 20px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)", marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        {/* Adventure toggle */}
        <div style={{ display: "flex", gap: "8px" }}>
          {(
            [
              { key: "current" as const, label: `${ADVENTURES.current.label} (Current)` },
              { key: "next" as const, label: `${ADVENTURES.next.label} (Next)` },
              ...(showPastTab ? [{ key: "past" as const, label: "📁 Past Adventures" }] : []),
            ] as { key: Tab; label: string }[]
          ).map(({ key: v, label }) => (
            <button
              key={v}
              className="filter-pill"
              onClick={() => setView(v)}
              style={{
                padding: "8px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: 700,
                border: view === v ? "none" : "1.5px solid #e2e8f0",
                background: view === v ? "#002f76" : "white",
                color: view === v ? "white" : "#64748b",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", flex: "1 1 220px", minWidth: "180px" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", pointerEvents: "none" }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search student, parent, ref no., or type…"
            style={{ width: "100%", paddingLeft: "36px", paddingRight: "12px", paddingTop: "10px", paddingBottom: "10px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", fontWeight: 500, color: "#334155", outline: "none", background: "#f8faff", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>

        {view === "current" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {FILTERS.map(f => {
              const active = activeFilter === f.id;
              const bgMap: Record<string, string> = { pending: "#fffbeb", verified: "#f0fdf4", rejected: "#fef2f2" };
              const colorMap: Record<string, string> = { pending: "#b45309", verified: "#15803d", rejected: "#b91c1c" };
              return (
                <button key={f.id} className="filter-pill" onClick={() => setActiveFilter(f.id)} style={{ padding: "8px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, border: active ? "none" : "1.5px solid #e2e8f0", background: active ? (bgMap[f.id] || "#eff6ff") : "white", color: active ? (colorMap[f.id] || "#0050d5") : "#64748b", boxShadow: active ? "0 2px 8px rgba(0,0,0,0.08)" : "none" }}>
                  {f.label} <span style={{ opacity: 0.7 }}>({loading ? "…" : statusCounts[f.id] ?? 0})</span>
                </button>
              );
            })}
          </div>
        )}

        {view === "next" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {NEXT_FILTERS.map(f => {
              const active = nextFilter === f.id;
              const bgMap: Record<string, string> = { pending: "#fffbeb", intent: "#f1f5f9", renewed: "#f0fdf4", rejected: "#fef2f2" };
              const colorMap: Record<string, string> = { pending: "#b45309", intent: "#475569", renewed: "#15803d", rejected: "#b91c1c" };
              return (
                <button key={f.id} className="filter-pill" onClick={() => setNextFilter(f.id)} style={{ padding: "8px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, border: active ? "none" : "1.5px solid #e2e8f0", background: active ? (bgMap[f.id] || "#eff6ff") : "white", color: active ? (colorMap[f.id] || "#0050d5") : "#64748b", boxShadow: active ? "0 2px 8px rgba(0,0,0,0.08)" : "none" }}>
                  {f.label} <span style={{ opacity: 0.7 }}>({loading ? "…" : nextCounts[f.id] ?? 0})</span>
                </button>
              );
            })}
          </div>
        )}

        {view === "current" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectStyle} title="Filter by payment type">
              {TYPE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selectStyle} title="Sort the list">
              {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        )}

        {/* Manual encoding */}
        <button
          className="filter-pill"
          onClick={openManual}
          style={{ padding: "8px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, border: "none", background: "#10b981", color: "white", boxShadow: "0 2px 8px rgba(16,185,129,0.3)" }}
        >
          ＋ Encode Payment
        </button>

        <div style={{ marginLeft: "auto", fontSize: "12px", fontWeight: 600, color: "#94a3b8", flexShrink: 0 }}>
          {loading
            ? "Loading…"
            : view === "current"
              ? `${filtered.length} of ${allGroups.length} students`
              : view === "next"
                ? `${renewalRows.length} of ${renewalRowsAll.length} registrations`
                : `${pastGroups.count} payments · ${pastGroups.unpaidCount} unpaid registrations`}
        </div>
      </div>

      {/* ── Content ── */}
      {view === "current" ? (
        loading ? (
          <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", color: "#94a3b8", fontSize: "15px", fontWeight: 600, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
            <div>Loading payments…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", border: "2px dashed #e2e8f0" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>💳</div>
            <div style={{ fontWeight: 800, color: "#002f76", fontSize: "18px", marginBottom: "6px" }}>No payments found</div>
            <div style={{ color: "#94a3b8", fontSize: "14px" }}>Try adjusting your search, status or type filter.</div>
          </div>
        ) : (
          <>
            {/* How to read this list */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px", padding: "10px 16px", marginBottom: "12px", borderRadius: "14px", background: "#f8faff", border: "1px solid #e8efff", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
              <span>ℹ️ <b>One row = one student.</b> All of a student&apos;s payments are grouped in a single row. Click a row to open it, then click any payment in the <b>Account ledger</b> to switch between them.</span>
            </div>

            <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,47,118,0.06)", overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: PAY_GRID, padding: "12px 24px", background: "#f8faff", borderBottom: "1px solid #e8efff" }}>
                {["Parent & Student", "Payment Details", "Latest Payment", "Status", "Actions"].map((h, i) => (
                  <div key={i} style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", textAlign: h === "Actions" ? "right" : "left" }}>{h}</div>
                ))}
              </div>

              {paginatedPayments.map((g, idx) => {
                const { acc, uid, type, items } = g;
                const focus = g.pendingItem ?? g.latest; // what opens when the row is clicked
                const avatarGrad = AVATAR_COLORS[colorIndex((acc.email || uid).toLowerCase())];
                const statusStyle = {
                  verified: { bg: "#f0fdf4", color: "#15803d", label: "VERIFIED" },
                  rejected: { bg: "#fef2f2", color: "#b91c1c", label: "REJECTED" },
                  pending: { bg: "#fffbeb", color: "#b45309", label: "PENDING" },
                }[g.status];
                const summary = type === "registration" ? regSummary.get(uid) : undefined;
                const registration = type === "registration" ? registrations.find((r) => r.id === uid) : undefined;
                const isDup = items.some((i) => dupRefs.has(normRef(i.payment.referenceNumber)));
                const isTest = items.some((i) => /test/i.test(i.payment.referenceNumber || ""));
                const pendingItems = items.filter((i) => getStatus(i.payment) === "pending");
                const pendingAmt = pendingItems.reduce((sum, i) => sum + i.payment.amountPaid, 0);
                const waiting = g.pendingItem ? daysSince(g.pendingItem.payment.submittedAt) : 0;
                const methods = Array.from(new Set(items.map((i) => (i.payment.paymentMethod || "—").toUpperCase()))).join(" / ");
                const rejectedNote = items.find((i) => i.payment.rejected && i.payment.adminNote)?.payment.adminNote;
                const latestRef = g.latest.payment.referenceNumber;
                const accent = g.status === "pending" ? "#f59e0b" : g.status === "rejected" ? "#ef4444" : "transparent";
                const regTag = kindTag("registration", items[0].payment);

                let balanceLine = "";
                let balanceColor = "#b45309";
                if (g.pendingItem) {
                  balanceLine = `⏳ ${fmtCurrency(pendingAmt)} awaiting verification (not counted yet)`;
                } else if (type === "registration" && g.status !== "rejected" && summary && summary.balance != null) {
                  if (summary.balance === 0) { balanceLine = "✓ Account fully paid"; balanceColor = "#15803d"; }
                  else {
                    const prevText = summary.prevBalance && summary.prevBalance > 0 ? ` (incl. ${fmtCurrency(summary.prevBalance)} prev. adv.)` : "";
                    balanceLine = `Balance now ${fmtCurrency(summary.balance)}${summary.interest > 0 ? ` + ${fmtCurrency(summary.interest)} interest` : ""}${prevText}`;
                  }
                }

                return (
                  <m.div
                    key={g.key}
                    className="pay-row"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx, 20) * 0.025 }}
                    onClick={() => openDetail(focus)}
                    style={{ display: "grid", gridTemplateColumns: PAY_GRID, padding: "15px 24px 15px 20px", borderLeft: `4px solid ${accent}`, borderBottom: idx < paginatedPayments.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", background: "white", cursor: "pointer" }}
                  >
                    {/* Parent & student col */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: avatarGrad, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "13px", fontWeight: 800, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                        {getInitials(acc.fullName || acc.email || "?")}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: "14px", color: "#002f76", lineHeight: 1.2 }}>
                          {acc.fullName ? formatPersonName(acc.fullName) : acc.email}
                        </div>
                        <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px", fontWeight: 600 }}>
                          🎓 {acc.childName ? formatPersonName(acc.childName) : "Student not set"}{acc.program ? <span style={{ color: "#94a3b8", fontWeight: 500 }}> · {acc.program}</span> : null}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "5px" }}>
                          {isTestAccount(acc) && (
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 800, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", letterSpacing: "0.4px" }}>
                              🧪 TESTING ACCOUNT
                            </span>
                          )}
                          {type === "session"
                            ? <span style={tagStyle("#ecfeff", "#0e7490")}>VIRTUAL SESSION</span>
                            : <span style={tagStyle(
                              (items[0].advNum >= 2) ? regTag.bg : "#eff6ff",
                              (items[0].advNum >= 2) ? regTag.color : "#0050d5"
                            )}>{items[0].advNum >= 2 ? `ADVENTURE ${items[0].advNum} REGISTRATION` : "REGISTRATION"}</span>}
                          {items.length > 1 && <span style={tagStyle("#f1f5f9", "#475569")}>{items.length} payments</span>}
                          {isTest && !isTestAccount(acc) && <span style={tagStyle("#f1f5f9", "#64748b")}>TEST</span>}
                        </div>
                      </div>
                    </div>

                    {/* Amount col */}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "15px", color: "#334155" }}>
                        {fmtCurrency(g.total)}
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", marginLeft: "6px", textTransform: "uppercase" }}>total paid</span>
                      </div>
                      {items.length > 1 && (
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px", fontWeight: 600 }}>
                          {items.slice(0, 4).map((i) => fmtCurrency(i.payment.amountPaid)).join(" + ")}{items.length > 4 ? ` + ${items.length - 4} more` : ""}
                        </div>
                      )}
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px", fontWeight: 600, textTransform: "uppercase" }}>
                        via {methods}
                      </div>
                      {balanceLine && (
                        <div style={{ fontSize: "11px", marginTop: "4px", fontWeight: 700, color: balanceColor }}>{balanceLine}</div>
                      )}
                    </div>

                    {/* Latest payment col */}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "12px", color: "#334155" }}>{fmtShort(g.lastTime)}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px", fontFamily: "monospace", wordBreak: "break-all" }}>
                        {latestRef ? `Ref: ${latestRef}` : "No Ref"}
                        {latestRef && (
                          <button
                            className="copy-ref"
                            title="Copy reference no."
                            onClick={(e) => { e.stopPropagation(); copyText(latestRef, "Reference no."); }}
                          >
                            📋
                          </button>
                        )}
                      </div>
                      {items.length > 1 && (
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>First paid {fmtShort(g.firstTime)}</div>
                      )}
                      {isDup && <div style={{ marginTop: "4px" }}><span style={tagStyle("#fef2f2", "#b91c1c")}>⚠ DUPLICATE REF</span></div>}
                    </div>

                    {/* Status col */}
                    <div>
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", background: statusStyle.bg, color: statusStyle.color, borderRadius: "20px", fontSize: "11px", fontWeight: 800 }}>
                        {statusStyle.label}
                      </span>
                      {items.length > 1 && (
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", fontWeight: 600 }}>{g.verifiedCount} of {items.length} verified</div>
                      )}
                      {g.status === "pending" && waiting > 0 && (
                        <div style={{ fontSize: "11px", fontWeight: 700, color: waiting >= 3 ? "#b91c1c" : "#b45309", marginTop: "4px" }}>
                          Waiting {waiting} day{waiting > 1 ? "s" : ""}
                        </div>
                      )}
                      {g.status === "rejected" && rejectedNote && (
                        <div title={rejectedNote} style={{ fontSize: "11px", color: "#b91c1c", marginTop: "4px", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          Reason: {rejectedNote}
                        </div>
                      )}
                    </div>

                    {/* Actions col */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button onClick={(e) => { e.stopPropagation(); openDetail(focus); }} style={{ padding: "6px 10px", borderRadius: "8px", background: "#eff6ff", color: "#0050d5", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }} title="All payments, receipt and ledger for this student">
                        🧾 Details
                      </button>
                      {g.pendingItem && (
                        <>
                          <button
                            title={
                              (pendingItems.length > 1 ? `Verifies the oldest of ${pendingItems.length} pending payments. Open Details to review each one. ` : "") +
                              (g.pendingItem.type === "registration" ? "Approves the registration, registers the student and emails the parent." : "Mark this payment as verified.")
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              const pi = g.pendingItem!;
                              if (pi.type === "registration" && !isBalanceRow(pi.payment)) openDetail(pi);
                              else handleAction(pi.uid, pi.type === "session" || (pi.type === "registration" && isBalanceRow(pi.payment)) ? pi.payment.id : null, "verify", pi.type);
                            }}
                            disabled={!!actioning}
                            style={{ padding: "6px 12px", borderRadius: "8px", background: "#10b981", color: "white", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer" }}
                          >
                            ✓ Verify
                          </button>
                          <button
                            title="Reject this payment"
                            onClick={(e) => { e.stopPropagation(); const pi = g.pendingItem!; handleAction(pi.uid, pi.type === "session" || (pi.type === "registration" && isBalanceRow(pi.payment)) ? pi.payment.id : null, "reject", pi.type); }}
                            disabled={!!actioning}
                            style={{ padding: "6px 12px", borderRadius: "8px", background: "#ef4444", color: "white", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer" }}
                          >
                            ✕
                          </button>
                        </>
                      )}
                      {registration?.parentInfo?.email && !g.pendingItem && registration.status !== "rejected" && (
                        <>
                          {summary?.balance != null && summary.balance > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); void sendRegistrationEmail(uid, "reminder"); }}
                              disabled={!!actioning}
                              style={{ padding: "6px 10px", borderRadius: "8px", background: "#fff7ed", color: "#c2410c", fontSize: "12px", fontWeight: 700, border: "1px solid #fed7aa", cursor: actioning ? "wait" : "pointer" }}
                            >
                              {actioning === `${uid}-email-reminder` ? "Preparing preview…" : "📧 Reminder"}
                            </button>
                          )}
                          {isRegistrationVerified(registration.status) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); void sendRegistrationEmail(uid, "confirmation"); }}
                              disabled={!!actioning}
                              style={{ padding: "6px 10px", borderRadius: "8px", background: "#f0fdf4", color: "#15803d", fontSize: "12px", fontWeight: 700, border: "1px solid #bbf7d0", cursor: actioning ? "wait" : "pointer" }}
                            >
                              {actioning === `${uid}-email-confirmation` ? "Sending…" : "↻ Resend email"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </m.div>
                );
              })}
              <TablePagination
                total={filtered.length}
                page={safeCurrentPage}
                pageCount={currentPageCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="students"
                ariaLabel="Payment students pages"
              />
            </div>
          </>
        )
      ) : loading ? (
        <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", color: "#94a3b8", fontSize: "15px", fontWeight: 600, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          <div>Loading…</div>
        </div>
      ) : view === "next" ? (
        /* ── Next Adventure: every registration for it (new + existing families), with or without a payment ── */
        <>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px", padding: "10px 16px", marginBottom: "12px", borderRadius: "14px", background: "#f8faff", border: "1px solid #e8efff", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
            <span>
              ℹ️ <b>Adventure {advNumbers.next} · one row = one registration</b> (new and existing families)
              {tl.nextStart ? `, starts ${fmtDate(tl.nextStart)}` : ", start date not set yet"}.
              {" "}Rows with <b>no receipt</b> are clickable: tap one to record that family&apos;s payment.
            </span>
          </div>

          <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,47,118,0.06)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: PAY_GRID, padding: "12px 24px", background: "#f8faff", borderBottom: "1px solid #e8efff" }}>
              {["Parent & Student", "Payment Details", "Latest Payment", "Status", "Actions"].map((h) => (
                <div key={h} style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", textAlign: h === "Actions" ? "right" : "left" }}>{h}</div>
              ))}
            </div>

            {renewalRows.length === 0 ? (
              <div style={{ padding: "60px 24px", textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>🗂️</div>
                <div style={{ fontWeight: 800, color: "#002f76", fontSize: "16px", marginBottom: "4px" }}>
                  {renewalRowsAll.length === 0 ? `No Adventure ${advNumbers.next} registrations yet` : "No registrations match"}
                </div>
                <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                  {renewalRowsAll.length === 0 ? "New and returning families will show up here as soon as they register." : "Try another filter or clear the search box."}
                </div>
              </div>
            ) : (
              paginatedRenewalRows.map(({ r, acc, payment, state, hasReceipt }, idx) => {
                const childFull = fullChildName(r);
                const prog = (PROGRAM_SLOTS as any)[r.program];
                const programName = prog?.name || r.program || "—";
                const amtPaid = Number(r.amountPaid) || 0;
                const noReceipt = !hasReceipt;
                const badge = noReceipt
                  ? { label: "NO RECEIPT YET", bg: "#f1f5f9", color: "#64748b" }
                  : RENEWAL_BADGE[state];
                const accent = state === "pending" ? "#f59e0b" : state === "rejected" ? "#ef4444" : noReceipt ? "#cbd5e1" : "transparent";
                const avatarGrad = AVATAR_COLORS[colorIndex((acc.email || r.id).toLowerCase())];
                const returning = typeof r.familyTypeOverride === "boolean"
                  ? !r.familyTypeOverride
                  : renewalIds.has(String(r.id)) || isRenewalReg(r) || r.isNewFamily === false;
                const summary = regSummary.get(r.id);
                const waiting = state === "pending" ? daysSince(r.submittedAt) : 0;
                const registeredDays = noReceipt ? daysSince(r.createdAt || r.submittedAt) : 0;
                const detailItem: DetailItem = { uid: r.id, acc, payment, type: "registration", seq: 1, seqTotal: 1 };
                const openRow = () => (noReceipt ? openManualFor(r) : openDetail(detailItem));
                const ref = r.referenceNumber as string | undefined;
                const method = (r.paymentMethod || "").toUpperCase();

                let balanceLine = "";
                let balanceColor = "#b45309";
                if (state === "pending") {
                  balanceLine = `⏳ ${fmtCurrency(amtPaid)} awaiting verification (not counted yet)`;
                } else if (state === "renewed" && summary && summary.balance != null) {
                  if (summary.balance === 0) { balanceLine = "✓ Account fully paid"; balanceColor = "#15803d"; }
                  else {
                    const prevText = summary.prevBalance && summary.prevBalance > 0 ? ` (incl. ${fmtCurrency(summary.prevBalance)} prev. adv.)` : "";
                    balanceLine = `Balance now ${fmtCurrency(summary.balance)}${summary.interest > 0 ? ` + ${fmtCurrency(summary.interest)} interest` : ""}${prevText}`;
                  }
                }

                return (
                  <m.div
                    key={r.id}
                    className={noReceipt ? "pay-row record-row" : "pay-row"}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx, 20) * 0.025 }}
                    onClick={openRow}
                    title={noReceipt ? "No receipt yet. Click to record this family's payment." : "Open payment details"}
                    style={{ display: "grid", gridTemplateColumns: PAY_GRID, padding: "15px 24px 15px 20px", borderLeft: `4px solid ${accent}`, borderBottom: idx < renewalRows.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", background: "white", cursor: "pointer" }}
                  >
                    {/* Parent & student */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: noReceipt ? "linear-gradient(135deg,#94a3b8,#cbd5e1)" : avatarGrad, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "13px", fontWeight: 800, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                        {getInitials(acc.fullName || acc.email || "?")}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: "14px", color: "#002f76", lineHeight: 1.2 }}>{acc.fullName ? formatPersonName(acc.fullName) : acc.email || "—"}</div>
                        <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px", fontWeight: 600 }}>
                          🎓 {childFull ? formatPersonName(childFull) : "Student not set"}<span style={{ color: "#94a3b8", fontWeight: 500 }}> · {programName}</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "5px" }}>
                          {isTestAccount(acc) && <span style={tagStyle("#fef3c7", "#92400e")}>🧪 TESTING ACCOUNT</span>}
                          <span style={advTagStyle(advNumbers.next, tl.curNum)}>ADVENTURE {advNumbers.next} REGISTRATION</span>
                          <span style={returning ? tagStyle("#f5f3ff", "#7c3aed") : tagStyle("#ecfeff", "#0e7490")}>{returning ? "RETURNING FAMILY" : "NEW FAMILY"}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void updateRegistrationFamilyType(r.id, returning); }}
                            disabled={!!actioning}
                            title={`Change to ${returning ? "new family" : "returning family"}`}
                            style={{ padding: "2px 6px", borderRadius: "6px", background: "#fff", color: "#475569", fontSize: "10px", fontWeight: 700, border: "1px solid #cbd5e1", cursor: actioning ? "wait" : "pointer" }}
                          >
                            {actioning === `${r.id}-family-type` ? "Saving…" : returning ? "Mark new" : "Mark returning"}
                          </button>
                          {r.classTime && <span style={tagStyle("#f1f5f9", "#475569")}>{r.classTime}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Payment details */}
                    <div>
                      {noReceipt ? (
                        <>
                          <div style={{ fontWeight: 800, fontSize: "14px", color: "#94a3b8" }}>No payment yet</div>
                          {prog?.downpayment ? (
                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px", fontWeight: 600 }}>
                              Downpayment to secure the slot: {fmtCurrency(prog.downpayment)}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <div style={{ fontWeight: 800, fontSize: "15px", color: "#334155" }}>
                            {fmtCurrency(amtPaid)}
                            <span style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", marginLeft: "6px", textTransform: "uppercase" }}>paid</span>
                          </div>
                          {method && (
                            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px", fontWeight: 600, textTransform: "uppercase" }}>via {method}</div>
                          )}
                          {balanceLine && (
                            <div style={{ fontSize: "11px", marginTop: "4px", fontWeight: 700, color: balanceColor }}>{balanceLine}</div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Latest payment */}
                    <div>
                      {noReceipt ? (
                        <>
                          <div style={{ fontWeight: 600, fontSize: "12px", color: "#334155" }}>
                            {registeredDays === 0 ? "Registered today" : `Registered ${registeredDays} day${registeredDays > 1 ? "s" : ""} ago`}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>Waiting for the parent&apos;s receipt</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontWeight: 600, fontSize: "12px", color: "#334155" }}>
                            {r.submittedAt ? fmtShort(new Date(r.submittedAt).getTime()) : "—"}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px", fontFamily: "monospace", wordBreak: "break-all" }}>
                            {ref ? `Ref: ${ref}` : "No Ref"}
                            {ref && (
                              <button
                                className="copy-ref"
                                title="Copy reference no."
                                onClick={(e) => { e.stopPropagation(); copyText(ref, "Reference no."); }}
                              >
                                📋
                              </button>
                            )}
                          </div>
                          {ref && dupRefs.has(normRef(ref)) && (
                            <div style={{ marginTop: "4px" }}><span style={tagStyle("#fef2f2", "#b91c1c")}>⚠ DUPLICATE REF</span></div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", background: badge.bg, color: badge.color, borderRadius: "20px", fontSize: "11px", fontWeight: 800 }}>
                        {badge.label}
                      </span>
                      {state === "pending" && waiting > 0 && (
                        <div style={{ fontSize: "11px", fontWeight: 700, color: waiting >= 3 ? "#b91c1c" : "#b45309", marginTop: "4px" }}>
                          Waiting {waiting} day{waiting > 1 ? "s" : ""}
                        </div>
                      )}
                      {state === "rejected" && r.adminNote && (
                        <div title={r.adminNote} style={{ fontSize: "11px", color: "#b91c1c", marginTop: "4px", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          Reason: {r.adminNote}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {noReceipt ? (
                        <>
                          <button
                            className="record-btn"
                            onClick={(e) => { e.stopPropagation(); openManualFor(r); }}
                            title="Record this family's payment (upload the receipt and enter the amount)"
                            style={{ padding: "6px 12px", borderRadius: "8px", background: "#eff6ff", color: "#0050d5", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer", transition: "all 0.15s" }}
                          >
                            ＋ Record payment
                          </button>
                          {r.parentInfo?.email && (
                            <button
                              onClick={(e) => { e.stopPropagation(); void sendRegistrationEmail(r.id, "reminder"); }}
                              disabled={!!actioning}
                              style={{ padding: "6px 10px", borderRadius: "8px", background: "#fff7ed", color: "#c2410c", fontSize: "12px", fontWeight: 700, border: "1px solid #fed7aa", cursor: actioning ? "wait" : "pointer" }}
                            >
                              {actioning === `${r.id}-email-reminder` ? "Preparing preview…" : "📧 Reminder"}
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); openDetail(detailItem); }}
                            style={{ padding: "6px 10px", borderRadius: "8px", background: "#eff6ff", color: "#0050d5", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                            title="Receipt, breakdown and ledger for this registration"
                          >
                            🧾 Details
                          </button>
                          {state === "pending" && (
                            <>
                              <button
                                title="Approves the registration, registers the student and emails the parent."
                                onClick={(e) => { e.stopPropagation(); openDetail(detailItem); }}
                                disabled={!!actioning}
                                style={{ padding: "6px 12px", borderRadius: "8px", background: "#10b981", color: "white", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer" }}
                              >
                                ✓ Verify
                              </button>
                              <button
                                title="Reject this payment"
                                onClick={(e) => { e.stopPropagation(); handleAction(r.id, null, "reject", "registration"); }}
                                disabled={!!actioning}
                                style={{ padding: "6px 12px", borderRadius: "8px", background: "#ef4444", color: "white", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer" }}
                              >
                                ✕
                              </button>
                            </>
                          )}
                          {r.parentInfo?.email && state === "renewed" && isRegistrationVerified(r.status) && (
                            <>
                              {summary?.balance != null && summary.balance > 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); void sendRegistrationEmail(r.id, "reminder"); }}
                                  disabled={!!actioning}
                                  style={{ padding: "6px 10px", borderRadius: "8px", background: "#fff7ed", color: "#c2410c", fontSize: "12px", fontWeight: 700, border: "1px solid #fed7aa", cursor: actioning ? "wait" : "pointer" }}
                                >
                                  {actioning === `${r.id}-email-reminder` ? "Preparing preview…" : "📧 Reminder"}
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); void sendRegistrationEmail(r.id, "confirmation"); }}
                                disabled={!!actioning}
                                style={{ padding: "6px 10px", borderRadius: "8px", background: "#f0fdf4", color: "#15803d", fontSize: "12px", fontWeight: 700, border: "1px solid #bbf7d0", cursor: actioning ? "wait" : "pointer" }}
                              >
                                {actioning === `${r.id}-email-confirmation` ? "Sending…" : "↻ Resend email"}
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </m.div>
                );
              })
            )}
            <TablePagination
              total={renewalRows.length}
              page={safeNextPage}
              pageCount={nextPageCount}
              pageSize={pageSize}
              onPageChange={setNextPage}
              onPageSizeChange={setPageSize}
              itemLabel="registrations"
              ariaLabel="Next adventure registration pages"
            />
          </div>
        </>
      ) : (
        /* ── Past Adventures: payments and unpaid registrations ── */
        <div style={{ background: "white", borderRadius: "20px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)", overflow: "hidden" }}>
          {pastGroups.groups.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
              {pastItems.length === 0 && pastGroups.unpaidCount === 0
                ? "No payments or unpaid registrations from earlier Adventures yet."
                : "No past payments or unpaid registrations match your search."}
            </div>
          ) : (
            paginatedPastGroups.map(({ num, items, unpaid }) => {
              const range = ADVENTURES.past.find((p) => p.num === num);
              const families = new Set([
                ...items.map((i) => i.acc.email || i.uid),
                ...unpaid.map((r) => r.parentInfo?.email || r.id),
              ]).size;
              return (
                <div key={num}>
                  {/* Adventure header */}
                  <div style={{ padding: "16px 24px", background: "linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)", borderBottom: "1px solid #e8efff", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #0050d5, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "16px", fontWeight: 800 }}>
                      {num}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "15px", color: "#002f76" }}>Adventure {num}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {range ? `${fmtDate(range.start)} — ${fmtDate(range.end)} · ` : ""}
                        {items.length} payment{items.length !== 1 ? "s" : ""} · {unpaid.length} unpaid registration{unpaid.length !== 1 ? "s" : ""} from {families} {families !== 1 ? "families" : "family"}
                      </div>
                    </div>
                  </div>

                  {/* Column headers */}
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 0.8fr 1fr", padding: "10px 24px", background: "#f8faff", borderBottom: "1px solid #e8efff" }}>
                    {["Student & Parent", "Type", "Amount", "Status", "Date / Action"].map((h) => (
                      <div key={h} style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px" }}>{h}</div>
                    ))}
                  </div>

                  {items.map(({ uid, acc, payment, type, seq, seqTotal }, idx) => {
                    const status = getStatus(payment);
                    const statusColors = { verified: "#15803d", rejected: "#b91c1c", pending: "#b45309" };
                    const tag = kindTag(type, payment);
                    return (
                      <div
                        key={payment.id + idx}
                        className="pay-row"
                        onClick={() => openDetail({ uid, acc, payment, type, seq, seqTotal })}
                        style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 0.8fr 1fr", padding: "12px 24px", borderBottom: "1px solid #f1f5f9", alignItems: "center", background: "white", cursor: "pointer" }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "13px", color: "#002f76" }}>{acc.childName || acc.fullName || acc.email}</div>
                          <div style={{ fontSize: "11px", color: "#94a3b8" }}>{acc.fullName || "—"}</div>
                        </div>
                        <div>
                          <span style={tagStyle(tag.bg, tag.color)}>
                            {type === "session" ? "SESSION" : isBalanceRow(payment) ? "BALANCE" : "REGISTRATION"}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: "13px", color: "#002f76" }}>{fmtCurrency(payment.amountPaid || 0)}</div>
                        <div style={{ fontWeight: 700, fontSize: "12px", color: statusColors[status], textTransform: "uppercase" }}>{status}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{fmtDateTime(payment.submittedAt).split(",").slice(0, 2).join(",")}</div>
                      </div>
                    );
                  })}
                  {unpaid.map((r) => (
                    <div
                      key={`unpaid-${r.id}`}
                      style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 0.8fr 1fr", padding: "12px 24px", borderBottom: "1px solid #f1f5f9", alignItems: "center", background: "#fffdf7" }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "13px", color: "#002f76" }}>{fullChildName(r) || "Student name not set"}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>{r.parentInfo?.name || r.parentInfo?.email || "—"}</div>
                      </div>
                      <div><span style={tagStyle("#eff6ff", "#0050d5")}>REGISTRATION</span></div>
                      <div style={{ fontWeight: 700, fontSize: "13px", color: "#94a3b8" }}>—</div>
                      <div style={{ fontWeight: 800, fontSize: "11px", color: "#b45309" }}>NOT PAID</div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {fmtDateTime(r.submittedAt || r.createdAt).split(",").slice(0, 2).join(",")}
                        </span>
                        <button
                          type="button"
                          onClick={() => openManualFor(r)}
                          style={{ padding: "6px 9px", border: "1px solid #a7f3d0", borderRadius: "8px", background: "#ecfdf5", color: "#047857", fontSize: "11px", fontWeight: 800, cursor: "pointer" }}
                        >
                          Encode payment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
          <TablePagination
            total={pastGroups.groups.length}
            page={safePastPage}
            pageCount={pastPageCount}
            pageSize={pageSize}
            onPageChange={setPastPage}
            onPageSizeChange={setPageSize}
            itemLabel="adventures"
            ariaLabel="Past adventure pages"
          />
        </div>
      )}
    </AppShell>
  );
}

export default function AdminPaymentsPage() {
  return (
    <Suspense fallback={null}>
      <AdminPaymentsPageInner />
    </Suspense>
  );
}
