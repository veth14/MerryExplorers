"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import { PROGRAM_SLOTS, UNIFORM_KIT, NAV_LINKS } from "@/data/landing";
import { SiteHeader } from "@/components/landing/site-header";
import { DreamBanner } from "@/components/DreamBanner";
import { readReceipt } from "@/lib/receipt-ocr";

type ProgramId = keyof typeof PROGRAM_SLOTS;

type RegData = {
  status: string;
  parentEmail?: string;
  program: ProgramId;
  classTime?: string;
  reservedUntil: string;
  paymentDeadline?: string;
  isPromoRegistration?: boolean;
  promoCode?: string;
  isScholar?: boolean;
  isPioneer?: boolean;
  isNewFamily?: boolean;
  customRate?: number;
  amountDue?: number;
  balanceInfo?: {
    total: number | null;
    paid: number;
    paidToPrevious?: number;
    appliedToCurrentSession?: number;
    balance: number;
    sessionBalance?: number | null;
    previousAdventureBalance?: number;
    interest: number;
    weeksOfInterest: number;
    totalPayable: number | null;
    dueDate?: string | null;
  } | null;
};

// ─── Design Tokens (aligned with Parent Portal / TrailblazerDashboard) ───────
const NAVY = "#0b2a82";
const BLUE = "#1f7ae0";
const SUN = "#ffd23f";
const SUN_LIGHT = "#ffe066";
const SUN_DEEP = "#ffb82e";
const INPUT_BG = "#f2faff";
const INPUT_BORDER = "#b6dcf5";
const TEXT_2 = "#3d5a99";

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

export default function PaymentPage() {
  const params = useParams();
  const id = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [regData, setRegData] = useState<RegData | null>(null);

  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [receiptPreview, setReceiptPreview] = useState("");
  const [receiptBase64, setReceiptBase64] = useState("");
  const [isNewFamily, setIsNewFamily] = useState(true);
  const [uniformOrdered, setUniformOrdered] = useState(false);
  const [lanyardOrdered, setLanyardOrdered] = useState(false);
  const [welcomeKitOrdered, setWelcomeKitOrdered] = useState(false);
  const [recitalKitOrdered, setRecitalKitOrdered] = useState(false);
  const [paymentType, setPaymentType] = useState<"downpayment" | "full">("downpayment");
  const [amountPaid, setAmountPaid] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [renewingReservation, setRenewingReservation] = useState(false);
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check sessionStorage on mount — show modal if not yet acknowledged for this registration
  useEffect(() => {
    if (!id) return;
    const key = `disclaimer_ack_${id}`;
    const already = sessionStorage.getItem(key) === "true";
    setDisclaimerAcknowledged(already);
    if (!already) setShowDisclaimerModal(true);
  }, [id]);

  function handleAcknowledgeDisclaimer() {
    if (id) sessionStorage.setItem(`disclaimer_ack_${id}`, "true");
    setDisclaimerAcknowledged(true);
    setShowDisclaimerModal(false);
  }

  useEffect(() => {
    setMounted(true);
    if (id) {
      fetch(`/api/registrations/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setRegData(data.data);
            if (data.data.isPioneer) {
              setIsNewFamily(false);
              setWelcomeKitOrdered(false);
            } else if (typeof data.data.isNewFamily === "boolean") {
              setIsNewFamily(data.data.isNewFamily);
            }
            if (typeof data.data.uniformOrdered === "boolean") setUniformOrdered(data.data.uniformOrdered);
            if (typeof data.data.lanyardOrdered === "boolean") setLanyardOrdered(data.data.lanyardOrdered);
            if (typeof data.data.welcomeKitOrdered === "boolean") setWelcomeKitOrdered(data.data.isPioneer ? false : data.data.welcomeKitOrdered);
            const isScholar = data.data.isScholar || data.data.promoCode === "A1JesusLovesMe2026" || data.data.promoCode?.toUpperCase() === "A1JESUSLOVESME2026" || data.data.status === "scholar";
            const balanceCanBePaid = ["approved", "active"].includes(data.data.status) && Number(data.data.balanceInfo?.balance) > 0;
            if (balanceCanBePaid && Number(data.data.balanceInfo?.totalPayable) > 0) {
              setAmountPaid(String(data.data.balanceInfo.totalPayable));
            } else if (data.data.status !== "reserved" && data.data.status !== "early-bird" && !isScholar) {
              setError(
                data.data.status === "expired"
                  ? "Your slot reservation has expired."
                  : ["approved", "active"].includes(data.data.status)
                    ? "There is no remaining balance to pay for this registration."
                    : "A payment is already submitted and waiting for verification."
              );
            }
          } else {
            setError("Failed to load registration details.");
          }
        })
        .catch(() => setError("Network error."))
        .finally(() => setLoading(false));
    }
  }, [id]);

  // Reservation countdown
  useEffect(() => {
    if (!regData?.reservedUntil || regData.status !== "reserved") return;
    const tick = () => {
      const remaining = new Date(regData.reservedUntil).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeLeft("0d 0h 0m 0s");
        setError("Your slot reservation has expired.");
        return true;
      }
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((remaining / (1000 * 60)) % 60);
      const secs = Math.floor((remaining / 1000) % 60);

      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      parts.push(`${hours}h`);
      parts.push(`${mins}m`);
      parts.push(`${secs}s`);

      setTimeLeft(parts.join(" "));
      return false;
    };
    if (tick()) return;
    const interval = setInterval(() => {
      if (tick()) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [regData]);

  const prog = regData ? PROGRAM_SLOTS[regData.program] : null;

  const isBallet = regData?.program === "ballet";
  const isNoUniformProg =
    regData?.program === "ballet" ||
    regData?.program === "saturday-playdate" ||
    regData?.program === "virtual-session";

  const isPioneer = Boolean(regData?.isPioneer);
  const isBalanceMode = Boolean(regData && ["approved", "active"].includes(regData.status) && Number(regData.balanceInfo?.balance) > 0);

  const addonCost = isBallet
    ? (recitalKitOrdered ? 1500 : 0)
    : isNoUniformProg || isPioneer
    ? (uniformOrdered ? UNIFORM_KIT.price : 0) + (lanyardOrdered ? UNIFORM_KIT.lanyardPrice : 0)
    : (isNewFamily
      ? UNIFORM_KIT.welcomeKitPrice
      : (welcomeKitOrdered ? UNIFORM_KIT.welcomeKitPrice : 0) +
      (uniformOrdered ? UNIFORM_KIT.price : 0) +
      (lanyardOrdered ? UNIFORM_KIT.lanyardPrice : 0));

  const effectiveRate = regData?.customRate || (prog ? prog.rate : 0);
  const effectiveDownpayment = regData?.isPioneer && effectiveRate > 0
    ? Math.round(effectiveRate * 0.6)
    : (prog ? prog.downpayment : 0);

  const amountDue = isBalanceMode
    ? Number(regData?.balanceInfo?.totalPayable) || Number(regData?.balanceInfo?.balance) || 0
    : prog
      ? (paymentType === "full" ? effectiveRate : effectiveDownpayment) + addonCost
      : 0;

  const parsedAmountPaid = parseFloat(amountPaid.replace(/,/g, "")) || 0;
  const creditBalance = parsedAmountPaid > 0 && parsedAmountPaid > amountDue ? +(parsedAmountPaid - amountDue).toFixed(2) : 0;
  const amountShort = parsedAmountPaid > 0 && parsedAmountPaid < amountDue ? +(amountDue - parsedAmountPaid).toFixed(2) : 0;

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        setReceiptPreview(result);
        setReceiptBase64(result);
        setOcrDone(false);
        setOcrLoading(true);

        try {
          const parsed = await readReceipt(file, result);
          if (parsed.reference) {
            setReferenceNumber(parsed.reference);
          }
          if (parsed.amount && parsed.amount > 0) {
            setAmountPaid(String(parsed.amount));
          }
          if (parsed.method) {
            setPaymentMethod(parsed.method);
          }
        } catch {
          // fallback gracefully
        } finally {
          setOcrLoading(false);
          setOcrDone(true);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    []
  );

  const partialWouldLeaveInterest = Boolean(
    isBalanceMode && regData?.balanceInfo && parsedAmountPaid >= regData.balanceInfo.balance && parsedAmountPaid < Number(regData.balanceInfo.totalPayable || 0) - 0.01
  );
  const canProceed = paymentMethod !== "" && receiptBase64 !== "" && amountPaid !== "" && (
    isBalanceMode ? parsedAmountPaid > 0 && !partialWouldLeaveInterest : amountShort === 0
  );

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/registrations/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          receiptBase64,
          balancePayment: isBalanceMode,
          expectedTotalPayable: isBalanceMode ? regData?.balanceInfo?.totalPayable : undefined,
          paidOn: isBalanceMode ? new Date().toISOString() : undefined,
          uniformOrdered,
          lanyardOrdered,
          welcomeKitOrdered: isPioneer ? false : welcomeKitOrdered,
          recitalKitOrdered,
          isNewFamily: isPioneer ? false : isNewFamily,
          paymentType,
          amountDue,
          amountPaid: parsedAmountPaid,
          creditBalance,
          referenceNumber,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Submission failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRenewReservation() {
    setRenewingReservation(true);
    setError("");
    try {
      const response = await fetch(`/api/registrations/${id}/renew-reservation`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || "We couldn't renew this reservation. Please contact Teacher Angel.");
        return;
      }
      setRegData((current) => current ? { ...current, status: "reserved", reservedUntil: data.reservedUntil } : current);
      setTimeLeft("");
      setError("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRenewingReservation(false);
    }
  }

  if (!mounted) return null;

  const isExpired = timeLeft === "0d 0h 0m 0s" || timeLeft === "00:00";
  const reservationIsExpired = Boolean(regData && (
    regData.status === "expired" ||
    (regData.status === "reserved" && regData.reservedUntil && new Date(regData.reservedUntil).getTime() <= Date.now())
  ));
  const showErrorScreen = (!!error && (!regData || regData.status !== "reserved" || isExpired)) || reservationIsExpired;

  return (
    <div className="vp-root min-h-screen relative overflow-x-hidden">
      <PortalScene />

      {/* ── Disclaimer Modal ─────────────────────────────────────────────── */}
      {showDisclaimerModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(11,42,130,0.70)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="relative w-full max-w-lg rounded-[28px] bg-white border-4 border-[#0b2a82] shadow-[0_0_0_6px_#fff,0_20px_0_rgba(11,42,130,0.25)] overflow-hidden"
            style={{ animation: "vp-modal-in 0.28s cubic-bezier(.34,1.56,.64,1) both" }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0b2a82] to-[#1f7ae0] px-6 py-5 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#ffd23f] border-3 border-white/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
                📋
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/70">Before You Proceed</p>
                <h2 className="text-[18px] font-black text-white leading-tight">Important Payment Notice</h2>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4 text-[13px] text-[#27407f] leading-relaxed">
              <div className="rounded-[18px] bg-[#fffbea] border-2 border-[#ffd23f] p-4 space-y-3">
                <p className="font-extrabold text-[#0b2a82] text-[14px] flex items-center gap-2">
                  <span>📌</span> Slot Reservation Notice
                </p>
                <p>
                  Reaching this page means your slot has already been{" "}
                  <strong>reserved for 24 hours</strong>. Kindly complete your payment within the given reservation period to confirm your registration.
                </p>
                <p>
                  Having trouble uploading your proof of payment or have questions? You may send your payment receipt to our official{" "}
                  <strong>Facebook page</strong>, and we will complete the registration of your little one. 💛
                </p>
                {isPioneer && (
                  <p className="rounded-xl bg-emerald-50 border border-emerald-300 px-3.5 py-2.5 font-bold text-emerald-900 text-[12.5px]">
                    ⭐ <strong>For Pioneer Families:</strong> You may still proceed with your payment using your exclusive Pioneer Family rate to secure your slot.
                  </p>
                )}
              </div>

              <p className="text-[12px] font-semibold text-[#3d5a99] text-center">
                Please read the notice above carefully before proceeding.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={handleAcknowledgeDisclaimer}
                className="w-full vp-btn text-[15px]"
                style={{ minHeight: 52 }}
              >
                ✅ I Understand — Proceed to Payment
              </button>
            </div>

            {/* Washi tape decoration */}
            <div className="vp-tape" style={{ top: -14, left: "50%", marginLeft: -46 }} />
          </div>

          <style>{`
            @keyframes vp-modal-in {
              from { opacity: 0; transform: scale(0.88) translateY(24px); }
              to   { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* ── Universal Floating Pill Header ── */}
      <SiteHeader />

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <main className="vp-main">

        {/* Hero title */}
        {!loading && !showErrorScreen && (
          <div className="text-center flex flex-col items-center gap-2 mb-2">
            {success ? (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border-2 border-emerald-600 shadow-[0_4px_0_#059669] text-[12px] font-black text-emerald-900 mb-1">
                  <span>🎉</span> {isBalanceMode ? "BALANCE PAYMENT SUBMITTED" : "REGISTRATION PAYMENT SUBMITTED"}
                </div>
                <h1 className="vp-title text-[32px] sm:text-[42px]">
                  {isBalanceMode ? "Balance Submitted!" : "Payment Submitted!"}
                </h1>
                <p className="vp-sub text-[15px] max-w-xl mx-auto text-balance">
                  {isBalanceMode
                    ? <>Your balance payment receipt for <strong className="whitespace-nowrap">{prog?.name || "Adventure 2"}</strong> has been received.</>
                    : <>Thank you! Your receipt has been received to confirm registration for <strong className="whitespace-nowrap">{prog?.name ? `${prog.name} (Adventure 2)` : "2026 Adventure 2"}</strong>.</>}
                </p>
              </>
            ) : regData?.isScholar || regData?.promoCode === "A1JesusLovesMe2026" || regData?.promoCode?.toUpperCase() === "A1JESUSLOVESME2026" || regData?.status === "scholar" ? (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border-2 border-emerald-600 shadow-[0_4px_0_#059669] text-[12px] font-black text-emerald-900 mb-1">
                  <span>🎓</span> SCHOLARSHIP CONFIRMED
                </div>
                <h1 className="vp-title text-[32px] sm:text-[42px]">
                  Scholar Slot Confirmed!
                </h1>
                <p className="vp-sub text-[15px] max-w-lg mx-auto text-balance">
                  Welcome to Merry Explorers! Your child&apos;s slot is 100% tuition sponsored.
                </p>
              </>
            ) : regData?.status === "early-bird" ? (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border-2 border-amber-500 shadow-[0_4px_0_#d97706] text-[12px] font-black text-amber-950 mb-1">
                  <span>🐣</span> EARLY BIRD SECURED
                </div>
                <h1 className="vp-title text-[32px] sm:text-[42px]">
                  Early Bird Slot Secured!
                </h1>
                <p className="vp-sub text-[15px] max-w-lg mx-auto text-balance">
                  Your slot is guaranteed and no upfront payment is needed right now.
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border-2 border-[#0b2a82] shadow-[0_4px_0_#0b2a82] text-[12px] font-extrabold text-[#0b2a82] mb-1">
                  <span>💳</span> {isBalanceMode ? "BALANCE PAYMENT" : "REGISTRATION PAYMENT"}
                </div>
                <h1 className="vp-title text-[32px] sm:text-[42px]">
                  {isBalanceMode ? "Pay Remaining Balance" : "Finalize Your Slot"}
                </h1>
                <p className="vp-sub text-[15px] max-w-md mx-auto text-balance">
                  {isBalanceMode
                    ? <>Submit your receipt below for the remaining balance on <strong className="whitespace-nowrap">{prog?.name || "Adventure 2"}</strong>.</>
                    : <>Submit your receipt below to confirm registration for <strong className="whitespace-nowrap">{prog?.name ? `${prog.name} (Adventure 2)` : "2026 Adventure 2"}</strong>.</>}
                </p>
              </>
            )}
          </div>
        )}

        {loading ? (
          <div className="vp-card text-center py-16 max-w-2xl mx-auto w-full">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#ffe066] to-[#ffb82e] border-4 border-[#0b2a82] shadow-[0_6px_0_#0b2a82] flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
              ⏳
            </div>
            <p className="text-[18px] font-extrabold text-[#0b2a82]">Loading registration payment details…</p>
          </div>
        ) : success ? (
          <div
            className="vp-card py-12 max-w-2xl mx-auto w-full"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}
          >
            <div className="vp-tape" />
            <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-[#0b2a82] shadow-[0_6px_0_#0b2a82] flex items-center justify-center text-4xl mb-5">
              🎉
            </div>
            <h2 className="vp-h2 text-[26px] mb-3 text-[#0b2a82]" style={{ width: "100%", textAlign: "center" }}>
              Receipt Successfully Recorded!
            </h2>
            <p className="vp-sub max-w-md text-[15px] mb-8 leading-relaxed text-balance" style={{ width: "100%", textAlign: "center" }}>
              {isBalanceMode
                ? "Our administrative team will review your receipt and update your balance shortly."
                : "Our administrative team will review and verify your payment shortly. An email confirmation has been sent to your inbox."}
            </p>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
              {!isBalanceMode && <Link href="/parent/dashboard" className="vp-btn" style={{ marginInline: "auto", textAlign: "center" }}>Go to Parent Dashboard 🚀</Link>}
              {isBalanceMode && <Link href="/" className="vp-btn" style={{ marginInline: "auto", textAlign: "center" }}>Back to Merry Explorers</Link>}
            </div>
          </div>
        ) : regData?.isScholar || regData?.promoCode === "A1JesusLovesMe2026" || regData?.promoCode?.toUpperCase() === "A1JESUSLOVESME2026" || regData?.status === "scholar" ? (
          <div className="vp-card text-center py-12 max-w-2xl mx-auto w-full">
            <div className="vp-tape" />
            <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-[#0b2a82] shadow-[0_6px_0_#0b2a82] flex items-center justify-center text-4xl mx-auto mb-5">
              🎓
            </div>
            <h2 className="vp-h2 text-[28px] mb-2 text-[#0b2a82]">Scholar Slot Confirmed!</h2>
            <div className="vp-sub max-w-md mx-auto text-[15px] mb-8 space-y-3 leading-relaxed">
              <p>You have officially registered under our <strong>Scholarship Program</strong>! Your slot is 100% guaranteed.</p>
              <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-500 p-4 text-[13.5px] font-extrabold text-emerald-950 shadow-sm">
                ✨ <strong>No Payment Needed</strong><br />
                <span className="text-[12px] font-medium text-emerald-800">100% Tuition Sponsored · Welcome to Merry Explorers!</span>
              </div>
            </div>
            <div className="flex justify-center gap-3">
              <Link href="/parent/dashboard" className="vp-btn">
                Go to Parent Dashboard 🚀
              </Link>
              <Link href="/" className="vp-btn ghost small">
                Back to Home
              </Link>
            </div>
          </div>
        ) : regData?.status === "early-bird" ? (
          <div className="vp-card text-center py-12 max-w-2xl mx-auto w-full">
            <div className="vp-tape" />
            <div className="w-20 h-20 rounded-full bg-amber-100 border-4 border-[#0b2a82] shadow-[0_6px_0_#0b2a82] flex items-center justify-center text-4xl mx-auto mb-5">
              🐣
            </div>
            <h2 className="vp-h2 text-[28px] mb-2">Early Bird Slot Secured!</h2>
            <div className="vp-sub max-w-md mx-auto text-[15px] mb-8 space-y-2 leading-relaxed">
              <p>You are officially registered as an <strong>Early Bird</strong>! Your slot is guaranteed and no upfront payment is needed right now.</p>
              {regData.paymentDeadline && (
                <div className="rounded-2xl bg-[#fff6cf] border-2 border-[#0b2a82] p-3 text-[13px] font-extrabold text-[#0b2a82]">
                  Payment is due by {new Date(regData.paymentDeadline).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
                </div>
              )}
            </div>
            <div className="flex justify-center">
              <Link href="/" className="vp-btn">
                Return to Home
              </Link>
            </div>
          </div>
        ) : showErrorScreen || !prog ? (
          <div className="vp-card text-center py-12 max-w-2xl mx-auto w-full">
            <div className="vp-tape" />
            <div className="w-20 h-20 rounded-full bg-red-100 border-4 border-[#0b2a82] shadow-[0_6px_0_#0b2a82] flex items-center justify-center text-4xl mx-auto mb-5">
              ⚠️
            </div>
            <h2 className="vp-h2 text-[24px] text-red-600 mb-2">
              {reservationIsExpired ? "Your slot reservation has expired." : error || "We couldn't find this registration."}
            </h2>
            {reservationIsExpired ? (
              <>
                <p className="vp-sub mb-6">If your class still has an available slot, you can renew this reservation and get 24 hours to submit payment.</p>
                {regData?.parentEmail && (
                  <p className="mx-auto mb-4 max-w-md rounded-2xl border-2 border-[#b6dcf5] bg-[#f2faff] px-4 py-3 text-sm font-semibold text-[#0b2a82]">
                    Email used for this registration: <strong className="break-all">{regData.parentEmail}</strong>
                  </p>
                )}
                {error && <div className="vp-error mb-4">❌ {error}</div>}
                <button onClick={handleRenewReservation} disabled={renewingReservation} className="vp-btn disabled:opacity-60">
                  {renewingReservation ? "Checking availability…" : "Renew Reservation for 24 Hours"}
                </button>
              </>
            ) : (
              <>
                <p className="vp-sub mb-6">If you believe this is an error, please contact Teacher Angel.</p>
                <Link href="/" className="vp-btn ghost small">Back to Home</Link>
              </>
            )}
          </div>
        ) : (
          <div className="vp-card">
            <div className="vp-tape" />

            {isBalanceMode ? (
              <div className="mb-6 rounded-[22px] bg-gradient-to-r from-[#0b2a82] to-[#1f7ae0] p-6 text-white border-3 border-[#0b2a82] shadow-[0_6px_0_#0b2a82]">
                <div className="flex justify-between items-end gap-3 mb-4">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/80">Balance Payment</p>
                    <p className="mt-1 text-[32px] font-black leading-none">₱{amountDue.toLocaleString()}</p>
                    <p className="mt-1 text-[11px] text-white/75">Total due now, including any current interest</p>
                  </div>
                  {isPioneer && <span className="rounded-full bg-emerald-300 text-emerald-950 px-2.5 py-1 text-[10px] font-black uppercase">⭐ Pioneer Family</span>}
                </div>
                <div className="space-y-1.5 bg-white/15 rounded-xl p-3.5 text-[13px] border border-white/20">
                  <div className="flex justify-between"><span className="text-white/80">Total Rate</span><span className="font-extrabold">₱{Number(regData?.balanceInfo?.total || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-white/80">Amount Paid (Receipt)</span><span className="font-extrabold">₱{Number(regData?.balanceInfo?.paid || 0).toLocaleString()}</span></div>
                  {Number(regData?.balanceInfo?.paidToPrevious || 0) > 0 && (
                    <>
                      <div className="flex justify-between text-amber-200"><span className="font-bold">Deducted for Previous Adventure</span><span className="font-extrabold">- ₱{Number(regData?.balanceInfo?.paidToPrevious).toLocaleString()}</span></div>
                      <div className="flex justify-between text-blue-200"><span className="font-bold">Applied to Current Session</span><span className="font-extrabold">₱{Number(regData?.balanceInfo?.appliedToCurrentSession ?? (Number(regData?.balanceInfo?.paid || 0) - Number(regData?.balanceInfo?.paidToPrevious || 0))).toLocaleString()}</span></div>
                    </>
                  )}
                  <div className="flex justify-between"><span className="text-white/80">Current Session Remaining</span><span className="font-extrabold">₱{Number(regData?.balanceInfo?.sessionBalance || 0).toLocaleString()}</span></div>
                  {Number(regData?.balanceInfo?.previousAdventureBalance || 0) > 0 && (
                    <div className="flex justify-between text-amber-200"><span className="font-bold">Previous Adventure Unpaid</span><span className="font-extrabold">+ ₱{Number(regData?.balanceInfo?.previousAdventureBalance).toLocaleString()}</span></div>
                  )}
                  <div className="flex justify-between border-t border-white/30 pt-2"><span className="text-white/80">Remaining Balance</span><span className="font-extrabold">₱{Number(regData?.balanceInfo?.balance || 0).toLocaleString()}</span></div>
                  {Number(regData?.balanceInfo?.interest) > 0 && <div className="flex justify-between"><span className="text-white/80">Overdue Interest ({regData?.balanceInfo?.weeksOfInterest} week{regData?.balanceInfo?.weeksOfInterest === 1 ? "" : "s"})</span><span className="font-extrabold">₱{Number(regData?.balanceInfo?.interest || 0).toLocaleString()}</span></div>}
                  {regData?.balanceInfo?.dueDate && <div className="border-t border-white/30 pt-2 text-[11px] text-white/75">Balance due date: {new Date(`${regData.balanceInfo.dueDate}T00:00:00`).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}. Overdue balances accrue 4% weekly interest.</div>}
                </div>
              </div>
            ) : (
              <>

            {/* Countdown Banner */}
            {timeLeft && (
              <div className="vp-due mb-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⏳</span>
                    <span className="text-[13px] font-extrabold uppercase tracking-wider text-white">RESERVATION TIME REMAINING</span>
                  </div>
                  <div className="font-mono text-[22px] font-black bg-white/20 px-3 py-0.5 rounded-xl border border-white/30 text-white">
                    {timeLeft}
                  </div>
                </div>
              </div>
            )}

            {/* Ballet Recital Kit Info */}
            {isBallet && (
              <div className="mb-6 rounded-[22px] bg-[#fdf2f8] border-3 border-[#be185d] p-5 text-[13px] text-[#831843] shadow-[0_5px_0_rgba(190,24,93,0.2)]">
                <div className="flex items-center gap-2 font-black text-[#be185d] mb-1 text-[15px]">
                  <span>🩰</span>
                  <span>2026 Ballet Recital on November 28</span>
                </div>
                <p className="font-extrabold text-[#831843] leading-snug">
                  Recital kit is optional, but required if joining the recital.
                </p>
                <div className="mt-3 bg-white/90 p-4 rounded-xl border-2 border-[#fbcfe8] space-y-2 text-[12.5px]">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-[#be185d] font-black text-[14px]">Recital Kit</span>
                    <span className="text-[#be185d] font-black text-[15px]">₱1,500</span>
                  </div>
                  <p className="text-slate-600">
                    Recital kit preorder starts on October 3. Inclusive of 2 guest passes, 1 mini bouquet, and 1 set of costume.
                  </p>
                  <div className="flex gap-4 font-bold text-[#831843] text-[12px] flex-wrap pt-1">
                    <span>🎫 2 Guest Passes</span>
                    <span>💐 1 Mini Bouquet</span>
                    <span>👗 1 Set of Costume</span>
                  </div>
                  <div className="pt-2 border-t border-[#fbcfe8] text-[12px] text-slate-700 space-y-1">
                    <p>• <strong>12 completed sessions</strong> are required to join the recital.</p>
                    <p>• The next recital will be in <strong>Q1 of 2027</strong>.</p>
                  </div>
                </div>

                {/* Preorder Recital Kit Checkbox */}
                <label className="mt-4 flex items-center justify-between p-3 rounded-xl bg-white border-2 border-[#be185d] cursor-pointer hover:bg-pink-50/50 transition-colors">
                  <div>
                    <span className="text-[13px] font-black text-[#be185d]">Preorder 2026 Recital Kit (+₱1,500)</span>
                    <p className="text-[11.5px] text-slate-600 font-medium">Add to payment today to reserve costume and guest passes</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={recitalKitOrdered}
                    onChange={(e) => setRecitalKitOrdered(e.target.checked)}
                    className="h-5 w-5 rounded border-2 border-[#be185d] text-[#be185d] focus:ring-[#be185d]"
                  />
                </label>
              </div>
            )}

            {/* Payment Option Selector */}
            <div className="mb-6 rounded-[22px] bg-[#f2faff] border-3 border-[#b6dcf5] p-5 shadow-sm">
              <h3 className="vp-h3 text-[16px] text-[#0b2a82] mb-3">Choose Payment Option</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentType("downpayment")}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border-3 p-4 transition-all text-center ${paymentType === "downpayment"
                    ? "bg-[#fff6cf] border-[#0b2a82] shadow-[0_5px_0_#0b2a82]"
                    : "bg-white border-[#b6dcf5] hover:border-[#0b2a82]"
                    }`}
                >
                  <span className="text-2xl">💳</span>
                  <p className="text-[13px] font-extrabold text-[#0b2a82]">Downpayment (60%)</p>
                  <p className="text-[18px] font-black text-[#1f7ae0]">₱{(effectiveDownpayment + addonCost).toLocaleString()}</p>
                  {paymentType === "downpayment" && <span className="vp-tag text-[10px] py-0.5">✓ Selected</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType("full")}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border-3 p-4 transition-all text-center ${paymentType === "full"
                    ? "bg-[#fff6cf] border-[#0b2a82] shadow-[0_5px_0_#0b2a82]"
                    : "bg-white border-[#b6dcf5] hover:border-[#0b2a82]"
                    }`}
                >
                  <span className="text-2xl">🏆</span>
                  <p className="text-[13px] font-extrabold text-[#0b2a82]">Full Payment (100%)</p>
                  <p className="text-[18px] font-black text-emerald-600">₱{(effectiveRate + addonCost).toLocaleString()}</p>
                  {paymentType === "full" && <span className="vp-tag text-[10px] py-0.5 bg-emerald-100 text-emerald-800 border-emerald-400">✓ Selected</span>}
                </button>
              </div>
            </div>

            {/* Total Due Breakdown Card */}
            <div className="mb-6 rounded-[22px] bg-gradient-to-r from-[#0b2a82] to-[#1f7ae0] p-6 text-white border-3 border-[#0b2a82] shadow-[0_6px_0_#0b2a82]">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/80">Total Due Today</p>
                  <p className="text-[36px] font-black leading-none mt-1">₱{amountDue.toLocaleString()}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="rounded-full bg-[#ffd23f] text-[#0b2a82] px-3 py-1 text-[11px] font-black uppercase">
                    {prog.name}
                  </span>
                  {regData?.isPioneer && (
                    <span className="rounded-full bg-emerald-300 text-emerald-950 px-2.5 py-0.5 text-[10px] font-black uppercase shadow-sm">
                      ⭐ Pioneer Family
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 bg-white/15 rounded-xl p-3.5 text-[13px] border border-white/20">
                <div className="flex justify-between">
                  <span className="text-white/80">
                    {paymentType === "full"
                      ? (regData?.isPioneer ? "Pioneer Program Rate" : "Full Program Rate")
                      : (regData?.isPioneer ? "Pioneer Downpayment (60%)" : "Downpayment (60%)")}
                  </span>
                  <span className="font-extrabold">₱{(paymentType === "full" ? effectiveRate : effectiveDownpayment).toLocaleString()}</span>
                </div>
                {isBallet && recitalKitOrdered && (
                  <div className="flex justify-between">
                    <span className="text-white/80">Recital Kit (Preorder)</span>
                    <span className="font-extrabold">₱1,500</span>
                  </div>
                )}
                {!isNoUniformProg && !isPioneer && isNewFamily && (
                  <div className="flex justify-between">
                    <span className="text-white/80">Welcome Kit</span>
                    <span className="font-extrabold">₱{UNIFORM_KIT.welcomeKitPrice.toLocaleString()}</span>
                  </div>
                )}
                {!isNoUniformProg && !isNewFamily && uniformOrdered && (
                  <div className="flex justify-between">
                    <span className="text-white/80">Uniform Set</span>
                    <span className="font-extrabold">₱{UNIFORM_KIT.price.toLocaleString()}</span>
                  </div>
                )}
                {!isNoUniformProg && !isNewFamily && lanyardOrdered && (
                  <div className="flex justify-between">
                    <span className="text-white/80">Lanyard & Name Tag</span>
                    <span className="font-extrabold">₱{UNIFORM_KIT.lanyardPrice.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-white/30 pt-2 font-black text-[14px]">
                  <span>Total Due Now</span>
                  <span className="text-[#ffd23f]">₱{amountDue.toLocaleString()}</span>
                </div>
              </div>
            </div>
              </>
            )}

            {/* Payment Method Selector */}
            <div className="mb-6 rounded-[22px] bg-[#f2faff] border-3 border-[#b6dcf5] p-5 shadow-sm">
              <h3 className="vp-h3 text-[16px] text-[#0b2a82] mb-3">Select Payment Method</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { id: "gcash", label: "GCash", logo: "/gcash-logo.svg" },
                  { id: "bpi", label: "BPI", logo: "/bpi-logo.svg" },
                  { id: "mari-bank", label: "Mari Bank", logo: "/maribank-logo.svg" },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-3 py-4 px-3 transition-all ${paymentMethod === method.id
                      ? "bg-[#fff6cf] border-[#0b2a82] shadow-[0_5px_0_#0b2a82]"
                      : "bg-white border-[#b6dcf5] hover:border-[#0b2a82]"
                      }`}
                  >
                    <div className="relative h-7 w-20"><Image src={method.logo} alt={method.label} fill className="object-contain" /></div>
                    <span className="text-[13px] font-extrabold text-[#0b2a82]">{method.label}</span>
                  </button>
                ))}
              </div>

              {/* QR Code Card */}
              {paymentMethod && (
                <div className="mt-5">
                  {[
                    { id: "gcash", label: "GCash", qr: "/GCASHQRONLY.png" },
                    { id: "bpi", label: "BPI", qr: "/BPIQRONLY.png" },
                    { id: "mari-bank", label: "Mari Bank", qr: "/MARIBANKQRONLY.png" },
                  ].filter((pm) => pm.id === paymentMethod).map((pm) => (
                    <div key={pm.id} className="rounded-2xl border-2 border-[#b6dcf5] bg-white p-5 flex flex-col items-center text-center gap-4">
                      <div className="relative w-full max-w-[280px] aspect-square rounded-2xl border-3 border-[#0b2a82] bg-white shadow-[0_4px_0_#0b2a82] overflow-hidden">
                        <Image src={pm.qr} alt="QR" fill className="object-contain p-3" />
                      </div>
                      <div className="max-w-sm">
                        <p className="text-[15px] font-black text-[#0b2a82] mb-1">📲 Scan QR to Pay via {pm.label}</p>
                        <a href={pm.qr} download={`${pm.label}QR.png`} className="inline-flex items-center gap-1.5 rounded-xl bg-[#f2faff] border-2 border-[#0b2a82] px-3.5 py-1.5 text-[12px] font-black text-[#0b2a82] shadow-[0_2px_0_#0b2a82] mb-2 hover:bg-[#ffe066] transition-colors">
                          ⬇️ Download QR Code
                        </a>
                        <p className="text-[12px] font-medium text-[#3d5a99]">Scan to transfer <strong>₱{amountDue.toLocaleString()}</strong>, then upload the receipt screenshot below.</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Receipt Upload & OCR Scanner */}
            <div className="mb-6 rounded-[22px] bg-[#f2faff] border-3 border-[#b6dcf5] p-5 shadow-sm">
              <h3 className="vp-h3 text-[16px] text-[#0b2a82] mb-1">Upload Payment Receipt *</h3>
              <p className="text-[12.5px] font-medium text-[#3d5a99] mb-4">Our automatic receipt reader will read your Reference Number and Amount sent.</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

              {receiptPreview ? (
                <div className="relative text-center">
                  <div className="relative aspect-[4/3] w-full max-w-sm mx-auto rounded-2xl border-3 border-[#0b2a82] bg-white shadow-[0_4px_0_#0b2a82] overflow-hidden">
                    <Image src={receiptPreview} alt="Receipt Preview" fill className="object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptPreview("");
                      setReceiptBase64("");
                      setReferenceNumber("");
                      setOcrDone(false);
                    }}
                    className="mt-3 text-[13px] font-black text-red-500 hover:text-red-700 transition-colors"
                  >
                    ✕ Remove &amp; Re-upload
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-3 rounded-2xl border-3 border-dashed border-[#0b2a82] bg-white py-8 px-6 text-center hover:bg-[#fff6cf] transition-all cursor-pointer"
                >
                  <span className="text-4xl animate-bounce">📸</span>
                  <div>
                    <p className="text-[15px] font-black text-[#0b2a82]">Click to upload screenshot</p>
                    <p className="text-[12px] font-medium text-[#3d5a99]">JPG, PNG, or screenshot from GCash / Banking App</p>
                  </div>
                </button>
              )}

              {receiptBase64 && (
                <div className="mt-5 border-t-2 border-[#b6dcf5] pt-4 space-y-3">
                  {ocrLoading && (
                    <div className="flex items-center gap-2 rounded-xl bg-[#fff6cf] border-2 border-[#0b2a82] p-3 text-[12px] font-extrabold text-[#0b2a82] animate-pulse">
                      <span>🔍</span> Reading receipt with automatic OCR…
                    </div>
                  )}
                  {ocrDone && !ocrLoading && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border-2 border-emerald-400 p-2.5 text-[12px] font-extrabold text-emerald-800">
                      <span>✓</span> Receipt scanned. Please verify the detected values below.
                    </div>
                  )}

                  <div>
                    <label className="block text-[12px] font-black uppercase tracking-wider text-[#0b2a82] mb-1">Reference Number</label>
                    <input
                      className="w-full bg-white border-3 border-[#b6dcf5] rounded-xl px-4 py-3 text-[14px] font-extrabold text-[#0b2a82] focus:border-[#0b2a82] focus:outline-none"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="e.g. 100234857291"
                    />
                    {ocrDone && !ocrLoading && !referenceNumber && (
                      <p className="text-[11px] font-bold text-amber-700 mt-1">Couldn&apos;t detect the reference number automatically — please enter it manually.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[12px] font-black uppercase tracking-wider text-[#0b2a82] mb-1">Amount Sent (₱)</label>
                    <input
                      className="w-full bg-white border-3 border-[#b6dcf5] rounded-xl px-4 py-3 text-[14px] font-extrabold text-[#0b2a82] focus:border-[#0b2a82] focus:outline-none"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder={`e.g. ${amountDue}`}
                    />
                    {!isBalanceMode && amountShort > 0 && (
                      <p className="text-red-600 text-[12px] mt-1 font-black">⚠️ Amount entered is short by ₱{amountShort.toLocaleString()}</p>
                    )}
                    {isBalanceMode && partialWouldLeaveInterest && (
                      <p className="text-red-600 text-[12px] mt-1 font-black">⚠️ Enter an amount below the remaining balance for a partial payment, or pay the full total due including interest.</p>
                    )}
                    {isBalanceMode && parsedAmountPaid > 0 && parsedAmountPaid < Number(regData?.balanceInfo?.balance || 0) && (
                      <p className="text-blue-800 text-[12px] mt-1 font-bold">Partial payments are accepted and will be applied after verification.</p>
                    )}
                    {creditBalance > 0 && (
                      <p className="text-emerald-700 text-[12px] mt-1 font-bold">✨ Overpayment of ₱{creditBalance.toLocaleString()} will be credited to balance.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && <div className="vp-error mb-4">❌ {error}</div>}

            <button
              disabled={!canProceed || submitting}
              onClick={handleSubmit}
              className="w-full vp-btn"
            >
              {submitting ? "Submitting Payment..." : "Submit Payment Receipt 🎉"}
            </button>

            {/* Payment Disclaimer Note */}
            {!isBalanceMode && (
              <div className="mt-5 rounded-[20px] bg-[#fffbea] border-2 border-[#ffd23f] p-5 text-[12.5px] text-[#3d2c00] leading-relaxed space-y-3 shadow-sm">
                <p className="font-extrabold text-[#0b2a82] text-[13px] flex items-center gap-2">
                  <span>📌</span> Important Notice
                </p>
                <p>
                  <strong>Disclaimer:</strong> Please note that reaching this page means your slot has already been reserved for <strong>24 hours</strong>. Kindly complete your payment within the given reservation period to confirm your registration.
                </p>
                <p>
                  Having trouble uploading your proof of payment or have questions? You may send your payment receipt to our official <strong>Facebook page</strong>, and we will complete the registration of your little one. 💛
                </p>
                {isPioneer && (
                  <p className="rounded-xl bg-emerald-50 border border-emerald-300 px-3.5 py-2.5 font-bold text-emerald-900 text-[12px]">
                    ⭐ <strong>For Pioneer Families:</strong> You may still proceed with your payment using your exclusive Pioneer Family rate to secure your slot.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-center text-[13px] text-[#3d5a99] font-medium mt-3">
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
          padding: 145px 20px 100px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        @media(max-width: 640px) {
          .vp-main { padding-top: 120px; }
        }
        .vp-sub { margin: 4px 0 0; font-size: 14px; color: ${TEXT_2}; font-weight: 500; line-height: 1.5; text-wrap: balance; }
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
          pointer-events: none;
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
        .vp-due {
          background: linear-gradient(135deg, ${BLUE}, #2f8bf0);
          border: 3px solid ${NAVY};
          border-radius: 20px;
          padding: 14px 18px;
          color: #fff;
          box-shadow: 0 5px 0 ${NAVY};
        }
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
