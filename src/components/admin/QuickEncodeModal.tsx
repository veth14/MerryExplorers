"use client";

import { useState, useEffect, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import { PROGRAM_SLOTS } from "@/data/landing";
import { FALLBACK_PIONEER_RATES } from "@/lib/payment-terms";

export interface RenewalFamilyOption {
  _id: string;
  parentName: string;
  parentEmail: string;
  phone: string;
  childName: string;
  previousProgram?: string;
  renewingTo?: string;
  renewalStatus: "not_yet_submitted" | "reserved" | "confirmed" | "released";
  isPioneer?: boolean;
}

interface QuickEncodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  currentAdventure?: number | null;
}

function matchProgramId(val?: string): string {
  if (!val) return "creative-explorer";
  const s = val.toLowerCase();
  if (s.includes("curious") && s.includes("everyday")) return "everyday-curious";
  if (s.includes("everyday")) return "everyday-curious";
  if (s.includes("curious")) return "curious-explorer";
  if (s.includes("creative")) return "creative-explorer";
  if (s.includes("brave") || s.includes("trailblazer")) return "brave-explorer";
  if (s.includes("ballet")) return "ballet";
  if (s.includes("saturday") || s.includes("playdate")) return "saturday-playdate";
  if (s.includes("virtual")) return "virtual-session";
  if (val in PROGRAM_SLOTS) return val;
  return "creative-explorer";
}

export function QuickEncodeModal({ isOpen, onClose, onSuccess, currentAdventure }: QuickEncodeModalProps) {
  const [families, setFamilies] = useState<RenewalFamilyOption[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("");
  const [filterPendingOnly, setFilterPendingOnly] = useState(true);

  // Form Fields
  const [childFirstName, setChildFirstName] = useState("");
  const [childLastName, setChildLastName] = useState("");
  const [childNickname, setChildNickname] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<string>("creative-explorer");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Payment Fields
  const [recordPayment, setRecordPayment] = useState(false);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("GCash");
  const [referenceNumber, setReferenceNumber] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch families when opened
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingFamilies(true);
    setError(null);

    fetch("/api/renewals/families")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.families && Array.isArray(data.families)) {
          setFamilies(data.families);
        }
      })
      .catch((err) => {
        if (isMounted) setError("Failed to load renewal families. Please refresh.");
        console.error("[QuickEncodeModal] fetch families error:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingFamilies(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Selected Family object
  const selectedFamily = useMemo(() => {
    return families.find((f) => f._id === selectedFamilyId) || null;
  }, [families, selectedFamilyId]);

  // Populate form when family is selected
  useEffect(() => {
    if (!selectedFamily) return;

    // Split childName into first and last
    const rawChild = (selectedFamily.childName || "").trim();
    const parts = rawChild.split(/\s+/);
    if (parts.length > 1) {
      setChildFirstName(parts.slice(0, -1).join(" "));
      setChildLastName(parts[parts.length - 1]);
    } else {
      setChildFirstName(rawChild);
      setChildLastName("");
    }

    setParentName(selectedFamily.parentName || "");
    setParentEmail(selectedFamily.parentEmail || "");
    setParentPhone(selectedFamily.phone || "");

    const progId = matchProgramId(selectedFamily.renewingTo || selectedFamily.previousProgram);
    setSelectedProgram(progId);

    const progData = PROGRAM_SLOTS[progId as keyof typeof PROGRAM_SLOTS];
    if (progData && progData.classes && progData.classes.length > 0) {
      setSelectedClass(progData.classes[0].name);
    } else {
      setSelectedClass("");
    }

    setNotes(`Enrolled via Facebook Messenger / Direct Chat by Admin.`);
  }, [selectedFamily]);

  // Program and class handling
  const programData = useMemo(() => {
    return PROGRAM_SLOTS[selectedProgram as keyof typeof PROGRAM_SLOTS];
  }, [selectedProgram]);

  useEffect(() => {
    if (programData && programData.classes && programData.classes.length > 0) {
      if (!programData.classes.some((c) => c.name === selectedClass)) {
        setSelectedClass(programData.classes[0].name);
      }
    }
  }, [programData, selectedClass]);

  // Calculate pricing
  const isPioneer = Boolean(selectedFamily?.isPioneer);
  const effectiveRate = useMemo(() => {
    if (!programData) return 0;
    if (isPioneer && FALLBACK_PIONEER_RATES[selectedProgram]) {
      return FALLBACK_PIONEER_RATES[selectedProgram];
    }
    return programData.rate || 0;
  }, [programData, isPioneer, selectedProgram]);

  const expectedDownpayment = useMemo(() => {
    return Math.round(effectiveRate * 0.6);
  }, [effectiveRate]);

  useEffect(() => {
    if (recordPayment && amountPaid === 0) {
      setAmountPaid(expectedDownpayment);
    }
  }, [recordPayment, expectedDownpayment, amountPaid]);

  // Filtered families list for search/select
  const filteredFamilies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return families.filter((f) => {
      if (filterPendingOnly && f.renewalStatus !== "not_yet_submitted") {
        return false;
      }
      if (!q) return true;
      const childMatch = (f.childName || "").toLowerCase().includes(q);
      const parentMatch = (f.parentName || "").toLowerCase().includes(q);
      const emailMatch = (f.parentEmail || "").toLowerCase().includes(q);
      const phoneMatch = (f.phone || "").toLowerCase().includes(q);
      return childMatch || parentMatch || emailMatch || phoneMatch;
    });
  }, [families, search, filterPendingOnly]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamily) {
      setError("Please select a renewal family first.");
      return;
    }
    if (!childFirstName.trim() || !childLastName.trim()) {
      setError("Child first name and last name are both required.");
      return;
    }
    if (!parentName.trim() || !parentEmail.trim()) {
      setError("Parent name and email are required.");
      return;
    }
    if (!selectedProgram || !selectedClass) {
      setError("Please choose a program and a session time.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        encodedBy: "admin",
        encodedFamilyId: selectedFamily._id,
        isRenewal: true,
        isNewFamily: false,
        program: selectedProgram,
        classTime: selectedClass,
        parentInfo: {
          name: parentName.trim(),
          email: parentEmail.trim().toLowerCase(),
          phone: parentPhone.trim(),
          relationship: "Parent",
          isRenewal: true,
        },
        childInfo: {
          firstName: childFirstName.trim(),
          lastName: childLastName.trim(),
          nickname: childNickname.trim(),
          dateOfBirth: "",
          gender: "unspecified",
        },
        emergencyContact: {
          name: parentName.trim(),
          phone: parentPhone.trim(),
          relationship: "Parent",
        },
        paymentMethod: recordPayment ? paymentMethod : "To Follow (Renewal Reservation)",
        paymentType: recordPayment ? (Number(amountPaid) >= effectiveRate ? "full" : "downpayment") : "downpayment",
        amountDue: effectiveRate,
        amountPaid: recordPayment ? Number(amountPaid) : 0,
        referenceNumber: recordPayment ? referenceNumber.trim() : "",
        photoConsent: "yes",
        dataPrivacyConsent: true,
        notes: notes.trim()
          ? `[Admin Quick Encoded via Facebook/Chat] ${notes.trim()}`
          : "[Admin Quick Encoded via Facebook/Chat]",
      };

      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to encode registration.");
      }

      onSuccess(`Successfully encoded renewal for ${childFirstName} ${childLastName}!`);
      onClose();
    } catch (err: any) {
      console.error("[QuickEncodeModal] error submitting:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <m.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-8"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#002f76] to-[#0047b3] px-6 py-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-lg shadow-sm">
                ⚡
              </div>
              <div>
                <h3 className="font-extrabold text-[17px] leading-tight flex items-center gap-2">
                  Quick Encode Renewal Registration
                  {currentAdventure && (
                    <span className="text-[11px] bg-white/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">
                      Adventure {currentAdventure}
                    </span>
                  )}
                </h3>
                <p className="text-[12px] text-blue-100/90 mt-0.5">
                  Encode renewals received via Facebook Message or manual contact without retyping.
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

          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-[12.5px] text-red-700 font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: SELECT RENEWAL FAMILY */}
            <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-[12px] font-black uppercase tracking-wider text-[#002f76] flex items-center gap-1.5">
                  <span>1.</span> Select Renewal Family
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterPendingOnly}
                      onChange={(e) => setFilterPendingOnly(e.target.checked)}
                      className="rounded border-slate-300 text-[#0033A0] focus:ring-[#0033A0]"
                    />
                    Not yet registered only
                  </label>
                </div>
              </div>

              {/* Search & Select dropdown */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="🔍 Search by child name or parent name / email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-[12.5px] font-medium text-slate-800 placeholder-slate-400 focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-hidden"
                />

                <select
                  value={selectedFamilyId}
                  onChange={(e) => setSelectedFamilyId(e.target.value)}
                  disabled={loadingFamilies}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[13px] font-bold text-slate-800 focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-hidden"
                >
                  <option value="">
                    {loadingFamilies
                      ? "Loading families list..."
                      : `-- Choose a Family (${filteredFamilies.length} available) --`}
                  </option>
                  {filteredFamilies.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.childName} · Parent: {f.parentName} ({f.renewingTo || f.previousProgram || "Explorer"}
                      {f.isPioneer ? " · ⭐ Pioneer" : ""})
                      {f.renewalStatus !== "not_yet_submitted" ? ` [${f.renewalStatus}]` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Warning if already submitted */}
              {selectedFamily && selectedFamily.renewalStatus !== "not_yet_submitted" && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-[11.5px] font-semibold text-amber-900 flex items-start gap-2">
                  <span className="shrink-0 text-amber-600 font-bold">⚠️</span>
                  <span>
                    This family is already marked as{" "}
                    <strong className="uppercase font-black text-amber-950">{selectedFamily.renewalStatus}</strong>.
                    Submitting this form will encode another registration record for them.
                  </span>
                </div>
              )}
            </div>

            {/* STEP 2: FAMILY & STUDENT DETAILS (PRE-FILLED) */}
            {selectedFamily && (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <label className="text-[12px] font-black uppercase tracking-wider text-[#002f76] flex items-center gap-1.5">
                    <span>2.</span> Child &amp; Parent Contact Details
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Child First Name *</label>
                      <input
                        type="text"
                        required
                        value={childFirstName}
                        onChange={(e) => setChildFirstName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12.5px] font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Child Last Name *</label>
                      <input
                        type="text"
                        required
                        value={childLastName}
                        onChange={(e) => setChildLastName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12.5px] font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Nickname (Optional)</label>
                      <input
                        type="text"
                        value={childNickname}
                        onChange={(e) => setChildNickname(e.target.value)}
                        placeholder="e.g. Ramiel"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12.5px] text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Parent Full Name *</label>
                      <input
                        type="text"
                        required
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12.5px] font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Parent Email *</label>
                      <input
                        type="email"
                        required
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12.5px] text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Parent Phone *</label>
                      <input
                        type="tel"
                        required
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12.5px] text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* STEP 3: PROGRAM & SESSION SLOT */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-black uppercase tracking-wider text-[#002f76] flex items-center gap-1.5">
                      <span>3.</span> Program &amp; Session Slot
                    </label>
                    {isPioneer && (
                      <span className="rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10.5px] font-black px-2 py-0.5">
                        ⭐ Pioneer Family Rate
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Program</label>
                      <select
                        value={selectedProgram}
                        onChange={(e) => setSelectedProgram(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12.5px] font-bold text-slate-800"
                      >
                        {Object.entries(PROGRAM_SLOTS).map(([key, prog]) => (
                          <option key={key} value={key}>
                            {prog.name} (₱{isPioneer && FALLBACK_PIONEER_RATES[key] ? FALLBACK_PIONEER_RATES[key].toLocaleString() : prog.rate.toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Class / Session Time</label>
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12.5px] font-bold text-slate-800"
                      >
                        {(programData?.classes || []).map((cls) => (
                          <option key={cls.name} value={cls.name}>
                            {cls.name} ({cls.time})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Pricing Summary Ribbon */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between text-[12px]">
                    <div>
                      <span className="text-slate-500 font-medium">Total Rate: </span>
                      <strong className="text-slate-900 font-extrabold">₱{effectiveRate.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">60% Downpayment: </span>
                      <strong className="text-amber-800 font-extrabold">₱{expectedDownpayment.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                {/* STEP 4: OPTIONAL PAYMENT RECORDING */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-black uppercase tracking-wider text-[#002f76] flex items-center gap-1.5">
                      <span>4.</span> Payment Status
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={recordPayment}
                        onChange={(e) => setRecordPayment(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                      />
                      <span className="text-[11.5px] font-bold text-slate-700">Payment already collected via FB/GCash?</span>
                    </label>
                  </div>

                  {recordPayment ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Amount Paid (₱) *</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12.5px] font-bold text-emerald-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12.5px] font-medium text-slate-800"
                        >
                          <option value="GCash">GCash</option>
                          <option value="BDO Transfer">BDO Transfer</option>
                          <option value="BPI Transfer">BPI Transfer</option>
                          <option value="Cash">Cash</option>
                          <option value="Other">Other Bank Transfer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Reference Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 1002345678"
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12.5px] text-slate-800"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11.5px] text-slate-500 italic">
                      Slot will be reserved under <strong>Pending / Reserved</strong> status. You can send payment reminders or record payment later in the renewals/registrations manager.
                    </p>
                  )}
                </div>

                {/* STEP 5: NOTES */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-wider text-[#002f76]">
                    Internal Staff Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Parent confirmed via Messenger on Nov 19..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-[12px] text-slate-700 outline-hidden focus:border-[#0033A0]"
                  />
                </div>
              </>
            )}

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
                disabled={submitting || !selectedFamily}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0033A0] hover:bg-[#002776] text-white text-[12.5px] font-extrabold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>⚡</span>
                <span>{submitting ? "Encoding Registration..." : "Confirm & Encode Registration"}</span>
              </button>
            </div>
          </form>
        </m.div>
      </div>
    </AnimatePresence>
  );
}
