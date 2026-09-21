"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { m, AnimatePresence } from "framer-motion";
import imageCompression from "browser-image-compression";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { PROGRAM_SLOTS } from "@/data/landing";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { CustomSelect } from "@/components/ui/custom-select";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  childInfo: { firstName: string; lastName: string; nickname?: string };
  parentInfo: { name: string; email: string };
  program: string;
  classTime: string;
  status: string;
}

interface PhotoAlbum {
  id: string;
  accessCode: string;
  childFirstName: string;
  childNickname: string;
  parentEmail: string;
  programName: string;
  classTime: string;
  sessionLabel: string;
  sessionDate: string;
  note: string;
  photos: { url: string; caption: string }[];
  emailSent: boolean;
  emailSentAt: string | null;
  expiresAt: string;
  createdAt: string;
}

interface PhotoPreview {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  status: "pending" | "compressing" | "ready" | "error";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeUntilExpiry(expiresAt: string): { label: string; urgent: boolean } {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { label: "Expired", urgent: true };
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  if (days > 0) return { label: `${days}d ${remH}h left`, urgent: days < 1 };
  return { label: `${hours}h left`, urgent: true };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const PROGRAMS = Object.values(PROGRAM_SLOTS);

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({
  album, onConfirm, onCancel, isDeleting,
}: {
  album: PhotoAlbum; onConfirm: () => void; onCancel: () => void; isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <m.div
        initial={{ opacity: 0, scale: 0.93, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm rounded-[1.75rem] bg-white shadow-2xl overflow-hidden"
      >
        <div className="bg-red-50 px-7 py-6 border-b border-red-100">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 mb-3">
            <span className="text-xl">🗑️</span>
          </div>
          <h3 className="font-headline text-[17px] font-extrabold text-[#1a0a0a]">Delete this album?</h3>
          <p className="mt-1 text-[13px] text-[#64748b]">
            <strong>{album.childFirstName}'s</strong> album for <strong>{album.sessionLabel}</strong> will be
            permanently removed and all {album.photos.length} photos deleted from Cloudinary.
          </p>
        </div>
        <div className="flex gap-3 px-7 py-5">
          <button onClick={onCancel} disabled={isDeleting}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-[14px] font-bold text-[#334155] hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isDeleting}
            className="flex-1 rounded-xl bg-red-500 py-2.5 text-[14px] font-bold text-white shadow-md shadow-red-500/25 hover:bg-red-600 disabled:opacity-60 transition-all">
            {isDeleting ? "Deleting…" : "Yes, delete"}
          </button>
        </div>
      </m.div>
    </div>
  );
}

// ─── Album Card ───────────────────────────────────────────────────────────────

function AlbumCard({
  album, onDelete, onSendEmail, isSending, onView
}: {
  album: PhotoAlbum;
  onDelete: (album: PhotoAlbum) => void;
  onSendEmail: (album: PhotoAlbum) => void;
  isSending: boolean;
  onView?: (album: PhotoAlbum) => void;
}) {
  const expiry = timeUntilExpiry(album.expiresAt);
  const origin = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || "");
  const photoUrl = `${origin}/photos/${album.accessCode}`;

  const programDef = PROGRAMS.find((p) => p.name === album.programName);
  const accent = programDef?.accent || "#0033A0";
  const accentSoft = programDef?.accentSoft || "#e1ecff";
  const shortName = album.programName.includes(":") ? album.programName.split(":")[1].trim() : album.programName;

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onView?.(album)}
      className="rounded-[1.5rem] bg-white border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-[#0033A0]/30 transition-all cursor-pointer"
    >
      {/* Photo strip */}
      <div className="flex h-24 overflow-hidden bg-slate-50">
        {album.photos.slice(0, 4).map((p, i) => (
          <div key={i} className="relative flex-1">
            <Image src={p.url} alt="" fill className="object-cover" sizes="120px" />
          </div>
        ))}
        {album.photos.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-slate-300 text-3xl">📷</div>
        )}
        {album.photos.length > 4 && (
          <div className="absolute bottom-1 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
            +{album.photos.length - 4}
          </div>
        )}
      </div>

      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div>
            <p className="font-headline text-[15px] font-extrabold text-[#0f172a]">
              {album.childFirstName}
              {album.childNickname && album.childNickname !== album.childFirstName && (
                <span className="text-[#64748b] font-semibold text-[13px]"> "{album.childNickname}"</span>
              )}
            </p>
            <p className="text-[11px] font-bold text-[#64748b] mt-0.5 uppercase tracking-wide">
              {fmtDate(album.sessionDate)}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${expiry.urgent ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"}`}>
            {expiry.label}
          </span>
        </div>

        {/* Categories / Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span 
            className="rounded-full px-2.5 py-1 text-[10px] font-bold border"
            style={{ backgroundColor: accentSoft, color: accent, borderColor: `${accent}30` }}
          >
            {shortName}
          </span>
          <span className="rounded-full px-2.5 py-1 text-[10px] font-bold border border-slate-200 bg-slate-50 text-[#475569]">
            {album.classTime}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 my-3">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#64748b]">
            <span>📸</span> {album.photos.length} photo{album.photos.length !== 1 ? "s" : ""}
          </span>
          <span className={`flex items-center gap-1 text-[11px] font-semibold ${album.emailSent ? "text-emerald-600" : "text-amber-500"}`}>
            {album.emailSent ? "✅ Email sent" : "📧 Not sent yet"}
          </span>
        </div>

        {/* Access code + link */}
        <div 
          className="flex items-center gap-2 rounded-xl bg-[#f0f6ff] border border-[#dbeafe] px-3 py-2 mb-3"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] font-black text-[#0033A0] uppercase tracking-widest">Code</span>
          <span className="font-mono text-[13px] font-black text-[#0033A0] flex-1">{album.accessCode}</span>
          <button
            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(photoUrl); }}
            className="text-[11px] font-bold text-[#0033A0] hover:text-[#ffb800] transition-colors"
            title="Copy link"
          >
            Copy link
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); onSendEmail(album); }}
            disabled={isSending}
            className={`flex-1 rounded-xl py-2 text-[12px] font-bold transition-all ${
              album.emailSent
                ? "bg-slate-100 text-[#64748b] hover:bg-slate-200"
                : "bg-[#0033A0] text-white shadow-md shadow-[#0033A0]/20 hover:bg-[#002580]"
            } disabled:opacity-50`}
          >
            {isSending ? "Sending…" : album.emailSent ? "Resend Email" : "📧 Send Email"}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(album); }}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
            title="Delete album"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </m.div>
  );
}

// ─── View Panel ────────────────────────────────────────────────────────────────

function ViewAlbumPanel({ album, onClose }: { album: PhotoAlbum; onClose: () => void }) {
  const programDef = PROGRAMS.find((p) => p.name === album.programName);
  const accent = programDef?.accent || "#0033A0";
  const accentSoft = programDef?.accentSoft || "#e1ecff";
  const shortName = album.programName.includes(":") ? album.programName.split(":")[1].trim() : album.programName;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <m.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative z-10 w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[88vh] rounded-t-[2rem] sm:rounded-[2rem] bg-white shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#0033A0]/50">Verify Information</p>
            <h2 className="font-headline text-[20px] font-extrabold text-[#0f172a]">Album Details</h2>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-[#64748b] hover:bg-slate-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FFC107]/20 text-[20px] font-black text-[#0033A0]">
              {album.childFirstName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-headline text-[18px] font-extrabold text-[#0f172a]">
                {album.childFirstName}
                {album.childNickname && album.childNickname !== album.childFirstName && (
                  <span className="text-[#64748b] font-medium text-[15px]"> "{album.childNickname}"</span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span 
                  className="rounded-full px-2.5 py-1 text-[11px] font-bold border"
                  style={{ backgroundColor: accentSoft, color: accent, borderColor: `${accent}30` }}
                >
                  {shortName}
                </span>
                <span className="rounded-full px-2.5 py-1 text-[11px] font-bold border border-slate-200 bg-slate-50 text-[#475569]">
                  {album.classTime}
                </span>
                <span className="rounded-full px-2.5 py-1 text-[11px] font-bold border border-slate-200 bg-slate-50 text-[#475569]">
                  {fmtDate(album.sessionDate)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#0033A0]/60 mb-1">Parent Email</p>
              <p className="text-[14px] font-bold text-[#0f172a]">{album.parentEmail}</p>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#0033A0]/60 mb-1">Status</p>
              <p className={`text-[13px] font-bold ${album.emailSent ? "text-emerald-600" : "text-amber-500"}`}>
                {album.emailSent ? `✅ Sent (${new Date(album.emailSentAt!).toLocaleDateString()})` : "📧 Not sent yet"}
              </p>
            </div>
          </div>

          {album.note && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#0033A0]/60 mb-1.5">Teacher Note</p>
              <div className="rounded-xl border border-[#dbeafe] bg-[#f0f6ff] p-4 text-[14px] text-[#0f172a] whitespace-pre-wrap">
                {album.note}
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#0033A0]/60 mb-3">
              Photos ({album.photos.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {album.photos.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  <Image src={p.url} alt="" fill className="object-cover" sizes="200px" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </m.div>
    </div>
  );
}

// ─── Create Panel ──────────────────────────────────────────────────────────────

function CreatePanel({
  onClose, onCreated, actorUid, actorName,
}: {
  onClose: () => void;
  onCreated: (album: PhotoAlbum) => void;
  actorUid?: string;
  actorName?: string;
}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [step, setStep] = useState<"select" | "upload" | "confirm">("select");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((d) => { if (d.success) setStudents(d.data); })
      .catch(() => {});
  }, []);

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.childInfo.firstName.toLowerCase().includes(q) ||
      s.childInfo.lastName.toLowerCase().includes(q) ||
      (s.childInfo.nickname || "").toLowerCase().includes(q)
    );
  });

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const remaining = 30 - photos.length;
    const toProcess = Array.from(files).slice(0, remaining);

    const newPreviews: PhotoPreview[] = toProcess.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      caption: "",
      status: "compressing" as const,
    }));

    setPhotos((prev) => [...prev, ...newPreviews]);

    for (const preview of newPreviews) {
      try {
        const compressed = await imageCompression(preview.file, {
          maxSizeMB: 0.4, maxWidthOrHeight: 1600, useWebWorker: true,
        });
        const previewUrl = URL.createObjectURL(compressed);
        setPhotos((prev) =>
          prev.map((p) => p.id === preview.id ? { ...p, previewUrl, file: compressed as File, status: "ready" } : p)
        );
      } catch {
        setPhotos((prev) =>
          prev.map((p) => p.id === preview.id ? { ...p, status: "error" } : p)
        );
      }
    }
  }, [photos.length]);

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  async function handleSubmit() {
    if (!selectedStudent || photos.filter((p) => p.status === "ready").length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const prog = PROGRAMS.find((p) => p.id === selectedStudent.program);
      const photoPayload = await Promise.all(
        photos.filter((p) => p.status === "ready").map(async (p) => ({
          base64: await toBase64(p.file),
          caption: p.caption,
        }))
      );

      const res = await fetch("/api/photo-albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentRegistrationId: selectedStudent.id,
          childFirstName: selectedStudent.childInfo.firstName,
          childNickname: selectedStudent.childInfo.nickname || "",
          parentEmail: selectedStudent.parentInfo.email,
          program: selectedStudent.program,
          programName: prog?.name || selectedStudent.program,
          classTime: selectedStudent.classTime,
          sessionDate,
          note,
          photos: photoPayload,
          actorUid,
          actorName,
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || "Failed to create album"); return; }
      onCreated(data.data);
      onClose();
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const prog = selectedStudent ? PROGRAMS.find((p) => p.id === selectedStudent.program) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <m.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative z-10 w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-t-[2rem] sm:rounded-[2rem] bg-white shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#0033A0]/50">Photo Albums</p>
            <h2 className="font-headline text-[20px] font-extrabold text-[#0f172a]">New Photo Album</h2>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-[#64748b] hover:bg-slate-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Select student */}
          {step === "select" && (
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[12px] font-black uppercase tracking-widest text-[#0033A0]/60 mb-2">Search Student</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type child's name…"
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-[14px] font-semibold text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#0033A0]/30 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filtered.length === 0 && (
                  <p className="text-center text-[13px] text-[#94a3b8] py-8">No students found</p>
                )}
                {filtered.map((s) => {
                  const p = PROGRAMS.find((p) => p.id === s.program);
                  const isSelected = selectedStudent?.id === s.id;
                  
                  const shortName = p?.name?.includes(":") ? p.name.split(":")[1].trim() : p?.name;
                  const c = (p as any)?.classes?.find((x: any) => x.name === s.classTime);
                  const timeStr = c ? ` (${c.time})` : "";

                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudent(s)}
                      className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                        isSelected ? "bg-[#0033A0] text-white" : "bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFC107]/20 text-[14px] font-black text-[#0033A0]">
                        {s.childInfo.firstName[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[14px] font-bold truncate ${isSelected ? "text-white" : "text-[#0f172a]"}`}>
                          {s.childInfo.firstName} {s.childInfo.lastName}
                          {s.childInfo.nickname && <span className="opacity-60 font-medium"> "{s.childInfo.nickname}"</span>}
                        </p>
                        <p className={`text-[11px] truncate ${isSelected ? "text-white/70" : "text-[#94a3b8]"}`}>
                          {shortName} · {s.classTime}{timeStr}
                        </p>
                      </div>
                      {isSelected && <span className="text-white text-[16px]">✓</span>}
                    </button>
                  );
                })}
              </div>

              {selectedStudent && (
                <div className="rounded-xl bg-[#f0f6ff] border border-[#dbeafe] p-4 space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#0033A0]/60">Selected student details</p>
                  <div className="grid grid-cols-2 gap-3 text-[13px]">
                    <div>
                      <p className="text-[#94a3b8] font-semibold">Parent email</p>
                      <p className="font-bold text-[#0f172a] truncate">{selectedStudent.parentInfo.email}</p>
                    </div>
                    <div>
                      <p className="text-[#94a3b8] font-semibold">Class</p>
                      <p className="font-bold text-[#0f172a]">
                        {selectedStudent.classTime}
                        {(() => {
                          const p = PROGRAMS.find((x) => x.id === selectedStudent.program);
                          const c = (p as any)?.classes?.find((x: any) => x.name === selectedStudent.classTime);
                          return c ? ` (${c.time})` : "";
                        })()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-[#0033A0]/60 mb-1.5">Session Date</label>
                    <CustomDatePicker
                      selectedDate={sessionDate}
                      onChange={setSessionDate}
                      triggerClassName="w-full rounded-xl border-2 border-[#dbeafe] bg-white px-3 py-2 text-[13px] font-bold text-[#0f172a] focus:outline-none focus:border-[#0033A0]/40 text-left flex justify-between items-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-[#0033A0]/60 mb-1.5">Teacher note (optional)</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="Something special about today's session…"
                      className="w-full rounded-xl border-2 border-[#dbeafe] bg-white px-3 py-2 text-[13px] font-medium text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#0033A0]/40 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Upload photos */}
          {step === "upload" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-[#64748b]">
                  {photos.filter(p => p.status === "ready").length} / 30 photos ready
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photos.length >= 30}
                  className="flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-[13px] font-bold text-white shadow-md shadow-[#0033A0]/20 hover:bg-[#002580] disabled:opacity-50"
                >
                  + Add Photos
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              {photos.length === 0 ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="group w-full flex h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#c7d7f5] bg-[#f8fafc] hover:border-[#0033A0] hover:bg-[#f0f6ff] transition-all"
                >
                  <span className="text-4xl mb-3 transition-transform group-hover:scale-110">📸</span>
                  <p className="text-[14px] font-bold text-[#0033A0]">Click to upload photos</p>
                  <p className="text-[12px] text-[#94a3b8] mt-1">Up to 30 photos · auto-compressed</p>
                </button>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <AnimatePresence>
                    {photos.map((p, i) => (
                      <m.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 group"
                      >
                        <Image src={p.previewUrl} alt="" fill className="object-cover" sizes="180px" />
                        {p.status === "compressing" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          </div>
                        )}
                        <button
                          onClick={() => {
                            URL.revokeObjectURL(p.previewUrl);
                            setPhotos((prev) => prev.filter((x) => x.id !== p.id));
                          }}
                          className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        >✕</button>
                      </m.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === "confirm" && selectedStudent && (
            <div className="p-6 space-y-5">
              <div className="rounded-2xl bg-[#f0f6ff] border border-[#dbeafe] p-5 space-y-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-[#0033A0]/60">Album Preview</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFC107]/20 text-[18px] font-black text-[#0033A0]">
                    {selectedStudent.childInfo.firstName[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-headline text-[16px] font-extrabold text-[#0f172a]">
                      {selectedStudent.childInfo.firstName}
                      {selectedStudent.childInfo.nickname && <span className="text-[#64748b] font-medium text-[13px]"> "{selectedStudent.childInfo.nickname}"</span>}
                    </p>
                    <p className="text-[12px] text-[#0033A0] font-bold">{selectedStudent.classTime} · {fmtDate(sessionDate)}</p>
                    <p className="text-[11px] text-[#94a3b8]">{prog?.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div><p className="text-[#94a3b8] font-semibold">Parent email</p><p className="font-bold text-[#0f172a]">{selectedStudent.parentInfo.email}</p></div>
                  <div><p className="text-[#94a3b8] font-semibold">Photos</p><p className="font-bold text-[#0f172a]">{photos.filter(p => p.status === "ready").length} photos</p></div>
                  <div><p className="text-[#94a3b8] font-semibold">Expires</p><p className="font-bold text-amber-600">3 days from now</p></div>
                  <div><p className="text-[#94a3b8] font-semibold">Email</p><p className="font-bold text-[#0f172a]">Sent separately after creating</p></div>
                </div>
                {note && (
                  <div className="rounded-xl bg-white border border-[#dbeafe] px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#0033A0]/60 mb-1">Teacher note</p>
                    <p className="text-[13px] text-[#334155]">{note}</p>
                  </div>
                )}
              </div>

              {/* Preview grid */}
              <div className="grid grid-cols-5 gap-1.5">
                {photos.filter(p => p.status === "ready").slice(0, 10).map((p) => (
                  <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                    <Image src={p.previewUrl} alt="" fill className="object-cover" sizes="80px" />
                  </div>
                ))}
                {photos.filter(p => p.status === "ready").length > 10 && (
                  <div className="aspect-square rounded-lg bg-slate-100 flex items-center justify-center text-[12px] font-bold text-[#64748b]">
                    +{photos.filter(p => p.status === "ready").length - 10}
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[13px] font-semibold text-red-600">{error}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-5 border-t border-slate-100 shrink-0 bg-white">
          {step !== "select" && (
            <button
              onClick={() => setStep(step === "confirm" ? "upload" : "select")}
              className="flex items-center gap-1.5 text-[13px] font-bold text-[#64748b] hover:text-[#0033A0] transition-colors"
            >
              ← Back
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-[13px] font-bold text-[#64748b] hover:bg-slate-50">
              Cancel
            </button>
            {step === "select" && (
              <button
                disabled={!selectedStudent || !sessionDate}
                onClick={() => setStep("upload")}
                className="rounded-xl bg-[#0033A0] px-5 py-2.5 text-[13px] font-bold text-white shadow-md shadow-[#0033A0]/20 hover:bg-[#002580] disabled:opacity-40"
              >
                Next: Upload Photos →
              </button>
            )}
            {step === "upload" && (
              <button
                disabled={photos.filter(p => p.status === "ready").length === 0}
                onClick={() => setStep("confirm")}
                className="rounded-xl bg-[#0033A0] px-5 py-2.5 text-[13px] font-bold text-white shadow-md shadow-[#0033A0]/20 hover:bg-[#002580] disabled:opacity-40"
              >
                Next: Review →
              </button>
            )}
            {step === "confirm" && (
              <button
                disabled={submitting || photos.filter(p => p.status === "ready").length === 0}
                onClick={handleSubmit}
                className="flex items-center gap-2 rounded-xl bg-[#FFC107] px-5 py-2.5 text-[13px] font-bold text-[#003399] shadow-md shadow-[#FFC107]/30 hover:bg-[#ffb800] disabled:opacity-50"
              >
                {submitting ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#003399]/30 border-t-[#003399]" />Uploading…</>
                ) : "✅ Create Album"}
              </button>
            )}
          </div>
        </div>
      </m.div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PhotoAlbumsPage() {
  const { user, userProfile } = useAuth();
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewTarget, setViewTarget] = useState<PhotoAlbum | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PhotoAlbum | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [filter, setFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("ALL");

  useEffect(() => {
    fetch("/api/photo-albums")
      .then((r) => r.json())
      .then((d) => { if (d.success) setAlbums(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/photo-albums?id=${deleteTarget.id}&actorUid=${user?.uid}&actorName=${encodeURIComponent(userProfile?.fullName || user?.email || "")}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        setAlbums((prev) => prev.filter((a) => a.id !== deleteTarget.id));
        setToast({ msg: "Album deleted successfully 🗑️", type: "success" });
      } else {
        setToast({ msg: data.error || "Failed to delete", type: "error" });
      }
    } catch {
      setToast({ msg: "Network error", type: "error" });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleSendEmail(album: PhotoAlbum) {
    setSendingId(album.id);
    try {
      const res = await fetch("/api/photo-albums/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          albumId: album.id,
          actorUid: user?.uid,
          actorName: userProfile?.fullName || user?.email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAlbums((prev) =>
          prev.map((a) => a.id === album.id ? { ...a, emailSent: true, emailSentAt: new Date().toISOString() } : a)
        );
        setToast({ msg: `Email sent to ${album.parentEmail} 📧`, type: "success" });
      } else {
        setToast({ msg: data.error || "Failed to send email", type: "error" });
      }
    } catch {
      setToast({ msg: "Network error sending email", type: "error" });
    } finally {
      setSendingId(null);
    }
  }

  const filteredAlbums = albums.filter((a) => {
    const q = filter.toLowerCase();
    const textMatch = a.childFirstName.toLowerCase().includes(q) ||
      a.sessionLabel.toLowerCase().includes(q) ||
      a.programName.toLowerCase().includes(q) ||
      (a.childNickname || "").toLowerCase().includes(q) ||
      a.parentEmail.toLowerCase().includes(q);
      
    const progMatch = programFilter === "ALL" || a.programName === programFilter;
    const timeMatch = timeFilter === "ALL" || a.classTime === timeFilter;
    
    return textMatch && progMatch && timeMatch;
  });

  const programOptions = [
    { value: "ALL", label: "All Programs" },
    ...PROGRAMS.map((p) => {
      const shortName = p.name.includes(":") ? p.name.split(":")[1].trim() : p.name;
      return { value: p.name, label: shortName };
    })
  ];

  const allClassTimes = Array.from(
    new Set(PROGRAMS.flatMap((p: any) => (p.classes || []).map((c: any) => c.name)))
  );

  const timeOptions = [
    { value: "ALL", label: "All Schedules" },
    ...allClassTimes.map((t) => ({ value: t as string, label: t as string }))
  ];

  return (
    <>
      <AppShell
        title="Photo Albums"
        description="Send session highlights directly to parents. Albums expire automatically after 3 days."
      >
        {/* Top bar */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-2xl">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by student, email…"
              className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2 sm:py-2.5 text-[13px] font-medium text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-1 focus:ring-[#005cc8] focus:border-[#005cc8] shadow-sm flex-1"
            />
            <div className="w-full sm:w-48 z-20">
              <CustomSelect options={programOptions} value={programFilter} onChange={setProgramFilter} />
            </div>
            <div className="w-full sm:w-40 z-10">
              <CustomSelect options={timeOptions} value={timeFilter} onChange={setTimeFilter} />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[13px] font-semibold text-[#94a3b8] hidden lg:inline">{albums.length} album{albums.length !== 1 ? "s" : ""}</span>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 sm:px-5 py-2 sm:py-2.5 text-[14px] font-bold text-white shadow-md shadow-[#0033A0]/20 hover:bg-[#002580] transition-colors"
            >
              <span>+</span> New Photo Album
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-[#fff8e1] border border-[#fde68a] px-4 py-3">
          <span className="text-lg shrink-0">⏰</span>
          <p className="text-[12px] font-semibold text-[#92400e]">
            Albums are automatically deleted after <strong>3 days</strong>. Parents should save photos before the link expires. 
            Always send the email after creating the album.
          </p>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-3 border-[#0033A0]/20 border-t-[#0033A0]" />
          </div>
        ) : filteredAlbums.length === 0 ? (
          <button
            onClick={() => setShowCreate(true)}
            className="group w-full flex h-64 flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-[#c7d7f5] bg-[#f8fafc] hover:border-[#0033A0] hover:bg-[#f0f6ff] transition-all"
          >
            <span className="text-4xl mb-3 transition-transform group-hover:scale-110">📸</span>
            <p className="text-[15px] font-bold text-[#0033A0]">{filter ? "No albums match your filter" : "No photo albums yet"}</p>
            <p className="text-[13px] text-[#94a3b8] mt-1">{filter ? "Try a different search" : "Click here to create your first album"}</p>
          </button>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {filteredAlbums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  onDelete={setDeleteTarget}
                  onSendEmail={handleSendEmail}
                  isSending={sendingId === album.id}
                  onView={setViewTarget}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </AppShell>

      {/* View panel */}
      <AnimatePresence>
        {viewTarget && (
          <ViewAlbumPanel
            album={viewTarget}
            onClose={() => setViewTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Create panel */}
      <AnimatePresence>
        {showCreate && (
          <CreatePanel
            onClose={() => setShowCreate(false)}
            onCreated={(album) => setAlbums((prev) => [album, ...prev])}
            actorUid={user?.uid}
            actorName={userProfile?.fullName || user?.email || "Admin"}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirm
          album={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <m.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-full px-6 py-3 text-white shadow-xl ${
              toast.type === "success" ? "bg-emerald-500 shadow-emerald-500/20" : "bg-red-500 shadow-red-500/20"
            }`}
          >
            <span className="text-[14px] font-bold">{toast.msg}</span>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
