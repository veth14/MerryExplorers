"use client";

import { useEffect, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { PROGRAM_SLOTS, UNIFORM_KIT } from "@/data/landing";

type Status = "pending" | "approved" | "rejected" | "early-bird" | "expired" | "reserved";

interface Registration {
  id: string;
  status: Status;
  program: string;
  classTime: string;
  parentInfo: { name: string; email: string; phone: string; relationship: string };
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

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  "early-bird": "bg-orange-100 text-orange-700",
  expired: "bg-rose-100 text-rose-700",
  reserved: "bg-blue-100 text-blue-700",
};

const STATUS_LABELS: Record<Status, string> = {
  pending: "⏳ Pending",
  approved: "✅ Approved",
  rejected: "❌ Rejected",
  "early-bird": "🐣 Early Bird",
  expired: "⏰ Expired Slot",
  reserved: "🔒 Slot Reserved",
};

function isRegExpired(r: Registration): boolean {
  if (r.status === "expired") return true;
  const now = new Date();
  if (r.status === "reserved" && r.reservedUntil && new Date(r.reservedUntil) < now) return true;
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
}

const LEAD_STEP_LABELS: Record<number, { label: string; badge: string; color: string; bg: string }> = {
  0: { label: "Step 0: Parent & Child Details", badge: "Details", color: "text-amber-800", bg: "bg-amber-100" },
  1: { label: "Step 1: Program & Class Choice", badge: "Program Selection", color: "text-blue-800", bg: "bg-blue-100" },
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
      <span className={`text-[13px] font-bold text-right break-words ${highlightCls}`}>{value}</span>
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
  reg, onClose, onApprove, onReject, onEarlyBird, onOpenPayment, onSavePreviousAdventureBalance, isProcessing,
}: {
  reg: Registration;
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
  const isEarlyBird = reg.status === "early-bird";
  const isPending = reg.status === "pending";
  const isReserved = (reg as any).status === "reserved" || (reg as any).status === "expired";
  const hasAdventureCycle = !["ballet", "virtual-session", "saturday-playdate"].includes(reg.program);
  
  // Calculate true remaining balance for the whole program
  const programDetails = PROGRAM_SLOTS[reg.program as keyof typeof PROGRAM_SLOTS];
  const isPioneer = Boolean(reg.isPioneer);
  const effectiveProgramRate = reg.customRate || (isPioneer && reg.program === "creative-explorer" ? 4820 : (isPioneer && reg.program === "curious-explorer" ? 4295 : (programDetails ? programDetails.rate : 0)));
  const totalCost = effectiveProgramRate > 0 ? effectiveProgramRate + (!isPioneer && reg.uniformOrdered ? UNIFORM_KIT.price : 0) : null;
  const realRemainingBalance = totalCost !== null ? totalCost - (reg.amountPaid || 0) : null;
  const requiredDownpayment = effectiveProgramRate > 0 ? Math.round(effectiveProgramRate * 0.6) : (programDetails ? programDetails.downpayment : 0);

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
                <span style={{ color: accent }}>{PROGRAM_NAMES[reg.program] || reg.program}</span>
                <span>•</span>
                <span>{reg.classTime}</span>
              </div>

              {/* Status + submitted */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold shadow-sm ${STATUS_STYLES[reg.status]}`}>
                  {STATUS_LABELS[reg.status]}
                </span>
                {isPioneer && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800 shadow-sm">
                    ⭐ Pioneer Family
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
              </div>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

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
                label={reg.paymentType === "full" ? "Amount Due" : "Required Downpayment"} 
                value={
                  reg.amountDue && reg.amountDue > 0
                    ? `₱${reg.amountDue.toLocaleString()}` 
                    : (requiredDownpayment > 0 ? `₱${requiredDownpayment.toLocaleString()} (60% Downpayment)` : "—")
                } 
              />
              <InfoRow label="Amount Paid" value={reg.amountPaid ? `₱${reg.amountPaid.toLocaleString()}` : "—"} highlight={reg.amountPaid && reg.amountDue && reg.amountPaid >= reg.amountDue ? "green" : undefined} />
              
              {reg.paymentType !== "full" && realRemainingBalance !== null && (
                <InfoRow 
                  label="Remaining Balance" 
                  value={`₱${Math.max(0, realRemainingBalance).toLocaleString()}${isPioneer ? " (Pioneer Rate)" : ""}`} 
                  highlight="red" 
                />
              )}

              {reg.creditBalance && reg.creditBalance > 0 ? (
                <InfoRow label="Credit Balance (Overpaid vs Required)" value={`+₱${reg.creditBalance.toLocaleString()}`} highlight="green" />
              ) : null}
              <InfoRow label="Reference No." value={reg.referenceNumber || "—"} />
            </SectionCard>

            {hasAdventureCycle && <SectionCard emoji="🧾" title="Previous Adventure Balance">
              <p className="py-3 text-xs leading-relaxed text-slate-500">
                Unpaid amount carried over from Adventure 1. This is tracked separately and does not change this registration’s Adventure 2 payment or balance.
              </p>
              {!editingPreviousBalance ? (
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 py-3">
                  <span className="text-[12px] font-semibold text-[#94a3b8]">Adventure 1 unpaid</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-[13px] font-bold ${reg.previousAdventureBalance ? "text-red-600" : "text-slate-500"}`}>
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
              ) : (
                <div className="space-y-3 border-t border-slate-100 py-3">
                  <label className="block text-xs font-semibold text-slate-600" htmlFor="previous-adventure-balance">
                    Adventure 1 unpaid balance (₱)
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
  const [currentStatus, setCurrentStatus] = useState(lead.status || "in-progress");
  const [notes, setNotes] = useState(lead.notes || "");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const accent = lead.selectedProgram && PROGRAM_ACCENTS[lead.selectedProgram]
    ? PROGRAM_ACCENTS[lead.selectedProgram]
    : "#0033A0";

  const childName = [lead.childInfo?.firstName, lead.childInfo?.lastName].filter(Boolean).join(" ") || "Prospective Student";
  const parentPhone = lead.parentInfo?.phone;
  const parentEmail = lead.parentInfo?.email;
  const whatsAppUrl = formatWhatsAppUrl(parentPhone, lead.parentInfo?.name, lead.childInfo?.firstName);

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
          className="pointer-events-auto w-full md:max-w-xl md:rounded-[2rem] bg-[#f4f7fb] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] md:shadow-[0_30px_80px_rgba(0,0,0,0.2)] flex flex-col max-h-[92dvh] md:max-h-[88vh] rounded-t-[2rem] border-t-[8px] overflow-hidden"
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
              <div className="mt-1 flex items-center gap-2 text-[11px] text-[#94a3b8]">
                <span>Last active: {lead.updatedAt ? new Date(lead.updatedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "Recently"}</span>
              </div>
            </div>
          </div>

          {/* ── Direct Action Buttons ── */}
          <div className="bg-[#eef4ff] px-6 py-2.5 border-b border-slate-100 flex flex-wrap gap-2 items-center justify-between">
            <span className="text-[12px] font-bold text-[#0033A0]">Quick Contact:</span>
            <div className="flex flex-wrap gap-2">
              {parentPhone && (
                <>
                  <a
                    href={`tel:${parentPhone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[12px] font-bold text-[#0033A0] shadow-sm hover:bg-[#0033A0] hover:text-white transition-all"
                  >
                    📞 Call
                  </a>
                  {whatsAppUrl && (
                    <a
                      href={whatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 text-white text-[12px] font-bold shadow-sm hover:bg-green-700 transition-all"
                    >
                      💬 WhatsApp
                    </a>
                  )}
                </>
              )}
              {parentEmail && (
                <a
                  href={`mailto:${parentEmail}?subject=${encodeURIComponent("Merry Explorers Registration Assistance")}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[12px] font-bold text-[#334155] shadow-sm hover:bg-slate-50 transition-all"
                >
                  ✉️ Email
                </a>
              )}
            </div>
          </div>

          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

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
              {lead.emergencyContact?.name && (
                <>
                  <InfoRow label="Emergency Contact" value={lead.emergencyContact.name} />
                  <InfoRow label="Emergency Phone" value={lead.emergencyContact.phone || "—"} />
                </>
              )}
            </SectionCard>

            {/* Selections made so far */}
            <SectionCard emoji="🎯" title="Program & Options Reached">
              <InfoRow
                label="Selected Program"
                value={lead.selectedProgram ? (PROGRAM_NAMES[lead.selectedProgram] || lead.selectedProgram) : "Not selected yet"}
                highlight={lead.selectedProgram ? "blue" : undefined}
              />
              <InfoRow
                label="Selected Class"
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

            <div className="h-2" />
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
  const { user, userProfile } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [leadSubFilter, setLeadSubFilter] = useState<"all" | "in-progress" | "contacted">("all");
  const [selected, setSelected] = useState<Registration | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState("");
  const [deleteConfirmLeadId, setDeleteConfirmLeadId] = useState<string | null>(null);

  useEffect(() => {
    fetchRegistrations();
    fetchLeads();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function fetchRegistrations() {
    try {
      const res = await fetch("/api/registrations");
      const data = await res.json();
      if (data.success) setRegistrations(data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function fetchLeads() {
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (data.success) setLeads(data.data);
    } catch { /* ignore */ }
  }

  async function handleUpdateLead(id: string, status: string, notes: string) {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`/api/leads?id=${id}`, { method: "DELETE" });
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

  const counts = {
    all: registrations.length,
    pending: registrations.filter(r => r.status === "pending").length,
    reserved: registrations.filter(r => r.status === "reserved" && !isRegExpired(r)).length,
    "early-bird": registrations.filter(r => r.status === "early-bird" && !isRegExpired(r)).length,
    expired: registrations.filter(isRegExpired).length,
    approved: registrations.filter(r => r.status === "approved").length,
    rejected: registrations.filter(r => r.status === "rejected").length,
  };

  const prospectiveLeads = leads.filter(l => l.status !== "converted" && l.status !== "archived");
  const inProgressLeadsCount = prospectiveLeads.filter(l => l.status === "in-progress" || (l as any).status === "new" || !l.status).length;
  const contactedLeadsCount = prospectiveLeads.filter(l => l.status === "contacted").length;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "pending", label: `Pending (${counts.pending})` },
    { key: "reserved", label: `🔒 Reserved (${counts.reserved})` },
    { key: "early-bird", label: `🐣 Early Bird (${counts["early-bird"]})` },
    { key: "expired", label: `⏰ Expired Slots (${counts.expired})` },
    { key: "approved", label: `Approved (${counts.approved})` },
    { key: "rejected", label: `Rejected (${counts.rejected})` },
    { key: "leads", label: `📝 In-Progress Leads (${prospectiveLeads.length})` },
    { key: "all", label: `All Submitted (${counts.all})` },
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
    const matchSearch = !q ||
      `${r.childInfo.firstName} ${r.childInfo.lastName}`.toLowerCase().includes(q) ||
      r.parentInfo.name.toLowerCase().includes(q) ||
      (PROGRAM_NAMES[r.program] || r.program).toLowerCase().includes(q);
    return matchStatus && matchProgram && matchSearch;
  });

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
      (PROGRAM_NAMES[l.selectedProgram || ""] || l.selectedProgram || "").toLowerCase().includes(q);
    return matchSubFilter && matchProgram && matchSearch;
  });

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
            <option value="curious-explorer">Curious Explorer</option>
            <option value="everyday-curious">Everyday Explorer</option>
            <option value="creative-explorer">Creative Explorer</option>
            <option value="brave-explorer">Brave Explorer</option>
            <option value="ballet">Ballet</option>
          </select>
        </div>

        {/* Filter tabs */}
        <div className="mb-5 flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={[
                "rounded-2xl px-4 py-2 text-[13px] font-bold transition-all duration-150",
                filter === tab.key
                  ? "bg-[#0033A0] text-white shadow-md shadow-[#0033A0]/20"
                  : "bg-white border border-slate-200 text-[#64748b] hover:border-[#0033A0]/30",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

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
                    {filteredLeads.map((lead, i) => {
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
                                  <p className="text-[11px] text-[#94a3b8]">"{lead.childInfo.nickname}"</p>
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
                                  {PROGRAM_NAMES[lead.selectedProgram] || lead.selectedProgram}
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
                <div className="px-5 py-3 bg-[#f8fafc] border-t border-slate-200 text-[12px] font-semibold text-[#94a3b8]">
                  {`Showing ${filteredLeads.length} of ${prospectiveLeads.length} lead${prospectiveLeads.length !== 1 ? "s" : ""}`}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── REGISTRATIONS TABLE ── */
          loading ? (
            <div className="flex h-64 items-center justify-center text-[#64748b] animate-pulse">Loading registrations...</div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white/70 text-center p-8">
              <span className="text-4xl mb-3">📋</span>
              <p className="text-[16px] font-bold text-[#0033A0]">No registrations found</p>
              <p className="mt-1 text-[13px] text-[#64748b]">{search ? "Try a different search term." : "New registrations will appear here once submitted."}</p>
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
                  {filtered.map((reg, i) => (
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
                          {PROGRAM_NAMES[reg.program] || reg.program}
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
              <div className="px-5 py-3 bg-[#f8fafc] border-t border-slate-200 text-[12px] font-semibold text-[#94a3b8]">
                Showing {filtered.length} of {registrations.length} registration{registrations.length !== 1 ? "s" : ""}
              </div>
            </div>
          )
        )}
      </AppShell>

      {/* Detail modal */}
      {selected && (
        <DetailModal
          reg={selected}
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
