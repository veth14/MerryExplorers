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
  label?: string;
  ages: string;
  days: string;
  sessions: number;
  prerequisite?: string;
  times: ClassTime[];
};

const PROGRAMS: Program[] = [
  {
    value: "Trailblazer: Brave Explorer",
    label: "Trailblazer: Brave Explorer",
    ages: "3 – 4.11",
    days: "Monday – Friday",
    sessions: 18,
    times: [{ label: "Afternoon Class", range: "3:00 PM – 4:15 PM" }],
  },
  {
    value: "Virtual Tutorial",
    label: "Virtual Tutorial",
    ages: "All Ages",
    days: "Flexible",
    sessions: 1,
    times: [{ label: "Flexible Class", range: "TBD" }],
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

// ─── Promo Codes ──────────────────────────────────────────────────────────────
const PROMO_CODES: Record<string, { discountAmount: number; originalPrice: number; finalPrice: number; description: string }> = {
  "WELCOME2026": { originalPrice: 675, discountAmount: 225, finalPrice: 450, description: "Welcome Discount" },
  "EARLYBIRD": { originalPrice: 675, discountAmount: 225, finalPrice: 450, description: "Early Bird Promo" },
  "MERRY2026": { originalPrice: 675, discountAmount: 225, finalPrice: 450, description: "Merry Explorers Promo" },
};

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
  virtualSessionLink?: string;
  renewalLink?: string;
  promoCode?: string;
  promoDiscount?: {
    originalPrice: number;
    discountAmount: number;
    finalPrice: number;
    description: string;
  };
  renewalStatus?: {
    hasSubmitted: boolean;
    returning: string;
    notes?: string;
    reason?: string;
    slotSecured?: boolean;
    downpayment?: {
      submitted: boolean;
      paymentMethod: string;
      receiptBase64: string;
      referenceNumber: string;
      amountPaid: number;
      submittedAt: string;
      verified: boolean;
      rejected: boolean;
      reviewedAt?: string;
      adminNote?: string;
    };
  };
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
    virtualSessionLink: "",
    renewalLink: "",
    promoCode: "",
    promoDiscount: undefined,
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
    virtualSessionLink: u.virtualSessionLink || "",
    renewalLink: u.renewalLink || "",
    promoCode: u.promoCode || "",
    promoDiscount: u.promoDiscount,
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
    virtualSessionLink: a.virtualSessionLink ?? "",
    renewalLink: a.renewalLink ?? "",
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

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [regLoading, setRegLoading] = useState(false);
  const [entryMode, setEntryMode] = useState<"fetch" | "manual">(mode === "add" ? "fetch" : "manual");
  const [regEmail, setRegEmail] = useState(""); // registration email for reference

  useEffect(() => {
    if (mode === "edit") return;
    setRegLoading(true);
    fetch("/api/registrations")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRegistrations(data.data.filter((r: any) => r.status === "approved" || r.status === "early-bird"));
        }
      })
      .catch(() => { })
      .finally(() => setRegLoading(false));
  }, [mode]);

  function handleSelectRegistration(e: React.ChangeEvent<HTMLSelectElement>) {
    const regId = e.target.value;
    if (!regId) return;
    const reg = registrations.find(r => r.id === regId);
    if (!reg) return;

    const PROGRAM_MAP: Record<string, string> = {
      "curious-explorer": "Discovery Club: Curious Explorer",
      "creative-explorer": "Discovery Club: Creative Explorer",
      "everyday-curious": "Discovery Club: Everyday Curious",
      "brave-explorer": "Trailblazer: Brave Explorer",
      "ballet": "Ballet",
      "virtual-session": "Virtual Session",
      "saturday-playdate": "Saturday Playdate"
    };

    const programValue = PROGRAM_MAP[reg.program] || reg.program;

    setDraft(d => {
      const p = findProgram(programValue);
      let newSchedule = d.schedule;
      let newClassTime = reg.classTime || "";

      if (p) {
        newSchedule = p.days;
        const matchedTime = p.times.find(t => t.label === reg.classTime || classTimeValue(t) === reg.classTime);
        newClassTime = matchedTime ? classTimeValue(matchedTime) : reg.classTime;
      }

      return {
        ...d,
        fullName: reg.parentInfo.name,
        // Don't auto-fill email — admin must enter the portal login email separately
        phone: reg.parentInfo.phone,
        relationship: reg.parentInfo.relationship,
        childName: `${reg.childInfo.firstName} ${reg.childInfo.lastName}`.trim(),
        program: programValue,
        schedule: newSchedule,
        classTime: newClassTime,
      };
    });
    setRegEmail(reg.parentInfo.email); // store for hint only
    setError("");
  }

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
      const promoResult = draft.promoCode ? PROMO_CODES[draft.promoCode.toUpperCase().trim()] : undefined;

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
        virtualSessionLink: draft.virtualSessionLink?.trim() || "",
        renewalLink: draft.renewalLink?.trim() || "",
        promoCode: draft.promoCode?.trim().toUpperCase() || undefined,
        promoDiscount: promoResult,
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
    const id = await submit();
    if (id) onClose();
  }

  const initials = draft.fullName ? getInitials(draft.fullName) : "?";

  // Keep any legacy/unknown values selectable so editing old accounts doesn't blank them
  const selectedProgram = findProgram(draft.program);
  const isKnownProgram = !!selectedProgram;
  const timeOptions = selectedProgram?.times.map(classTimeValue) ?? [];
  const isKnownTime = timeOptions.includes(draft.classTime);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full sm:max-w-lg rounded-t-[2rem] sm:rounded-[2rem] bg-[#f4f7fb] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]">

          {/* Header */}
          <div className="bg-gradient-to-br from-[#001f5c] to-[#0050d5] px-6 py-5 shrink-0 relative overflow-hidden">
            <div className="absolute top-[-40px] right-[-40px] w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute bottom-[-30px] right-[60px] w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-white/60 text-[11px] font-bold uppercase tracking-widest mb-0.5">Admin</p>
                <h2 className="text-[18px] font-extrabold text-white">
                  {mode === "add" ? "Add Parent Account" : "Edit Parent Account"}
                </h2>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-all">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

            {/* Avatar */}
            <div className="flex items-center gap-4 bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#e8efff]">
              <div
                className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center text-white font-extrabold text-[22px] cursor-pointer shadow-md flex-shrink-0"
                style={{ backgroundColor: draft.avatarUrl ? undefined : draft.avatarColor }}
                onClick={() => fileRef.current?.click()}
              >
                {draft.avatarUrl ? (
                  <img src={draft.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : initials}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[#002f76]">
                  {draft.fullName || "New Account"}
                </p>
                <p className="text-[12px] text-[#94a3b8] mb-2">{draft.email || "No email yet"}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="rounded-full border border-[#c5d6ff] bg-[#f0f5ff] px-3 py-1 text-[11px] font-bold text-[#0050d5] hover:bg-[#dde8ff] transition-colors">
                    Upload Photo
                  </button>
                  {draft.avatarUrl && (
                    <button type="button" onClick={() => { set("avatarUrl", ""); setSelectedFile(null); }}
                      className="rounded-full border border-[#ffd5d5] bg-[#fff0f0] px-3 py-1 text-[11px] font-bold text-[#e53935] hover:bg-[#ffe0e0] transition-colors">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Fetch from Registration */}
            {mode === "add" && (
              <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#e8efff]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-[#eef2ff] flex items-center justify-center text-[14px]">🔍</div>
                  <p className="text-[13px] font-extrabold text-[#002f76]">Import from Registration</p>
                </div>
                <div className="relative">
                  <select className={SELECT_CLS} onChange={handleSelectRegistration} disabled={regLoading}>
                    <option value="">{regLoading ? "Loading paid registrations…" : "Select a paid student to auto-fill ↓"}</option>
                    {registrations.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.childInfo.firstName} {r.childInfo.lastName} — {r.parentInfo.name}
                      </option>
                    ))}
                  </select>
                  <Chevron />
                </div>
                {registrations.length === 0 && !regLoading && (
                  <p className="mt-2 text-[11px] text-[#94a3b8]">No approved registrations found. Fill in details manually below.</p>
                )}
              </div>
            )}

            {/* Parent Details Card */}
            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#e8efff] space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-[#eef2ff] flex items-center justify-center text-[14px]">👤</div>
                <p className="text-[13px] font-extrabold text-[#002f76]">Parent Details</p>
              </div>
              <Field label="Full Name" required>
                <input className={INPUT_CLS} placeholder="e.g. Maria Santos" value={draft.fullName} onChange={(e) => set("fullName", e.target.value)} />
              </Field>
              <Field label="Portal Login Email" required>
                <input type="email" className={INPUT_CLS} placeholder="Portal login email (can differ from registration)" value={draft.email} onChange={(e) => set("email", e.target.value)} />
                {regEmail && (
                  <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-[#fffbeb] border border-[#fde68a] px-3 py-2">
                    <span className="text-[11px]">📋</span>
                    <span className="text-[11px] text-[#92400e] font-semibold">Registration email was: <span className="font-extrabold">{regEmail}</span> — enter their portal login email above.</span>
                  </div>
                )}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone">
                  <input type="tel" className={INPUT_CLS} placeholder="09XX XXX XXXX" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
                </Field>
                <Field label="Relationship">
                  <div className="relative">
                    <select className={SELECT_CLS} value={draft.relationship} onChange={(e) => set("relationship", e.target.value)}>
                      <option>Mother</option>
                      <option>Father</option>
                      <option>Guardian</option>
                      <option>Grandparent</option>
                      <option>Other</option>
                    </select>
                    <Chevron />
                  </div>
                </Field>
              </div>
            </div>

            {/* Child & Program Card */}
            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#e8efff] space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-[#eef2ff] flex items-center justify-center text-[14px]">🧒</div>
                <p className="text-[13px] font-extrabold text-[#002f76]">Child & Program</p>
              </div>
              <Field label="Child's Name" required>
                <input className={INPUT_CLS} placeholder="e.g. Leo Santos" value={draft.childName} onChange={(e) => set("childName", e.target.value)} />
              </Field>
              <Field label="Program" required>
                <div className="relative">
                  <select className={SELECT_CLS} value={draft.program} onChange={(e) => handleProgramChange(e.target.value)}>
                    <option value="" disabled>Select a program</option>
                    {!isKnownProgram && draft.program && (
                      <option value={draft.program}>{draft.program}</option>
                    )}
                    {PROGRAMS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label || p.value}</option>
                    ))}
                  </select>
                  <Chevron />
                </div>
              </Field>
              {selectedProgram?.prerequisite && (
                <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 text-[12px] font-semibold text-[#b45309]">
                  ⚠️ {selectedProgram.prerequisite}
                </div>
              )}
              <Field label="Class Time" required>
                <div className="relative">
                  <select className={SELECT_CLS} value={draft.classTime} onChange={(e) => set("classTime", e.target.value)} disabled={!draft.program}>
                    <option value="" disabled>{draft.program ? "Select class time" : "Select a program first"}</option>
                    {!isKnownTime && draft.classTime && (
                      <option value={draft.classTime}>{draft.classTime}</option>
                    )}
                    {selectedProgram?.times.map((t) => (
                      <option key={t.label} value={classTimeValue(t)}>{classTimeValue(t)}</option>
                    ))}
                  </select>
                  <Chevron />
                </div>
              </Field>
            </div>

            {/* Account Status Card */}
            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#e8efff]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#eef2ff] flex items-center justify-center text-[14px]">⚙️</div>
                <p className="text-[13px] font-extrabold text-[#002f76]">Account Settings</p>
              </div>
              <Field label="Status">
                <div className="relative">
                  <select className={SELECT_CLS} value={draft.status} onChange={(e) => set("status", e.target.value as "active" | "inactive")}>
                    <option value="active">✅ Active</option>
                    <option value="inactive">⏸ Inactive</option>
                  </select>
                  <Chevron />
                </div>
              </Field>
            </div>

            {/* Promo Code Card */}
            {(() => {
              const promoKey = (draft.promoCode || "").toUpperCase().trim();
              const promoMatch = promoKey ? PROMO_CODES[promoKey] : undefined;
              const isInvalid = !!promoKey && !promoMatch;
              return (
                <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#e8efff] space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-[#f0fdf4] flex items-center justify-center text-[14px]">🏷️</div>
                    <p className="text-[13px] font-extrabold text-[#002f76]">Promo Code <span className="text-[11px] font-semibold text-[#94a3b8] normal-case">(optional)</span></p>
                  </div>
                  <Field label="Enter Promo Code">
                    <div className="relative">
                      <input
                        className={`${INPUT_CLS} ${promoMatch ? "border-[#16a34a] ring-2 ring-[#16a34a]/15 pr-10" : isInvalid ? "border-[#dc2626] ring-2 ring-[#dc2626]/15 pr-10" : ""}`}
                        placeholder="e.g. WELCOME2025"
                        value={draft.promoCode || ""}
                        onChange={(e) => set("promoCode", e.target.value)}
                        style={{ textTransform: "uppercase" }}
                      />
                      {promoMatch && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#16a34a] text-[16px]">✓</span>
                      )}
                      {isInvalid && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dc2626] text-[16px]">✗</span>
                      )}
                    </div>
                  </Field>

                  {isInvalid && (
                    <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-[12px] font-semibold text-[#b91c1c]">
                      ❌ Invalid promo code. Please check and try again.
                    </div>
                  )}

                  {promoMatch && (
                    <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#15803d]">✅ {promoMatch.description} Applied!</span>
                        <span className="text-[11px] font-bold text-[#16a34a] bg-[#dcfce7] rounded-full px-2.5 py-0.5">{promoKey}</span>
                      </div>
                      <div className="border-t border-[#bbf7d0] pt-2 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] text-[#4b5563]">Original Price</span>
                          <span className="text-[13px] font-bold text-[#6b7280] line-through">₱{promoMatch.originalPrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] text-[#dc2626]">Discount</span>
                          <span className="text-[13px] font-bold text-[#dc2626]">− ₱{promoMatch.discountAmount.toLocaleString()} ({Math.round(promoMatch.discountAmount / promoMatch.originalPrice * 100)}% off)</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-[#bbf7d0] pt-1.5">
                          <span className="text-[12px] font-extrabold text-[#15803d]">Final Price</span>
                          <span className="text-[18px] font-extrabold text-[#15803d]">₱{promoMatch.finalPrice.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!promoKey && (
                    <div className="rounded-xl border border-[#e2e8f0] bg-[#f8faff] px-3 py-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] text-[#64748b]">Standard Rate</span>
                        <span className="text-[14px] font-extrabold text-[#002f76]">₱675</span>
                      </div>
                      <p className="text-[11px] text-[#94a3b8] mt-1">Enter a promo code above to apply a discount.</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {error && (
              <div className="rounded-2xl border border-[#ba1a1a]/20 bg-[#ba1a1a]/5 px-4 py-3 text-[13px] font-bold text-[#ba1a1a] flex items-center gap-2">
                ⚠️ {error}
              </div>
            )}


            {initial?.renewalStatus?.hasSubmitted && (
              <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#e8efff] space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-[#eef2ff] flex items-center justify-center text-[14px]">🔄</div>
                  <p className="text-[13px] font-extrabold text-[#002f76]">Renewal Submission</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-extrabold text-[#64748b] uppercase tracking-wider">Returning:</span>
                  {initial.renewalStatus.returning === "yes" && <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2.5 py-1 text-[11px] font-bold text-[#15803d]">✅ Yes</span>}
                  {initial.renewalStatus.returning === "no" && <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fecaca] bg-[#fef2f2] px-2.5 py-1 text-[11px] font-bold text-[#b91c1c]">❌ No</span>}
                  {initial.renewalStatus.returning === "maybe" && <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fef08a] bg-[#fefce8] px-2.5 py-1 text-[11px] font-bold text-[#a16207]">🤔 Undecided</span>}
                </div>
                {initial.renewalStatus.notes && (
                  <p className="text-[13px] font-medium text-[#334155] bg-[#f8faff] p-3 rounded-xl border border-[#e2e8f0] m-0 whitespace-pre-wrap">{initial.renewalStatus.notes}</p>
                )}
                {initial.renewalStatus.reason && (
                  <p className="text-[13px] font-medium text-[#334155] bg-[#fff0f0] p-3 rounded-xl border border-[#fecaca] m-0 whitespace-pre-wrap">{initial.renewalStatus.reason}</p>
                )}
              </div>
            )}

            <div className="h-1" />
          </div>

          {/* Footer */}
          <div className="bg-white px-5 py-4 flex gap-3 shrink-0 border-t border-[#e8efff]">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 py-3 rounded-2xl font-bold text-[13px] text-[#5a6e8c] border border-[#e2e8f0] hover:bg-[#f1f5f9] transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={loading}
              className="flex-[2] py-3 rounded-2xl font-bold text-[13px] bg-gradient-to-r from-[#002f76] to-[#0050d5] text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0050d5]/25 disabled:opacity-60">
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : "💾 Save Account"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


// ─── Downpayment Verification Panel ──────────────────────────────────────────
function DownpaymentPanel({ data, onRefresh, renewalSettings }: { data: ParentAccount[]; onRefresh: () => void; renewalSettings?: ProgramEntry[] }) {
  const pending = data.filter(
    (p) =>
      p.renewalStatus?.downpayment?.submitted &&
      !p.renewalStatus.downpayment.verified &&
      !p.renewalStatus.downpayment.rejected
  );
  const verified = data.filter((p) => p.renewalStatus?.downpayment?.verified);
  const rejected = data.filter((p) => p.renewalStatus?.downpayment?.rejected);

  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState(false);

  const totalWithPayment = pending.length + verified.length + rejected.length;
  if (totalWithPayment === 0) return null;

  async function handleAction(uid: string, action: "verify" | "reject") {
    setActing(uid + action);
    try {
      const res = await fetch("/api/parents/downpayment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, action, adminNote: adminNote[uid] || "" }),
      });
      if (!res.ok) throw new Error("Failed");
      invalidateCache("accounts:parents");
      onRefresh();
    } catch {
      alert("Failed to update payment. Please try again.");
    } finally {
      setActing(null);
    }
  }

  const statusColor = pending.length > 0 ? { bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b", text: "#92400e" } : { bg: "#f0fdf4", border: "#bbf7d0", dot: "#10b981", text: "#065f46" };

  return (
    <div style={{ marginBottom: "24px", borderRadius: "18px", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,47,118,0.08)", border: "1.5px solid #e2e8f0", background: "white" }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", background: "linear-gradient(135deg,#002f76 0%,#0050d5 100%)", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>💳</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "15px", color: "white" }}>Renewal Downpayments</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", marginTop: "1px" }}>
              {pending.length > 0 ? `${pending.length} pending verification` : "All payments reviewed"} · {verified.length} verified · {rejected.length} rejected
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {pending.length > 0 && (
            <span style={{ background: "#fbbf24", color: "#78350f", fontWeight: 800, fontSize: "12px", padding: "3px 10px", borderRadius: "20px" }}>
              {pending.length} Pending
            </span>
          )}
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "18px" }}>{collapsed ? "▼" : "▲"}</span>
        </div>
      </button>

      {!collapsed && (
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "10px" }}>⏳ Awaiting Verification</div>
              <div style={{ display: "grid", gap: "12px" }}>
                {pending.map((parent) => {
                  const dp = parent.renewalStatus!.downpayment!;
                  const prog = renewalSettings?.find((p) => p.programKey === parent.program);
                  const renewingForAdv = (prog?.currentAdventure || 1) + 1;
                  return (
                    <div key={parent.id} style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: "14px", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      {/* Parent info */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "14px", color: "#002f76" }}>{parent.fullName}</div>
                          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                            {parent.childName} · {parent.program} <span style={{ color: "#b45309", fontWeight: 700 }}>· Renewing for Adventure {renewingForAdv}</span>
                          </div>
                          <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, background: "#f0f5ff", color: "#0050d5", padding: "2px 10px", borderRadius: "20px", border: "1px solid #c5d6ff" }}>
                              {dp.paymentMethod}
                            </span>
                            {dp.referenceNumber && (
                              <span style={{ fontSize: "12px", fontWeight: 700, background: "#f8faff", color: "#5a6e8c", padding: "2px 10px", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
                                Ref: {dp.referenceNumber}
                              </span>
                            )}
                            {dp.amountPaid > 0 && (
                              <span style={{ fontSize: "12px", fontWeight: 700, background: "#f0fdf4", color: "#15803d", padding: "2px 10px", borderRadius: "20px", border: "1px solid #bbf7d0" }}>
                                ₱{dp.amountPaid.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                            Submitted {new Date(dp.submittedAt).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        {/* Receipt thumbnail */}
                        {dp.receiptBase64 && (
                          <button
                            type="button"
                            onClick={() => setPreviewImg(dp.receiptBase64)}
                            style={{ width: "72px", height: "72px", borderRadius: "10px", overflow: "hidden", border: "2px solid #fbbf24", cursor: "pointer", flexShrink: 0, background: "#fef9c3", padding: 0 }}
                          >
                            <img src={dp.receiptBase64} alt="Receipt" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </button>
                        )}
                      </div>
                      {/* Admin note */}
                      <input
                        type="text"
                        placeholder="Add a note (optional)..."
                        value={adminNote[parent.id] || ""}
                        onChange={(e) => setAdminNote((n) => ({ ...n, [parent.id]: e.target.value }))}
                        style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #fde68a", borderRadius: "10px", padding: "8px 12px", fontSize: "13px", color: "#334155", background: "white", outline: "none" }}
                      />
                      {/* Actions */}
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          disabled={acting === parent.id + "verify"}
                          onClick={() => handleAction(parent.id, "verify")}
                          style={{ flex: 1, padding: "9px 0", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#059669,#10b981)", color: "white", fontWeight: 800, fontSize: "13px", cursor: "pointer", opacity: acting === parent.id + "verify" ? 0.6 : 1 }}
                        >
                          {acting === parent.id + "verify" ? "Verifying…" : "✅ Verify Payment"}
                        </button>
                        <button
                          type="button"
                          disabled={acting === parent.id + "reject"}
                          onClick={() => handleAction(parent.id, "reject")}
                          style={{ flex: 1, padding: "9px 0", borderRadius: "10px", border: "1.5px solid #fca5a5", background: "#fff0f0", color: "#b91c1c", fontWeight: 800, fontSize: "13px", cursor: "pointer", opacity: acting === parent.id + "reject" ? 0.6 : 1 }}
                        >
                          {acting === parent.id + "reject" ? "Rejecting…" : "❌ Reject"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Verified */}
          {verified.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#065f46", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "10px" }}>✅ Verified Payments</div>
              <div style={{ display: "grid", gap: "8px" }}>
                {verified.map((parent) => {
                  const dp = parent.renewalStatus!.downpayment!;
                  const prog = renewalSettings?.find((p) => p.programKey === parent.program);
                  const renewingForAdv = (prog?.currentAdventure || 1) + 1;
                  return (
                    <div key={parent.id} style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "13px", color: "#002f76" }}>
                          {parent.fullName} <span style={{ color: "#64748b", fontWeight: 500 }}>— {parent.childName}</span>
                          <span style={{ marginLeft: "6px", fontSize: "11px", color: "#065f46", background: "#dcfce7", padding: "2px 6px", borderRadius: "8px", fontWeight: 800 }}>Adv {renewingForAdv}</span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#15803d", marginTop: "2px" }}>
                          {dp.paymentMethod}{dp.amountPaid ? ` · ₱${dp.amountPaid.toLocaleString()}` : ""}{dp.adminNote ? ` · "${dp.adminNote}"` : ""}
                        </div>
                      </div>
                      <span style={{ fontSize: "11px", color: "#15803d", fontWeight: 700, background: "#dcfce7", padding: "3px 10px", borderRadius: "20px", border: "1px solid #86efac", flexShrink: 0 }}>🔒 Slot Secured</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rejected */}
          {rejected.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#b91c1c", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "10px" }}>❌ Rejected Payments</div>
              <div style={{ display: "grid", gap: "8px" }}>
                {rejected.map((parent) => {
                  const dp = parent.renewalStatus!.downpayment!;
                  const prog = renewalSettings?.find((p) => p.programKey === parent.program);
                  const renewingForAdv = (prog?.currentAdventure || 1) + 1;
                  return (
                    <div key={parent.id} style={{ background: "#fff0f0", border: "1.5px solid #fca5a5", borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "13px", color: "#002f76" }}>
                          {parent.fullName} <span style={{ color: "#64748b", fontWeight: 500 }}>— {parent.childName}</span>
                          <span style={{ marginLeft: "6px", fontSize: "11px", color: "#991b1b", background: "#fee2e2", padding: "2px 6px", borderRadius: "8px", fontWeight: 800 }}>Adv {renewingForAdv}</span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#b91c1c", marginTop: "2px" }}>
                          {dp.paymentMethod}{dp.adminNote ? ` · Reason: "${dp.adminNote}"` : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAction(parent.id, "verify")}
                        style={{ fontSize: "12px", fontWeight: 700, color: "#059669", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "4px 12px", borderRadius: "20px", cursor: "pointer" }}
                      >
                        Re-verify
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Receipt lightbox */}
      {previewImg && (
        <div
          onClick={() => setPreviewImg(null)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <img src={previewImg} alt="Receipt" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: "14px", objectFit: "contain" }} />
            <button onClick={() => setPreviewImg(null)} style={{ position: "absolute", top: "-16px", right: "-16px", width: "36px", height: "36px", borderRadius: "50%", background: "white", border: "none", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Renewal Settings Panel (Admin) ──────────────────────────────────────────
// Program colours for visual distinction
const PROGRAM_META: Record<string, { emoji: string; color: string; bg: string; border: string; short: string }> = {
  "Discovery Club: Curious Explorer": { emoji: "🔍", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", short: "Curious Explorer" },
  "Discovery Club: Creative Explorer": { emoji: "🎨", color: "#0e7490", bg: "#ecfeff", border: "#a5f3fc", short: "Creative Explorer" },
  "Discovery Club: Everyday Curious": { emoji: "🌱", color: "#065f46", bg: "#ecfdf5", border: "#a7f3d0", short: "Everyday Curious" },
  "Trailblazer: Brave Explorer": { emoji: "🏕️", color: "#b45309", bg: "#fffbeb", border: "#fde68a", short: "Brave Explorer" },
};

type ProgramEntry = {
  programKey: string;
  currentAdventure: number;
  nextAdventureStart: string | null;
  renewalOpen: boolean;
  renewalOpenDate: string | null;
  virtualLink?: string;
  virtualLinkOpen?: boolean;
};

type RenewalCfg = {
  programs: ProgramEntry[];
  updatedAt: string | null;
};

const RENEWAL_PROGRAMS = [
  "Discovery Club: Curious Explorer",
  "Discovery Club: Creative Explorer",
  "Discovery Club: Everyday Curious",
  "Trailblazer: Brave Explorer",
];

function defaultPrograms(): ProgramEntry[] {
  return RENEWAL_PROGRAMS.map((p) => ({
    programKey: p,
    currentAdventure: 1,
    nextAdventureStart: null,
    renewalOpen: false,
    renewalOpenDate: null,
    virtualLink: "",
    virtualLinkOpen: false,
  }));
}

function RenewalSettingsPanel() {
  const [cfg, setCfg] = useState<RenewalCfg>({ programs: defaultPrograms(), updatedAt: null });
  const [collapsed, setCollapsed] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingCfg, setLoadingCfg] = useState(true);

  useEffect(() => {
    fetch("/api/renewal-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.programs) {
          // Merge: ensure all programs are present
          const merged = RENEWAL_PROGRAMS.map((key) => {
            const existing = d.programs.find((p: ProgramEntry) => p.programKey === key);
            return existing ?? { programKey: key, currentAdventure: 1, nextAdventureStart: null, renewalOpen: false, renewalOpenDate: null, virtualLink: "", virtualLinkOpen: false };
          });
          setCfg({ programs: merged, updatedAt: d.updatedAt ?? null });
        }
      })
      .catch(() => { })
      .finally(() => setLoadingCfg(false));
  }, []);

  function updateProgram(key: string, patch: Partial<ProgramEntry>) {
    setCfg((prev) => ({
      ...prev,
      programs: prev.programs.map((p) => (p.programKey === key ? { ...p, ...patch } : p)),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/renewal-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programs: cfg.programs }),
      });
      const data = await res.json();
      if (data.ok) {
        // Refresh computed deadlines from server response
        setCfg((prev) => ({
          programs: prev.programs.map((p) => {
            const updated = (data.programs as ProgramEntry[]).find((x) => x.programKey === p.programKey);
            return updated ?? p;
          }),
          updatedAt: new Date().toISOString(),
        }));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const openCount = cfg.programs.filter((p) => p.renewalOpen).length;

  return (
    <div className="mb-6 rounded-2xl border border-[#e2e8f0] bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#f8faff] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#be185d] to-[#db2777] flex items-center justify-center text-white text-[17px] shadow-sm">
            🔄
          </div>
          <div className="text-left">
            <div className="font-extrabold text-[14px] text-[#002f76]">Renewal Settings</div>
            <div className="text-[11px] font-semibold text-[#5a6e8c] mt-0.5">
              Per-program adventure start dates &amp; renewal windows
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!loadingCfg && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold ${openCount > 0
                  ? "bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]"
                  : "bg-[#f1f5f9] text-[#64748b] border border-[#cbd5e1]"
                }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${openCount > 0 ? "bg-[#15803d]" : "bg-[#64748b]"}`} />
              {openCount > 0 ? `${openCount} Program${openCount > 1 ? "s" : ""} Open` : "All Closed"}
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className={`w-4 h-4 text-[#94a3b8] transition-transform ${collapsed ? "" : "rotate-180"}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="border-t border-[#f1f5f9]">
          {/* Legend */}
          <div className="px-6 pt-4 pb-2 text-[11px] font-semibold text-[#94a3b8]">
            Set each program's next start date independently. The downpayment deadline is auto-set to 2 weeks before start. Toggle renewal open so parents see the form link on their dashboard.
          </div>

          {/* Program rows */}
          <div className="divide-y divide-[#f1f5f9]">
            {cfg.programs.map((prog) => {
              const meta = PROGRAM_META[prog.programKey] ?? { emoji: "📚", color: "#002f76", bg: "#f8faff", border: "#e2e8f0", short: prog.programKey };
              const deadlineLabel = prog.renewalOpenDate
                ? new Date(prog.renewalOpenDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : prog.nextAdventureStart
                  ? "2 wks before start"
                  : "—";

              return (
                <div key={prog.programKey} className="px-6 py-4">
                  {/* Program name badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold"
                        style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                      >
                        {meta.emoji} {meta.short}
                      </span>
                    </div>
                    {/* Renewal toggle */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold ${prog.renewalOpen ? "text-[#15803d]" : "text-[#94a3b8]"}`}>
                        {prog.renewalOpen ? "Open" : "Closed"}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateProgram(prog.programKey, { renewalOpen: !prog.renewalOpen })}
                        className={`relative w-10 h-5 rounded-full transition-colors ${prog.renewalOpen ? "bg-[#15803d]" : "bg-[#cbd5e1]"}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${prog.renewalOpen ? "translate-x-5" : ""}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Adventure # + Date + deadline row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Current adventure number */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#5a6e8c]">
                        🏕️ Current Adventure #
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateProgram(prog.programKey, { currentAdventure: Math.max(1, (prog.currentAdventure ?? 1) - 1) })}
                          className="w-9 h-9 rounded-xl border border-[#e2e8f0] bg-[#f8faff] text-[#002f76] font-bold text-[18px] flex items-center justify-center hover:bg-[#e8f0ff] transition-colors"
                        >−</button>
                        <div className="flex-1 text-center">
                          <div className="font-extrabold text-[22px]" style={{ color: meta.color }}>Adventure {prog.currentAdventure ?? 1}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateProgram(prog.programKey, { currentAdventure: (prog.currentAdventure ?? 1) + 1 })}
                          className="w-9 h-9 rounded-xl border border-[#e2e8f0] bg-[#f8faff] text-[#002f76] font-bold text-[18px] flex items-center justify-center hover:bg-[#e8f0ff] transition-colors"
                        >+</button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#5a6e8c]">
                        🚀 Next Adventure Start
                      </label>
                      <input
                        type="date"
                        className={INPUT_CLS}
                        value={prog.nextAdventureStart ? prog.nextAdventureStart.slice(0, 10) : ""}
                        onChange={(e) =>
                          updateProgram(prog.programKey, {
                            nextAdventureStart: e.target.value ? `${e.target.value}T00:00:00.000Z` : null,
                          })
                        }
                      />
                    </div>
                    <div
                      className="flex flex-col justify-center rounded-xl px-4 py-2.5 text-[12px]"
                      style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
                    >
                      <span className="text-[10px] font-extrabold uppercase tracking-wider mb-0.5" style={{ color: meta.color }}>
                        💳 Downpayment Deadline
                      </span>
                      <span className="font-bold" style={{ color: meta.color }}>
                        {deadlineLabel}
                      </span>
                      {prog.nextAdventureStart && (
                        <span className="text-[10px] text-[#94a3b8] mt-0.5">auto · 2 weeks before start</span>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Save footer */}
          <div className="flex items-center gap-3 px-6 py-4 border-t border-[#f1f5f9] bg-[#f8fafc]">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-full bg-[#005cc8] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#004bb0] transition-colors disabled:opacity-60"
            >
              {saving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                "Save All Programs"
              )}
            </button>
            {saved && (
              <span className="text-[12px] font-bold text-[#15803d] flex items-center gap-1">✓ Saved successfully</span>
            )}
            {cfg.updatedAt && !saved && (
              <span className="text-[11px] text-[#94a3b8]">
                Last saved: {new Date(cfg.updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TrailblazerVirtualSettings() {
  const [cfg, setCfg] = useState<RenewalCfg>({ programs: defaultPrograms(), updatedAt: null });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingCfg, setLoadingCfg] = useState(true);

  useEffect(() => {
    fetch("/api/renewal-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.programs) {
          const merged = RENEWAL_PROGRAMS.map((key) => {
            const existing = d.programs.find((p: ProgramEntry) => p.programKey === key);
            return existing ?? { programKey: key, nextAdventureStart: null, renewalOpen: false, renewalOpenDate: null, virtualLink: "", virtualLinkOpen: false };
          });
          setCfg({ programs: merged, updatedAt: d.updatedAt ?? null });
        }
      })
      .catch(() => { })
      .finally(() => setLoadingCfg(false));
  }, []);

  const trailblazerProg = cfg.programs.find((p) => p.programKey === "Trailblazer: Brave Explorer");

  function updateLink(virtualLink: string) {
    setCfg((prev) => ({
      ...prev,
      programs: prev.programs.map((p) => (p.programKey === "Trailblazer: Brave Explorer" ? { ...p, virtualLink } : p)),
    }));
  }

  function toggleOpen() {
    if (!trailblazerProg) return;
    setCfg((prev) => ({
      ...prev,
      programs: prev.programs.map((p) => (p.programKey === "Trailblazer: Brave Explorer" ? { ...p, virtualLinkOpen: !p.virtualLinkOpen } : p)),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/renewal-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programs: cfg.programs }),
      });
      const data = await res.json();
      if (data.ok) {
        setCfg((prev) => ({
          programs: prev.programs.map((p) => {
            const updated = (data.programs as ProgramEntry[]).find((x) => x.programKey === p.programKey);
            return updated ?? p;
          }),
          updatedAt: new Date().toISOString(),
        }));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (loadingCfg || !trailblazerProg) return null;

  return (
    <div style={{
      marginBottom: "24px", borderRadius: "18px", overflow: "hidden",
      boxShadow: "0 4px 24px rgba(0,47,118,0.12)",
      background: "linear-gradient(135deg, #1a1060 0%, #002f76 55%, #005cc8 100%)",
      border: "1.5px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center",
      padding: "0 24px", gap: "20px", minHeight: "76px",
      position: "relative",
    }}>
      {/* Decorative blobs */}
      <div style={{ position: "absolute", top: "-40px", left: "200px", width: "140px", height: "140px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-30px", right: "280px", width: "90px", height: "90px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

      {/* Icon */}
      <div style={{
        width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0,
        background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px",
        position: "relative",
      }}>🎥</div>

      {/* Title */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontWeight: 800, fontSize: "15px", color: "white", letterSpacing: "-0.2px" }}>
          Trailblazer Virtual Class
        </div>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", fontWeight: 500, marginTop: "1px" }}>
          🏕️ Brave Explorer Program
        </div>
      </div>

      {/* Status badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: "6px",
        background: trailblazerProg.virtualLinkOpen ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.1)",
        border: `1px solid ${trailblazerProg.virtualLinkOpen ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.18)"}`,
        borderRadius: "100px", padding: "4px 11px 4px 8px", flexShrink: 0, transition: "all 0.3s",
      }}>
        <div style={{
          width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
          background: trailblazerProg.virtualLinkOpen ? "#10b981" : "rgba(255,255,255,0.4)",
          boxShadow: trailblazerProg.virtualLinkOpen ? "0 0 0 3px rgba(16,185,129,0.25)" : "none",
          transition: "all 0.3s",
        }} />
        <span style={{ fontSize: "11.5px", fontWeight: 700, color: "white" }}>
          {trailblazerProg.virtualLinkOpen ? "Live to parents" : "Hidden"}
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Link input */}
      <div style={{ position: "relative", width: "320px", flexShrink: 0 }}>
        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", pointerEvents: "none" }}>🔗</span>
        <input
          type="url"
          placeholder="https://zoom.us/j/...  or  meet.google.com/..."
          style={{
            width: "100%", boxSizing: "border-box",
            borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)", padding: "9px 12px 9px 34px",
            fontSize: "13px", fontWeight: 600, color: "white",
            outline: "none", backdropFilter: "blur(4px)",
            transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
            e.currentTarget.style.background = "rgba(255,255,255,0.18)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.boxShadow = "none";
          }}
          value={trailblazerProg.virtualLink || ""}
          onChange={(e) => updateLink(e.target.value)}
        />
      </div>

      {/* Toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <span style={{ fontSize: "11.5px", fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>
          {trailblazerProg.virtualLinkOpen ? "On" : "Off"}
        </span>
        <button type="button" onClick={toggleOpen} style={{
          position: "relative", width: "40px", height: "22px", borderRadius: "100px",
          border: "2px solid rgba(255,255,255,0.25)", cursor: "pointer", outline: "none", padding: 0,
          background: trailblazerProg.virtualLinkOpen ? "#10b981" : "rgba(255,255,255,0.2)",
          transition: "background 0.25s",
        }}>
          <span style={{
            position: "absolute", top: "1px",
            left: trailblazerProg.virtualLinkOpen ? "18px" : "1px",
            width: "16px", height: "16px", borderRadius: "50%",
            background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            transition: "left 0.25s", display: "block",
          }} />
        </button>
      </div>

      {/* Save button */}
      <button
        type="button" onClick={handleSave} disabled={saving}
        style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: "6px",
          borderRadius: "10px",
          cursor: saving ? "not-allowed" : "pointer",
          padding: "9px 18px", fontWeight: 800, fontSize: "13px", color: "white",
          background: saved ? "rgba(16,185,129,0.85)" : "rgba(255,255,255,0.15)",
          border: `1.5px solid ${saved ? "rgba(16,185,129,0.6)" : "rgba(255,255,255,0.25)"}`,
          backdropFilter: "blur(4px)",
          opacity: saving ? 0.7 : 1, transition: "all 0.25s",
          whiteSpace: "nowrap",
        }}
        onMouseOver={(e) => { if (!saving) { e.currentTarget.style.background = saved ? "rgba(16,185,129,0.95)" : "rgba(255,255,255,0.22)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
        onMouseOut={(e) => { e.currentTarget.style.background = saved ? "rgba(16,185,129,0.85)" : "rgba(255,255,255,0.15)"; e.currentTarget.style.transform = "translateY(0)"; }}
      >
        {saving
          ? <span style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
          : saved ? "✓ Saved!" : "📤 Post Link"}
      </button>
    </div>
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
  const [renewalSettings, setRenewalSettings] = useState<ProgramEntry[]>([]);

  useEffect(() => {
    loadAccounts();
    fetch("/api/renewal-settings")
      .then((r) => r.json())
      .then((d) => { if (d.programs) setRenewalSettings(d.programs); })
      .catch(() => { });
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

        {/* Renewal Settings Panel */}
        <RenewalSettingsPanel />

        {/* Trailblazer Virtual Class – full-width below renewal settings */}
        <TrailblazerVirtualSettings />

        {/* Downpayment Verification Panel */}
        <DownpaymentPanel data={data} onRefresh={loadAccounts} renewalSettings={renewalSettings} />

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
                  <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[20%]">Parent</th>
                  <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[10%]">Relationship</th>
                  <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[12%]">Phone</th>
                  <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[12%]">Child</th>
                  <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[15%]">Program / Adventure</th>
                  <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[12%]">Schedule</th>
                  <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[10%]">Renewal</th>
                  <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[9%]">Status</th>
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
                            <div className="flex flex-col gap-1.5">
                              <span className="inline-flex items-center rounded-full border border-[#c5d6ff] bg-[#f0f5ff] px-3 py-1.5 text-[12px] font-bold text-[#0050d5]">
                                {parent.program}
                              </span>
                              {(() => {
                                const prog = renewalSettings.find((p) => p.programKey === parent.program);
                                const adv = (prog?.currentAdventure) || 1;
                                return (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-[#fde68a] bg-[#fffbeb] px-2.5 py-1 text-[11px] font-extrabold text-[#92400e]">
                                    🏕️ Adventure {adv}
                                  </span>
                                );
                              })()}
                            </div>
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
                        <td className="py-4 pr-4">
                          {parent.renewalStatus?.hasSubmitted ? (
                            parent.renewalStatus.returning === "yes" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2.5 py-1 text-[11.5px] font-bold text-[#15803d]">✅ Yes</span>
                            ) : parent.renewalStatus.returning === "no" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fecaca] bg-[#fef2f2] px-2.5 py-1 text-[11.5px] font-bold text-[#b91c1c]">❌ No</span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fef08a] bg-[#fefce8] px-2.5 py-1 text-[11.5px] font-bold text-[#a16207]">🤔 Undecided</span>
                            )
                          ) : (
                            <span className="text-[13px] font-semibold text-[#94a3b8]">—</span>
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