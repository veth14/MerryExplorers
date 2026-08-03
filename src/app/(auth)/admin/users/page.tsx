"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { UserAccount, TeacherRole, UserStatus, EmergencyContact } from "@/data/users";
import { UserMetricCard } from "@/components/users/user-metric-card";
import { UserCard } from "@/components/users/user-card";
import { uploadAvatar } from "@/lib/supabase";
import { firebaseConfig } from "@/lib/firebase";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { cachedFetch, invalidateCache } from "@/lib/cache";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { useAuth } from "@/lib/auth-context";

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

const AVAILABLE_TAGS = [
  "Early Childhood Ed", "CPR Certified", "Montessori Trained",
  "Child Development", "Special Needs", "Art Specialist",
  "Music Specialist", "Bilingual",
];

const ALL_WORK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DEFAULT_FULL_TIME_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ASSIGNED_ROOMS = [
  "Little Explorers", "Tiny Explorers", "Unassigned"
];

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`rounded-full transition-all duration-200 ${i === current
              ? "w-5 h-2 bg-[#0050d5]"
              : i < current
                ? "w-2 h-2 bg-[#0050d5]/40"
                : "w-2 h-2 bg-[#d0d8e8]"
            }`}
        />
      ))}
    </div>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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

const INPUT_CLS =
  "w-full rounded-xl border border-[#d0d8e8] bg-[#f8faff] px-4 py-2.5 text-[13.5px] font-semibold text-[#002f76] placeholder:text-[#b0bec5] outline-none focus:border-[#0050d5] focus:ring-2 focus:ring-[#0050d5]/15 transition-all";

const SELECT_CLS =
  "w-full rounded-xl border border-[#d0d8e8] bg-[#f8faff] px-4 py-2.5 text-[13.5px] font-semibold text-[#002f76] outline-none focus:border-[#0050d5] focus:ring-2 focus:ring-[#0050d5]/15 transition-all cursor-pointer appearance-none";

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────
type ModalMode = "add" | "edit";

type Draft = Omit<UserAccount, "id" | "initials">;

function emptyDraft(): Draft {
  return {
    avatarUrl: "",
    avatarColor: randomColor(),
    fullName: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    homeAddress: "",
    role: "Assistant Teacher",
    assignedRoom: "",
    employeeId: "",
    workDays: [...DEFAULT_FULL_TIME_DAYS],
    employmentType: "full-time",
    shiftTime: "08:30 AM - 03:00 PM",
    noTimeLog: false,
    weeklyHoursTarget: null,
    status: "active",
    tags: [],
    joinDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    emergencyContacts: [],
  };
}

function draftFromUser(u: UserAccount): Draft {
  return {
    avatarUrl: u.avatarUrl,
    avatarColor: u.avatarColor,
    fullName: u.fullName || "",
    dateOfBirth: u.dateOfBirth || "",
    email: u.email || "",
    phone: u.phone || "",
    homeAddress: u.homeAddress || "",
    role: u.role || "",
    assignedRoom: u.assignedRoom || "",
    employeeId: u.employeeId || "",
    workDays: u.workDays?.length ? [...u.workDays] : [...DEFAULT_FULL_TIME_DAYS],
    employmentType: u.employmentType || "full-time",
    shiftTime: u.shiftTime || "08:30 AM - 03:00 PM",
    noTimeLog: u.noTimeLog ?? false,
    weeklyHoursTarget: u.weeklyHoursTarget ?? null,
    status: u.status || "Active",
    tags: [...(u.tags || [])],
    joinDate: u.joinDate || "",
    emergencyContacts: (u.emergencyContacts || []).map((c) => ({ ...c })),
  };
}

function UserModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: ModalMode;
  initial?: UserAccount;
  onClose: () => void;
  onSave: (account: Omit<UserAccount, "id">, id?: string) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initial ? draftFromUser(initial) : emptyDraft());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isTeacher = !["admin", "executive partner"].includes((draft.role || "").toLowerCase());
  const STEPS = isTeacher 
    ? ["Avatar & Role", "Personal Info", "Work Details", "Emergency Contacts"]
    : ["Avatar & Role", "Personal Info"];

  function set<K extends keyof Draft>(key: K, val: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: val }));
    setError("");
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) set("avatarUrl", ev.target.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  function validate() {
    if (step === 0 && !draft.role) { setError("Please select a role."); return false; }
    if (step === 1) {
      if (!draft.fullName.trim()) { setError("Full name is required."); return false; }
      if (!draft.email.trim()) { setError("Email is required."); return false; }
    }
    if (step === 2 && !draft.employeeId.trim()) { setError("Employee ID is required."); return false; }
    return true;
  }

  function handleNext() {
    if (!validate()) return;
    setStep((s) => s + 1);
  }

  function handleBack() {
    setError("");
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setError("");

    try {
      let finalAvatarUrl = draft.avatarUrl;
      const accountId = initial?.id ?? crypto.randomUUID();

      if (selectedFile) {
        finalAvatarUrl = await uploadAvatar(selectedFile, accountId);
      }

      const account: Omit<UserAccount, "id"> = {
        avatarUrl: finalAvatarUrl,
        avatarColor: draft.avatarColor,
        initials: getInitials(draft.fullName),
        tags: draft.tags,
        joinDate: draft.joinDate,
        status: draft.status,
        fullName: draft.fullName,
        dateOfBirth: draft.dateOfBirth,
        email: draft.email,
        phone: draft.phone,
        homeAddress: draft.homeAddress,
        role: draft.role,
        assignedRoom: draft.assignedRoom || "Unassigned",
        employeeId: draft.employeeId,
        workDays: draft.workDays,
        employmentType: draft.employmentType,
        shiftTime: draft.shiftTime,
        noTimeLog: draft.noTimeLog,
        weeklyHoursTarget: draft.weeklyHoursTarget,
        emergencyContacts: draft.emergencyContacts.filter((c) => c.name.trim()),
      };

      await onSave(account, initial?.id);
    } catch (err: any) {
      console.error(err);
      setError("An error occurred while saving the account.");
    } finally {
      setLoading(false);
    }
  }

  function addEmergencyContact() {
    set("emergencyContacts", [...draft.emergencyContacts, { name: "", relationship: "", phone: "" }]);
  }

  function updateContact(index: number, field: keyof EmergencyContact, value: string) {
    const updated = draft.emergencyContacts.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    );
    set("emergencyContacts", updated);
  }

  function removeContact(index: number) {
    set("emergencyContacts", draft.emergencyContacts.filter((_, i) => i !== index));
  }

  const initials = draft.fullName ? getInitials(draft.fullName) : "?";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#002f76] to-[#0050d5] px-6 py-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[17px] font-extrabold text-white">
                {mode === "add" ? "Add Teacher Account" : (isTeacher ? "Edit Teacher Account" : "Edit Admin Account")}
              </h2>
              <p className="text-[11px] text-white/60 mt-0.5">{STEPS[step]}</p>
            </div>
            <StepDots current={step} total={STEPS.length} />
          </div>
          {/* Step labels */}
          <div className="flex gap-0">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1 text-center">
                <p className={`text-[10px] font-bold truncate transition-colors ${i === step ? "text-white" : i < step ? "text-white/50" : "text-white/30"}`}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── STEP 0: Avatar & Role ── */}
          {step === 0 && (
            <div className="space-y-5">
              {/* Avatar picker */}
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
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                      <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
                      <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                    </svg>
                  </div>
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
                      onClick={() => {
                        set("avatarUrl", "");
                        setSelectedFile(null);
                      }}
                      className="rounded-full border border-[#ffd5d5] bg-[#fff0f0] px-4 py-1.5 text-[12px] font-bold text-[#e53935] hover:bg-[#ffe0e0] transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {/* Color picker for initials avatar */}
                {!draft.avatarUrl && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-[#8898aa]">Color:</span>
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => set("avatarColor", c)}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${draft.avatarColor === c ? "border-[#002f76] scale-125" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Role */}
              {isTeacher ? (
                <Field label="Teacher Role" required>
                  <div className="grid grid-cols-2 gap-3">
                    {(["Lead Teacher", "Assistant Teacher"] as TeacherRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => set("role", r)}
                        className={`rounded-xl border-2 py-3 text-[13px] font-bold transition-all ${draft.role === r
                            ? r === "Lead Teacher"
                              ? "border-[#ffb800] bg-[#fff8e1] text-[#a07000]"
                              : "border-[#0050d5] bg-[#f0f5ff] text-[#0050d5]"
                            : "border-[#e2e8f0] bg-white text-[#8898aa] hover:border-[#c5d6ff]"
                          }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </Field>
              ) : (
                <div className="mb-4 rounded-xl bg-[#f0f5ff] border border-[#c5d6ff] px-4 py-3 flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#0050d5] shrink-0">
                    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#0050d5]">Role</p>
                    <p className="text-[14px] font-extrabold text-[#002f76] capitalize">{draft.role || "Administrator"}</p>
                  </div>
                </div>
              )}

              {/* Status */}
              <Field label="Status">
                <div className="grid grid-cols-3 gap-2">
                  {(["active", "inactive", "on-leave"] as UserStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set("status", s)}
                      className={`rounded-xl border-2 py-2.5 text-[12px] font-bold capitalize transition-all ${draft.status === s
                          ? s === "active"
                            ? "border-[#2da05b] bg-[#e8f9f0] text-[#1a7a4a]"
                            : s === "on-leave"
                              ? "border-[#ffb800] bg-[#fff8e1] text-[#a07000]"
                              : "border-[#bdbdbd] bg-[#f5f5f5] text-[#616161]"
                          : "border-[#e2e8f0] bg-white text-[#8898aa] hover:border-[#c5d6ff]"
                        }`}
                    >
                      {s === "on-leave" ? "On Leave" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Tags */}
              {isTeacher && (
                <Field label="Certifications & Specializations">
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TAGS.map((tag) => {
                    const active = draft.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          set("tags", active ? draft.tags.filter((t) => t !== tag) : [...draft.tags, tag])
                        }
                        className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide transition-all ${active
                            ? "bg-[#0050d5] text-white"
                            : "bg-[#f0f4f9] text-[#5a6e8c] hover:bg-[#e8effe] hover:text-[#0050d5]"
                          }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </Field>
              )}
            </div>
          )}

          {/* ── STEP 1: Personal Info ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full Name" required>
                  <input
                    autoFocus
                    value={draft.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className={INPUT_CLS}
                  />
                </Field>
                <Field label="Date of Birth">
                  <CustomDatePicker
                    selectedDate={draft.dateOfBirth}
                    onChange={(date) => set("dateOfBirth", date)}
                    triggerClassName={`${INPUT_CLS} flex justify-between items-center`}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email Address" required>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="jane@merryexplorers.edu"
                    className={INPUT_CLS}
                  />
                </Field>
                <Field label="Phone Number">
                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="(555) 000-0000"
                    className={INPUT_CLS}
                  />
                </Field>
              </div>
              <Field label="Home Address">
                <input
                  value={draft.homeAddress}
                  onChange={(e) => set("homeAddress", e.target.value)}
                  placeholder="123 Maple St, Springfield, IL 62704"
                  className={INPUT_CLS}
                />
              </Field>
              <Field label="Join Date">
                <input
                  value={draft.joinDate}
                  onChange={(e) => set("joinDate", e.target.value)}
                  placeholder="e.g. Aug 2024"
                  className={INPUT_CLS}
                />
              </Field>
            </div>
          )}

          {/* ── STEP 2: Work Details ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Employee ID + Assigned Room */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Employee ID" required>
                  <input
                    autoFocus
                    value={draft.employeeId}
                    onChange={(e) => set("employeeId", e.target.value)}
                    placeholder="ME-2024-001"
                    className={INPUT_CLS}
                  />
                </Field>
                <Field label="Assigned Room">
                  <select value={draft.assignedRoom} onChange={(e) => set("assignedRoom", e.target.value)} className={SELECT_CLS}>
                    <option value="">Select room…</option>
                    {ASSIGNED_ROOMS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
              </div>

              {/* Employment Type */}
              <Field label="Employment Type">
                <div className="grid grid-cols-2 gap-3">
                  {(["full-time", "part-time"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        set("employmentType", t);
                        // Reset weekly hours target when switching to full-time
                        if (t === "full-time") set("weeklyHoursTarget", null);
                      }}
                      className={`rounded-xl border-2 py-2.5 text-[13px] font-bold capitalize transition-all ${
                        draft.employmentType === t
                          ? t === "full-time"
                            ? "border-[#0050d5] bg-[#f0f5ff] text-[#0050d5]"
                            : "border-[#ffb800] bg-[#fff8e1] text-[#a07000]"
                          : "border-[#e2e8f0] bg-white text-[#8898aa] hover:border-[#c5d6ff]"
                      }`}
                    >
                      {t === "full-time" ? "Full-Time" : "Part-Time"}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Work Days */}
              <Field label="Work Days">
                <div className="flex flex-wrap gap-2">
                  {ALL_WORK_DAYS.map((day) => {
                    const active = draft.workDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          set(
                            "workDays",
                            active
                              ? draft.workDays.filter((d) => d !== day)
                              : [...draft.workDays, day]
                          )
                        }
                        className={`rounded-full px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-wide transition-all border-2 ${
                          active
                            ? day === "Sat" || day === "Sun"
                              ? "border-[#6c5ce7] bg-[#ede9ff] text-[#6c5ce7]"
                              : "border-[#0050d5] bg-[#e8f0ff] text-[#0050d5]"
                            : "border-[#e2e8f0] bg-white text-[#b0bec5] hover:border-[#c5d6ff] hover:text-[#5a6e8c]"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                {draft.workDays.length === 0 && (
                  <p className="text-[11px] font-bold text-[#e53935] mt-1">Please select at least one work day.</p>
                )}
              </Field>

              {/* Shift Information */}
              <div className="flex items-start gap-3 rounded-xl bg-blue-50/50 p-4 border border-blue-100">
                <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: '20px' }}>schedule</span>
                <div>
                  <p className="text-[13px] font-bold text-brand-navy">Standard Schedule Applies</p>
                  <p className="text-[11.5px] font-medium text-[#5a6e8c] mt-0.5 leading-relaxed">
                    Start time is <strong>8:30 AM</strong> (Grace period until 8:45 AM). End times automatically adjust based on the day (3:00 PM for Mon/Wed/Fri, 5:00 PM for Tue/Thu).
                  </p>
                </div>
              </div>

              {/* Special options */}
              <div className="space-y-3 rounded-xl border border-[#e2e8f0] bg-[#f8faff] px-4 py-3.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#5a6e8c] mb-2">Special Arrangements</p>

                {/* No Time Log toggle */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={draft.noTimeLog}
                      onChange={(e) => set("noTimeLog", e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-[38px] h-[22px] rounded-full transition-colors ${
                      draft.noTimeLog ? "bg-[#0050d5]" : "bg-[#d0d8e8]"
                    }`}>
                      <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        draft.noTimeLog ? "translate-x-[18px]" : "translate-x-[3px]"
                      }`} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#002f76] group-hover:text-[#0050d5] transition-colors">
                      No Time Log Required
                    </p>
                    <p className="text-[11px] font-semibold text-[#8898aa] leading-snug mt-0.5">
                      Employee is exempt from late/absent tracking. No clock-in verification needed on their scheduled days.
                    </p>
                  </div>
                </label>

                {/* Weekly Hours Target (OJT/Intern) */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={draft.weeklyHoursTarget !== null}
                      onChange={(e) =>
                        set("weeklyHoursTarget", e.target.checked ? 8 : null)
                      }
                      className="sr-only"
                    />
                    <div className={`w-[38px] h-[22px] rounded-full transition-colors ${
                      draft.weeklyHoursTarget !== null ? "bg-[#6c5ce7]" : "bg-[#d0d8e8]"
                    }`}>
                      <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        draft.weeklyHoursTarget !== null ? "translate-x-[18px]" : "translate-x-[3px]"
                      }`} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-[#002f76] group-hover:text-[#6c5ce7] transition-colors">
                      OJT / Intern — Weekly Hours Target
                    </p>
                    <p className="text-[11px] font-semibold text-[#8898aa] leading-snug mt-0.5">
                      Tracked by total hours per week, not daily presence.
                    </p>
                    {draft.weeklyHoursTarget !== null && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={40}
                          value={draft.weeklyHoursTarget ?? 8}
                          onChange={(e) => set("weeklyHoursTarget", Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 rounded-lg border border-[#c5d6ff] bg-white px-3 py-1.5 text-[13px] font-bold text-[#002f76] outline-none focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/15 transition-all"
                        />
                        <span className="text-[12px] font-bold text-[#5a6e8c]">hours / week</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Role preview */}
              <div className="rounded-xl bg-[#f0f5ff] border border-[#c5d6ff] px-4 py-3 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#0050d5] shrink-0">
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                </svg>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#0050d5]">Role Assigned</p>
                  <p className="text-[14px] font-extrabold text-[#002f76]">{draft.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Emergency Contacts ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#fff8e1] border border-[#ffd54f] px-4 py-3 text-[12px] font-semibold text-[#a07000]">
                ℹ️ Emergency contacts are optional. Leave blank to skip.
              </div>

              {draft.emergencyContacts.map((contact, i) => (
                <div key={i} className="rounded-xl border border-[#ffd5d5] bg-[#fff8f8] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-extrabold uppercase tracking-wider text-[#e53935]">
                      Contact #{i + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeContact(i)}
                      className="text-[11px] font-bold text-[#e53935] hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Full Name">
                      <input
                        value={contact.name}
                        onChange={(e) => updateContact(i, "name", e.target.value)}
                        placeholder="e.g. John Smith"
                        className={INPUT_CLS}
                      />
                    </Field>
                    <Field label="Relationship">
                      <input
                        value={contact.relationship}
                        onChange={(e) => updateContact(i, "relationship", e.target.value)}
                        placeholder="e.g. Spouse, Mother…"
                        className={INPUT_CLS}
                      />
                    </Field>
                  </div>
                  <Field label="Phone Number">
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => updateContact(i, "phone", e.target.value)}
                      placeholder="(555) 000-0000"
                      className={INPUT_CLS}
                    />
                  </Field>
                </div>
              ))}

              {draft.emergencyContacts.length < 3 && (
                <button
                  type="button"
                  onClick={addEmergencyContact}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d0d8e8] py-3 text-[13px] font-bold text-[#5a6e8c] hover:border-[#0050d5] hover:text-[#0050d5] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                  </svg>
                  Add Emergency Contact
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-[#fff0f0] border border-[#ffd5d5] px-4 py-2.5 text-[12.5px] font-bold text-[#e53935]">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#f0f4f9] flex items-center gap-3 shrink-0">
          {step > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-[#d0d8e8] px-4 py-2.5 text-[13px] font-bold text-[#5a6e8c] hover:bg-[#f0f4f9] transition-colors disabled:opacity-50"
            >
              ← Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-[#d0d8e8] px-4 py-2.5 text-[13px] font-bold text-[#5a6e8c] hover:bg-[#f0f4f9] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}

          <div className="flex-1" />

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#002f76] to-[#0050d5] px-5 py-2.5 text-[13px] font-bold text-white shadow-md shadow-[#0050d5]/25 hover:shadow-lg transition-all disabled:opacity-50"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#002f76] to-[#0050d5] px-5 py-2.5 text-[13px] font-bold text-white shadow-md shadow-[#0050d5]/25 hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? "Saving..." : mode === "add" ? "✓ Create Account" : "✓ Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function DeleteModal({
  user,
  onClose,
  onConfirm,
}: {
  user: UserAccount;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-[#e2e8f0] p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f0] border-2 border-[#ffd5d5]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-[#e53935]">
            <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-[17px] font-extrabold text-[#002f76] mb-1">Delete Account?</h3>
        <p className="text-[13px] text-[#5a6e8c] font-semibold mb-5">
          <span className="font-extrabold text-[#002f76]">{user.fullName}</span>&apos;s account will be permanently removed.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 rounded-xl border border-[#d0d8e8] py-2.5 text-[13px] font-bold text-[#5a6e8c] hover:bg-[#f0f4f9] transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={async () => {
              setLoading(true);
              await onConfirm();
              setLoading(false);
            }}
            disabled={loading}
            className="flex-1 rounded-xl bg-[#e53935] py-2.5 text-[13px] font-bold text-white hover:bg-[#c62828] transition-colors disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
type FilterTab = "All" | "Admins" | "Lead Teachers" | "Assistants" | "On Leave";
const TABS: FilterTab[] = ["All", "Admins", "Lead Teachers", "Assistants", "On Leave"];

export default function UsersPage() {
  const { user, userProfile } = useAuth();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editTarget, setEditTarget] = useState<UserAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch accounts on mount
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const data = await cachedFetch<UserAccount[]>("accounts:all", "/api/accounts", 60_000);
        if (Array.isArray(data)) {
          setAccounts(data);
        }
      } catch (e) {
        console.error("Failed to load accounts", e);
      } finally {
        setLoading(false);
      }
    }
    fetchAccounts();
  }, []);

  const filtered = accounts
    .filter((u) => {
      if (activeTab === "Admins") return ["admin", "executive partner"].includes((u.role || "").toLowerCase());
      if (activeTab === "Lead Teachers") return u.role === "Lead Teacher";
      if (activeTab === "Assistants") return u.role === "Assistant Teacher";
      if (activeTab === "On Leave") return u.status === "on-leave";
      return true;
    })
    .filter((u) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.assignedRoom.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });

  async function handleSave(account: Omit<UserAccount, "id">, id?: string) {
    // Helper to write an audit log entry
    const writeAudit = async (action: string, targetName: string, targetRole: string, targetId: string) => {
      try {
        await fetch("/api/audit-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorUid: user?.uid || null,
            actorName: userProfile?.fullName || user?.email || "Unknown",
            actorRole: userProfile?.role || "Unknown",
            action,
            category: "account",
            targetId,
            targetTitle: targetName,
            details: `${action === "CREATE" ? "Created" : "Edited"} account for ${targetName} (${targetRole})`,
          }),
        });
      } catch { /* non-fatal */ }
    };

    if (id) {
      // Edit
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(account),
      });
      if (res.ok) {
        setAccounts((prev) => prev.map((a) => (a.id === id ? { ...account, id } : a)));
        invalidateCache("accounts:all");
        await writeAudit("EDIT", account.fullName, account.role, id);
      }
    } else {
      // Add
      try {
        // 1. Create a secondary Firebase App to prevent logging out the Admin
        const tempAppName = `TempApp_${Date.now()}`;
        const tempApp = initializeApp(firebaseConfig, tempAppName);
        const tempAuth = getAuth(tempApp);

        // 2. Create the user in Firebase Auth with a default password
        const defaultPassword = "Explorers123!";
        const userCredential = await createUserWithEmailAndPassword(tempAuth, account.email, defaultPassword);

        // 3. Set the display name in Auth to their full name
        await updateProfile(userCredential.user, { displayName: account.fullName });

        // Use the Firebase UID as the MongoDB document ID
        const firebaseUid = userCredential.user.uid;

        // 4. Save to MongoDB via API using the new Firebase UID
        const res = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...account, id: firebaseUid }),
        });

        if (res.ok) {
          const newAccount = await res.json();
          setAccounts((prev) => [newAccount, ...prev]);
          invalidateCache("accounts:all");
          await writeAudit("CREATE", account.fullName, account.role, firebaseUid);
        } else {
          console.error("Failed to save to MongoDB");
        }

        // Clean up the temporary Firebase app
        await tempAuth.signOut();
        await deleteApp(tempApp);

      } catch (err: any) {
        console.error("Failed to create user in Firebase:", err);
        alert(`Error creating user: ${err.message}`);
        return; // Stop saving if Auth fails
      }
    }
    setModalMode(null);
    setEditTarget(null);
  }

  function handleEdit(user: UserAccount) {
    setEditTarget(user);
    setModalMode("edit");
  }

  function handleDelete(userId: string) {
    const u = accounts.find((a) => a.id === userId);
    if (u) setDeleteTarget(u);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/accounts/${deleteTarget.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setAccounts((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      invalidateCache("accounts:all");
      // Write audit log
      try {
        await fetch("/api/audit-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorUid: user?.uid || null,
            actorName: userProfile?.fullName || user?.email || "Unknown",
            actorRole: userProfile?.role || "Unknown",
            action: "DELETE",
            category: "account",
            targetId: deleteTarget.id,
            targetTitle: deleteTarget.fullName,
            details: `Deleted account for ${deleteTarget.fullName} (${deleteTarget.role})`,
          }),
        });
      } catch { /* non-fatal */ }
    }
    setDeleteTarget(null);
  }

  // Live metrics
  const total = accounts.length;
  const active = accounts.filter((u) => u.status === "active").length;
  const onLeave = accounts.filter((u) => u.status === "on-leave").length;
  const admins = accounts.filter((u) => ["admin", "executive partner"].includes((u.role || "").toLowerCase())).length;
  const leads = accounts.filter((u) => u.role === "Lead Teacher").length;
  const assistants = accounts.filter((u) => u.role === "Assistant Teacher").length;

  return (
    <AppShell
      title="User Accounts"
      description="Manage teacher accounts, roles, and personal information."
    >
      {/* Metric cards */}
      <section className="grid gap-4 grid-cols-2 xl:grid-cols-4 shrink-0">
        <UserMetricCard label="Total Accounts" value={String(total)} meta="+1 this month" type="total" />
        <UserMetricCard label="Active" value={String(active)} meta="Currently working" type="active" />
        <UserMetricCard label="On Leave" value={String(onLeave)} meta="Returning soon" type="leave" />
        <UserMetricCard label="Lead Teachers" value={String(leads)} meta={`${assistants} assistants`} type="new" />
      </section>

      {/* Controls */}
      <div className="flex flex-col gap-3 mt-1 lg:flex-row lg:items-center lg:justify-between">
        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map((tab) => {
            const count =
              tab === "All" ? accounts.length :
                tab === "Admins" ? admins :
                  tab === "Lead Teachers" ? leads :
                    tab === "Assistants" ? assistants :
                      onLeave;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${activeTab === tab
                    ? "bg-[#0050d5] text-white shadow-md shadow-[#0050d5]/20"
                    : "bg-white text-[#002f76] hover:bg-[#f0f5ff] border border-[#e2e8f0]"
                  }`}
              >
                {tab}
                <span className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded-full ${activeTab === tab ? "bg-white/20" : "bg-[#e8effe] text-[#0050d5]"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + Add */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8898aa]">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teachers…"
              className="pl-9 pr-4 py-1.5 rounded-full border border-[#e2e8f0] bg-white text-[13px] font-semibold text-[#002f76] placeholder:text-[#b0bec5] outline-none focus:border-[#0050d5] focus:ring-2 focus:ring-[#0050d5]/15 transition-all w-44"
            />
          </div>

          <button
            onClick={() => { setEditTarget(null); setModalMode("add"); }}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#002f76] to-[#0050d5] px-4 py-1.5 text-[13px] font-bold text-white shadow-md shadow-[#0050d5]/25 hover:shadow-lg transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
            </svg>
            Add Account
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0050d5]"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f0f5ff] border-2 border-[#c5d6ff]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#0050d5]">
              <path d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.233.96 10.088 10.088 0 0 0 5.06-1.01.75.75 0 0 0 .42-.643 4.875 4.875 0 0 0-6.957-4.611 8.586 8.586 0 0 1 1.71 5.157v.003Z" />
            </svg>
          </div>
          <p className="text-[16px] font-extrabold text-[#002f76]">No accounts found</p>
          <p className="text-[13px] font-semibold text-[#8898aa] mt-1">Try adjusting your search or filter.</p>
          <button
            onClick={() => { setEditTarget(null); setModalMode("add"); }}
            className="mt-4 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#002f76] to-[#0050d5] px-5 py-2 text-[13px] font-bold text-white shadow-md"
          >
            + Add First Account
          </button>
        </div>
      ) : (
        <section className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((user) => (
            <UserCard key={user.id} user={user} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </section>
      )}

      {/* Modals */}
      {modalMode && (
        <UserModal
          mode={modalMode}
          initial={editTarget ?? undefined}
          onClose={() => { setModalMode(null); setEditTarget(null); }}
          onSave={handleSave}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </AppShell>
  );
}
