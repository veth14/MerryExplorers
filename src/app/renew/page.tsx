"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { PROGRAM_SLOTS, UNIFORM_KIT } from "@/data/landing";
import { FALLBACK_PIONEER_RATES } from "@/lib/payment-terms";
import { SiteHeader } from "@/components/landing/site-header";
import { DreamBanner } from "@/components/DreamBanner";
import SignatureCanvas from "react-signature-canvas";

type ProgramId = keyof typeof PROGRAM_SLOTS;
type SlotData = Record<string, Record<string, { maxSlots: number; taken: number; available: number }>>;

// ─── Design Tokens (aligned with Parent Portal / TrailblazerDashboard) ───────
const NAVY = "#0b2a82";
const BLUE = "#1f7ae0";
const SUN = "#ffd23f";
const SUN_LIGHT = "#ffe066";
const SUN_DEEP = "#ffb82e";
const ORANGE = "#ff8a1f";
const INPUT_BG = "#f2faff";
const INPUT_BORDER = "#b6dcf5";
const TEXT_2 = "#3d5a99";

const STEPS = ["Confirm Info", "Choose Program", "Consents", "Review"];

// ─── Playful Background Scene ───────────────────────────────────────────────
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

function EarlyStateStyles() {
  return (
    <style jsx global>{`
      .vp-root {
        color: ${NAVY};
        font-family: inherit;
        background: radial-gradient(ellipse at 50% 0%, #b9e5fb 0%, #8fd3f7 55%, #74c3f1 100%);
        background-attachment: fixed;
      }
      .vp-scene { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
      .vp-sticker { filter: drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff); }
      .vp-sun { position: absolute; top: 12px; right: 24px; width: 130px; }
      .vp-cloud { position: absolute; left: 0; width: 130px; overflow: visible; }
      .vp-cloud.c1 { top: 16%; }
      .vp-cloud.c2 { top: 46%; width: 104px; }
      .vp-cloud.c3 { top: 72%; width: 140px; }
      .vp-star { position: absolute; width: 26px; }
    `}</style>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-[#b6dcf5]/40 last:border-0">
      <span className="text-[12px] font-bold uppercase tracking-wider text-[#3d5a99]">{label}</span>
      <span className="text-[14px] font-extrabold text-[#0b2a82] text-right max-w-[62%]">{value || "—"}</span>
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
  const [activeTab, setActiveTab] = useState("all");
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

  // Pioneer pricing state
  const [isPioneer, setIsPioneer] = useState(false);
  const [pioneerPrices, setPioneerPrices] = useState<Record<string, number>>({});

  // Duplicate registration tracking
  const [duplicateRegId, setDuplicateRegId] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Fetch prefill data from URL param
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    const email = urlParams.get("email");

    if (!ref && !email) {
      setLoadError("Invalid link. Please use the link from your priority renewal email.");
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
          if (d.isPioneer) setIsPioneer(true);
          if (d.pioneerPrices) setPioneerPrices(d.pioneerPrices);
          if (d.alreadyRegistered && d.existingRegistrationId) {
            setDuplicateRegId(d.existingRegistrationId);
          }
        } else {
          setLoadError("We couldn't find your registration record. Please contact Teacher Angel.");
        }
      })
      .catch(() => setLoadError("Network error. Please check your connection and try again."))
      .finally(() => setLoading(false));
  }, []);

  // Secondary fetch of pioneer families & settings to ensure latest pioneer prices and matching
  useEffect(() => {
    fetch("/api/pioneer-families")
      .then((r) => r.json())
      .then((d) => {
        if (d.pioneerPrices && Object.keys(d.pioneerPrices).length > 0) {
          setPioneerPrices((prev) => ({ ...d.pioneerPrices, ...prev }));
        }
        if (parentInfo?.email && Array.isArray(d.families)) {
          const emailLower = parentInfo.email.toLowerCase().trim();
          if (d.families.some((f: any) => (f.email || "").toLowerCase().trim() === emailLower)) {
            setIsPioneer(true);
          }
        }
      })
      .catch(() => {});
  }, [parentInfo?.email]);

  // Program renewal settings for dynamic Adventure cycle # & dates
  const [renewalSettings, setRenewalSettings] = useState<Record<string, { currentAdventure: number; nextAdventureStart: string | null; renewalOpen?: boolean }>>({});

  useEffect(() => {
    fetch("/api/renewal-settings")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.programs)) {
          const map: Record<string, { currentAdventure: number; nextAdventureStart: string | null; renewalOpen?: boolean }> = {};
          d.programs.forEach((p: any) => {
            map[p.programKey] = {
              currentAdventure: p.currentAdventure ?? 2,
              nextAdventureStart: p.nextAdventureStart ?? null,
              renewalOpen: p.renewalOpen !== false,
            };
          });
          setRenewalSettings(map);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch slot counts
  useEffect(() => {
    fetch("/api/registrations/slots")
      .then(r => r.json())
      .then(d => { if (d.success) setSlots(d.data); })
      .catch(() => { });
  }, []);

  const prog = selectedProgram ? PROGRAM_SLOTS[selectedProgram] : null;

  // Effective pricing: Pioneer families receive their set pioneer prices
  const configuredPioneerRate = prog && isPioneer
    ? Number(pioneerPrices[prog.id]) || FALLBACK_PIONEER_RATES[prog.id]
    : 0;
  const effectiveRate = prog ? configuredPioneerRate || prog.rate : 0;
  const effectiveDownpayment = prog
    ? (configuredPioneerRate ? Math.round(effectiveRate * 0.6) : prog.downpayment)
    : 0;
  const effectiveBalance = effectiveRate - effectiveDownpayment;

  const addonCost = (uniformOrdered ? UNIFORM_KIT.price : 0) + (lanyardOrdered ? UNIFORM_KIT.lanyardPrice : 0);
  const amountDue = prog ? effectiveDownpayment + addonCost : 0;

  const requiresUniformDay = Boolean(
    selectedProgram && !["ballet", "saturday-playdate", "virtual-session"].includes(selectedProgram)
  );

  const canProceedStep1 =
    selectedProgram !== "" &&
    selectedClass !== "" &&
    (!requiresUniformDay || uniformDayAcknowledged);
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
          isRenewal: true,
          isNewFamily: false,
          isPioneer,
          customRate: effectiveRate,
          amountDue,
          uniformOrdered,
          lanyardOrdered,
          welcomeKitOrdered: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = `/register/payment/${data.data.id}`;
      } else if (res.status === 409 && data.duplicateRegistrationId) {
        setDuplicateRegId(data.duplicateRegistrationId);
        setStep(2);
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
      <div className="vp-root min-h-screen flex items-center justify-center p-6">
        <EarlyStateStyles />
        <PortalScene />
        <div className="relative z-10 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#ffe066] to-[#ffb82e] border-4 border-[#0b2a82] shadow-[0_6px_0_#0b2a82] flex items-center justify-center text-3xl mb-4 animate-bounce">
            🚀
          </div>
          <p className="text-[18px] font-extrabold text-[#0b2a82]">Loading your renewal details…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="vp-root min-h-screen flex items-center justify-center p-6">
        <EarlyStateStyles />
        <PortalScene />
        <div className="relative z-10 max-w-md w-full bg-white rounded-[28px] border-4 border-[#0b2a82] p-8 shadow-[0_0_0_6px_#fff,0_12px_0_6px_rgba(11,42,130,0.18)] text-center space-y-4">
          <div className="text-5xl">🧭</div>
          <h2 className="font-extrabold text-[22px] text-[#0b2a82]">Renewal Link Not Found</h2>
          <p className="text-[14px] text-[#3d5a99] font-medium leading-relaxed">{loadError}</p>
          <p className="text-[13px] text-[#3d5a99]">Need help? Ask <strong>Teacher Angel</strong> onsite.</p>
        </div>
      </div>
    );
  }

  const childName = childInfo ? `${childInfo.firstName} ${childInfo.lastName}`.trim() : "Your Explorer";
  const childNick = childInfo?.nickname || childInfo?.firstName || "Explorer";

  if (duplicateRegId || (prefillData?.alreadyRegistered && prefillData?.existingRegistrationId)) {
    const payId = duplicateRegId || prefillData?.existingRegistrationId;
    return (
      <div className="vp-root min-h-screen relative overflow-x-hidden">
        <EarlyStateStyles />
        <PortalScene />
        <SiteHeader />
        <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 px-5 pb-8 pt-32">
          <div className="relative w-full rounded-[28px] border-4 border-[#0b2a82] bg-white px-6 py-10 text-center shadow-[0_0_0_6px_#fff,0_12px_0_6px_rgba(11,42,130,0.18)] sm:px-10">
            <div className="absolute -top-4 left-1/2 h-[26px] w-[92px] -translate-x-1/2 rotate-2 rounded border-2 border-[#0b2a82]/25 bg-[repeating-linear-gradient(45deg,#ffd23f_0_9px,#ffe066_9px_18px)]" />
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#0b2a82] bg-emerald-100 text-4xl shadow-[0_6px_0_#0b2a82]">🎉</div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border-2 border-[#0b2a82] bg-[#fff6cf] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#0b2a82]">
              <span>🌟</span> 2026 Adventure 2
            </div>
            <h1 className="mx-auto mb-3 max-w-xl text-[26px] font-black leading-tight text-[#0b2a82] sm:text-[32px]">Already Registered!</h1>
            <p className="mx-auto mb-4 max-w-lg text-[15px] font-medium leading-relaxed text-[#3d5a99]">
              A registration for <strong className="text-[#0b2a82]">{childName}</strong> was found for <strong className="text-[#0b2a82]">Adventure 2</strong>.
            </p>
            {prefillData?.existingRegistrationSubmittedAt && (
              <p className="mx-auto mb-4 max-w-xl rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-[13px] font-semibold leading-relaxed text-amber-900">
                Most recent matching registration: {new Date(prefillData.existingRegistrationSubmittedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })}.
                {(prefillData.existingRegistrationStatus === "expired" || (prefillData.existingReservationExpiresAt && new Date(prefillData.existingReservationExpiresAt).getTime() <= Date.now())) && " Its reservation has expired; renew it on the payment page for 1 hour if a slot is available."}
                {prefillData.existingPromoCode?.toUpperCase() === "A1RENEWAL2026" && " A1RENEWAL2026 expired on October 16, 2026 at 1:00 PM (Manila time)."}
              </p>
            )}
            <p className="mx-auto mb-6 max-w-lg text-[14px] font-medium leading-relaxed text-[#3d5a99]">
              You don&apos;t need to submit the renewal form again. Continue to the payment page to upload proof of payment or renew an expired reservation if a slot is still available.
            </p>
            <Link
              href={`/register/payment/${payId}`}
              className="mx-auto inline-flex min-h-[52px] w-full max-w-md items-center justify-center rounded-[18px] border-[3px] border-[#0b2a82] bg-gradient-to-b from-[#ffe066] via-[#ffd23f] to-[#ffb82e] px-6 py-3 text-[15px] font-extrabold text-[#0b2a82] shadow-[0_6px_0_#0b2a82] transition-transform hover:-translate-y-0.5"
            >
              Go to My Payment Page →
            </Link>
            <p className="mt-6 text-[13px] font-medium text-[#3d5a99]">Need help? Ask <strong className="text-[#0b2a82]">Teacher Angel</strong> onsite.</p>
          </div>
          <DreamBanner />
        </main>
      </div>
    );
  }

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
                  <li>A 4% interest charge will apply to overdue outstanding balances beginning September 10, 2026. Interest is on a <strong>weekly basis applied every Monday</strong>.</li>
                  <li>We will only accept Bank Transfer and GCash payments.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-extrabold text-[#0b2a82]">3. ATTENDANCE & MAKE-UP SESSIONS</p>
                <p>We know that schedules can sometimes change, so we&apos;ve made each program&apos;s make-up arrangement as simple and predictable as possible.</p>
                <p>💡 <strong>Trailblazer: Brave Explorer</strong> — A suspended face-to-face session will shift online.</p>
                <ul className="list-disc pl-5 space-y-1 font-medium">
                  <li>Online session: 45 minutes</li>
                  <li>Practice worksheets will be provided</li>
                  <li>The online shift is considered a consumed session</li>
                </ul>
                <p>💛 <strong>Complimentary Free Session for All Explorers</strong> — For an excused missed session (sickness or other valid reasons), each child receives 1 complimentary session per Adventure.</p>
              </div>
              <div className="space-y-2">
                <p className="font-extrabold text-[#0b2a82]">4. UNIFORMS</p>
                <p>The Merry Explorers uniform is the <strong>SAME uniform</strong>. If your child already has a Merry Explorers uniform, you are <strong>NOT required</strong> to purchase a new set.</p>
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

        {/* Hero Card */}
        <div className="text-center flex flex-col items-center gap-2 -mb-2">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border-2 border-[#0b2a82] shadow-[0_4px_0_#0b2a82] text-[12px] font-extrabold text-[#0b2a82]">
              <span>✨</span> PRIORITY RENEWAL ACCESS
            </div>
            {isPioneer && (
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-100 border-2 border-emerald-600 shadow-[0_4px_0_#059669] text-[12px] font-black text-emerald-900">
                <span>⭐</span> PIONEER FAMILY SPECIAL PRICING
              </div>
            )}
          </div>
          <h1 className="vp-title text-[32px] sm:text-[42px]">
            Adventure 2 Renewal
          </h1>
          <p className="vp-sub text-[15px] max-w-md">
            Welcome back! Secure <strong>{childNick}&apos;s</strong> slot for 2026 Adventure 2 in a few quick steps.
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
                onClick={() => i < step && setStep(i)}
                className={`vp-tab ${isActive ? "on" : ""} ${i > step ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span>{isDone ? "✓" : i + 1}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Main Card with Playful Tape */}
        <div className="vp-card">
          <div className="vp-tape" />

          <AnimatePresence mode="wait">

            {/* ── STEP 0: Welcome & Confirm Details ──────────────────────── */}
            {step === 0 && (
              <m.div key="step0" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}>

                {/* Hero Greeting Box */}
                <div className="mb-6 rounded-[22px] bg-gradient-to-r from-[#0b2a82] to-[#1f7ae0] p-6 text-white border-3 border-[#0b2a82] shadow-[0_6px_0_#0b2a82] relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="inline-block px-3 py-1 rounded-full bg-[#ffd23f] text-[#0b2a82] text-[11px] font-black uppercase tracking-wider mb-2">
                      🌟 2026 ADVENTURE 2
                    </div>
                    <h2 className="text-[26px] sm:text-[30px] font-black leading-tight mb-2">
                      Hello, {childNick}!
                    </h2>
                    <p className="text-[14px] text-white/95 font-medium leading-relaxed">
                      We are thrilled to welcome you to <strong>Adventure 2</strong>! Your details from <strong>Adventure 1</strong> are already verified below — simply review and choose your preferred schedule.
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/20 px-3 py-1.5 text-[12px] font-extrabold">
                      <span>✓</span> Adventure 2 Priority Reservation Active
                    </div>
                  </div>
                </div>

                {/* Child info summary */}
                <div className="mb-5 rounded-[22px] bg-[#f2faff] border-3 border-[#b6dcf5] p-5 shadow-sm">
                  <h3 className="vp-h3 text-[16px] text-[#0b2a82] mb-3">🧒 Explorer Details</h3>
                  <div className="space-y-0.5">
                    <InfoRow label="Full Name" value={childName} />
                    <InfoRow label="Nickname" value={childInfo?.nickname || childInfo?.firstName || "—"} />
                    <InfoRow label="Date of Birth" value={childInfo?.dateOfBirth ? new Date(childInfo.dateOfBirth).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "—"} />
                    <InfoRow label="Gender" value={childInfo?.gender || "—"} />
                    <InfoRow label="Health Profile" value={childInfo?.healthProfile || "None"} />
                  </div>
                </div>

                {/* Parent info summary */}
                <div className="mb-5 rounded-[22px] bg-[#f2faff] border-3 border-[#b6dcf5] p-5 shadow-sm">
                  <h3 className="vp-h3 text-[16px] text-[#0b2a82] mb-3">👨‍👩‍👧 Parent / Guardian</h3>
                  <div className="space-y-0.5">
                    <InfoRow label="Name" value={parentInfo?.name || "—"} />
                    <InfoRow label="Email" value={parentInfo?.email || "—"} />
                    <InfoRow label="Phone" value={parentInfo?.phone || "—"} />
                    <InfoRow label="Relationship" value={parentInfo?.relationship || "—"} />
                  </div>
                </div>

                {/* Emergency contact summary */}
                <div className="mb-5 rounded-[22px] bg-[#f2faff] border-3 border-[#b6dcf5] p-5 shadow-sm">
                  <h3 className="vp-h3 text-[16px] text-[#0b2a82] mb-3">🚨 Emergency Contact</h3>
                  <div className="space-y-0.5">
                    <InfoRow label="Name" value={emergencyContact?.name || "—"} />
                    <InfoRow label="Phone" value={emergencyContact?.phone || "—"} />
                    <InfoRow label="Relationship" value={emergencyContact?.relationship || "—"} />
                  </div>
                </div>

                {/* Previous program */}
                <div className="mb-5 rounded-[18px] bg-[#fff6cf] border-3 border-[#0b2a82] px-5 py-4 flex items-center gap-3 text-[13px] text-[#0b2a82] shadow-[0_4px_0_rgba(11,42,130,0.18)]">
                  <span className="text-2xl">📚</span>
                  <div>
                    <p className="font-extrabold text-[12px] uppercase tracking-wider text-[#3d5a99]">Previous Adventure</p>
                    <p className="font-extrabold text-[15px] text-[#0b2a82]">{previousProgram}</p>
                  </div>
                </div>

                {/* Important Note / Disclaimer */}
                <div className="mb-6 rounded-[22px] bg-[#fff6cf] border-3 border-[#0b2a82] p-5 text-[13px] text-[#0b2a82] shadow-[0_5px_0_rgba(11,42,130,0.2)]">
                  <div className="flex items-center gap-2 font-black text-[#0b2a82] mb-1 text-[14px]">
                    <span>⚠️</span>
                    <span>NOTE &amp; DISCLAIMER</span>
                  </div>
                  <p className="font-bold text-[#0b2a82] leading-snug">
                    Please ensure to settle your <strong>2026 Adventure 1 Balance</strong> before you can proceed to the registration.
                  </p>
                  <p className="mt-2 font-medium italic text-[#3d5a99] text-[12px] bg-white/80 p-3 rounded-xl border-2 border-[#b6dcf5]">
                    &quot;In the event that a family has unsettled balance, your downpayment for the 2026 Adventure 2 will be credited as your balance payment for the 2026 Adventure 1.&quot;
                  </p>
                </div>

                <p className="mb-6 text-[13px] text-[#3d5a99] font-medium leading-relaxed">
                  If any details need updates, please let <strong>Teacher Angel</strong> know onsite.
                </p>

                <div className="flex justify-end">
                  <button
                    onClick={() => setStep(1)}
                    className="vp-btn"
                  >
                    Looks Good — Choose Program →
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
                <p className="vp-sub mb-6">Select the program and class time for {childNick}&apos;s Adventure 2 journey.</p>

                {/* Tab filter styled like portal tabs */}
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

                {/* Pioneer privilege notice */}
                {isPioneer && (
                  <div className="mb-5 rounded-[22px] bg-gradient-to-r from-emerald-50 to-teal-50 border-3 border-emerald-500 p-4 shadow-[0_4px_0_#059669] flex items-start gap-3">
                    <span className="text-2xl mt-0.5">⭐</span>
                    <div>
                      <p className="font-black text-[14px] text-emerald-950">Pioneer Family Privilege Active</p>
                      <p className="text-[12.5px] font-medium text-emerald-800 leading-relaxed">
                        Your exclusive pioneer rate and adjusted 60% downpayment are automatically unlocked below.
                      </p>
                    </div>
                  </div>
                )}

                {/* Program Cards */}
                <div className="space-y-4">
                  {(Object.values(PROGRAM_SLOTS) as typeof PROGRAM_SLOTS[ProgramId][])
                    .filter(p => {
                      if (activeTab === "all") return true;
                      if (activeTab === "discovery") return ["curious-explorer", "creative-explorer", "everyday-curious"].includes(p.id);
                      if (activeTab === "trailblazer") return p.id === "brave-explorer";
                      if (activeTab === "weekend") return ["saturday-playdate", "ballet"].includes(p.id);
                      if (activeTab === "virtual") return (p.id as string) === "virtual-session";
                      return true;
                    })
                    .map(p => {
                      const isSelected = selectedProgram === p.id;
                      const programSlotData = slots[p.id] || {};
                      const progSettings = renewalSettings[p.name] || renewalSettings[p.id] || Object.values(renewalSettings)[0];
                      const advNumber = progSettings?.currentAdventure ?? 2;
                      const startDateStr = progSettings?.nextAdventureStart
                        ? new Date(progSettings.nextAdventureStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : null;

                      const isUnavailable = progSettings ? progSettings.renewalOpen === false : p.id === "saturday-playdate";
                      const pEffectiveRate = isPioneer && pioneerPrices[p.id] ? pioneerPrices[p.id] : p.rate;
                      const isPioneerDiscounted = isPioneer && Boolean(pioneerPrices[p.id]);

                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (isUnavailable) return;
                            setSelectedProgram(p.id as ProgramId);
                            setSelectedClass("");
                          }}
                          className={`rounded-[22px] border-3 p-5 transition-all ${
                            isUnavailable
                              ? "opacity-60 bg-slate-100/80 border-slate-300 cursor-not-allowed select-none"
                              : isSelected
                              ? "cursor-pointer bg-[#fff6cf] border-[#0b2a82] shadow-[0_6px_0_#0b2a82]"
                              : "cursor-pointer bg-white border-[#b6dcf5] hover:border-[#0b2a82] shadow-sm"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-2xl">{p.icon}</span>
                                <h3 className={`text-[17px] font-black ${isUnavailable ? "text-slate-600" : "text-[#0b2a82]"}`}>{p.name}</h3>
                                {isUnavailable ? (
                                  <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10.5px] font-black uppercase text-amber-800">
                                    Not Yet Available for Renewal
                                  </span>
                                ) : (
                                  <>
                                    <span className="rounded-full bg-[#0b2a82]/10 border border-[#0b2a82]/20 px-2 py-0.5 text-[10.5px] font-black uppercase text-[#0b2a82]">
                                      Adventure {advNumber}
                                    </span>
                                    {startDateStr && (
                                      <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                        Starts {startDateStr}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              <p className="text-[12.5px] font-medium text-[#3d5a99] mb-1">{p.ageRange} · {p.schedule} · {p.sessions} sessions</p>
                              {isUnavailable ? (
                                <p className="text-[12px] font-bold text-amber-700 bg-amber-50 rounded-lg p-2 mt-2 border border-amber-200/60">
                                  {p.name} is not yet open for renewal. For inquiries, please reach out via our Facebook page or inquiry form.
                                </p>
                              ) : isPioneerDiscounted ? (
                                <div className="flex items-center gap-2 flex-wrap mt-1">
                                  <p className="text-[16px] font-black text-emerald-600">
                                    ⭐ ₱{pEffectiveRate.toLocaleString()}
                                  </p>
                                  {pEffectiveRate !== p.rate && (
                                    <span className="text-[12px] font-bold text-slate-400 line-through">
                                      ₱{p.rate.toLocaleString()}
                                    </span>
                                  )}
                                  <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                                    Pioneer Rate
                                  </span>
                                </div>
                              ) : (
                                <p className="text-[15px] font-black text-[#1f7ae0]">₱{p.rate.toLocaleString()}</p>
                              )}
                            </div>
                            <div className={`h-6 w-6 rounded-full border-3 shrink-0 mt-1 transition-all flex items-center justify-center ${
                              isUnavailable
                                ? "border-slate-300 bg-slate-200 text-slate-400"
                                : isSelected
                                ? "border-[#0b2a82] bg-[#ffd23f]"
                                : "border-[#b6dcf5] bg-white"
                            }`}>
                              {isSelected && !isUnavailable && <span className="text-[12px] font-black text-[#0b2a82]">✓</span>}
                            </div>
                          </div>

                          {!isUnavailable && isSelected && (
                            <div className="mt-4 pt-4 border-t-2 border-[#0b2a82]/20">
                              <p className="text-[12px] font-black uppercase tracking-wider text-[#0b2a82] mb-3">Select Session Time</p>
                              <div className="grid gap-2.5 sm:grid-cols-2">
                                {p.classes.map((cls) => {
                                  const displayName = cls.name;

                                  const slotInfo = programSlotData[cls.name];
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

                {/* Optional Uniform Add-ons for Returning Families */}
                {selectedProgram && requiresUniformDay && (
                  <div className="mt-6 rounded-[22px] bg-[#f2faff] border-3 border-[#b6dcf5] p-5 shadow-sm space-y-3">
                    <h3 className="vp-h3 text-[15px] text-[#0b2a82]">👕 Optional Uniform Add-ons</h3>
                    <p className="text-[12.5px] font-medium text-[#3d5a99]">As a returning family, you already have the Welcome Kit. These add-ons are completely optional.</p>
                    <div className="space-y-2.5 pt-1">
                      <label className="flex items-center gap-3 cursor-pointer rounded-xl border-2 border-[#b6dcf5] bg-white p-3.5 hover:border-[#0b2a82] transition-colors">
                        <input type="checkbox" checked={uniformOrdered} onChange={e => setUniformOrdered(e.target.checked)} className="h-5 w-5 accent-[#0b2a82]" />
                        <div className="flex-1">
                          <p className="font-extrabold text-[13.5px] text-[#0b2a82]">Uniform Set — ₱{UNIFORM_KIT.price.toLocaleString()}</p>
                          <p className="text-[11.5px] font-medium text-[#3d5a99]">Polo shirt + jogging pants (no lanyard)</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer rounded-xl border-2 border-[#b6dcf5] bg-white p-3.5 hover:border-[#0b2a82] transition-colors">
                        <input type="checkbox" checked={lanyardOrdered} onChange={e => setLanyardOrdered(e.target.checked)} className="h-5 w-5 accent-[#0b2a82]" />
                        <div className="flex-1">
                          <p className="font-extrabold text-[13.5px] text-[#0b2a82]">Lanyard & Name Tag — ₱{UNIFORM_KIT.lanyardPrice.toLocaleString()}</p>
                          <p className="text-[11.5px] font-medium text-[#3d5a99]">Merry Explorers lanyard with name tag</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

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
                        onChange={e => setUniformDayAcknowledged(e.target.checked)}
                        className="mt-1 h-5 w-5 rounded-md border-2 border-[#0b2a82] accent-[#0b2a82] cursor-pointer"
                      />
                      <span className="text-[13px] font-bold text-[#0b2a82] leading-snug">
                        <strong className="text-red-500">*</strong> I understand that every Wednesday & Friday is Merry Explorers&apos; official uniform day.
                      </span>
                    </label>
                  </div>
                )}

                <div className="mt-8 flex justify-between items-center">
                  <button onClick={() => setStep(0)} className="vp-btn ghost small">← Back</button>
                  <button
                    disabled={!canProceedStep1}
                    onClick={() => setStep(2)}
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

                {/* Program Waiver (not required for Brave Explorer) */}
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
                            <span className="font-extrabold text-[#0b2a82]">{parentInfo?.name || "Parent/Guardian Name"}</span>
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
                  <button onClick={() => setStep(1)} className="vp-btn ghost small">← Back</button>
                  <button
                    disabled={!canProceedStep2}
                    onClick={() => setStep(3)}
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
                <p className="vp-sub mb-6">Please double-check all details before reserving your slot. Payment is completed on the next page.</p>

                {[
                  {
                    title: "Program Selection", emoji: "📚", rows: [
                      ["Program", prog.name],
                      ["Session Time", selectedClass],
                      ["Schedule", prog.schedule],
                      ["Sessions", `${prog.sessions} sessions`],
                      ["Total Rate", isPioneer && effectiveRate !== prog.rate ? `₱${effectiveRate.toLocaleString()} (Pioneer Special)` : `₱${prog.rate.toLocaleString()}`],
                      ["Downpayment (60%)", `₱${effectiveDownpayment.toLocaleString()}`],
                      ["Balance (40% on session 6)", `₱${effectiveBalance.toLocaleString()}`],
                    ],
                  },
                  {
                    title: "Explorer Information", emoji: "🧒", rows: [
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

                {/* Uniform add-ons */}
                {(uniformOrdered || lanyardOrdered) && (
                  <div className="mb-4 rounded-[22px] bg-[#f2faff] border-3 border-[#b6dcf5] p-5 shadow-sm">
                    <h3 className="mb-3 vp-h3 text-[15px] text-[#0b2a82]">👕 Uniform Add-ons</h3>
                    <table className="w-full text-[13px]">
                      <tbody>
                        {uniformOrdered && <tr className="border-b border-[#b6dcf5]/40"><td className="py-1.5 pr-4 text-[#3d5a99] font-bold">Uniform Set</td><td className="py-1.5 text-[#0b2a82] font-black">₱{UNIFORM_KIT.price.toLocaleString()}</td></tr>}
                        {lanyardOrdered && <tr className="border-b border-[#b6dcf5]/40"><td className="py-1.5 pr-4 text-[#3d5a99] font-bold">Lanyard & Name Tag</td><td className="py-1.5 text-[#0b2a82] font-black">₱{UNIFORM_KIT.lanyardPrice.toLocaleString()}</td></tr>}
                        <tr><td className="py-1.5 pr-4 text-[#3d5a99] font-bold">Add-ons Subtotal</td><td className="py-1.5 text-[#0b2a82] font-black">₱{addonCost.toLocaleString()}</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Duplicate registration warning — shown when email+child already has an active registration */}
                {duplicateRegId ? (
                  <div className="rounded-[22px] bg-amber-50 border-3 border-amber-400 p-5 shadow-[0_4px_0_rgba(217,119,6,0.20)] space-y-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">⚠️</span>
                      <p className="font-black text-[15px] text-amber-900">Existing Registration Found!</p>
                    </div>
                    <p className="text-[13px] font-medium text-amber-800 leading-relaxed">
                      A registration for <strong>{childName}</strong> was found for <strong>Adventure 2</strong>.
                    </p>
                    {prefillData?.existingRegistrationSubmittedAt && (
                      <p className="text-[12px] font-semibold text-amber-900">
                        Most recent matching registration: {new Date(prefillData.existingRegistrationSubmittedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })}.
                        {(prefillData.existingRegistrationStatus === "expired" || (prefillData.existingReservationExpiresAt && new Date(prefillData.existingReservationExpiresAt).getTime() <= Date.now())) && " Its reservation has expired; renew it on the payment page for 1 hour if a slot is available."}
                        {prefillData.existingPromoCode?.toUpperCase() === "A1RENEWAL2026" && " A1RENEWAL2026 expired on October 16, 2026 at 1:00 PM (Manila time)."}
                      </p>
                    )}
                    <p className="text-[13px] font-medium text-amber-800 leading-relaxed">
                      You do not need to register again. Go to the payment page to upload your proof of payment or renew an expired reservation if a slot is still available.
                    </p>
                    <a
                      href={`/register/payment/${duplicateRegId}`}
                      className="block w-full text-center rounded-[14px] bg-amber-500 text-white py-3 font-black text-[14px] shadow-[0_4px_0_rgba(180,83,9,0.40)] hover:bg-amber-600 transition-all font-sans"
                    >
                      Go to Existing Payment Page →
                    </a>
                  </div>
                ) : (
                  <>
                    {submitError && (
                      <div className="vp-error mb-4">❌ {submitError}</div>
                    )}

                    <div className="mt-8 flex justify-between items-center">
                      <button onClick={() => setStep(1)} disabled={submitting} className="vp-btn ghost small disabled:opacity-50">← Back</button>
                      <button
                        disabled={submitting}
                        onClick={handleSubmit}
                        className="vp-btn"
                      >
                        {submitting ? "Reserving Slot..." : "Complete Slot Reservation 🎉"}
                      </button>
                    </div>
                  </>
                )}
              </m.div>
            )}

          </AnimatePresence>
        </div>

        <p className="text-center text-[13px] text-[#3d5a99] font-medium -mt-2">
          Need help? Ask <strong className="text-[#0b2a82]">Teacher Angel</strong> onsite.
        </p>
        <DreamBanner />
      </main>

      {/* Embedded CSS for exact Parent Portal aesthetic */}
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
