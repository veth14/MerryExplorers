"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { PROGRAM_SLOTS, UNIFORM_KIT } from "@/data/landing";
import { SiteFooter } from "@/components/landing/site-footer";
import SignatureCanvas from "react-signature-canvas";

type ProgramId = keyof typeof PROGRAM_SLOTS;
type SlotData = Record<string, Record<string, { maxSlots: number; taken: number; available: number }>>;

// Steps: 0 = Welcome/Confirm, 1 = Program, 2 = Consents, 3 = Review
const STEPS = ["Confirm", "Program", "Consents", "Review"];

const inputCls =
  "w-full bg-[#f8fafc] border-2 border-transparent rounded-2xl px-4 py-3.5 text-[14px] font-semibold text-[#002f76] placeholder:text-[#94a3b8] placeholder:font-medium focus:outline-none focus:border-[#0033A0]/30 focus:bg-white transition-all";
const labelCls = "block text-[12px] font-bold uppercase tracking-widest text-[#0033A0]/60 mb-1.5";

function StepDot({ label, index, current }: { label: string; index: number; current: number }) {
  const done = index < current;
  const active = index === current;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-extrabold transition-all duration-300",
          done
            ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
            : active
              ? "bg-[#0033A0] text-white shadow-lg shadow-[#0033A0]/30 scale-110"
              : "bg-slate-100 text-[#94a3b8]",
        ].join(" ")}
      >
        {done ? "✓" : index + 1}
      </div>
      <span className={`text-[10px] font-bold ${active ? "text-[#0033A0]" : "text-[#94a3b8]"}`}>{label}</span>
    </div>
  );
}

function SlotPill({ available, max }: { available: number; max: number }) {
  if (max >= 900) return <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-green-100 text-green-700">Available</span>;
  const pct = available / max;
  const color = pct === 0 ? "bg-red-100 text-red-600" : pct <= 0.3 ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-700";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${color}`}>
      {available === 0 ? "Full" : `${available} slot${available !== 1 ? "s" : ""} left`}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-[12px] font-bold uppercase tracking-wider text-[#94a3b8]">{label}</span>
      <span className="text-[14px] font-semibold text-[#002f76] text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );
}

export default function RenewPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);

  // Prefill state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [prefillData, setPrefillData] = useState<any>(null);

  // Derived from prefill
  const [childInfo, setChildInfo] = useState<any>(null);
  const [parentInfo, setParentInfo] = useState<any>(null);
  const [emergencyContact, setEmergencyContact] = useState<any>(null);
  const [previousProgram, setPreviousProgram] = useState("");

  // Program selection
  const [selectedProgram, setSelectedProgram] = useState<ProgramId | "">("");
  const [selectedClass, setSelectedClass] = useState("");
  const [activeTab, setActiveTab] = useState("discovery");
  const [slots, setSlots] = useState<SlotData>({});
  const [uniformDayAcknowledged, setUniformDayAcknowledged] = useState(false);
  const [uniformOrdered, setUniformOrdered] = useState(false);
  const [lanyardOrdered, setLanyardOrdered] = useState(false);

  // Consents
  const [photoConsent, setPhotoConsent] = useState("");
  const [waiverRead, setWaiverRead] = useState(false);
  const [waiverModalOpen, setWaiverModalOpen] = useState(false);
  const [waiverScrolled, setWaiverScrolled] = useState(false);
  const [signatureBase64, setSignatureBase64] = useState("");
  const sigCanvas = useRef<SignatureCanvas>(null);
  const waiverScrollRef = useRef<HTMLDivElement>(null);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => { setMounted(true); }, []);

  // Fetch prefill data from URL param
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    const email = urlParams.get("email");

    if (!ref && !email) {
      setLoadError("Invalid link. Please use the link from your priority email.");
      setLoading(false);
      return;
    }

    const query = ref ? `ref=${encodeURIComponent(ref)}` : `email=${encodeURIComponent(email || "")}`;
    fetch(`/api/registrations/prefill?${query}`)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          const d = result.data;
          setPrefillData(d);
          setChildInfo(d.childInfo);
          setParentInfo(d.parentInfo);
          setEmergencyContact(d.emergencyContact);
          setPreviousProgram(d.previousProgram || "Trailblazer: Brave Explorer");
        } else {
          setLoadError("We couldn't find your registration record. Please contact Teacher Kyle or Teacher Angel.");
        }
      })
      .catch(() => setLoadError("Network error. Please check your connection and try again."))
      .finally(() => setLoading(false));
  }, []);

  // Fetch slot counts
  useEffect(() => {
    fetch("/api/registrations/slots")
      .then(r => r.json())
      .then(d => { if (d.success) setSlots(d.data); })
      .catch(() => { });
  }, []);

  const prog = selectedProgram ? PROGRAM_SLOTS[selectedProgram] : null;
  const programSlots = prog && slots[prog.id] ? slots[prog.id] : {};

  const addonCost = (uniformOrdered ? UNIFORM_KIT.price : 0) + (lanyardOrdered ? UNIFORM_KIT.lanyardPrice : 0);
  const amountDue = prog ? prog.downpayment + addonCost : 0;

  const canProceedStep1 = selectedProgram !== "" && selectedClass !== "" && uniformDayAcknowledged;
  const canProceedStep2 = photoConsent !== "" && (selectedProgram === "brave-explorer" || (waiverRead && signatureBase64 !== ""));

  async function handleSubmit() {
    if (!childInfo || !parentInfo) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program: selectedProgram,
          classTime: selectedClass,
          parentInfo,
          childInfo,
          emergencyContact,
          photoConsent,
          signatureBase64,
          promoCode: "A1RENEWAL2026",
          isPromoRegistration: true,
          isNewFamily: false,
          uniformOrdered,
          lanyardOrdered,
          welcomeKitOrdered: false, // Returning families never get welcome kit
        }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = `/register/payment/${data.data.id}`;
      } else {
        setSubmitError(data.error || "Submission failed. Please try again.");
      }
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f4ff] to-[#fff8e7] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-full border-4 border-[#0033A0] border-t-transparent animate-spin mx-auto" />
          <p className="text-[15px] font-semibold text-[#0033A0]">Loading your registration details…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f4ff] to-[#fff8e7] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center space-y-4">
          <div className="text-5xl">😔</div>
          <h2 className="font-bold text-[20px] text-[#002f76]">Link Not Found</h2>
          <p className="text-[14px] text-[#64748b] leading-relaxed">{loadError}</p>
          <p className="text-[13px] text-[#94a3b8]">Need help? Ask <strong>Teacher Kyle</strong> or <strong>Teacher Angel</strong> onsite.</p>
        </div>
      </div>
    );
  }

  const childName = childInfo ? `${childInfo.firstName} ${childInfo.lastName}`.trim() : "Your Explorer";
  const childNick = childInfo?.nickname || childInfo?.firstName || "Explorer";

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-[#f0f4ff] via-white to-[#fff8e7]"
    >
      {/* Waiver Modal */}
      {waiverModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 shrink-0 flex items-center justify-between">
              <h3 className="font-bold text-[16px] text-[#002f76]">Parent/Guardian Acknowledgment & Agreement</h3>
              <button onClick={() => setWaiverModalOpen(false)} className="text-[#94a3b8] hover:text-slate-600 text-[20px]">×</button>
            </div>
            <div
              ref={waiverScrollRef}
              className="flex-1 overflow-y-auto px-8 py-6 text-[13px] text-[#334155] leading-[1.8] space-y-5"
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollHeight - el.scrollTop <= el.clientHeight + 60) setWaiverScrolled(true);
              }}
            >
              <p className="font-extrabold text-[15px] text-[#002f76] text-center border-b border-slate-100 pb-4">MERRY EXPLORERS PLAYGROUP LEARNING CENTER</p>
              <p className="text-center font-bold text-[13px] text-[#0033A0]">PARENT/GUARDIAN ACKNOWLEDGMENT & AGREEMENT</p>
              <p className="text-[12px] text-[#64748b] italic text-center">By registering my child with Merry Explorers Playgroup Learning Center, I confirm that I have read, understood, and agree to the following program terms and policies:</p>
              <div className="space-y-1">
                <p className="font-extrabold text-[#002f76]">1. ADVENTURE / CYCLE</p>
                <p>For Merry Explorers, &quot;Adventure&quot; means &quot;Cycle.&quot; Adventure 1, Adventure 2, Adventure 3, and so on refer to the succeeding stages of the program.</p>
              </div>
              <div className="space-y-2">
                <p className="font-extrabold text-[#002f76]">2. REGISTRATION & PAYMENT</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>60% reservation payment is required upon registration to secure the child&apos;s slot.</li>
                  <li>The 60% reservation payment is non-refundable once the slot is confirmed.</li>
                  <li>The remaining 40% balance is due on the 6th session.</li>
                  <li>A 4% interest charge will apply to overdue outstanding balances beginning September 10, 2026. Interest is on a <strong>weekly basis applied every Monday</strong>.</li>
                  <li>We will only accept Bank Transfer and GCash payments.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-extrabold text-[#002f76]">3. ATTENDANCE & MAKE-UP SESSIONS</p>
                <p>We know that schedules can sometimes change, so we&apos;ve made each program&apos;s make-up arrangement as simple and predictable as possible.</p>
                <p>💡 <strong>Trailblazer: Brave Explorer</strong> — A suspended face-to-face session will shift online.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Online session: 45 minutes</li>
                  <li>Practice worksheets will be provided</li>
                  <li>The online shift is considered a consumed session</li>
                </ul>
                <p>💛 <strong>Complimentary Free Session for All Explorers</strong> — For an excused missed session (sickness or other valid reasons), each child receives 1 complimentary session per Adventure.</p>
              </div>
              <div className="space-y-2">
                <p className="font-extrabold text-[#002f76]">4. UNIFORMS</p>
                <p>The Merry Explorers uniform is the <strong>SAME uniform</strong>. If your child already has a Merry Explorers uniform, you are <strong>NOT required</strong> to purchase a new set.</p>
                <p><strong>Uniform Days:</strong> Wednesday & Friday.</p>
              </div>
              <div className="rounded-2xl bg-[#f8fafc] border border-slate-200 p-5 space-y-2">
                <p className="font-extrabold text-[#002f76] text-[14px]">PARENT/GUARDIAN ACKNOWLEDGMENT</p>
                <p>I, the undersigned Parent/Guardian, confirm that I have read, understood, and voluntarily agree to all terms and policies stated in this Agreement.</p>
              </div>
              <div className="h-4" />
            </div>
            <div className="px-8 py-5 border-t border-slate-100 shrink-0 flex items-center gap-3">
              <button onClick={() => setWaiverModalOpen(false)} className="flex-1 rounded-2xl border border-slate-200 py-3 text-[14px] font-bold text-[#64748b] hover:bg-slate-50 transition-colors">Close</button>
              <button
                disabled={!waiverScrolled}
                onClick={() => { setWaiverRead(true); setWaiverModalOpen(false); }}
                className={`flex-1 rounded-2xl py-3 text-[14px] font-bold text-white transition-all ${waiverScrolled ? "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20" : "bg-slate-300 cursor-not-allowed"}`}
              >
                {waiverScrolled ? "✓ I Accept the Waiver" : "↓ Scroll to Accept"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div aria-hidden className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#0033A0] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.07]" />
        <div aria-hidden className="absolute top-40 -right-20 w-[500px] h-[500px] bg-[#FFC107] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.1]" />
      </div>

      {/* Header */}
      <header className="relative z-50 bg-white/60 border-b border-black/5 sticky top-0 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-[900px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 transition-transform hover:scale-[0.98]">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl">
              <Image src="/LOGO-noBG.png" alt="Merry Explorers Logo" fill sizes="40px" className="object-contain" />
            </div>
            <span className="flex flex-col leading-none">
              <span className="font-headline text-[18px] font-extrabold tracking-tight text-[#0033A0]">Merry</span>
              <span className="font-headline text-[12px] font-bold tracking-[0.12em] text-[#FFB800]">Explorers</span>
            </span>
          </Link>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0033A0]/50">Priority Renewal</p>
            <p className="text-[13px] font-extrabold text-[#002f76]">Adventure 2 Registration</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[900px] px-4 sm:px-6 py-8 sm:py-12">
        {/* Step Indicator */}
        {step < 4 && (
          <div className="mb-8 bg-white/70 backdrop-blur-xl rounded-3xl p-5 shadow-sm border border-white">
            <div className="flex items-center justify-between px-2">
              {STEPS.map((label, i) => (
                <div key={label} className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
                  <StepDot label={label} index={i} current={step} />
                  {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-3 rounded-full transition-all duration-500 ${i < step ? "bg-green-400" : "bg-slate-200"}`} />}
                </div>
              ))}
            </div>
          </div>
        )}

        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-12 shadow-[0_24px_80px_rgba(0,51,160,0.06)] border border-white"
        >
          <AnimatePresence mode="wait">

            {/* ── STEP 0: Welcome & Confirm ────────────────────────────────── */}
            {step === 0 && (
              <m.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>

                {/* Welcome banner */}
                <div className="mb-8 rounded-3xl bg-gradient-to-r from-[#002f76] to-[#0050d5] p-6 sm:p-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#FFB800]/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="rounded-full bg-[#FFB800] text-[#002f76] px-3 py-0.5 text-[11px] font-black uppercase tracking-wider">
                        🌟 2026 ADVENTURE 2
                      </span>
                      <p className="text-[12px] font-bold uppercase tracking-widest text-[#FFB800]">Priority Renewal Access</p>
                    </div>
                    <h1 className="font-headline text-[28px] sm:text-[32px] font-extrabold leading-tight mb-2">
                      Hello, {childNick}!
                    </h1>
                    <p className="text-[14px] text-white/90 leading-relaxed">
                      We&apos;re so excited to welcome you to <strong>Adventure 2</strong>! Your details from <strong>Adventure 1</strong> are already verified below — simply review and choose your <strong>Adventure 2</strong> schedule.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3 py-1.5 text-[12px] font-bold">
                      <span className="h-2 w-2 rounded-full bg-[#FFB800] shrink-0" />
                      Adventure 2 Priority Reservation Code: Already Applied ✓
                    </div>
                  </div>
                </div>

                {/* Child info summary */}
                <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-headline text-[16px] font-extrabold text-[#0033A0] mb-4">🧒 Explorer Details</h3>
                  <div className="space-y-0.5">
                    <InfoRow label="Full Name" value={childName} />
                    <InfoRow label="Nickname" value={childInfo?.nickname || childInfo?.firstName || "—"} />
                    <InfoRow label="Date of Birth" value={childInfo?.dateOfBirth ? new Date(childInfo.dateOfBirth).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "—"} />
                    <InfoRow label="Gender" value={childInfo?.gender || "—"} />
                    <InfoRow label="Health Profile" value={childInfo?.healthProfile || "None"} />
                  </div>
                </div>

                {/* Parent info summary */}
                <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-headline text-[16px] font-extrabold text-[#0033A0] mb-4">👨‍👩‍👧 Parent / Guardian</h3>
                  <div className="space-y-0.5">
                    <InfoRow label="Name" value={parentInfo?.name || "—"} />
                    <InfoRow label="Email" value={parentInfo?.email || "—"} />
                    <InfoRow label="Phone" value={parentInfo?.phone || "—"} />
                    <InfoRow label="Relationship" value={parentInfo?.relationship || "—"} />
                  </div>
                </div>

                {/* Emergency contact summary */}
                <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-headline text-[16px] font-extrabold text-[#0033A0] mb-4">🚨 Emergency Contact</h3>
                  <div className="space-y-0.5">
                    <InfoRow label="Name" value={emergencyContact?.name || "—"} />
                    <InfoRow label="Phone" value={emergencyContact?.phone || "—"} />
                    <InfoRow label="Relationship" value={emergencyContact?.relationship || "—"} />
                  </div>
                </div>

                {/* Previous program */}
                <div className="mb-6 rounded-2xl bg-[#f0f4ff] border border-[#0033A0]/20 px-5 py-4 flex items-center gap-3 text-[13px] text-[#002f76]">
                  <span className="text-xl">📚</span>
                  <div>
                    <p className="font-bold">Previous Adventure</p>
                    <p className="text-[#475569] mt-0.5">{previousProgram}</p>
                  </div>
                </div>

                {/* Important Note / Disclaimer */}
                <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-[13px] text-amber-950 leading-relaxed shadow-xs">
                  <div className="flex items-center gap-2 font-extrabold text-amber-900 mb-1">
                    <span>⚠️</span>
                    <span>NOTE &amp; DISCLAIMER</span>
                  </div>
                  <p className="font-semibold text-amber-900">
                    Please ensure to settle your <strong>2026 Adventure 1 Balance</strong> before you can proceed to the registration.
                  </p>
                  <p className="mt-1.5 italic text-amber-800 text-[12px] bg-white/60 p-2.5 rounded-xl border border-amber-200/60">
                    &quot;In the event that a family has unsettled balance, your downpayment for the 2026 Adventure 2 will be credited as your balance payment for the 2026 Adventure 1.&quot;
                  </p>
                </div>

                <p className="mb-6 text-[13px] text-[#64748b] leading-relaxed">
                  If any of the information above has changed, please let <strong>Teacher Kyle</strong> or <strong>Teacher Angel</strong> know onsite and they can update it for you.
                </p>

                <div className="flex justify-end">
                  <button
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-10 py-4 text-[15px] font-bold text-white shadow-lg shadow-[#0033A0]/20 transition-all hover:bg-[#002f76]"
                  >
                    Looks Good — Choose Program →
                  </button>
                </div>
              </m.div>
            )}

            {/* ── STEP 1: Choose Program ────────────────────────────────────── */}
            {step === 1 && (
              <m.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <div className="mb-2">
                  <span className="inline-block rounded-full bg-blue-100 text-[#0033A0] px-3 py-0.5 text-[11px] font-black uppercase tracking-wider">
                    2026 Adventure 2
                  </span>
                </div>
                <h2 className="mb-2 font-headline text-[24px] font-extrabold text-[#002f76]">Choose an Adventure 2 Program</h2>
                <p className="mb-6 text-[14px] text-[#64748b]">Select the program and class time for {childNick}&apos;s Adventure 2 journey.</p>

                {/* Tab filter */}
                <div className="mb-8 flex flex-wrap justify-center gap-3">
                  {[
                    { id: "discovery", label: "Discovery Club" },
                    { id: "trailblazer", label: "Trailblazer" },
                    { id: "weekend", label: "Weekend Adventures" },
                  ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative overflow-hidden rounded-full px-5 py-2.5 text-[13px] font-bold transition-all duration-300 ${isActive ? "text-white shadow-md shadow-[#0033A0]/20" : "bg-white text-[#475569] shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-[#0033A0]"}`}
                      >
                        {isActive && (
                          <m.div layoutId="renewActiveTabIndicator" className="absolute inset-0 bg-[#0033A0]" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                <m.div layout className="space-y-5">
                  <AnimatePresence mode="popLayout">
                    {(Object.values(PROGRAM_SLOTS) as typeof PROGRAM_SLOTS[ProgramId][])
                      .filter(p => {
                        if (activeTab === "discovery") return ["curious-explorer", "creative-explorer", "everyday-curious"].includes(p.id);
                        if (activeTab === "trailblazer") return p.id === "brave-explorer";
                        return ["saturday-playdate", "ballet"].includes(p.id);
                      })
                      .map(p => {
                        const isSelected = selectedProgram === p.id;
                        const programSlotData = slots[p.id] || {};
                        return (
                          <m.div
                            key={p.id}
                            layout
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.25 }}
                            onClick={() => { setSelectedProgram(p.id as ProgramId); setSelectedClass(""); }}
                            style={{ borderColor: isSelected ? p.accent : "transparent", background: isSelected ? p.accentSoft : "white" }}
                            className="cursor-pointer rounded-3xl border-2 bg-white p-5 shadow-sm hover:shadow-md transition-all"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2.5 mb-1">
                                  <span className="text-xl">{p.icon}</span>
                                  <h3 className="font-headline text-[15px] font-extrabold" style={{ color: p.accent }}>{p.name}</h3>
                                </div>
                                <p className="text-[12px] text-[#64748b] mb-1">{p.ageRange} · {p.schedule} · {p.sessions} sessions</p>
                                <p className="text-[14px] font-bold text-[#002f76]">₱{p.rate.toLocaleString()}</p>
                              </div>
                              <div className={`h-5 w-5 rounded-full border-2 shrink-0 mt-1 transition-all ${isSelected ? "border-current bg-current" : "border-slate-300"}`} style={isSelected ? { color: p.accent } : {}} />
                            </div>

                            {isSelected && (
                              <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-black/5">
                                <p className="text-[12px] font-bold uppercase tracking-widest text-[#64748b] mb-3">Select Class Time</p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {p.classes.map((cls) => {
                                    const slotInfo = programSlotData[cls.name];
                                    const isFull = slotInfo ? slotInfo.available === 0 : false;
                                    const isClassSelected = selectedClass === cls.name;
                                    return (
                                      <button
                                        key={cls.name}
                                        disabled={isFull}
                                        onClick={(e) => { e.stopPropagation(); if (!isFull) setSelectedClass(cls.name); }}
                                        className={[
                                          "flex items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition-all duration-150",
                                          isFull ? "opacity-40 cursor-not-allowed border-slate-200 bg-white" :
                                            isClassSelected ? "border-[#0033A0] bg-[#0033A0]/5 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300",
                                        ].join(" ")}
                                      >
                                        <div>
                                          <p className="text-[13px] font-bold text-[#002f76]">{cls.name}</p>
                                          <p className="text-[11px] text-[#64748b]">{cls.time}</p>
                                        </div>
                                        {slotInfo && <SlotPill available={slotInfo.available} max={cls.maxSlots} />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </m.div>
                            )}
                          </m.div>
                        );
                      })}
                  </AnimatePresence>
                </m.div>

                {/* Uniform add-ons for returning families */}
                {selectedProgram && (
                  <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-3xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
                    <h3 className="font-headline text-[15px] font-extrabold text-[#002f76]">👕 Optional Uniform Add-ons</h3>
                    <p className="text-[13px] text-[#64748b]">As a returning family, you already have the Welcome Kit. These add-ons are completely optional.</p>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer rounded-2xl border-2 border-slate-200 p-4 hover:border-[#0033A0]/30 transition-colors">
                        <input type="checkbox" checked={uniformOrdered} onChange={e => setUniformOrdered(e.target.checked)} className="h-5 w-5 accent-[#0033A0]" />
                        <div className="flex-1">
                          <p className="font-bold text-[14px] text-[#002f76]">Uniform Set — ₱{UNIFORM_KIT.price.toLocaleString()}</p>
                          <p className="text-[12px] text-[#64748b]">Polo shirt + jogging pants (no lanyard)</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer rounded-2xl border-2 border-slate-200 p-4 hover:border-[#0033A0]/30 transition-colors">
                        <input type="checkbox" checked={lanyardOrdered} onChange={e => setLanyardOrdered(e.target.checked)} className="h-5 w-5 accent-[#0033A0]" />
                        <div className="flex-1">
                          <p className="font-bold text-[14px] text-[#002f76]">Lanyard & Name Tag — ₱{UNIFORM_KIT.lanyardPrice.toLocaleString()}</p>
                          <p className="text-[12px] text-[#64748b]">Merry Explorers lanyard with name tag</p>
                        </div>
                      </label>
                    </div>
                  </m.div>
                )}

                {/* Uniform day acknowledgment */}
                <div className="mt-6 rounded-3xl bg-slate-50 border border-slate-200/80 p-6 shadow-sm space-y-3">
                  <p className="text-[13.5px] font-extrabold text-[#002f76] flex items-center gap-2">
                    <span>👕</span> Every Wednesday & Friday is Merry Explorers&apos; official uniform day.
                  </p>
                  <label className="flex items-start gap-3 cursor-pointer pt-1 group">
                    <input
                      type="checkbox"
                      checked={uniformDayAcknowledged}
                      onChange={e => setUniformDayAcknowledged(e.target.checked)}
                      className="mt-1 h-5 w-5 rounded-lg border-2 border-slate-300 text-[#0033A0] focus:ring-[#0033A0] focus:ring-offset-0 transition cursor-pointer"
                    />
                    <span className="text-[13px] text-[#334155] leading-snug group-hover:text-[#002f76] transition-colors">
                      <strong className="text-red-500">*</strong> I understand that every Wednesday & Friday is Merry Explorers&apos; official uniform day.
                    </span>
                  </label>
                </div>

                <div className="mt-8 flex justify-between">
                  <button onClick={() => setStep(0)} className="rounded-2xl border border-slate-200 px-6 py-3.5 text-[14px] font-bold text-[#64748b] hover:bg-slate-50 transition-colors">← Back</button>
                  <button
                    disabled={!canProceedStep1}
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-[#0033A0]/20 transition-all hover:bg-[#002f76] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue →
                  </button>
                </div>
              </m.div>
            )}

            {/* ── STEP 2: Consents ─────────────────────────────────────────── */}
            {step === 2 && (
              <m.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <h2 className="mb-2 font-headline text-[24px] font-extrabold text-[#002f76]">Consents & Waivers</h2>
                <p className="mb-6 text-[14px] text-[#64748b]">Please read and agree to the following before proceeding.</p>

                {/* Photo consent */}
                <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm space-y-4">
                  <h3 className="font-headline text-[16px] font-extrabold text-[#0033A0]">📷 Photo & Video Consent</h3>
                  <p className="text-[13px] text-[#334155] leading-relaxed">
                    We&apos;d love to feature your little one in session highlights on our official Facebook page! In compliance with <strong>R.A. 10173 (Data Privacy Act of 2012)</strong>, we ask your consent first. No full names, addresses, or birthdays will be disclosed.
                  </p>
                  <div className="space-y-3 mt-2">
                    {[
                      { value: "yes", label: "Yes, I happily consent — please feature my child in Facebook highlights." },
                      { value: "no", label: "Not at this time — please exclude my child from any posted content." },
                    ].map((opt) => (
                      <label key={opt.value} className={`flex items-start gap-3 cursor-pointer rounded-2xl border-2 p-4 transition-all ${photoConsent === opt.value ? "border-[#0033A0] bg-[#0033A0]/5" : "border-slate-200 hover:border-slate-300"}`}>
                        <input type="radio" name="photoConsent" value={opt.value} checked={photoConsent === opt.value} onChange={() => setPhotoConsent(opt.value)} className="mt-0.5 accent-[#0033A0] shrink-0" />
                        <span className="text-[13px] font-medium text-[#334155]">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Program Waiver (not required for Brave Explorer) */}
                {selectedProgram !== "brave-explorer" && (
                  <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl transition-all ${waiverRead ? "bg-green-100" : "bg-[#0033A0]/10"}`}>
                        {waiverRead ? "✅" : "📋"}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-headline text-[16px] font-extrabold text-[#0033A0]">Parent/Guardian Acknowledgment & Agreement</h3>
                        <p className="text-[13px] text-[#64748b] mt-1">
                          {waiverRead ? "You have read and accepted the program waiver." : "You must read and accept the full waiver before signing."}
                        </p>
                      </div>
                    </div>

                    {waiverRead ? (
                      <div className="flex items-center gap-2 rounded-2xl bg-green-50 border border-green-200 px-4 py-3">
                        <span className="text-green-600 font-bold text-[13px]">✓ Waiver accepted</span>
                        <button onClick={() => setWaiverModalOpen(true)} className="ml-auto text-[12px] text-[#0033A0] hover:underline font-semibold">Re-read</button>
                      </div>
                    ) : (
                      <button onClick={() => setWaiverModalOpen(true)} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#0033A0] py-4 text-[14px] font-bold text-white shadow-md shadow-[#0033A0]/20 hover:bg-[#002f76] transition-colors">
                        📄 Read & Accept Waiver
                      </button>
                    )}

                    {waiverRead && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[12px] font-bold uppercase tracking-widest text-[#0033A0]/60 mb-2">Signature over Printed Name of Parent/Guardian</p>
                        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-[#f8fafc] overflow-hidden">
                          <SignatureCanvas
                            ref={sigCanvas}
                            penColor="#0033A0"
                            canvasProps={{ className: "w-full", height: 160 }}
                            onEnd={() => { if (sigCanvas.current) setSignatureBase64(sigCanvas.current.toDataURL("image/png")); }}
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-[12px] text-[#64748b]">
                            <span className="font-semibold text-[#334155]">{parentInfo?.name || "Parent/Guardian Name"}</span>
                            <span className="ml-3 text-[#94a3b8]">{new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</span>
                          </div>
                          <button onClick={() => { sigCanvas.current?.clear(); setSignatureBase64(""); }} className="text-[12px] font-semibold text-red-400 hover:text-red-600 transition-colors">Clear</button>
                        </div>
                        {!signatureBase64 && <p className="mt-2 text-[11px] text-amber-600 font-medium">✏️ Please sign in the box above to proceed.</p>}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-8 flex justify-between">
                  <button onClick={() => setStep(1)} className="rounded-2xl border border-slate-200 px-6 py-3.5 text-[14px] font-bold text-[#64748b] hover:bg-slate-50 transition-colors">← Back</button>
                  <button
                    disabled={!canProceedStep2}
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-[#0033A0]/20 transition-all hover:bg-[#002f76] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Review →
                  </button>
                </div>
              </m.div>
            )}

            {/* ── STEP 3: Review & Confirm ──────────────────────────────────── */}
            {step === 3 && prog && (
              <m.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <h2 className="mb-2 font-headline text-[24px] font-extrabold text-[#002f76]">Review & Confirm</h2>
                <p className="mb-6 text-[14px] text-[#64748b]">Please double-check all details before reserving your slot. You will complete payment on the next page.</p>

                {[
                  {
                    title: "Program", emoji: "📚", rows: [
                      ["Program", prog.name],
                      ["Class Time", selectedClass],
                      ["Schedule", prog.schedule],
                      ["Sessions", `${prog.sessions} sessions`],
                      ["Total Rate", `₱${prog.rate.toLocaleString()}`],
                      ["Downpayment (60%)", `₱${prog.downpayment.toLocaleString()}`],
                      ["Balance (40% on session 6)", `₱${prog.balance.toLocaleString()}`],
                    ],
                  },
                  {
                    title: "Explorer", emoji: "🧒", rows: [
                      ["Name", `${childInfo?.firstName} ${childInfo?.lastName}${childInfo?.nickname ? ` (${childInfo.nickname})` : ""}`],
                      ["Date of Birth", childInfo?.dateOfBirth || "—"],
                      ["Gender", childInfo?.gender || "—"],
                    ],
                  },
                  {
                    title: "Parent / Guardian", emoji: "👨‍👩‍👧", rows: [
                      ["Name", parentInfo?.name || "—"],
                      ["Relationship", parentInfo?.relationship || "—"],
                      ["Email", parentInfo?.email || "—"],
                      ["Phone", parentInfo?.phone || "—"],
                    ],
                  },
                  {
                    title: "Consents", emoji: "📝", rows: [
                      ["Photo/Video Consent", photoConsent === "yes" ? "Yes" : "No"],
                      ...(selectedProgram !== "brave-explorer" ? [["Program Waiver", "Digitally Signed"]] : []),
                    ],
                  },
                ].map((section) => (
                  <div key={section.title} className="mb-4 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <h3 className="mb-4 font-headline text-[15px] font-extrabold text-[#0033A0]">{section.emoji} {section.title}</h3>
                    <table className="w-full text-[13px]">
                      <tbody>
                        {section.rows.map(([label, value]) => (
                          <tr key={label} className="border-b border-slate-50 last:border-0">
                            <td className="py-2 pr-4 text-[#94a3b8] font-semibold w-[45%]">{label}</td>
                            <td className="py-2 text-[#334155] font-bold">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {/* Uniform add-ons */}
                {(uniformOrdered || lanyardOrdered) && (
                  <div className="mb-4 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <h3 className="mb-4 font-headline text-[15px] font-extrabold text-[#0033A0]">👕 Uniform Add-ons</h3>
                    <table className="w-full text-[13px]">
                      <tbody>
                        {uniformOrdered && <tr className="border-b border-slate-50"><td className="py-2 pr-4 text-[#94a3b8] font-semibold">Uniform Set</td><td className="py-2 text-[#334155] font-bold">₱{UNIFORM_KIT.price.toLocaleString()}</td></tr>}
                        {lanyardOrdered && <tr className="border-b border-slate-50"><td className="py-2 pr-4 text-[#94a3b8] font-semibold">Lanyard & Name Tag</td><td className="py-2 text-[#334155] font-bold">₱{UNIFORM_KIT.lanyardPrice.toLocaleString()}</td></tr>}
                        <tr><td className="py-2 pr-4 text-[#94a3b8] font-semibold">Add-ons Subtotal</td><td className="py-2 text-[#334155] font-bold">₱{addonCost.toLocaleString()}</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Priority reservation notice */}
                <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 text-[13px] text-amber-900 space-y-1">
                  <p>🎟️ <strong>Priority Reservation Applied:</strong></p>
                  <p className="text-[12.5px] text-amber-800 leading-relaxed">
                    Your slot is reserved without upfront payment today. To confirm your slot, a 60% non-refundable downpayment of <strong>₱{amountDue.toLocaleString()}</strong> is required by <strong>October 15</strong>. All unpaid slots as of <strong>October 16, 1:00 PM</strong> will be released.
                  </p>
                </div>

                {submitError && (
                  <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-[13px] font-medium text-red-700">❌ {submitError}</div>
                )}

                <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 text-[12px] text-amber-800">
                  <p><strong>Payment Terms:</strong> The 60% downpayment is non-refundable. The 40% balance is due on the 6th session. A 4% weekly interest applies to overdue balances (charged every Monday).</p>
                </div>

                <div className="mt-8 flex justify-between">
                  <button onClick={() => setStep(2)} disabled={submitting} className="rounded-2xl border border-slate-200 px-6 py-3.5 text-[14px] font-bold text-[#64748b] hover:bg-slate-50 transition-colors disabled:opacity-50">← Back</button>
                  <button
                    disabled={submitting}
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-2 rounded-2xl bg-green-500 px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-green-500/20 transition-all hover:bg-green-600 disabled:opacity-60"
                  >
                    {submitting ? "Reserving..." : "Complete Slot Reservation 🎉"}
                  </button>
                </div>
              </m.div>
            )}

          </AnimatePresence>
        </m.div>

        <p className="mt-8 text-center text-[12px] text-[#94a3b8]">
          Need help? Ask <strong className="text-[#64748b]">Teacher Kyle</strong> or <strong className="text-[#64748b]">Teacher Angel</strong> onsite.
        </p>
      </main>

      <SiteFooter />
    </m.div>
  );
}
