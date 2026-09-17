"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import { PROGRAM_SLOTS, UNIFORM_KIT } from "@/data/landing";
import { SiteFooter } from "@/components/landing/site-footer";
import { NAV_LINKS } from "@/data/landing";
import Tesseract from "tesseract.js";

type ProgramId = keyof typeof PROGRAM_SLOTS;

const inputCls =
  "w-full bg-[#f8fafc] border-2 border-transparent rounded-2xl px-4 py-3.5 text-[14px] font-semibold text-[#002f76] placeholder:text-[#94a3b8] placeholder:font-medium focus:outline-none focus:border-[#0033A0]/30 focus:bg-white transition-all";
const labelCls = "block text-[12px] font-bold uppercase tracking-widest text-[#0033A0]/60 mb-1.5";

export default function PaymentPage() {
  const params = useParams();
  const id = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [regData, setRegData] = useState<{ status: string; program: ProgramId; reservedUntil: string } | null>(null);

  const [paymentMethod, setPaymentMethod] = useState("");
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    if (id) {
      fetch(`/api/registrations/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setRegData(data.data);
            if (data.data.status !== "reserved") {
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
  const amountExact = parsedAmountPaid > 0 && parsedAmountPaid === amountDue;

  const runOCR = useCallback(async (imageDataUrl: string) => {
    setOcrLoading(true);
    setOcrDone(false);
    try {
      const result = await Tesseract.recognize(imageDataUrl, "eng");
      const text = result.data.text;

      const patterns = [
        /\b(ITO\d{12,20})\b/i,
        /\b([A-Z0-9]{4}\s+[A-Z0-9]{4}\s+[A-Z0-9]{4})\b/i,
        /\b(\d{13})\b/,
        /(?:ref\.?\s*no\.?|reference\s*(?:id|number)?|trace\s*id)\s*[:\-]?\s*([A-Z0-9]{8,20})\b/i,
        /\b(\d{10,20})\b/
      ];

      let extractedRef = "";
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          extractedRef = match[1].replace(/\s+/g, "");
          break;
        }
      }

      if (extractedRef) setReferenceNumber(extractedRef);
    } catch {
      // OCR failed silently
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
      setReferenceNumber("");
      setOcrDone(false);
      runOCR(result);
    };
    reader.readAsDataURL(file);
  }, [runOCR]);

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

  // Time remaining calculator
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!regData?.reservedUntil || regData.status !== "reserved") return;
    const interval = setInterval(() => {
      const remaining = new Date(regData.reservedUntil).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeLeft("00:00");
        setError("Your slot reservation has expired.");
        clearInterval(interval);
      } else {
        const m = Math.floor((remaining / 1000 / 60) % 60);
        const s = Math.floor((remaining / 1000) % 60);
        setTimeLeft(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [regData]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#fdfdfd] flex flex-col relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div aria-hidden className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#0033A0] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.07]"></div>
        <div aria-hidden className="absolute top-40 -right-20 w-[500px] h-[500px] bg-[#FFC107] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.1]"></div>
      </div>

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
              <Link key={link.label} href={link.href} className="rounded-full px-6 py-2.5 text-[15px] font-bold transition-all text-[#64748b] hover:bg-black/5 hover:text-[#0033A0]">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-grow flex flex-col items-center justify-start px-5 py-12 sm:py-16">
        <div className="w-full max-w-[800px]">
          {loading ? (
            <div className="text-center py-20 text-[#0033A0] animate-pulse font-bold">Loading...</div>
          ) : success ? (
            <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 bg-white rounded-3xl p-8 shadow-xl">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-5xl shadow-xl shadow-green-500/20">🎉</div>
              <h2 className="font-headline text-[30px] font-extrabold text-[#002f76]">Payment Received!</h2>
              <p className="mt-3 text-[16px] font-medium text-[#64748b] max-w-md mx-auto leading-relaxed">
                Your payment has been successfully submitted. Our team will review and verify it within 1–2 business days. You will receive an email confirmation once verified.
              </p>
              <div className="mt-8 flex justify-center">
                <Link href="/" className="rounded-2xl bg-[#0033A0] px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-[#0033A0]/20 hover:bg-[#002f76] transition-colors">
                  Back to Home
                </Link>
              </div>
            </m.div>
          ) : error && (!regData || regData.status !== "reserved") ? (
            <div className="rounded-3xl bg-white p-8 shadow-xl text-center">
              <span className="text-4xl mb-4 block">⚠️</span>
              <h2 className="font-headline text-[24px] font-extrabold text-red-600 mb-2">{error}</h2>
              <p className="text-[#64748b] mb-6">If you believe this is a mistake, please contact us.</p>
              <Link href="/" className="rounded-2xl border border-slate-200 px-6 py-3.5 text-[14px] font-bold text-[#64748b] hover:bg-slate-50">Back to Home</Link>
            </div>
          ) : (
            <m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-12 shadow-[0_24px_80px_rgba(0,51,160,0.06)] border border-white">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-headline text-[24px] font-extrabold text-[#002f76]">Secure Your Slot</h2>
                  <p className="text-[14px] text-[#64748b]">Complete your payment to finalize registration.</p>
                </div>
                {timeLeft && (
                  <div className="mt-4 sm:mt-0 flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
                    <span className="text-amber-500 animate-pulse text-lg">⏳</span>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700/70">Time Remaining</span>
                      <span className="text-[16px] font-extrabold text-amber-700 font-mono leading-none">{timeLeft}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Type Toggle */}
              <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                <h3 className="mb-3 font-headline text-[16px] font-extrabold text-[#0033A0]">Payment Option</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentType("downpayment")}
                    className={[
                      "flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all duration-200",
                      paymentType === "downpayment" ? "border-[#0033A0] bg-[#0033A0]/5 shadow-md" : "border-slate-200 hover:border-slate-300 bg-white",
                    ].join(" ")}
                  >
                    <span className="text-2xl">💳</span>
                    <p className="text-[14px] font-extrabold text-[#002f76]">Downpayment</p>
                    <p className="text-[18px] font-extrabold text-[#0033A0]">₱{(prog!.downpayment + addonCost).toLocaleString()}</p>
                    {paymentType === "downpayment" && <span className="mt-1 inline-flex rounded-full bg-[#0033A0] px-3 py-0.5 text-[10px] font-bold text-white">✓ Selected</span>}
                  </button>
                  <button
                    onClick={() => setPaymentType("full")}
                    className={[
                      "flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all duration-200",
                      paymentType === "full" ? "border-green-500 bg-green-50 shadow-md" : "border-slate-200 hover:border-slate-300 bg-white",
                    ].join(" ")}
                  >
                    <span className="text-2xl">🏆</span>
                    <p className="text-[14px] font-extrabold text-[#002f76]">Full Payment</p>
                    <p className="text-[18px] font-extrabold text-green-600">₱{(prog!.rate + addonCost).toLocaleString()}</p>
                    {paymentType === "full" && <span className="mt-1 inline-flex rounded-full bg-green-500 px-3 py-0.5 text-[10px] font-bold text-white">✓ Selected</span>}
                  </button>
                </div>
              </div>

              {/* Amount card */}
              <div className={`mb-6 rounded-3xl p-6 text-white shadow-xl ${paymentType === "full" ? "bg-gradient-to-br from-green-600 to-green-500" : "bg-gradient-to-br from-[#0033A0] to-[#0066CC]"}`}>
                <p className="text-[12px] font-bold uppercase tracking-widest opacity-70">Amount Due Today</p>
                <p className="mt-1 text-[40px] font-extrabold leading-none">₱{amountDue.toLocaleString()}</p>
                <div className="mt-4 space-y-1.5 bg-white/10 rounded-2xl px-4 py-3 text-[13px]">
                  <div className="flex justify-between">
                    <span className="opacity-80">{paymentType === "full" ? "Program Rate" : "Downpayment"}</span>
                    <span className="font-bold">₱{(paymentType === "full" ? prog!.rate : prog!.downpayment).toLocaleString()}</span>
                  </div>
                  {isBallet && recitalKitOrdered && (
                    <div className="flex justify-between">
                      <span className="opacity-80">Recital Kit (Preorder)</span>
                      <span className="font-bold">₱1,500</span>
                    </div>
                  )}
                  {!isBallet && isNewFamily && (
                    <div className="flex justify-between">
                      <span className="opacity-80">Welcome Kit</span>
                      <span className="font-bold">₱{UNIFORM_KIT.welcomeKitPrice.toLocaleString()}</span>
                    </div>
                  )}
                  {!isBallet && !isNewFamily && uniformOrdered && (
                    <div className="flex justify-between">
                      <span className="opacity-80">Uniform Set</span>
                      <span className="font-bold">₱{UNIFORM_KIT.price.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/20 pt-2 mt-1 font-extrabold">
                    <span>Total Due Now</span>
                    <span>₱{amountDue.toLocaleString()}</span>
                  </div>
                </div>
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
                      className={["flex flex-col items-center justify-center gap-3 rounded-2xl border-2 py-5 px-3", paymentMethod === method.id ? "border-[#0033A0] bg-[#0033A0]/5" : "border-slate-200"].join(" ")}
                    >
                      <div className="relative h-8 w-24"><Image src={method.logo} alt={method.label} fill className="object-contain" /></div>
                      <span className="text-[13px] font-bold">{method.label}</span>
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
                        <div className="relative w-full max-w-[320px] aspect-square rounded-2xl border-2 bg-white shadow-md">
                          <Image src={m.qr} alt="QR" fill className="object-contain p-4" />
                        </div>
                        <div className="max-w-sm">
                          <p className="text-[16px] font-extrabold text-[#002f76] mb-2">📲 Scan to Pay via {m.label}</p>
                          <a href={m.qr} download={`${m.label}QR.png`} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0]/10 px-4 py-2 text-[12px] font-bold text-[#0033A0] mb-3">⬇️ Download QR Code</a>
                          <p className="text-[12px] text-[#64748b]">Scan the QR code to send <strong>₱{amountDue.toLocaleString()}</strong>. Then upload the screenshot below.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add-ons */}
              {isBallet ? (
                <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                  <h3 className="mb-1 font-headline text-[16px] font-extrabold text-[#0033A0]">🩰 Recital Kit (Optional Preorder)</h3>
                  <p className="mb-4 text-[13px] text-[#64748b]">Recital kit preorder starts on October 3. Inclusive of 2 guest passes, 1 mini bouquet, and 1 set of costume. Recital kit is required to participate in the group themed performance.</p>
                  <label className={`flex items-start gap-3 cursor-pointer rounded-2xl border-2 p-4 ${recitalKitOrdered ? "border-[#0033A0] bg-[#0033A0]/5" : "border-slate-200"}`}>
                    <input type="checkbox" checked={recitalKitOrdered} onChange={e => setRecitalKitOrdered(e.target.checked)} className="mt-1" />
                    <div>
                      <p className="text-[14px] font-bold text-[#002f76]">Include Recital Kit — ₱1,500</p>
                      <p className="text-[12px] text-[#64748b]">Added to your total due today.</p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                  <h3 className="mb-1 font-headline text-[16px] font-extrabold text-[#0033A0]">👕 Uniform & Add-ons</h3>
                  <p className="mb-4 text-[13px] text-[#64748b]">{UNIFORM_KIT.note}</p>
                  <label className={`flex items-start gap-3 cursor-pointer rounded-2xl border-2 p-4 mb-4 ${isNewFamily ? "border-[#0033A0] bg-[#0033A0]/5" : "border-slate-200"}`}>
                    <input type="checkbox" checked={isNewFamily} onChange={e => { setIsNewFamily(e.target.checked); if(e.target.checked) setUniformOrdered(false); }} className="mt-0.5" />
                    <div>
                      <p className="text-[14px] font-bold text-[#002f76]">We are a New Family</p>
                      <p className="text-[12px] text-[#64748b]">Welcome Kit (₱{UNIFORM_KIT.welcomeKitPrice}) is required.</p>
                    </div>
                  </label>
                  {!isNewFamily && (
                    <label className={`flex items-start gap-3 cursor-pointer rounded-2xl border-2 p-4 ${uniformOrdered ? "border-[#0033A0] bg-[#0033A0]/5" : "border-slate-200"}`}>
                      <input type="checkbox" checked={uniformOrdered} onChange={e => setUniformOrdered(e.target.checked)} className="mt-1" />
                      <div><p className="text-[14px] font-bold text-[#002f76]">Uniform Set only — ₱{UNIFORM_KIT.price.toLocaleString()}</p></div>
                    </label>
                  )}
                </div>
              )}

              {/* Receipt upload */}
              <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                <h3 className="mb-1 font-headline text-[16px] font-extrabold text-[#0033A0]">Upload Payment Receipt *</h3>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                {receiptPreview ? (
                  <div className="relative">
                    <div className="relative aspect-[4/3] w-full max-w-sm mx-auto rounded-2xl border border-slate-200 overflow-hidden"><Image src={receiptPreview} alt="Preview" fill className="object-contain" /></div>
                    <button onClick={() => { setReceiptPreview(""); setReceiptBase64(""); }} className="mt-3 text-[13px] text-red-500">Remove</button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 px-6 text-center hover:bg-[#f0f5ff]"><span className="text-4xl">📸</span><p className="text-[14px] font-bold text-[#002f76]">Upload receipt</p></button>
                )}
                
                {receiptBase64 && (
                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <label className={labelCls}>Reference Number</label>
                    <input className={inputCls} value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} />
                    
                    <label className={`${labelCls} mt-4`}>Amount Sent</label>
                    <input className={inputCls} value={amountPaid} onChange={e => setAmountPaid(e.target.value.replace(/[^0-9.]/g, ""))} />
                    {amountShort > 0 && <p className="text-red-500 text-[12px] mt-1 font-bold">Short by ₱{amountShort.toLocaleString()}</p>}
                  </div>
                )}
              </div>

              {error && <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-[13px] font-bold">{error}</div>}

              <button
                disabled={!canProceed || submitting}
                onClick={handleSubmit}
                className="w-full rounded-2xl bg-green-500 py-4 text-[16px] font-bold text-white hover:bg-green-600 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Complete Registration"}
              </button>

            </m.div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
