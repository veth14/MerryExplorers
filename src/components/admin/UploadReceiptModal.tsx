"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import { readReceipt, type ReceiptData } from "@/lib/receipt-ocr";
import { PROGRAM_SLOTS } from "@/data/landing";
import { FALLBACK_PIONEER_RATES } from "@/lib/payment-terms";

const MAX_RECEIPT_BYTES = 1_200_000;

function fileToReceipt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (file.type === "application/pdf") {
        return dataUrl.length > MAX_RECEIPT_BYTES * 1.37
          ? reject(new Error("PDF is too large. Please use an image or a smaller PDF."))
          : resolve(dataUrl);
      }
      if (!file.type.startsWith("image/")) {
        return reject(new Error("Please upload an image or PDF."));
      }
      const img = new Image();
      img.onerror = () => reject(new Error("That image could not be opened."));
      img.onload = () => {
        const MAX = 1400;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export interface UploadReceiptTarget {
  id: string;
  childInfo: {
    firstName: string;
    lastName: string;
    nickname?: string;
  };
  parentInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  program: string;
  classTime?: string;
  amountDue?: number;
  amountPaid?: number;
  paymentMethod?: string;
  referenceNumber?: string;
  receiptUrl?: string;
  status: string;
  isPioneer?: boolean;
  customRate?: number | null;
  isNewFamily?: boolean;
  uniformOrdered?: boolean;
}

interface UploadReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  registration: UploadReceiptTarget | null;
  currentUser?: {
    uid?: string;
    email?: string;
    fullName?: string;
    role?: string;
  };
}

const PAYMENT_METHODS = [
  { id: "GCash", label: "GCash" },
  { id: "BDO Transfer", label: "BDO Transfer" },
  { id: "BPI Transfer", label: "BPI Transfer" },
  { id: "MariBank", label: "MariBank" },
  { id: "Cash", label: "Cash" },
  { id: "Other", label: "Other Bank Transfer" },
];

export function UploadReceiptModal({
  isOpen,
  onClose,
  onSuccess,
  registration,
  currentUser,
}: UploadReceiptModalProps) {
  const [receiptBase64, setReceiptBase64] = useState<string>("");
  const [receiptName, setReceiptName] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("GCash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [verifyNow, setVerifyNow] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrInfo, setOcrInfo] = useState<ReceiptData | null>(null);
  const ocrRunRef = useRef(0);

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<"" | "uploading" | "verifying" | "done">("");
  const [error, setError] = useState<string | null>(null);

  // Compute program rate & expected downpayment
  const effectiveRate = useMemo(() => {
    if (!registration) return 0;
    const progKey = registration.program as keyof typeof PROGRAM_SLOTS;
    const progData = PROGRAM_SLOTS[progKey];
    if (registration.isPioneer && FALLBACK_PIONEER_RATES[registration.program]) {
      return FALLBACK_PIONEER_RATES[registration.program];
    }
    return registration.customRate || progData?.rate || registration.amountDue || 0;
  }, [registration]);

  const defaultDownpayment = useMemo(() => {
    return Math.round(effectiveRate * 0.6);
  }, [effectiveRate]);

  // Reset/prefill when registration changes or opens
  useEffect(() => {
    if (!isOpen || !registration) return;
    setReceiptBase64("");
    setReceiptName("");
    setOcrInfo(null);
    setOcrLoading(false);
    setError(null);
    setPaymentMethod(registration.paymentMethod || "GCash");
    setReferenceNumber(registration.referenceNumber || "");
    const initialPaid = registration.amountPaid && registration.amountPaid > 0
      ? registration.amountPaid
      : defaultDownpayment;
    setAmountPaid(initialPaid);
    setVerifyNow(true);
    setSendEmail(true);
  }, [isOpen, registration, defaultDownpayment]);

  // Handle file select + OCR
  const handleFileChange = async (file?: File) => {
    if (!file) return;
    setError(null);

    try {
      const dataUrl = await fileToReceipt(file);
      setReceiptBase64(dataUrl);
      setReceiptName(file.name);

      if (dataUrl.startsWith("data:image")) {
        const runId = ++ocrRunRef.current;
        setOcrLoading(true);
        setOcrInfo(null);

        readReceipt(file, dataUrl)
          .then((res) => {
            if (runId !== ocrRunRef.current) return;
            setOcrInfo(res);
            if (res.reference && !referenceNumber) {
              setReferenceNumber(res.reference);
            }
            if (res.amount != null && res.amount > 0) {
              setAmountPaid(res.amount);
            }
            if (res.method) {
              const matchedMethod = PAYMENT_METHODS.find(
                (m) => m.id.toLowerCase().replace(/[\s-]/g, "") === res.method?.toLowerCase().replace(/[\s-]/g, "")
              );
              if (matchedMethod) setPaymentMethod(matchedMethod.id);
            }
          })
          .catch((err) => {
            console.warn("[UploadReceiptModal] OCR scan warning:", err);
            if (runId === ocrRunRef.current) {
              setOcrInfo({ reference: "", amount: null, date: null, method: null });
            }
          })
          .finally(() => {
            if (runId === ocrRunRef.current) setOcrLoading(false);
          });
      }
    } catch (err: any) {
      setError(err.message || "Failed to process receipt image.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration) return;

    if (!receiptBase64) {
      setError("Please attach a receipt screenshot or photo.");
      return;
    }
    if (!referenceNumber.trim()) {
      setError("Please enter the payment reference number.");
      return;
    }
    if (amountPaid <= 0) {
      setError("Please enter a valid amount paid.");
      return;
    }

    setSubmitting(true);
    setSubmitStep("uploading");
    setError(null);

    try {
      // 1. Submit payment + receipt to API
      const paymentPayload = {
        paymentMethod,
        receiptBase64,
        paymentType: Number(amountPaid) >= effectiveRate ? "full" : "downpayment",
        amountDue: effectiveRate,
        amountPaid: Number(amountPaid),
        referenceNumber: referenceNumber.trim(),
        isNewFamily: Boolean(registration.isNewFamily),
        uniformOrdered: Boolean(registration.uniformOrdered),
      };

      const res = await fetch(`/api/registrations/${registration.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentPayload),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to record payment receipt.");
      }

      // 2. If verifyNow is checked, approve the registration right away
      if (verifyNow) {
        setSubmitStep("verifying");
        const approveRes = await fetch(`/api/registrations/${registration.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorUid: currentUser?.uid,
            actorName: currentUser?.fullName || currentUser?.email || "Admin",
            actorRole: currentUser?.role || "admin",
            sendEmail,
          }),
        });

        const approveJson = await approveRes.json();
        if (!approveRes.ok || approveJson.error) {
          // Non-fatal warning: receipt is saved, approval can be clicked on the list
          onSuccess(
            `Receipt attached for ${registration.childInfo.firstName}. ⚠️ Auto-verify returned: ${approveJson.error || "Please click Approve manually."}`
          );
          onClose();
          return;
        }

        onSuccess(
          `Payment receipt attached and registration verified for ${registration.childInfo.firstName}! ${sendEmail ? "📧 Confirmation email sent." : ""}`
        );
      } else {
        onSuccess(
          `Receipt attached for ${registration.childInfo.firstName}. Status moved to Pending for review.`
        );
      }

      setSubmitStep("done");
      onClose();
    } catch (err: any) {
      console.error("[UploadReceiptModal] submit error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
      setSubmitStep("");
    }
  };

  if (!isOpen || !registration) return null;

  const childFullName = `${registration.childInfo.firstName} ${registration.childInfo.lastName}`.trim();
  const isPdf = receiptName.toLowerCase().endsWith(".pdf");

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <m.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-8"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#002f76] to-[#0047b3] px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-400 text-emerald-950 flex items-center justify-center font-black text-lg shadow-sm">
                🧾
              </div>
              <div>
                <h3 className="font-extrabold text-[16px] leading-tight flex items-center gap-2">
                  Upload Payment Receipt
                </h3>
                <p className="text-[12px] text-blue-100/90 mt-0.5">
                  Attach receipt for <strong>{childFullName}</strong> · {registration.parentInfo.name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-[12.5px] text-red-700 font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Dropzone */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#002f76] mb-1.5">
                Receipt File (Image or PDF) *
              </label>

              {receiptBase64 ? (
                <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 p-3">
                  <div className="flex items-center gap-3">
                    {isPdf ? (
                      <div className="w-14 h-14 rounded-xl bg-red-100 border border-red-300 text-red-700 flex items-center justify-center font-black text-xl shrink-0">
                        📄
                      </div>
                    ) : (
                      <img
                        src={receiptBase64}
                        alt="Receipt preview"
                        className="w-16 h-16 rounded-xl object-cover border border-emerald-300 shrink-0 shadow-2xs"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-[13px] text-emerald-950 truncate">{receiptName}</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">
                        Receipt ready for upload
                      </p>
                    </div>
                    <label className="shrink-0 px-3 py-1.5 rounded-xl border border-emerald-400 bg-white hover:bg-emerald-100/50 text-[11.5px] font-bold text-emerald-900 transition-colors shadow-2xs cursor-pointer">
                      Change
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => handleFileChange(e.target.files?.[0])}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer transition-all group">
                  <span className="text-3xl mb-1 group-hover:scale-110 transition-transform">📎</span>
                  <p className="text-[13px] font-extrabold text-slate-700 group-hover:text-[#0033A0]">
                    Click or drag &amp; drop receipt screenshot / photo
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supports PNG, JPG, WebP, PDF · Scans amount &amp; ref automatically
                  </p>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0])}
                  />
                </label>
              )}
            </div>

            {/* OCR Progress / Result Banner */}
            {ocrLoading && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-[11.5px] font-semibold text-blue-800 flex items-center gap-2">
                <span className="animate-spin text-sm">⏳</span>
                <span>Reading receipt details with OCR (Reference no., amount, bank)...</span>
              </div>
            )}

            {!ocrLoading && ocrInfo && (
              <div
                className={`rounded-xl border p-2.5 text-[11.5px] font-semibold ${
                  ocrInfo.reference || ocrInfo.amount != null
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                }`}
              >
                {ocrInfo.reference || ocrInfo.amount != null ? (
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                      <span>✓</span> Scanned from receipt:
                    </p>
                    <div className="text-[11px] text-emerald-800 flex flex-wrap gap-x-3 gap-y-0.5">
                      {ocrInfo.reference && (
                        <span>
                          Ref: <strong className="font-mono">{ocrInfo.reference}</strong>
                        </span>
                      )}
                      {ocrInfo.amount != null && (
                        <span>
                          Amount: <strong>₱{ocrInfo.amount.toLocaleString()}</strong>
                        </span>
                      )}
                      {ocrInfo.method && (
                        <span>
                          Sent to: <strong className="capitalize">{ocrInfo.method}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-800">
                    Couldn&apos;t auto-read receipt text clearly. Please verify the amount and reference number below.
                  </p>
                )}
              </div>
            )}

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12.5px] font-semibold text-slate-800"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Amount Paid (₱) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={amountPaid || ""}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12.5px] font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Reference Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1002345678"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12.5px] font-mono font-semibold text-slate-800"
                />
              </div>
            </div>

            {/* Verification options */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifyNow}
                  onChange={(e) => setVerifyNow(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                />
                <div>
                  <span className="text-[12px] font-extrabold text-slate-800">
                    Mark as Verified right away
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Approves the registration immediately. Uncheck to leave status as Pending for later review.
                  </p>
                </div>
              </label>

              {verifyNow && (
                <label className="flex items-center gap-2.5 pl-6 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                  <span className="text-[11.5px] font-bold text-slate-700">
                    📧 Email confirmation to parent ({registration.parentInfo.email})
                  </span>
                </label>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-[12.5px] font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !receiptBase64 || !referenceNumber.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0033A0] hover:bg-[#002776] text-white text-[12.5px] font-extrabold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>⚡</span>
                <span>
                  {submitting
                    ? submitStep === "verifying"
                      ? "Verifying Registration..."
                      : "Uploading Receipt..."
                    : verifyNow
                    ? "Attach Receipt & Approve"
                    : "Attach Receipt (Move to Pending)"}
                </span>
              </button>
            </div>
          </form>
        </m.div>
      </div>
    </AnimatePresence>
  );
}