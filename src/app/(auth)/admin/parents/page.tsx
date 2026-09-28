"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { UserMetricCard } from "@/components/users/user-metric-card";
import { uploadAvatar } from "@/lib/supabase";
import { cachedFetch, invalidateCache } from "@/lib/cache";
import { useAuth } from "@/lib/auth-context";

// ─── Programs ─────────────────────────────────────────────────────────────────
type ClassTime = { label: string; range: string };

type Program = {
  value: string;
  ages: string;
  days: string;
  sessions: number;
  prerequisite?: string;
  times: ClassTime[];
};

const PROGRAMS: Program[] = [
  {
    value: "Discovery Club: Curious Explorer",
    ages: "1.5 – 4.11",
    days: "Monday & Wednesday",
    sessions: 8,
    times: [
      { label: "Morning Class", range: "9:45 AM – 11:00 AM" },
      { label: "Afternoon Class", range: "1:30 PM – 2:45 PM" },
    ],
  },
  {
    value: "Discovery Club: Creative Explorer",
    ages: "2.6 – 4.11",
    days: "Tuesday, Thursday & Friday",
    sessions: 12,
    prerequisite: "Child must be able to stay independently with Teacher during sessions without a guardian.",
    times: [
      { label: "Morning Class", range: "9:45 AM – 11:00 AM" },
      { label: "Mid-Day Class", range: "11:15 AM – 12:30 PM" },
      { label: "Afternoon Class", range: "1:30 PM – 2:45 PM" },
    ],
  },
  {
    value: "Discovery Club: Everyday Curious",
    ages: "1.5 – 4.11",
    days: "Monday – Friday",
    sessions: 14,
    times: [{ label: "Afternoon Class", range: "4:25 PM – 5:25 PM" }],
  },
  {
    value: "Trailblazer: Brave Explorer",
    ages: "3 – 4.11",
    days: "Monday – Friday",
    sessions: 18,
    times: [{ label: "Afternoon Class", range: "3:00 PM – 4:15 PM" }],
  },
];

function classTimeValue(t: ClassTime) {
  return `${t.label} · ${t.range}`;
}

function findProgram(value: string) {
  return PROGRAMS.find((p) => p.value === value);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.trim().split(" ").filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join("");
}

const AVATAR_COLORS = [
  "#002f76", "#0050d5", "#ffb347", "#4a90d9", "#e17055",
  "#6c5ce7", "#00b894", "#fd79a8", "#a29bfe", "#55efc4", "#fdcb6e",
];

function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// ─── Types ──────────────────────────────────────────────────────────────────
type ParentAccount = {
  id: string;
  avatarUrl: string;
  avatarColor: string;
  initials: string;
  fullName: string;
  email: string;
  phone: string;
  relationship: string;
  childName: string;
  program: string;
  schedule: string;
  classTime: string;
  status: "active" | "inactive";
  role: string;
};

type Draft = Omit<ParentAccount, "id" | "initials">;

function emptyDraft(): Draft {
  return {
    avatarUrl: "",
    avatarColor: randomColor(),
    fullName: "",
    email: "",
    phone: "",
    relationship: "Mother",
    childName: "",
    program: "",
    schedule: "",
    classTime: "",
    status: "active",
    role: "Parent",
  };
}

function draftFromUser(u: ParentAccount): Draft {
  return {
    avatarUrl: u.avatarUrl || "",
    avatarColor: u.avatarColor || randomColor(),
    fullName: u.fullName || "",
    email: u.email || "",
    phone: u.phone || "",
    relationship: u.relationship || "Mother",
    childName: u.childName || "",
    program: u.program || "",
    schedule: u.schedule || "",
    classTime: u.classTime || "",
    status: u.status || "active",
    role: u.role || "Parent",
  };
}

// Normalizes records from the API (falls back to the old childrenNames field)
function normalizeAccount(a: any): ParentAccount {
  return {
    ...a,
    childName: a.childName ?? a.childrenNames ?? "",
    program: a.program ?? "",
    schedule: a.schedule ?? "",
    classTime: a.classTime ?? "",
  };
}

// ─── Field helper ─────────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#002f76]">
        {label}
        {required && <span className="text-[#e53935] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-[12px] font-extrabold uppercase tracking-widest text-[#005cc8]">{children}</span>
      <span className="h-px flex-1 bg-[#e2e8f0]" />
    </div>
  );
}

function Chevron() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

const INPUT_CLS =
  "w-full rounded-xl border border-[#d0d8e8] bg-[#f8faff] px-4 py-2.5 text-[13.5px] font-semibold text-[#002f76] placeholder:text-[#b0bec5] outline-none focus:border-[#0050d5] focus:ring-2 focus:ring-[#0050d5]/15 transition-all";

const SELECT_CLS =
  "w-full rounded-xl border border-[#d0d8e8] bg-[#f8faff] px-4 py-2.5 text-[13.5px] font-semibold text-[#002f76] outline-none focus:border-[#0050d5] focus:ring-2 focus:ring-[#0050d5]/15 transition-all cursor-pointer appearance-none disabled:cursor-not-allowed disabled:opacity-60";

// ─── Waiver Sign Modal ──────────────────────────────────────────────────────
function WaiverSignModal({
  draft,
  onConfirm,
  onCancel,
}: {
  draft: { fullName: string; childName: string; program: string };
  onConfirm: (signatureDataUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
  }, []);

  const getXY = (e: React.MouseEvent | React.TouchEvent, rect: DOMRect) => {
    if ("touches" in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    setIsDrawing(true); setHasSignature(true);
    const { x, y } = getXY(e, canvas.getBoundingClientRect());
    ctx.beginPath(); ctx.moveTo(x, y);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const { x, y } = getXY(e, canvas.getBoundingClientRect());
    ctx.lineTo(x, y); ctx.stroke();
  };
  const stopDrawing = () => setIsDrawing(false);
  const clearSignature = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };
  const handleConfirm = () => {
    if (!hasSignature) return;
    const canvas = canvasRef.current; if (!canvas) return;
    onConfirm(canvas.toDataURL("image/png"));
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,15,40,0.7)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "white", borderRadius: "24px", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,47,118,0.3)" }}>
        
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#002f76,#0050d5)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", fontWeight: "800", letterSpacing: "0.1em", textTransform: "uppercase" }}>Step Required</div>
            <div style={{ color: "white", fontSize: "18px", fontWeight: "800", marginTop: "2px" }}>Sign the Waiver</div>
          </div>
          <button onClick={onCancel} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", width: "32px", height: "32px", borderRadius: "50%", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Scrollable waiver content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px" }}>
          <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.6, marginBottom: "16px" }}>
            Before creating this account, the parent must acknowledge and agree to the following policies.
          </p>

          <div style={{ background: "#f8faff", borderRadius: "12px", padding: "16px", fontSize: "13px", color: "#334155", lineHeight: 1.7, border: "1px solid #e2e8f0", maxHeight: "260px", overflowY: "auto" }}>
            <p style={{ fontWeight: "800", color: "#002f76", marginBottom: "8px", fontSize: "14px" }}>MERRY EXPLORERS PLAYGROUP LEARNING CENTER<br />PARENT/GUARDIAN ACKNOWLEDGMENT & AGREEMENT</p>
            <p>By registering my child with Merry Explorers Playgroup Learning Center, I confirm that I have read, understood, and agree to all program terms and policies including: Adventure/Cycle structure, programs and fees, registration and payment terms (60% non-refundable reservation, 40% balance on 6th session, 4% weekly interest on overdue balances), attendance and make-up session rules, photo and video highlights schedule and deletion policy, and uniform policy.</p>
            <p style={{ marginTop: "12px" }}>I confirm that the information I provided about my child is true and complete, and I agree to comply with Merry Explorers' policies and arrangements.</p>
            <p style={{ marginTop: "12px" }}>By signing below, I voluntarily acknowledge, accept, and agree to be bound by these terms as part of my child's registration with Merry Explorers Playgroup Learning Center.</p>
          </div>

          <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
            <div>
              <div style={{ color: "#64748b", fontWeight: "700", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Child's Name</div>
              <div style={{ fontWeight: "800", color: "#002f76" }}>{draft.childName || "—"}</div>
            </div>
            <div>
              <div style={{ color: "#64748b", fontWeight: "700", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Program</div>
              <div style={{ fontWeight: "800", color: "#002f76" }}>{draft.program || "—"}</div>
            </div>
            <div>
              <div style={{ color: "#64748b", fontWeight: "700", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Parent/Guardian</div>
              <div style={{ fontWeight: "800", color: "#002f76" }}>{draft.fullName || "—"}</div>
            </div>
            <div>
              <div style={{ color: "#64748b", fontWeight: "700", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Date</div>
              <div style={{ fontWeight: "800", color: "#002f76" }}>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
            </div>
          </div>

          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: "800", color: "#1e293b" }}>Parent/Guardian Signature</label>
              <button onClick={clearSignature} style={{ fontSize: "12px", color: "#0050d5", fontWeight: "700", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
            </div>
            <div style={{ border: "2px dashed #94a3b8", borderRadius: "12px", overflow: "hidden", background: "#f8fafc" }}>
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
                onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                style={{ width: "100%", height: "160px", cursor: "crosshair", display: "block", touchAction: "none" }}
              />
            </div>
            {!hasSignature && <p style={{ fontSize: "12px", color: "#ef4444", fontWeight: "700", marginTop: "6px" }}>Please sign above to continue.</p>}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #e2e8f0", padding: "16px 24px", display: "flex", gap: "12px", justifyContent: "flex-end", flexShrink: 0, background: "#f8fafc" }}>
          <button onClick={onCancel} style={{ padding: "10px 20px", borderRadius: "99px", fontWeight: "800", fontSize: "13px", color: "#64748b", background: "rgba(148,163,184,0.1)", border: "none", cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!hasSignature}
            style={{ padding: "10px 24px", borderRadius: "99px", fontWeight: "800", fontSize: "13px", color: "white", background: hasSignature ? "linear-gradient(135deg,#10b981,#059669)" : "#94a3b8", border: "none", cursor: hasSignature ? "pointer" : "not-allowed", boxShadow: hasSignature ? "0 8px 20px rgba(16,185,129,0.3)" : "none", transition: "all 0.2s" }}
          >
            I Agree & Create Account
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────
function ParentModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  initial?: ParentAccount;
  onClose: () => void;
  onSave: (account: Omit<ParentAccount, "id">, id?: string) => Promise<string | undefined>;
}) {
  const [draft, setDraft] = useState<Draft>(initial ? draftFromUser(initial) : emptyDraft());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "saveAndSign" | null>(null);

  function set<K extends keyof Draft>(key: K, val: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: val }));
    setError("");
  }

  function handleProgramChange(value: string) {
    const program = findProgram(value);
    setDraft((d) => ({
      ...d,
      program: value,
      schedule: program?.days ?? "",
      // Auto-select when there's only one class time, otherwise make them choose
      classTime: program && program.times.length === 1 ? classTimeValue(program.times[0]) : "",
    }));
    setError("");
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setDraft((d) => ({ ...d, avatarUrl: ev.target!.result as string }));
        setError("");
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // Validates, saves, and returns the saved account id (or undefined on failure).
  async function submit(): Promise<string | undefined> {
    if (!draft.fullName.trim()) { setError("Parent's full name is required."); return undefined; }
    if (!draft.email.trim()) { setError("Email is required."); return undefined; }
    if (!draft.childName.trim()) { setError("Child's name is required."); return undefined; }
    if (!draft.program.trim()) { setError("Please select a Program / Adventure."); return undefined; }
    if (!draft.classTime.trim()) { setError("Please select a class time."); return undefined; }

    setLoading(true);
    setError("");

    try {
      let finalAvatarUrl = draft.avatarUrl;
      const accountId = initial?.id ?? crypto.randomUUID();

      if (selectedFile) {
        finalAvatarUrl = await uploadAvatar(selectedFile, accountId);
      }

      const program = findProgram(draft.program);

      const account: Omit<ParentAccount, "id"> = {
        avatarUrl: finalAvatarUrl,
        avatarColor: draft.avatarColor,
        initials: getInitials(draft.fullName),
        fullName: draft.fullName.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        relationship: draft.relationship,
        childName: draft.childName.trim(),
        program: draft.program.trim(),
        schedule: program?.days ?? draft.schedule,
        classTime: draft.classTime.trim(),
        status: draft.status,
        role: "Parent",
      };

      return await onSave(account, initial?.id);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "An error occurred while saving.");
      return undefined;
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (mode === "add") {
      // Validate first before showing waiver
      if (!draft.fullName.trim()) { setError("Parent's full name is required."); return; }
      if (!draft.email.trim()) { setError("Email is required."); return; }
      if (!draft.childName.trim()) { setError("Child's name is required."); return; }
      if (!draft.program.trim()) { setError("Please select a Program / Adventure."); return; }
      if (!draft.classTime.trim()) { setError("Please select a class time."); return; }
      setPendingAction("save");
      setShowWaiverModal(true);
      return;
    }
    const id = await submit();
    if (id) onClose();
  }

  async function handleSaveAndSign() {
    if (mode === "add") {
      if (!draft.fullName.trim()) { setError("Parent's full name is required."); return; }
      if (!draft.email.trim()) { setError("Email is required."); return; }
      if (!draft.childName.trim()) { setError("Child's name is required."); return; }
      if (!draft.program.trim()) { setError("Please select a Program / Adventure."); return; }
      if (!draft.classTime.trim()) { setError("Please select a class time."); return; }
      setPendingAction("saveAndSign");
      setShowWaiverModal(true);
      return;
    }
    const win = window.open("", "_blank");
    const id = await submit();
    if (id) {
      const url = `/admin/parents/waiver/${id}`;
      if (win) win.location.href = url;
      else window.open(url, "_blank");
      onClose();
    } else {
      win?.close();
    }
  }

  async function handleWaiverConfirm(signatureDataUrl: string) {
    setShowWaiverModal(false);
    // Inject the signature into the draft before saving
    const draftWithSig = { ...draft, waiverSigned: true, waiverSignedAt: new Date().toISOString(), waiverSignature: signatureDataUrl } as any;
    setLoading(true);
    setError("");
    try {
      const savedId = await onSave(draftWithSig as any, initial?.id);
      if (pendingAction === "saveAndSign" && savedId) {
        window.open(`/admin/parents/waiver/${savedId}`, "_blank");
      }
      if (savedId) onClose();
    } catch (err: any) {
      setError(err?.message || "An error occurred while saving.");
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  }

  const initials = draft.fullName ? getInitials(draft.fullName) : "?";

  // Keep any legacy/unknown values selectable so editing old accounts doesn't blank them
  const selectedProgram = findProgram(draft.program);
  const isKnownProgram = !!selectedProgram;
  const timeOptions = selectedProgram?.times.map(classTimeValue) ?? [];
  const isKnownTime = timeOptions.includes(draft.classTime);

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-[#002f76] to-[#0050d5] px-6 py-4 shrink-0">
          <h2 className="text-[17px] font-extrabold text-white">
            {mode === "add" ? "Add Parent Account" : "Edit Parent Account"}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-white font-extrabold text-[26px] cursor-pointer relative group"
              style={{ backgroundColor: draft.avatarUrl ? undefined : draft.avatarColor }}
              onClick={() => fileRef.current?.click()}
            >
              {draft.avatarUrl ? (
                <img src={draft.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-full border border-[#c5d6ff] bg-[#f0f5ff] px-4 py-1.5 text-[12px] font-bold text-[#0050d5] hover:bg-[#dde8ff] transition-colors"
              >
                Upload Photo
              </button>
              {draft.avatarUrl && (
                <button
                  type="button"
                  onClick={() => { set("avatarUrl", ""); setSelectedFile(null); }}
                  className="rounded-full border border-[#ffd5d5] bg-[#fff0f0] px-4 py-1.5 text-[12px] font-bold text-[#e53935] hover:bg-[#ffe0e0] transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Parent details */}
          <SectionHeading>Parent Details</SectionHeading>

          <Field label="Parent's Full Name" required>
            <input className={INPUT_CLS} placeholder="e.g. Maria Santos" value={draft.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </Field>
          <Field label="Email Address" required>
            <input type="email" className={INPUT_CLS} placeholder="maria@example.com" value={draft.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Phone Number">
            <input type="tel" className={INPUT_CLS} placeholder="09XX XXX XXXX" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Relationship to Child">
            <div className="relative">
              <select className={SELECT_CLS} value={draft.relationship} onChange={(e) => set("relationship", e.target.value)}>
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Guardian">Guardian</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Other">Other</option>
              </select>
              <Chevron />
            </div>
          </Field>

          {/* Child details */}
          <SectionHeading>Child Details</SectionHeading>

          <Field label="Child's Name" required>
            <input className={INPUT_CLS} placeholder="e.g. Leo Santos" value={draft.childName} onChange={(e) => set("childName", e.target.value)} />
          </Field>

          <Field label="Program / Adventure" required>
            <div className="relative">
              <select className={SELECT_CLS} value={draft.program} onChange={(e) => handleProgramChange(e.target.value)}>
                <option value="" disabled>Select a program</option>
                {!isKnownProgram && draft.program && (
                  <option value={draft.program}>{draft.program}</option>
                )}
                {PROGRAMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.value}</option>
                ))}
              </select>
              <Chevron />
            </div>
          </Field>

          {/* Pre-requisite notice (only for programs that have one) */}
          {selectedProgram?.prerequisite && (
            <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[12px] font-semibold text-[#b45309]">
              ⚠️ Pre-requisite: {selectedProgram.prerequisite}
            </div>
          )}

          <Field label="Class Time" required>
            <div className="relative">
              <select
                className={SELECT_CLS}
                value={draft.classTime}
                onChange={(e) => set("classTime", e.target.value)}
                disabled={!draft.program}
              >
                <option value="" disabled>
                  {draft.program ? "Select class time" : "Select a program first"}
                </option>
                {!isKnownTime && draft.classTime && (
                  <option value={draft.classTime}>{draft.classTime}</option>
                )}
                {selectedProgram?.times.map((t) => (
                  <option key={t.label} value={classTimeValue(t)}>
                    {classTimeValue(t)}
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
          </Field>

          {/* Account */}
          <SectionHeading>Account</SectionHeading>

          <Field label="Status">
            <div className="relative">
              <select className={SELECT_CLS} value={draft.status} onChange={(e) => set("status", e.target.value as "active" | "inactive")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <Chevron />
            </div>
          </Field>

          {error && (
            <div className="rounded-xl border border-[#ba1a1a]/20 bg-[#ba1a1a]/5 px-4 py-3 text-[13px] font-bold text-[#ba1a1a]">
              {error}
            </div>
          )}
        </div>

        <div className="bg-[#f8fafc] px-6 py-4 flex flex-col md:flex-row justify-between gap-3 shrink-0 border-t border-[#e2e8f0]">
          <div>
            {mode === "edit" && initial?.id ? (
              <button
                type="button"
                onClick={() => window.open(`/admin/parents/waiver/${initial.id}`, "_blank")}
                className="px-5 py-2.5 rounded-full font-bold text-[13px] text-[#0050d5] bg-[#eaf0fe] hover:bg-[#d4e0fc] transition-colors"
              >
                Sign Waiver
              </button>
            ) : mode === "add" ? (
              <button
                type="button"
                onClick={handleSaveAndSign}
                disabled={loading}
                className="px-5 py-2.5 rounded-full font-bold text-[13px] text-[#0050d5] bg-[#eaf0fe] hover:bg-[#d4e0fc] transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0050d5]/30 border-t-[#0050d5]" /> : "Save & Sign Waiver"}
              </button>
            ) : null}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2.5 rounded-full font-bold text-[13px] text-[#5a6e8c] hover:bg-[#e2e8f0]/50 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={loading} className="px-5 py-2.5 rounded-full font-bold text-[13px] bg-[#005cc8] text-white hover:bg-[#004bb0] transition-colors flex items-center gap-2 disabled:opacity-60">
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>

    {showWaiverModal && (
      <WaiverSignModal
        draft={{ fullName: draft.fullName, childName: draft.childName, program: draft.program }}
        onConfirm={handleWaiverConfirm}
        onCancel={() => { setShowWaiverModal(false); setPendingAction(null); }}
      />
    )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminParentsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ParentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [emailWarning, setEmailWarning] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingAccount, setEditingAccount] = useState<ParentAccount | undefined>();

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      setLoading(true);
      const data = await cachedFetch<any[]>("accounts:parents", "/api/accounts", 60_000);
      if (Array.isArray(data)) {
        const parents = data.filter((a: any) => a.role === "Parent" || a.role === "parent").map(normalizeAccount);
        setData(parents);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAccount(accountData: Omit<ParentAccount, "id">, id?: string): Promise<string | undefined> {
    let savedId = id;
    if (id) {
      // Existing account — standard update via /api/accounts/[id]
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...accountData, childrenNames: accountData.childName, id }),
      });
      if (!res.ok) throw new Error("Failed to update parent account.");
    } else {
      // New account — use /api/parents which creates Firebase auth + sends email
      const res = await fetch("/api/parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...accountData, childrenNames: accountData.childName }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create parent account.");
      }

      const result = await res.json();
      savedId = result.id;
      if (result.warning) {
        // Email failed but account was created — we'll handle this gracefully
        console.warn("[Parent Account] Email warning:", result.warning);
        setEmailWarning(result.warning);
      } else {
        setEmailWarning(null);
      }
    }

    invalidateCache("/api/accounts");
    await loadAccounts();
    return savedId;
  }

  const activeCount = data.filter((d) => d.status === "active").length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.fullName?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.childName?.toLowerCase().includes(q) ||
        p.program?.toLowerCase().includes(q) ||
        p.schedule?.toLowerCase().includes(q) ||
        p.classTime?.toLowerCase().includes(q)
      );
    });
  }, [data, search, statusFilter]);

  return (
    <AppShell title="Parent Accounts" description="Manage parent and guardian profiles">
      <div className="flex w-full min-h-full flex-col px-4 py-6 sm:px-6 lg:px-10 lg:py-8">

        {/* Metrics */}
        <div className="mb-6 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <UserMetricCard label="Total Parents" value={data.length.toString()} meta="Registered accounts" type="total" />
          <UserMetricCard label="Active Parents" value={activeCount.toString()} meta="+2 this month" type="active" />
        </div>

        {/* Email warning banner */}
        {emailWarning && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3.5 text-[13px] font-semibold text-[#b45309]">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <span className="flex-1">{emailWarning}</span>
            <button onClick={() => setEmailWarning(null)} className="shrink-0 text-[#b45309]/60 hover:text-[#b45309]">✕</button>
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-4 flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:max-w-2xl">
            <div className="relative flex-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by parent, email, phone, child, program or schedule..."
                className="w-full rounded-full border border-[#e2e8f0] bg-white py-2.5 pl-11 pr-4 text-[13.5px] font-semibold text-[#002f76] placeholder:text-[#b0bec5] outline-none transition-all focus:border-[#0050d5] focus:ring-2 focus:ring-[#0050d5]/15"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="rounded-full border border-[#e2e8f0] bg-white px-4 py-2.5 text-[13.5px] font-bold text-[#002f76] outline-none transition-all focus:border-[#0050d5] focus:ring-2 focus:ring-[#0050d5]/15 cursor-pointer sm:w-44"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <button
            onClick={() => { setEditingAccount(undefined); setModalMode("add"); }}
            className="flex items-center justify-center gap-2 rounded-full bg-[#005cc8] px-5 py-2.5 text-[14px] font-bold text-white shadow-sm hover:bg-[#004bb0] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Parent
          </button>
        </div>

        {/* Table/List Section */}
        <div className="flex w-full flex-1 flex-col rounded-[1.5rem] border border-[#e4e2e1]/50 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
          <div className="flex-1 overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead>
                <tr className="border-b border-[#f1f5f9]">
                  <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[22%]">Parent</th>
                  <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[10%]">Relationship</th>
                  <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[12%]">Phone</th>
                  <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[14%]">Child</th>
                  <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[17%]">Program / Adventure</th>
                  <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[15%]">Schedule</th>
                  <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[10%]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[13px] font-bold text-[#94a3b8]">Loading...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[13px] font-bold text-[#94a3b8]">
                      {data.length === 0 ? "No parent accounts found." : "No parents match your search."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((parent) => {
                    const days = parent.schedule || findProgram(parent.program)?.days || "";
                    return (
                      <tr
                        key={parent.id}
                        onClick={() => { setEditingAccount(parent); setModalMode("edit"); }}
                        className="group hover:bg-[#f8fafc] transition-colors cursor-pointer"
                      >
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-12 h-12 rounded-full flex shrink-0 items-center justify-center text-white text-[14px] font-bold shadow-sm overflow-hidden ring-2 ring-white"
                              style={{ backgroundColor: parent.avatarUrl ? undefined : parent.avatarColor }}
                            >
                              {parent.avatarUrl ? (
                                <img src={parent.avatarUrl} alt={parent.fullName} className="w-full h-full object-cover" />
                              ) : (
                                parent.initials
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-bold text-[14px] text-[#002f76]">{parent.fullName}</div>
                              <div className="truncate text-[12px] font-semibold text-[#5a6e8c]">{parent.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-[13.5px] font-semibold text-[#005cc8]">{parent.relationship}</td>
                        <td className="py-4 pr-4 text-[13.5px] font-semibold text-[#5a6e8c]">{parent.phone || "—"}</td>
                        <td className="py-4 pr-4 text-[13.5px] font-bold text-[#002f76]">{parent.childName || "—"}</td>
                        <td className="py-4 pr-4">
                          {parent.program ? (
                            <span className="inline-flex items-center rounded-full border border-[#c5d6ff] bg-[#f0f5ff] px-3 py-1.5 text-[12px] font-bold text-[#0050d5]">
                              {parent.program}
                            </span>
                          ) : (
                            <span className="text-[13.5px] font-semibold text-[#94a3b8]">—</span>
                          )}
                        </td>
                        <td className="py-4 pr-4">
                          {days || parent.classTime ? (
                            <div>
                              <div className="text-[13px] font-bold text-[#002f76]">{days || "—"}</div>
                              <div className="text-[12px] font-semibold text-[#5a6e8c]">{parent.classTime || "—"}</div>
                            </div>
                          ) : (
                            <span className="text-[13.5px] font-semibold text-[#94a3b8]">—</span>
                          )}
                        </td>
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold ${parent.status === "active" ? "bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]" : "bg-[#f1f5f9] text-[#64748b] border border-[#cbd5e1]"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${parent.status === "active" ? "bg-[#15803d]" : "bg-[#64748b]"}`} />
                            {parent.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          {!loading && data.length > 0 && (
            <div className="mt-4 border-t border-[#f1f5f9] pt-4 text-[12px] font-bold text-[#94a3b8]">
              Showing {filtered.length} of {data.length} parent{data.length === 1 ? "" : "s"}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modalMode && (
        <ParentModal
          mode={modalMode}
          initial={editingAccount}
          onClose={() => setModalMode(null)}
          onSave={handleSaveAccount}
        />
      )}
    </AppShell>
  );
}