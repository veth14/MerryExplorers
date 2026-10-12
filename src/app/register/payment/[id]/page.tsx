"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import { PROGRAM_SLOTS, UNIFORM_KIT, NAV_LINKS } from "@/data/landing";
import { DreamBanner } from "@/components/DreamBanner";
import { readReceipt } from "@/lib/receipt-ocr";

type ProgramId = keyof typeof PROGRAM_SLOTS;

type RegData = {
  status: string;
  program: ProgramId;
  reservedUntil: string;
  paymentDeadline?: string;
  isPromoRegistration?: boolean;
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

  // Oct 16, 1:00 PM deadline gate — only applies to promo code (renewal) reservations
  // Regular 1-hour registrations are already handled by the countdown timer expiry
  const SLOT_RELEASE_DEADLINE = new Date("2026-10-16T13:00:00+08:00");
  const isSlotReleased =
    mounted &&
    !loading &&
    !!regData &&
    regData.status === "reserved" &&
    regData.isPromoRegistration === true &&
    Date.now() >= SLOT_RELEASE_DEADLINE.getTime() &&
    !success;

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    if (id) {
      fetch(`/api/registrations/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setRegData(data.data);
            if (typeof data.data.isNewFamily === "boolean") {
              setIsNewFamily(data.data.isNewFamily);
            }
            if (typeof data.data.uniformOrdered === "boolean") setUniformOrdered(data.data.uniformOrdered);
            if (typeof data.data.lanyardOrdered === "boolean") setLanyardOrdered(data.data.lanyardOrdered);
            if (typeof data.data.welcomeKitOrdered === "boolean") setWelcomeKitOrdered(data.data.welcomeKitOrdered);
            if (data.data.status !== "reserved" && data.data.status !== "early-bird") {
              setError(
                data.data.status === "expired"
                  ? "Your slot reservation has expired."
                  : "Payment has already been submitted for this registration."
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

  const addonCost = isBallet
    ? (recitalKitOrdered ? 1500 : 0)
    : (isNewFamily
      ? UNIFORM_KIT.welcomeKitPrice
      : (welcomeKitOrdered ? UNIFORM_KIT.welcomeKitPrice : 0) +
      (uniformOrdered ? UNIFORM_KIT.price : 0) +
      (lanyardOrdered ? UNIFORM_KIT.lanyardPrice : 0));

  const amountDue = prog
    ? (paymentType === "full" ? prog.rate : prog.downpayment) + addonCost
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

  const canProceed = paymentMethod !== "" && receiptBase64 !== "" && amountPaid !== "" && amountShort === 0;

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
          uniformOrdered,
          lanyardOrdered,
          welcomeKitOrdered,
          recitalKitOrdered,
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

  if (!mounted) return null;

  const isExpired = timeLeft === "0d 0h 0m 0s" || timeLeft === "00:00";
  const showErrorScreen = !!error && (!regData || regData.status !== "reserved" || isExpired);

  return (
    <div className="vp-root min-h-screen relative overflow-x-hidden">
      <PortalScene />

      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header className="relative z-20 bg-white/85 border-b-2 border-[#b6dcf5] backdrop-blur-md sticky top-0">
        <div className="mx-auto flex h-[76px] w-full max-w-[1200px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 transition-transform hover:scale-[0.98]">
            <div className="relative h-11 w-11 overflow-hidden rounded-2xl border-2 border-[#0b2a82] bg-white p-1 shadow-[0_3px_0_#0b2a82]">
              <Image src="/LOGO-noBG.png" alt="Merry Explorers Logo" fill sizes="44px" className="object-contain" />
            </div>
            <span className="flex flex-col leading-none">
              <span className="text-[18px] font-black tracking-tight text-[#0b2a82]">Merry Explorers</span>
              <span className="text-[11px] font-black tracking-wider text-[#0b2a82] bg-[#ffd23f] px-1.5 py-0.5 rounded-md border border-[#0b2a82] mt-0.5 inline-block w-fit">
                PARENT PORTAL
              </span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-full px-4 py-2 text-[13px] font-extrabold text-[#0b2a82] hover:bg-[#fff6cf] hover:text-[#0b2a82] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="vp-tag text-[11px] sm:text-[12px] font-black uppercase">
              🌟 2026 ADVENTURE 2
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <main className="vp-main">

        {/* Hero title */}
        <div className="text-center flex flex-col items-center gap-2 -mb-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border-2 border-[#0b2a82] shadow-[0_4px_0_#0b2a82] text-[12px] font-extrabold text-[#0b2a82] mb-1">
            <span>💳</span> REGISTRATION PAYMENT
          </div>
          <h1 className="vp-title text-[32px] sm:text-[42px]">
            Finalize Your Slot
          </h1>
          <p className="vp-sub text-[15px] max-w-md">
            Submit your receipt below to confirm enrollment for <strong>2026 Adventure 2</strong>.
          </p>
        </div>

        {loading ? (
          <div className="vp-card text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#ffe066] to-[#ffb82e] border-4 border-[#0b2a82] shadow-[0_6px_0_#0b2a82] flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
              ⏳
            </div>
            <p className="text-[18px] font-extrabold text-[#0b2a82]">Loading registration payment details…</p>
          </div>
        ) : success ? (
          <div className="vp-card text-center py-12">
            <div className="vp-tape" />
            <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-[#0b2a82] shadow-[0_6px_0_#0b2a82] flex items-center justify-center text-4xl mx-auto mb-5">
              🎉
            </div>
            <h2 className="vp-h2 text-[28px] mb-2">Payment Submitted!</h2>
            <p className="vp-sub max-w-md mx-auto text-[15px] mb-8 leading-relaxed">
              Your receipt has been successfully recorded! Our administrative team will verify your payment shortly. An email confirmation has been sent to your email.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/parent/dashboard" className="vp-btn">
                Go to Parent Dashboard 🚀
              </Link>
            </div>
          </div>
        ) : regData?.status === "early-bird" ? (
          <div className="vp-card text-center py-12">
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
        ) : isSlotReleased ? (
          <div className="vp-card text-center py-12">
            <div className="vp-tape" />
            <div className="w-20 h-20 rounded-full bg-red-100 border-4 border-[#0b2a82] shadow-[0_6px_0_#0b2a82] flex items-center justify-center text-4xl mx-auto mb-5">
              🔓
            </div>
            <h2 className="vp-h2 text-[24px] text-red-600 mb-2">Your Slot Has Been Released</h2>
            <p className="vp-sub max-w-md mx-auto text-[14px] mb-4 leading-relaxed">
              As of <strong>October 16, 2026 at 1:00 PM</strong>, the priority reservation deadline has passed and your reserved slot has been released to waitlisted families.
            </p>
            <p className="vp-sub max-w-md mx-auto text-[13px] mb-8 leading-relaxed text-[#3d5a99]">
              If you would still like to enroll, please submit a <strong>new registration form</strong> through our standard registration portal, subject to slot availability.
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Link href="/register" className="vp-btn">Submit New Registration →</Link>
              <Link href="/" className="vp-btn ghost small">Back to Home</Link>
            </div>
            <p className="mt-6 text-[12px] text-[#64748b]">Questions? Contact Teacher Angel onsite or reply to the email you received.</p>
          </div>
        ) : showErrorScreen || !prog ? (
          <div className="vp-card text-center py-12">
            <div className="vp-tape" />
            <div className="w-20 h-20 rounded-full bg-red-100 border-4 border-[#0b2a82] shadow-[0_6px_0_#0b2a82] flex items-center justify-center text-4xl mx-auto mb-5">
              ⚠️
            </div>
            <h2 className="vp-h2 text-[24px] text-red-600 mb-2">
              {error || "We couldn't find this registration."}
            </h2>
            <p className="vp-sub mb-6">If you believe this is an error, please contact Teacher Angel.</p>
            <Link href="/" className="vp-btn ghost small">Back to Home</Link>
          </div>
        ) : (
          <div className="vp-card">
            <div className="vp-tape" />

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

            {/* Note / Disclaimer Banner */}
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
                  <p className="text-[18px] font-black text-[#1f7ae0]">₱{(prog.downpayment + addonCost).toLocaleString()}</p>
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
                  <p className="text-[18px] font-black text-emerald-600">₱{(prog.rate + addonCost).toLocaleString()}</p>
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
                <div className="text-right">
                  <span className="rounded-full bg-[#ffd23f] text-[#0b2a82] px-3 py-1 text-[11px] font-black uppercase">
                    {prog.name}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5 bg-white/15 rounded-xl p-3.5 text-[13px] border border-white/20">
                <div className="flex justify-between">
                  <span className="text-white/80">{paymentType === "full" ? "Full Program Rate" : "Downpayment (60%)"}</span>
                  <span className="font-extrabold">₱{(paymentType === "full" ? prog.rate : prog.downpayment).toLocaleString()}</span>
                </div>
                {isBallet && recitalKitOrdered && (
                  <div className="flex justify-between">
                    <span className="text-white/80">Recital Kit (Preorder)</span>
                    <span className="font-extrabold">₱1,500</span>
                  </div>
                )}
                {!isBallet && isNewFamily && (
                  <div className="flex justify-between">
                    <span className="text-white/80">Welcome Kit</span>
                    <span className="font-extrabold">₱{UNIFORM_KIT.welcomeKitPrice.toLocaleString()}</span>
                  </div>
                )}
                {!isBallet && !isNewFamily && uniformOrdered && (
                  <div className="flex justify-between">
                    <span className="text-white/80">Uniform Set</span>
                    <span className="font-extrabold">₱{UNIFORM_KIT.price.toLocaleString()}</span>
                  </div>
                )}
                {!isBallet && !isNewFamily && lanyardOrdered && (
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
                    {amountShort > 0 && (
                      <p className="text-red-600 text-[12px] mt-1 font-black">⚠️ Amount entered is short by ₱{amountShort.toLocaleString()}</p>
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
          </div>
        )}

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
          padding: 28px 20px 100px;
          display: flex;
          flex-direction: column;
          gap: 24px;
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