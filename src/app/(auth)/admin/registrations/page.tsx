"use client";

import { useEffect, useState, useRef } from "react";
import useSWR from "swr";
import { m, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAuth } from "@/lib/auth-context";
import { PROGRAM_SLOTS, UNIFORM_KIT } from "@/data/landing";

type Status = "pending" | "approved" | "active" | "rejected" | "early-bird" | "expired" | "reserved";

interface Registration {
  id: string;
  status: Status;
  program: string;
  classTime: string;
  adventureNumber?: number | null;
  period?: string;
  adventureStartDate?: string | null;
  parentInfo: { name: string; email: string; phone: string; relationship: string; facebook?: string };
  childInfo: { firstName: string; lastName: string; nickname?: string; dateOfBirth: string; gender: string; allergies?: string; specialNeeds?: string; favoriteSong?: string; favoriteColor?: string; favoriteCharacter?: string; healthProfile?: string; };
  emergencyContact: { name: string; phone: string; relationship: string };
  paymentMethod: string;
  paymentType?: string;
  amountDue?: number;
  amountPaid?: number;
  creditBalance?: number;
  previousAdventureBalance?: number;
  referenceNumber?: string;
  receiptUrl: string;
  signatureUrl?: string;
  photoConsent?: string;
  uniformOrdered: boolean;
  welcomeKitOrdered?: boolean;
  isPioneer?: boolean;
  customRate?: number | null;
  isNewFamily?: boolean;
  submittedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  confirmationEmailSent?: boolean;
  earlyBirdAt?: string;
  earlyBirdBy?: string;
  paymentDeadline?: string;
  reservedUntil?: string;
  paymentPortalOpen?: boolean;
  paymentPortalOpenedAt?: string;
  selfDeclaredPreviousAdventure?: boolean;
  detectedPreviousAdventure?: number;
}

const PROGRAM_NAMES: Record<string, string> = {
  "curious-explorer": "Curious Explorer",
  "everyday-curious": "Everyday Explorer",
  "creative-explorer": "Creative Explorer",
  "brave-explorer": "Brave Explorer",
  "ballet": "Ballet",
};

const PROGRAM_ACCENTS: Record<string, string> = {
  "curious-explorer": "#FFC107",
  "everyday-curious": "#22c55e",
  "creative-explorer": "#0033A0",
  "brave-explorer": "#1a2e6b",
  "ballet": "#E91E8C",
};

function getProgramLabel(programId: string): string {
  return PROGRAM_NAMES[programId] || PROGRAM_SLOTS[programId as keyof typeof PROGRAM_SLOTS]?.name || programId.replace(/-/g, " ");
}

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  active: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  "early-bird": "bg-orange-100 text-orange-700",
  expired: "bg-rose-100 text-rose-700",
  reserved: "bg-blue-100 text-blue-700",
};

const STATUS_LABELS: Record<Status, string> = {
  pending: "⏳ Pending",
  approved: "✅ Approved",
  active: "✅ Active Enrollment",
  rejected: "❌ Rejected",
  "early-bird": "🐣 Early Bird",
  expired: "⏰ Expired Slot",
  reserved: "🔒 Slot Reserved",
};

function isRegExpired(r: Registration): boolean {
  if (r.status === "expired") return true;
  const now = new Date();
  if ((r.status === "reserved" || r.status === "pending") && r.reservedUntil && new Date(r.reservedUntil) < now) return true;
  if (r.status === "early-bird" && r.paymentDeadline && new Date(r.paymentDeadline) < now) return true;
  return false;
}

function isTestRegistration(r: Registration): boolean {
  const email = (r.parentInfo?.email || "").toLowerCase().trim();
  const name = `${r.parentInfo?.name || ""} ${r.childInfo?.firstName || ""} ${r.childInfo?.lastName || ""}`.toLowerCase();
  return (
    email === "iangelovalmores@gmail.com" ||
    email === "ian.valmores@gmail.com" ||
    name.includes("ian angelo valmores")
  );
}

function getAdventureNumber(registration: Pick<Registration, "adventureNumber" | "period">): number | null {
  const number = Number(registration.adventureNumber);
  if (Number.isInteger(number) && number > 0) return number;
  const match = registration.period?.match(/adventure[-_ ]?(\d+)/i);
  return match ? Number(match[1]) : null;
}

function adventureLabel(registration: Pick<Registration, "adventureNumber" | "period">): string {
  const number = getAdventureNumber(registration);
  return number ? `Adventure ${number}` : "Cycle not tagged";
}

function formatAdventureDate(value?: string | null): string | null {
  if (!value) return null;
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getRegistrationTimeline(registration: Registration, registrations: Registration[]): Registration[] {
  const normalizedName = `${registration.childInfo.firstName} ${registration.childInfo.lastName}`.trim().toLowerCase().replace(/\s+/g, " ");
  const normalizedDob = String(registration.childInfo.dateOfBirth || "").slice(0, 10);
  const parentEmail = (registration.parentInfo.email || "").trim().toLowerCase();
  const parentPhone = (registration.parentInfo.phone || "").replace(/\D/g, "");

  return registrations
    .filter((candidate) => {
      if (candidate.id === registration.id) return true;
      const candidateName = `${candidate.childInfo.firstName} ${candidate.childInfo.lastName}`.trim().toLowerCase().replace(/\s+/g, " ");
      if (candidateName !== normalizedName) return false;
      const candidateDob = String(candidate.childInfo.dateOfBirth || "").slice(0, 10);
      if (normalizedDob && candidateDob) return normalizedDob === candidateDob;
      const candidateEmail = (candidate.parentInfo.email || "").trim().toLowerCase();
      const candidatePhone = (candidate.parentInfo.phone || "").replace(/\D/g, "");
      return Boolean((parentEmail && candidateEmail === parentEmail) || (parentPhone && candidatePhone === parentPhone));
    })
    .sort((left, right) => {
      const leftAdventure = getAdventureNumber(left) ?? Number.MAX_SAFE_INTEGER;
      const rightAdventure = getAdventureNumber(right) ?? Number.MAX_SAFE_INTEGER;
      if (leftAdventure !== rightAdventure) return leftAdventure - rightAdventure;
      return new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime();
    });
}

function occupiesAdventureSlot(registration: Registration, now = Date.now()): boolean {
  if (isRegExpired(registration)) return false;
  if (registration.status === "approved" || registration.status === "active") return true;
  if (registration.status !== "reserved" && registration.status !== "pending") return false;
  return Boolean(registration.reservedUntil && new Date(registration.reservedUntil).getTime() > now);
}

function countUniqueChildren(registrations: Registration[]): number {
  const children = new Map<string, Set<string>>();
  let unidentified = 0;
  for (const registration of registrations) {
    const firstName = (registration.childInfo?.firstName || "").trim().normalize("NFKC").toLowerCase();
    const lastName = (registration.childInfo?.lastName || "").trim().normalize("NFKC").toLowerCase();
    const childName = `${firstName} ${lastName}`.trim().replace(/\s+/g, " ");
    if (!childName) {
      unidentified += 1;
      continue;
    }
    const dates = children.get(childName) || new Set<string>();
    const dateOfBirth = String(registration.childInfo?.dateOfBirth || "").slice(0, 10);
    if (dateOfBirth) dates.add(dateOfBirth);
    children.set(childName, dates);
  }
  return unidentified + [...children.values()].reduce((count, dates) => count + Math.max(1, dates.size), 0);
}

const SUMMARY_HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeSummaryHtml(value: unknown): string {
  return String(value ?? "—").replace(/[&<>"']/g, (character) => SUMMARY_HTML_ENTITIES[character]);
}

type FilterTab = "all" | Status | "reserved" | "leads" | "expired";

interface Lead {
  id: string;
  status: "in-progress" | "converted" | "contacted" | "archived";
  step: number;
  stepName: string;
  source?: string;
  childInfo?: {
    firstName?: string;
    lastName?: string;
    nickname?: string;
    dateOfBirth?: string;
    gender?: string;
    allergies?: string;
    specialNeeds?: string;
    favoriteSong?: string;
    favoriteColor?: string;
    favoriteCharacter?: string;
    healthProfile?: string;
  };
  parentInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    relationship?: string;
    facebook?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  selectedProgram?: string;
  selectedClass?: string;
  promoCode?: string;
  photoConsent?: string;
  hasSignature?: boolean;
  history?: Array<{
    step: number;
    stepName: string;
    enteredAt: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
  lastActiveAt?: string;
  notes?: string;
  registrationId?: string;
  followUpEmails?: Array<{
    to: string;
    subject: string;
    step: number;
    stepLabel: string;
    sentAt: string;
    sentBy?: string;
  }>;
}

const LEAD_STEP_LABELS: Record<number, { label: string; badge: string; color: string; bg: string }> = {
  0: { label: "Step 0: Parent & Child Details", badge: "Details", color: "text-amber-800", bg: "bg-amber-100" },
  1: { label: "Step 1: Program & Session Choice", badge: "Program & Session", color: "text-blue-800", bg: "bg-blue-100" },
  2: { label: "Step 2: Consents & Waivers", badge: "Consents & Waivers", color: "text-purple-800", bg: "bg-purple-100" },
  3: { label: "Step 3: Review & Payment", badge: "Review & Payment", color: "text-rose-800", bg: "bg-rose-100" },
};

const LEAD_STATUS_STYLES: Record<string, string> = {
  "in-progress": "bg-amber-100 text-amber-700",
  contacted: "bg-blue-100 text-blue-700",
  converted: "bg-green-100 text-green-700",
  archived: "bg-slate-100 text-slate-600",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  "in-progress": "⏳ In-Progress",
  contacted: "📞 Followed Up",
  converted: "🎉 Converted",
  archived: "📦 Archived",
};

function formatWhatsAppUrl(phone?: string, parentName?: string, childName?: string) {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("09")) {
    clean = "63" + clean.substring(1);
  } else if (clean.startsWith("9") && clean.length === 10) {
    clean = "63" + clean;
  }
  const greeting = parentName ? `Hi ${parentName}!` : "Hi!";
  const childMention = childName ? ` for ${childName}` : "";
  const msg = encodeURIComponent(`${greeting} We noticed you started registering${childMention} at Merry Explorers Learning Center! Would you like any assistance completing your registration or choosing a class schedule? We're here to help!`);
  return `https://wa.me/${clean}?text=${msg}`;
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "blue" | "red" }) {
  const highlightCls = highlight === "green" ? "text-green-600 bg-green-50 rounded-lg px-2 py-0.5"
    : highlight === "blue" ? "text-[#0033A0] bg-[#0033A0]/8 rounded-lg px-2 py-0.5"
    : highlight === "red" ? "text-red-600 bg-red-50 rounded-lg px-2 py-0.5"
    : "text-[#1e293b]";
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-slate-100 last:border-0">
      <span className="text-[12px] font-semibold text-[#94a3b8] shrink-0 pt-0.5 w-[38%]">{label}</span>
      <span className={`text-[13px] font-bold text-right break-all min-w-0 ${highlightCls}`}>{value}</span>
    </div>
  );
}

function SectionCard({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-[#f8fafc]">
        <span className="text-base">{emoji}</span>
        <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#64748b]">{title}</h3>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

function DetailModal({
  reg, allRegistrations, onRefreshRegistrations, onClose, onApprove, onReject, onEarlyBird, onOpenPayment, onSavePreviousAdventureBalance, isProcessing,
}: {
  reg: Registration;
  allRegistrations: Registration[];
  onRefreshRegistrations: () => Promise<Registration[]>;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onEarlyBird: (id: string, deadline: string) => void;
  onOpenPayment: (id: string) => void;
  onSavePreviousAdventureBalance: (id: string, amount: number) => Promise<boolean>;
  isProcessing: boolean;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [earlyBirdMode, setEarlyBirdMode] = useState(false);
  const [reason, setReason] = useState("");
  const [earlyBirdDeadline, setEarlyBirdDeadline] = useState("");
  const [editingPreviousBalance, setEditingPreviousBalance] = useState(false);
  const [previousBalanceInput, setPreviousBalanceInput] = useState(typeof reg.previousAdventureBalance === "number" ? String(reg.previousAdventureBalance) : "");
  const [savingPreviousBalance, setSavingPreviousBalance] = useState(false);
  const accent = PROGRAM_ACCENTS[reg.program] || "#0033A0";
  const adventureTimeline = getRegistrationTimeline(reg, allRegistrations);
  const isEarlyBird = reg.status === "early-bird";
  const isPending = reg.status === "pending";
  const isReserved = (reg as any).status === "reserved" || (reg as any).status === "expired";
  const hasAdventureCycle = !["ballet", "virtual-session", "saturday-playdate"].includes(reg.program);
  
  // Calculate true remaining balance for the whole program
  const programDetails = PROGRAM_SLOTS[reg.program as keyof typeof PROGRAM_SLOTS];
  const isPioneer = Boolean(reg.isPioneer);
  const effectiveProgramRate = reg.customRate || (isPioneer && reg.program === "creative-explorer" ? 4820 : (isPioneer && reg.program === "curious-explorer" ? 4295 : (programDetails ? programDetails.rate : 0)));
  const totalCost = effectiveProgramRate > 0 ? effectiveProgramRate + (!isPioneer && reg.uniformOrdered ? UNIFORM_KIT.price : 0) : null;
  const totalPaid = Number(reg.amountPaid) || 0;
  const prevAdventureBal = typeof reg.previousAdventureBalance === "number" ? reg.previousAdventureBalance : 0;
  // If there is an unpaid balance from previous adventure, deduct it from the receipt payment
  const paidToPrevious = Math.min(totalPaid, prevAdventureBal);
  // Net payment applied to current session (e.g. 3,786 - 1,786 = 2,000)
  const appliedToCurrentSession = Math.max(0, totalPaid - paidToPrevious);
  // Remaining session balance (e.g. 4,295 - 2,000 = 2,295)
  const sessionRemaining = totalCost !== null ? Math.max(0, totalCost - appliedToCurrentSession) : null;
  const remainingPrevious = Math.max(0, prevAdventureBal - paidToPrevious);
  const totalRemainingBalance = (sessionRemaining ?? 0) + remainingPrevious;
  const requiredDownpayment = effectiveProgramRate > 0 ? Math.round(effectiveProgramRate * 0.6) : (programDetails ? programDetails.downpayment : 0);

  async function handleGenerateSummary() {
    const summaryWindow = window.open("", "_blank");
    if (!summaryWindow) {
      window.alert("Please allow pop-ups to open the registration summary.");
      return;
    }
    summaryWindow.opener = null;
    summaryWindow.document.write("<p style='font-family:Arial,sans-serif;padding:24px;color:#334155'>Preparing the latest registration and Adventure summary…</p>");
    const latestRegistrations = await onRefreshRegistrations();
    const reportRegistrations = latestRegistrations.length > 0 ? latestRegistrations : allRegistrations;
    const reportTimeline = getRegistrationTimeline(reg, reportRegistrations);

    const schedule = PROGRAM_SLOTS[reg.program as keyof typeof PROGRAM_SLOTS];
    const chosenSession = schedule?.classes.find((session) => session.name === reg.classTime);
    const row = (label: string, value: unknown) => `<tr><th>${escapeSummaryHtml(label)}</th><td>${escapeSummaryHtml(value)}</td></tr>`;
    const submittedDate = reg.submittedAt
      ? new Date(reg.submittedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
      : "—";
    const money = (value: number | null | undefined) => typeof value === "number"
      ? `₱${value.toLocaleString("en-PH")}`
      : "—";
    const studentName = `${reg.childInfo.firstName || ""} ${reg.childInfo.lastName || ""}`.trim();
    const currentRemaining = sessionRemaining;
    const summaryPrevBal = remainingPrevious;
    const summaryTotalBal = totalRemainingBalance;
    const timelineSummaryRows = reportTimeline.map((entry) => {
      const entryProgram = PROGRAM_SLOTS[entry.program as keyof typeof PROGRAM_SLOTS];
      const entrySession = entryProgram?.classes.find((session) => session.name === entry.classTime);
      const entryStatus = isRegExpired(entry)
        ? "Reservation expired"
        : entry.status === "reserved" || entry.status === "pending"
          ? entry.receiptUrl ? "Receipt submitted · awaiting review" : "Reserved · payment pending"
          : STATUS_LABELS[entry.status] || entry.status;
      const startDate = formatAdventureDate(entry.adventureStartDate);
      const timing = `${entryProgram?.schedule ? `${entryProgram.schedule} · ` : ""}${entry.classTime}${entrySession?.time ? ` · ${entrySession.time}` : ""}`;
      return row(`${adventureLabel(entry)} · ${getProgramLabel(entry.program)}`, `${timing} · ${entryStatus}${startDate ? ` · Starts ${startDate}` : ""}`);
    }).join("");
    const targetAdventure = getAdventureNumber(reg);
    const currentCycleRegistrations = reportRegistrations.filter((entry) =>
      getAdventureNumber(entry) === targetAdventure && !isTestRegistration(entry) && occupiesAdventureSlot(entry)
    );
    const capacityPrograms = ["curious-explorer", "everyday-curious", "creative-explorer", "brave-explorer"] as const;
    const availabilityRows = capacityPrograms.flatMap((programId) => {
      const program = PROGRAM_SLOTS[programId];
      return program.classes.map((session) => {
        const classAlias = session.name.includes("Session")
          ? session.name.replace("Session", "Class")
          : session.name.replace("Class", "Session");
        const inSession = currentCycleRegistrations.filter((entry) =>
          entry.program === programId && (entry.classTime === session.name || entry.classTime === classAlias)
        );
        const unpaidHolds = inSession.filter((entry) =>
          (entry.status === "reserved" || entry.status === "pending") && !entry.receiptUrl && !(Number(entry.amountPaid) > 0)
        );
        const awaitingReview = inSession.filter((entry) =>
          (entry.status === "reserved" || entry.status === "pending") && Boolean(entry.receiptUrl || Number(entry.amountPaid) > 0)
        );
        const taken = countUniqueChildren(inSession);
        const schedule = `${program.schedule} · ${session.name} · ${session.time}`;
        const availability = `${taken}/${session.maxSlots} occupied · ${Math.max(0, session.maxSlots - taken)} slots left · ${countUniqueChildren(unpaidHolds)} unpaid holds · ${countUniqueChildren(awaitingReview)} awaiting payment review`;
        return row(schedule, availability);
      });
    }).join("");
    const availabilitySection = hasAdventureCycle
      ? `<section class="section"><h2>Session Availability · ${escapeSummaryHtml(adventureLabel(reg))}</h2><p class="muted">Counts reflect this Adventure’s active approved registrations and unexpired reservations, including unpaid holds, as of report generation.</p><table class="table">${availabilityRows}</table></section>`
      : "";
    const summaryHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Registration Summary - ${escapeSummaryHtml(studentName)}</title>
<style>
  *{box-sizing:border-box}body{margin:0;padding:28px;background:#f1f6ff;color:#17366b;font-family:Arial,Helvetica,sans-serif}.page{max-width:800px;margin:0 auto;background:#fff;border:1px solid #d9e6f7;border-radius:18px;overflow:hidden}.brand{background:#ffd84d;padding:22px 30px;color:#002f76;font-weight:800;letter-spacing:.04em}.content{padding:28px 32px}.title{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.title h1{margin:0 0 6px;color:#002f76;font-size:25px}.muted{color:#64748b;font-size:13px}.badge{display:inline-block;padding:7px 12px;border-radius:20px;background:#eef4ff;color:#0033a0;font-size:12px;font-weight:800}.section{margin-top:24px}.section h2{padding-bottom:8px;border-bottom:2px solid #e6eef9;color:#0033a0;font-size:14px;text-transform:uppercase;letter-spacing:.06em}.table{width:100%;border-collapse:collapse}.table th,.table td{padding:10px 12px;border-bottom:1px solid #e9eef5;text-align:left;vertical-align:top;font-size:13px;line-height:1.45}.table th{width:34%;color:#64748b;font-weight:700}.table td{color:#17366b;font-weight:600}.notes{margin-top:22px;padding:14px 16px;border-radius:12px;background:#f7faff;color:#526b8d;font-size:12px;line-height:1.55}.actions{max-width:800px;margin:16px auto;display:flex;justify-content:flex-end;gap:10px}.actions button{border:0;border-radius:10px;padding:11px 16px;background:#0033a0;color:#fff;font-weight:700;cursor:pointer}.actions .close{background:#e7eef8;color:#334155}@media print{body{padding:0;background:#fff}.page{max-width:none;border:0;border-radius:0}.actions{display:none}.content{padding:22px 26px}}
</style></head><body>
<div class="actions"><button class="close" onclick="window.close()">Close</button><button onclick="window.print()">Print / Save as PDF</button></div>
<main class="page"><div class="brand">MERRY EXPLORERS PLAYGROUP LEARNING CENTER</div><div class="content">
  <div class="title"><div><h1>Registration Summary</h1><div class="muted">Prepared ${escapeSummaryHtml(new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }))}</div></div><span class="badge">${escapeSummaryHtml(STATUS_LABELS[reg.status] || reg.status)}</span></div>
  <section class="section"><h2>Explorer & Session</h2><table class="table">${row("Student", studentName)}${row("Adventure", adventureLabel(reg))}${row("Adventure start date", formatAdventureDate(reg.adventureStartDate) || "Not scheduled")}${row("Nickname", reg.childInfo.nickname || "—")}${row("Date of Birth", reg.childInfo.dateOfBirth)}${row("Gender", reg.childInfo.gender)}${row("Program", getProgramLabel(reg.program))}${row("Session days", schedule?.schedule || "—")}${row("Session", reg.classTime)}${row("Session time", chosenSession?.time || "—")}${row("Registration date", submittedDate)}${row("Registration reference", reg.id)}</table></section>
  <section class="section"><h2>Adventure Timeline</h2><table class="table">${timelineSummaryRows || row("History", "No other registrations found for this Explorer.")}</table></section>
  ${availabilitySection}
  <section class="section"><h2>Parent / Guardian</h2><table class="table">${row("Name", reg.parentInfo.name)}${row("Relationship", reg.parentInfo.relationship)}${row("Email", reg.parentInfo.email)}${row("Phone", reg.parentInfo.phone)}${reg.parentInfo.facebook ? row("Facebook", reg.parentInfo.facebook) : ""}</table></section>
  <section class="section"><h2>Emergency Contact</h2><table class="table">${row("Name", reg.emergencyContact?.name)}${row("Relationship", reg.emergencyContact?.relationship)}${row("Phone", reg.emergencyContact?.phone)}</table></section>
  <section class="section"><h2>Payment Summary</h2><table class="table">${row("Program fee", `${money(effectiveProgramRate)}${isPioneer ? " (Pioneer Family Rate)" : ""}`)}${row("Initial amount due", money(reg.amountDue || requiredDownpayment))}${row("Amount paid (receipt)", money(totalPaid))}${prevAdventureBal > 0 ? row("Deducted for previous adventure", `-${money(paidToPrevious)} (Adv 1 cleared)`) : ""}${prevAdventureBal > 0 ? row("Applied to current session", money(appliedToCurrentSession)) : ""}${row("Remaining balance", money(totalRemainingBalance))}${row("Payment method", reg.paymentMethod?.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()) || "—")}${row("Reference number", reg.referenceNumber || "—")}</table></section>
  <section class="section"><h2>Additional Information</h2><table class="table">${row("Uniform kit", reg.uniformOrdered ? "Ordered" : "Not ordered")}${row("Photo consent", reg.photoConsent === "yes" ? "Allowed" : "Not allowed")}${row("Health profile", reg.childInfo.healthProfile || "None noted")}${row("Allergies", reg.childInfo.allergies || "None noted")}${row("Special needs", reg.childInfo.specialNeeds || "None noted")}</table></section>
  <div class="notes">This summary is for registration reference. Previous adventure balance and current session balance are shown separately.</div>
</div></main></body></html>`;

    summaryWindow.document.open();
    summaryWindow.document.write(summaryHtml);
    summaryWindow.document.close();
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <m.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet — slides up from bottom on mobile, centers on desktop */}
      <m.div
        key="modal"
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 40 }}
        className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-6 pointer-events-none"
      >
        <div 
          className="pointer-events-auto w-full md:max-w-xl md:rounded-[2rem] bg-[#f4f7fb] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] md:shadow-[0_30px_80px_rgba(0,0,0,0.2)] flex flex-col max-h-[92dvh] md:max-h-[88vh] rounded-t-[2rem] border-t-[8px] overflow-hidden"
          style={{ borderColor: accent }}
        >

          {/* Drag handle (mobile only) */}
          <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-slate-300" />
          </div>

          {/* ── Hero Header ── */}
          <div className="relative flex items-start gap-4 border-b border-slate-100 bg-white px-6 py-6 shrink-0 rounded-t-[1.8rem]">
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>

            {/* Avatar */}
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm border border-slate-100 text-[26px]"
              style={{ backgroundColor: `${accent}15` }}
            >
              {reg.program === "ballet" ? "🩰" : reg.program === "brave-explorer" ? "🏆" : reg.program === "creative-explorer" ? "🚀" : "🧱"}
            </div>

            <div className="flex-1 pr-8">
              <h2 className="text-[20px] font-extrabold text-[#002f76] leading-tight">
                {reg.childInfo.firstName} {reg.childInfo.lastName}
              </h2>
              <div className="mt-1 flex items-center gap-2 text-[13px] font-semibold text-[#64748b]">
                <span style={{ color: accent }}>{getProgramLabel(reg.program)}</span>
                <span>•</span>
                <span>{reg.classTime}</span>
              </div>

              {/* Status + submitted */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold shadow-sm ${STATUS_STYLES[reg.status]}`}>
                  {STATUS_LABELS[reg.status]}
                </span>
                <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[10px] font-extrabold text-[#0033A0]">
                  {adventureLabel(reg)}
                </span>
                {isPioneer && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800 shadow-sm">
                    ⭐ Pioneer Family
                  </span>
                )}
                {reg.selfDeclaredPreviousAdventure && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-300 px-2.5 py-0.5 text-[11px] font-extrabold text-blue-800 shadow-sm">
                    🎒 Continuing Student {reg.detectedPreviousAdventure ? `(Adventure ${reg.detectedPreviousAdventure})` : "(Self-Declared)"}
                  </span>
                )}
                {isTestRegistration(reg) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-700 shadow-sm">
                    🧪 Test Account
                  </span>
                )}
                <span className="text-[11px] text-[#94a3b8] font-medium">
                  Submitted {new Date(reg.submittedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-extrabold text-[#0033A0] hover:bg-blue-100 transition-colors"
                >
                  🧾 Student Summary
                </button>
              </div>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

            {/* Registration history across Adventures */}
            <SectionCard emoji="🗺️" title="Adventure Timeline">
              <div className="py-3">
                <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
                  Each card is a separate registration. Adventures are ordered by cycle, with status and session details shown for each one.
                </p>
                <div className="relative space-y-0">
                  {adventureTimeline.map((entry, index) => {
                    const adventure = getAdventureNumber(entry);
                    const entryProgram = PROGRAM_SLOTS[entry.program as keyof typeof PROGRAM_SLOTS];
                    const entrySession = entryProgram?.classes.find((session) => session.name === entry.classTime);
                    const isExpired = isRegExpired(entry);
                    const paymentState = isExpired
                      ? "Reservation expired"
                      : entry.status === "reserved" || entry.status === "pending"
                        ? entry.receiptUrl ? "Receipt submitted · awaiting review" : "Reserved · payment pending"
                        : STATUS_LABELS[entry.status] || entry.status;
                    const startDate = formatAdventureDate(entry.adventureStartDate);
                    const registrationDate = entry.submittedAt
                      ? new Date(entry.submittedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
                      : "Date unavailable";

                    return (
                      <div key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                        <div className="flex w-5 shrink-0 flex-col items-center">
                          <span className={`z-10 mt-1 h-3 w-3 rounded-full border-2 ${entry.id === reg.id ? "border-[#0033A0] bg-[#0033A0]" : "border-blue-300 bg-white"}`} />
                          {index < adventureTimeline.length - 1 && <span className="absolute bottom-0 left-[9px] top-4 w-px bg-blue-100" />}
                        </div>
                        <div className={`min-w-0 flex-1 rounded-xl border p-3 ${entry.id === reg.id ? "border-blue-200 bg-blue-50/70" : "border-slate-100 bg-slate-50/70"}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-[12px] font-extrabold text-[#002f76]">
                                {adventure ? `Adventure ${adventure}` : "Adventure not tagged"} · {getProgramLabel(entry.program)}
                              </p>
                              <p className="mt-0.5 text-[11px] font-semibold text-slate-600">
                                {entryProgram?.schedule ? `${entryProgram.schedule} · ` : ""}{entry.classTime}{entrySession?.time ? ` · ${entrySession.time}` : ""}
                              </p>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${isExpired ? STATUS_STYLES.expired : STATUS_STYLES[entry.status] || "bg-slate-100 text-slate-600"}`}>
                              {paymentState}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                            <span>{startDate ? `Starts ${startDate}` : `Registered ${registrationDate}`}</span>
                            {startDate && <span>Registered {registrationDate}</span>}
                            {typeof entry.amountPaid === "number" && entry.amountPaid > 0 && <span>Paid ₱{entry.amountPaid.toLocaleString("en-PH")}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionCard>

            {/* Receipt */}
            {reg.receiptUrl && (
              <SectionCard emoji="🧾" title="Payment Receipt">
                <a href={reg.receiptUrl} target="_blank" rel="noreferrer" className="group relative my-3 block overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <div className="relative aspect-[4/3] w-full">
                    <Image src={reg.receiptUrl} alt="Receipt" fill className="object-contain" sizes="500px" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity rounded-xl">
                    <span className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12px] font-bold text-[#002f76] shadow-lg">
                      🔍 View Full Size
                    </span>
                  </div>
                </a>
                <InfoRow label="Payment Method" value={reg.paymentMethod?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "—"} />
              </SectionCard>
            )}

            {/* Payment details */}
            <SectionCard emoji="💳" title="Payment Details">
              <InfoRow 
                label="Payment Type" 
                value={reg.paymentType === "full" ? "Full Payment ✓" : "Downpayment"} 
                highlight={reg.paymentType === "full" ? "green" : "blue"} 
              />
              <InfoRow 
                label="Program Rate" 
                value={effectiveProgramRate > 0 ? `₱${effectiveProgramRate.toLocaleString()}${isPioneer ? " (Pioneer Family Rate)" : ""}` : "—"} 
              />
              <InfoRow 
                label={reg.paymentType === "full" ? "Amount Due" : "Required Downpayment"} 
                value={
                  reg.amountDue && reg.amountDue > 0
                    ? `₱${reg.amountDue.toLocaleString()}` 
                    : (requiredDownpayment > 0 ? `₱${requiredDownpayment.toLocaleString()} (60% Downpayment)` : "—")
                } 
              />
              <InfoRow 
                label="Amount Paid (Receipt)" 
                value={totalPaid ? `₱${totalPaid.toLocaleString()}` : "—"} 
                highlight={totalCost !== null && appliedToCurrentSession >= totalCost ? "green" : undefined} 
              />
              {prevAdventureBal > 0 && (
                <>
                  <InfoRow 
                    label="Deducted for Previous Adventure" 
                    value={`-₱${paidToPrevious.toLocaleString()} (Adv 1 cleared)`} 
                  />
                  <InfoRow 
                    label="Applied to Current Session" 
                    value={`₱${appliedToCurrentSession.toLocaleString()}`} 
                    highlight="blue" 
                  />
                </>
              )}
              {reg.paymentType !== "full" && sessionRemaining !== null && (
                <InfoRow 
                  label="Remaining Balance" 
                  value={`₱${totalRemainingBalance.toLocaleString()}`} 
                  highlight="red" 
                />
              )}
              {totalCost !== null && appliedToCurrentSession > totalCost && (
                <InfoRow label="Credit Balance (Overpayment)" value={`+₱${(appliedToCurrentSession - totalCost).toLocaleString()}`} highlight="green" />
              )}
              <InfoRow label="Reference No." value={reg.referenceNumber || "—"} />
            </SectionCard>

            {hasAdventureCycle && <SectionCard emoji="🧾" title="Previous Adventure Balance">
              <p className="py-2.5 text-xs leading-relaxed text-slate-500">
                {prevAdventureBal > 0 && remainingPrevious === 0 ? (
                  <span className="text-emerald-700 font-semibold">
                    ✓ The ₱{prevAdventureBal.toLocaleString()} previous balance was fully settled by this registration&apos;s payment. It is cleared and will not carry over to future Adventures.
                  </span>
                ) : prevAdventureBal > 0 && paidToPrevious > 0 ? (
                  <span className="text-amber-700 font-semibold">
                    ₱{paidToPrevious.toLocaleString()} was settled from this payment. The remaining ₱{remainingPrevious.toLocaleString()} remains unpaid.
                  </span>
                ) : (
                  "Unpaid balance carried over from a previous Adventure is tracked separately and deducted first from this registration’s payment."
                )}
              </p>
              {!editingPreviousBalance ? (
                <div className="space-y-2 border-t border-slate-100 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] font-semibold text-[#94a3b8]">Carried-over balance</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-bold text-slate-700">
                        {typeof reg.previousAdventureBalance === "number" ? `₱${Number(reg.previousAdventureBalance).toLocaleString("en-PH")}` : "Not set"}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setPreviousBalanceInput(typeof reg.previousAdventureBalance === "number" ? String(reg.previousAdventureBalance) : ""); setEditingPreviousBalance(true); }}
                        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#0033A0] hover:bg-blue-100"
                      >
                        Set amount
                      </button>
                    </div>
                  </div>
                  {paidToPrevious > 0 && (
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-[#94a3b8] font-semibold">Deducted from payment</span>
                      <span className="font-bold text-emerald-700">-₱{paidToPrevious.toLocaleString()} (Adv 1 cleared)</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 text-xs pt-1.5 border-t border-slate-100">
                    <span className="text-[#94a3b8] font-semibold">Previous Adventure unpaid</span>
                    <span className={`text-[13px] font-bold ${remainingPrevious === 0 ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md" : "text-red-600"}`}>
                      {remainingPrevious === 0 ? "₱0 (Fully Cleared ✓)" : `₱${remainingPrevious.toLocaleString("en-PH")}`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 border-t border-slate-100 py-3">
                  <label className="block text-xs font-semibold text-slate-600" htmlFor="previous-adventure-balance">
                    Previous Adventure unpaid balance (₱)
                  </label>
                  <input
                    id="previous-adventure-balance"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={previousBalanceInput}
                    onChange={(event) => setPreviousBalanceInput(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400"
                    placeholder="Leave blank if unknown; enter 0 if none"
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingPreviousBalance(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                    <button
                      type="button"
                      disabled={savingPreviousBalance || previousBalanceInput.trim() === "" || !Number.isFinite(Number(previousBalanceInput)) || Number(previousBalanceInput) < 0}
                      onClick={async () => {
                        setSavingPreviousBalance(true);
                        const saved = await onSavePreviousAdventureBalance(reg.id, Number(previousBalanceInput));
                        setSavingPreviousBalance(false);
                        if (saved) setEditingPreviousBalance(false);
                      }}
                      className="rounded-lg bg-[#0033A0] px-4 py-2 text-xs font-bold text-white hover:bg-[#00277a] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingPreviousBalance ? "Saving…" : "Save balance"}
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={savingPreviousBalance}
                    onClick={async () => {
                      setSavingPreviousBalance(true);
                      const saved = await onSavePreviousAdventureBalance(reg.id, 0);
                      setSavingPreviousBalance(false);
                      if (saved) { setPreviousBalanceInput("0"); setEditingPreviousBalance(false); }
                    }}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Clear previous balance
                  </button>
                </div>
              )}
            </SectionCard>}

            {/* Child */}
            <SectionCard emoji="🧒" title="Child Information">
              <InfoRow label="Full Name" value={`${reg.childInfo.firstName} ${reg.childInfo.lastName}${reg.childInfo.nickname ? ` (${reg.childInfo.nickname})` : ""}`} />
              <InfoRow label="Date of Birth" value={reg.childInfo.dateOfBirth} />
              <InfoRow label="Gender" value={reg.childInfo.gender} />
              <InfoRow label="Health Profile" value={reg.childInfo.healthProfile || "None noted"} />
              <InfoRow label="Favorites" value={[reg.childInfo.favoriteSong, reg.childInfo.favoriteColor, reg.childInfo.favoriteCharacter].filter(Boolean).join(" · ") || "—"} />
            </SectionCard>

            {/* Parent */}
            <SectionCard emoji="👨‍👩‍👧" title="Parent / Guardian">
              <InfoRow label="Name" value={reg.parentInfo.name} />
              <InfoRow label="Relationship" value={reg.parentInfo.relationship} />
              <InfoRow label="Email" value={reg.parentInfo.email} />
              <InfoRow label="Phone" value={reg.parentInfo.phone} />
              {(reg.parentInfo as any).facebook && (
                <div className="flex items-start justify-between gap-3 py-3 border-b border-slate-100 last:border-0">
                  <span className="text-[12px] font-semibold text-[#94a3b8] shrink-0 pt-0.5 w-[38%]">Facebook</span>
                  <span className="text-[13px] font-bold text-right break-all min-w-0 text-[#1e293b]">
                    {(() => {
                      const fb = (reg.parentInfo as any).facebook as string;
                      try {
                        const url = new URL(fb.startsWith("http") ? fb : `https://${fb}`);
                        if (url.hostname.includes("facebook.com") || url.hostname.includes("fb.com")) {
                          return <a href={url.href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{fb}</a>;
                        }
                      } catch { /* plain name */ }
                      return fb;
                    })()}
                  </span>
                </div>
              )}
            </SectionCard>

            {/* Emergency */}
            <SectionCard emoji="🚨" title="Emergency Contact">
              <InfoRow label="Name" value={reg.emergencyContact?.name || "—"} />
              <InfoRow label="Phone" value={reg.emergencyContact?.phone || "—"} />
              <InfoRow label="Relationship" value={reg.emergencyContact?.relationship || "—"} />
            </SectionCard>

            {/* Consents + Add-ons */}
            <SectionCard emoji="📋" title="Consents & Add-ons">
              <InfoRow label="Photo Consent" value={reg.photoConsent === "yes" ? "✅ Allowed" : "❌ Not allowed"} highlight={reg.photoConsent === "yes" ? "green" : undefined} />
              <InfoRow label="Program Waiver" value="Digitally Signed ✓" highlight="green" />
              <InfoRow label="Uniform Kit" value={reg.uniformOrdered ? "Yes — ₱650" : "Not ordered"} />
              <InfoRow label="Confirmation Email" value={reg.confirmationEmailSent ? "✅ Sent" : "Not sent yet"} highlight={reg.confirmationEmailSent ? "green" : undefined} />
              <div className="pt-2.5 mt-2 border-t border-slate-100 space-y-2">
                <InfoRow
                  label="Continuing Family Status"
                  value={
                    reg.detectedPreviousAdventure
                      ? `Yes — verified from Adventure ${reg.detectedPreviousAdventure}`
                      : reg.selfDeclaredPreviousAdventure
                      ? "Yes — continuing from previous Adventure"
                      : "No (Standard enrollment)"
                  }
                  highlight={reg.selfDeclaredPreviousAdventure || reg.detectedPreviousAdventure ? "blue" : undefined}
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 font-medium">Continuing status:</span>
                  <button
                    type="button"
                    onClick={async () => {
                      const nextVal = !reg.selfDeclaredPreviousAdventure;
                      try {
                        const res = await fetch(`/api/registrations/${reg.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ selfDeclaredPreviousAdventure: nextVal }),
                        });
                        if (res.ok) {
                          onRefreshRegistrations();
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    {reg.selfDeclaredPreviousAdventure ? "Remove Continuing Flag" : "Mark as Continuing Student"}
                  </button>
                </div>
              </div>
            </SectionCard>

            {/* Signature */}
            {reg.signatureUrl && (
              <SectionCard emoji="✍️" title="Digital Signature">
                <div className="my-3 rounded-xl border border-slate-200 bg-white p-3 overflow-hidden">
                  <div className="relative h-20 w-full">
                    <Image src={reg.signatureUrl} alt="Signature" fill className="object-contain mix-blend-multiply" sizes="400px" />
                  </div>
                  <p className="mt-2 text-center text-[11px] font-semibold text-[#94a3b8] border-t border-slate-100 pt-2">
                    Signed by <span className="font-extrabold text-[#334155]">{reg.parentInfo.name}</span>
                  </p>
                </div>
              </SectionCard>
            )}

            <div className="h-2" />
          </div>

          {/* ── Sticky action bar ── */}
          {(isPending || isEarlyBird || isReserved) && (
            <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">

              {/* Early Bird info banner */}
              {isEarlyBird && (
                <div className="mb-3 flex items-start gap-3 rounded-2xl bg-orange-50 border border-orange-200 px-4 py-3">
                  <span className="text-lg shrink-0">🐣</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-extrabold text-orange-700">Early Bird — Slot Secured</p>
                    <p className="text-[11px] text-orange-600 mt-0.5">
                      {reg.paymentDeadline
                        ? `Payment due by ${new Date(reg.paymentDeadline).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`
                        : "No payment deadline set yet"}
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenPayment(reg.id)}
                    disabled={isProcessing}
                    className="shrink-0 rounded-xl bg-orange-500 px-3 py-2 text-[12px] font-bold text-white hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-40"
                  >
                    {isProcessing ? "…" : "Open Payment"}
                  </button>
                </div>
              )}

              {!rejectMode && !earlyBirdMode ? (
                <div className="space-y-2">
                  {isPending && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setRejectMode(true)}
                        disabled={isProcessing}
                        className="flex-1 rounded-2xl border-2 border-red-200 bg-red-50 py-4 text-[14px] font-bold text-red-600 hover:bg-red-100 active:scale-[0.98] transition-all disabled:opacity-40"
                      >
                        ✕ Reject
                      </button>
                      <button
                        onClick={() => onApprove(reg.id)}
                        disabled={isProcessing}
                        className="flex-[2] rounded-2xl py-4 text-[14px] font-bold text-white active:scale-[0.98] transition-all disabled:opacity-40 shadow-lg"
                        style={{ background: `linear-gradient(135deg, #22c55e, #16a34a)`, boxShadow: "0 8px 24px rgba(34,197,94,0.3)" }}
                      >
                        {isProcessing ? "Processing…" : "✅ Approve & Send Email"}
                      </button>
                    </div>
                  )}
                  {(isPending || isReserved) && !isEarlyBird && (
                    <button
                      onClick={() => setEarlyBirdMode(true)}
                      disabled={isProcessing}
                      className="w-full rounded-2xl border-2 border-orange-200 bg-orange-50 py-3 text-[13px] font-bold text-orange-700 hover:bg-orange-100 active:scale-[0.98] transition-all disabled:opacity-40"
                    >
                      🐣 Mark as Early Bird (Secure Slot, Defer Payment)
                    </button>
                  )}
                </div>
              ) : earlyBirdMode ? (
                <div className="space-y-3">
                  <p className="text-[13px] font-bold text-[#334155]">Set payment deadline <span className="font-normal text-[#94a3b8]">(optional)</span></p>
                  <p className="text-[12px] text-[#64748b]">The slot will be secured. You can open the payment portal any time before this date.</p>
                  <input
                    type="date"
                    className="w-full rounded-2xl bg-[#f8fafc] border-2 border-slate-200 px-4 py-3 text-[13px] font-medium text-[#334155] focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                    value={earlyBirdDeadline}
                    onChange={e => setEarlyBirdDeadline(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setEarlyBirdMode(false)}
                      className="flex-1 rounded-2xl border-2 border-slate-200 py-3.5 text-[13px] font-bold text-[#64748b] hover:bg-slate-50 active:scale-[0.98] transition-all"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => onEarlyBird(reg.id, earlyBirdDeadline)}
                      disabled={isProcessing}
                      className="flex-1 rounded-2xl py-3.5 text-[13px] font-bold text-white active:scale-[0.98] transition-all disabled:opacity-40 shadow-lg"
                      style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 8px 24px rgba(249,115,22,0.3)" }}
                    >
                      {isProcessing ? "Saving…" : "🐣 Confirm Early Bird"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[13px] font-bold text-[#334155]">Reason for rejection <span className="font-normal text-[#94a3b8]">(optional)</span></p>
                  <textarea
                    className="w-full rounded-2xl bg-[#f8fafc] border-2 border-slate-200 px-4 py-3 text-[13px] font-medium text-[#334155] placeholder:text-[#94a3b8] focus:outline-none focus:border-red-300 focus:bg-white transition-all resize-none"
                    rows={3}
                    placeholder="e.g. Payment receipt unclear, please resubmit…"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setRejectMode(false)}
                      className="flex-1 rounded-2xl border-2 border-slate-200 py-3.5 text-[13px] font-bold text-[#64748b] hover:bg-slate-50 active:scale-[0.98] transition-all"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => onReject(reg.id, reason)}
                      disabled={isProcessing}
                      className="flex-1 rounded-2xl bg-red-500 py-3.5 text-[13px] font-bold text-white hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-40 shadow-lg shadow-red-500/20"
                    >
                      {isProcessing ? "Rejecting…" : "Confirm Reject"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </m.div>
    </AnimatePresence>
  );
}

// ── Lead Detail Modal ─────────────────────────────────────────────────────────
function LeadDetailModal({
  lead,
  onClose,
  onUpdate,
  onDelete,
  isProcessing,
}: {
  lead: Lead;
  onClose: () => void;
  onUpdate: (id: string, status: string, notes: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isProcessing: boolean;
}) {
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState(lead.status || "in-progress");
  const [notes, setNotes] = useState(lead.notes || "");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [emailPreview, setEmailPreview] = useState<{
    to: string;
    subject: string;
    html: string;
    step: number;
    stepLabel: string;
    version: string;
  } | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSentMessage, setEmailSentMessage] = useState("");

  const accent = lead.selectedProgram && PROGRAM_ACCENTS[lead.selectedProgram]
    ? PROGRAM_ACCENTS[lead.selectedProgram]
    : "#0033A0";

  const childName = [lead.childInfo?.firstName, lead.childInfo?.lastName].filter(Boolean).join(" ") || "Prospective Student";
  const parentEmail = lead.parentInfo?.email;

  const stepMeta = LEAD_STEP_LABELS[lead.step] || {
    label: lead.stepName || `Step ${lead.step}`,
    badge: `Step ${lead.step}`,
    color: "text-blue-800",
    bg: "bg-blue-100",
  };

  const stepsList = [
    { num: 0, label: "Child & Parent Details" },
    { num: 1, label: "Program & Schedule" },
    { num: 2, label: "Consents & Waivers" },
    { num: 3, label: "Review & Payment" },
  ];

  async function handleSave() {
    await onUpdate(lead.id, currentStatus, notes);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  }

  async function handlePreviewFollowUp() {
    if (!user) {
      setEmailError("Your session has expired. Please sign in again.");
      return;
    }
    setEmailBusy(true);
    setEmailError("");
    setEmailSentMessage("");
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/leads/${lead.id}/follow-up`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setEmailError(data.error || "Could not prepare the email preview.");
        return;
      }
      setEmailPreview(data.preview);
    } catch {
      setEmailError("Could not load the email preview. Please try again.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleSendFollowUp() {
    if (!user || !emailPreview) return;
    setEmailBusy(true);
    setEmailError("");
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/leads/${lead.id}/follow-up`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ expectedVersion: emailPreview.version }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        if (response.status === 409) setEmailPreview(null);
        setEmailError(data.error || "The follow-up email could not be sent.");
        return;
      }
      setEmailSentMessage(`Follow-up email sent to ${data.to}.`);
    } catch {
      setEmailError("The follow-up email could not be sent. Please try again.");
    } finally {
      setEmailBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <m.div
        key="lead-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal / Sheet */}
      <m.div
        key="lead-modal"
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 40 }}
        className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-6 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full md:max-w-5xl md:rounded-[2rem] bg-[#f4f7fb] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] md:shadow-[0_30px_80px_rgba(0,0,0,0.2)] flex flex-col max-h-[94dvh] md:max-h-[90vh] rounded-t-[2rem] border-t-[8px] overflow-hidden"
          style={{ borderColor: accent }}
        >
          {/* Drag handle (mobile) */}
          <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-slate-300" />
          </div>

          {/* ── Header ── */}
          <div className="relative flex items-start gap-4 border-b border-slate-100 bg-white px-6 py-5 shrink-0 rounded-t-[1.8rem]">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>

            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm border border-slate-100 text-[26px]"
              style={{ backgroundColor: `${accent}15` }}
            >
              {lead.selectedProgram === "ballet" ? "🩰" : lead.selectedProgram === "brave-explorer" ? "🏆" : lead.selectedProgram === "creative-explorer" ? "🚀" : "📝"}
            </div>

            <div className="flex-1 pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[19px] font-extrabold text-[#002f76] leading-tight">
                  {childName}
                </h2>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${LEAD_STATUS_STYLES[lead.status] || "bg-slate-100 text-slate-700"}`}>
                  {LEAD_STATUS_LABELS[lead.status] || lead.status}
                </span>
              </div>
              <p className="mt-1 text-[13px] font-semibold text-[#64748b]">
                Parent: <span className="text-[#1e293b] font-bold">{lead.parentInfo?.name || "Not provided"}</span>
                {lead.parentInfo?.relationship ? ` (${lead.parentInfo.relationship})` : ""}
              </p>
              <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                <span className="text-[11px] text-[#94a3b8]">Last active: {lead.updatedAt ? new Date(lead.updatedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "Recently"}</span>
                {lead.parentInfo?.facebook && (() => {
                  const fb = lead.parentInfo!.facebook as string;
                  let href: string | null = null;
                  try {
                    const url = new URL(fb.startsWith("http") ? fb : `https://${fb}`);
                    if (url.hostname.includes("facebook.com") || url.hostname.includes("fb.com")) href = url.href;
                  } catch { /* plain name */ }
                  const chip = (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1877F2]/30 bg-[#e7f0fd] px-2.5 py-0.5">
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#1877F2"/><path d="M27 13h-3c-1.1 0-2 .9-2 2v2h5l-.7 5H22v13h-5V22h-3v-5h3v-2c0-3.3 2.7-6 6-6h4v4z" fill="white"/></svg>
                      <span className="text-[11px] font-bold text-[#1877F2] max-w-[160px] truncate">{fb}</span>
                    </span>
                  );
                  return href
                    ? <a href={href} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">{chip}</a>
                    : chip;
                })()}
              </div>
            </div>
          </div>

          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 md:px-7">
            <div className="space-y-4">

            {/* Funnel Step Stepper */}
            <SectionCard emoji="🧭" title="Registration Progress">
              <div className="py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-extrabold text-[#0033A0]">
                    Current Progress:
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${stepMeta.bg} ${stepMeta.color}`}>
                    {stepMeta.label}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 mt-3">
                  {stepsList.map((s) => {
                    const isDone = lead.step > s.num || lead.status === "converted";
                    const isCurrent = lead.step === s.num && lead.status !== "converted";
                    return (
                      <div
                        key={s.num}
                        className={`rounded-xl p-2 text-center border transition-all ${
                          isDone
                            ? "bg-green-50 border-green-200 text-green-700"
                            : isCurrent
                            ? "bg-blue-50 border-[#0033A0]/30 text-[#0033A0] ring-2 ring-[#0033A0]/20"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div className="text-[11px] font-extrabold">
                          {isDone ? "✓ Step " + s.num : "Step " + s.num}
                        </div>
                        <div className="text-[10px] font-medium truncate mt-0.5" title={s.label}>
                          {s.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionCard>

            {/* Follow-up email: review the exact message before sending */}
            <SectionCard emoji="✉️" title="Follow-Up Email">
              <div className="py-3 space-y-3">
                <p className="text-[12px] leading-relaxed text-slate-600">
                  Prepare a message tailored to this lead&apos;s current step: <strong>{stepMeta.label}</strong>. The email is sent only after you review it and choose Send.
                </p>
                {!emailPreview ? (
                  <>
                    <button
                      type="button"
                      onClick={handlePreviewFollowUp}
                      disabled={emailBusy || !parentEmail}
                      className="rounded-xl bg-[#0033A0] px-4 py-2.5 text-[12px] font-bold text-white shadow-md shadow-[#0033A0]/20 hover:bg-[#002f76] disabled:opacity-50 transition-all"
                    >
                      {emailBusy ? "Preparing preview…" : "Preview Follow-Up Email"}
                    </button>
                    {!parentEmail && <p className="text-[11px] font-semibold text-amber-700">This lead has no email address saved.</p>}
                  </>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="space-y-1 border-b border-slate-200 bg-slate-50 px-3.5 py-3 text-[12px]">
                      <p><span className="font-extrabold text-slate-500">To:</span> <span className="font-semibold text-slate-800">{emailPreview.to}</span></p>
                      <p><span className="font-extrabold text-slate-500">Subject:</span> <span className="font-semibold text-slate-800">{emailPreview.subject}</span></p>
                      <p><span className="font-extrabold text-slate-500">Based on:</span> <span className="font-semibold text-slate-800">{emailPreview.stepLabel}</span></p>
                    </div>
                    <iframe
                      title="Follow-up email preview"
                      srcDoc={emailPreview.html}
                      sandbox=""
                      className="h-[390px] w-full bg-[#eef5ff]"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setEmailPreview(null)}
                        disabled={emailBusy}
                        className="rounded-xl border border-slate-200 px-3.5 py-2 text-[12px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleSendFollowUp}
                        disabled={emailBusy || Boolean(emailSentMessage)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {emailBusy ? "Sending…" : emailSentMessage ? "Email Sent" : "Send Follow-Up Email"}
                      </button>
                    </div>
                  </div>
                )}
                {emailError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-[12px] font-bold text-red-700">{emailError}</p>}
                {emailSentMessage && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-700">✅ {emailSentMessage}</p>}
                {lead.followUpEmails && lead.followUpEmails.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Previously sent</p>
                    {lead.followUpEmails.slice(-3).reverse().map((item, index) => (
                      <p key={`${item.sentAt}-${index}`} className="text-[11px] text-slate-500">
                        {item.stepLabel || `Step ${item.step}`} · {item.sentAt ? new Date(item.sentAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "Sent"}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
              <div className="space-y-4">
            {/* Staff Follow-up & Notes */}
            <SectionCard emoji="📝" title="Staff Follow-Up & Notes">
              <div className="py-3 space-y-3">
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#94a3b8] block mb-1.5">
                    Lead Status
                  </label>
                  <select
                    value={currentStatus}
                    onChange={(e) => setCurrentStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-bold text-[#334155] focus:outline-none focus:border-[#0033A0]"
                  >
                    <option value="in-progress">⏳ In-Progress / Abandoned</option>
                    <option value="contacted">📞 Followed Up (In Contact)</option>
                    <option value="converted">🎉 Converted (Registered)</option>
                    <option value="archived">📦 Archived</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#94a3b8] block mb-1.5">
                    Internal Follow-Up Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Sent WhatsApp brochure, parent was asking about morning schedule availability..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[13px] font-medium text-[#334155] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#0033A0] resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  {savedSuccess ? (
                    <span className="text-[12px] font-bold text-green-600">✅ Changes saved!</span>
                  ) : <span />}
                  <button
                    onClick={handleSave}
                    disabled={isProcessing}
                    className="rounded-xl bg-[#0033A0] px-4 py-2 text-[12px] font-bold text-white shadow-md shadow-[#0033A0]/20 hover:bg-[#002f76] disabled:opacity-50 transition-all"
                  >
                    {isProcessing ? "Saving..." : "Save Follow-Up"}
                  </button>
                </div>
              </div>
            </SectionCard>

              </div>
              <div className="space-y-4">

            {/* Child Details */}
            <SectionCard emoji="🧒" title="Child Information">
              <InfoRow label="First Name" value={lead.childInfo?.firstName || "—"} />
              <InfoRow label="Last Name" value={lead.childInfo?.lastName || "—"} />
              <InfoRow label="Nickname" value={lead.childInfo?.nickname || "—"} />
              <InfoRow label="Date of Birth" value={lead.childInfo?.dateOfBirth || "—"} />
              <InfoRow label="Gender" value={lead.childInfo?.gender || "—"} />
              {lead.childInfo?.healthProfile && (
                <InfoRow label="Health Notes" value={lead.childInfo.healthProfile} />
              )}
              {lead.childInfo?.specialNeeds && (
                <InfoRow label="Special Needs" value={lead.childInfo.specialNeeds} />
              )}
              {lead.childInfo?.allergies && (
                <InfoRow label="Allergies" value={lead.childInfo.allergies} highlight="red" />
              )}
            </SectionCard>

            {/* Parent Contact */}
            <SectionCard emoji="👨‍👩‍👧" title="Parent / Guardian Details">
              <InfoRow label="Parent Name" value={lead.parentInfo?.name || "—"} />
              <InfoRow label="Relationship" value={lead.parentInfo?.relationship || "—"} />
              <InfoRow label="Email" value={lead.parentInfo?.email || "—"} />
              <InfoRow label="Phone" value={lead.parentInfo?.phone || "—"} />
              {lead.parentInfo?.facebook && (
                <div className="flex items-start justify-between gap-3 py-3 border-b border-slate-100 last:border-0">
                  <span className="text-[12px] font-semibold text-[#94a3b8] shrink-0 pt-0.5 w-[38%]">Facebook</span>
                  <span className="text-[13px] font-bold text-right break-all min-w-0 text-[#1e293b]">
                    {(() => {
                      const fb = lead.parentInfo!.facebook as string;
                      try {
                        const url = new URL(fb.startsWith("http") ? fb : `https://${fb}`);
                        if (url.hostname.includes("facebook.com") || url.hostname.includes("fb.com")) {
                          return <a href={url.href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{fb}</a>;
                        }
                      } catch { /* plain name */ }
                      return fb;
                    })()}
                  </span>
                </div>
              )}
              {lead.emergencyContact?.name && (
                <>
                  <InfoRow label="Emergency Contact" value={lead.emergencyContact.name} />
                  <InfoRow label="Emergency Phone" value={lead.emergencyContact.phone || "—"} />
                </>
              )}
            </SectionCard>

            {/* Selections made so far */}
            <SectionCard emoji="🎯" title="Program & Session Details">
              <InfoRow
                label="Selected Program"
                value={lead.selectedProgram ? getProgramLabel(lead.selectedProgram) : "Not selected yet"}
                highlight={lead.selectedProgram ? "blue" : undefined}
              />
              <InfoRow
                label="Selected Session"
                value={lead.selectedClass || "Not selected yet"}
              />
              {lead.promoCode && (
                <InfoRow label="Promo Code" value={lead.promoCode} highlight="green" />
              )}
              <InfoRow
                label="Photo Consent"
                value={lead.photoConsent === "yes" ? "✅ Allowed" : lead.photoConsent === "no" ? "❌ Declined" : "Pending"}
              />
              <InfoRow
                label="Digital Signature"
                value={lead.hasSignature ? "✅ Signed" : "Pending"}
              />
            </SectionCard>

            {/* Step Audit History */}
            {lead.history && lead.history.length > 0 && (
              <SectionCard emoji="⏱️" title="Step Activity Timeline">
                <div className="py-2 space-y-2">
                  {lead.history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-[12px] py-1 border-b border-slate-100 last:border-0">
                      <span className="font-bold text-[#334155]">{h.stepName || `Step ${h.step}`}</span>
                      <span className="text-[11px] text-[#94a3b8]">
                        {h.enteredAt ? new Date(h.enteredAt).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" }) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
              </div>
            </div>
          </div>
          </div>

          {/* Footer actions */}
          <div className="border-t border-slate-200 bg-white px-5 py-3 shrink-0 flex items-center justify-between gap-3">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-red-600">Permanently delete?</span>
                <button
                  type="button"
                  onClick={() => onDelete(lead.id)}
                  disabled={isProcessing}
                  className="rounded-xl bg-red-600 px-3 py-1.5 text-[12px] font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                  {isProcessing ? "Deleting..." : "Yes, Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isProcessing}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-xl border border-red-200 bg-red-50/70 px-3.5 py-2 text-[12px] font-bold text-red-600 hover:bg-red-100 transition-all flex items-center gap-1.5"
              >
                <span>🗑️</span>
                <span>Delete Lead</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2 text-[13px] font-bold text-[#64748b] hover:bg-slate-50 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </m.div>
    </AnimatePresence>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminRegistrationsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [adventureFilter, setAdventureFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [registrationPage, setRegistrationPage] = useState(1);
  const [registrationPageSize, setRegistrationPageSize] = useState(10);
  const [leadPage, setLeadPage] = useState(1);
  const [leadPageSize, setLeadPageSize] = useState(10);
  const [leadSubFilter, setLeadSubFilter] = useState<"all" | "in-progress" | "contacted">("all");
  const [selected, setSelected] = useState<Registration | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState("");
  const [deleteConfirmLeadId, setDeleteConfirmLeadId] = useState<string | null>(null);

  // ── SWR data fetching ───────────────────────────────────────────────────────
  // auth-context.tsx patches window.fetch to inject the Bearer token, so SWR
  // calls automatically include the Authorization header.
  const {
    data: registrationsData,
    isLoading: registrationsLoading,
    mutate: mutateRegistrations,
  } = useSWR(
    user ? "/api/registrations" : null, // don't fetch until signed in
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.success ? (json.data as Registration[]) : [];
    },
    {
      dedupingInterval: 30_000,      // same URL won't re-fetch within 30s
      revalidateOnFocus: false,      // don't re-fetch on tab switch
      shouldRetryOnError: false,
      onSuccess: (data) => { setLoading(false); setRegistrations(data); },
      onError: () => setLoading(false),
    }
  );

  const {
    data: leadsData,
    isLoading: leadsLoading,
    mutate: mutateLeads,
  } = useSWR(
    user ? "/api/leads" : null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.success ? (json.data as Lead[]) : [];
    },
    {
      dedupingInterval: 30_000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      onSuccess: (data) => setLeads(data),
    }
  );

  // Auto-dismiss toasts
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Keep loading state in sync
  useEffect(() => {
    if (!authLoading && !user) setLoading(false);
  }, [authLoading, user]);

  // fetchRegistrations used by adventure summary & actions — re-validates SWR cache
  async function fetchRegistrations(): Promise<Registration[]> {
    try {
      const fresh = await mutateRegistrations();
      if (fresh) {
        setRegistrations(fresh);
        return fresh;
      }
      return registrations;
    } catch {
      return registrations;
    }
  }

  async function handleGenerateAdventureSummary() {
    const summaryWindow = window.open("", "_blank");
    if (!summaryWindow) {
      window.alert("Please allow pop-ups to open the Adventure summary.");
      return;
    }
    summaryWindow.opener = null;
    summaryWindow.document.write("<p style='font-family:Arial,sans-serif;padding:24px;color:#334155'>Preparing the Adventure summary…</p>");
    setIsProcessing(true);

    try {
      const latestRegistrations = await fetchRegistrations();
      const reportRegistrations = (latestRegistrations.length > 0 ? latestRegistrations : registrations)
        .filter((registration) => !isTestRegistration(registration));
      const excelExport = await createAdventureExcel(reportRegistrations);
      const adventureGroups = new Map<string, Registration[]>();

      for (const registration of reportRegistrations) {
        const number = getAdventureNumber(registration);
        const key = number === null ? "unassigned" : String(number);
        if (adventureFilter !== "all" && key !== adventureFilter) continue;
        adventureGroups.set(key, [...(adventureGroups.get(key) || []), registration]);
      }

      const orderedGroups = [...adventureGroups.entries()].sort(([left], [right]) => {
        if (left === "unassigned") return 1;
        if (right === "unassigned") return -1;
        return Number(left) - Number(right);
      });
      const reportSections = orderedGroups.map(([key, groupRegistrations]) => {
        const adventureNumber = key === "unassigned" ? null : Number(key);
        const title = adventureNumber === null ? "Cycle not tagged" : `Adventure ${adventureNumber}`;
        const adventureStartDate = groupRegistrations.find((registration) => registration.adventureStartDate)?.adventureStartDate;
        const unpaidHolds = groupRegistrations.filter((registration) =>
          (registration.status === "reserved" || registration.status === "pending") &&
          occupiesAdventureSlot(registration) && !registration.receiptUrl && !(Number(registration.amountPaid) > 0)
        );
        const awaitingReview = groupRegistrations.filter((registration) =>
          (registration.status === "reserved" || registration.status === "pending") &&
          occupiesAdventureSlot(registration) && Boolean(registration.receiptUrl || Number(registration.amountPaid) > 0)
        );
        const expiredReservations = groupRegistrations.filter(isRegExpired);
        const programIds = [...new Set(groupRegistrations.filter((registration) => !isRegExpired(registration)).map((registration) => registration.program))]
          .sort((left, right) => {
            const programOrder = Object.keys(PROGRAM_SLOTS);
            const leftIndex = programOrder.indexOf(left);
            const rightIndex = programOrder.indexOf(right);
            return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex) || left.localeCompare(right);
          });
        const expiredBySession = new Map<string, Registration[]>();
        for (const registration of expiredReservations) {
          const key = `${registration.program}::${registration.classTime || "Class not selected"}`;
          expiredBySession.set(key, [...(expiredBySession.get(key) || []), registration]);
        }
        const expiredSection = expiredReservations.length > 0
          ? `<section class="expired-section"><div class="expired-heading"><div><span class="eyebrow">Kept for reference</span><h3>Expired reservations</h3><p>These reservations are not in current class lists and do not use or reduce any places.</p></div><span class="expired-count">${expiredReservations.length} record${expiredReservations.length === 1 ? "" : "s"}</span></div><div class="expired-groups">${[...expiredBySession.entries()].map(([sessionKey, sessionRegistrations]) => {
            const [programId, classTime] = sessionKey.split("::");
            const program = PROGRAM_SLOTS[programId as keyof typeof PROGRAM_SLOTS];
            const session = program?.classes.find((candidate) => candidate.name === classTime);
            const rows = sessionRegistrations.map((registration) => `<div class="expired-row"><strong>${escapeSummaryHtml(`${registration.childInfo.firstName || ""} ${registration.childInfo.lastName || ""}`.trim())}</strong><span>${escapeSummaryHtml(new Date(registration.submittedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }))}</span></div>`).join("");
            return `<article class="expired-card"><header><strong>${escapeSummaryHtml(program?.name || getProgramLabel(programId))}</strong><span>${escapeSummaryHtml(classTime)}${session?.time ? ` · ${escapeSummaryHtml(session.time)}` : ""}</span></header><div>${rows}</div></article>`;
          }).join("")}</div></section>`
          : "";
        const showAdventureHeading = adventureFilter === "all" || adventureFilter === "unassigned";
        return `<section class="adventure">
          ${showAdventureHeading ? `<div class="adventure-heading"><div><h2>${escapeSummaryHtml(title)}</h2>${adventureStartDate ? `<p class="muted">Starts ${escapeSummaryHtml(formatAdventureDate(adventureStartDate))}</p>` : ""}</div></div>` : ""}
          <div class="metrics">
            <div><strong>${groupRegistrations.length}</strong><span>Registration records</span></div>
            <div><strong>${countUniqueChildren(unpaidHolds)}</strong><span>Reserved · unpaid</span></div>
            <div><strong>${countUniqueChildren(awaitingReview)}</strong><span>Payments to review</span></div>
            <div><strong>${countUniqueChildren(expiredReservations)}</strong><span>Expired · excluded from seats</span></div>
          </div>
          <p class="section-intro">Current registrations are grouped by program and class time. Only approved students and unexpired reservations use a place.</p>
          <div class="program-list">${programIds.map((programId) => {
            const program = PROGRAM_SLOTS[programId as keyof typeof PROGRAM_SLOTS];
            const programRegistrations = groupRegistrations.filter((registration) => registration.program === programId);
            const currentRegistrationCount = programRegistrations.filter((registration) => !isRegExpired(registration)).length;
            const programActive = programRegistrations.filter(occupiesAdventureSlot);
            const programUnpaid = unpaidHolds.filter((registration) => registration.program === programId);
            const programReview = awaitingReview.filter((registration) => registration.program === programId);
            const programSchedule = program?.schedule || "Schedule to be confirmed";
            const sessionCards = (program?.classes || []).map((session) => {
              const alias = session.name.includes("Session") ? session.name.replace("Session", "Class") : session.name.replace("Class", "Session");
              const matches = (registration: Registration) => registration.classTime === session.name || registration.classTime === alias;
              const currentSession = programRegistrations.filter((registration) => !isRegExpired(registration) && matches(registration));
              const occupied = countUniqueChildren(programActive.filter(matches));
              const free = typeof session.maxSlots === "number" ? Math.max(0, session.maxSlots - occupied) : null;
              const unpaidCount = countUniqueChildren(programUnpaid.filter(matches));
              const reviewCount = countUniqueChildren(programReview.filter(matches));
              const studentRows = [...currentSession].sort((left, right) =>
                `${left.childInfo.firstName} ${left.childInfo.lastName}`.localeCompare(`${right.childInfo.firstName} ${right.childInfo.lastName}`)
              ).map((registration) => {
                const status = (registration.status === "reserved" || registration.status === "pending")
                  ? registration.receiptUrl || Number(registration.amountPaid) > 0 ? "Payment submitted · review needed" : "Reserved · unpaid"
                  : (STATUS_LABELS[registration.status] || registration.status).replace(/^[^\p{L}\p{N}]+/u, "");
                const statusClass = registration.status === "reserved" || registration.status === "pending"
                  ? "status-pending"
                  : registration.status === "rejected" ? "status-rejected" : "status-approved";
                return `<div class="student-row"><strong>${escapeSummaryHtml(`${registration.childInfo.firstName || ""} ${registration.childInfo.lastName || ""}`.trim())}</strong><span class="status ${statusClass}">${escapeSummaryHtml(status)}</span><span class="registered">Registered ${escapeSummaryHtml(new Date(registration.submittedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }))}</span></div>`;
              }).join("");
              return `<div class="session-card"><div class="session-top"><div><strong>${escapeSummaryHtml(session.name)}</strong><span>${escapeSummaryHtml(session.time || "Time to be confirmed")}</span></div><div class="spaces"><strong>${free === null ? "Flexible" : `${free} places left`}</strong><span>${free === null ? "Schedule by arrangement" : `${occupied} of ${session.maxSlots} places used`}</span></div></div><div class="session-meta"><span>${unpaidCount} unpaid reservation${unpaidCount === 1 ? "" : "s"}</span><span>${reviewCount} payment${reviewCount === 1 ? "" : "s"} to review</span></div><div class="class-roster"><h4>Class list <span>${currentSession.length}</span></h4>${studentRows || `<p class="empty-roster">No current registrations for this class.</p>`}</div></div>`;
            }).join("");
            return `<article class="program-card"><header class="program-heading" style="--accent:${escapeSummaryHtml(program?.accent || "#0033A0")}"><span class="program-icon">${escapeSummaryHtml(program?.icon || "📚")}</span><div><h3>${escapeSummaryHtml(program?.name || getProgramLabel(programId))}</h3><p>${escapeSummaryHtml(programSchedule)} · ${currentRegistrationCount} current registration${currentRegistrationCount === 1 ? "" : "s"}</p></div></header><div class="program-content"><div class="session-list">${sessionCards || `<p class="muted">Session details are not set for this program.</p>`}</div></div></article>`;
          }).join("")}</div>
          ${expiredSection}
        </section>`;
      }).join("");

      const reportTitle = adventureFilter === "all"
        ? "Adventure Registration Summary"
        : adventureFilter === "unassigned" ? "Untagged Registration Summary" : `Adventure ${adventureFilter} Registration Summary`;
      const selectedAdventureStartDate = adventureFilter !== "all" && adventureFilter !== "unassigned"
        ? reportRegistrations.find((registration) => getAdventureNumber(registration) === Number(adventureFilter))?.adventureStartDate
        : undefined;
      const reportSubtitle = [
        `Prepared ${new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}`,
        selectedAdventureStartDate ? `Starts ${formatAdventureDate(selectedAdventureStartDate)}` : null,
        "Includes all programs and registration statuses",
      ].filter(Boolean).join(" · ");
      const reportHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeSummaryHtml(reportTitle)}</title>
<style>
*{box-sizing:border-box}body{margin:0;padding:20px 0;background:#f4f7fc;color:#16356b;font-family:Arial,Helvetica,sans-serif}.page{width:100%;max-width:none;margin:0;background:#fff;border:1px solid #dce5f0;border-radius:16px;overflow:hidden;box-shadow:0 12px 36px rgba(25,55,105,.08)}.brand{display:flex;align-items:center;min-height:58px;padding:15px 28px;background:#082f78;border-bottom:4px solid #ffd84d;color:#fff;font-size:13px;font-weight:800;letter-spacing:.06em}.content{padding:28px clamp(18px,3vw,48px)}.title{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.title h1{margin:0 0 7px;color:#082f78;font-size:25px;line-height:1.2}.muted{margin:4px 0 0;color:#71809a;font-size:12px;line-height:1.4}.actions{width:calc(100% - 40px);margin:0 20px 12px;display:flex;justify-content:flex-end;gap:8px}.actions button,.actions a{display:inline-flex;align-items:center;border:0;border-radius:8px;padding:10px 15px;background:#0033a0;color:#fff;font-weight:700;font-size:12px;text-decoration:none;cursor:pointer}.actions .close{background:#e8eef6;color:#334155}.actions .excel{background:#e9f8ef;color:#18794e}.adventure{margin-top:24px;padding:22px;border:1px solid #dfe7f2;border-radius:14px;background:#fff;break-inside:avoid}.adventure-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:14px;border-bottom:1px solid #edf1f6}.eyebrow{color:#71809a;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.adventure-heading h2{margin:4px 0 0;color:#0033a0;font-size:21px}.registration-count{padding:7px 11px;border-radius:20px;background:#eef4ff;color:#0033a0;font-size:12px;font-weight:800;white-space:nowrap}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.metrics div{min-height:76px;padding:13px 14px;border:1px solid #e3eaf3;border-radius:10px;background:#f9fbfe}.metrics strong,.metrics span{display:block}.metrics strong{color:#0033a0;font-size:22px;line-height:1.2}.metrics span{margin-top:5px;color:#65738a;font-size:11px;line-height:1.35}.section-intro{margin:16px 0 12px;color:#50627d;font-size:12px;line-height:1.5}.program-list{display:grid;gap:13px}.program-card{overflow:hidden;border:1px solid #e1e8f1;border-radius:12px;background:#fff;break-inside:avoid}.program-heading{display:flex;align-items:center;gap:12px;padding:14px 16px;background:#f8faff;border-bottom:1px solid #e8eef6;box-shadow:inset 4px 0 var(--accent)}.program-icon{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;background:#fff;border:1px solid #e4eaf2;font-size:20px}.program-heading h3{margin:0;color:#183c77;font-size:14px}.program-heading p{margin:4px 0 0;color:#71809a;font-size:11px}.program-content{padding:14px 16px}.session-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.session-card{padding:12px;border:1px solid #e5ebf3;border-radius:10px;background:#fff}.session-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.session-top>div:first-child strong,.session-top>div:first-child span,.spaces strong,.spaces span{display:block}.session-top>div:first-child strong{color:#27446f;font-size:12px}.session-top>div:first-child span{margin-top:4px;color:#71809a;font-size:11px}.spaces{text-align:right;white-space:nowrap}.spaces strong{color:#16804a;font-size:13px}.spaces span{margin-top:3px;color:#758198;font-size:10px}.session-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;padding-top:8px;border-top:1px solid #eff2f6}.session-meta span{padding:4px 7px;border-radius:12px;background:#f2f5f9;color:#56647a;font-size:10px}.session-meta .expired{background:#fff1f0;color:#b42318}.program-content h4{margin:18px 0 7px;color:#5b6a82;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.student-list{border-top:1px solid #e9eef5}.student-row{display:grid;grid-template-columns:minmax(150px,1.2fr) minmax(130px,1fr) minmax(160px,1.2fr) 90px;align-items:center;gap:12px;padding:9px 4px;border-bottom:1px solid #edf1f6}.student-row:last-child{border-bottom:0}.student-name{color:#18396f;font-size:11px;font-weight:700}.student-session strong,.student-session span{display:block}.student-session strong{color:#465974;font-size:11px}.student-session span,.registered{margin-top:3px;color:#7d899d;font-size:10px}.status{justify-self:start;padding:5px 8px;border-radius:12px;background:#e9f8ef;color:#18794e;font-size:10px;font-weight:700;line-height:1.25}.status-pending{background:#fff7df;color:#9a6700}.status-rejected,.status-expired{background:#fff0ef;color:#b42318}.class-roster{margin-top:12px;padding-top:9px;border-top:1px solid #edf1f6}.class-roster h4{display:flex;align-items:center;justify-content:space-between;margin:0 0 5px;color:#66758c;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.class-roster h4 span{padding:3px 7px;border-radius:10px;background:#f1f4f8;color:#56647a}.class-roster .student-row{grid-template-columns:minmax(130px,1fr) auto 110px;padding:8px 2px}.class-roster .student-row>strong{color:#18396f;font-size:11px}.empty-roster{margin:8px 0 0;color:#8793a7;font-size:11px}.expired-section{margin-top:22px;padding:18px;border:1px solid #f0c7c4;border-radius:12px;background:#fffafa}.expired-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:12px;border-bottom:1px solid #f7e2e0}.expired-heading h3{margin:4px 0;color:#9f3029;font-size:16px}.expired-heading p{margin:3px 0 0;color:#795957;font-size:11px}.expired-count{padding:6px 10px;border-radius:14px;background:#ffedeb;color:#a53d35;font-size:11px;font-weight:800;white-space:nowrap}.expired-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.expired-card{overflow:hidden;border:1px solid #f1dedc;border-radius:9px;background:#fff}.expired-card header{display:grid;gap:4px;padding:10px 12px;background:#fff6f5;border-bottom:1px solid #f5e8e7}.expired-card header strong{color:#573e3d;font-size:11px}.expired-card header span{color:#8d6d6a;font-size:10px}.expired-row{display:flex;justify-content:space-between;gap:10px;padding:9px 12px;border-bottom:1px solid #f4eeee}.expired-row:last-child{border-bottom:0}.expired-row strong{color:#7d3430;font-size:11px}.expired-row span{color:#907a78;font-size:10px;white-space:nowrap}.note{margin:16px 0 0;padding:11px 13px;border-left:3px solid #f0b429;border-radius:4px;background:#fff9e9;color:#665523;font-size:11px;line-height:1.5}@media(max-width:700px){body{padding:12px}.content{padding:16px}.adventure{padding:14px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.session-list{grid-template-columns:1fr}.student-row{grid-template-columns:1fr 1fr;gap:7px}.registered{margin-top:0}}@page{margin:8mm}@media print{body{padding:0;background:#fff}.page{width:100%;max-width:none;border:0;border-radius:0;box-shadow:none;overflow:visible}.actions{display:none}.content{padding:8px}.adventure{padding:10px;margin:0 0 12px;break-inside:auto;page-break-inside:auto;border:0}.adventure-heading,.metrics,.program-heading,.session-card,.student-row,.expired-card{break-inside:avoid;page-break-inside:avoid}.program-card{break-inside:auto;page-break-inside:auto;border-radius:8px}.program-heading{break-after:avoid;page-break-after:avoid}.program-content{padding:8px}.program-list{gap:8px}.session-list{gap:6px}.session-card{padding:8px}.class-roster .student-row{padding:5px}.expired-section{break-inside:auto;page-break-inside:auto}.program-heading,.session-card,.metrics div{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="actions"><button class="close" onclick="window.close()">Close</button><a class="excel" href="data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${excelExport.base64}" download="${escapeSummaryHtml(excelExport.fileName)}">Download Excel</a><button onclick="window.print()">Print / Save as PDF</button></div><main class="page"><div class="brand">MERRY EXPLORERS PLAYGROUP LEARNING CENTER</div><div class="content"><header class="title"><div><h1>${escapeSummaryHtml(reportTitle)}</h1><div class="muted">${escapeSummaryHtml(reportSubtitle)}</div></div></header>${reportSections || `<p class="note">No registrations were found for this Adventure.</p>`}</div></main></body></html>`;
      summaryWindow.document.open();
      summaryWindow.document.write(reportHtml);
      summaryWindow.document.close();
    } catch (error) {
      summaryWindow.document.body.innerHTML = `<p style="font-family:Arial,sans-serif;padding:24px;color:#b91c1c">${escapeSummaryHtml(error instanceof Error ? error.message : "Could not create the summary.")}</p>`;
    } finally {
      setIsProcessing(false);
    }
  }

  async function createAdventureExcel(reportRegistrations: Registration[]) {
      const adventureGroups = new Map<string, Registration[]>();

      for (const registration of reportRegistrations) {
        const number = getAdventureNumber(registration);
        const key = number === null ? "unassigned" : String(number);
        if (adventureFilter !== "all" && key !== adventureFilter) continue;
        adventureGroups.set(key, [...(adventureGroups.get(key) || []), registration]);
      }

      const orderedGroups = [...adventureGroups.entries()].sort(([left], [right]) => {
        if (left === "unassigned") return 1;
        if (right === "unassigned") return -1;
        return Number(left) - Number(right);
      });
      const overviewRows: (string | number)[][] = [[
        "Adventure", "Start Date", "Registration Records", "Reserved · Unpaid", "Payments to Review", "Expired Reservations",
      ]];
      const classRows: (string | number)[][] = [[
        "Adventure", "Program", "Program Days", "Class", "Class Time", "Total Slots", "Slots Filled", "Slots Left", "Unpaid Reservations", "Payments to Review",
      ]];
      const registrationRows: (string | number)[][] = [[
        "Adventure", "Student", "Parent / Guardian", "Program", "Program Days", "Class", "Class Time", "Status", "Registered",
      ]];
      const expiredRows: (string | number)[][] = [[
        "Adventure", "Student", "Parent / Guardian", "Program", "Class", "Class Time", "Status", "Registered",
      ]];
      const programOrder = Object.keys(PROGRAM_SLOTS);
      const programIndex = (programId: string) => {
        const index = programOrder.indexOf(programId);
        return index < 0 ? Number.MAX_SAFE_INTEGER : index;
      };
      const sessionOrder = (registration: Registration) => {
        const classes = PROGRAM_SLOTS[registration.program as keyof typeof PROGRAM_SLOTS]?.classes || [];
        const aliasIndex = classes.findIndex((session) =>
          registration.classTime === (session.name.includes("Session")
            ? session.name.replace("Session", "Class")
            : session.name.replace("Class", "Session"))
        );
        const directIndex = classes.findIndex((session) => registration.classTime === session.name);
        return directIndex >= 0 ? directIndex : aliasIndex >= 0 ? aliasIndex : Number.MAX_SAFE_INTEGER;
      };
      const compareRegistrationsBySchedule = (left: Registration, right: Registration) => {
        const programDifference = programIndex(left.program) - programIndex(right.program);
        if (programDifference !== 0) return programDifference;
        const sessionDifference = sessionOrder(left) - sessionOrder(right);
        if (sessionDifference !== 0) return sessionDifference;
        return `${left.childInfo.firstName} ${left.childInfo.lastName}`.localeCompare(`${right.childInfo.firstName} ${right.childInfo.lastName}`);
      };

      for (const [key, groupRegistrations] of orderedGroups) {
        const adventureName = key === "unassigned" ? "Cycle not tagged" : `Adventure ${key}`;
        const startDate = groupRegistrations.find((registration) => registration.adventureStartDate)?.adventureStartDate;
        const unpaidHolds = groupRegistrations.filter((registration) =>
          (registration.status === "reserved" || registration.status === "pending") &&
          occupiesAdventureSlot(registration) && !registration.receiptUrl && !(Number(registration.amountPaid) > 0)
        );
        const awaitingReview = groupRegistrations.filter((registration) =>
          (registration.status === "reserved" || registration.status === "pending") &&
          occupiesAdventureSlot(registration) && Boolean(registration.receiptUrl || Number(registration.amountPaid) > 0)
        );
        const expiredReservations = groupRegistrations.filter(isRegExpired);
        overviewRows.push([
          adventureName,
          formatAdventureDate(startDate) || "Not scheduled",
          groupRegistrations.length,
          countUniqueChildren(unpaidHolds),
          countUniqueChildren(awaitingReview),
          countUniqueChildren(expiredReservations),
        ]);

        const currentRegistrations = groupRegistrations.filter((registration) => !isRegExpired(registration));
        const programIds = [...new Set(currentRegistrations.map((registration) => registration.program))]
          .sort((left, right) => programIndex(left) - programIndex(right));
        for (const programId of programIds) {
          const program = PROGRAM_SLOTS[programId as keyof typeof PROGRAM_SLOTS];
          const programRegistrations = currentRegistrations.filter((registration) => registration.program === programId);
          const schedule = program?.schedule || "Schedule to be confirmed";
          for (const session of program?.classes || []) {
            const alias = session.name.includes("Session")
              ? session.name.replace("Session", "Class")
              : session.name.replace("Class", "Session");
            const matches = (registration: Registration) => registration.classTime === session.name || registration.classTime === alias;
            const occupied = countUniqueChildren(programRegistrations.filter((registration) => matches(registration) && occupiesAdventureSlot(registration)));
            const unpaid = countUniqueChildren(unpaidHolds.filter((registration) => registration.program === programId && matches(registration)));
            const review = countUniqueChildren(awaitingReview.filter((registration) => registration.program === programId && matches(registration)));
            classRows.push([
              adventureName,
              program?.name || getProgramLabel(programId),
              schedule,
              session.name,
              session.time || "Time to be confirmed",
              typeof session.maxSlots === "number" ? session.maxSlots : "Flexible",
              occupied,
              typeof session.maxSlots === "number" ? Math.max(0, session.maxSlots - occupied) : "Flexible",
              unpaid,
              review,
            ]);
          }
        }

        for (const registration of [...currentRegistrations].sort(compareRegistrationsBySchedule)) {
          const program = PROGRAM_SLOTS[registration.program as keyof typeof PROGRAM_SLOTS];
          const session = program?.classes.find((candidate) =>
            registration.classTime === candidate.name ||
            registration.classTime === (candidate.name.includes("Session")
              ? candidate.name.replace("Session", "Class")
              : candidate.name.replace("Class", "Session"))
          );
          const studentName = `${registration.childInfo.firstName || ""} ${registration.childInfo.lastName || ""}`.trim();
          const submitted = registration.submittedAt
            ? new Date(registration.submittedAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
            : "—";
          registrationRows.push([
            adventureName,
            studentName,
            registration.parentInfo?.name || "—",
            program?.name || getProgramLabel(registration.program),
            program?.schedule || "Schedule to be confirmed",
            registration.classTime || "Class not selected",
            session?.time || "Time to be confirmed",
            (STATUS_LABELS[registration.status] || registration.status).replace(/^[^\p{L}\p{N}]+/u, ""),
            submitted,
          ]);
        }

        for (const registration of [...expiredReservations].sort(compareRegistrationsBySchedule)) {
          const program = PROGRAM_SLOTS[registration.program as keyof typeof PROGRAM_SLOTS];
          const session = program?.classes.find((candidate) => registration.classTime === candidate.name);
          const studentName = `${registration.childInfo.firstName || ""} ${registration.childInfo.lastName || ""}`.trim();
          const submitted = registration.submittedAt
            ? new Date(registration.submittedAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
            : "—";
          expiredRows.push([
            adventureName,
            studentName,
            registration.parentInfo?.name || "—",
            program?.name || getProgramLabel(registration.program),
            registration.classTime || "Class not selected",
            session?.time || "Time to be confirmed",
            "Expired · does not hold a place",
            submitted,
          ]);
        }
      }

      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      const addSheet = (name: string, rows: (string | number)[][]) => {
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        worksheet["!cols"] = rows[0].map((heading, index) => ({
          wch: Math.min(34, Math.max(String(heading).length + 2, ...rows.slice(1).map((row) => String(row[index] ?? "").length + 2))),
        }));
        if (worksheet["!ref"]) worksheet["!autofilter"] = { ref: worksheet["!ref"] };
        XLSX.utils.book_append_sheet(workbook, worksheet, name);
      };
      addSheet("Program & Time Slots", classRows);
      addSheet("Adventure Overview", overviewRows);
      addSheet("Registrations", registrationRows);
      addSheet("Expired Reservations", expiredRows);
      const adventureFileName = adventureFilter === "all"
        ? "All_Adventures"
        : adventureFilter === "unassigned" ? "Untagged_Registrations" : `Adventure_${adventureFilter}`;
      const base64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
      return { base64, fileName: `Merry_Explorers_${adventureFileName}_Summary.xlsx` };
  }

  async function handleTagUntaggedAsAdventureOne() {
    const untaggedRegistrations = registrations.filter((registration) => getAdventureNumber(registration) === null);
    if (!user || untaggedRegistrations.length === 0) return;

    setIsProcessing(true);
    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch("/api/registrations/tag-adventure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ ids: untaggedRegistrations.map((registration) => registration.id) }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Could not tag the registrations.");
      }

      setToast(`✅ Tagged ${data.updatedCount} registration${data.updatedCount === 1 ? "" : "s"} as Adventure 1.`);
      await fetchRegistrations();
      setAdventureFilter("1");
      setFilter("all");
    } catch (error) {
      setToast(`❌ ${error instanceof Error ? error.message : "Could not tag the registrations."}`);
    } finally {
      setIsProcessing(false);
    }
  }

  async function fetchLeads() {
    try {
      const fresh = await mutateLeads();
      if (fresh) setLeads(fresh);
    } catch { /* ignore */ }
  }

  async function handleUpdateLead(id: string, status: string, notes: string) {
    setIsProcessing(true);
    try {
      if (!user) throw new Error("Your session has expired. Please sign in again.");
      const idToken = await user.getIdToken();
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ id, status, notes }),
      });
      const data = await res.json();
      if (data.success) {
        setToast("✅ Lead updated successfully!");
        await fetchLeads();
        if (selectedLead && selectedLead.id === id) {
          setSelectedLead(prev => prev ? { ...prev, status: status as any, notes } : null);
        }
      } else {
        setToast(`❌ ${data.error || "Failed to update lead"}`);
      }
    } catch {
      setToast("❌ Network error");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDeleteLead(id: string) {
    setDeleteConfirmLeadId(id);
  }

  async function executeDeleteLead(id: string) {
    setDeleteConfirmLeadId(null);
    setIsProcessing(true);
    try {
      if (!user) throw new Error("Your session has expired. Please sign in again.");
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/leads?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setToast("🗑️ Lead deleted successfully");
        setSelectedLead(null);
        await fetchLeads();
      } else {
        setToast(`❌ ${data.error || "Failed to delete lead"}`);
      }
    } catch {
      setToast("❌ Network error");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleApprove(id: string) {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/registrations/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorUid: user?.uid, actorName: userProfile?.fullName || user?.email, actorRole: userProfile?.role }),
      });
      const data = await res.json();
      if (data.success) {
        setToast(data.emailSent ? "✅ Approved! Confirmation email sent." : "✅ Approved! (Email failed — check logs)");
        setSelected(null);
        fetchRegistrations();
      } else {
        setToast(`❌ ${data.error}`);
      }
    } catch { setToast("❌ Network error"); }
    finally { setIsProcessing(false); }
  }

  async function handleReject(id: string, reason: string) {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/registrations/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, actorUid: user?.uid, actorName: userProfile?.fullName || user?.email, actorRole: userProfile?.role }),
      });
      const data = await res.json();
      if (data.success) {
        setToast("Registration rejected.");
        setSelected(null);
        fetchRegistrations();
      } else {
        setToast(`❌ ${data.error}`);
      }
    } catch { setToast("❌ Network error"); }
    finally { setIsProcessing(false); }
  }

  async function handleEarlyBird(id: string, deadline: string) {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/registrations/${id}/early-bird`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentDeadline: deadline || undefined, actorName: userProfile?.fullName || user?.email }),
      });
      const data = await res.json();
      if (data.success) {
        setToast("🐣 Marked as Early Bird! Slot secured.");
        setSelected(null);
        fetchRegistrations();
      } else {
        setToast(`❌ ${data.error}`);
      }
    } catch { setToast("❌ Network error"); }
    finally { setIsProcessing(false); }
  }

  async function handleOpenPayment(id: string) {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/registrations/${id}/open-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorName: userProfile?.fullName || user?.email, sendEmail: true }),
      });
      const data = await res.json();
      if (data.success) {
        setToast(data.emailSent ? "✅ Payment portal opened! Reminder email sent." : "✅ Payment portal opened! (Email failed)");
        setSelected(null);
        fetchRegistrations();
      } else {
        setToast(`❌ ${data.error}`);
      }
    } catch { setToast("❌ Network error"); }
    finally { setIsProcessing(false); }
  }

  async function handleSavePreviousAdventureBalance(id: string, amount: number): Promise<boolean> {
    setIsProcessing(true);
    try {
      if (!user) {
        setToast("❌ Your session has expired. Please sign in again.");
        return false;
      }

      const idToken = await user.getIdToken(true);
      const res = await fetch(`/api/registrations/${id}/previous-balance`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setToast(`❌ ${data.error || "Failed to update previous balance"}`);
        return false;
      }

      setToast("✅ Adventure 1 balance updated.");
      setRegistrations((current) => current.map((reg) => reg.id === id
        ? { ...reg, previousAdventureBalance: data.previousAdventureBalance }
        : reg));
      setSelected((current) => current?.id === id
        ? { ...current, previousAdventureBalance: data.previousAdventureBalance }
        : current);
      return true;
    } catch {
      setToast("❌ Network error");
      return false;
    } finally {
      setIsProcessing(false);
    }
  }

  const adventureGroups = [...new Set(registrations.map((registration) => {
    const number = getAdventureNumber(registration);
    return number ? String(number) : "unassigned";
  }))].sort((left, right) => {
    if (left === "unassigned") return 1;
    if (right === "unassigned") return -1;
    return Number(left) - Number(right);
  });

  const registrationsForAdventure = registrations.filter((registration) => {
    const adventureNumber = getAdventureNumber(registration);
    return adventureFilter === "all" ||
      (adventureFilter === "unassigned" ? adventureNumber === null : adventureNumber === Number(adventureFilter));
  });

  const counts = {
    all: registrationsForAdventure.length,
    pending: registrationsForAdventure.filter(r => r.status === "pending").length,
    reserved: registrationsForAdventure.filter(r => r.status === "reserved" && !isRegExpired(r)).length,
    "early-bird": registrationsForAdventure.filter(r => r.status === "early-bird" && !isRegExpired(r)).length,
    expired: registrationsForAdventure.filter(isRegExpired).length,
    approved: registrationsForAdventure.filter(r => r.status === "approved").length,
    active: registrationsForAdventure.filter(r => r.status === "active").length,
    rejected: registrationsForAdventure.filter(r => r.status === "rejected").length,
  };

  const prospectiveLeads = leads.filter(l => l.status !== "converted" && l.status !== "archived");
  const inProgressLeadsCount = prospectiveLeads.filter(l => l.status === "in-progress" || (l as any).status === "new" || !l.status).length;
  const contactedLeadsCount = prospectiveLeads.filter(l => l.status === "contacted").length;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: `All Submitted (${counts.all})` },
    { key: "pending", label: `Pending (${counts.pending})` },
    { key: "reserved", label: `🔒 Reserved (${counts.reserved})` },
    { key: "early-bird", label: `🐣 Early Bird (${counts["early-bird"]})` },
    { key: "expired", label: `⏰ Expired Slots (${counts.expired})` },
    { key: "approved", label: `Approved (${counts.approved})` },
    { key: "active", label: `Active (${counts.active})` },
    { key: "rejected", label: `Rejected (${counts.rejected})` },
    { key: "leads", label: `📝 In-Progress Leads (${prospectiveLeads.length})` },
  ];

  const q = search.toLowerCase();

  const filtered = registrations.filter(r => {
    let matchStatus = false;
    if (filter === "all") {
      matchStatus = true;
    } else if (filter === "expired") {
      matchStatus = isRegExpired(r);
    } else if (filter === "early-bird") {
      matchStatus = r.status === "early-bird" && !isRegExpired(r);
    } else if (filter === "reserved") {
      matchStatus = r.status === "reserved" && !isRegExpired(r);
    } else {
      matchStatus = r.status === filter;
    }

    const matchProgram = programFilter === "all" || r.program === programFilter;
    const adventureNumber = getAdventureNumber(r);
    const matchAdventure = adventureFilter === "all" ||
      (adventureFilter === "unassigned" ? adventureNumber === null : adventureNumber === Number(adventureFilter));
    const matchSearch = !q ||
      `${r.childInfo.firstName} ${r.childInfo.lastName}`.toLowerCase().includes(q) ||
      r.parentInfo.name.toLowerCase().includes(q) ||
      getProgramLabel(r.program).toLowerCase().includes(q);
    return matchStatus && matchProgram && matchAdventure && matchSearch;
  });

  const registrationPageCount = Math.max(1, Math.ceil(filtered.length / registrationPageSize));
  const safeRegistrationPage = Math.min(registrationPage, registrationPageCount);
  const paginatedRegistrations = filtered.slice(
    (safeRegistrationPage - 1) * registrationPageSize,
    safeRegistrationPage * registrationPageSize,
  );
  useEffect(() => {
    setRegistrationPage(1);
  }, [filter, adventureFilter, search, programFilter, leadSubFilter, registrationPageSize]);

  useEffect(() => {
    if (registrationPage > registrationPageCount) setRegistrationPage(registrationPageCount);
  }, [registrationPage, registrationPageCount]);

  const filteredLeads = prospectiveLeads.filter(l => {
    const isLeadInProgress = l.status === "in-progress" || (l as any).status === "new" || !l.status;
    const matchSubFilter =
      leadSubFilter === "all" ||
      (leadSubFilter === "in-progress" ? isLeadInProgress : l.status === leadSubFilter);
    const matchProgram =
      programFilter === "all" ||
      l.selectedProgram === programFilter;
    const matchSearch =
      !q ||
      `${l.childInfo?.firstName || ""} ${l.childInfo?.lastName || ""}`.toLowerCase().includes(q) ||
      (l.childInfo?.nickname || "").toLowerCase().includes(q) ||
      (l.parentInfo?.name || "").toLowerCase().includes(q) ||
      (l.parentInfo?.email || "").toLowerCase().includes(q) ||
      (l.parentInfo?.phone || "").includes(q) ||
      (l.selectedProgram ? getProgramLabel(l.selectedProgram) : "").toLowerCase().includes(q);
    return matchSubFilter && matchProgram && matchSearch;
  });

  const leadPageCount = Math.max(1, Math.ceil(filteredLeads.length / leadPageSize));
  const safeLeadPage = Math.min(leadPage, leadPageCount);
  const paginatedLeads = filteredLeads.slice(
    (safeLeadPage - 1) * leadPageSize,
    safeLeadPage * leadPageSize,
  );
  useEffect(() => {
    setLeadPage(1);
  }, [leadSubFilter, search, programFilter, leadPageSize]);

  useEffect(() => {
    if (leadPage > leadPageCount) setLeadPage(leadPageCount);
  }, [leadPage, leadPageCount]);

  return (
    <>
      <AppShell title="Student Registrations">

        {/* Search + Program Filter */}
        <div className="mb-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-[13px] font-semibold text-[#334155] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#0033A0]/40 focus:ring-2 focus:ring-[#0033A0]/10 transition-all"
              placeholder={filter === "leads" ? "Search leads by child, parent name, email, phone..." : "Search by student name, parent name or program…"}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-2xl border border-slate-200 bg-white py-2.5 px-4 text-[13px] font-semibold text-[#334155] focus:outline-none focus:border-[#0033A0]/40 transition-all cursor-pointer"
            value={programFilter}
            onChange={e => setProgramFilter(e.target.value)}
          >
            <option value="all">All Programs</option>
            {Object.entries(PROGRAM_SLOTS).map(([programId, program]) => (
              <option key={programId} value={programId}>{program.name}</option>
            ))}
          </select>
        </div>

        {/* Unified registration filters */}
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {filter !== "leads" && adventureGroups.length > 0 && (
            <div className="pb-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#64748b]">Choose an Adventure</p>
                  <p className="mt-1 text-[11px] text-slate-500">Choose a cycle below. The report shows students, class times, spaces left, and unpaid reservations.</p>
                </div>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleGenerateAdventureSummary}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-[12px] font-extrabold text-white shadow-sm transition-colors hover:bg-[#002776] disabled:cursor-wait disabled:opacity-60"
                >
                  <span aria-hidden="true">🧾</span>
                  {isProcessing
                    ? "Preparing summary…"
                    : adventureFilter === "all"
                      ? "Generate All Adventures Summary"
                      : adventureFilter === "unassigned"
                        ? "Generate Untagged Cycle Summary"
                        : `Generate Adventure ${adventureFilter} Summary`}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: `All Adventures (${registrations.length})` },
                  ...adventureGroups.map((key) => ({
                    key,
                    label: key === "unassigned"
                      ? `Cycle not tagged (${registrations.filter((registration) => getAdventureNumber(registration) === null).length})`
                      : `Adventure ${key} (${registrations.filter((registration) => getAdventureNumber(registration) === Number(key)).length})`,
                  })),
                ].map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => {
                      setAdventureFilter(group.key);
                      setFilter("all");
                    }}
                    className={`rounded-xl px-3 py-1.5 text-[12px] font-bold transition-colors ${
                      adventureFilter === group.key
                        ? "bg-[#0033A0] text-white shadow-sm"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    {group.label}
                  </button>
                ))}
              {adventureFilter === "unassigned" && registrationsForAdventure.length > 0 && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleTagUntaggedAsAdventureOne}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-[12px] font-extrabold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60"
                >
                  {isProcessing ? "Tagging…" : `Tag ${registrationsForAdventure.length} as Adventure 1`}
                </button>
              )}
              </div>
            </div>
          )}
          <div className={`${filter !== "leads" && adventureGroups.length > 0 ? "border-t border-slate-100 pt-3" : ""}`}>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-[#64748b]">
              {filter === "leads" ? "Lead status" : "Registration status"}
              {filter !== "leads" && <span className="ml-2 font-semibold normal-case tracking-normal text-slate-400">Counts update for the selected Adventure</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={[
                    "rounded-xl px-3.5 py-2 text-[12px] font-bold transition-all duration-150",
                    filter === tab.key
                      ? "bg-[#0033A0] text-white shadow-md shadow-[#0033A0]/20"
                      : "bg-slate-50 border border-slate-200 text-[#64748b] hover:border-[#0033A0]/30",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── LEADS VIEW ── */}
        {filter === "leads" ? (
          <div className="space-y-4">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#94a3b8]">Total Started</span>
                <p className="mt-1 text-2xl font-black text-[#002f76]">{prospectiveLeads.length}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-sm">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">⏳ In Progress / Abandoned</span>
                <p className="mt-1 text-2xl font-black text-amber-800">
                  {inProgressLeadsCount}
                </p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5 shadow-sm">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0033A0]">📞 Followed Up</span>
                <p className="mt-1 text-2xl font-black text-[#0033A0]">
                  {contactedLeadsCount}
                </p>
              </div>
            </div>

            {/* Sub-filter chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { key: "all", label: `All Leads (${prospectiveLeads.length})` },
                { key: "in-progress", label: `⏳ In-Progress / Dropped Off (${inProgressLeadsCount})` },
                { key: "contacted", label: `📞 Followed Up (${contactedLeadsCount})` },
              ].map((sub) => (
                <button
                  key={sub.key}
                  onClick={() => setLeadSubFilter(sub.key as any)}
                  className={`rounded-xl px-3 py-1.5 text-[12px] font-bold transition-all ${
                    leadSubFilter === sub.key
                      ? "bg-[#002f76] text-white shadow-sm"
                      : "bg-white border border-slate-200 text-[#64748b] hover:bg-slate-50"
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Leads Table */}
            {filteredLeads.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white/70 text-center p-8">
                <span className="text-4xl mb-3">📝</span>
                <p className="text-[16px] font-bold text-[#0033A0]">No in-progress leads found</p>
                <p className="mt-1 text-[13px] text-[#64748b]">
                  {search ? "Try adjusting your search criteria." : "Leads will appear in real time as parents enter details and advance through registration."}
                </p>
              </div>
            ) : (
              <div className="rounded-[1.5rem] overflow-hidden border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-slate-200">
                      <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#94a3b8]">Student</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#94a3b8]">Parent Contact</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#94a3b8]">Furthest Step Reached</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#94a3b8]">Program Choice</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#94a3b8]">Status</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#94a3b8]">Last Active</th>
                      <th className="px-4 py-3.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLeads.map((lead, i) => {
                      const childTitle = [lead.childInfo?.firstName, lead.childInfo?.lastName].filter(Boolean).join(" ") || "Student (Unnamed)";
                      const stepInfo = LEAD_STEP_LABELS[lead.step] || {
                        label: lead.stepName || `Step ${lead.step}`,
                        badge: `Step ${lead.step}`,
                        color: "text-blue-800",
                        bg: "bg-blue-100",
                      };
                      const waUrl = formatWhatsAppUrl(lead.parentInfo?.phone, lead.parentInfo?.name, lead.childInfo?.firstName);

                      return (
                        <m.tr
                          key={lead.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => setSelectedLead(lead)}
                          className="border-b border-slate-100 last:border-0 hover:bg-[#f0f5ff] cursor-pointer transition-colors group"
                        >
                          {/* Student */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-8 w-1 rounded-full shrink-0"
                                style={{ backgroundColor: lead.selectedProgram && PROGRAM_ACCENTS[lead.selectedProgram] ? PROGRAM_ACCENTS[lead.selectedProgram] : "#0033A0" }}
                              />
                              <div>
                                <p className="font-extrabold text-[#002f76]">{childTitle}</p>
                                {lead.childInfo?.nickname && (
                                  <p className="text-[11px] text-[#94a3b8]">&quot;{lead.childInfo.nickname}&quot;</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Parent */}
                          <td className="px-5 py-4">
                            <p className="font-semibold text-[#334155]">{lead.parentInfo?.name || "No name"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-[#94a3b8]">{lead.parentInfo?.phone || lead.parentInfo?.email || "No contact"}</span>
                              {lead.parentInfo?.phone && (
                                <span className="inline-flex items-center gap-1">
                                  <a
                                    href={`tel:${lead.parentInfo.phone}`}
                                    onClick={e => e.stopPropagation()}
                                    title="Call Parent"
                                    className="text-[12px] hover:scale-125 transition-transform"
                                  >
                                    📞
                                  </a>
                                  {waUrl && (
                                    <a
                                      href={waUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      title="WhatsApp Parent"
                                      className="text-[12px] hover:scale-125 transition-transform"
                                    >
                                      💬
                                    </a>
                                  )}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Step Reached */}
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${stepInfo.bg} ${stepInfo.color}`}>
                                {stepInfo.label}
                              </span>
                              <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full bg-[#0033A0] rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(20, ((lead.step + 1) / 4) * 100))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Program Choice */}
                          <td className="px-5 py-4">
                            {lead.selectedProgram ? (
                              <div>
                                <span
                                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                                  style={{
                                    backgroundColor: `${PROGRAM_ACCENTS[lead.selectedProgram] || "#0033A0"}22`,
                                    color: PROGRAM_ACCENTS[lead.selectedProgram] || "#0033A0",
                                  }}
                                >
                                  {getProgramLabel(lead.selectedProgram)}
                                </span>
                                {lead.selectedClass && (
                                  <p className="text-[11px] text-[#64748b] mt-0.5 font-medium">{lead.selectedClass}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#94a3b8] italic">Not selected yet</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${LEAD_STATUS_STYLES[lead.status] || "bg-slate-100 text-slate-700"}`}>
                              {LEAD_STATUS_LABELS[lead.status] || lead.status}
                            </span>
                          </td>

                          {/* Last Active */}
                          <td className="px-5 py-4 text-[#94a3b8] font-medium text-[11px]">
                            {lead.updatedAt ? new Date(lead.updatedAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recently"}
                          </td>

                          {/* Arrow & Actions */}
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[#0033A0] group-hover:underline">
                                Follow Up
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                  <path d="m9 18 6-6-6-6" />
                                </svg>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteLead(lead.id);
                                }}
                                title="Delete Lead"
                                className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </m.tr>
                      );
                    })}
                  </tbody>
                </table>
                <TablePagination
                  total={filteredLeads.length}
                  page={safeLeadPage}
                  pageCount={leadPageCount}
                  pageSize={leadPageSize}
                  onPageChange={setLeadPage}
                  onPageSizeChange={setLeadPageSize}
                  itemLabel="leads"
                  ariaLabel="Registration lead pages"
                />
              </div>
            )}
          </div>
        ) : (
          /* ── REGISTRATIONS TABLE ── */
          loading && registrations.length === 0 ? (
            <div className="rounded-[1.5rem] overflow-hidden border border-slate-200 bg-white shadow-sm p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white/70 text-center p-8">
              <span className="text-4xl mb-3">📋</span>
              <p className="text-[16px] font-bold text-[#0033A0]">No registrations found</p>
              <p className="mt-1 text-[13px] text-[#64748b]">{search ? "Try a different search term." : "No registrations match these filters. Try All Submitted or choose another Adventure."}</p>
            </div>
          ) : (
            <div className="rounded-[1.5rem] overflow-hidden border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-slate-200">
                    <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#94a3b8]">Student</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#94a3b8]">Parent</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#94a3b8]">Program</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#94a3b8]">Class</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#94a3b8]">Status</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#94a3b8]">Submitted</th>
                    <th className="px-4 py-3.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRegistrations.map((reg, i) => (
                    <m.tr
                      key={reg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelected(reg)}
                      className="border-b border-slate-100 last:border-0 hover:bg-[#f0f5ff] cursor-pointer transition-colors group"
                    >
                      {/* Student */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-8 w-1 rounded-full shrink-0"
                            style={{ backgroundColor: PROGRAM_ACCENTS[reg.program] || "#64748b" }}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-extrabold text-[#002f76]">{reg.childInfo.firstName} {reg.childInfo.lastName}</p>
                              {isTestRegistration(reg) && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-500 border border-slate-200">
                                  TEST
                                </span>
                              )}
                            </div>
                            {reg.childInfo.nickname && <p className="text-[11px] text-[#94a3b8]">{reg.childInfo.nickname}</p>}
                            <span className="mt-1 inline-flex rounded-md border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#0033A0]">
                              {adventureLabel(reg)}
                            </span>
                            {reg.selfDeclaredPreviousAdventure && (
                              <span
                                className="mt-1 ml-1.5 inline-flex items-center gap-0.5 rounded-md border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-blue-800"
                                title={reg.detectedPreviousAdventure ? `Verified continuing student from Adventure ${reg.detectedPreviousAdventure}` : "Parent declared continuing from previous Adventure"}
                              >
                                🎒 Continuing {reg.detectedPreviousAdventure ? `(Adv ${reg.detectedPreviousAdventure})` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Parent */}
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#334155]">{reg.parentInfo.name}</p>
                        <p className="text-[11px] text-[#94a3b8]">{reg.parentInfo.phone}</p>
                      </td>
                      {/* Program */}
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                          style={{ backgroundColor: `${PROGRAM_ACCENTS[reg.program]}22`, color: PROGRAM_ACCENTS[reg.program] || "#334155" }}
                        >
                                  {getProgramLabel(reg.program)}
                        </span>
                      </td>
                      {/* Class */}
                      <td className="px-5 py-4 text-[#334155] font-semibold">{reg.classTime}</td>
                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isRegExpired(reg) ? STATUS_STYLES.expired : STATUS_STYLES[reg.status] || "bg-slate-100 text-slate-700"}`}>
                          {isRegExpired(reg) ? "⏰ Expired Slot" : STATUS_LABELS[reg.status] || reg.status}
                        </span>
                      </td>
                      {/* Submitted */}
                      <td className="px-5 py-4 text-[#94a3b8] font-medium">
                        {new Date(reg.submittedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      {/* Arrow */}
                      <td className="px-4 py-4">
                        <svg className="h-4 w-4 text-[#cbd5e1] group-hover:text-[#0033A0] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </td>
                    </m.tr>
                  ))}
                </tbody>
              </table>
              <TablePagination
                total={filtered.length}
                page={safeRegistrationPage}
                pageCount={registrationPageCount}
                pageSize={registrationPageSize}
                onPageChange={setRegistrationPage}
                onPageSizeChange={setRegistrationPageSize}
                itemLabel="registrations"
                ariaLabel="Student registration pages"
                context={adventureFilter === "all" ? "all Adventures" : adventureFilter === "unassigned" ? "untagged cycles" : `Adventure ${adventureFilter}`}
              />
            </div>
          )
        )}
      </AppShell>

      {/* Detail modal */}
      {selected && (
        <DetailModal
          reg={selected}
          allRegistrations={registrations}
          onRefreshRegistrations={fetchRegistrations}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onEarlyBird={handleEarlyBird}
          onOpenPayment={handleOpenPayment}
          onSavePreviousAdventureBalance={handleSavePreviousAdventureBalance}
          isProcessing={isProcessing}
        />
      )}

      {/* Lead detail modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleUpdateLead}
          onDelete={handleDeleteLead}
          isProcessing={isProcessing}
        />
      )}

      {/* ── Delete Lead Confirm Modal ── */}
      <AnimatePresence>
        {deleteConfirmLeadId && (
          <m.div
            key="delete-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <m.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="bg-white rounded-[24px] shadow-[0_24px_60px_rgba(0,0,0,0.18)] border border-slate-100 w-full max-w-sm p-6 flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-[28px] mb-4">
                🗑️
              </div>
              <h3 className="text-[17px] font-extrabold text-[#1e293b] mb-1">Delete This Lead?</h3>
              <p className="text-[13px] text-[#64748b] font-medium leading-relaxed mb-6">
                This will <span className="font-bold text-red-600">permanently delete</span> the lead record.
                This action <span className="font-bold">cannot be undone</span>.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirmLeadId(null)}
                  disabled={isProcessing}
                  className="flex-1 rounded-2xl border-2 border-slate-200 bg-slate-50 py-3 text-[14px] font-bold text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeDeleteLead(deleteConfirmLeadId)}
                  disabled={isProcessing}
                  className="flex-1 rounded-2xl bg-red-500 py-3 text-[14px] font-extrabold text-white shadow-[0_4px_0_#b91c1c] hover:bg-red-600 active:shadow-none active:translate-y-[2px] transition-all disabled:opacity-50"
                >
                  {isProcessing ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <m.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0033A0] px-6 py-3 text-[14px] font-bold text-white shadow-xl shadow-[#0033A0]/25 whitespace-nowrap flex items-center justify-center"
          >
            {toast}
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
