"use client";

import { useEffect, useState, useMemo } from "react";
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

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function fmtCurrency(n: number | undefined) {
  return `₱${(n ?? 0).toLocaleString()}`;
}

function fmtDateTime(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

type PaymentKind = "session" | "downpayment" | "registration";
type DetailItem = { uid: string; acc: Account; payment: Payment; type: PaymentKind };
type LedgerRow = { key: string; kind: PaymentKind; label: string; date: string; method: string; ref: string; amount: number; verified: boolean; rejected: boolean };

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

export default function AdminPaymentsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"current" | "next">("current");
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ uid: string; paymentId: string | null; type: PaymentKind } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function openDetail(item: DetailItem) {
    setImgFailed(false);
    setDetail(item);
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
    const flat: { uid: string; acc: Account; payment: Payment; type: "session" | "registration" }[] = [];
    accounts.forEach(acc => {
      (acc.sessionPayments || []).forEach(p => flat.push({ uid: acc.id, acc, payment: p, type: "session" }));
    });

    registrations.forEach(r => {
      flat.push({
        uid: r.id,
        acc: {
          id: r.id,
          fullName: r.parentInfo?.name,
          email: r.parentInfo?.email || "",
          childName: r.childInfo?.firstName,
          program: r.program,
        },
        type: "registration",
        payment: {
          id: "reg-" + r.id,
          amountPaid: r.amountPaid || r.amountDue || 0,
          paymentMethod: r.paymentMethod || "",
          referenceNumber: r.referenceNumber,
          receiptBase64: r.receiptUrl || r.receiptBase64,
          submittedAt: r.submittedAt || new Date().toISOString(),
          verified: isRegistrationVerified(r.status),
          rejected: r.status === "rejected",
          amountDue: r.amountDue,
          adminNote: r.adminNote,
          reviewedAt: r.reviewedAt || r.approvedAt,
        }
      });
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
    return { total, pending, verified, totalRevenue };
  }, [allPayments]);

  const filtered = useMemo(() => {
    return allPayments.filter(({ acc, payment, type }) => {
      const matchFilter = activeFilter === "all" || getStatus(payment) === activeFilter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        (acc.fullName || "").toLowerCase().includes(q) ||
        (acc.email || "").toLowerCase().includes(q) ||
        (acc.childName || "").toLowerCase().includes(q) ||
        (payment.referenceNumber || "").toLowerCase().includes(q) ||
        type.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [allPayments, activeFilter, search]);

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

  // ── Payment details modal: ledger, breakdown, copy ──
  const ledger = useMemo<LedgerRow[]>(() => {
    if (!detail) return [];
    const email = (detail.acc.email || "").toLowerCase();
    const rows: LedgerRow[] = [];
    accounts.forEach((a) => {
      const match = a.id === detail.acc.id || (!!email && (a.email || "").toLowerCase() === email);
      if (!match) return;
      (a.sessionPayments || []).forEach((p) =>
        rows.push({ key: "s-" + p.id, kind: "session", label: "Virtual Session", date: p.submittedAt, method: p.paymentMethod, ref: p.referenceNumber || "", amount: p.amountPaid, verified: p.verified, rejected: p.rejected })
      );
      const dp = a.renewalStatus?.downpayment;
      if (dp?.submitted)
        rows.push({ key: "dp-" + a.id, kind: "downpayment", label: "Renewal Downpayment", date: dp.submittedAt, method: dp.paymentMethod || "", ref: dp.referenceNumber || "", amount: dp.amountPaid || 0, verified: dp.verified, rejected: dp.rejected });
    });
    registrations.forEach((r) => {
      const rEmail = (r.parentInfo?.email || "").toLowerCase();
      if (r.id !== detail.uid && !(email && rEmail === email)) return;
      rows.push({
        key: "r-" + r.id, kind: "registration", label: "Registration",
        date: r.submittedAt || new Date().toISOString(), method: r.paymentMethod || "", ref: r.referenceNumber || "",
        amount: r.amountPaid || r.amountDue || 0,
        verified: isRegistrationVerified(r.status), rejected: r.status === "rejected",
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
        // only this child's registration, not a sibling's registered under the same email
        if (type === "registration") return l.key === "r-" + detail.uid;
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
      return calcRegistrationTerms(reg, student, paidVerified, payment.amountDue);
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

  function copyDetails(d: DetailItem) {
    const { acc, payment, type } = d;
    const bd = calcBreakdown();
    const typeLabel = type === "session" ? "Virtual Session Payment" : type === "registration" ? "Registration Payment" : "Renewal Downpayment";
    const lines = [
      "PAYMENT DETAILS",
      `Parent/Guardian: ${acc.fullName || "-"}`,
      `Email: ${acc.email || "-"}`,
      `Student: ${acc.childName || "-"}`,
      `Program: ${acc.program || "-"}`,
      `Type: ${typeLabel}`,
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
      ...ledger.map((l) => `${new Date(l.date).toLocaleDateString("en-US")} | ${l.label} | ${(l.method || "-").toUpperCase()} | ${l.ref || "-"} | ${l.verified ? "Verified" : l.rejected ? "Rejected" : "Pending"} | ${fmtCurrency(l.amount)}`),
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => showToast("Copied! Paste it into your SOA.")).catch(() => showToast("Copy failed. Please try again.", "error"));
  }

  const statCards =
    view === "current"
      ? [
        { label: "Total Payments", value: stats.total, icon: "📋", color: "#0050d5", bg: "linear-gradient(135deg,#eff6ff,#dbeafe)" },
        { label: "Pending Review", value: stats.pending, icon: "⏳", color: "#b45309", bg: "linear-gradient(135deg,#fffbeb,#fef3c7)" },
        { label: "Verified", value: stats.verified, icon: "✅", color: "#15803d", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
        { label: "Total Revenue", value: fmtCurrency(stats.totalRevenue), icon: "💰", color: "#7c3aed", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)" },
      ]
      : [
        { label: "Renewed", value: `${nextStats.renewed} / ${nextStats.total}`, icon: "✅", color: "#15803d", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
        { label: "Awaiting Verify", value: nextStats.awaiting, icon: "⏳", color: "#b45309", bg: "linear-gradient(135deg,#fffbeb,#fef3c7)" },
        { label: "Not Renewed", value: nextStats.notRenewed, icon: "📭", color: "#64748b", bg: "linear-gradient(135deg,#f1f5f9,#e2e8f0)" },
        { label: "Collected (Next)", value: fmtCurrency(nextStats.collected), icon: "💰", color: "#7c3aed", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)" },
      ];

  const RENEWAL_GRID = "1.7fr 1.1fr 1.1fr 1.1fr 1fr 1fr";

  return (
    <AppShell title="Payment Tracking">
      <style>{`
        .pay-row { transition: background 0.15s; }
        .pay-row:hover { background: #f8faff !important; }
        .filter-pill { transition: all 0.15s; cursor: pointer; }
        .filter-pill:hover { transform: translateY(-1px); }
      `}</style>

      {/* Payment Details Modal */}
      {detail && (() => {
        const { acc, payment, type } = detail;
        const status = getStatus(payment);
        const st = {
          verified: { bg: "#f0fdf4", color: "#15803d", label: "VERIFIED" },
          rejected: { bg: "#fef2f2", color: "#b91c1c", label: "REJECTED" },
          pending: { bg: "#fffbeb", color: "#b45309", label: "PENDING" },
        }[status];
        const typeLabel = type === "session" ? "Virtual Session Payment" : type === "registration" ? "Registration Payment" : "Renewal Downpayment";
        const bd = calcBreakdown();
        const isLink = !!payment.receiptBase64 && payment.receiptBase64.startsWith("http");
        const pctRes = Math.round(RESERVATION_RATE * 100);
        const pctInt = Math.round(WEEKLY_INTEREST_RATE * 100);
        const showInterest = !!bd && bd.reservation != null && bd.balance != null && bd.balance > 0;

        const rows: [string, string][] = [
          ["Parent / Guardian", acc.fullName || "—"],
          ["Email", acc.email || "—"],
          ["Student", acc.childName || "—"],
          ["Program", acc.program || "—"],
          ["Payment type", typeLabel],
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

        const sectionTitle = { fontSize: "11px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.6px", marginBottom: "10px" };
        let running = 0;

        return (
          <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "880px", width: "100%", maxHeight: "92vh", overflowY: "auto", background: "white", borderRadius: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
                <div>
                  <div style={{ fontWeight: "800", fontSize: "18px", color: "#002f76" }}>Payment Details</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>{typeLabel}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ padding: "4px 10px", background: st.bg, color: st.color, borderRadius: "20px", fontSize: "11px", fontWeight: "800" }}>{st.label}</span>
                  <button onClick={() => copyDetails(detail)} style={{ padding: "8px 12px", borderRadius: "10px", background: "#eff6ff", color: "#0050d5", fontSize: "12px", fontWeight: "700", border: "none", cursor: "pointer" }}>📋 Copy for SOA</button>
                  <button onClick={() => setDetail(null)} style={{ padding: "8px", borderRadius: "12px", color: "#64748b", fontWeight: "bold", border: "none", background: "transparent", cursor: "pointer" }}>✕</button>
                </div>
              </div>

              <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
                {/* Left: details + breakdown */}
                <div>
                  <div style={sectionTitle}>Payment information</div>
                  <div style={{ border: "1px solid #e8efff", borderRadius: "14px", overflow: "hidden", marginBottom: "20px" }}>
                    {rows.map(([k, v], i) => (
                      <div key={k} style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "12px", padding: "10px 14px", background: i % 2 ? "white" : "#f8faff", fontSize: "13px" }}>
                        <div style={{ color: "#94a3b8", fontWeight: "600" }}>{k}</div>
                        <div style={{ color: "#334155", fontWeight: "600", wordBreak: "break-word" }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={sectionTitle}>Amount breakdown</div>
                  <div style={{ border: "1px solid #e8efff", borderRadius: "14px", padding: "14px", fontSize: "13px" }}>
                    {breakdownRows.map(([k, v], i) => (
                      <div key={k + i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#334155", fontWeight: "600" }}>
                        <span style={{ color: "#94a3b8" }}>{k}</span><span>{v}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: "6px", borderTop: "1px dashed #e2e8f0", fontWeight: "800", fontSize: "15px" }}>
                      <span style={{ color: "#002f76" }}>Remaining balance</span>
                      <span style={{ color: bd?.balance === 0 ? "#15803d" : "#b45309" }}>{bd?.balance != null ? fmtCurrency(bd.balance) : "—"}</span>
                    </div>
                    {showInterest && bd && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "8px 0 0", fontSize: "13px", fontWeight: "600", color: bd.interest > 0 ? "#b91c1c" : "#94a3b8" }}>
                          <span>
                            {bd.interest > 0
                              ? `Overdue interest (${pctInt}% × ${bd.mondays} Monday${bd.mondays > 1 ? "s" : ""})`
                              : `Overdue interest (${pctInt}% weekly)${bd.interestStart ? ` · starts ${fmtDate(bd.interestStart)}` : ""}`}
                          </span>
                          <span>{fmtCurrency(bd.interest)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", fontWeight: "800", fontSize: "15px" }}>
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
                            <a href={payment.receiptBase64} target="_blank" rel="noreferrer" style={{ color: "#0050d5", fontWeight: "700" }}>Open receipt link</a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ledger */}
              <div style={{ padding: "0 24px 24px" }}>
                <div style={sectionTitle}>Account ledger (all payments from this family)</div>
                <div style={{ border: "1px solid #e8efff", borderRadius: "14px", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 0.9fr 1fr", padding: "10px 14px", background: "#f8faff", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>
                    {["Description", "Date", "Method", "Reference", "Status", "Amount"].map((h) => <div key={h}>{h}</div>)}
                  </div>
                  {ledger.length === 0 ? (
                    <div style={{ padding: "16px", fontSize: "13px", color: "#94a3b8" }}>No other payments found.</div>
                  ) : ledger.map((l) => {
                    if (l.verified) running += l.amount;
                    const ls = l.verified ? "Verified" : l.rejected ? "Rejected" : "Pending";
                    const lc = l.verified ? "#15803d" : l.rejected ? "#b91c1c" : "#b45309";
                    return (
                      <div key={l.key} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 0.9fr 1fr", padding: "10px 14px", borderTop: "1px solid #f1f5f9", fontSize: "12px", color: "#334155", fontWeight: "600" }}>
                        <div>{l.label}</div>
                        <div>{new Date(l.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                        <div style={{ textTransform: "uppercase" }}>{l.method || "—"}</div>
                        <div style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{l.ref || "—"}</div>
                        <div style={{ color: lc, fontWeight: "800" }}>{ls}</div>
                        <div>{fmtCurrency(l.amount)}</div>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", borderTop: "1px solid #e8efff", background: "#f8faff", fontWeight: "800", fontSize: "13px", color: "#002f76" }}>
                    <span>Total verified payments</span><span>{fmtCurrency(running)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Reject reason modal (replaces window.prompt) */}
      {rejectTarget && (
        <div onClick={() => setRejectTarget(null)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px", width: "100%", background: "white", borderRadius: "20px", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontWeight: "800", fontSize: "18px", color: "#002f76" }}>Reject payment</div>
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
              <button onClick={() => setRejectTarget(null)} style={{ flex: 1, padding: "11px", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "white", color: "#64748b", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmReject} style={{ flex: 1, padding: "11px", borderRadius: "12px", border: "none", background: "#ef4444", color: "white", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>Confirm reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast (replaces alert) */}
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 70, padding: "12px 22px", borderRadius: "999px", background: toast.type === "error" ? "#b91c1c" : "#002f76", color: "white", fontSize: "13px", fontWeight: "700", boxShadow: "0 8px 24px rgba(0,0,0,0.25)", whiteSpace: "nowrap" }}>
          {toast.type === "error" ? "❌ " : "✅ "}{toast.msg}
        </div>
      )}

      {/* ── Stats Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "24px" }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: "white", borderRadius: "20px", padding: "20px 24px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: s.color, lineHeight: 1 }}>{loading ? "—" : s.value}</div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "3px" }}>{s.label}</div>
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
                padding: "8px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: "700",
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
            placeholder="Search name, ref, or type..."
            style={{ width: "100%", paddingLeft: "36px", paddingRight: "12px", paddingTop: "10px", paddingBottom: "10px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", fontWeight: "500", color: "#334155", outline: "none", background: "#f8faff", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>

        {view === "current" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {FILTERS.map(f => {
              const active = activeFilter === f.id;
              const bgMap: Record<string, string> = { pending: "#fffbeb", verified: "#f0fdf4", rejected: "#fef2f2" };
              const colorMap: Record<string, string> = { pending: "#b45309", verified: "#15803d", rejected: "#b91c1c" };
              return (
                <button key={f.id} className="filter-pill" onClick={() => setActiveFilter(f.id)} style={{ padding: "8px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: active ? "none" : "1.5px solid #e2e8f0", background: active ? (bgMap[f.id] || "#eff6ff") : "white", color: active ? (colorMap[f.id] || "#0050d5") : "#64748b", boxShadow: active ? "0 2px 8px rgba(0,0,0,0.08)" : "none" }}>
                  {f.label}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ marginLeft: "auto", fontSize: "12px", fontWeight: "600", color: "#94a3b8", flexShrink: 0 }}>
          {loading
            ? "Loading…"
            : view === "current"
              ? `${filtered.length} of ${allPayments.length} payments`
              : `${renewalRows.length} of ${renewalRowsAll.length} families`}
        </div>
      </div>

      {/* ── Content ── */}
      {view === "current" ? (
        loading ? (
          <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", color: "#94a3b8", fontSize: "15px", fontWeight: "600", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
            <div>Loading payments…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", border: "2px dashed #e2e8f0" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>💳</div>
            <div style={{ fontWeight: "800", color: "#002f76", fontSize: "18px", marginBottom: "6px" }}>No payments found</div>
            <div style={{ color: "#94a3b8", fontSize: "14px" }}>Try adjusting your search or filter.</div>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,47,118,0.06)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr 1.2fr 1.2fr 1fr", padding: "12px 24px", background: "#f8faff", borderBottom: "1px solid #e8efff" }}>
              {["Parent / Guardian", "Payment Details", "Date & Ref", "Status", "Actions"].map((h, i) => (
                <div key={i} style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", textAlign: h === "Actions" ? "right" : "left" }}>{h}</div>
              ))}
            </div>

            {filtered.map(({ uid, acc, payment, type }, idx) => {
              const avatarGrad = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const status = getStatus(payment);
              const statusStyle = {
                verified: { bg: "#f0fdf4", color: "#15803d", label: "VERIFIED" },
                rejected: { bg: "#fef2f2", color: "#b91c1c", label: "REJECTED" },
                pending: { bg: "#fffbeb", color: "#b45309", label: "PENDING" },
              }[status];

              return (
                <m.div
                  key={`${uid}-${payment.id}-${idx}`}
                  className="pay-row"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.025 }}
                  onClick={() => openDetail({ uid, acc, payment, type })}
                  style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr 1.2fr 1.2fr 1fr", padding: "15px 24px", borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", background: "white", cursor: "pointer" }}
                >
                  {/* Parent col */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: avatarGrad, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "13px", fontWeight: "800", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                      {getInitials(acc.fullName || acc.email || "?")}
                    </div>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "14px", color: "#002f76", lineHeight: 1.2 }}>
                        {acc.fullName || acc.email}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                        {acc.childName ? `${acc.childName} · ` : ""}{type === "session" ? "Virtual Session" : "Registration"}
                      </div>
                    </div>
                  </div>

                  {/* Amount col */}
                  <div>
                    <div style={{ fontWeight: "800", fontSize: "15px", color: "#334155" }}>
                      {fmtCurrency(payment.amountPaid)}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px", fontWeight: "600", textTransform: "uppercase" }}>
                      via {payment.paymentMethod || "—"}
                    </div>
                  </div>

                  {/* Date/Ref col */}
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "12px", color: "#334155" }}>
                      {new Date(payment.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px", fontFamily: "monospace" }}>
                      {payment.referenceNumber ? `Ref: ${payment.referenceNumber}` : "No Ref"}
                    </div>
                  </div>

                  {/* Status col */}
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", background: statusStyle.bg, color: statusStyle.color, borderRadius: "20px", fontSize: "11px", fontWeight: "800" }}>
                      {statusStyle.label}
                    </span>
                  </div>

                  {/* Actions col */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {(
                      <button onClick={(e) => { e.stopPropagation(); openDetail({ uid, acc, payment, type }); }} style={{ padding: "6px", borderRadius: "8px", background: "#eff6ff", color: "#0050d5", fontSize: "14px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Payment details">
                        🧾
                      </button>
                    )}
                    {status === "pending" && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); handleAction(uid, type === "session" ? payment.id : null, "verify", type); }} disabled={!!actioning} style={{ padding: "6px 12px", borderRadius: "8px", background: "#10b981", color: "white", fontSize: "12px", fontWeight: "700", border: "none", cursor: "pointer" }}>
                          ✓ Verify
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleAction(uid, type === "session" ? payment.id : null, "reject", type); }} disabled={!!actioning} style={{ padding: "6px 12px", borderRadius: "8px", background: "#ef4444", color: "white", fontSize: "12px", fontWeight: "700", border: "none", cursor: "pointer" }}>
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </m.div>
              );
            })}
          </div>
        )
      ) : loading ? (
        <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", color: "#94a3b8", fontSize: "15px", fontWeight: "600", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          <div>Loading renewals…</div>
        </div>
      ) : (
        /* ── Next Adventure: renewals + balances ── */
        <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,47,118,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "14px 24px", fontSize: "12px", fontWeight: "700", color: "#64748b", borderBottom: "1px solid #e8efff" }}>
            Renewed {nextStats.renewed} of {nextStats.total} families
          </div>
          <div style={{ display: "grid", gridTemplateColumns: RENEWAL_GRID, padding: "12px 24px", background: "#f8faff", borderBottom: "1px solid #e8efff" }}>
            {["Parent / Child", "Renewal", "Downpayment", "Paid / Fee", "Balance", "Actions"].map((h) => (
              <div key={h} style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", textAlign: h === "Actions" ? "right" : "left" }}>{h}</div>
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
                    <div style={{ fontWeight: "800", fontSize: "14px", color: "#002f76", lineHeight: 1.2 }}>{acc.fullName || acc.email}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                      {acc.childName ? `${acc.childName} · ` : ""}{acc.program || "—"}
                    </div>
                  </div>

                  <div>
                    <span style={{ display: "inline-flex", padding: "4px 10px", background: b.bg, color: b.color, borderRadius: "20px", fontSize: "11px", fontWeight: "800" }}>
                      {b.label}
                    </span>
                  </div>

                  <div>
                    {dp?.submitted ? (
                      <>
                        <div style={{ fontWeight: "800", fontSize: "14px", color: "#334155" }}>{fmtCurrency(dp.amountPaid)}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                          {new Date(dp.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {dp.paymentMethod ? ` · ${dp.paymentMethod.toUpperCase()}` : ""}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: "12px", color: "#94a3b8" }}>—</div>
                    )}
                  </div>

                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                    {fmtCurrency(paid)} / {fee > 0 ? fmtCurrency(fee) : "set fee"}
                  </div>

                  <div style={{ fontWeight: "800", fontSize: "15px", color: balance === 0 ? "#15803d" : "#b45309" }}>
                    {balance === null ? "—" : fmtCurrency(balance)}
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {dp?.submitted && (
                      <button onClick={() => openDetail({ uid: acc.id, acc, payment: dpToPayment(acc), type: "downpayment" })} style={{ padding: "6px", borderRadius: "8px", background: "#eff6ff", color: "#0050d5", fontSize: "14px", border: "none", cursor: "pointer" }} title="Payment details">
                        🧾
                      </button>
                    )}
                    {dpPending && (
                      <>
                        <button onClick={() => handleAction(acc.id, null, "verify", "downpayment")} disabled={!!actioning} style={{ padding: "6px 12px", borderRadius: "8px", background: "#10b981", color: "white", fontSize: "12px", fontWeight: "700", border: "none", cursor: "pointer" }}>
                          ✓ Verify
                        </button>
                        <button onClick={() => handleAction(acc.id, null, "reject", "downpayment")} disabled={!!actioning} style={{ padding: "6px 12px", borderRadius: "8px", background: "#ef4444", color: "white", fontSize: "12px", fontWeight: "700", border: "none", cursor: "pointer" }}>
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
