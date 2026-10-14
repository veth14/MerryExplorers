"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { PROGRAM_SLOTS, UNIFORM_KIT, NAV_LINKS } from "@/data/landing";
import { SiteHeader } from "@/components/landing/site-header";
import { DreamBanner } from "@/components/DreamBanner";
import Tesseract from "tesseract.js";
import SignatureCanvas from "react-signature-canvas";

type ProgramId = keyof typeof PROGRAM_SLOTS;
type SlotData = Record<string, Record<string, { maxSlots: number; taken: number; available: number }>>;

// ─── Design Tokens (aligned with Parent Portal / TrailblazerDashboard) ───────
const NAVY = "#0b2a82";
const BLUE = "#1f7ae0";
const SUN = "#ffd23f";
const SUN_LIGHT = "#ffe066";
const SUN_DEEP = "#ffb82e";
const INPUT_BG = "#f2faff";
const INPUT_BORDER = "#b6dcf5";
const TEXT_2 = "#3d5a99";

const STEPS = ["Details", "Program", "Consents", "Review"];

const inputCls =
  "w-full bg-[#f2faff] border-3 border-[#b6dcf5] rounded-xl px-4 py-3 text-[14px] font-extrabold text-[#0b2a82] placeholder:text-[#3d5a99]/50 placeholder:font-semibold focus:outline-none focus:border-[#0b2a82] focus:bg-white transition-all";
const labelCls = "block text-[12px] font-black uppercase tracking-wider text-[#0b2a82] mb-1.5";

function Cloud({ className }: { className: string }) {
  return (
    <svg className={`vp-cloud vp-sticker ${className}`} viewBox="-4 -16 124 78" aria-hidden="true">
      <path d="M26 52a18 18 0 0 1-2-35 24 24 0 0 1 46-6 20 20 0 0 1 28 18 14 14 0 0 1-4 23z" fill="#fff" stroke="#cfeaff" strokeWidth="3" />
    </svg>
  );
}

function Star({ style, far = false }: { style: React.CSSProperties; far?: boolean }) {
  return (
    <svg className={`vp-star vp-sticker ${far ? "far" : ""}`} style={style} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 3 6.5 7 .9-5.2 4.8 1.4 7L12 17.7 5.8 21.2l1.4-7L2 9.4l7-.9z" fill={SUN} stroke={SUN_DEEP} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function PortalScene() {
  return (
    <div className="vp-scene" aria-hidden="true">
      <svg className="vp-sun vp-sticker" viewBox="0 0 140 140">
        <g className="vp-rays">
          {Array.from({ length: 12 }).map((_, i) => (
            <ellipse key={i} cx="70" cy="16" rx="6" ry="12" fill={SUN} stroke={SUN_DEEP} strokeWidth="2" transform={`rotate(${i * 30} 70 70)`} />
          ))}
        </g>
        <circle cx="70" cy="70" r="36" fill={SUN_LIGHT} stroke={SUN_DEEP} strokeWidth="5" />
        <circle cx="52" cy="77" r="6" fill="#ffa9c4" opacity=".85" /><circle cx="88" cy="77" r="6" fill="#ffa9c4" opacity=".85" />
        <circle cx="58" cy="64" r="3.5" fill={NAVY} /><circle cx="82" cy="64" r="3.5" fill={NAVY} />
        <path d="M58 76q12 11 24 0" fill="none" stroke={NAVY} strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      <Cloud className="c1" /><Cloud className="c2" /><Cloud className="c3" />
      <Star style={{ top: "18%", left: "5%" }} />
      <Star far style={{ top: "10%", left: "68%" }} />
      <Star style={{ top: "45%", left: "92%" }} />
      <Star far style={{ top: "68%", left: "6%" }} />
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function SlotPill({ available, max }: { available: number; max: number }) {
  if (max >= 900) {
    return <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">Available</span>;
  }
  const pct = available / max;
  const color = pct === 0 ? "bg-red-100 text-red-700 border border-red-300" : pct <= 0.3 ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-emerald-100 text-emerald-800 border border-emerald-300";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${color}`}>
      {available === 0 ? "Full" : `${available} slot${available !== 1 ? "s" : ""} left`}
    </span>
  );
}

const STORAGE_KEY = "me_register_draft_v2";

function loadDraft() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}

function saveDraft(data: object) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function clearDraft() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export default function RegisterPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const draft = loadDraft();

  const [step, setStep] = useState<number>(draft?.step ?? 0);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [slots, setSlots] = useState<SlotData>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lead capture
  const [leadId, setLeadId] = useState<string>(draft?.leadId ?? "");
  const [savingLead, setSavingLead] = useState(false);

  // Form state
  const [selectedProgram, setSelectedProgram] = useState<ProgramId | "">(draft?.selectedProgram ?? "");
  const [selectedClass, setSelectedClass] = useState<string>(draft?.selectedClass ?? "");
  const [childInfo, setChildInfo] = useState(draft?.childInfo ?? {
    firstName: "", lastName: "", nickname: "", dateOfBirth: "", gender: "",
    favoriteSong: "", favoriteColor: "", favoriteCharacter: "", healthProfile: ""
  });
  const [parentInfo, setParentInfo] = useState(draft?.parentInfo ?? {
    name: "", email: "", phone: "", relationship: "",
  });
  const [emergencyContact, setEmergencyContact] = useState(draft?.emergencyContact ?? {
    name: "", phone: "", relationship: "",
  });
  const [dataPrivacyConsent, setDataPrivacyConsent] = useState<boolean>(draft?.dataPrivacyConsent ?? false);
  const [photoConsent, setPhotoConsent] = useState<string>(draft?.photoConsent ?? "");
  const [waiverRead, setWaiverRead] = useState<boolean>(draft?.waiverRead ?? false);
  const [waiverModalOpen, setWaiverModalOpen] = useState(false);
  const [waiverScrolled, setWaiverScrolled] = useState(false);
  const [signatureBase64, setSignatureBase64] = useState<string>(draft?.signatureBase64 ?? "");
  const sigCanvas = useRef<SignatureCanvas>(null);
  const waiverScrollRef = useRef<HTMLDivElement>(null);

  const [isNewFamily, setIsNewFamily] = useState<boolean>(draft?.isNewFamily ?? true);
  const [uniformOrdered, setUniformOrdered] = useState<boolean>(draft?.uniformOrdered ?? false);
  const [lanyardOrdered, setLanyardOrdered] = useState<boolean>(draft?.lanyardOrdered ?? false);
  const [welcomeKitOrdered, setWelcomeKitOrdered] = useState<boolean>(draft?.welcomeKitOrdered ?? false);
  const [paymentType, setPaymentType] = useState<"downpayment" | "full">(draft?.paymentType ?? "downpayment");
  const [amountPaid, setAmountPaid] = useState<string>(draft?.amountPaid ?? "");
  const [referenceNumber, setReferenceNumber] = useState<string>(draft?.referenceNumber ?? "");

  // Promo code state
  const [promoCode, setPromoCode] = useState<string>(draft?.promoCode ?? "");
  const [promoAccepted, setPromoAccepted] = useState<boolean>(draft?.promoAccepted ?? false);
  const [promoError, setPromoError] = useState<string>("");
  const [validatingPromo, setValidatingPromo] = useState<boolean>(false);

  // Uniform day acknowledgment
  const [uniformDayAcknowledged, setUniformDayAcknowledged] = useState<boolean>(draft?.uniformDayAcknowledged ?? false);

  // Auto Prefill
  const [prefilledFamilyName, setPrefilledFamilyName] = useState<string>("");
  const [prefillLoading, setPrefillLoading] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    const email = urlParams.get("email");

    if (ref || email) {
      setPrefillLoading(true);
      const query = ref ? `ref=${encodeURIComponent(ref)}` : `email=${encodeURIComponent(email || "")}`;
      fetch(`/api/registrations/prefill?${query}`)
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            const data = result.data;
            if (data.childInfo) {
              setChildInfo((prev: any) => ({
                ...prev,
                firstName: data.childInfo.firstName || prev.firstName,
                lastName: data.childInfo.lastName || prev.lastName,
                nickname: data.childInfo.nickname || prev.nickname,
                dateOfBirth: data.childInfo.dateOfBirth || prev.dateOfBirth,
                gender: data.childInfo.gender || prev.gender,
                favoriteSong: data.childInfo.favoriteSong || prev.favoriteSong,
                favoriteColor: data.childInfo.favoriteColor || prev.favoriteColor,
                favoriteCharacter: data.childInfo.favoriteCharacter || prev.favoriteCharacter,
                healthProfile: data.childInfo.healthProfile || prev.healthProfile,
              }));
            }
            if (data.parentInfo) {
              setParentInfo((prev: any) => ({
                ...prev,
                name: data.parentInfo.name || prev.name,
                email: data.parentInfo.email || prev.email,
                phone: data.parentInfo.phone || prev.phone,
                relationship: data.parentInfo.relationship || prev.relationship || "Mother",
              }));
            }
            if (data.emergencyContact) {
              setEmergencyContact((prev: any) => ({
                ...prev,
                name: data.emergencyContact.name || prev.name,
                phone: data.emergencyContact.phone || prev.phone,
                relationship: data.emergencyContact.relationship || prev.relationship || "Mother",
              }));
            }
            setIsNewFamily(false);
            if (data.promoCode) {
              setPromoCode(data.promoCode);
              setPromoAccepted(true);
            }
            const displayName = data.childInfo?.firstName || data.childName || "Explorer";
            setPrefilledFamilyName(displayName);
          }
        })
        .catch((err) => {
          console.error("Prefill fetch error:", err);
        })
        .finally(() => {
          setPrefillLoading(false);
        });
    }
  }, []);

  // Program renewal settings for dynamic Adventure cycle #, dates & registration open/close status
  type ProgramSetting = {
    currentAdventure: number;
    adventureStartDate: string | null;
    nextAdventureStart: string | null;
    registrationOpen: boolean;
    registrationAutoCloseDays: number | null;
    customClosedMessage?: string;
    newFamilyRegistrationOpenDate?: string | null;
  };

  const [renewalSettings, setRenewalSettings] = useState<Record<string, ProgramSetting>>({});

  function checkIsRegistrationClosed(setting?: ProgramSetting): boolean {
    if (!setting) return false;
    if (setting.registrationOpen === false) return true;

    // If an open date is set for new families:
    if (setting.newFamilyRegistrationOpenDate) {
      const openDateStr = setting.newFamilyRegistrationOpenDate.slice(0, 10);
      const todayStr = new Date().toISOString().slice(0, 10);
      // If open date has arrived or passed, it overrides past auto-close -> NOT closed!
      if (openDateStr <= todayStr) return false;
      // If in the future, it is handled by isNotYetOpen ("Opens Soon" card)
      return false;
    }

    if (setting.adventureStartDate && setting.registrationAutoCloseDays) {
      const started = new Date(setting.adventureStartDate).getTime();
      const threshold = started + setting.registrationAutoCloseDays * 86400000;
      if (Date.now() >= threshold) return true;
    }
    return false;
  }

  useEffect(() => {
    fetch("/api/renewal-settings")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.programs)) {
          const map: Record<string, ProgramSetting> = {};
          d.programs.forEach((p: any) => {
            map[p.programKey] = {
              currentAdventure: p.currentAdventure ?? 2,
              adventureStartDate: p.adventureStartDate ?? null,
              nextAdventureStart: p.nextAdventureStart ?? null,
              registrationOpen: p.registrationOpen !== false,
              registrationAutoCloseDays: p.registrationAutoCloseDays ?? 7,
              customClosedMessage: p.customClosedMessage || "",
              newFamilyRegistrationOpenDate: p.newFamilyRegistrationOpenDate ?? null,
            };
          });
          setRenewalSettings(map);
        }
      })
      .catch(() => {});
  }, []);

  // Live slot counts
  useEffect(() => {
    fetch("/api/registrations/slots")
      .then((r) => r.json())
      .then((d) => { if (d.success) setSlots(d.data); })
      .catch(() => { });
  }, []);

  // Save to localStorage draft
  useEffect(() => {
    if (step === 5) return;
    saveDraft({
      step,
      selectedProgram, selectedClass,
      childInfo, parentInfo, emergencyContact,
      photoConsent, waiverRead, signatureBase64,
      isNewFamily, uniformOrdered, lanyardOrdered, welcomeKitOrdered, paymentType, amountPaid, referenceNumber,
      leadId,
      promoCode, promoAccepted,
      uniformDayAcknowledged,
      dataPrivacyConsent,
    });
  }, [
    step, selectedProgram, selectedClass,
    childInfo, parentInfo, emergencyContact,
    photoConsent, waiverRead, signatureBase64,
    isNewFamily, uniformOrdered, lanyardOrdered, welcomeKitOrdered, paymentType, amountPaid, referenceNumber,
    leadId, promoCode, promoAccepted, uniformDayAcknowledged, dataPrivacyConsent,
  ]);

  const prog = selectedProgram ? PROGRAM_SLOTS[selectedProgram] : null;

  const selectedProgSetting = selectedProgram
    ? (renewalSettings[PROGRAM_SLOTS[selectedProgram]?.name] || renewalSettings[selectedProgram])
    : undefined;
  const isSelectedProgClosed = checkIsRegistrationClosed(selectedProgSetting);
  const requiresUniformDay = Boolean(
    selectedProgram && !["ballet", "saturday-playdate", "virtual-session"].includes(selectedProgram)
  );

  const canProceedStep0 =
    selectedProgram !== "" &&
    selectedClass !== "" &&
    (!requiresUniformDay || uniformDayAcknowledged) &&
    !isSelectedProgClosed;

  async function applyPromoCode() {
    const trimmed = promoCode.trim();
    if (!trimmed) {
      setPromoError("Please enter your promo code.");
      return;
    }
    setValidatingPromo(true);
    setPromoError("");
    try {
      const res = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (data.valid) {
        setPromoAccepted(true);
        if (data.promoCode) setPromoCode(data.promoCode);
        setPromoError("");
      } else {
        setPromoAccepted(false);
        setPromoError(data.error || "This code is not valid.");
      }
    } catch {
      setPromoAccepted(false);
      setPromoError("This code is not valid.");
    } finally {
      setValidatingPromo(false);
    }
  }

  const missingStep1: string[] = [
    ...(!childInfo.firstName ? ["Child's First Name"] : []),
    ...(!childInfo.lastName ? ["Child's Last Name"] : []),
    ...(!childInfo.dateOfBirth ? ["Date of Birth"] : []),
    ...(!childInfo.gender ? ["Child's Gender"] : []),
    ...(!parentInfo.name ? ["Parent/Guardian Full Name"] : []),
    ...(!parentInfo.relationship ? ["Parent/Guardian Relationship"] : []),
    ...(!parentInfo.email ? ["Parent/Guardian Email"] : []),
    ...(!parentInfo.phone ? ["Parent/Guardian Phone"] : []),
    ...(!emergencyContact.name ? ["Emergency Contact Name"] : []),
    ...(!emergencyContact.phone ? ["Emergency Contact Phone"] : []),
    ...(!emergencyContact.relationship ? ["Emergency Contact Relationship"] : []),
  ];

  const canProceedStep1 = missingStep1.length === 0 && dataPrivacyConsent;

  // Track lead progress across each step of registration
  const syncLeadProgress = useCallback(async (
    targetStep: number,
    overrides?: {
      stepName?: string;
      program?: string;
      classTime?: string;
      photoConsentVal?: string;
      hasSig?: boolean;
    }
  ) => {
    const stepNames: Record<number, string> = {
      0: "Step 0: Entering Details",
      1: "Step 1: Choosing Program",
      2: "Step 2: Consents & Waivers",
      3: "Step 3: Review & Payment",
    };

    // Do not count renewal families in leads
    if (!isNewFamily || promoCode.trim().toUpperCase() === "A1RENEWAL2026") {
      return;
    }

    const hasIdentifier =
      Boolean(parentInfo.name) ||
      Boolean(parentInfo.email) ||
      Boolean(parentInfo.phone) ||
      Boolean(childInfo.firstName);

    if (!hasIdentifier) return;

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          source: "register",
          step: targetStep,
          stepName: overrides?.stepName || stepNames[targetStep] || `Step ${targetStep}`,
          childInfo,
          parentInfo,
          emergencyContact,
          selectedProgram: overrides?.program !== undefined ? overrides.program : selectedProgram,
          selectedClass: overrides?.classTime !== undefined ? overrides.classTime : selectedClass,
          promoCode,
          photoConsent: overrides?.photoConsentVal !== undefined ? overrides.photoConsentVal : photoConsent,
          hasSignature: overrides?.hasSig !== undefined ? overrides.hasSig : Boolean(signatureBase64),
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.id) {
        setLeadId(data.data.id);
      }
    } catch {
      // Don't block parent user experience
    }
  }, [
    leadId,
    isNewFamily,
    childInfo,
    parentInfo,
    emergencyContact,
    selectedProgram,
    selectedClass,
    promoCode,
    photoConsent,
    signatureBase64,
  ]);

  // Debounced lead capture while filling out details (saves as soon as contact info is entered)
  // Gated behind explicit Data Privacy consent — no data is saved without it.
  useEffect(() => {
    if (step !== 0) return;
    if (!dataPrivacyConsent) return; // ← DPA gate: do not capture anything without consent
    if (!parentInfo.name || (!parentInfo.email && !parentInfo.phone)) return;
    const timer = setTimeout(() => {
      syncLeadProgress(0, { stepName: "Step 0: Entering Details" });
    }, 2000);
    return () => clearTimeout(timer);
  }, [step, dataPrivacyConsent, parentInfo.name, parentInfo.email, parentInfo.phone, childInfo.firstName, syncLeadProgress]);

  async function handleDetailsContinue() {
    setSavingLead(true);
    try {
      await syncLeadProgress(1, { stepName: "Step 1: Choosing Program" });
    } finally {
      setSavingLead(false);
      setStep(1);
    }
  }

  function handleProgramContinue() {
    syncLeadProgress(2, {
      stepName: "Step 2: Consents & Waivers",
      program: selectedProgram,
      classTime: selectedClass,
    });
    setStep(2);
  }

  function handleConsentsContinue() {
    syncLeadProgress(3, {
      stepName: "Step 3: Review & Payment",
      photoConsentVal: photoConsent,
      hasSig: Boolean(signatureBase64),
    });
    setStep(3);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
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
          leadId,
          // Send promo code as-is (case-sensitive) — A1JesusLovesMe2026 is case-sensitive on the server
          promoCode: promoAccepted ? promoCode.trim() : undefined,
          isPromoRegistration: promoAccepted,
          isNewFamily,
        }),
      });
      const data = await res.json();
      if (data.success) {
        clearDraft();
        window.location.href = `/register/payment/${data.data.id}`;
      } else {
        setError(data.error || "Submission failed. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="vp-root min-h-screen relative overflow-x-hidden">
      <PortalScene />

      {/* ── Waiver Modal ──────────────────────────────────────────────────── */}
      {waiverModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white rounded-[28px] border-4 border-[#0b2a82] shadow-[0_0_0_6px_#fff,0_16px_0_rgba(11,42,130,0.25)] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-[#b6dcf5] shrink-0 flex items-center justify-between bg-[#f2faff]">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#3d5a99]">Official Waiver</span>
                  <h3 className="font-extrabold text-[16px] text-[#0b2a82] leading-none">Parent/Guardian Acknowledgment & Agreement</h3>
                </div>
              </div>
              <button onClick={() => setWaiverModalOpen(false)} className="w-8 h-8 rounded-full border-2 border-[#0b2a82] bg-white text-[#0b2a82] font-black text-[16px] hover:bg-red-50 hover:text-red-600 transition-colors">✕</button>
            </div>
            <div
              ref={waiverScrollRef}
              className="flex-1 overflow-y-auto px-6 py-5 text-[13px] text-[#27407f] leading-[1.8] space-y-4"
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollHeight - el.scrollTop <= el.clientHeight + 60) setWaiverScrolled(true);
              }}
            >
              <p className="font-extrabold text-[15px] text-[#0b2a82] text-center border-b-2 border-[#b6dcf5] pb-3">MERRY EXPLORERS PLAYGROUP LEARNING CENTER</p>
              <p className="text-center font-bold text-[13px] text-[#1f7ae0]">PARENT/GUARDIAN ACKNOWLEDGMENT & AGREEMENT</p>
              <p className="text-[12px] text-[#3d5a99] italic text-center">By registering my child with Merry Explorers Playgroup Learning Center, I confirm that I have read, understood, and agree to the following program terms and policies:</p>
              <div className="space-y-1">
                <p className="font-extrabold text-[#0b2a82]">1. ADVENTURE / CYCLE</p>
                <p>For Merry Explorers, &quot;Adventure&quot; means &quot;Cycle.&quot; Adventure 1, Adventure 2, Adventure 3, and so on refer to the succeeding stages of the program.</p>
              </div>
              <div className="space-y-2">
                <p className="font-extrabold text-[#0b2a82]">2. REGISTRATION & PAYMENT</p>
                <ul className="list-disc pl-5 space-y-1 font-medium">
                  <li>60% reservation payment is required upon registration to secure the child&apos;s slot.</li>
                  <li>The 60% reservation payment is non-refundable once the slot is confirmed.</li>
                  <li>The remaining 40% balance is due on the 6th session.</li>
                  <li>A 4% weekly interest charge applies to overdue outstanding balances beginning September 10, 2026.</li>
                  <li>We will only accept Bank Transfer and GCash payments.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-extrabold text-[#0b2a82]">3. ATTENDANCE & MAKE-UP SESSIONS</p>
                <p>We know that schedules can sometimes change, so we&apos;ve made each program&apos;s make-up arrangement as simple and predictable as possible.</p>
                <p>💡 <strong>Trailblazer: Brave Explorer</strong> — A suspended face-to-face session will shift online.</p>
                <p>💛 <strong>Complimentary Free Session for All Explorers</strong> — For an excused missed session (sickness or other valid reasons), each child receives 1 complimentary session per Adventure.</p>
              </div>
              <div className="space-y-2">
                <p className="font-extrabold text-[#0b2a82]">4. UNIFORMS</p>
                <p>The Merry Explorers uniform is the <strong>SAME uniform</strong> across adventures.</p>
                <p><strong>Uniform Days:</strong> Wednesday & Friday.</p>
              </div>
              <div className="rounded-2xl bg-[#f2faff] border-2 border-[#b6dcf5] p-4 space-y-2">
                <p className="font-extrabold text-[#0b2a82] text-[14px]">PARENT/GUARDIAN ACKNOWLEDGMENT</p>
                <p className="font-medium text-[13px]">I, the undersigned Parent/Guardian, confirm that I have read, understood, and voluntarily agree to all terms and policies stated in this Agreement.</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t-2 border-[#b6dcf5] shrink-0 flex items-center gap-3 bg-[#f2faff]">
              <button onClick={() => setWaiverModalOpen(false)} className="flex-1 rounded-2xl border-2 border-[#0b2a82] bg-white py-3 text-[14px] font-extrabold text-[#0b2a82] hover:bg-slate-50 transition-colors">Close</button>
              <button
                disabled={!waiverScrolled}
                onClick={() => { setWaiverRead(true); setWaiverModalOpen(false); }}
                className={`flex-1 rounded-2xl border-2 border-[#0b2a82] py-3 text-[14px] font-extrabold transition-all ${waiverScrolled ? "bg-gradient-to-r from-[#ffe066] to-[#ffd23f] text-[#0b2a82] shadow-[0_4px_0_#0b2a82]" : "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed"}`}
              >
                {waiverScrolled ? "✓ I Accept the Waiver" : "↓ Scroll to Accept"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Universal Floating Pill Header ── */}
      <SiteHeader />

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <main className="vp-main">

        {/* Hero Title */}
        <div className="text-center flex flex-col items-center gap-2 -mb-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border-2 border-[#0b2a82] shadow-[0_4px_0_#0b2a82] text-[12px] font-extrabold text-[#0b2a82] mb-1">
            <span>🎒</span> 2026 ADVENTURE 2 REGISTRATION
          </div>
          <h1 className="vp-title text-[32px] sm:text-[42px]">
            Register Your Explorer
          </h1>
          <p className="vp-sub text-[15px] max-w-md">
            Secure your child&apos;s slot for <strong>Adventure 2</strong> in just a few friendly steps!
          </p>
        </div>

        {/* Step Tabs Indicator */}
        <nav className="vp-tabs">
          {STEPS.map((label, i) => {
            const isDone = i < step;
            const isActive = i === step;
            return (
              <button
                key={label}
                type="button"
                disabled={i > step}
                onClick={() => {
                  if (i < step) {
                    setStep(i);
                    syncLeadProgress(i);
                  }
                }}
                className={`vp-tab ${isActive ? "on" : ""} ${i > step ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span>{isDone ? "✓" : i + 1}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Draft Notice if Restored */}
        {draft && step > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#fff6cf] border-2 border-[#0b2a82] px-4 py-2.5 text-[12px] font-extrabold text-[#0b2a82] shadow-[0_3px_0_rgba(11,42,130,0.18)]">
            <div className="flex items-center gap-2">
              <span>💾</span>
              <span>Your progress was restored from draft.</span>
            </div>
            <button
              onClick={() => { clearDraft(); window.location.reload(); }}
              className="text-red-500 hover:text-red-700 underline font-black"
            >
              Start Fresh
            </button>
          </div>
        )}

        {/* Main Card with Playful Tape */}
        <div className="vp-card">
          <div className="vp-tape" />

          <AnimatePresence mode="wait">

            {/* ── STEP 0: Details ────────────────────────────────────────── */}
            {step === 0 && (
              <m.div key="step0" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}>
                <h2 className="vp-h2 text-[24px] mb-1">Explorer Information</h2>
                <p className="vp-sub mb-6">Tell us about your child and your primary contact details.</p>

                {prefillLoading && (
                  <div className="mb-5 flex items-center gap-3 rounded-2xl bg-[#f2faff] border-2 border-[#b6dcf5] p-4 text-[13px] text-[#0b2a82] animate-pulse">
                    <div className="h-4 w-4 rounded-full border-2 border-[#0b2a82] border-t-transparent animate-spin shrink-0" />
                    <span className="font-bold">Loading your saved information from Adventure 1…</span>
                  </div>
                )}

                {prefilledFamilyName && !prefillLoading && (
                  <div className="mb-5 rounded-[22px] bg-[#fff6cf] border-3 border-[#0b2a82] p-4 flex items-center gap-3 shadow-[0_4px_0_rgba(11,42,130,0.18)]">
                    <span className="text-2xl">✨</span>
                    <div>
                      <p className="font-black text-[14px] text-[#0b2a82]">Welcome back, {prefilledFamilyName}! 🌈</p>
                      <p className="text-[12px] font-medium text-[#3d5a99]">We&apos;ve filled in your Adventure 1 details automatically. Feel free to review or modify anything below.</p>
                    </div>
                  </div>
                )}

                {/* Child Info Card */}
                <div className="mb-5 rounded-[22px] bg-[#f2faff] border-3 border-[#b6dcf5] p-5 shadow-sm space-y-4">
                  <h3 className="vp-h3 text-[16px] text-[#0b2a82]">🧒 Child Information</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldRow label="First Name *">
                      <input className={inputCls} value={childInfo.firstName} onChange={e => setChildInfo((p: any) => ({ ...p, firstName: e.target.value }))} placeholder="e.g. Sofia" />
                    </FieldRow>
                    <FieldRow label="Last Name *">
                      <input className={inputCls} value={childInfo.lastName} onChange={e => setChildInfo((p: any) => ({ ...p, lastName: e.target.value }))} placeholder="e.g. Reyes" />
                    </FieldRow>
                    <FieldRow label="Nickname">
                      <input className={inputCls} value={childInfo.nickname} onChange={e => setChildInfo((p: any) => ({ ...p, nickname: e.target.value }))} placeholder="What do you call them?" />
                    </FieldRow>
                    <FieldRow label="Date of Birth *">
                      <input type="date" className={inputCls} value={childInfo.dateOfBirth} onChange={e => setChildInfo((p: any) => ({ ...p, dateOfBirth: e.target.value }))} />
                    </FieldRow>
                    <FieldRow label="Gender *">
                      <select className={inputCls} value={childInfo.gender} onChange={e => setChildInfo((p: any) => ({ ...p, gender: e.target.value }))}>
                        <option value="">Select gender</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                      </select>
                    </FieldRow>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3 mt-3">
                    <FieldRow label="Favorite Song">
                      <input className={inputCls} value={childInfo.favoriteSong} onChange={e => setChildInfo((p: any) => ({ ...p, favoriteSong: e.target.value }))} placeholder="e.g. Baby Shark" />
                    </FieldRow>
                    <FieldRow label="Favorite Color">
                      <input className={inputCls} value={childInfo.favoriteColor} onChange={e => setChildInfo((p: any) => ({ ...p, favoriteColor: e.target.value }))} placeholder="e.g. Yellow" />
                    </FieldRow>
                    <FieldRow label="Favorite Character">
                      <input className={inputCls} value={childInfo.favoriteCharacter} onChange={e => setChildInfo((p: any) => ({ ...p, favoriteCharacter: e.target.value }))} placeholder="e.g. Bluey" />
                    </FieldRow>
                  </div>
                  <FieldRow label="Health and Medical Profile">
                    <textarea className={inputCls} rows={2} value={childInfo.healthProfile} onChange={e => setChildInfo((p: any) => ({ ...p, healthProfile: e.target.value }))} placeholder="List any allergies, special medical needs, or dietary guidelines." />
                  </FieldRow>
                </div>

                {/* Parent Info Card */}
                <div className="mb-5 rounded-[22px] bg-[#f2faff] border-3 border-[#b6dcf5] p-5 shadow-sm space-y-4">
                  <h3 className="vp-h3 text-[16px] text-[#0b2a82]">👨‍👩‍👧 Parent / Guardian</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldRow label="Full Name *">
                      <input className={inputCls} value={parentInfo.name} onChange={e => setParentInfo((p: any) => ({ ...p, name: e.target.value }))} placeholder="Full name" />
                    </FieldRow>
                    <FieldRow label="Relationship *">
                      <select className={inputCls} value={parentInfo.relationship} onChange={e => setParentInfo((p: any) => ({ ...p, relationship: e.target.value }))}>
                        <option value="">Select relationship</option>
                        <option>Mother</option><option>Father</option><option>Guardian</option><option>Grandparent</option><option>Other</option>
                      </select>
                    </FieldRow>
                    <FieldRow label="Email Address *">
                      <input type="email" className={inputCls} value={parentInfo.email} onChange={e => setParentInfo((p: any) => ({ ...p, email: e.target.value }))} placeholder="your@email.com" />
                    </FieldRow>
                    <FieldRow label="Phone Number *">
                      <input type="tel" className={inputCls} value={parentInfo.phone} onChange={e => setParentInfo((p: any) => ({ ...p, phone: e.target.value }))} placeholder="09XX XXX XXXX" />
                    </FieldRow>
                  </div>
                </div>

                {/* Emergency Contact Card */}
                <div className="mb-6 rounded-[22px] bg-[#f2faff] border-3 border-[#b6dcf5] p-5 shadow-sm space-y-4">
                  <h3 className="vp-h3 text-[16px] text-[#0b2a82]">🚨 Emergency Contact</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FieldRow label="Full Name *">
                      <input className={inputCls} value={emergencyContact.name} onChange={e => setEmergencyContact((p: any) => ({ ...p, name: e.target.value }))} placeholder="Full name" />
                    </FieldRow>
                    <FieldRow label="Phone *">
                      <input type="tel" className={inputCls} value={emergencyContact.phone} onChange={e => setEmergencyContact((p: any) => ({ ...p, phone: e.target.value }))} placeholder="09XX XXX XXXX" />
                    </FieldRow>
                    <FieldRow label="Relationship *">
                      <select className={inputCls} value={emergencyContact.relationship} onChange={e => setEmergencyContact((p: any) => ({ ...p, relationship: e.target.value }))}>
                        <option value="">Select relationship</option>
                        <option>Mother</option><option>Father</option><option>Grandparent</option><option>Aunt/Uncle</option><option>Other</option>
                      </select>
                    </FieldRow>
                  </div>
                </div>

                {/* ── Data Privacy Consent (at bottom, before Continue) ── */}
                <div className={`mb-5 rounded-[22px] border-3 p-5 shadow-sm transition-all duration-300 ${
                  dataPrivacyConsent
                    ? "bg-emerald-50 border-emerald-400"
                    : "bg-[#fff6cf] border-[#ffd23f]"
                }`}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl shrink-0 mt-0.5">🔒</span>
                    <div>
                      <p className="font-black text-[14px] text-[#0b2a82] leading-snug">Data Privacy Notice</p>
                      <p className="text-[11px] font-bold text-[#3d5a99] uppercase tracking-wider mt-0.5">In compliance with the Data Privacy Act of 2012 (R.A. 10173)</p>
                    </div>
                  </div>
                  <p className="text-[12.5px] font-medium text-[#27407f] leading-relaxed mb-4">
                    Merry Explorers Playgroup Learning Center collects the personal information you provide on this form
                    (including your child&apos;s details and your contact information) <strong>solely for the purpose of processing your
                    registration, communicating program updates, and managing enrollment records</strong>. Your data will be kept
                    confidential, stored securely, and will not be shared with third parties without your consent, except as required
                    by law. You have the right to access, correct, or request deletion of your data at any time by contacting us directly.
                  </p>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        id="data-privacy-consent"
                        checked={dataPrivacyConsent}
                        onChange={e => setDataPrivacyConsent(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        dataPrivacyConsent
                          ? "bg-emerald-500 border-emerald-500"
                          : "bg-white border-[#0b2a82] group-hover:border-[#1f7ae0]"
                      }`}>
                        {dataPrivacyConsent && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 10" fill="none">
                            <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-[13px] font-bold text-[#0b2a82] leading-snug">
                      I have read and understood the Data Privacy Notice above. I consent to Merry Explorers
                      collecting and processing my personal information for registration purposes.{" "}
                      <span className="text-red-500">*</span>
                    </span>
                  </label>
                  {!dataPrivacyConsent && (
                    <p className="mt-2 ml-8 text-[11px] font-bold text-amber-700">
                      ⚠️ Please agree to the data privacy notice to continue.
                    </p>
                  )}
                </div>

                {!canProceedStep1 && missingStep1.length > 0 && (
                  <div className="mb-5 rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 text-[12px] font-bold text-amber-900">
                    <p className="font-black text-[13px] mb-1">⚠️ Please complete the required fields:</p>
                    <div className="flex flex-wrap gap-2">
                      {missingStep1.map((field) => (
                        <span key={field} className="px-2.5 py-1 rounded-lg bg-amber-200/70 text-amber-950 font-bold">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    disabled={!canProceedStep1 || savingLead}
                    onClick={handleDetailsContinue}
                    className="vp-btn"
                  >
                    {savingLead ? "Saving..." : "Continue to Choose Program →"}
                  </button>
                </div>
              </m.div>
            )}

            {/* ── STEP 1: Choose Program ────────────────────────────────── */}
            {step === 1 && (
              <m.div key="step1" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}>
                <div className="mb-3">
                  <span className="vp-tag text-[12px] font-black uppercase">
                    🌟 2026 Adventure 2
                  </span>
                </div>
                <h2 className="vp-h2 text-[24px] mb-1">Choose an Adventure 2 Program</h2>
                <p className="vp-sub mb-6">Select the program and class time that works best for your explorer.</p>

                {/* Filter Tabs */}
                <div className="mb-6 flex flex-wrap justify-center gap-2.5">
                  {[
                    { id: "all", label: "All Programs" },
                    { id: "discovery", label: "Discovery Club" },
                    { id: "trailblazer", label: "Trailblazer" },
                    { id: "weekend", label: "Weekend Adventures" },
                    { id: "virtual", label: "Virtual Tutorial" },
                  ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`vp-tab ${isActive ? "on" : ""}`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Program Cards */}
                <div className="space-y-4">
                  {(Object.values(PROGRAM_SLOTS) as typeof PROGRAM_SLOTS[ProgramId][])
                    .filter(p => {
                      if (activeTab === "all") return true;
                      if (activeTab === "discovery") return ["curious-explorer", "creative-explorer", "everyday-curious"].includes(p.id);
                      if (activeTab === "trailblazer") return ["brave-explorer"].includes(p.id);
                      if (activeTab === "weekend") return ["saturday-playdate", "ballet"].includes(p.id);
                      if (activeTab === "virtual") return (p.id as string) === "virtual-session";
                      return true;
                    })
                    .map((p) => {
                      const progSettings = renewalSettings[p.name] || renewalSettings[p.id];
                      const programSlots = slots[p.id] || {};
                      const isSelected = selectedProgram === p.id;

                      const isAdvProgram = !["ballet", "virtual-session"].includes(p.id) && !["Ballet", "Virtual Tutorial"].includes(p.name);
                      const advNumber = progSettings?.currentAdventure ?? 2;
                      const nextAdvNumber = advNumber + 1;
                      const startDateStr = progSettings?.nextAdventureStart
                        ? new Date(progSettings.nextAdventureStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : null;

                      // 1) New-family registration scheduled for a future date
                      const openDateRaw = progSettings?.newFamilyRegistrationOpenDate ?? null;
                      const openDateStr = openDateRaw ? openDateRaw.slice(0, 10) : "";
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const isNotYetOpen = openDateStr ? openDateStr > todayStr : false;

                      if (isNotYetOpen) {
                        const openDateFmt = new Date(openDateRaw!).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
                        return (
                          <div
                            key={p.id}
                            className="relative rounded-[22px] border-3 border-blue-200 bg-blue-50/60 p-5 shadow-sm overflow-hidden select-none"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-2xl">{p.icon}</span>
                                  <h3 className="text-[17px] font-black text-slate-700">{p.name}</h3>
                                  <span className="rounded-full bg-blue-100 border border-blue-300 px-2.5 py-0.5 text-[10.5px] font-black uppercase text-blue-900 tracking-wider">
                                    📅 Opens Soon
                                  </span>
                                </div>
                                <p className="text-[12.5px] font-medium text-slate-500 mb-1">
                                  {p.ageRange} · {p.schedule} · {p.sessions} sessions
                                </p>
                                <p className="text-[15px] font-black text-slate-400">₱{p.rate.toLocaleString()}</p>
                              </div>
                              <div className="h-6 w-6 rounded-full border-2 border-blue-300 bg-blue-100 shrink-0 mt-1 flex items-center justify-center text-[11px]">
                                📅
                              </div>
                            </div>

                            <div className="mt-4 pt-3.5 border-t border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 -mx-5 -mb-5 p-4 rounded-b-[19px]">
                              <div className="space-y-0.5 max-w-lg">
                                <p className="text-[13px] font-extrabold text-blue-950">
                                  🗓️ New family registration opens on {openDateFmt}!
                                </p>
                                <p className="text-[12px] font-medium text-slate-600 leading-snug">
                                  Returning families can still renew anytime via their priority renewal link. New families, please check back on the opening date!
                                </p>
                              </div>
                              <Link
                                href={`/inquire?program=${encodeURIComponent(p.name)}`}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-[12px] font-black hover:bg-blue-700 transition-all shadow-sm shrink-0"
                              >
                                <span>Inquire Now</span>
                                <span>→</span>
                              </Link>
                            </div>
                          </div>
                        );
                      }

                      // 2) Registration closed
                      const isClosed = checkIsRegistrationClosed(progSettings);

                      if (isClosed) {
                        return (
                          <div
                            key={p.id}
                            className="relative rounded-[22px] border-3 border-amber-300 bg-amber-50/70 p-5 shadow-sm overflow-hidden"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-2xl">{p.icon}</span>
                                  <h3 className="text-[17px] font-black text-slate-800">{p.name}</h3>
                                  <span className="rounded-full bg-amber-200 border border-amber-400 px-2.5 py-0.5 text-[10.5px] font-black uppercase text-amber-950 tracking-wider">
                                    Registration Closed
                                  </span>
                                  {isAdvProgram ? (
                                    <span className="rounded-full bg-slate-200/80 border border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                      Adventure {advNumber} in Session
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-slate-200/80 border border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                      Current Batch Full / Closed
                                    </span>
                                  )}
                                </div>
                                <p className="text-[12.5px] font-medium text-slate-600 mb-1">
                                  {p.ageRange} · {p.schedule} · {p.sessions} sessions
                                </p>
                                <p className="text-[15px] font-black text-slate-500">₱{p.rate.toLocaleString()}</p>
                              </div>
                              <div className="h-6 w-6 rounded-full border-2 border-amber-400 bg-amber-100 shrink-0 mt-1 flex items-center justify-center">
                                <span className="text-[11px] font-black text-amber-800">🔒</span>
                              </div>
                            </div>

                            {/* Informational closure notice */}
                            <div className="mt-4 pt-3.5 border-t border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 -mx-5 -mb-5 p-4 rounded-b-[19px]">
                              <div className="space-y-0.5 max-w-lg">
                                <p className="text-[13px] font-extrabold text-amber-950">
                                  {isAdvProgram
                                    ? `🎒 Current Adventure ${advNumber} is starting / in session!`
                                    : `🎒 Registration for ${p.name} is currently closed.`}
                                </p>
                                <p className="text-[12px] font-medium text-slate-600 leading-snug">
                                  {isAdvProgram ? (
                                    <>Online registration for Adventure {advNumber} has closed. Please wait for the next <strong>Adventure {nextAdvNumber}</strong>{startDateStr ? ` starting on ${startDateStr}` : ""}!</>
                                  ) : (
                                    <>Online registration for the current batch has closed.{startDateStr ? ` Please wait for the next schedule starting on ${startDateStr}!` : " Please check back soon or inquire for upcoming dates!"}</>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Link
                                  href={`/inquire?program=${encodeURIComponent(p.name)}`}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0033a0] text-white text-[12px] font-black hover:bg-[#002f76] transition-all shadow-sm"
                                >
                                  <span>{isAdvProgram ? `Inquire for Adv ${nextAdvNumber}` : "Inquire for Next Batch"}</span>
                                  <span>→</span>
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={p.id}
                          onClick={() => { setSelectedProgram(p.id as ProgramId); setSelectedClass(""); }}
                          className={`cursor-pointer rounded-[22px] border-3 p-5 transition-all ${isSelected
                            ? "bg-[#fff6cf] border-[#0b2a82] shadow-[0_6px_0_#0b2a82]"
                            : "bg-white border-[#b6dcf5] hover:border-[#0b2a82] shadow-sm"
                            }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-2xl">{p.icon}</span>
                                <h3 className="text-[17px] font-black text-[#0b2a82]">{p.name}</h3>
                                {isAdvProgram && (
                                  <span className="rounded-full bg-[#0b2a82]/10 border border-[#0b2a82]/20 px-2 py-0.5 text-[10.5px] font-black uppercase text-[#0b2a82]">
                                    Adventure {advNumber}
                                  </span>
                                )}
                                {startDateStr && (
                                  <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                    Starts {startDateStr}
                                  </span>
                                )}
                              </div>
                              <p className="text-[12.5px] font-medium text-[#3d5a99] mb-1">{p.ageRange} · {p.schedule} · {p.sessions} sessions</p>
                              <p className="text-[15px] font-black text-[#1f7ae0]">₱{p.rate.toLocaleString()}</p>
                            </div>
                            <div className={`h-6 w-6 rounded-full border-3 shrink-0 mt-1 transition-all flex items-center justify-center ${isSelected ? "border-[#0b2a82] bg-[#ffd23f]" : "border-[#b6dcf5] bg-white"}`}>
                              {isSelected && <span className="text-[12px] font-black text-[#0b2a82]">✓</span>}
                            </div>
                          </div>

                          {isSelected && (
                            <div className="mt-4 pt-4 border-t-2 border-[#0b2a82]/20">
                              {p.prerequisite && (
                                <div className="mb-3 rounded-xl bg-amber-100 border border-amber-300 p-2.5 text-[12px] font-bold text-amber-900">
                                  ⚠️ Pre-requisite: {p.prerequisite}
                                </div>
                              )}
                              <p className="text-[12px] font-black uppercase tracking-wider text-[#0b2a82] mb-3">Select Session Time</p>
                              <div className="grid gap-2.5 sm:grid-cols-2">
                                {p.classes.map((cls) => {
                                  const displayName = cls.name;

                                  const slotInfo = programSlots[cls.name];
                                  const isFull = slotInfo ? slotInfo.available === 0 : false;
                                  const isClassSelected = selectedClass === cls.name;
                                  return (
                                    <button
                                      key={`${cls.name}-${cls.time}`}
                                      type="button"
                                      disabled={isFull}
                                      onClick={(e) => { e.stopPropagation(); if (!isFull) setSelectedClass(cls.name); }}
                                      className={`flex items-center justify-between rounded-xl border-2 p-3 text-left transition-all ${
                                        isFull
                                        ? "opacity-40 cursor-not-allowed border-slate-200 bg-slate-50"
                                        : isClassSelected
                                          ? "border-[#0b2a82] bg-white shadow-[0_3px_0_#0b2a82]"
                                          : "border-[#b6dcf5] bg-white hover:border-[#0b2a82]"
                                        }`}
                                    >
                                      <div>
                                        <p className="text-[13px] font-black text-[#0b2a82]">{displayName}</p>
                                        <p className="text-[11px] font-semibold text-[#3d5a99]">{cls.time}</p>
                                      </div>
                                      {slotInfo && <SlotPill available={slotInfo.available} max={cls.maxSlots} />}
                                    </button>
                                  );
                                })}
                              </div>

                              {"notes" in p && Array.isArray((p as any).notes) && (
                                <div className="mt-4 rounded-2xl bg-pink-50 border-2 border-pink-200 p-4 text-[12.5px] text-pink-950 space-y-1.5 shadow-sm">
                                  <p className="font-black text-pink-900 flex items-center gap-1.5 text-[13px]">
                                    <span>🩰</span> Important Program &amp; Recital Information:
                                  </p>
                                  <ul className="list-disc pl-4 space-y-1 text-[12px] font-semibold text-pink-900/90 leading-relaxed">
                                    {((p as any).notes as string[]).map((note, idx) => (
                                      <li key={idx}>{note}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Promo Code Reservation Section */}
                <div className="mt-6 rounded-[22px] bg-[#f2faff] border-3 border-[#b6dcf5] p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎟️</span>
                    <h3 className="vp-h3 text-[15px] text-[#0b2a82] mb-0">Have a Reservation Promo Code?</h3>
                  </div>
                  <p className="text-[12px] font-medium text-[#3d5a99] leading-relaxed">
                    If you received a priority reservation code, enter it below and click <strong>Apply Code</strong> to unlock slot reservation without immediate payment.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => { setPromoCode(e.target.value); setPromoError(""); setPromoAccepted(false); }}
                      placeholder="Enter your promo code"
                      disabled={promoAccepted}
                      className={`flex-1 rounded-xl border-2 bg-white px-4 py-2.5 text-[14px] font-mono font-black text-[#0b2a82] tracking-wider focus:border-[#0b2a82] focus:outline-none transition-all ${promoAccepted ? "border-emerald-400 bg-emerald-50 cursor-not-allowed opacity-70" : "border-[#b6dcf5]"}`}
                    />
                    {!promoAccepted ? (
                      <button
                        type="button"
                        disabled={validatingPromo || !promoCode.trim()}
                        onClick={applyPromoCode}
                        className="vp-btn small"
                      >
                        {validatingPromo ? "Checking..." : "Apply Code"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setPromoAccepted(false); setPromoCode(""); setPromoError(""); }}
                        className="rounded-xl border-2 border-[#b6dcf5] bg-white px-4 py-2.5 text-[12px] font-extrabold text-[#3d5a99] hover:border-red-300 hover:text-red-500 transition-all shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {promoAccepted && (
                    <div className="rounded-[18px] border-3 border-emerald-400 bg-emerald-50 shadow-[0_4px_0_rgba(16,185,129,0.20)] overflow-hidden">
                      {/* Accepted header strip */}
                      <div className="bg-emerald-500 px-4 py-2.5 flex items-center gap-2">
                        <span className="text-lg">✅</span>
                        <span className="text-[13px] font-black text-white uppercase tracking-wider">THIS CODE HAS BEEN ACCEPTED</span>
                      </div>
                      {/* Note body */}
                      {promoCode.trim().replace(/^[“"']+|[”"':]+$/g, "") === "A1JesusLovesMe2026" || promoCode.trim().startsWith("A1JesusLovesMe2026") ? (
                        <div className="p-4 space-y-2 text-[12.5px] text-emerald-900 leading-relaxed font-medium">
                          <p className="font-extrabold text-[13.5px] text-emerald-950 flex items-center gap-1.5">
                            <span>🎓</span> Full Scholarship Code Applied!
                          </p>
                          <p>
                            This special code grants <strong>100% sponsored tuition</strong> for your child.
                          </p>
                          <div className="mt-1 rounded-xl bg-emerald-100 border border-emerald-300 px-3 py-2 text-emerald-950 font-bold text-[12px] leading-snug">
                            ✨ <strong>No payment needed.</strong> Your slot will be automatically guaranteed and confirmed upon submission.
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 space-y-2.5 text-[12.5px] text-emerald-900 leading-relaxed font-medium">
                          <p>
                            The code allows parents to submit the registration form and reserve a slot for their little one
                            without immediate payment until <strong>October 15</strong>.
                          </p>
                          <p>
                            However, <strong>using the code does not guarantee a confirmed reservation</strong>; slots will only
                            be confirmed upon submission of payment.
                          </p>
                          <p>
                            All families who use the code will receive a <strong>payment reminder via email</strong> by October 15.
                          </p>
                          <div className="mt-1 rounded-xl bg-amber-100 border border-amber-300 px-3 py-2.5 text-amber-900 font-bold text-[12px] leading-snug">
                            ⚠️ Any unpaid reservations by <strong>October 16 at 1:00 PM</strong> will be released. Families who miss the payment deadline must submit a new registration form to reserve a slot again.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {promoError && (
                    <div className="rounded-xl bg-red-100 border-2 border-red-300 p-2.5 text-[12px] font-extrabold text-red-900">
                      ⚠️ {promoError}
                    </div>
                  )}
                </div>

                {/* Uniform Day Acknowledgment (only for weekday explorer programs with Wed/Fri uniform) */}
                {requiresUniformDay && (
                  <div className="mt-5 rounded-[22px] bg-[#fff6cf] border-3 border-[#0b2a82] p-5 shadow-[0_4px_0_rgba(11,42,130,0.18)] space-y-2">
                    <p className="text-[13.5px] font-black text-[#0b2a82] flex items-center gap-2">
                      <span>👕</span> Every Wednesday & Friday is Merry Explorers&apos; official uniform day.
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer pt-1 group">
                      <input
                        type="checkbox"
                        checked={uniformDayAcknowledged}
                        onChange={(e) => setUniformDayAcknowledged(e.target.checked)}
                        className="mt-1 h-5 w-5 rounded-md border-2 border-[#0b2a82] accent-[#0b2a82] cursor-pointer"
                      />
                      <span className="text-[13px] font-bold text-[#0b2a82] leading-snug">
                        <strong className="text-red-500">*</strong> I understand that every Wednesday & Friday is Merry Explorers&apos; official uniform day.
                      </span>
                    </label>
                  </div>
                )}

                <div className="mt-8 flex justify-between items-center">
                  <button onClick={() => { setStep(0); syncLeadProgress(0); }} className="vp-btn ghost small">← Back</button>
                  <button
                    disabled={!canProceedStep0}
                    onClick={handleProgramContinue}
                    className="vp-btn"
                  >
                    Continue to Consents →
                  </button>
                </div>
              </m.div>
            )}

            {/* ── STEP 2: Consents & Waivers ────────────────────────────── */}
            {step === 2 && (
              <m.div key="step2" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}>
                <h2 className="vp-h2 text-[24px] mb-1">Consents & Waivers</h2>
                <p className="vp-sub mb-6">Please read and agree to the following before proceeding.</p>

                {/* Photo consent */}
                <div className="mb-6 rounded-[22px] bg-[#f2faff] border-3 border-[#b6dcf5] p-5 shadow-sm space-y-3">
                  <h3 className="vp-h3 text-[16px] text-[#0b2a82]">📷 Photo & Video Consent</h3>
                  <p className="text-[13px] text-[#3d5a99] font-medium leading-relaxed">
                    We&apos;d love to feature your little one in session highlights on our official Facebook page! In compliance with <strong>R.A. 10173 (Data Privacy Act of 2012)</strong>, we ask your consent first. No full names, addresses, or birthdays will be disclosed.
                  </p>
                  <div className="space-y-2.5 pt-1">
                    {[
                      { value: "yes", label: "Yes, I happily consent — please feature my child in Facebook highlights." },
                      { value: "no", label: "Not at this time — please exclude my child from any posted content." },
                    ].map((opt) => (
                      <label key={opt.value} className={`flex items-start gap-3 cursor-pointer rounded-xl border-2 p-3.5 transition-all ${photoConsent === opt.value ? "border-[#0b2a82] bg-[#fff6cf] shadow-[0_3px_0_#0b2a82]" : "border-[#b6dcf5] bg-white hover:border-[#0b2a82]"}`}>
                        <input type="radio" name="photoConsent" value={opt.value} checked={photoConsent === opt.value} onChange={() => setPhotoConsent(opt.value)} className="mt-0.5 accent-[#0b2a82] shrink-0" />
                        <span className="text-[13px] font-bold text-[#0b2a82]">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Program Waiver */}
                {selectedProgram !== "brave-explorer" && (
                  <div className="mb-6 rounded-[22px] bg-[#f2faff] border-3 border-[#b6dcf5] p-5 shadow-sm space-y-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl border-2 border-[#0b2a82] ${waiverRead ? "bg-[#ffd23f]" : "bg-white"}`}>
                        {waiverRead ? "✅" : "📋"}
                      </div>
                      <div className="flex-1">
                        <h3 className="vp-h3 text-[16px] text-[#0b2a82] mb-0.5">Parent/Guardian Acknowledgment & Agreement</h3>
                        <p className="text-[12.5px] font-medium text-[#3d5a99]">
                          {waiverRead ? "You have read and accepted the program waiver." : "You must read and accept the full waiver before signing."}
                        </p>
                      </div>
                    </div>

                    {waiverRead ? (
                      <div className="flex items-center gap-2 rounded-xl bg-[#fff6cf] border-2 border-[#0b2a82] px-4 py-3 shadow-[0_3px_0_rgba(11,42,130,0.18)]">
                        <span className="text-[#0b2a82] font-black text-[13px]">✓ Official Waiver accepted</span>
                        <button onClick={() => setWaiverModalOpen(true)} className="ml-auto text-[12px] text-[#1f7ae0] hover:underline font-extrabold">Re-read</button>
                      </div>
                    ) : (
                      <button onClick={() => setWaiverModalOpen(true)} className="w-full vp-btn small">
                        📄 Read & Accept Official Waiver
                      </button>
                    )}

                    {waiverRead && (
                      <div className="pt-2 border-t-2 border-[#b6dcf5]">
                        <p className="text-[12px] font-black uppercase tracking-wider text-[#0b2a82] mb-2">Signature of Parent / Guardian</p>
                        <div className="rounded-2xl border-3 border-dashed border-[#0b2a82] bg-white overflow-hidden shadow-inner">
                          <SignatureCanvas
                            ref={sigCanvas}
                            penColor="#0b2a82"
                            canvasProps={{ className: "w-full", height: 160 }}
                            onEnd={() => { if (sigCanvas.current) setSignatureBase64(sigCanvas.current.toDataURL("image/png")); }}
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-[12px] text-[#3d5a99] font-medium">
                            <span className="font-extrabold text-[#0b2a82]">{parentInfo.name || "Parent/Guardian Name"}</span>
                            <span className="ml-3 text-[#3d5a99]">{new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</span>
                          </div>
                          <button onClick={() => { sigCanvas.current?.clear(); setSignatureBase64(""); }} className="text-[12px] font-black text-red-500 hover:text-red-700 transition-colors">Clear</button>
                        </div>
                        {!signatureBase64 && <p className="mt-2 text-[12px] text-amber-700 font-bold">✏️ Please draw your signature in the box above to continue.</p>}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-8 flex justify-between items-center">
                  <button onClick={() => { setStep(1); syncLeadProgress(1); }} className="vp-btn ghost small">← Back</button>
                  <button
                    disabled={!photoConsent || (selectedProgram !== "brave-explorer" && (!waiverRead || !signatureBase64))}
                    onClick={handleConsentsContinue}
                    className="vp-btn"
                  >
                    Review Details →
                  </button>
                </div>
              </m.div>
            )}

            {/* ── STEP 3: Review & Confirm ──────────────────────────────── */}
            {step === 3 && prog && (
              <m.div key="step3" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}>
                <div className="mb-3">
                  <span className="vp-tag text-[12px] font-black uppercase">
                    🌟 2026 ADVENTURE 2
                  </span>
                </div>
                <h2 className="vp-h2 text-[24px] mb-1">Review & Confirm</h2>
                <p className="vp-sub mb-6">Please double-check all details before reserving your slot.</p>

                {[
                  {
                    title: "Program Selection", emoji: "📚", rows: [
                      ["Program", prog.name],
                      ["Session Time", selectedClass],
                      ["Schedule", prog.schedule],
                      ["Sessions", `${prog.sessions} sessions`],
                      ["Total Rate", `₱${prog.rate.toLocaleString()}`],
                      ["Downpayment (60%)", `₱${prog.downpayment.toLocaleString()}`],
                      ["Balance (40% on session 6)", `₱${prog.balance.toLocaleString()}`],
                    ],
                  },
                  {
                    title: "Explorer Information", emoji: "🧒", rows: [
                      ["Name", `${childInfo.firstName} ${childInfo.lastName}${childInfo.nickname ? ` (${childInfo.nickname})` : ""}`],
                      ["Date of Birth", childInfo.dateOfBirth],
                      ["Gender", childInfo.gender],
                      ["Favorites", `${childInfo.favoriteSong || "—"} / ${childInfo.favoriteColor || "—"} / ${childInfo.favoriteCharacter || "—"}`],
                      ["Health Profile", childInfo.healthProfile || "None"],
                    ],
                  },
                  {
                    title: "Parent / Guardian", emoji: "👨‍👩‍👧", rows: [
                      ["Name", parentInfo.name],
                      ["Relationship", parentInfo.relationship],
                      ["Email", parentInfo.email],
                      ["Phone", parentInfo.phone],
                    ],
                  },
                  {
                    title: "Emergency Contact", emoji: "🚨", rows: [
                      ["Name", emergencyContact.name],
                      ["Phone", emergencyContact.phone],
                      ["Relationship", emergencyContact.relationship],
                    ],
                  },
                  {
                    title: "Consents & Waivers", emoji: "📝", rows: [
                      ["Photo/Video Consent", photoConsent === "yes" ? "Yes" : "No"],
                      ...(selectedProgram !== "brave-explorer" ? [["Official Program Waiver", "Digitally Signed ✓"]] : []),
                    ],
                  },
                ].map((section) => (
                  <div key={section.title} className="mb-4 rounded-[22px] bg-[#f2faff] border-3 border-[#b6dcf5] p-5 shadow-sm">
                    <h3 className="mb-3 vp-h3 text-[15px] text-[#0b2a82]">{section.emoji} {section.title}</h3>
                    <table className="w-full text-[13px]">
                      <tbody>
                        {section.rows.map(([label, value]) => (
                          <tr key={label} className="border-b border-[#b6dcf5]/40 last:border-0">
                            <td className="py-1.5 pr-4 text-[#3d5a99] font-bold w-[45%]">{label}</td>
                            <td className="py-1.5 text-[#0b2a82] font-black">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {promoAccepted ? (
                  <div className="mb-5 rounded-[22px] bg-[#fff6cf] border-3 border-[#0b2a82] px-5 py-4 text-[13px] text-[#0b2a82] shadow-[0_4px_0_rgba(11,42,130,0.18)] space-y-1">
                    <p className="font-black text-[14px]">🎟️ Promo Reservation Applied:</p>
                    <p className="text-[12.5px] font-medium text-[#3d5a99] leading-relaxed">
                      Your slot is held today without upfront payment. To confirm your slot, a 60% non-refundable downpayment is required by <strong>October 15</strong>. All unpaid slots will be released on <strong>October 16, 1:00 PM</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="mb-5 rounded-[22px] bg-[#f2faff] border-3 border-[#b6dcf5] px-5 py-4 text-[13px] text-[#0b2a82] space-y-1">
                    <p className="font-black text-[14px]">⏱️ 1-Hour Payment Window:</p>
                    <p className="text-[12.5px] font-medium text-[#3d5a99] leading-relaxed">
                      Once you reserve your slot, you will have <strong>1 hour</strong> to submit your payment on the next page.
                    </p>
                  </div>
                )}

                {error && <div className="vp-error mb-4">❌ {error}</div>}

                <div className="mt-8 flex justify-between items-center">
                  <button onClick={() => { setStep(2); syncLeadProgress(2); }} disabled={submitting} className="vp-btn ghost small disabled:opacity-50">← Back</button>
                  <button
                    disabled={submitting}
                    onClick={handleSubmit}
                    className="vp-btn"
                  >
                    {submitting ? "Reserving..." : (promoAccepted ? "Complete Slot Reservation 🎉" : "Reserve Slot & Proceed to Pay 💳")}
                  </button>
                </div>
              </m.div>
            )}

          </AnimatePresence>
        </div>

        <p className="text-center text-[13px] text-[#3d5a99] font-medium -mt-2">
          Need help? Ask <strong className="text-[#0b2a82]">Teacher Angel</strong> onsite.
        </p>
        <DreamBanner />
      </main>

      <style jsx global>{`
        .vp-root {
          color: ${NAVY};
          font-family: inherit;
          background: radial-gradient(ellipse at 50% 0%, #b9e5fb 0%, #8fd3f7 55%, #74c3f1 100%);
          background-attachment: fixed;
        }
        .vp-root * { box-sizing: border-box; }
        .vp-main {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          padding: 120px 20px 100px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        @media(max-width: 640px) {
          .vp-main { padding-top: 100px; }
        }
        .vp-sub { margin: 4px 0 0; font-size: 14px; color: ${TEXT_2}; font-weight: 500; line-height: 1.5; }
        .vp-h2 { margin: 0; font-size: 22px; font-weight: 800; color: ${NAVY}; }
        .vp-h3 { margin: 0 0 10px; font-size: 16px; font-weight: 800; color: ${NAVY}; display: flex; align-items: center; gap: 8px; }
        .vp-title {
          margin: 0;
          font-size: 38px;
          font-weight: 800;
          line-height: 1.15;
          color: ${BLUE};
          -webkit-text-stroke: 6px ${NAVY};
          paint-order: stroke fill;
          text-shadow: 0 4px 0 ${NAVY};
          filter: drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff);
        }
        .vp-sticker {
          filter: drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff);
        }
        .vp-scene {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .vp-sun {
          position: absolute;
          top: 12px;
          right: 24px;
          width: 130px;
          animation: vp-bob 5s ease-in-out infinite;
        }
        .vp-rays { transform-origin: 70px 70px; animation: vp-rot 40s linear infinite; }
        .vp-cloud {
          position: absolute;
          left: 0;
          width: 130px;
          overflow: visible;
          animation: vp-drift linear infinite;
        }
        .vp-cloud.c1 { top: 16%; animation-duration: 70s; }
        .vp-cloud.c2 { top: 46%; width: 104px; animation-duration: 90s; animation-delay: -40s; }
        .vp-cloud.c3 { top: 72%; width: 140px; animation-duration: 60s; animation-delay: -20s; }
        .vp-star { position: absolute; width: 26px; animation: vp-twinkle 2.6s ease-in-out infinite; }
        @keyframes vp-bob { 50% { transform: translateY(10px); } }
        @keyframes vp-rot { to { transform: rotate(360deg); } }
        @keyframes vp-drift { from { transform: translateX(-200px); } to { transform: translateX(110vw); } }
        @keyframes vp-twinkle { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.6); opacity: 0.5; } }
        .vp-card {
          position: relative;
          background: #fff;
          border: 4px solid ${NAVY};
          border-radius: 28px;
          padding: 28px;
          box-shadow: 0 0 0 6px #fff, 0 12px 0 6px rgba(11,42,130,0.18);
        }
        @media(max-width: 640px) {
          .vp-card { padding: 20px 16px; border-radius: 24px; }
        }
        .vp-tape {
          position: absolute;
          top: -16px;
          left: 50%;
          width: 92px;
          height: 26px;
          margin-left: -46px;
          transform: rotate(4deg);
          background: repeating-linear-gradient(45deg, ${SUN} 0 9px, ${SUN_LIGHT} 9px 18px);
          border: 2px solid rgba(11,42,130,0.25);
          border-radius: 4px;
        }
        .vp-tabs {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          padding: 4px;
        }
        .vp-tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          min-height: 44px;
          padding: 0 18px;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          color: ${NAVY};
          background: #fff;
          border: 3px solid ${NAVY};
          border-radius: 18px;
          box-shadow: 0 4px 0 rgba(11,42,130,0.25);
          cursor: pointer;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .vp-tab:hover:not(:disabled) { transform: translateY(-2px); }
        .vp-tab.on {
          background: linear-gradient(${SUN_LIGHT}, ${SUN} 50%, ${SUN_DEEP});
          box-shadow: 0 4px 0 ${NAVY};
        }
        .vp-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 48px;
          padding: 0 24px;
          font: inherit;
          font-size: 16px;
          font-weight: 800;
          color: ${NAVY};
          text-decoration: none;
          cursor: pointer;
          background: linear-gradient(${SUN_LIGHT}, ${SUN} 50%, ${SUN_DEEP});
          border: 3px solid ${NAVY};
          border-radius: 18px;
          box-shadow: 0 6px 0 ${NAVY};
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .vp-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 0 ${NAVY}; }
        .vp-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 1px 0 ${NAVY}; }
        .vp-btn:disabled {
          background: #fff3c4;
          color: #8c9bc9;
          border-color: #8c9bc9;
          box-shadow: 0 5px 0 #c3cce6;
          cursor: not-allowed;
        }
        .vp-btn.ghost { background: #fff; }
        .vp-btn.small { min-height: 42px; font-size: 14px; padding: 0 16px; box-shadow: 0 4px 0 ${NAVY}; }
        .vp-tag {
          display: inline-block;
          font-size: 12px;
          font-weight: 800;
          color: ${NAVY};
          border: 2.5px solid ${NAVY};
          border-radius: 20px;
          padding: 3px 12px;
          background: #fff6cf;
        }
        .vp-error {
          margin: 12px 0;
          padding: 10px 14px;
          border: 3px solid #ff6b57;
          background: #fff1ee;
          color: #b3261e;
          border-radius: 16px;
          font-weight: 700;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}