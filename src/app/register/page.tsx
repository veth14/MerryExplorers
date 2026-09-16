"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { PROGRAM_SLOTS, UNIFORM_KIT } from "@/data/landing";
import { SiteFooter } from "@/components/landing/site-footer";
import { NAV_LINKS } from "@/data/landing";
import Tesseract from "tesseract.js";

import SignatureCanvas from "react-signature-canvas";

type ProgramId = keyof typeof PROGRAM_SLOTS;
type SlotData = Record<string, Record<string, { maxSlots: number; taken: number; available: number }>>;

const STEPS = ["Program", "Details", "Consents", "Payment", "Review", "Done"];

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

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function SlotPill({ available, max }: { available: number; max: number }) {
  const pct = available / max;
  const color = pct === 0 ? "bg-red-100 text-red-600" : pct <= 0.3 ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-700";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${color}`}>
      {available === 0 ? "Full" : `${available} slot${available !== 1 ? "s" : ""} left`}
    </span>
  );
}

const STORAGE_KEY = "me_register_draft";

function loadDraft() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}

function saveDraft(data: object) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* quota exceeded – ignore */ }
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
  const [slots, setSlots] = useState<SlotData>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state — all hydrated from localStorage draft on first render
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
  const [photoConsent, setPhotoConsent] = useState<string>(draft?.photoConsent ?? "");
  const [waiverRead, setWaiverRead] = useState<boolean>(draft?.waiverRead ?? false);
  const [waiverModalOpen, setWaiverModalOpen] = useState(false);
  const [waiverScrolled, setWaiverScrolled] = useState(false);
  const [signatureBase64, setSignatureBase64] = useState<string>(draft?.signatureBase64 ?? "");
  const sigCanvas = useRef<SignatureCanvas>(null);
  const waiverScrollRef = useRef<HTMLDivElement>(null);

  const [paymentMethod, setPaymentMethod] = useState<string>(draft?.paymentMethod ?? "");
  const [receiptPreview, setReceiptPreview] = useState<string>(draft?.receiptPreview ?? "");
  const [receiptBase64, setReceiptBase64] = useState<string>(draft?.receiptBase64 ?? "");
  const [isNewFamily, setIsNewFamily] = useState<boolean>(draft?.isNewFamily ?? true);
  const [uniformOrdered, setUniformOrdered] = useState<boolean>(draft?.uniformOrdered ?? false);
  const [lanyardOrdered, setLanyardOrdered] = useState<boolean>(draft?.lanyardOrdered ?? false);
  const [welcomeKitOrdered, setWelcomeKitOrdered] = useState<boolean>(draft?.welcomeKitOrdered ?? false);
  const [paymentType, setPaymentType] = useState<"downpayment" | "full">(draft?.paymentType ?? "downpayment");
  const [amountPaid, setAmountPaid] = useState<string>(draft?.amountPaid ?? "");
  const [referenceNumber, setReferenceNumber] = useState<string>(draft?.referenceNumber ?? "");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);

  // ── Fetch live slot counts ──
  useEffect(() => {
    fetch("/api/registrations/slots")
      .then((r) => r.json())
      .then((d) => { if (d.success) setSlots(d.data); })
      .catch(() => { });
  }, []);

  // ── Persist form state to localStorage on every change ──
  useEffect(() => {
    // Don't save if on the Done step (step 5) — data was submitted
    if (step === 5) return;
    saveDraft({
      step,
      selectedProgram, selectedClass,
      childInfo, parentInfo, emergencyContact,
      photoConsent, waiverRead, signatureBase64,
      paymentMethod, receiptPreview, receiptBase64,
      isNewFamily, uniformOrdered, lanyardOrdered, welcomeKitOrdered, paymentType, amountPaid, referenceNumber,
    });
  }, [
    step, selectedProgram, selectedClass,
    childInfo, parentInfo, emergencyContact,
    photoConsent, waiverRead, signatureBase64,
    paymentMethod, receiptPreview, receiptBase64,
    isNewFamily, uniformOrdered, lanyardOrdered, welcomeKitOrdered, paymentType, amountPaid, referenceNumber,
  ]);

  const prog = selectedProgram ? PROGRAM_SLOTS[selectedProgram] : null;

  // ── Computed payment amounts ──
  // New families: Welcome Kit (₱750) is mandatory
  // Returning families: optional Uniform Kit (₱550), Welcome Kit (₱750), Lanyard (₱200)
  const addonCost = isNewFamily
    ? UNIFORM_KIT.welcomeKitPrice
    : (welcomeKitOrdered ? UNIFORM_KIT.welcomeKitPrice : 0) +
    (uniformOrdered ? UNIFORM_KIT.price : 0) +
    (lanyardOrdered ? UNIFORM_KIT.lanyardPrice : 0);
  const amountDue = prog
    ? (paymentType === "full" ? prog.rate : prog.downpayment) + addonCost
    : 0;
  const parsedAmountPaid = parseFloat(amountPaid.replace(/,/g, "")) || 0;
  const creditBalance = parsedAmountPaid > 0 && parsedAmountPaid > amountDue ? +(parsedAmountPaid - amountDue).toFixed(2) : 0;
  const amountShort = parsedAmountPaid > 0 && parsedAmountPaid < amountDue ? +(amountDue - parsedAmountPaid).toFixed(2) : 0;
  const amountExact = parsedAmountPaid > 0 && parsedAmountPaid === amountDue;

  // ── Run Tesseract OCR on uploaded receipt to extract reference number and amount ──
  const runOCR = useCallback(async (imageDataUrl: string) => {
    setOcrLoading(true);
    setOcrDone(false);
    try {
      const result = await Tesseract.recognize(imageDataUrl, "eng");
      const text = result.data.text;

      // Strict patterns for PH Bank/E-Wallet reference numbers to avoid capturing random words
      const patterns = [
        /\b(ITO\d{12,20})\b/i, // GoTyme (e.g. ITO260901176054010)
        /\b([A-Z0-9]{4}\s+[A-Z0-9]{4}\s+[A-Z0-9]{4})\b/i, // Maya (e.g. 8CE9 48D1 B76E)
        /\b(\d{13})\b/, // GCash (e.g. 1000000000000)
        /(?:ref\.?\s*no\.?|reference\s*(?:id|number)?|trace\s*id)\s*[:\-]?\s*([A-Z0-9]{8,20})\b/i, // Generic alphanumeric after label
        /\b(\d{10,20})\b/ // Any purely numeric 10-20 digit string (fallback)
      ];

      let extractedRef = "";
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          extractedRef = match[1].replace(/\s+/g, ""); // strip spaces (e.g. Maya)
          break;
        }
      }

      if (extractedRef) {
        setReferenceNumber(extractedRef);
      }
    } catch {
      // OCR failed silently — user fills in manually
    } finally {
      setOcrLoading(false);
      setOcrDone(true);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setReceiptPreview(result);
      setReceiptBase64(result);
      setReferenceNumber(""); // reset on new upload
      setOcrDone(false);
      runOCR(result);
    };
    reader.readAsDataURL(file);
  }, [runOCR]);

  const canProceedStep0 = selectedProgram !== "" && selectedClass !== "";
  const canProceedStep1 =
    childInfo.firstName && childInfo.lastName && childInfo.dateOfBirth && childInfo.gender &&
    parentInfo.name && parentInfo.email && parentInfo.phone && parentInfo.relationship &&
    emergencyContact.name && emergencyContact.phone && emergencyContact.relationship;
  const canProceedStep3 = paymentMethod !== "" && receiptBase64 !== "" && amountPaid !== "" && amountShort === 0;

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
          paymentMethod,
          receiptBase64,
          uniformOrdered,
          lanyardOrdered,
          welcomeKitOrdered,
          isNewFamily,
          paymentType,
          amountDue,
          amountPaid: parsedAmountPaid,
          creditBalance,
          referenceNumber,
        }),
      });
      const data = await res.json();
      if (data.success) {
        clearDraft(); // ✅ wipe saved progress after successful submit
        setRegistrationId(data.data.id);
        setStep(5);
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
    <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="min-h-screen bg-[#fdfdfd] flex flex-col relative">

      {/* ── Waiver Modal ── */}
      {waiverModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setWaiverModalOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] rounded-[2rem] bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 shrink-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#0033A0]/50 mb-1">Official Document</p>
              <h2 className="font-headline text-[20px] font-extrabold text-[#002f76]">Parent/Guardian Acknowledgment & Agreement</h2>
              <p className="text-[13px] text-[#64748b] mt-1">Merry Explorers Playgroup Learning Center</p>
              {!waiverScrolled && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                  <span className="text-amber-600 text-[12px] font-bold">👇 Please scroll to the bottom to accept</span>
                </div>
              )}
            </div>

            {/* Scrollable Content */}
            <div
              ref={waiverScrollRef}
              className="flex-1 overflow-y-auto px-8 py-6 text-[13px] text-[#334155] leading-[1.8] space-y-5"
              onScroll={(e) => {
                const el = e.currentTarget;
                const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 60;
                if (atBottom) setWaiverScrolled(true);
              }}
            >
              <p className="font-extrabold text-[15px] text-[#002f76] text-center border-b border-slate-100 pb-4">MERRY EXPLORERS PLAYGROUP LEARNING CENTER</p>
              <p className="text-center font-bold text-[13px] text-[#0033A0]">PARENT/GUARDIAN ACKNOWLEDGMENT & AGREEMENT</p>
              <p className="text-[12px] text-[#64748b] italic text-center">By registering my child with Merry Explorers Playgroup Learning Center, I confirm that I have read, understood, and agree to the following program terms and policies:</p>

              <div className="space-y-1">
                <p className="font-extrabold text-[#002f76]">1. ADVENTURE / CYCLE</p>
                <p>For Merry Explorers, &quot;Adventure&quot; means &quot;Cycle.&quot; Adventure 1, Adventure 2, Adventure 3, and so on refer to the succeeding stages of the program.</p>
                <p>An Adventure is not tied to a calendar month. A child progresses to the next Adventure once the required sessions for their program have been completed, including applicable make-up sessions. Adventure dates may therefore differ between programs.</p>
              </div>

              <div className="space-y-2">
                <p className="font-extrabold text-[#002f76]">2. PROGRAMS</p>
                <p className="font-semibold text-[#334155]">Discovery Club — Discover Through Play</p>
                <p>🔎 <strong>Discovery Club: Curious Explorer</strong> — Ages 1.5–4.11 | ₱4,295 | 8 sessions | 1 hr/session</p>
                <p>🎨 <strong>Discovery Club: Creative Explorer</strong> — Ages 2.6–4.11 | ₱4,820 | 12 sessions | 1 hr 15 mins/session</p>
                <p>Discovery Club provides a play-based environment that encourages socialization, interaction, shared play, and confidence-building. It may also be a suitable starting point for children who are not yet using verbal communication.</p>
                <p>💡 <strong>Trailblazer: Brave Explorer</strong> — Prepare for What&apos;s Next</p>
                <p>Ages 3–4.11 | ₱6,900 | 18 sessions | 1 hr 15 mins/face-to-face session/shift to online</p>
                <p><em>Milestone Checkpoint:</em> The 12th session includes the Exploration Diary presentation, review of the child&apos;s learning and discoveries, and milestone recognition through a Certificate of Recognition/Completion.</p>
                <p><em>Little Trailblazer Prerequisites:</em> The child should be able to comfortably grip age-appropriate materials, participate independently with teachers, and sit still independently for at least 3 minutes.</p>
              </div>

              <div className="space-y-2">
                <p className="font-extrabold text-[#002f76]">3. REGISTRATION & PAYMENT</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>60% reservation payment is required upon registration to secure the child&apos;s slot.</li>
                  <li>The 60% reservation payment is non-refundable once the slot is confirmed.</li>
                  <li>The remaining 40% balance is due on the 6th session.</li>
                  <li>A 4% interest charge will apply to overdue outstanding balances beginning September 10, 2026. Interest is on a <strong>weekly basis applied every Monday</strong>.</li>
                  <li>We will only accept Bank Transfer and GCash payments.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="font-extrabold text-[#002f76]">4. ATTENDANCE & MAKE-UP SESSIONS</p>
                <p>We know that schedules can sometimes change, so we&apos;ve made each program&apos;s make-up arrangement as simple and predictable as possible.</p>
                <p>🎨 <strong>Discovery Club: Curious Explorer</strong> — If a class is suspended due to weather, the session will be moved to the next Monday or Wednesday until all required Adventure sessions are completed.</p>
                <p>🚀 <strong>Discovery Club: Creative Explorer</strong> — Classes will continue according to the regular schedule, and any weather-related suspended session will automatically be made up on a Saturday. The Saturday make-up arrangement will continue until the required number of Adventure sessions is completed.</p>
                <p>💡 <strong>Trailblazer: Brave Explorer</strong> — A suspended face-to-face session will shift online.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Online session: 45 minutes</li>
                  <li>Practice worksheets will be provided</li>
                  <li>The online shift is considered a consumed session</li>
                </ul>
                <p>💛 <strong>Complimentary Free Session for All Explorers</strong> — For an excused missed session (sickness or other valid reasons), each child receives 1 complimentary session per Adventure. This is only one free session regardless of the number of missed sessions, and the schedule will be determined by Merry Explorers.</p>
              </div>

              <div className="space-y-2">
                <p className="font-extrabold text-[#002f76]">5. PHOTO & VIDEO HIGHLIGHTS</p>
                <p>📸 <strong>Photo Highlights — Uploading Schedule:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>🎨 Discovery Club: Curious Explorer — Monday</li>
                  <li>🚀 Discovery Club: Creative Explorer — Tuesday & Thursday</li>
                  <li>💡 Trailblazer: Brave Explorer — Thursday & Friday</li>
                </ul>
                <p>A designated Google Drive folder will be updated after each session. Parents/Guardians may download the photos they wish to keep.</p>
                <p>🎥 <strong>Video Highlights — Uploading Schedule:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>🎨 Discovery Club: Curious Explorer — Friday</li>
                  <li>🚀 Discovery Club: Creative Explorer — Wednesday</li>
                  <li>💡 Trailblazer: Brave Explorer — Monday</li>
                </ul>
                <p>Video Highlights will be posted on the official Merry Explorers page.</p>
                <p>🗑️ <strong>Photo Deletion:</strong> All photos in the Google Drive will be deleted every Saturday at 11:59 PM, regardless of whether they have been downloaded. Parents/Guardians are responsible for downloading photos they wish to keep before the deadline.</p>
              </div>

              <div className="space-y-2">
                <p className="font-extrabold text-[#002f76]">6. MERRY EXPLORERS UNIFORM</p>
                <p>The Merry Explorers uniform is the <strong>SAME uniform</strong>. If your child already has a Merry Explorers uniform from the previous chapter, you are <strong>NOT required</strong> to purchase a new set for Adventure 1.</p>
                <p><strong>Uniform Days:</strong> Wednesday & Friday. On all other class days, children may wear anything comfortable, safe, and appropriate for active play and learning.</p>
                <p><strong>Uniform Kit — ₱650</strong> includes: 1 Merry Explorers polo shirt with logo, 1 pair of jogging pants, 1 name tag with Merry Explorers lanyard.</p>
                <p><strong>Lanyard & Name Tag — ₱100</strong> — May also be purchased separately.</p>
                <p>If you just need the uniform, you may still purchase the polo and jogging pants with the Merry Explorers logo priced at ₱550/set.</p>
              </div>

              <div className="rounded-2xl bg-[#f8fafc] border border-slate-200 p-5 space-y-2">
                <p className="font-extrabold text-[#002f76] text-[14px]">PARENT/GUARDIAN ACKNOWLEDGMENT</p>
                <p>I, the undersigned Parent/Guardian, confirm that I have read, understood, and voluntarily agree to all terms and policies stated in this Agreement, including those covering program requirements, payments, attendance and make-ups, photos and videos, and uniforms.</p>
                <p>I confirm that the information I provided about my child is true and complete, and I agree to comply with Merry Explorers&apos; policies and arrangements.</p>
                <p>By signing, I voluntarily acknowledge, accept, and agree to be bound by these terms and policies as part of my child&apos;s registration with Merry Explorers Playgroup Learning Center.</p>
              </div>

              {/* Spacer so user definitely sees the bottom */}
              <div className="h-4" />
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-slate-100 shrink-0 flex items-center gap-3">
              <button
                onClick={() => setWaiverModalOpen(false)}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-[14px] font-bold text-[#64748b] hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                disabled={!waiverScrolled}
                onClick={() => { setWaiverRead(true); setWaiverModalOpen(false); }}
                className={`flex-1 rounded-2xl py-3 text-[14px] font-bold text-white transition-all ${waiverScrolled
                  ? "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20"
                  : "bg-slate-300 cursor-not-allowed"
                  }`}
              >
                {waiverScrolled ? "✓ I Accept the Waiver" : "↓ Scroll to Accept"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── Dreamy Background Orbs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div aria-hidden className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#0033A0] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.07]"></div>
        <div aria-hidden className="absolute top-40 -right-20 w-[500px] h-[500px] bg-[#FFC107] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.1]"></div>
        <div aria-hidden className="absolute -bottom-40 left-1/3 w-[700px] h-[700px] bg-[#0050d5] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.05]"></div>
      </div>

      {/* Header */}
      <header className="relative z-50 bg-white/60 border-b border-black/5 sticky top-0 backdrop-blur-xl">
        <div className="mx-auto flex h-[80px] w-full max-w-[1400px] items-center justify-between px-6 sm:px-10">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 transition-transform hover:scale-[0.98]">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl">
              <Image src="/LOGO-noBG.png" alt="Merry Explorers Logo" fill sizes="40px" className="object-contain" />
            </div>
            <span className="flex flex-col leading-none">
              <span className="font-headline text-[18px] font-extrabold tracking-tight text-[#0033A0]">Merry</span>
              <span className="font-headline text-[12px] font-bold tracking-[0.12em] text-[#FFB800]">Explorers</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-full px-6 py-2.5 text-[15px] font-bold transition-all text-[#64748b] hover:bg-black/5 hover:text-[#0033A0]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="w-10 shrink-0" aria-hidden="true" />
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-start px-5 py-12 sm:py-16">

        {/* Header Text */}
        <div className="text-center mb-8">
          <m.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-block mb-4">
              <span className="text-4xl">🎒</span>
            </span>
            <h1 className="font-headline text-[40px] sm:text-[48px] font-extrabold leading-[1.1] tracking-tight text-[#0f172a] mb-4">
              Register Your Explorer
            </h1>
            <p className="text-[17px] font-medium text-[#64748b] max-w-lg mx-auto leading-relaxed">
              Secure your child&apos;s slot in just a few steps
            </p>
          </m.div>
        </div>

        <div className="w-full max-w-[800px]">

          {/* Step progress */}
          {step < 5 && (
            <div className="mb-8 w-full max-w-lg mx-auto">
              {/* Draft restored banner */}
              {draft && step > 0 && (
                <m.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex items-center gap-3 rounded-2xl bg-[#0033A0]/5 border border-[#0033A0]/20 px-4 py-3"
                >
                  <span className="text-lg">💾</span>
                  <p className="text-[12px] font-semibold text-[#0033A0] flex-1">Your progress was saved — welcome back!</p>
                  <button
                    onClick={() => { clearDraft(); window.location.reload(); }}
                    className="shrink-0 text-[11px] font-bold text-[#64748b] hover:text-red-500 transition-colors underline"
                  >
                    Start fresh
                  </button>
                </m.div>
              )}
              <div className="flex items-center justify-between px-2">
                {STEPS.slice(0, 5).map((label, i) => (
                  <div key={label} className={`flex items-center ${i < 4 ? "flex-1" : ""}`}>
                    <StepDot label={label} index={i} current={step} />
                    {i < 4 && <div className={`flex-1 h-0.5 mx-3 rounded-full transition-all duration-500 ${i < step ? "bg-green-400" : "bg-slate-200"}`} />}
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* Floating Form Card */}
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-12 shadow-[0_24px_80px_rgba(0,51,160,0.06)] border border-white"
          >
            <AnimatePresence mode="wait">

              {/* ── STEP 0: Choose Program ── */}
              {step === 0 && (
                <m.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <h2 className="mb-2 font-headline text-[24px] font-extrabold text-[#002f76]">Choose a Program</h2>
                  <p className="mb-6 text-[14px] text-[#64748b]">Select the program and class time that works best for your child.</p>

                  <div className="space-y-5">
                    {(Object.values(PROGRAM_SLOTS) as typeof PROGRAM_SLOTS[ProgramId][]).map((p) => {
                      const programSlots = slots[p.id] || {};
                      const totalAvailable = Object.values(programSlots).reduce((a, c) => a + c.available, 0);
                      const isSelected = selectedProgram === p.id;

                      return (
                        <div
                          key={p.id}
                          className={`rounded-3xl border-2 overflow-hidden transition-all duration-200 cursor-pointer ${isSelected ? "border-[#0033A0] shadow-lg shadow-[#0033A0]/10" : "border-slate-100 hover:border-slate-200 bg-white"}`}
                          onClick={() => { setSelectedProgram(p.id as ProgramId); setSelectedClass(""); }}
                        >
                          {/* Card header */}
                          <div className="flex items-center justify-between px-6 py-5 bg-white">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: p.accentSoft }}>
                                {p.icon}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-headline text-[16px] font-extrabold text-[#002f76]">{p.name}</h3>
                                  {totalAvailable === 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">Full</span>}
                                </div>
                                <p className="text-[12px] text-[#64748b]">{p.ageRange} • {p.schedule} • {p.sessions} Sessions</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[18px] font-extrabold text-[#002f76]">₱{p.rate.toLocaleString()}</p>
                              <p className="text-[11px] text-[#94a3b8]">60% down: ₱{p.downpayment.toLocaleString()}</p>
                            </div>
                          </div>

                          {/* Class options */}
                          {isSelected && (
                            <div className="border-t border-slate-100 bg-[#f8fafc] px-6 py-4 space-y-3">
                              {p.prerequisite && (
                                <div className="flex gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-[12px] text-amber-800 font-medium">
                                  <span className="shrink-0">⚠️</span> <span><strong>Pre-requisite:</strong> {p.prerequisite}</span>
                                </div>
                              )}
                              <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-widest">Select Class Time</p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {p.classes.map((cls) => {
                                  const slotInfo = programSlots[cls.name];
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
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      disabled={!canProceedStep0}
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-[#0033A0]/20 transition-all hover:bg-[#002f76] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Continue <span>→</span>
                    </button>
                  </div>
                </m.div>
              )}

              {/* ── STEP 1: Details ── */}
              {step === 1 && (
                <m.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <h2 className="mb-2 font-headline text-[24px] font-extrabold text-[#002f76]">Explorer Information</h2>
                  <p className="mb-6 text-[14px] text-[#64748b]">Tell us about your child and your contact details.</p>

                  {/* Child Info */}
                  <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm space-y-4">
                    <h3 className="font-headline text-[16px] font-extrabold text-[#0033A0]">🧒 Child Information</h3>
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
                    <div className="grid gap-4 sm:grid-cols-3 mt-4">
                      <FieldRow label="Favorite Song">
                        <input className={inputCls} value={childInfo.favoriteSong} onChange={e => setChildInfo((p: any) => ({ ...p, favoriteSong: e.target.value }))} placeholder="e.g. Baby Shark" />
                      </FieldRow>
                      <FieldRow label="Favorite Color">
                        <input className={inputCls} value={childInfo.favoriteColor} onChange={e => setChildInfo((p: any) => ({ ...p, favoriteColor: e.target.value }))} placeholder="e.g. Blue" />
                      </FieldRow>
                      <FieldRow label="Favorite Character">
                        <input className={inputCls} value={childInfo.favoriteCharacter} onChange={e => setChildInfo((p: any) => ({ ...p, favoriteCharacter: e.target.value }))} placeholder="e.g. Elsa" />
                      </FieldRow>
                    </div>
                    <FieldRow label="Health and Medical Profile">
                      <textarea className={inputCls} rows={3} value={childInfo.healthProfile} onChange={e => setChildInfo((p: any) => ({ ...p, healthProfile: e.target.value }))} placeholder="Please list any allergies, medical conditions, or special needs we should be aware of." />
                    </FieldRow>
                  </div>

                  {/* Parent Info */}
                  <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm space-y-4">
                    <h3 className="font-headline text-[16px] font-extrabold text-[#0033A0]">👨‍👩‍👧 Parent / Guardian</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FieldRow label="Full Name *">
                        <input className={inputCls} value={parentInfo.name} onChange={e => setParentInfo((p: any) => ({ ...p, name: e.target.value }))} placeholder="Full name" />
                      </FieldRow>
                      <FieldRow label="Relationship *">
                        <select className={inputCls} value={parentInfo.relationship} onChange={e => setParentInfo((p: any) => ({ ...p, relationship: e.target.value }))}>
                          <option value="">Select</option>
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

                  {/* Emergency Contact */}
                  <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm space-y-4">
                    <h3 className="font-headline text-[16px] font-extrabold text-[#0033A0]">🚨 Emergency Contact</h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <FieldRow label="Full Name *">
                        <input className={inputCls} value={emergencyContact.name} onChange={e => setEmergencyContact((p: any) => ({ ...p, name: e.target.value }))} placeholder="Full name" />
                      </FieldRow>
                      <FieldRow label="Phone *">
                        <input type="tel" className={inputCls} value={emergencyContact.phone} onChange={e => setEmergencyContact((p: any) => ({ ...p, phone: e.target.value }))} placeholder="09XX XXX XXXX" />
                      </FieldRow>
                      <FieldRow label="Relationship *">
                        <select className={inputCls} value={emergencyContact.relationship} onChange={e => setEmergencyContact((p: any) => ({ ...p, relationship: e.target.value }))}>
                          <option value="">Select</option>
                          <option>Mother</option><option>Father</option><option>Grandparent</option><option>Aunt/Uncle</option><option>Other</option>
                        </select>
                      </FieldRow>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <button onClick={() => setStep(0)} className="rounded-2xl border border-slate-200 px-6 py-3.5 text-[14px] font-bold text-[#64748b] hover:bg-slate-50 transition-colors">
                      ← Back
                    </button>
                    <button
                      disabled={!canProceedStep1}
                      onClick={() => setStep(2)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-[#0033A0]/20 transition-all hover:bg-[#002f76] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Continue <span>→</span>
                    </button>
                  </div>
                </m.div>
              )}

              {/* ── STEP 2: Consents & Waivers ── */}
              {step === 2 && (
                <m.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <h2 className="mb-2 font-headline text-[24px] font-extrabold text-[#002f76]">Consents & Waivers</h2>
                  <p className="mb-6 text-[14px] text-[#64748b]">Please read and agree to the following before proceeding.</p>

                  {/* Photo/Video Consent */}
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
                          <input
                            type="radio"
                            name="photoConsent"
                            value={opt.value}
                            checked={photoConsent === opt.value}
                            onChange={() => setPhotoConsent(opt.value)}
                            className="mt-0.5 accent-[#0033A0] shrink-0"
                          />
                          <span className="text-[13px] font-medium text-[#334155]">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Program Waiver — modal trigger */}
                  <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl transition-all ${waiverRead ? "bg-green-100" : "bg-[#0033A0]/10"}`}>
                        {waiverRead ? "✅" : "📋"}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-headline text-[16px] font-extrabold text-[#0033A0]">Parent/Guardian Acknowledgment & Agreement</h3>
                        <p className="text-[13px] text-[#64748b] mt-1">
                          {waiverRead
                            ? "You have read and accepted the program waiver."
                            : "You must read and accept the full waiver before signing."}
                        </p>
                      </div>
                    </div>

                    {waiverRead ? (
                      <div className="flex items-center gap-2 rounded-2xl bg-green-50 border border-green-200 px-4 py-3">
                        <span className="text-green-600 font-bold text-[13px]">✓ Waiver accepted</span>
                        <button onClick={() => setWaiverModalOpen(true)} className="ml-auto text-[12px] text-[#0033A0] hover:underline font-semibold">Re-read</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setWaiverModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#0033A0] py-4 text-[14px] font-bold text-white shadow-md shadow-[#0033A0]/20 hover:bg-[#002f76] transition-colors"
                      >
                        📄 Read & Accept Waiver
                      </button>
                    )}

                    {/* Signature — only shown after waiver is accepted */}
                    {waiverRead && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[12px] font-bold uppercase tracking-widest text-[#0033A0]/60 mb-2">Signature over Printed Name of Parent/Guardian</p>
                        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-[#f8fafc] overflow-hidden">
                          <SignatureCanvas
                            ref={sigCanvas}
                            penColor="#0033A0"
                            canvasProps={{ className: "w-full", height: 160 }}
                            onEnd={() => {
                              if (sigCanvas.current) {
                                setSignatureBase64(sigCanvas.current.toDataURL("image/png"));
                              }
                            }}
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-[12px] text-[#64748b]">
                            <span className="font-semibold text-[#334155]">{parentInfo.name || "Parent/Guardian Name"}</span>
                            <span className="ml-3 text-[#94a3b8]">{new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</span>
                          </div>
                          <button
                            onClick={() => { sigCanvas.current?.clear(); setSignatureBase64(""); }}
                            className="text-[12px] font-semibold text-red-400 hover:text-red-600 transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                        {!signatureBase64 && (
                          <p className="mt-2 text-[11px] text-amber-600 font-medium">✏️ Please sign in the box above to proceed.</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex justify-between">
                    <button onClick={() => setStep(1)} className="rounded-2xl border border-slate-200 px-6 py-3.5 text-[14px] font-bold text-[#64748b] hover:bg-slate-50 transition-colors">
                      ← Back
                    </button>
                    <button
                      disabled={!photoConsent || !waiverRead || !signatureBase64}
                      onClick={() => setStep(3)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-[#0033A0]/20 transition-all hover:bg-[#002f76] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Continue <span>→</span>
                    </button>
                  </div>
                </m.div>
              )}


              {/* ── STEP 3: Payment ── */}
              {step === 3 && prog && (
                <m.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <h2 className="mb-2 font-headline text-[24px] font-extrabold text-[#002f76]">Payment</h2>
                  <p className="mb-6 text-[14px] text-[#64748b]">Choose your payment option, scan the QR code, and upload your receipt to confirm your slot.</p>

                  {/* Payment Type Toggle */}
                  <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <h3 className="mb-3 font-headline text-[16px] font-extrabold text-[#0033A0]">Payment Option</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentType("downpayment")}
                        className={[
                          "flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all duration-200",
                          paymentType === "downpayment"
                            ? "border-[#0033A0] bg-[#0033A0]/5 shadow-md"
                            : "border-slate-200 hover:border-slate-300 bg-white",
                        ].join(" ")}
                      >
                        <span className="text-2xl">💳</span>
                        <p className="text-[14px] font-extrabold text-[#002f76]">60% Downpayment</p>
                        <p className="text-[18px] font-extrabold text-[#0033A0]">₱{(prog.downpayment + (uniformOrdered ? UNIFORM_KIT.price : 0)).toLocaleString()}</p>
                        <p className="text-[11px] text-[#64748b] text-center">40% balance (₱{prog.balance.toLocaleString()}) due on 6th session</p>
                        {paymentType === "downpayment" && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#0033A0] px-3 py-0.5 text-[10px] font-bold text-white">✓ Selected</span>
                        )}
                      </button>
                      <button
                        onClick={() => setPaymentType("full")}
                        className={[
                          "flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all duration-200",
                          paymentType === "full"
                            ? "border-green-500 bg-green-50 shadow-md"
                            : "border-slate-200 hover:border-slate-300 bg-white",
                        ].join(" ")}
                      >
                        <span className="text-2xl">🏆</span>
                        <p className="text-[14px] font-extrabold text-[#002f76]">Full Payment</p>
                        <p className="text-[18px] font-extrabold text-green-600">₱{(prog.rate + (uniformOrdered ? UNIFORM_KIT.price : 0)).toLocaleString()}</p>
                        <p className="text-[11px] text-[#64748b] text-center">₱0 balance remaining — fully settled</p>
                        {paymentType === "full" && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-500 px-3 py-0.5 text-[10px] font-bold text-white">✓ Selected</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Amount card */}
                  <div className={`mb-6 rounded-3xl p-6 text-white shadow-xl ${paymentType === "full"
                    ? "bg-gradient-to-br from-green-600 to-green-500 shadow-green-500/20"
                    : "bg-gradient-to-br from-[#0033A0] to-[#0066CC] shadow-[#0033A0]/20"
                    }`}>
                    <p className="text-[12px] font-bold uppercase tracking-widest opacity-70">Amount Due Today</p>
                    <p className="mt-1 text-[40px] font-extrabold leading-none">₱{amountDue.toLocaleString()}</p>

                    {/* Cost Breakdown */}
                    <div className="mt-4 space-y-1.5 bg-white/10 rounded-2xl px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-2">Cost Breakdown</p>
                      <div className="flex justify-between text-[13px]">
                        <span className="opacity-80">{paymentType === "full" ? "Program Rate (Full)" : "Downpayment (60%)"}</span>
                        <span className="font-bold">₱{(paymentType === "full" ? prog.rate : prog.downpayment).toLocaleString()}</span>
                      </div>
                      {isNewFamily && (
                        <div className="flex justify-between text-[13px]">
                          <span className="opacity-80">Welcome Kit (Required)</span>
                          <span className="font-bold">₱{UNIFORM_KIT.welcomeKitPrice.toLocaleString()}</span>
                        </div>
                      )}
                      {!isNewFamily && welcomeKitOrdered && (
                        <div className="flex justify-between text-[13px]">
                          <span className="opacity-80">Welcome Kit</span>
                          <span className="font-bold">₱{UNIFORM_KIT.welcomeKitPrice.toLocaleString()}</span>
                        </div>
                      )}
                      {!isNewFamily && uniformOrdered && (
                        <div className="flex justify-between text-[13px]">
                          <span className="opacity-80">Uniform Set</span>
                          <span className="font-bold">₱{UNIFORM_KIT.price.toLocaleString()}</span>
                        </div>
                      )}
                      {!isNewFamily && lanyardOrdered && (
                        <div className="flex justify-between text-[13px]">
                          <span className="opacity-80">Lanyard &amp; Name Tag</span>
                          <span className="font-bold">₱{UNIFORM_KIT.lanyardPrice.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[13px] border-t border-white/20 pt-2 mt-1">
                        <span className="font-bold">Total Due Now</span>
                        <span className="font-extrabold">₱{amountDue.toLocaleString()}</span>
                      </div>
                      {paymentType === "downpayment" && (
                        <div className="flex justify-between text-[12px] opacity-70">
                          <span>Remaining balance (40%)</span>
                          <span>₱{prog.balance.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <p className="mt-3 text-[11px] bg-white/10 rounded-xl px-3 py-2">
                      ⚠️ Downpayment is non-refundable. 4% weekly interest applies to overdue balances (every Monday).
                    </p>
                  </div>

                  {/* Payment method */}
                  <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <h3 className="mb-4 font-headline text-[16px] font-extrabold text-[#0033A0]">Select Payment Method</h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { id: "gcash", label: "GCash", logo: "/gcash-logo.svg", qr: "/GCASHQRONLY.png" },
                        { id: "bpi", label: "BPI", logo: "/bpi-logo.svg", qr: "/BPIQRONLY.png" },
                        { id: "mari-bank", label: "Mari Bank", logo: "/maribank-logo.svg", qr: "/MARIBANKQRONLY.png" },
                      ].map((method) => (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          className={[
                            "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 py-5 px-3 transition-all duration-150",
                            paymentMethod === method.id
                              ? "border-[#0033A0] bg-[#0033A0]/5 shadow-sm"
                              : "border-slate-200 hover:border-slate-300",
                          ].join(" ")}
                        >
                          <div className="relative h-8 w-24">
                            <Image src={method.logo} alt={method.label} fill className="object-contain" sizes="96px" />
                          </div>
                          <span className="text-[13px] font-bold text-[#002f76]">{method.label}</span>
                        </button>
                      ))}
                    </div>
                    {paymentMethod && (
                      <div className="mt-5">
                        {[
                          { id: "gcash", label: "GCash", qr: "/GCASHQRONLY.png" },
                          { id: "bpi", label: "BPI", qr: "/BPIQRONLY.png" },
                          { id: "mari-bank", label: "Mari Bank", qr: "/MARIBANKQRONLY.png" },
                        ].filter(m => m.id === paymentMethod).map(m => (
                          <div key={m.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center text-center gap-5">
                            <div className="relative w-full max-w-[320px] aspect-square shrink-0 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-md">
                              <Image src={m.qr} alt={`${m.label} QR Code`} fill className="object-contain p-4" sizes="320px" priority />
                            </div>
                            <div className="max-w-sm">
                              <p className="text-[16px] font-extrabold text-[#002f76] mb-2">📲 Scan to Pay via {m.label}</p>
                              <a href={m.qr} download={`${m.label.replace(/\s+/g, "")}QR.png`} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0]/10 px-4 py-2 text-[12px] font-bold text-[#0033A0] hover:bg-[#0033A0]/20 transition-colors mb-3">
                                ⬇️ Download QR Code
                              </a>
                              <p className="text-[12px] text-[#64748b] leading-relaxed">
                                Scan the QR code using your {m.label} app to send <strong>₱{amountDue.toLocaleString()}</strong>. After paying, take a screenshot of the confirmation and upload it below.
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Receipt upload */}
                  <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <h3 className="mb-1 font-headline text-[16px] font-extrabold text-[#0033A0]">Upload Payment Receipt *</h3>
                    <p className="mb-4 text-[13px] text-[#64748b]">Upload a screenshot or photo of your payment confirmation.</p>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                    {receiptPreview ? (
                      <div className="relative">
                        <div className="relative aspect-[4/3] w-full max-w-sm mx-auto overflow-hidden rounded-2xl border border-slate-200">
                          <Image src={receiptPreview} alt="Receipt preview" fill className="object-contain" sizes="400px" />
                        </div>
                        <button onClick={() => { setReceiptPreview(""); setReceiptBase64(""); setReferenceNumber(""); setOcrDone(false); }} className="mt-3 text-[13px] font-semibold text-red-500 hover:underline">
                          Remove and re-upload
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 px-6 text-center hover:border-[#0033A0]/30 hover:bg-[#f0f5ff] transition-colors"
                      >
                        <span className="text-4xl">📸</span>
                        <div>
                          <p className="text-[14px] font-bold text-[#002f76]">Click to upload receipt</p>
                          <p className="text-[12px] text-[#94a3b8]">JPG, PNG, or screenshot</p>
                        </div>
                      </button>
                    )}

                    {/* Reference number field — appears after receipt upload */}
                    {receiptBase64 && (
                      <div className="mt-5 border-t border-slate-100 pt-5">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className={labelCls}>Reference / Transaction Number</label>
                          {ocrLoading && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0033A0] animate-pulse">
                              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                              </svg>
                              Extracting from receipt...
                            </span>
                          )}
                          {ocrDone && !ocrLoading && referenceNumber && (
                            <span className="text-[11px] font-bold text-green-600">✓ Auto-filled from receipt</span>
                          )}
                          {ocrDone && !ocrLoading && !referenceNumber && (
                            <span className="text-[11px] font-semibold text-amber-500">Couldn&apos;t extract — please type manually</span>
                          )}
                        </div>
                        <input
                          className={inputCls}
                          value={referenceNumber}
                          onChange={e => setReferenceNumber(e.target.value)}
                          placeholder="e.g. 1234567890123"
                          type="text"
                          inputMode="numeric"
                        />
                        <p className="mt-1.5 text-[11px] text-[#94a3b8]">Found on your GCash/BPI/Mari Bank payment confirmation screen.</p>
                      </div>
                    )}
                  </div>

                  {/* Amount Paid */}
                  {receiptBase64 && (
                    <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                      <h3 className="mb-1 font-headline text-[16px] font-extrabold text-[#0033A0]">Amount You Sent *</h3>
                      <p className="mb-4 text-[13px] text-[#64748b]">Enter the exact amount shown on your receipt.</p>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[16px] font-extrabold text-[#0033A0]">₱</span>
                        <input
                          className={`${inputCls} pl-8`}
                          value={amountPaid}
                          onChange={e => setAmountPaid(e.target.value.replace(/[^0-9.]/g, ""))}
                          placeholder={amountDue.toLocaleString()}
                          type="text"
                          inputMode="decimal"
                        />
                      </div>
                      {/* Live feedback */}
                      {parsedAmountPaid > 0 && (
                        <div className={`mt-3 flex items-start gap-3 rounded-2xl px-4 py-3 text-[13px] font-semibold ${amountExact ? "bg-green-50 border border-green-200 text-green-700"
                          : creditBalance > 0 ? "bg-blue-50 border border-blue-200 text-blue-700"
                            : "bg-red-50 border border-red-200 text-red-700"
                          }`}>
                          <span className="text-[18px] leading-none shrink-0">
                            {amountExact ? "✅" : creditBalance > 0 ? "💚" : "❌"}
                          </span>
                          <div>
                            {amountExact && <p>Amount matches exactly — good to go!</p>}
                            {creditBalance > 0 && (
                              <>
                                <p className="font-extrabold">Overpaid by ₱{creditBalance.toLocaleString()}</p>
                                <p className="text-[12px] opacity-80 mt-0.5">This ₱{creditBalance.toLocaleString()} credit will be noted and applied to your remaining balance.</p>
                              </>
                            )}
                            {amountShort > 0 && (
                              <>
                                <p className="font-extrabold">Short by ₱{amountShort.toLocaleString()}</p>
                                <p className="text-[12px] opacity-80 mt-0.5">Required: ₱{amountDue.toLocaleString()} — please send the missing amount before submitting.</p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Uniform & Add-ons */}
                  <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <h3 className="mb-1 font-headline text-[16px] font-extrabold text-[#0033A0]">👕 Uniform &amp; Add-ons</h3>
                    <p className="mb-4 text-[13px] text-[#64748b]">{UNIFORM_KIT.note}</p>

                    {/* New / Returning Family toggle */}
                    <label className={`flex items-start gap-3 cursor-pointer rounded-2xl border-2 p-4 mb-4 transition-all ${isNewFamily ? "border-[#0033A0] bg-[#0033A0]/5" : "border-slate-200 hover:border-slate-300"}`}>
                      <input
                        type="checkbox"
                        checked={isNewFamily}
                        onChange={e => {
                          setIsNewFamily(e.target.checked);
                          if (e.target.checked) {
                            setUniformOrdered(false);
                            setLanyardOrdered(false);
                            setWelcomeKitOrdered(false);
                          }
                        }}
                        className="mt-0.5 h-4 w-4 rounded accent-[#0033A0]"
                      />
                      <div>
                        <p className="text-[14px] font-bold text-[#002f76]">We are a <span className="text-[#0033A0]">New Family</span> at Merry Explorers (First time to register).</p>
                        <p className="text-[12px] text-[#64748b] mt-0.5">Welcome Kit (₱750) is required and will be automatically included for first-time families.</p>
                      </div>
                    </label>

                    {isNewFamily ? (
                      <div className="flex items-start gap-3 rounded-2xl border-2 border-green-400 bg-green-50 p-4">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500">
                          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-[14px] font-bold text-green-800">Welcome Kit — ₱{UNIFORM_KIT.welcomeKitPrice.toLocaleString()}</p>
                            <span className="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-extrabold text-white">AUTO-ADDED</span>
                          </div>
                          <p className="text-[12px] text-green-700 mt-0.5">{UNIFORM_KIT.welcomeKitItems.join(" • ")}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">Optional Add-ons for Returning Families</p>

                        <label className={`flex items-start gap-3 cursor-pointer rounded-2xl border-2 p-4 transition-all ${welcomeKitOrdered ? "border-[#0033A0] bg-[#0033A0]/5" : "border-slate-200 hover:border-slate-300"}`}>
                          <input type="checkbox" checked={welcomeKitOrdered} onChange={e => setWelcomeKitOrdered(e.target.checked)} className="mt-1 h-4 w-4 rounded accent-[#0033A0]" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-[14px] font-bold text-[#002f76]">Welcome Kit — ₱{UNIFORM_KIT.welcomeKitPrice.toLocaleString()}</p>
                            </div>
                            <p className="text-[12px] text-[#64748b] mt-0.5">{UNIFORM_KIT.welcomeKitItems.join(" • ")}</p>
                          </div>
                        </label>

                        <label className={`flex items-start gap-3 cursor-pointer rounded-2xl border-2 p-4 transition-all ${uniformOrdered ? "border-[#0033A0] bg-[#0033A0]/5" : "border-slate-200 hover:border-slate-300"}`}>
                          <input type="checkbox" checked={uniformOrdered} onChange={e => setUniformOrdered(e.target.checked)} className="mt-1 h-4 w-4 rounded accent-[#0033A0]" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-[14px] font-bold text-[#002f76]">Uniform Set only — ₱{UNIFORM_KIT.price.toLocaleString()}</p>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">NO LANYARD</span>
                            </div>
                            <p className="text-[12px] text-[#64748b] mt-0.5">{UNIFORM_KIT.items.join(" • ")}</p>
                          </div>
                        </label>

                        <label className={`flex items-start gap-3 cursor-pointer rounded-2xl border-2 p-4 transition-all ${lanyardOrdered ? "border-[#0033A0] bg-[#0033A0]/5" : "border-slate-200 hover:border-slate-300"}`}>
                          <input type="checkbox" checked={lanyardOrdered} onChange={e => setLanyardOrdered(e.target.checked)} className="mt-1 h-4 w-4 rounded accent-[#0033A0]" />
                          <div className="flex-1">
                            <p className="text-[14px] font-bold text-[#002f76]">Lanyard &amp; Name Tag — ₱{UNIFORM_KIT.lanyardPrice.toLocaleString()}</p>
                            <p className="text-[12px] text-[#64748b] mt-0.5">{UNIFORM_KIT.lanyardItems.join(" • ")}</p>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Cannot proceed notice if short */}
                  {amountShort > 0 && (
                    <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-[13px] font-medium text-red-700">
                      ❌ You cannot proceed until the amount paid matches or exceeds the amount due (₱{amountDue.toLocaleString()}).
                    </div>
                  )}

                  <div className="mt-8 flex justify-between">
                    <button onClick={() => setStep(2)} className="rounded-2xl border border-slate-200 px-6 py-3.5 text-[14px] font-bold text-[#64748b] hover:bg-slate-50 transition-colors">
                      ← Back
                    </button>
                    <button
                      disabled={!canProceedStep3}
                      onClick={() => setStep(4)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-[#0033A0]/20 transition-all hover:bg-[#002f76] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Review →
                    </button>
                  </div>
                </m.div>
              )}

              {/* ── STEP 4: Review ── */}
              {step === 4 && prog && (
                <m.div key="step4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <h2 className="mb-2 font-headline text-[24px] font-extrabold text-[#002f76]">Review & Confirm</h2>
                  <p className="mb-6 text-[14px] text-[#64748b]">Please double-check all details before submitting.</p>

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
                        ["Name", `${childInfo.firstName} ${childInfo.lastName}${childInfo.nickname ? ` (${childInfo.nickname})` : ""}`],
                        ["Date of Birth", childInfo.dateOfBirth],
                        ["Gender", childInfo.gender],
                        ["Favorites", `${childInfo.favoriteSong} / ${childInfo.favoriteColor} / ${childInfo.favoriteCharacter}`],
                        ["Health Profile", childInfo.healthProfile || "None"],
                      ],
                    },
                    {
                      title: "Consents", emoji: "📝", rows: [
                        ["Photo/Video Consent", photoConsent === "yes" ? "Yes" : "No"],
                        ["Program Waiver", "Digitally Signed"],
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
                      title: "Payment", emoji: "💳", rows: [
                        ["Payment Type", paymentType === "full" ? "Full Payment ✓" : "60% Downpayment"],
                        ["Method", paymentMethod.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())],
                        ["Receipt", "Uploaded ✓"],
                        ["Uniform Kit", uniformOrdered ? `Yes (+₱${UNIFORM_KIT.price})` : "No"],
                        ["Amount Due", `₱${amountDue.toLocaleString()}`],
                        ["Amount Paid", `₱${parsedAmountPaid.toLocaleString()}`],
                        ...(creditBalance > 0 ? [["Credit Balance", `+₱${creditBalance.toLocaleString()} (applied to balance)`]] : []),
                        ["Ref. / Txn No.", referenceNumber || "—"],
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

                  {error && (
                    <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-[13px] font-medium text-red-700">
                      ❌ {error}
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 text-[12px] text-amber-800">
                    <p><strong>Payment Terms:</strong> The 60% downpayment is non-refundable. The 40% balance is due on the 6th session. A 4% weekly interest applies to overdue balances (charged every Monday).</p>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <button onClick={() => setStep(3)} disabled={submitting} className="rounded-2xl border border-slate-200 px-6 py-3.5 text-[14px] font-bold text-[#64748b] hover:bg-slate-50 transition-colors disabled:opacity-50">
                      ← Back
                    </button>
                    <button
                      disabled={submitting}
                      onClick={handleSubmit}
                      className="inline-flex items-center gap-2 rounded-2xl bg-green-500 px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-green-500/20 transition-all hover:bg-green-600 disabled:opacity-60"
                    >
                      {submitting ? "Submitting..." : "Submit Registration 🎉"}
                    </button>
                  </div>
                </m.div>
              )}

              {/* ── STEP 5: Success ── */}
              {step === 5 && (
                <m.div key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="text-center py-8">
                  <m.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                    className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-5xl shadow-xl shadow-green-500/20"
                  >
                    🎒
                  </m.div>
                  <h2 className="font-headline text-[30px] font-extrabold text-[#002f76]">Application Submitted!</h2>
                  {registrationId && (
                    <div className="mt-3 inline-block rounded-2xl bg-blue-50 border border-blue-200/60 px-4 py-2 text-[13px] font-semibold text-[#0033A0]">
                      Registration Reference: <span className="font-mono font-bold">{registrationId}</span>
                    </div>
                  )}
                  <p className="mt-3 text-[16px] font-medium text-[#64748b] max-w-md mx-auto leading-relaxed">
                    Thank you for registering! We&apos;ve received your application and payment receipt. Our team will review and verify your payment within 1–2 business days.
                  </p>
                  <div className="mt-6 mx-auto max-w-sm rounded-3xl bg-white border border-slate-100 p-6 shadow-sm text-left">
                    <p className="text-[12px] font-bold uppercase tracking-widest text-[#94a3b8] mb-3">What Happens Next</p>
                    <ol className="space-y-3 text-[14px]">
                      {["Our team reviews your payment receipt.", "Once approved, you'll get a confirmation email with full enrollment details.", "Your explorer's slot is officially secured! 🌟"].map((text, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0033A0] text-[10px] font-bold text-white">{i + 1}</span>
                          <span className="text-[#334155] font-medium">{text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link href="/" className="rounded-2xl border border-slate-200 px-6 py-3.5 text-[14px] font-bold text-[#64748b] hover:bg-slate-50 transition-colors">
                      ← Back to Home
                    </Link>
                  </div>
                </m.div>
              )}

            </AnimatePresence>
          </m.div>

        </div>
      </main>

      <SiteFooter />
    </m.div>
  );
}
