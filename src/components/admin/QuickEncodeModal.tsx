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
  childNickname?: string;
  previousProgram?: string;
  previousClassTime?: string;
  classTime?: string;
  renewingTo?: string;
  renewalStatus: "not_yet_submitted" | "reserved" | "confirmed" | "released";
  isPioneer?: boolean;
  adventures?: Array<{ adventure: string; program: string; classTime?: string }>;
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

function matchClassTime(
  preferred?: string,
  availableClasses: readonly { name: string; time?: string }[] = []
): string {
  if (!availableClasses || availableClasses.length === 0) return "";
  if (!preferred) return availableClasses[0].name;

  const p = preferred.trim().toLowerCase();

  // 1. Exact match on class name
  const exact = availableClasses.find((c) => c.name.toLowerCase() === p);
  if (exact) return exact.name;

  // 2. Name alias match ("Morning Class" vs "Morning Session", "Mid-Day Class" vs "Mid-Day Session", "Afternoon Class" vs "Afternoon Session")
  const pNorm = p.replace(/\bclass\b/g, "session");
  const alias = availableClasses.find((c) => c.name.toLowerCase().replace(/\bclass\b/g, "session") === pNorm);
  if (alias) return alias.name;

  // 3. Keyword matching (morning, mid-day / midday / noon, afternoon, baby, basic)
  if (p.includes("morning")) {
    const m = availableClasses.find((c) => c.name.toLowerCase().includes("morning"));
    if (m) return m.name;
  }
  if (p.includes("mid-day") || p.includes("midday") || p.includes("noon") || p.includes("11:15")) {
    const md = availableClasses.find((c) => c.name.toLowerCase().includes("mid-day") || c.name.toLowerCase().includes("midday"));
    if (md) return md.name;
  }
  if (p.includes("afternoon") || p.includes("1:30") || p.includes("3:00")) {
    const a = availableClasses.find((c) => c.name.toLowerCase().includes("afternoon"));
    if (a) return a.name;
  }
  if (p.includes("baby")) {
    const b = availableClasses.find((c) => c.name.toLowerCase().includes("baby"));
    if (b) return b.name;
  }
  if (p.includes("basic")) {
    const b = availableClasses.find((c) => c.name.toLowerCase().includes("basic"));
    if (b) return b.name;
  }

  // 4. Time string matching (e.g. "9:45", "11:15", "1:30", "3:00")
  for (const c of availableClasses) {
    if (c.time && p.includes(c.time.toLowerCase())) return c.name;
  }

  return availableClasses[0].name;
}

export function QuickEncodeModal({ isOpen, onClose, onSuccess, currentAdventure }: QuickEncodeModalProps) {
  const [families, setFamilies] = useState<RenewalFamilyOption[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("");
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);
  const [isListExpanded, setIsListExpanded] = useState(true);

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

  // Live Slots
  const [slots, setSlots] = useState<Record<string, Record<string, { maxSlots: number; taken: number; available: number; closed?: boolean; time?: string }>>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Previous enrollment detection
  const [previousEnrollment, setPreviousEnrollment] = useState<{
    programName: string;
    classTime: string;
  } | null>(null);
  const [prefillLoading, setPrefillLoading] = useState(false);

  // Payment Fields
  const [recordPayment, setRecordPayment] = useState(false);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("GCash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [receiptBase64, setReceiptBase64] = useState<string>("");
  const [receiptFileName, setReceiptFileName] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<"" | "creating" | "uploading-receipt" | "done">("");
  const [error, setError] = useState<string | null>(null);

  // Convert receipt image file → base64
  const handleReceiptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4_000_000) {
      setError("Receipt image is too large (max 4 MB). Please compress or crop it first.");
      e.target.value = "";
      return;
    }
    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setReceiptBase64((ev.target?.result as string) || "");
    };
    reader.readAsDataURL(file);
  };

  // Fetch families when opened
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingFamilies(true);
    setError(null);
    // Reset receipt state each time the modal opens
    setReceiptBase64("");
    setReceiptFileName("");

    fetch("/api/renewals/families")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.families)
          ? data.families
          : [];
        setFamilies(list);
      })
      .catch((err) => {
        if (isMounted) setError("Failed to load renewal families. Please refresh.");
        console.error("[QuickEncodeModal] fetch families error:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingFamilies(false);
      });

    // Fetch live slot counts
    setLoadingSlots(true);
    fetch("/api/registrations/slots", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.data) {
          setSlots(data.data);
        }
      })
      .catch((err) => {
        console.error("[QuickEncodeModal] fetch slots error:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Selected Family object
  const selectedFamily = useMemo(() => {
    return families.find((f) => f._id === selectedFamilyId) || null;
  }, [families, selectedFamilyId]);

  // Populate form when family is selected with exact previous data
  useEffect(() => {
    if (!selectedFamily) {
      setPreviousEnrollment(null);
      return;
    }

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

    setChildNickname(selectedFamily.childNickname || "");
    setParentName(selectedFamily.parentName || "");
    setParentEmail(selectedFamily.parentEmail || "");

    const cleanPh = (val?: string) => {
      if (!val) return "";
      const t = String(val).trim();
      return /^(n\/?a|none|null|undefined|-)$/i.test(t) ? "" : t;
    };
    setParentPhone(cleanPh(selectedFamily.phone));

    // Initial Program & Session selection derived from family record
    const rawProgStr = selectedFamily.renewingTo || selectedFamily.previousProgram;
    const initialProgId = matchProgramId(rawProgStr);
    setSelectedProgram(initialProgId);

    const progData = PROGRAM_SLOTS[initialProgId as keyof typeof PROGRAM_SLOTS];
    const initialPreferredClass =
      selectedFamily.previousClassTime ||
      selectedFamily.classTime ||
      (Array.isArray(selectedFamily.adventures) && selectedFamily.adventures.length > 0
        ? selectedFamily.adventures[selectedFamily.adventures.length - 1]?.classTime
        : "") ||
      "";

    const initialMatchedClass = matchClassTime(initialPreferredClass, progData?.classes || []);
    if (initialMatchedClass) {
      setSelectedClass(initialMatchedClass);
    }

    if (rawProgStr || initialPreferredClass) {
      setPreviousEnrollment({
        programName: rawProgStr || progData?.name || "Program",
        classTime: initialPreferredClass || initialMatchedClass,
      });
    }

    setNotes(`Enrolled via Facebook Messenger / Direct Chat by Admin.`);

    // Fetch /api/registrations/prefill for complete verified history (nickname, phone, exact session)
    let isCancelled = false;
    setPrefillLoading(true);

    const params = new URLSearchParams();
    if (selectedFamily._id) params.set("ref", selectedFamily._id);
    if (selectedFamily.parentEmail) params.set("email", selectedFamily.parentEmail);

    fetch(`/api/registrations/prefill?${params.toString()}`)
      .then((res) => res.json())
      .then((resJson) => {
        if (isCancelled || !resJson?.success || !resJson?.prefillData) return;
        const d = resJson.prefillData;

        // Auto-fill real nickname if found
        if (d.childInfo?.nickname) {
          setChildNickname(d.childInfo.nickname);
        }
        if (d.childInfo?.firstName) {
          setChildFirstName(d.childInfo.firstName);
        }
        if (d.childInfo?.lastName) {
          setChildLastName(d.childInfo.lastName);
        }

        // Auto-fill parent name & clean phone
        if (d.parentInfo?.name) {
          setParentName(d.parentInfo.name);
        }
        const resolvedPhone = cleanPh(d.parentInfo?.phone) || cleanPh(d.emergencyContact?.phone);
        if (resolvedPhone) {
          setParentPhone(resolvedPhone);
        }

        // Exact program matching
        const resolvedProgStr = selectedFamily.renewingTo || d.previousProgram || rawProgStr;
        const resolvedProgId = matchProgramId(resolvedProgStr);
        setSelectedProgram(resolvedProgId);

        const targetProgData = PROGRAM_SLOTS[resolvedProgId as keyof typeof PROGRAM_SLOTS];
        const resolvedClassStr = d.previousClassTime || initialPreferredClass;
        const matchedClassTime = matchClassTime(resolvedClassStr, targetProgData?.classes || []);

        if (matchedClassTime) {
          setSelectedClass(matchedClassTime);
        }

        setPreviousEnrollment({
          programName: resolvedProgStr || targetProgData?.name || "Program",
          classTime: resolvedClassStr || matchedClassTime,
        });
      })
      .catch((err) => {
        console.warn("[QuickEncodeModal] prefill lookup error:", err);
      })
      .finally(() => {
        if (!isCancelled) setPrefillLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedFamily]);

  // Program and class handling
  const programData = useMemo(() => {
    return PROGRAM_SLOTS[selectedProgram as keyof typeof PROGRAM_SLOTS];
  }, [selectedProgram]);

  useEffect(() => {
    if (programData && programData.classes && programData.classes.length > 0) {
      if (!programData.classes.some((c) => c.name === selectedClass)) {
        const matched = matchClassTime(selectedClass, programData.classes);
        setSelectedClass(matched || programData.classes[0].name);
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
    const result = families.filter((f) => {
      if (filterPendingOnly && f.renewalStatus && f.renewalStatus !== "not_yet_submitted") {
        return false;
      }
      if (!q) return true;
      const childMatch = (f.childName || "").toLowerCase().includes(q);
      const parentMatch = (f.parentName || "").toLowerCase().includes(q);
      const emailMatch = (f.parentEmail || "").toLowerCase().includes(q);
      const phoneMatch = (f.phone || "").toLowerCase().includes(q);
      return childMatch || parentMatch || emailMatch || phoneMatch;
    });

    // Sort: not yet registered first, then alphabetical by child name
    return [...result].sort((a, b) => {
      const aUnsub = !a.renewalStatus || a.renewalStatus === "not_yet_submitted";
      const bUnsub = !b.renewalStatus || b.renewalStatus === "not_yet_submitted";
      if (aUnsub && !bUnsub) return -1;
      if (!aUnsub && bUnsub) return 1;
      return (a.childName || "").localeCompare(b.childName || "");
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
    if (recordPayment && !referenceNumber.trim()) {
      setError("Please enter a reference/receipt number for the payment.");
      return;
    }

    setSubmitting(true);
    setSubmitStep("creating");
    setError(null);

    try {
      // ── STEP 1: Create the registration ──────────────────────────────────
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

      const registrationId: string = json.data?.id;

      // ── STEP 2: Upload receipt image (optional) ───────────────────────────
      // If admin provided payment details + a receipt image, call the payment
      // endpoint immediately so the registration moves to "pending" status
      // and doesn't need a separate trip to /admin/payments.
      if (recordPayment && receiptBase64 && registrationId) {
        setSubmitStep("uploading-receipt");
        try {
          const payRes = await fetch(`/api/registrations/${registrationId}/payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentMethod,
              receiptBase64,
              paymentType: Number(amountPaid) >= effectiveRate ? "full" : "downpayment",
              amountDue: effectiveRate,
              amountPaid: Number(amountPaid),
              referenceNumber: referenceNumber.trim(),
              isNewFamily: false,
            }),
          });
          if (!payRes.ok) {
            const payJson = await payRes.json().catch(() => ({}));
            // Non-fatal: registration was created; just warn about receipt
            console.warn("[QuickEncodeModal] receipt upload warning:", payJson.error);
            onSuccess(
              `Encoded renewal for ${childFirstName} ${childLastName}. ⚠️ Receipt upload failed (${payJson.error || "unknown error"}) — please add it manually in Payments.`
            );
          } else {
            onSuccess(
              `Encoded renewal for ${childFirstName} ${childLastName} with receipt. Status set to Pending. ✓`
            );
          }
        } catch (payErr: any) {
          console.warn("[QuickEncodeModal] receipt upload error:", payErr);
          onSuccess(
            `Encoded renewal for ${childFirstName} ${childLastName}. ⚠️ Receipt upload failed — please add it manually in Payments.`
          );
        }
      } else {
        onSuccess(
          recordPayment
            ? `Encoded renewal for ${childFirstName} ${childLastName} (no receipt image — slot Reserved).`
            : `Successfully encoded renewal for ${childFirstName} ${childLastName}!`
        );
      }

      setSubmitStep("done");
      onClose();
    } catch (err: any) {
      console.error("[QuickEncodeModal] error submitting:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
      setSubmitStep("");
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

              {/* Selected Family Card (Collapsed State) */}
              {selectedFamily && !isListExpanded ? (
                <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-black text-lg shrink-0">
                      ✓
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-extrabold text-[14px] text-emerald-950 truncate">{selectedFamily.childName}</p>
                        {isPioneer && (
                          <span className="rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black px-2 py-0.5">
                            ⭐ Pioneer
                          </span>
                        )}
                        <span className="rounded-full bg-blue-100 border border-blue-200 text-blue-800 text-[10px] font-bold px-2 py-0.5">
                          {selectedFamily.renewingTo || selectedFamily.previousProgram || "Creative Explorer"}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-emerald-800/80 font-medium truncate mt-0.5">
                        Parent: <strong>{selectedFamily.parentName}</strong> · {selectedFamily.parentEmail} {selectedFamily.phone ? `· ${selectedFamily.phone}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsListExpanded(true)}
                    className="shrink-0 px-3 py-1.5 rounded-xl border border-emerald-400 bg-white hover:bg-emerald-100/50 text-[11.5px] font-bold text-emerald-900 transition-colors shadow-2xs"
                  >
                    Change Family ↩
                  </button>
                </div>
              ) : (
                /* Search and Card-Based Selection List */
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Type child or parent name, email, or phone to search..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setIsListExpanded(true);
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-9 py-2.5 text-[12.5px] font-medium text-slate-800 placeholder-slate-400 focus:border-[#0033A0] focus:ring-2 focus:ring-blue-100 outline-hidden transition-all shadow-2xs"
                    />
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                    <span>
                      {loadingFamilies
                        ? "Loading families..."
                        : `Showing ${filteredFamilies.length} ${filteredFamilies.length === 1 ? "family" : "families"}`}
                    </span>
                    {selectedFamily && (
                      <button
                        type="button"
                        onClick={() => setIsListExpanded(false)}
                        className="text-[#0033A0] font-bold hover:underline"
                      >
                        Keep current selection ({selectedFamily.childName})
                      </button>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {loadingFamilies ? (
                      <div className="p-6 text-center text-slate-400 text-[12px]">
                        Loading families from renewal roster...
                      </div>
                    ) : filteredFamilies.length === 0 ? (
                      <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 bg-white">
                        <p className="text-[13px] font-bold text-slate-600">No families found</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {search ? `No matches for "${search}". Try clearing search or unchecking "Not yet registered only".` : "No families available in this renewal roster."}
                        </p>
                      </div>
                    ) : (
                      filteredFamilies.map((f) => {
                        const isSelected = f._id === selectedFamilyId;
                        const statusConfig = {
                          not_yet_submitted: { label: "Not Yet Registered", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
                          reserved: { label: "Reserved", bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
                          confirmed: { label: "Confirmed", bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
                          released: { label: "Released", bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
                        }[f.renewalStatus] || { label: f.renewalStatus, bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" };

                        return (
                          <button
                            key={f._id}
                            type="button"
                            onClick={() => {
                              setSelectedFamilyId(f._id);
                              setIsListExpanded(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? "border-[#0033A0] bg-blue-50/70 shadow-xs ring-2 ring-blue-100"
                                : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-2xs"
                            }`}
                          >
                            <div className="min-w-0 flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSelected ? "bg-[#0033A0] text-white" : "bg-slate-100 text-slate-600"
                              }`}>
                                {isSelected ? "✓" : "🎒"}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-extrabold text-[13px] text-[#002f76] truncate">{f.childName}</p>
                                  {f.isPioneer && (
                                    <span className="rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[9.5px] font-black px-1.5 py-0.2">
                                      ⭐ Pioneer
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-600 truncate mt-0.5">
                                  <span className="text-slate-400 font-medium">Parent:</span> <strong className="text-slate-700">{f.parentName}</strong>
                                  {f.phone && <span className="text-slate-400"> · {f.phone}</span>}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 flex flex-col items-end gap-1">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 border border-blue-200 text-[#0033A0]">
                                {f.renewingTo || f.previousProgram || "Creative Explorer"}
                              </span>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                                {statusConfig.label}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

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

                  {/* Previous enrollment notice if detected */}
                  {previousEnrollment && (
                    <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 p-2.5 flex items-center justify-between gap-2 text-[11.5px]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-[#0033A0] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          🎒
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider font-extrabold text-blue-900 flex items-center gap-1.5">
                            <span>Previous Record Detected &amp; Auto-Matched</span>
                            {prefillLoading && <span className="text-[9.5px] text-blue-500 font-normal">· Checking history…</span>}
                          </p>
                          <p className="font-extrabold text-slate-800 truncate">
                            {previousEnrollment.programName} · <span className="text-[#0033A0]">{previousEnrollment.classTime}</span>
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                        ✓ Auto-matched
                      </span>
                    </div>
                  )}

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
                        {(programData?.classes || []).map((cls) => {
                          const slot = slots[selectedProgram]?.[cls.name];
                          const max = slot?.maxSlots ?? cls.maxSlots ?? 10;
                          const taken = slot?.taken ?? 0;
                          const avail = slot ? slot.available : Math.max(0, max - taken);
                          const isClosed = slot?.closed;
                          const isFull = avail <= 0;

                          let slotSuffix = "";
                          if (isClosed) {
                            slotSuffix = ` — 🔒 CLOSED (Total: ${max} slots)`;
                          } else if (isFull) {
                            slotSuffix = ` — ⚠️ FULL (${taken}/${max} slots taken · 0 left · Total: ${max})`;
                          } else {
                            slotSuffix = ` — 🟢 ${avail} of ${max} slots left (${taken} taken · Total: ${max})`;
                          }

                          return (
                            <option key={cls.name} value={cls.name}>
                              {cls.name} ({cls.time}){slotSuffix}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Visual Session Availability Selector with Slot Numbers */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold uppercase tracking-wide text-slate-500">
                        Total &amp; Remaining Slots by Session
                      </span>
                      {loadingSlots && (
                        <span className="text-slate-400 font-medium">Checking live slots…</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(programData?.classes || []).map((cls) => {
                        const isSelected = selectedClass === cls.name;
                        const slot = slots[selectedProgram]?.[cls.name];
                        const max = slot?.maxSlots ?? cls.maxSlots ?? 10;
                        const taken = slot?.taken ?? 0;
                        const avail = slot ? slot.available : Math.max(0, max - taken);
                        const isClosed = slot?.closed;
                        const isFull = avail <= 0;
                        const pct = Math.min(100, Math.round((taken / max) * 100));

                        let badgeBg = "bg-emerald-50 text-emerald-800 border-emerald-300";
                        let badgeLabel = `${avail} left`;

                        if (isClosed) {
                          badgeBg = "bg-slate-100 text-slate-600 border-slate-300";
                          badgeLabel = "Closed";
                        } else if (isFull) {
                          badgeBg = "bg-rose-100 text-rose-800 border-rose-300";
                          badgeLabel = "0 left (FULL)";
                        } else if (avail <= 2) {
                          badgeBg = "bg-amber-100 text-amber-900 border-amber-300";
                          badgeLabel = `Only ${avail} left!`;
                        }

                        return (
                          <button
                            key={cls.name}
                            type="button"
                            onClick={() => setSelectedClass(cls.name)}
                            className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                              isSelected
                                ? "border-[#0033A0] bg-blue-50/70 ring-2 ring-blue-200 shadow-2xs"
                                : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/70"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[12px] font-extrabold text-[#002f76] truncate">
                                {cls.name}
                              </span>
                              {isSelected && (
                                <span className="w-4 h-4 rounded-full bg-[#0033A0] text-white flex items-center justify-center text-[9px] font-black shrink-0">
                                  ✓
                                </span>
                              )}
                            </div>

                            <p className="text-[10.5px] text-slate-500 font-semibold">{cls.time}</p>

                            {/* Mini Capacity Progress Bar */}
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden my-0.5">
                              <div
                                className={`h-full rounded-full ${
                                  pct >= 100 ? "bg-rose-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[10px] gap-1">
                              <span className={`px-2 py-0.5 rounded-full font-black border ${badgeBg}`}>
                                {badgeLabel}
                              </span>
                              <span className="text-slate-600 font-bold">
                                {taken}/{max} total slots
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Session Live Capacity Ribbon (1-Liner) */}
                  {(() => {
                    const selectedSlot = slots[selectedProgram]?.[selectedClass];
                    const clsData = (programData?.classes || []).find((c) => c.name === selectedClass);
                    const max = selectedSlot?.maxSlots ?? clsData?.maxSlots ?? 10;
                    const taken = selectedSlot?.taken ?? 0;
                    const avail = selectedSlot ? selectedSlot.available : Math.max(0, max - taken);
                    const pct = Math.min(100, Math.round((taken / max) * 100));

                    return (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2.5 space-y-1.5 text-[11.5px]">
                        <div className="flex items-center justify-between gap-2 whitespace-nowrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-extrabold text-[#002f76] truncate">
                              📊 {selectedClass || "Session"}
                            </span>
                            <span className="text-[11px] bg-white border border-blue-200 text-blue-900 font-bold px-2 py-0.5 rounded-full shrink-0">
                              Total: {max}
                            </span>
                            <span className="text-[11px] bg-white border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full shrink-0">
                              Taken: {taken}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-black text-[10.5px] border shrink-0 ${
                              avail <= 0
                                ? "bg-rose-100 text-rose-800 border-rose-300"
                                : avail <= 2
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : "bg-emerald-100 text-emerald-900 border-emerald-300"
                            }`}
                          >
                            {avail <= 0 ? "⚠️ 0 left (FULL)" : `🟢 ${avail} of ${max} slots remaining`}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              pct >= 100 ? "bg-rose-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Overcapacity warning if selected class is full */}
                  {(() => {
                    const currentSlot = slots[selectedProgram]?.[selectedClass];
                    const clsData = (programData?.classes || []).find((c) => c.name === selectedClass);
                    const max = currentSlot?.maxSlots ?? clsData?.maxSlots ?? 10;
                    const taken = currentSlot?.taken ?? 0;
                    const avail = currentSlot ? currentSlot.available : Math.max(0, max - taken);
                    if (avail <= 0) {
                      return (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-[11.5px] font-semibold text-amber-900 flex items-start gap-2">
                          <span className="shrink-0 text-amber-600 font-bold">⚠️</span>
                          <span>
                            <strong>{selectedClass}</strong> has <strong>0 slots remaining</strong> ({taken} of {max} slots occupied). As staff, you may still encode this reservation if authorized to overbook.
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}

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
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Reference Number *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 1002345678"
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12.5px] text-slate-800"
                        />
                      </div>

                      {/* Receipt Image Upload */}
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Receipt Screenshot / Photo
                          <span className="ml-1 text-slate-400 font-normal">(optional — attaching it moves status to Pending immediately)</span>
                        </label>
                        {receiptBase64 ? (
                          <div className="flex items-center gap-3 p-2.5 rounded-xl border border-emerald-300 bg-emerald-50">
                            <img
                              src={receiptBase64}
                              alt="receipt preview"
                              className="w-14 h-14 rounded-lg object-cover border border-emerald-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-[12px] font-bold text-emerald-900 truncate">{receiptFileName}</p>
                              <p className="text-[11px] text-emerald-700 mt-0.5">Receipt ready — will be uploaded on submit</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setReceiptBase64(""); setReceiptFileName(""); }}
                              className="shrink-0 text-[11px] font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              ✕ Remove
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer transition-all group">
                            <span className="text-2xl">📸</span>
                            <div>
                              <p className="text-[12px] font-bold text-slate-700 group-hover:text-blue-800">Click to attach receipt image</p>
                              <p className="text-[10.5px] text-slate-400 mt-0.5">PNG, JPG, GIF · max 4 MB</p>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleReceiptFile}
                            />
                          </label>
                        )}
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
                <span>
                  {submitting
                    ? submitStep === "uploading-receipt"
                      ? "Uploading Receipt..."
                      : "Creating Registration..."
                    : "Confirm & Encode Registration"}
                </span>
              </button>
            </div>
          </form>
        </m.div>
      </div>
    </AnimatePresence>
  );
}
