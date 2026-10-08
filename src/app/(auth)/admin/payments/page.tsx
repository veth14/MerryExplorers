"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { m } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import {
  calcRegistrationTerms,
  getStudentSessionInfo,
  firstInterestDate,
  isRegistrationVerified,
  fmtIsoDate,
  RESERVATION_RATE,
  WEEKLY_INTEREST_RATE,
  BALANCE_DUE_SESSION,
} from "@/lib/payment-terms";
import { allocateBalancePayment } from "@/lib/balance-payment";
import { PROGRAM_SLOTS, UNIFORM_KIT } from "@/data/landing";

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

// ── CONFIG: fill in your real values ─────────────────────────────
const ADVENTURES = {
  current: { label: "Current Adventure", start: "2026-06-01", end: "2026-10-31" }, // TODO: real dates
  next: { label: "Next Adventure", start: "2026-11-01", end: "2027-03-31" }, // TODO: real dates
};

// Tuition for the NEXT adventure, by program name (as stored in account.program)
const NEXT_TUITION: Record<string, number> = {
  "Trailblazer: Brave Explorer": 0, // TODO: real fee
};

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

// Reads the reference number AND the amount off a receipt image
async function extractReceiptData(imageDataUrl: string): Promise<{ reference: string; amount: number | null }> {
  let reference = "";
  let amount: number | null = null;
  try {
    const Tesseract = (await import("tesseract.js")).default;
    const { data } = await Tesseract.recognize(imageDataUrl, "eng");
    const text: string = data.text;

    // reference number (same patterns as the parent payment page)
    const refPatterns = [
      /\b(ITO\d{12,20})\b/i,
      /\b([A-Z0-9]{4}\s+[A-Z0-9]{4}\s+[A-Z0-9]{4})\b/i,
      /\b(\d{13})\b/,
      /(?:ref\.?\s*no\.?|reference\s*(?:id|number)?|trace\s*id)\s*[:\-]?\s*([A-Z0-9]{8,20})\b/i,
      /\b(\d{10,20})\b/,
    ];
    for (const pattern of refPatterns) {
      const hit = text.match(pattern);
      if (hit && hit[1]) { reference = hit[1].replace(/\s+/g, ""); break; }
    }

    // amount: look next to "Total Amount / Amount Sent / Transfer Amount / Amount", else any "PHP 1,234.00"
    const toNum = (v: string) => parseFloat(v.replace(/,/g, ""));
    const found: number[] = [];
    const labeled = /(?:total\s*amount(?:\s*sent)?|amount\s*sent|transfer\s*amount|amount)\s*[:\-]?\s*(?:php|₱|p)?\s*([\d,]+\.\d{2})\b/gi;
    for (const hit of text.matchAll(labeled)) found.push(toNum(hit[1]));
    if (found.length === 0) {
      for (const hit of text.matchAll(/(?:php|₱)\s*([\d,]+\.\d{2})\b/gi)) found.push(toNum(hit[1]));
    }
    // receipts repeat the amount, so take the value that shows up most often
    const counts = new Map<number, number>();
    found.filter((n) => n > 0).forEach((n) => counts.set(n, (counts.get(n) || 0) + 1));
    let best = 0;
    counts.forEach((c, n) => { if (c > best) { best = c; amount = n; } });
  } catch {
    // OCR failed silently – admin types the details in
  }
  return { reference, amount };
}

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
  renewed: { label: "RENEWED", bg: "#f0fdf4", color: "#15803d" },
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
const sumBalancePayments = (r: any) => balancePaymentsOf(r).reduce((s, b) => s + (Number(b.amountPaid) || 0), 0);
const firstPaymentAmount = (r: any) => Math.max(0, (r.amountPaid || r.amountDue || 0) - sumBalancePayments(r));
const isBalanceRow = (p: { id: string }) => p.id.startsWith("bal-");

const fullChildName = (r: any) => `${r?.childInfo?.firstName ?? ""} ${r?.childInfo?.lastName ?? ""}`.trim();

const fmtShort = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Builders shared by the list AND the ledger, so a payment looks the same wherever it is opened from
const regAccountOf = (r: any): Account => ({
  id: r.id,
  fullName: r.parentInfo?.name,
  email: r.parentInfo?.email || "",
  childName: fullChildName(r), // full name so two siblings are never mixed up
  program: r.program,
});
const firstPaymentOf = (r: any): Payment => ({
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
});
const balancePaymentOf = (r: any, b: any): Payment => ({
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
});
const sortedBalancesOf = (r: any): any[] =>
  [...balancePaymentsOf(r)].sort(
    (a, b) => new Date(a.paidOn || a.recordedAt || 0).getTime() - new Date(b.paidOn || b.recordedAt || 0).getTime()
  );

type PaymentKind = "session" | "downpayment" | "registration";
type DetailItem = { uid: string; acc: Account; payment: Payment; type: PaymentKind; seq?: number; seqTotal?: number };
type PaymentItem = { uid: string; acc: Account; payment: Payment; type: "session" | "registration"; seq: number; seqTotal: number };
type LedgerRow = { key: string; kind: PaymentKind; label: string; date: string; method: string; ref: string; amount: number; verified: boolean; rejected: boolean; regId?: string; child?: string; item: DetailItem };
// One row of the list = one student (all of that student's payments grouped together)
type PaymentGroup = {
  key: string; uid: string; acc: Account; type: "session" | "registration";
  items: PaymentItem[]; status: "pending" | "verified" | "rejected";
  latest: PaymentItem; pendingItem: PaymentItem | null; verifiedCount: number;
  total: number; lastTime: number; firstTime: number;
};

// Which Adventure a payment belongs to. A renewal downpayment is always for the NEXT adventure,
// even though it is paid during the current one; everything else is decided by the date paid.
type AdventureKey = "current" | "next";
function adventureOf(kind: PaymentKind, iso: string | undefined): AdventureKey | null {
  if (kind === "downpayment") return "next";
  if (inRange(iso, ADVENTURES.current)) return "current";
  if (inRange(iso, ADVENTURES.next)) return "next";
  return null;
}
const ADV_BADGE: Record<AdventureKey, { label: string; short: string; bg: string; color: string }> = {
  current: { label: "Current Adventure", short: "CURRENT", bg: "#eff6ff", color: "#0050d5" },
  next: { label: "Next Adventure", short: "NEXT", bg: "#f5f3ff", color: "#7c3aed" },
};
const advTagStyle = (k: AdventureKey): CSSProperties => ({
  display: "inline-flex", padding: "2px 7px", borderRadius: "20px", fontSize: "10px", fontWeight: 800,
  background: ADV_BADGE[k].bg, color: ADV_BADGE[k].color, letterSpacing: "0.3px",
});

// small coloured label used in the list rows
const tagStyle = (bg: string, color: string): CSSProperties => ({
  display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "20px", fontSize: "10px",
  fontWeight: 800, background: bg, color, letterSpacing: "0.3px", whiteSpace: "nowrap",
});

// what kind of payment is this row? (label + colours used everywhere so admins always read it the same way)
function kindTag(type: PaymentKind, payment: Payment) {
  if (type === "session") return { label: "VIRTUAL SESSION", bg: "#ecfeff", color: "#0e7490" };
  if (type === "downpayment") return { label: "RENEWAL DOWNPAYMENT", bg: "#f5f3ff", color: "#7c3aed" };
  if (isBalanceRow(payment)) return { label: "BALANCE PAYMENT", bg: "#fff7ed", color: "#c2410c" };
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

export default function AdminPaymentsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<any[]>([]); // includes registrations with no payment yet (for manual encoding)
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"current" | "next">("current");
  const [activeFilter, setActiveFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [search, setSearch] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ uid: string; paymentId: string | null; type: PaymentKind } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // ── Manual encoding state ──
  const [manualOpen, setManualOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, paidOn: todayIso() });
  const [receipt, setReceipt] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState("");
  const [parentFilter, setParentFilter] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrAmount, setOcrAmount] = useState<number | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const modalRef = useRef<HTMLDivElement>(null);

  function openDetail(item: DetailItem) {
    setImgFailed(false);
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
    ])
      .then(([accountsData, regData]) => {
        if (Array.isArray(accountsData)) {
          // every parent account (needed to see who has NOT renewed)
          setAllAccounts(
            accountsData.filter(
              (acc: Account) => (!acc.role || acc.role === "parent") && !isExcluded(acc.childName)
            )
          );
          // accounts that have payments
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
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── CURRENT ADVENTURE: session + registration payments only ──
  const allPayments = useMemo(() => {
    const flat: PaymentItem[] = [];
    accounts.forEach(acc => {
      (acc.sessionPayments || []).forEach(p => flat.push({ uid: acc.id, acc, payment: p, type: "session", seq: 1, seqTotal: 1 }));
    });

    registrations.forEach(r => {
      const regAcc = regAccountOf(r);

      // the first payment
      flat.push({ uid: r.id, acc: regAcc, type: "registration", seq: 1, seqTotal: 1, payment: firstPaymentOf(r) });

      // later payments of the remaining balance (encoded by the admin)
      balancePaymentsOf(r).forEach((b: any) => {
        flat.push({ uid: r.id, acc: regAcc, type: "registration", seq: 1, seqTotal: 1, payment: balancePaymentOf(r, b) });
      });
    });

    // Number the payments of each student ("Payment 2 of 3"): the first payment is always #1,
    // balance payments follow in the order they were paid. Done BEFORE the adventure filter so
    // the numbers stay correct.
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

    return flat
      .filter(({ payment }) => inRange(payment.submittedAt, ADVENTURES.current))
      .sort((a, b) => new Date(b.payment.submittedAt).getTime() - new Date(a.payment.submittedAt).getTime());
  }, [accounts, registrations]);

  const stats = useMemo(() => {
    const total = allPayments.length;
    const pending = allPayments.filter(p => !p.payment.verified && !p.payment.rejected).length;
    const verified = allPayments.filter(p => p.payment.verified).length;
    const totalRevenue = allPayments.filter(p => p.payment.verified).reduce((s, p) => s + p.payment.amountPaid, 0);
    const students = new Set(allPayments.map(p => `${p.type}-${p.uid}`)).size;
    return { total, pending, verified, totalRevenue, students };
  }, [allPayments]);

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

  // reference numbers used by more than one payment (possible double-encoding or re-used receipt)
  const dupRefs = useMemo(() => {
    const counts = new Map<string, number>();
    allPayments.forEach(({ payment }) => {
      const r = normRef(payment.referenceNumber);
      if (r.length < 4 || IGNORED_REFS.has(r)) return;
      counts.set(r, (counts.get(r) || 0) + 1);
    });
    const dups = new Set<string>();
    counts.forEach((n, r) => { if (n > 1) dups.add(r); });
    return dups;
  }, [allPayments]);

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

  // ── NEXT ADVENTURE: renewals + balances ──
  const renewalRowsAll = useMemo(() => {
    return allAccounts.map((acc) => {
      const dp = acc.renewalStatus?.downpayment;
      const state = getRenewal(acc);
      const fee = NEXT_TUITION[acc.program || ""] || 0;
      const paid =
        (dp?.verified ? dp.amountPaid || 0 : 0) +
        (acc.sessionPayments || [])
          .filter((p) => p.verified && inRange(p.submittedAt, ADVENTURES.next))
          .reduce((s, p) => s + p.amountPaid, 0);
      const balance = fee > 0 ? Math.max(0, fee - paid) : null;
      return { acc, state, fee, paid, balance, dp };
    });
  }, [allAccounts]);

  const renewalRows = useMemo(() => {
    const q = search.toLowerCase();
    return renewalRowsAll.filter(({ acc }) =>
      !q ||
      (acc.fullName || "").toLowerCase().includes(q) ||
      (acc.email || "").toLowerCase().includes(q) ||
      (acc.childName || "").toLowerCase().includes(q)
    );
  }, [renewalRowsAll, search]);

  const nextStats = useMemo(() => {
    const total = renewalRowsAll.length;
    const renewed = renewalRowsAll.filter((r) => r.state === "renewed").length;
    const awaiting = renewalRowsAll.filter((r) => r.state === "pending").length;
    const notRenewed = renewalRowsAll.filter((r) => r.state === "not-renewed" || r.state === "intent").length;
    const collected = renewalRowsAll.reduce((s, r) => s + r.paid, 0);
    return { total, renewed, awaiting, notRenewed, collected };
  }, [renewalRowsAll]);

  // Verify runs immediately; reject opens the custom reason modal first
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

    if (type === "registration") {
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
      else showToast("Action failed. Please try again.", "error");
    } catch { showToast("Network error. Please try again.", "error"); }
    finally { setActioning(null); }
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
    return allRegistrations
      .filter((r) => {
        const name = `${r.childInfo?.firstName ?? ""} ${r.childInfo?.lastName ?? ""} ${r.parentInfo?.name ?? ""} ${r.parentInfo?.email ?? ""}`;
        return !q || name.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.childInfo?.firstName || "").localeCompare(b.childInfo?.firstName || ""));
  }, [allRegistrations, parentFilter]);

  // Same rules as the details modal (calcRegistrationTerms) so the numbers always match
  function regInfo(reg: any) {
    const email = (reg?.parentInfo?.email || "").toLowerCase();
    const parentAcc = allAccounts.find((a) => (a.email || "").toLowerCase() === email);
    const student = getStudentSessionInfo(reg, parentAcc);
    const paidVerified = isRegistrationVerified(reg.status) ? reg.amountPaid || reg.amountDue || 0 : 0;
    const terms = calcRegistrationTerms(reg, student, paidVerified, reg.amountDue);
    // first payment = the one parents make on the "Secure Your Slot" page
    const isInitial = reg.status === "reserved" || reg.status === "early-bird";
    const prog = (PROGRAM_SLOTS as any)[reg.program] ?? null;
    return { terms, paidVerified, isInitial, prog };
  }

  // Account balance per registration, shown on every row so the admin sees where the student stands
  const regSummary = useMemo(() => {
    const map = new Map<string, { due: number | null; balance: number | null; interest: number; totalPayable: number | null; paid: number }>();
    registrations.forEach((r) => {
      try {
        const t: any = regInfo(r).terms;
        if (t) map.set(r.id, { due: t.due ?? null, balance: t.balance ?? null, interest: t.interest || 0, totalPayable: t.totalPayable ?? null, paid: t.paidVerified || 0 });
      } catch {
        // a registration with odd data should never break the whole list
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrations, allAccounts]);

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

  const nextRow = useMemo(
    () => (form.type === "downpayment" ? renewalRowsAll.find((r) => r.acc.id === form.accountId) ?? null : null),
    [form.type, form.accountId, renewalRowsAll]
  );

  // Amount due for the FIRST registration payment (program rate/downpayment + kits), same as the parent page
  const regCalc = useMemo(() => {
    if (!selectedReg) return null;
    const info = regInfo(selectedReg);
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
  }, [selectedReg, form.paymentOption, form.isNewFamily, form.uniformOrdered, form.recitalKitOrdered, allAccounts]);

  const paidNum = Number(form.amountPaid) || 0;
  const expectedNow = regCalc?.amountDue ?? null;
  const creditBalance = expectedNow != null && paidNum > expectedNow ? +(paidNum - expectedNow).toFixed(2) : 0;
  const amountShort = expectedNow != null && paidNum > 0 && paidNum < expectedNow ? +(expectedNow - paidNum).toFixed(2) : 0;

  // ── Follow-up payment: paying off what's left on a registration that already has a payment ──
  const isFollowUp = form.type === "registration" && !!selectedReg && !!regCalc && !regCalc.isInitial;
  const followTerms = isFollowUp ? regCalc!.terms : null;
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
    return allPayments.find((p) => normRef(p.payment.referenceNumber) === r) ?? null;
  }, [form.referenceNumber, allPayments]);

  async function handleReceiptFile(file: File | undefined) {
    if (!file) return;
    setManualError("");
    try {
      const data = await fileToReceipt(file);
      setReceipt(data);
      setReceiptName(file.name);
      // read the reference number off the receipt (same OCR the parent page uses)
      if (data.startsWith("data:image")) {
        setOcrLoading(true);
        setOcrAmount(null);
        extractReceiptData(data)
          .then(({ reference, amount }) => {
            setOcrAmount(amount);
            // only fill empty fields – never overwrite what the admin already typed
            setForm((f) => ({
              ...f,
              referenceNumber: f.referenceNumber || reference,
              amountPaid: f.amountPaid || (amount != null ? String(amount) : ""),
            }));
          })
          .finally(() => setOcrLoading(false));
      }
    } catch (e: any) {
      setReceipt(null);
      setReceiptName("");
      setManualError(e.message || "Receipt upload failed.");
    }
  }

  // which adventure tab will this payment show up in? (decided by the date paid)
  const landsIn = useMemo(() => {
    if (!form.paidOn) return null;
    const iso = new Date(form.paidOn + "T12:00:00").toISOString();
    if (inRange(iso, ADVENTURES.current)) return ADVENTURES.current.label;
    if (inRange(iso, ADVENTURES.next)) return ADVENTURES.next.label;
    return null;
  }, [form.paidOn]);

  async function postJson(url: string, method: string, body: any) {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
      let approveEmailed = false; // the approve route already emailed the parent ("Officially Enrolled")

      if (form.type === "registration") {
        if (isFollowUp) {
          // Balance payment: its own admin endpoint. It never touches /payment (first payment only)
          // or /approve (would create a duplicate student and send the enrollment email again).
          const r = await postJson(`/api/registrations/${form.registrationId}/balance-payment`, "POST", {
            paymentMethod: form.paymentMethod,
            receiptBase64: receipt,
            referenceNumber: form.referenceNumber.trim(),
            amountPaid: amount,
            paidOn: adminFields.submittedAt,
            adminNote: adminFields.adminNote,
            waiveInterest: waivable && form.waiveInterest,
            expectedTotalPayable: followTerms?.totalPayable ?? null,
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
          item: { uid: a.id, acc: a, payment: p, type: "session", seq: i + 1, seqTotal: sp.length },
        })
      );
      const dp = a.renewalStatus?.downpayment;
      if (dp?.submitted)
        rows.push({
          key: "dp-" + a.id, kind: "downpayment", label: "Renewal Downpayment", date: dp.submittedAt, method: dp.paymentMethod || "", ref: dp.referenceNumber || "",
          amount: dp.amountPaid || 0, verified: dp.verified, rejected: dp.rejected, child: a.childName,
          item: { uid: a.id, acc: a, payment: dpToPayment(a), type: "downpayment", seq: 1, seqTotal: 1 },
        });
    });
    registrations.forEach((r) => {
      const rEmail = (r.parentInfo?.email || "").toLowerCase();
      if (r.id !== detail.uid && !(email && rEmail === email)) return;
      const regAcc = regAccountOf(r);
      const bals = sortedBalancesOf(r);
      const total = 1 + bals.length;
      const first = firstPaymentOf(r);
      rows.push({
        key: "r-" + r.id, kind: "registration", label: "Registration (1st payment)",
        date: first.submittedAt, method: first.paymentMethod, ref: first.referenceNumber || "",
        amount: first.amountPaid, verified: first.verified, rejected: first.rejected,
        regId: r.id, child: fullChildName(r),
        item: { uid: r.id, acc: regAcc, payment: first, type: "registration", seq: 1, seqTotal: total },
      });
      bals.forEach((b: any, i: number) => {
        const bp = balancePaymentOf(r, b);
        rows.push({
          key: "b-" + b.id, kind: "registration", label: "Registration balance",
          date: bp.submittedAt, method: bp.paymentMethod, ref: bp.referenceNumber || "",
          amount: bp.amountPaid, verified: bp.verified, rejected: false,
          regId: r.id, child: fullChildName(r),
          item: { uid: r.id, acc: regAcc, payment: bp, type: "registration", seq: i + 2, seqTotal: total },
        });
      });
    });
    return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [detail, accounts, registrations]);

  type Breakdown = {
    due: number | null;
    items: { key: string; label: string; amount: number }[];
    paidVerified: number;
    balance: number | null;
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
      const reg = registrations.find((x) => x.id === detail.uid);
      const email = (reg?.parentInfo?.email || acc.email || "").toLowerCase();
      const parentAcc = allAccounts.find((a) => (a.email || "").toLowerCase() === email);
      const student = getStudentSessionInfo(reg, parentAcc);
      return calcRegistrationTerms(reg, student, paidVerified, payment.amountDue ?? reg?.amountDue);
    }

    // Renewal downpayments / session payments
    const rawDue = type === "downpayment" ? NEXT_TUITION[acc.program || ""] : undefined;
    const due = rawDue && rawDue > 0 ? rawDue : null;
    const balance = due != null ? Math.max(0, due - paidVerified) : null;
    return {
      due, items: [], paidVerified, balance,
      reservation: null, balanceShare: null, dueDate: null, interestStart: null,
      mondays: 0, interest: 0, totalPayable: balance,
    };
  }

  function paymentTypeLabel(type: PaymentKind, payment: Payment) {
    if (type === "session") return "Virtual Session Payment";
    if (type === "registration") return isBalanceRow(payment) ? "Registration Balance Payment" : "Registration Payment (1st payment)";
    return "Renewal Downpayment";
  }

  function copyDetails(d: DetailItem) {
    const { acc, payment, type } = d;
    const bd = calcBreakdown();
    const typeLabel = paymentTypeLabel(type, payment);
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
      `Remaining balance: ${bd?.balance != null ? fmtCurrency(bd.balance) : "-"}`,
      ...(bd?.reservation != null
        ? [
          `Reservation (${Math.round(RESERVATION_RATE * 100)}%, non-refundable): ${fmtCurrency(bd.reservation)}`,
          `Balance (${100 - Math.round(RESERVATION_RATE * 100)}%) due on session ${BALANCE_DUE_SESSION}: ${fmtCurrency(bd.balanceShare ?? 0)} — ${bd.dueDate ? fmtDate(bd.dueDate) : "date not set"}`,
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

  const statCards =
    view === "current"
      ? [
        { label: "Total Payments", value: stats.total, sub: `from ${stats.students} student${stats.students === 1 ? "" : "s"} / famil${stats.students === 1 ? "y" : "ies"}`, icon: "📋", color: "#0050d5", bg: "linear-gradient(135deg,#eff6ff,#dbeafe)" },
        { label: "Pending Review", value: stats.pending, sub: stats.pending > 0 ? "Needs your action" : "All caught up 🎉", icon: "⏳", color: "#b45309", bg: "linear-gradient(135deg,#fffbeb,#fef3c7)" },
        { label: "Verified", value: stats.verified, sub: "Counted in revenue", icon: "✅", color: "#15803d", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
        { label: "Total Revenue", value: fmtCurrency(stats.totalRevenue), sub: "Verified payments only", icon: "💰", color: "#7c3aed", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)" },
      ]
      : [
        { label: "Renewed", value: `${nextStats.renewed} / ${nextStats.total}`, sub: "Downpayment verified", icon: "✅", color: "#15803d", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
        { label: "Awaiting Verify", value: nextStats.awaiting, sub: nextStats.awaiting > 0 ? "Needs your action" : "All caught up 🎉", icon: "⏳", color: "#b45309", bg: "linear-gradient(135deg,#fffbeb,#fef3c7)" },
        { label: "Not Renewed", value: nextStats.notRenewed, sub: "No verified downpayment yet", icon: "📭", color: "#64748b", bg: "linear-gradient(135deg,#f1f5f9,#e2e8f0)" },
        { label: "Collected (Next)", value: fmtCurrency(nextStats.collected), sub: "Verified payments only", icon: "💰", color: "#7c3aed", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)" },
      ];

  const RENEWAL_GRID = "1.7fr 1.1fr 1.1fr 1.1fr 1fr 1fr";

  const selectStyle: CSSProperties = {
    padding: "8px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, border: "1.5px solid #e2e8f0",
    background: "white", color: "#64748b", cursor: "pointer", outline: "none", fontFamily: "inherit",
  };

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
        const advThis = adventureOf(type, payment.submittedAt);
        const bd = calcBreakdown();
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
          ["Adventure", advThis ? ADV_BADGE[advThis].label : "Outside both Adventures"],
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
              [`Balance (${100 - pctRes}%) due on session ${BALANCE_DUE_SESSION}`, `${fmtCurrency(bd.balanceShare ?? 0)} · ${bd.dueDate ? fmtDate(bd.dueDate) : "date not set"}`],
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
        const advTotals = { current: 0, next: 0, other: 0 };

        const pendingHelp =
          type === "registration"
            ? "Verifying APPROVES the registration, enrolls the student and emails the parent. Check the receipt amount and reference no. against GCash/BPI first."
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
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>{typeLabel}{seq && seqTotal && seqTotal > 1 ? ` · ${seqText}` : ""}{advThis ? ` · ${ADV_BADGE[advThis].label}` : ""}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ padding: "4px 10px", background: st.bg, color: st.color, borderRadius: "20px", fontSize: "11px", fontWeight: 800 }}>{st.label}</span>
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
                      {showInterest && bd && bd.interest > 0 ? `${fmtCurrency(bd.totalPayable ?? 0)} with interest` : "no overdue interest"}
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
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        disabled={!!actioning}
                        onClick={() => { handleAction(detail.uid, type === "session" ? payment.id : null, "verify", type); }}
                        style={{ padding: "8px 16px", borderRadius: "10px", background: "#10b981", color: "white", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer" }}
                      >
                        ✓ Verify
                      </button>
                      <button
                        disabled={!!actioning}
                        onClick={() => { const d = detail; setDetail(null); handleAction(d.uid, d.type === "session" ? d.payment.id : null, "reject", d.type); }}
                        style={{ padding: "8px 16px", borderRadius: "10px", background: "#ef4444", color: "white", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer" }}
                      >
                        ✕ Reject
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
                        <div style={{ color: "#334155", fontWeight: 600, wordBreak: "break-word" }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={sectionTitle}>Amount breakdown</div>
                  <div style={{ border: "1px solid #e8efff", borderRadius: "14px", padding: "14px", fontSize: "13px" }}>
                    {breakdownRows.map(([k, v], i) => (
                      <div key={k + i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#334155", fontWeight: 600 }}>
                        <span style={{ color: "#94a3b8" }}>{k}</span><span>{v}</span>
                      </div>
                    ))}
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
                    const adv = adventureOf(l.kind, l.date);
                    if (l.verified) {
                      running += l.amount;
                      advTotals[adv ?? "other"] += l.amount;
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
                            {adv && <span style={advTagStyle(adv)}>{ADV_BADGE[adv].short}</span>}
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
                    {(["current", "next"] as const).map((k) =>
                      advTotals[k] > 0 ? (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontWeight: 700, fontSize: "12px", color: ADV_BADGE[k].color }}>
                          <span>{ADV_BADGE[k].label}</span><span>{fmtCurrency(advTotals[k])}</span>
                        </div>
                      ) : null
                    )}
                    {advTotals.other > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontWeight: 700, fontSize: "12px", color: "#94a3b8" }}>
                        <span>Outside both Adventures</span><span>{fmtCurrency(advTotals.other)}</span>
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

        // Remaining-balance box (same numbers as the Payment Details modal)
        const balanceBox = (reg: any) => {
          const t = regInfo(reg).terms;
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
                    <span>{fmtCurrency(t.balanceShare ?? 0)}{t.dueDate ? ` · ${fmtDate(t.dueDate)}` : ""}</span>
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
                      onChange={(e) => { setF({ type: e.target.value as PaymentKind, accountId: "", registrationId: "", amountPaid: "", waiveInterest: false }); setParentFilter(""); }}
                      style={input}
                    >
                      <option value="registration">Registration Payment (1st payment or balance)</option>
                      <option value="session">Virtual Session Payment</option>
                      <option value="downpayment">Renewal Downpayment (Next Adventure)</option>
                    </select>
                  </div>

                  <div style={field}>
                    <span style={label}>{form.type === "registration" ? "Registration (child / parent)" : "Parent account"}</span>
                    <input value={parentFilter} onChange={(e) => setParentFilter(e.target.value)} placeholder="Type to filter by name or email…" style={{ ...input, marginBottom: "6px" }} />
                    {form.type === "registration" ? (
                      <select value={form.registrationId} onChange={(e) => setF({ registrationId: e.target.value, amountPaid: "", waiveInterest: false })} style={input}>
                        <option value="">Select registration…</option>
                        {registrationOptions.map((r) => (
                          <option key={r.id} value={r.id}>
                            {(r.childInfo?.firstName || "") + " " + (r.childInfo?.lastName || "")} — {r.parentInfo?.name || r.parentInfo?.email} · {r.status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select value={form.accountId} onChange={(e) => setF({ accountId: e.target.value, amountPaid: "" })} style={input}>
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
                      <div style={row}><span style={muted}>Program</span><span>{selectedReg.program || "—"}</span></div>
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
                      <div style={row}><span style={muted}>Program</span><span>{nextRow.acc.program || "—"}</span></div>
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
                      <input type="date" max={todayIso()} value={form.paidOn} onChange={(e) => setF({ paidOn: e.target.value })} style={input} />
                    </div>
                  </div>
                  {ocrLoading && !form.amountPaid && (
                    <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Reading the amount from the receipt…</div>
                  )}
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
                  {amountShort > 0 && (
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#b91c1c", marginBottom: "6px" }}>Short by {fmtCurrency(amountShort)}</div>
                  )}
                  {creditBalance > 0 && (
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#15803d", marginBottom: "6px" }}>Overpaid by {fmtCurrency(creditBalance)} (recorded as credit balance)</div>
                  )}
                  {form.paidOn && (
                    <div style={{ fontSize: "11px", marginBottom: "14px", color: landsIn ? "#15803d" : "#b45309" }}>
                      {landsIn ? `Will appear under: ${landsIn}` : "This date is outside both Adventures, so it won't show in either list."}
                    </div>
                  )}

                  <div style={field}>
                    <span style={label}>Payment method</span>
                    <select value={form.paymentMethod} onChange={(e) => setF({ paymentMethod: e.target.value })} style={input}>
                      {PAYMENT_METHODS.map((mm) => <option key={mm.id} value={mm.id}>{mm.label}</option>)}
                    </select>
                  </div>

                  <div style={field}>
                    <span style={label}>Reference no. (required)</span>
                    <input value={form.referenceNumber} onChange={(e) => setF({ referenceNumber: e.target.value })} placeholder="Copy from the receipt" style={{ ...input, fontFamily: "monospace" }} />
                    {ocrLoading && <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Reading the receipt…</div>}
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
                      <button onClick={() => { setReceipt(null); setReceiptName(""); setOcrAmount(null); }} style={{ border: "none", background: "none", color: "#b91c1c", fontWeight: 700, cursor: "pointer", fontSize: "11px" }}>Remove</button>
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
                          : "Sent when the payment is marked verified. Skipped if the enrollment email was already sent."}
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
          {(["current", "next"] as const).map((v) => (
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
              {ADVENTURES[v].label}
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
              : `${renewalRows.length} of ${renewalRowsAll.length} families`}
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

              {filtered.map((g, idx) => {
                const { acc, uid, type, items } = g;
                const focus = g.pendingItem ?? g.latest; // what opens when the row is clicked
                const avatarGrad = AVATAR_COLORS[colorIndex((acc.email || uid).toLowerCase())];
                const statusStyle = {
                  verified: { bg: "#f0fdf4", color: "#15803d", label: "VERIFIED" },
                  rejected: { bg: "#fef2f2", color: "#b91c1c", label: "REJECTED" },
                  pending: { bg: "#fffbeb", color: "#b45309", label: "PENDING" },
                }[g.status];
                const summary = type === "registration" ? regSummary.get(uid) : undefined;
                const isDup = items.some((i) => dupRefs.has(normRef(i.payment.referenceNumber)));
                const isTest = items.some((i) => /test/i.test(i.payment.referenceNumber || ""));
                const pendingItems = items.filter((i) => getStatus(i.payment) === "pending");
                const pendingAmt = pendingItems.reduce((sum, i) => sum + i.payment.amountPaid, 0);
                const waiting = g.pendingItem ? daysSince(g.pendingItem.payment.submittedAt) : 0;
                const methods = Array.from(new Set(items.map((i) => (i.payment.paymentMethod || "—").toUpperCase()))).join(" / ");
                const rejectedNote = items.find((i) => i.payment.rejected && i.payment.adminNote)?.payment.adminNote;
                const latestRef = g.latest.payment.referenceNumber;
                const accent = g.status === "pending" ? "#f59e0b" : g.status === "rejected" ? "#ef4444" : "transparent";

                let balanceLine = "";
                let balanceColor = "#b45309";
                if (g.pendingItem) {
                  balanceLine = `⏳ ${fmtCurrency(pendingAmt)} awaiting verification (not counted yet)`;
                } else if (type === "registration" && g.status !== "rejected" && summary && summary.balance != null) {
                  if (summary.balance === 0) { balanceLine = "✓ Account fully paid"; balanceColor = "#15803d"; }
                  else balanceLine = `Balance now ${fmtCurrency(summary.balance)}${summary.interest > 0 ? ` + ${fmtCurrency(summary.interest)} interest` : ""}`;
                }

                return (
                  <m.div
                    key={g.key}
                    className="pay-row"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx, 20) * 0.025 }}
                    onClick={() => openDetail(focus)}
                    style={{ display: "grid", gridTemplateColumns: PAY_GRID, padding: "15px 24px 15px 20px", borderLeft: `4px solid ${accent}`, borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", background: "white", cursor: "pointer" }}
                  >
                    {/* Parent & student col */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: avatarGrad, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "13px", fontWeight: 800, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                        {getInitials(acc.fullName || acc.email || "?")}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: "14px", color: "#002f76", lineHeight: 1.2 }}>
                          {acc.fullName || acc.email}
                        </div>
                        <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px", fontWeight: 600 }}>
                          🎓 {acc.childName || "Student not set"}{acc.program ? <span style={{ color: "#94a3b8", fontWeight: 500 }}> · {acc.program}</span> : null}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "5px" }}>
                          {type === "session"
                            ? <span style={tagStyle("#ecfeff", "#0e7490")}>VIRTUAL SESSION</span>
                            : <span style={tagStyle("#eff6ff", "#0050d5")}>REGISTRATION</span>}
                          {items.length > 1 && <span style={tagStyle("#f1f5f9", "#475569")}>{items.length} payments</span>}
                          {isTest && <span style={tagStyle("#f1f5f9", "#64748b")}>TEST</span>}
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
                              (g.pendingItem.type === "registration" ? "Approves the registration, enrolls the student and emails the parent." : "Mark this payment as verified.")
                            }
                            onClick={(e) => { e.stopPropagation(); const pi = g.pendingItem!; handleAction(pi.uid, pi.type === "session" ? pi.payment.id : null, "verify", pi.type); }}
                            disabled={!!actioning}
                            style={{ padding: "6px 12px", borderRadius: "8px", background: "#10b981", color: "white", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer" }}
                          >
                            ✓ Verify
                          </button>
                          <button
                            title="Reject this payment"
                            onClick={(e) => { e.stopPropagation(); const pi = g.pendingItem!; handleAction(pi.uid, pi.type === "session" ? pi.payment.id : null, "reject", pi.type); }}
                            disabled={!!actioning}
                            style={{ padding: "6px 12px", borderRadius: "8px", background: "#ef4444", color: "white", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer" }}
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </m.div>
                );
              })}
            </div>
          </>
        )
      ) : loading ? (
        <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", color: "#94a3b8", fontSize: "15px", fontWeight: 600, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          <div>Loading renewals…</div>
        </div>
      ) : (
        /* ── Next Adventure: renewals + balances ── */
        <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,47,118,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "14px 24px", fontSize: "12px", fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e8efff" }}>
            Renewed {nextStats.renewed} of {nextStats.total} families · one row per family
          </div>
          <div style={{ display: "grid", gridTemplateColumns: RENEWAL_GRID, padding: "12px 24px", background: "#f8faff", borderBottom: "1px solid #e8efff" }}>
            {["Parent / Child", "Renewal", "Downpayment", "Paid / Fee", "Balance", "Actions"].map((h) => (
              <div key={h} style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", textAlign: h === "Actions" ? "right" : "left" }}>{h}</div>
            ))}
          </div>

          {renewalRows.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>No families found.</div>
          ) : (
            renewalRows.map(({ acc, state, fee, paid, balance, dp }, idx) => {
              const b = RENEWAL_BADGE[state];
              const dpPending = !!dp?.submitted && !dp.verified && !dp.rejected;
              return (
                <div
                  key={acc.id}
                  className="pay-row"
                  style={{ display: "grid", gridTemplateColumns: RENEWAL_GRID, padding: "15px 24px", borderBottom: idx < renewalRows.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", background: "white" }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "14px", color: "#002f76", lineHeight: 1.2 }}>{acc.fullName || acc.email}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                      {acc.childName ? `${acc.childName} · ` : ""}{acc.program || "—"}
                    </div>
                  </div>

                  <div>
                    <span style={{ display: "inline-flex", padding: "4px 10px", background: b.bg, color: b.color, borderRadius: "20px", fontSize: "11px", fontWeight: 800 }}>
                      {b.label}
                    </span>
                  </div>

                  <div>
                    {dp?.submitted ? (
                      <>
                        <div style={{ fontWeight: 800, fontSize: "14px", color: "#334155" }}>{fmtCurrency(dp.amountPaid)}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                          {new Date(dp.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {dp.paymentMethod ? ` · ${dp.paymentMethod.toUpperCase()}` : ""}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: "12px", color: "#94a3b8" }}>—</div>
                    )}
                  </div>

                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                    {fmtCurrency(paid)} / {fee > 0 ? fmtCurrency(fee) : "set fee"}
                  </div>

                  <div style={{ fontWeight: 800, fontSize: "15px", color: balance === 0 ? "#15803d" : "#b45309" }}>
                    {balance === null ? "—" : fmtCurrency(balance)}
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {dp?.submitted && (
                      <button onClick={() => openDetail({ uid: acc.id, acc, payment: dpToPayment(acc), type: "downpayment" })} style={{ padding: "6px 10px", borderRadius: "8px", background: "#eff6ff", color: "#0050d5", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer" }} title="Payment details">
                        🧾 Details
                      </button>
                    )}
                    {dpPending && (
                      <>
                        <button onClick={() => handleAction(acc.id, null, "verify", "downpayment")} disabled={!!actioning} style={{ padding: "6px 12px", borderRadius: "8px", background: "#10b981", color: "white", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer" }}>
                          ✓ Verify
                        </button>
                        <button onClick={() => handleAction(acc.id, null, "reject", "downpayment")} disabled={!!actioning} style={{ padding: "6px 12px", borderRadius: "8px", background: "#ef4444", color: "white", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer" }}>
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </AppShell>
  );
}