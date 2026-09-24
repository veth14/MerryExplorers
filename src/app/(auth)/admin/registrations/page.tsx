"use client";

import { useEffect, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { PROGRAM_SLOTS, UNIFORM_KIT } from "@/data/landing";

type Status = "pending" | "approved" | "rejected";

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
  referenceNumber?: string;
  receiptUrl: string;
  signatureUrl?: string;
  photoConsent?: string;
  uniformOrdered: boolean;
  submittedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  confirmationEmailSent?: boolean;
}

const PROGRAM_NAMES: Record<string, string> = {
  "curious-explorer": "Curious Explorer",
  "everyday-curious": "Everyday Curious",
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
};

const STATUS_LABELS: Record<Status, string> = {
  pending: "⏳ Pending",
  approved: "✅ Approved",
  rejected: "❌ Rejected",
};

type FilterTab = "all" | Status;

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
  reg, onClose, onApprove, onReject, isProcessing,
}: {
  reg: Registration;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  isProcessing: boolean;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState("");
  const accent = PROGRAM_ACCENTS[reg.program] || "#0033A0";
  
  // Calculate true remaining balance for the whole program
  const programDetails = PROGRAM_SLOTS[reg.program as keyof typeof PROGRAM_SLOTS];
  const totalCost = programDetails ? programDetails.rate + (reg.uniformOrdered ? UNIFORM_KIT.price : 0) : null;
  const realRemainingBalance = totalCost ? totalCost - (reg.amountPaid || 0) : null;

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
              <InfoRow label={reg.paymentType === "full" ? "Amount Due" : "Required Downpayment"} value={reg.amountDue ? `₱${reg.amountDue.toLocaleString()}` : "—"} />
              <InfoRow label="Amount Paid" value={reg.amountPaid ? `₱${reg.amountPaid.toLocaleString()}` : "—"} highlight={reg.amountPaid && reg.amountDue && reg.amountPaid >= reg.amountDue ? "green" : undefined} />
              
              {reg.paymentType !== "full" && realRemainingBalance !== null && (
                <InfoRow 
                  label="Remaining Balance" 
                  value={`₱${Math.max(0, realRemainingBalance).toLocaleString()}`} 
                  highlight="red" 
                />
              )}

              {reg.creditBalance && reg.creditBalance > 0 ? (
                <InfoRow label="Credit Balance (Overpaid vs Required)" value={`+₱${reg.creditBalance.toLocaleString()}`} highlight="green" />
              ) : null}
              <InfoRow label="Reference No." value={reg.referenceNumber || "—"} />
            </SectionCard>

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
          {reg.status === "pending" && (
            <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {!rejectMode ? (
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


// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminRegistrationsPage() {
  const { user, userProfile } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [selected, setSelected] = useState<Registration | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => { fetchRegistrations(); }, []);

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

  const counts = {
    all: registrations.length,
    pending: registrations.filter(r => r.status === "pending").length,
    approved: registrations.filter(r => r.status === "approved").length,
    rejected: registrations.filter(r => r.status === "rejected").length,
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "pending", label: `Pending (${counts.pending})` },
    { key: "approved", label: `Approved (${counts.approved})` },
    { key: "rejected", label: `Rejected (${counts.rejected})` },
    { key: "all", label: `All (${counts.all})` },
  ];

  const q = search.toLowerCase();
  const filtered = registrations.filter(r => {
    const matchStatus = filter === "all" || r.status === filter;
    const matchProgram = programFilter === "all" || r.program === programFilter;
    const matchSearch = !q ||
      `${r.childInfo.firstName} ${r.childInfo.lastName}`.toLowerCase().includes(q) ||
      r.parentInfo.name.toLowerCase().includes(q) ||
      (PROGRAM_NAMES[r.program] || r.program).toLowerCase().includes(q);
    return matchStatus && matchProgram && matchSearch;
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
              placeholder="Search by student name, parent name or program…"
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
            <option value="everyday-curious">Everyday Curious</option>
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

        {loading ? (
          <div className="flex h-64 items-center justify-center text-[#64748b] animate-pulse">Loading registrations...</div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white/70 text-center p-8">
            <span className="text-4xl mb-3">📋</span>
            <p className="text-[16px] font-bold text-[#0033A0]">No registrations found</p>
            <p className="mt-1 text-[13px] text-[#64748b]">{search ? "Try a different search term." : "New registrations will appear here once submitted."}</p>
          </div>
        ) : (
          /* ── Table ── */
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
                          <p className="font-extrabold text-[#002f76]">{reg.childInfo.firstName} {reg.childInfo.lastName}</p>
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
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[reg.status]}`}>
                        {STATUS_LABELS[reg.status]}
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
        )}
      </AppShell>

      {/* Detail modal */}
      {selected && (
        <DetailModal
          reg={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          isProcessing={isProcessing}
        />
      )}

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
