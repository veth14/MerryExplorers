"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { PROGRAM_SLOTS } from "@/data/landing";
import Tesseract from "tesseract.js";
import WaiverGate from "@/components/WaiverGate";
import VirtualOnboardingModal from "@/components/VirtualOnboardingModal";
import VirtualDashboard from "@/components/VirtualDashboard";

// ─── Types ────────────────────────────────────────────────────────────────────

type EmergencyContact = { name: string; relationship: string; phone: string };

type PhotoItem = { url: string; caption: string };

type Album = {
  id: string;
  accessCode: string;
  childFirstName: string;
  childNickname: string;
  programName: string;
  classTime: string;
  sessionLabel: string;
  sessionDate: string;
  note: string;
  photoCount: number;
  expiresAt: string | null;
  createdAt: string;
  photos: PhotoItem[];
};

type ParentProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  relationship: string;
  childName: string;
  program: string;
  schedule: string;
  classTime: string;
  status: string;
  avatarUrl: string;
  avatarColor: string;
  initials: string;
  albums: Album[];
  waiverSignature?: string;
  waiverSignedAt?: string;
  photoConsent?: boolean;
  virtualSessionLink?: string;
  virtualSessionTime?: string;
  needsSessionPayment?: boolean;
  virtualSessionsCompleted?: number;
  renewalLink?: string;
  studyMaterials?: {
    id: string;
    title: string;
    url: string;
    type: string;
    createdAt?: string;
    submission?: {
      key: string;
      fileName: string;
      fileType: string;
      size: number;
      submittedAt: string;
    };
  }[];
  sessionPayments?: {
    id: string;
    amountPaid: number;
    paymentMethod: string;
    referenceNumber?: string;
    receiptBase64?: string;
    submittedAt: string;
    verified: boolean;
    rejected: boolean;
  }[];
  studentInfo?: {
    id: string;
    registrationId: string;
    program: string;
    programName: string;
    classTime: string;
    schedule: string;
    enrolledAt: string;
    status: string;
    childInfo: {
      firstName: string;
      lastName: string;
      nickname?: string;
      dateOfBirth?: string;
      gender?: string;
      healthProfile?: string;
      favoriteSong?: string;
      favoriteColor?: string;
      favoriteCharacter?: string;
      avatarUrl?: string;
    };
  } | null;
  hasCompletedVirtualSurvey?: boolean;
  childInfo?: {
    firstName?: string;
    lastName?: string;
    nickname?: string;
    dateOfBirth?: string;
    gender?: string;
    healthProfile?: string;
    favoriteSong?: string;
    favoriteColor?: string;
    favoriteCharacter?: string;
    avatarUrl?: string;
  };
  renewalStatus?: {
    hasSubmitted: boolean;
    returning: string;
    notes: string;
    reason: string;
    submittedAt: string;
    downpayment?: {
      submitted: boolean;
      paymentMethod: string;
      receiptBase64: string;
      referenceNumber: string;
      amountPaid: number;
      submittedAt: string;
      verified: boolean;
      rejected: boolean;
    };
  };
  promoCode?: string;
  promoDiscount?: {
    originalPrice: number;
    discountAmount: number;
    finalPrice: number;
    description: string;
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(str: string) {
  return new Date(str).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Date + time in Manila time, e.g. "Sat, Oct 3, 11:59 PM PHT"
function fmtExpiry(str: string) {
  return (
    new Date(str).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Manila",
    }) + " PHT"
  );
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// Trailblazer = program slug "brave-explorer", or the program name says so
function isTrailblazerProfile(profile: ParentProfile): boolean {
  const re = /trailblazer|brave explorer/i;
  return (
    profile.program === "brave-explorer" ||
    profile.studentInfo?.program === "brave-explorer" ||
    re.test(profile.program || "") ||
    re.test(profile.studentInfo?.programName || "")
  );
}

function parseScheduleDays(schedule: string): number[] {
  const days: number[] = [];
  const s = schedule.toLowerCase();
  if (s.includes("monday – friday") || s.includes("monday - friday")) {
    return [1, 2, 3, 4, 5];
  }
  if (s.includes("monday")) days.push(1);
  if (s.includes("tuesday")) days.push(2);
  if (s.includes("wednesday")) days.push(3);
  if (s.includes("thursday")) days.push(4);
  if (s.includes("friday")) days.push(5);
  if (s.includes("saturday")) days.push(6);
  if (s.includes("sunday")) days.push(0);
  return days;
}

function parseStartTime(classTime: string): { hour: number; minute: number } | null {
  // e.g. "9:45 AM – 11:00 AM" or "4:25 PM - 5:25 PM"
  const match = classTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return { hour, minute: min };
}

function getNextSessionDate(schedule: string, classTime: string): Date | null {
  const days = parseScheduleDays(schedule);
  const time = parseStartTime(classTime);
  if (days.length === 0 || !time) return null;

  const now = new Date();
  let candidate = new Date(now);
  candidate.setHours(time.hour, time.minute, 0, 0);

  // If today is a session day, check if it's already past the start time
  if (days.includes(now.getDay()) && candidate > now) {
    return candidate;
  }

  // Otherwise, find the next day
  for (let i = 1; i <= 7; i++) {
    candidate = new Date(now);
    candidate.setDate(now.getDate() + i);
    if (days.includes(candidate.getDay())) {
      candidate.setHours(time.hour, time.minute, 0, 0);
      return candidate;
    }
  }
  return null;
}

function parseEndTime(classTime: string): { hour: number; minute: number } | null {
  const matches = [...classTime.matchAll(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi)];
  if (matches.length < 2) return null;
  const match = matches[1];
  let hour = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return { hour, minute: min };
}

function getCompletedSessionsCount(enrolledAtStr: string | undefined, schedule: string, classTime: string): number {
  if (!enrolledAtStr) return 0;
  const days = parseScheduleDays(schedule);
  const endTime = parseEndTime(classTime) || parseStartTime(classTime);
  if (days.length === 0 || !endTime) return 0;

  const startDate = new Date(enrolledAtStr);
  startDate.setHours(0, 0, 0, 0);

  const now = new Date();
  let count = 0;
  let current = new Date(startDate);

  while (current <= now) {
    if (days.includes(current.getDay())) {
      const isToday = current.toDateString() === now.toDateString();
      if (isToday) {
        const endOfClassToday = new Date(now);
        endOfClassToday.setHours(endTime.hour, endTime.minute, 0, 0);
        if (now >= endOfClassToday) {
          count++;
        }
      } else {
        count++;
      }
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  const NAVY = "#0b2a82";
  const SUN = "#ffd23f";
  const SUN_LIGHT = "#ffe066";
  const SUN_DEEP = "#ffb82e";

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh",
      background: "linear-gradient(120deg, #f2faff, #e0f2fe, #dbeafe, #f2faff)",
      backgroundSize: "300% 300%",
      animation: "me-bg-pan 8s ease infinite"
    }}>
      <style>{`
        @keyframes me-bg-pan {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes me-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes me-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.98); }
        }
      `}</style>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          width: "72px", height: "72px",
          background: `linear-gradient(${SUN_LIGHT}, ${SUN} 50%, ${SUN_DEEP})`,
          border: `4px solid ${NAVY}`,
          borderRadius: "22px",
          boxShadow: `0 6px 0 ${NAVY}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "34px",
          animation: "me-bounce 1s ease-in-out infinite",
          marginBottom: "24px"
        }}>
          🚀
        </div>
        <p style={{ color: NAVY, fontSize: "18px", fontWeight: "800", margin: 0, animation: "me-pulse 1.5s ease-in-out infinite" }}>
          Loading dashboard...
        </p>
      </div>
    </div>
  );
}

function Avatar({ profile }: { profile: ParentProfile }) {
  if (profile.avatarUrl) {
    return <img src={profile.avatarUrl} alt={profile.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  }
  return <span style={{ fontSize: "22px", fontWeight: "800", color: "white" }}>{profile.initials || "?"}</span>;
}

// Lightbox
function Lightbox({ photos, startIndex, onClose }: { photos: PhotoItem[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const total = photos.length;
  const photo = photos[idx];

  const prev = useCallback(() => setIdx((i) => (i - 1 + total) % total), [total]);
  const next = useCallback(() => setIdx((i) => (i + 1) % total), [total]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <button
        onClick={(e) => { e.stopPropagation(); prev(); }}
        style={{ position: "absolute", left: "20px", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: "48px", height: "48px", color: "white", fontSize: "22px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      >‹</button>

      <div style={{ maxWidth: "90vw", maxHeight: "85vh", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <img src={photo.url} alt={photo.caption} style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain", borderRadius: "12px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }} />
        {photo.caption && (
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", marginTop: "12px", fontWeight: "500" }}>{photo.caption}</p>
        )}
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginTop: "6px" }}>{idx + 1} / {total}</p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); next(); }}
        style={{ position: "absolute", right: "20px", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: "48px", height: "48px", color: "white", fontSize: "22px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      >›</button>

      <button
        onClick={async (e) => {
          e.stopPropagation();
          try {
            const res = await fetch(photo.url);
            const blob = await res.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = objectUrl;
            a.download = `merry_explorers_photo_${idx + 1}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(objectUrl);
          } catch (err) {
            console.error("Failed to download image", err);
            // Fallback for cross-origin issues
            window.open(photo.url, "_blank");
          }
        }}
        style={{ position: "absolute", top: "20px", right: "70px", background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: "40px", height: "40px", color: "white", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        title="Download photo"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
      </button>

      <button
        onClick={onClose}
        style={{ position: "absolute", top: "20px", right: "20px", background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: "40px", height: "40px", color: "white", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      >✕</button>
    </div>
  );
}

// ─── File Viewer Modal ─────────────────────────────────────────────────────────

type FileViewerState = {
  title: string;
  url: string;         // presigned view URL
  contentType: string; // e.g. "application/pdf", "image/png"
  uid: string;         // account uid — needed to re-sign for download
  materialId: string;  // material id  — needed to re-sign for download
  fileKey?: string;    // actual file key in B2
  submission?: {       // parent's submitted (edited) file, if any
    key: string;
    fileName: string;
    fileType: string;
    submittedAt: string;
  };
};

// Spinning keyframe injected once at module level (server-safe guard)
if (typeof document !== "undefined" && !document.getElementById("me-spin-style")) {
  const s = document.createElement("style");
  s.id = "me-spin-style";
  s.textContent = `@keyframes me-spin{to{transform:rotate(360deg)}} @keyframes me-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`;
  document.head.appendChild(s);
}

function FileViewerModal({ viewer, onClose }: { viewer: FileViewerState; onClose: () => void }) {
  const { title, url, contentType, fileKey } = viewer;
  const isImage = contentType.startsWith("image/");
  const lowerTitle = title.toLowerCase();
  const lowerKey = (fileKey || "").toLowerCase();

  const isPdf = contentType === "application/pdf" ||
    contentType.includes("pdf") ||
    lowerTitle.endsWith(".pdf") ||
    lowerKey.endsWith(".pdf");
  const isOffice =
    contentType.includes("spreadsheet") ||
    contentType.includes("presentation") ||
    contentType.includes("wordprocessing") ||
    contentType === "application/msword" ||
    contentType === "application/vnd.ms-excel" ||
    contentType === "application/vnd.ms-powerpoint" ||
    lowerTitle.endsWith(".xlsx") || lowerTitle.endsWith(".xls") ||
    lowerTitle.endsWith(".docx") || lowerTitle.endsWith(".doc") ||
    lowerTitle.endsWith(".pptx") || lowerTitle.endsWith(".ppt") ||
    lowerKey.endsWith(".xlsx") || lowerKey.endsWith(".xls") ||
    lowerKey.endsWith(".docx") || lowerKey.endsWith(".doc") ||
    lowerKey.endsWith(".pptx") || lowerKey.endsWith(".ppt");

  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  // landscape = wide modal; portrait = default narrower modal
  const [isLandscape, setIsLandscape] = useState(false);

  function getFileInfo(): { icon: string; label: string } {
    const lower = title.toLowerCase();
    if (isImage) return { icon: "🖼️", label: "Image" };
    if (lower.endsWith(".pdf") || contentType === "application/pdf") return { icon: "📕", label: "PDF" };
    if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".avi")) return { icon: "🎬", label: "Video" };
    if (lower.endsWith(".doc") || lower.endsWith(".docx")) return { icon: "📝", label: "Document" };
    if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return { icon: "📊", label: "Slides" };
    if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) return { icon: "📈", label: "Spreadsheet" };
    return { icon: "📄", label: "File" };
  }

  const { icon, label } = getFileInfo();

  // Download: prefer the parent's submitted (edited) file; fall back to original.
  const hasSubmission = !!viewer.submission;

  async function handleDownload() {
    try {
      let downloadUrl: string;

      if (hasSubmission && viewer.submission?.key) {
        // Download the parent's submitted/edited version
        const dlRes = await fetch(
          `/api/files/download-url?submissionKey=${encodeURIComponent(viewer.submission.key)}&download=1`
        );
        const dlData = await dlRes.json();
        downloadUrl = dlData.success && dlData.url ? dlData.url : url;
      } else {
        // Download the original teacher file
        const dlRes = await fetch(
          `/api/files/download-url?uid=${encodeURIComponent(viewer.uid)}&materialId=${encodeURIComponent(viewer.materialId)}&download=1`
        );
        const dlData = await dlRes.json();
        downloadUrl = dlData.success && dlData.url ? dlData.url : url;
      }

      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";
      iframe.src = downloadUrl;
      document.body.appendChild(iframe);
      setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* already removed */ } }, 30000);
    } catch {
      window.location.href = url;
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Modal card dimensions vary by orientation mode
  const cardWidth = isLandscape ? "min(98vw, 1400px)" : "min(92vw, 820px)";
  const cardHeight = isLandscape ? "96vh" : "min(92vh, 960px)";

  const NAVY = "#0b2a82";
  const SUN = "#ffd23f";
  const SUN_LIGHT = "#ffe066";
  const SUN_DEEP = "#ffb82e";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(0,15,40,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: isLandscape ? "12px" : "20px", animation: "fadeUp 0.2s ease"
      }}
      onClick={onClose}
    >
      {/* ── Modal card wrapper ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative",
          width: cardWidth,
          height: cardHeight,
          transition: "width 0.3s ease, height 0.3s ease",
        }}
      >
        {/* Tape Accent */}
        <span style={{ 
          position: "absolute", top: "-18px", left: "50%", width: "110px", height: "32px", marginLeft: "-55px", 
          transform: "rotate(3deg)", 
          background: `repeating-linear-gradient(45deg, ${SUN} 0 10px, ${SUN_LIGHT} 10px 20px)`, 
          border: `2px solid rgba(11,42,130,0.15)`, 
          borderRadius: "6px", 
          zIndex: 100,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.4)",
          opacity: 0.95
        }} aria-hidden="true" />

        <div
          style={{
            width: "100%", height: "100%",
            display: "flex", flexDirection: "column",
            borderRadius: isLandscape ? "20px" : "28px",
            overflow: "hidden",
            background: "#fff",
            border: `4px solid ${NAVY}`,
            boxShadow: `0 0 0 6px #fff, 0 16px 32px rgba(0,15,40,0.25)`,
            transition: "border-radius 0.3s ease",
          }}
        >
        {/* ── Header ── */}
        <div style={{
          flexShrink: 0,
          background: "#fff",
          padding: "16px 20px",
          display: "flex", alignItems: "center", gap: "14px",
          borderBottom: `4px solid #f1f5f9`,
          position: "relative", zIndex: 5
        }}>
          {/* Icon badge */}
          <div style={{ 
            width: "48px", height: "48px", borderRadius: "14px",
            background: `linear-gradient(${SUN_LIGHT}, ${SUN} 50%, ${SUN_DEEP})`,
            border: `3px solid ${NAVY}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "24px", flexShrink: 0,
            boxShadow: `0 4px 0 ${NAVY}`
          }}>
            {icon}
          </div>

          {/* Title */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontWeight: "800", fontSize: "20px", color: NAVY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "2px" }}>
              {title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#0050d5", background: "#e8f0fe", padding: "2px 10px", borderRadius: "12px", border: "1px solid #c2dcf6" }}>{label}</span>
            </div>
          </div>

          {/* Landscape / Portrait toggle */}
          <button
            onClick={() => setIsLandscape(v => !v)}
            title={isLandscape ? "Switch to portrait view" : "Switch to landscape (wide) view"}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 14px",
              background: "#fff",
              border: `2px solid ${NAVY}`,
              borderRadius: "12px",
              color: NAVY, fontWeight: "700", fontSize: "13px",
              cursor: "pointer", flexShrink: 0,
              boxShadow: `0 3px 0 ${NAVY}`,
              transition: "transform 0.1s, box-shadow 0.1s",
            }}
            onMouseOver={e => { e.currentTarget.style.transform = "translateY(2px)"; e.currentTarget.style.boxShadow = `0 1px 0 ${NAVY}`; }}
            onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 3px 0 ${NAVY}`; }}
          >
            {isLandscape ? (
              <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="6" width="20" height="12" rx="2" /></svg> Portrait</>
            ) : (
              <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2" /></svg> Landscape</>
            )}
          </button>

          {/* Open in New Tab */}
          <button
            onClick={() => window.open(url, "_blank")}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 16px",
              background: `linear-gradient(${SUN_LIGHT}, ${SUN} 50%, ${SUN_DEEP})`,
              border: `2px solid ${NAVY}`,
              borderRadius: "12px",
              color: NAVY, fontWeight: "700", fontSize: "13px",
              cursor: "pointer", flexShrink: 0,
              boxShadow: `0 3px 0 ${NAVY}`,
              transition: "transform 0.1s, box-shadow 0.1s",
            }}
            onMouseOver={e => { e.currentTarget.style.transform = "translateY(2px)"; e.currentTarget.style.boxShadow = `0 1px 0 ${NAVY}`; }}
            onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 3px 0 ${NAVY}`; }}
            title="Open in new tab (Use this to edit/draw on iPad)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open to Edit
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            style={{ width: "38px", height: "38px", borderRadius: "12px", background: "#fff", border: `2px solid ${NAVY}`, color: NAVY, fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: "700", boxShadow: `0 3px 0 ${NAVY}`, transition: "all 0.1s" }}
            onMouseOver={e => { e.currentTarget.style.transform = "translateY(2px)"; e.currentTarget.style.boxShadow = `0 1px 0 ${NAVY}`; e.currentTarget.style.background = "#fff0f0"; e.currentTarget.style.color = "#b3261e"; e.currentTarget.style.borderColor = "#b3261e"; }}
            onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 3px 0 ${NAVY}`; e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = NAVY; e.currentTarget.style.borderColor = NAVY; }}
            title="Close (Esc)"
          >✕</button>
        </div>

        {/* ── Viewer body ── */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative", background: isOffice ? "#f8fafc" : isPdf ? "#334155" : "#f1f5f9" }}>

          {/* ── IMAGE ── */}
          {isImage && (
            <div style={{ width: "100%", height: "100%", overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
              <img src={url} alt={title} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.1), 0 0 0 2px rgba(11,42,130,0.1)" }} />
            </div>
          )}

          {/* ── PDF — browser renders natively ── */}
          {!isImage && isPdf && (
            <iframe
              key={`${url}-${isLandscape}`}
              src={url}
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              title={title}
            />
          )}

          {/* ── OFFICE (xlsx/docx/pptx) — external viewers can't reliably access B2
               presigned URLs, so show a kid-friendly download card ── */}
          {!isImage && !isPdf && isOffice && (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
              <div style={{ textAlign: "center", maxWidth: "380px" }}>
                {/* Big bouncy file icon */}
                <div style={{ fontSize: "80px", lineHeight: 1, marginBottom: "16px", filter: "drop-shadow(0 8px 16px rgba(11,42,130,0.15))" }}>
                  {icon}
                </div>
                <div style={{ fontWeight: "700", fontSize: "20px", color: NAVY, marginBottom: "8px", letterSpacing: "-0.3px" }}>{title}</div>
                <div style={{ fontSize: "14px", color: "#3d5a99", marginBottom: "28px", lineHeight: "1.6", fontWeight: "500" }}>
                  This file is ready to open in <strong>{label === "Spreadsheet" ? "Microsoft Excel or Google Sheets" : label === "Slides" ? "Microsoft PowerPoint or Google Slides" : "Microsoft Word or Google Docs"}</strong>.
                  <br />Download it below and open it with your app! 🎉
                </div>
                {/* Big download button */}
                <button
                  onClick={handleDownload}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "10px",
                    padding: "14px 32px",
                    background: `linear-gradient(${SUN_LIGHT}, ${SUN} 50%, ${SUN_DEEP})`,
                    border: `3px solid ${NAVY}`,
                    borderRadius: "20px",
                    color: NAVY, fontWeight: "700", fontSize: "16px",
                    cursor: "pointer",
                    boxShadow: `0 6px 0 ${NAVY}`,
                    transition: "transform 0.1s, box-shadow 0.1s",
                  }}
                  onMouseOver={e => { e.currentTarget.style.transform = "translateY(3px)"; e.currentTarget.style.boxShadow = `0 3px 0 ${NAVY}`; }}
                  onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 6px 0 ${NAVY}`; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download to Open
                </button>
                <div style={{ marginTop: "16px", fontSize: "12px", color: "#64748b", fontWeight: "500" }}>The file will download to your device 📥</div>
              </div>
            </div>
          )}

          {/* ── OTHER — show download card (avoids spurious iframe downloads) ── */}
          {!isImage && !isPdf && !isOffice && (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
              <div style={{ textAlign: "center", maxWidth: "380px" }}>
                <div style={{ fontSize: "80px", lineHeight: 1, marginBottom: "16px", filter: "drop-shadow(0 8px 16px rgba(11,42,130,0.15))" }}>{icon}</div>
                <div style={{ fontWeight: "700", fontSize: "20px", color: NAVY, marginBottom: "8px" }}>{title}</div>
                <div style={{ fontSize: "14px", color: "#3d5a99", marginBottom: "28px", lineHeight: "1.6", fontWeight: "500" }}>
                  This file can’t be previewed in the browser.<br />Download it to open it on your device! 🎉
                </div>
                <button
                  onClick={handleDownload}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "10px",
                    padding: "14px 32px",
                    background: `linear-gradient(${SUN_LIGHT}, ${SUN} 50%, ${SUN_DEEP})`,
                    border: `3px solid ${NAVY}`,
                    borderRadius: "20px",
                    color: NAVY, fontWeight: "700", fontSize: "16px",
                    cursor: "pointer",
                    boxShadow: `0 6px 0 ${NAVY}`,
                    transition: "transform 0.1s, box-shadow 0.1s",
                  }}
                  onMouseOver={e => { e.currentTarget.style.transform = "translateY(3px)"; e.currentTarget.style.boxShadow = `0 3px 0 ${NAVY}`; }}
                  onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 6px 0 ${NAVY}`; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download to Open
                </button>
                <div style={{ marginTop: "16px", fontSize: "12px", color: "#64748b", fontWeight: "500" }}>The file will download to your device 📥</div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}


// Countdown Timer
function NextSessionCountdown({ schedule, classTime }: { schedule: string; classTime: string }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const nextDate = getNextSessionDate(schedule, classTime);
    if (!nextDate) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = nextDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }

      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / 1000 / 60) % 60),
        s: Math.floor((diff / 1000) % 60),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [schedule, classTime]);

  if (!timeLeft) return null;

  return (
    <div style={{ display: "flex", gap: "8px", marginTop: "12px", background: "rgba(0,0,0,0.15)", padding: "12px", borderRadius: "12px" }}>
      {[
        { label: "DAYS", val: timeLeft.d },
        { label: "HOURS", val: timeLeft.h },
        { label: "MINS", val: timeLeft.m },
        { label: "SECS", val: timeLeft.s },
      ].map(({ label, val }, i) => (
        <div key={label} style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 4px" }}>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "white", lineHeight: 1 }}>{String(val).padStart(2, "0")}</div>
          <div style={{ fontSize: "9px", fontWeight: "700", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── WaiverAgreementText (read-only, reused in VirtualDashboard) ────────────────

function WaiverAgreementText() {
  return (
    <div className="waiver-ro">
      <style>{`
        .waiver-ro h3 { color: #0050d5; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px; margin: 18px 0 6px; }
        .waiver-ro p { margin: 0 0 10px; }
        .waiver-ro ul { margin: 0 0 10px; padding-left: 20px; }
        .waiver-ro li { margin-bottom: 4px; }
      `}</style>
      <p style={{ fontWeight: "800", color: "#002f76", fontSize: "14px", marginBottom: "12px" }}>MERRY EXPLORERS PLAYGROUP LEARNING CENTER<br />PARENT/GUARDIAN ACKNOWLEDGMENT &amp; AGREEMENT</p>
      <p>By registering my child with Merry Explorers Playgroup Learning Center, I confirm that I have read, understood, and agree to the following program terms and policies:</p>
      <h3>1. ADVENTURE / CYCLE</h3>
      <p>For Merry Explorers, &quot;Adventure&quot; means &quot;Cycle.&quot; Adventure 1, Adventure 2, Adventure 3, and so on refer to the succeeding stages of the program. An Adventure is not tied to a calendar month. A child progresses to the next Adventure once the required sessions for their program have been completed, including applicable make-up sessions. Adventure dates may therefore differ between programs.</p>
      <h3>2. PROGRAMS</h3>
      <p style={{ fontWeight: "700" }}>Discovery Club — Discover Through Play</p>
      <ul>
        <li>🔎 <strong>Discovery Club: Curious Explorer:</strong> Ages 1.5–4.11 | ₱4,295 (Pioneer Family); ₱4,395 (New Family) | 8 sessions | 1 hr/session</li>
        <li>🎨 <strong>Discovery Club: Creative Explorer:</strong> Ages 2.6–4.11 | ₱4,820 (Pioneer Family); ₱4,985 (New Family) | 12 sessions | 1 hr 15 mins/session</li>
        <li>🌈 <strong>Discovery Club: Everyday Curious:</strong> Ages 1.5–4.11 | ₱7,518 | 15 sessions | 1 hr/session</li>
      </ul>
      <p>Discovery Club provides a play-based environment that encourages socialization, interaction, shared play, and confidence-building.</p>
      <p style={{ fontWeight: "700" }}>💡 Trailblazer: Brave Explorer — Prepare for What&apos;s Next</p>
      <ul><li>Ages 3–4.11 | ₱6,900 | 18 sessions | 1 hr 15 mins/face-to-face session/shift to online</li></ul>
      <h3>3. REGISTRATION, PAYMENTS &amp; PENALTIES</h3>
      <p>60% non-refundable reservation fee upon registration. 40% balance due on or before the 6th session. 4% weekly interest on overdue balances. Accepted payments: Cash, GCash, BDO Bank Transfer, Credit/Debit Card (via GCash QR).</p>
      <h3>4. ATTENDANCE, ABSENCES &amp; MAKE-UP SESSIONS</h3>
      <p>Make-up sessions are subject to availability and must be completed within the current Adventure. Unused make-ups do not carry over. Merry Explorers may reschedule classes due to force majeure with a complimentary make-up session.</p>
      <h3>5. PHOTO &amp; VIDEO HIGHLIGHTS</h3>
      <p>Photos/videos are shared privately and deleted 30 days after sharing. If you do not consent, notify us in writing before the first session.</p>
      <h3>6. UNIFORM POLICY</h3>
      <p>The Merry Explorers uniform is the SAME uniform across chapters. Uniform Days: Wednesday &amp; Friday. Welcome Kit (₱750) and Lanyard &amp; Name Tag (₱200) available separately.</p>
      <div style={{ background: "#f0f5ff", border: "1.5px solid #c5d6ff", borderRadius: "10px", padding: "16px", marginTop: "16px" }}>
        <p style={{ fontWeight: "800", color: "#002f76", fontSize: "13px", marginBottom: "6px" }}>PARENT/GUARDIAN ACKNOWLEDGMENT</p>
        <p style={{ margin: 0 }}>I confirm that I have read, understood, and voluntarily agree to all terms and policies stated in this Agreement. By signing, I voluntarily acknowledge, accept, and agree to be bound by these terms as part of my child&apos;s registration with Merry Explorers Playgroup Learning Center.</p>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

type RenewalSettings = {
  currentAdventure: number;
  nextAdventureStart: string | null;
  renewalOpen: boolean;
  renewalOpenDate: string | null;
};

export default function ParentDashboardPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut("/parent/login");
  };

  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"session" | "photos" | "waiver" | "history" | "virtual" | "renewal" | "profile" | "folder" | "payments">("virtual");
  const [lightbox, setLightbox] = useState<{ album: Album; photoIdx: number } | null>(null);
  const [expandedAlbum, setExpandedAlbum] = useState<string | null>(null);
  const [fileViewer, setFileViewer] = useState<FileViewerState | null>(null);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [submittingForId, setSubmittingForId] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const submissionFileRef = useRef<HTMLInputElement>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditSurveyModal, setShowEditSurveyModal] = useState(false);
  const [renewalSettings, setRenewalSettings] = useState<RenewalSettings>({ currentAdventure: 1, nextAdventureStart: null, renewalOpen: false, renewalOpenDate: null });
  // We also cache the full per-program list so we can resolve after profile loads
  const [allRenewalPrograms, setAllRenewalPrograms] = useState<{ programKey: string; currentAdventure: number; nextAdventureStart: string | null; renewalOpen: boolean; renewalOpenDate: string | null; virtualLink?: string; virtualLinkOpen?: boolean }[]>([]);

  // Inline Renewal Form State
  const [showRenewalForm, setShowRenewalForm] = useState(false);
  const [renewalForm, setRenewalForm] = useState({ returning: "yes", notes: "", reason: "", agreed: false });
  const [submittingRenewal, setSubmittingRenewal] = useState(false);
  const [renewalSubmitted, setRenewalSubmitted] = useState(false);

  // Downpayment form state
  const [dpPaymentType, setDpPaymentType] = useState<"downpayment" | "full">("downpayment");
  const [dpPaymentMethod, setDpPaymentMethod] = useState("");
  const [dpReceiptPreview, setDpReceiptPreview] = useState("");
  const [dpReceiptBase64, setDpReceiptBase64] = useState("");
  const [dpReferenceNumber, setDpReferenceNumber] = useState("");
  const [dpAmountPaid, setDpAmountPaid] = useState("");
  const [submittingDp, setSubmittingDp] = useState(false);
  const [dpSubmitted, setDpSubmitted] = useState(false);
  const dpFileRef = useRef<HTMLInputElement>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);

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
        /\b(\d{10,20})\b/,
      ];

      let extractedRef = "";
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          extractedRef = match[1].replace(/\s+/g, "");
          break;
        }
      }

      if (extractedRef) setDpReferenceNumber(extractedRef);
    } catch {
      // OCR failed silently
    } finally {
      setOcrLoading(false);
      setOcrDone(true);
    }
  }, []);
  const [sessionPayments, setSessionPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // ─── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(msg: string, type: "success" | "error" | "info" = "info") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  // ─── openFile (shared by FOLDER tab and VirtualDashboard) ──────────────────
  async function openFile(m: any) {
    // External links (YouTube etc.) — open in new tab
    if (m.type === "link" || m.url) {
      let url = m.url;
      if (url && !/^https?:\/\//i.test(url)) {
        url = "https://" + url;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (loadingFileId === m.id) return; // prevent double-click
    setLoadingFileId(m.id);
    try {
      const res = await fetch(`/api/files/download-url?uid=${encodeURIComponent(profile?.id ?? "")}&materialId=${encodeURIComponent(m.id)}`);
      const data = await res.json();
      if (data.success && data.url) {
        setFileViewer({
          title: m.title || "File",
          url: data.url,
          contentType: m.contentType || "application/octet-stream",
          uid: profile?.id ?? "",
          materialId: m.id,
          fileKey: m.key,
          submission: m.submission,
        });
      } else {
        alert(data.error || "Could not open file.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoadingFileId(null);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/parent/login");
      return;
    }
    fetchProfile(user.uid);
    fetch("/api/renewal-settings")
      .then((r) => r.json())
      .then((d) => {
        // New per-program shape: { programs: [...] }
        if (Array.isArray(d.programs)) {
          setAllRenewalPrograms(d.programs);
        }
      })
      .catch(() => { });

    // Fetch session payment history
    setPaymentsLoading(true);
    fetch(`/api/parents/session-payment?uid=${user.uid}`)
      .then(r => r.json())
      .then(d => { if (d.success) setSessionPayments(d.payments); })
      .catch(() => { })
      .finally(() => setPaymentsLoading(false));
  }, [user, authLoading, router]);

  // Once both profile and allRenewalPrograms are loaded, resolve the right program entry
  useEffect(() => {
    if (!profile || allRenewalPrograms.length === 0) return;
    const match = allRenewalPrograms.find((p) => p.programKey === profile.program);
    if (match) {
      setRenewalSettings({
        currentAdventure: match.currentAdventure ?? 1,
        nextAdventureStart: match.nextAdventureStart,
        renewalOpen: match.renewalOpen,
        renewalOpenDate: match.renewalOpenDate,
      });
    }
  }, [profile, allRenewalPrograms]);

  async function fetchProfile(uid: string) {
    try {
      setLoading(true);
      const res = await fetch(`/api/parents?uid=${uid}`);
      if (!res.ok) {
        if (res.status === 403) {
          await handleSignOut();
          return;
        }
        throw new Error("Failed to load profile");
      }
      const data = await res.json();
      setProfile(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) return <Spinner />;

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#f0f7ff,#e8f0fe,#fdf4ff)", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif" }}>
        <div style={{ textAlign: "center", padding: "40px", background: "white", borderRadius: "20px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", maxWidth: "400px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>😔</div>
          <h2 style={{ color: "#002f76", fontSize: "20px", fontWeight: "800", margin: "0 0 8px" }}>Something went wrong</h2>
          <p style={{ color: "#64748b", fontSize: "14px" }}>{error}</p>
          <button onClick={() => user && fetchProfile(user.uid)} style={{ marginTop: "20px", padding: "10px 24px", background: "#0050d5", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>Try Again</button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  // Show waiver gate if not yet signed
  if (!profile.waiverSignature) {
    return (
      <WaiverGate
        profile={profile}
        onComplete={(sig, photoConsent) => setProfile((p) => p ? { ...p, waiverSignature: sig, waiverSignedAt: new Date().toISOString(), photoConsent } : p)}
      />
    );
  }

  const recentAlbum = profile.albums[0] ?? null;
  const waiverSigned = !!profile.waiverSignature;
  const isTrailblazer = isTrailblazerProfile(profile);
  const isVirtualSession =
    profile.program === "virtual-session" ||
    profile.program === "Virtual Tutorial" ||
    profile.studentInfo?.program === "virtual-session" ||
    profile.studentInfo?.program === "Virtual Tutorial";

  const childFavorites = profile.studentInfo?.childInfo || (profile as any).childInfo;
  const hasAnsweredFavorites = Boolean(
    childFavorites?.favoriteSong &&
    childFavorites?.favoriteColor &&
    childFavorites?.favoriteCharacter
  );
  const hasCompletedSurvey = Boolean(
    (profile as any).hasCompletedVirtualSurvey ||
    hasAnsweredFavorites
  );

  // Show virtual onboarding questionnaire on screen first if not yet answered
  if (isVirtualSession && !hasCompletedSurvey) {
    return (
      <VirtualOnboardingModal
        profile={profile}
        isGateMode={true}
        onSave={(updatedData) => {
          setProfile((p) => (p ? { ...p, ...updatedData } : p));
        }}
        showToast={showToast}
      />
    );
  }

  // ─── Virtual Tutorial parents get the new VirtualDashboard UI ─────────────
  if (isVirtualSession) {
    return (
      <>
        <VirtualDashboard
          profile={profile}
          setProfile={(fn) => setProfile((p) => (p ? fn(p) : p))}
          user={user}
          signOut={handleSignOut}
          showToast={showToast}
          toast={toast}
          clearToast={() => setToast(null)}
          allRenewalPrograms={allRenewalPrograms}
          sessionPayments={sessionPayments}
          setSessionPayments={setSessionPayments}
          paymentsLoading={paymentsLoading}
          onChangePassword={() => setShowPasswordModal(true)}
          onEditFavorites={() => setShowEditSurveyModal(true)}
          onOpenMaterial={openFile}
          loadingFileId={loadingFileId}
          agreement={<WaiverAgreementText />}
        />
        {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
        {fileViewer && <FileViewerModal viewer={fileViewer} onClose={() => setFileViewer(null)} />}
        {showEditSurveyModal && (
          <VirtualOnboardingModal
            profile={profile}
            isGateMode={false}
            onClose={() => setShowEditSurveyModal(false)}
            onSave={(d) => setProfile((p) => (p ? { ...p, ...d } : p))}
            showToast={showToast}
          />
        )}
      </>
    );
  }

  // ─── Tabs ─────────────────────────────────────────────────────────────────

  const tabs = [
    ...(isVirtualSession ? [] : [{ id: "session", label: "📅 Session", icon: "📅" }]),
    { id: "virtual", label: "🖥️ Virtual Class", icon: "🖥️" },
    ...(isVirtualSession ? [
      { id: "folder", label: "📁 Study Folder", icon: "📁" },
      { id: "payments", label: "💳 Payments", icon: "💳" }
    ] : []),
    ...(isVirtualSession ? [] : [{ id: "photos", label: "📸 Photos", icon: "📸" }]),
    { id: "waiver", label: "📄 Waiver", icon: "📄" },
    ...(isVirtualSession ? [] : [{ id: "history", label: "🏕️ History", icon: "🏕️" }]),
    ...(isVirtualSession ? [] : [{ id: "renewal", label: "🔄 Renewal", icon: "🔄" }]),
    { id: "profile", label: "👤 Profile", icon: "👤" },
  ] as const;

  // ─── Toast UI ──────────────────────────────────────────────────────────────
  const toastColors = {
    success: { bg: "#f0fdf4", border: "#86efac", icon: "✅", text: "#15803d" },
    error: { bg: "#fef2f2", border: "#fca5a5", icon: "❌", text: "#b91c1c" },
    info: { bg: "#eff6ff", border: "#93c5fd", icon: "ℹ️", text: "#1d4ed8" },
  };
  const tc = toast ? toastColors[toast.type] : null;

  return (
    <div
      id="parent-dashboard"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#f0f7ff 0%,#e8f0fe 40%,#fdf4ff 100%)",
        fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif",
      }}
    >
      {/* ─── Toast ─── */}
      {toast && tc && (
        <div className="toast-enter" style={{
          position: "fixed", bottom: "28px", left: "50%", transform: "translateX(-50%)",
          zIndex: 99999, display: "flex", alignItems: "center", gap: "10px",
          background: tc.bg, border: `1.5px solid ${tc.border}`, borderRadius: "16px",
          padding: "12px 20px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          minWidth: "260px", maxWidth: "90vw", pointerEvents: "auto",
        }}>
          <span style={{ fontSize: "18px", flexShrink: 0 }}>{tc.icon}</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: tc.text, flex: 1 }}>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", color: tc.text, opacity: 0.5, fontSize: "16px", padding: "0 0 0 6px" }}>✕</button>
        </div>
      )}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInUp { from { opacity: 0; transform: translate(-50%, 24px) scale(0.97); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
        @keyframes slideOutDown { from { opacity: 1; transform: translate(-50%, 0) scale(1); } to { opacity: 0; transform: translate(-50%, 24px) scale(0.97); } }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        .toast-enter { animation: slideInUp 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .photo-thumb { transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
        .photo-thumb:hover { transform: scale(1.04); box-shadow: 0 12px 32px rgba(0,47,118,0.2); }
        .tab-btn { transition: all 0.2s; cursor: pointer; border: none; background: none; }
        .tab-btn:hover { background: rgba(0,80,213,0.08) !important; }
        .nav-link:hover { background: rgba(255,255,255,0.15) !important; }
        
        /* Mobile & Tablet Responsiveness */
        @media (max-width: 768px) {
          .responsive-hero-card {
            flex-direction: column !important;
            text-align: center !important;
            padding: 24px 20px !important;
          }
          .responsive-hero-card > div {
            width: 100%;
          }
          .responsive-hero-tags {
            justify-content: center !important;
          }
          .responsive-hero-stats {
            justify-content: center !important;
            width: 100%;
          }
          .responsive-tab-bar {
            overflow-x: auto;
            white-space: nowrap;
            -webkit-overflow-scrolling: touch;
          }
          .responsive-tab-btn {
            flex: 0 0 auto;
            padding: 10px 14px !important;
            font-size: 12px !important;
          }
          .responsive-banner {
            padding: 24px 20px !important;
            text-align: center;
          }
          .responsive-banner-inner {
            flex-direction: column !important;
            align-items: center !important;
            gap: 16px !important;
          }
          .responsive-banner-actions {
            width: 100%;
            justify-content: center !important;
            flex-direction: column !important;
            gap: 12px !important;
          }
          .responsive-banner-actions button {
            width: 100%;
          }
          .hide-on-mobile {
            display: none !important;
          }
          .responsive-card {
            padding: 20px !important;
          }
          .responsive-grid-2 {
            grid-template-columns: 1fr !important;
          }
          .responsive-nav {
            padding: 0 16px !important;
          }
          .responsive-nav-title {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
          }
          .responsive-nav-title > span:last-child {
            margin-left: 0 !important;
            font-size: 10px !important;
          }
          .responsive-nav-actions {
            gap: 6px !important;
          }
          .responsive-nav-actions button {
            padding: 6px 10px !important;
            font-size: 11px !important;
          }
          .responsive-banner-box {
            width: 100% !important;
          }
        }
      `}</style>

      {/* ── Top Nav ─────────────────────────────────────────────────────────── */}
      <nav
        className="responsive-nav"
        style={{
          background: "linear-gradient(90deg,#002f76 0%,#0050d5 100%)",
          padding: "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 2px 20px rgba(0,47,118,0.25)",
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.15)", position: "relative", flexShrink: 0 }}>
              <Image src="/LOGO-noBG.png" alt="Merry Explorers" fill style={{ objectFit: "contain", padding: "3px" }} />
            </div>
            <div className="responsive-nav-title">
              <span style={{ color: "white", fontWeight: "800", fontSize: "16px", letterSpacing: "-0.2px" }}>Merry Explorers</span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: "500", marginLeft: "8px" }}>Parent Portal</span>
            </div>
          </div>
          <div className="responsive-nav-actions" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="hide-on-mobile" style={{ color: "rgba(255,255,255,0.85)", fontSize: "13px", fontWeight: "600" }}>
              Hi, {profile.fullName.split(" ")[0]}!
            </span>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="nav-link"
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                color: "rgba(255,255,255,0.9)",
                fontSize: "13px",
                fontWeight: "700",
                border: "1.5px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.08)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Change Password
            </button>
            <button
              id="parent-signout-btn"
              onClick={handleSignOut}
              className="nav-link"
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                color: "rgba(255,255,255,0.9)",
                fontSize: "13px",
                fontWeight: "700",
                border: "1.5px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.08)",
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero / Profile Card ───────────────────────────────────────────── */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 20px 0" }}>
        <div
          className="fade-up responsive-hero-card"
          style={{
            background: "white",
            borderRadius: "24px",
            boxShadow: "0 4px 32px rgba(0,47,118,0.08)",
            padding: "28px 32px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
            border: "1px solid rgba(0,47,118,0.06)",
            marginBottom: "24px",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              overflow: "hidden",
              background: profile.avatarColor || "#002f76",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 16px rgba(0,47,118,0.2)",
              border: "3px solid white",
            }}
          >
            <Avatar profile={profile} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: "200px" }}>
            <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: "800", color: "#002f76", letterSpacing: "-0.3px" }}>
              {profile.fullName}
            </h1>
            <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: "14px", fontWeight: "500" }}>
              {profile.relationship} of <strong style={{ color: "#0050d5" }}>{profile.childName}</strong>
            </p>

            <div className="responsive-hero-tags" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ padding: "4px 12px", background: "#f0f5ff", color: "#0050d5", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: "1px solid #c5d6ff" }}>
                {profile.program}
              </span>
              {/* Prominent Adventure Badge */}
              <span style={{ padding: "5px 14px", background: "linear-gradient(135deg,#fffbeb,#fef3c7)", color: "#92400e", borderRadius: "20px", fontSize: "13px", fontWeight: "900", border: "2px solid #fbbf24", letterSpacing: "0.2px", boxShadow: "0 2px 8px rgba(251,191,36,0.25)" }}>
                🏕️ Adventure {renewalSettings.currentAdventure || 1}
              </span>
              {profile.classTime && (
                <span style={{ padding: "4px 12px", background: "#f0fdf4", color: "#15803d", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: "1px solid #bbf7d0" }}>
                  🕐 {profile.classTime}
                </span>
              )}
              <span style={{ padding: "4px 12px", background: profile.status === "active" ? "#f0fdf4" : "#f1f5f9", color: profile.status === "active" ? "#15803d" : "#64748b", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: `1px solid ${profile.status === "active" ? "#bbf7d0" : "#cbd5e1"}` }}>
                ● {profile.status === "active" ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="responsive-hero-stats" style={{ display: "flex", gap: "16px", flexShrink: 0 }}>
            <div style={{ textAlign: "center", padding: "12px 18px", background: "#f8faff", borderRadius: "14px", border: "1px solid #e8efff" }}>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#0050d5" }}>
                {isVirtualSession ? (profile.virtualSessionsCompleted || 0) : getCompletedSessionsCount(profile.studentInfo?.enrolledAt, profile.schedule, profile.classTime)}
                {!isVirtualSession && (
                  <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "600", marginLeft: "2px" }}>
                    {(() => {
                      const programs: Record<string, number> = {
                        "Discovery Club: Curious Explorer": 8,
                        "Discovery Club: Creative Explorer": 12,
                        "Discovery Club: Everyday Curious": 14,
                        "Trailblazer: Brave Explorer": 18,
                      };
                      const total = programs[profile.program];
                      return total ? `/ ${total}` : "";
                    })()}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Sessions</div>
            </div>
            {!isVirtualSession && (
              <div style={{ textAlign: "center", padding: "12px 18px", background: "#f8faff", borderRadius: "14px", border: "1px solid #e8efff" }}>
                <div style={{ fontSize: "24px", fontWeight: "800", color: "#0050d5" }}>
                  {profile.albums.filter((a) => !isExpired(a.expiresAt)).reduce((sum, a) => sum + a.photoCount, 0)}
                </div>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Photos</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Tab Bar ───────────────────────────────────────────────────────── */}
        <div
          className="responsive-tab-bar"
          style={{
            display: "flex",
            gap: "4px",
            background: "white",
            borderRadius: "16px",
            padding: "6px",
            boxShadow: "0 2px 16px rgba(0,47,118,0.06)",
            border: "1px solid rgba(0,47,118,0.06)",
            marginBottom: "24px",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`parent-tab-${tab.id}`}
              className="tab-btn responsive-tab-btn"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: "700",
                color: activeTab === tab.id ? "#002f76" : "#94a3b8",
                background: activeTab === tab.id ? "#f0f5ff" : "transparent",
                border: activeTab === tab.id ? "1.5px solid #c5d6ff" : "1.5px solid transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ───────────────────────────────────────────────────── */}
        <div className="fade-up" style={{ marginBottom: "40px" }}>

          {/* ── SESSION TAB ─────────────────────────────────────────────────── */}
          {activeTab === "session" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* ── Hero Program Banner ── */}
              <div className="responsive-banner" style={{
                background: "linear-gradient(135deg,#001a4d 0%,#002f76 45%,#0050d5 100%)",
                borderRadius: "24px",
                padding: "36px 40px",
                color: "white",
                boxShadow: "0 12px 48px rgba(0,47,118,0.35)",
                position: "relative",
                overflow: "hidden",
              }}>
                {/* Decorative circles */}
                <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: "-60px", right: "80px", width: "160px", height: "160px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

                <div className="responsive-banner-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "24px", position: "relative" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "2px", opacity: 0.6, marginBottom: "8px" }}>🎓 Current Program</div>
                    <div style={{ fontSize: "28px", fontWeight: "900", lineHeight: "1.2", marginBottom: "20px", letterSpacing: "-0.5px" }}>
                      {profile.program || "—"}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                      {profile.schedule && (
                        <div className="responsive-banner-box" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", borderRadius: "12px", padding: "10px 16px", border: "1px solid rgba(255,255,255,0.15)" }}>
                          <div style={{ fontSize: "10px", opacity: 0.65, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "3px" }}>📅 Schedule</div>
                          <div style={{ fontWeight: "800", fontSize: "14px" }}>{profile.schedule}</div>
                        </div>
                      )}
                      {profile.classTime && (
                        <div className="responsive-banner-box" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", borderRadius: "12px", padding: "10px 16px", border: "1px solid rgba(255,255,255,0.15)" }}>
                          <div style={{ fontSize: "10px", opacity: 0.65, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "3px" }}>🕐 Class Time</div>
                          <div style={{ fontWeight: "800", fontSize: "14px" }}>{profile.classTime}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Countdown */}
                  {profile.schedule && profile.classTime && (
                    <div className="responsive-banner-box" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", borderRadius: "16px", padding: "20px 24px", border: "1px solid rgba(255,255,255,0.12)", textAlign: "center", minWidth: "220px" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.65, marginBottom: "10px" }}>⏱ Next Session</div>
                      <NextSessionCountdown schedule={profile.schedule} classTime={profile.classTime} />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Two-column cards row ── */}
              <div className="responsive-grid-2" style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>

                {/* Latest Session Card */}
                <div style={{ background: "white", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.07)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "linear-gradient(135deg,#fef3c7,#fde68a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>📅</div>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: "#002f76" }}>Latest Session</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>Most recent class activity</div>
                    </div>
                  </div>

                  {recentAlbum ? (
                    <div>
                      <p style={{ fontWeight: "800", color: "#002f76", fontSize: "15px", margin: "0 0 10px" }}>{recentAlbum.sessionLabel}</p>
                      {recentAlbum.note && (
                        <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.7", background: "#f8faff", borderRadius: "12px", padding: "12px 16px", margin: "0 0 14px", borderLeft: "3px solid #c5d6ff" }}>
                          📝 {recentAlbum.note}
                        </p>
                      )}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                        <span style={{ padding: "5px 14px", background: "#f0f5ff", color: "#0050d5", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: "1px solid #c5d6ff" }}>
                          📸 {recentAlbum.photoCount} photo{recentAlbum.photoCount !== 1 ? "s" : ""}
                        </span>
                        {recentAlbum.expiresAt && !isExpired(recentAlbum.expiresAt) && (
                          <span style={{ padding: "5px 14px", background: "#fff8e1", color: "#b45309", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: "1px solid #fde68a" }}>
                            ⏰ Expires {fmtExpiry(recentAlbum.expiresAt)}
                          </span>
                        )}
                        {recentAlbum.expiresAt && isExpired(recentAlbum.expiresAt) && (
                          <span style={{ padding: "5px 14px", background: "#fff0f0", color: "#ba1a1a", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: "1px solid #ffd5d5" }}>
                            ✗ Expired
                          </span>
                        )}
                      </div>
                      {!isExpired(recentAlbum.expiresAt) && (
                        <button
                          onClick={() => { setActiveTab("photos"); setExpandedAlbum(recentAlbum.id); }}
                          style={{ padding: "12px 20px", background: "linear-gradient(135deg,#002f76,#0050d5)", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", fontSize: "13px", cursor: "pointer", width: "100%", boxShadow: "0 4px 16px rgba(0,47,118,0.25)", transition: "all 0.2s" }}
                          onMouseOver={e => (e.currentTarget.style.transform = "translateY(-1px)")}
                          onMouseOut={e => (e.currentTarget.style.transform = "translateY(0)")}
                        >
                          View Session Photos →
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "32px 20px", background: "#f8faff", borderRadius: "16px", border: "1px dashed #c5d6ff" }}>
                      <div style={{ fontSize: "40px", marginBottom: "10px", opacity: 0.5 }}>📷</div>
                      <p style={{ fontSize: "14px", fontWeight: "700", color: "#94a3b8", margin: 0 }}>No sessions recorded yet</p>
                      <p style={{ fontSize: "12px", color: "#b0bec5", marginTop: "4px" }}>Photos will appear here after your first class</p>
                    </div>
                  )}
                </div>

                {/* Explorer Profile Card */}
                <div style={{ background: "white", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.07)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "linear-gradient(135deg,#dcfce7,#bbf7d0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>🧒</div>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: "#002f76" }}>Explorer Profile</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>Your child&apos;s registration details</div>
                    </div>
                  </div>

                  {profile.studentInfo ? (
                    <>
                      {/* Child avatar row */}
                      <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", background: "linear-gradient(135deg,#f0f7ff,#e8f0fe)", borderRadius: "16px", marginBottom: "16px", border: "1px solid rgba(0,80,213,0.08)" }}>
                        <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "linear-gradient(135deg,#002f76,#0050d5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", color: "white", fontWeight: "900", flexShrink: 0, boxShadow: "0 4px 16px rgba(0,47,118,0.3)" }}>
                          {profile.studentInfo.childInfo.firstName?.[0] || "?"}
                        </div>
                        <div>
                          <div style={{ fontWeight: "900", fontSize: "18px", color: "#002f76", letterSpacing: "-0.3px" }}>
                            {profile.studentInfo.childInfo.firstName} {profile.studentInfo.childInfo.lastName}
                          </div>
                          {profile.studentInfo.childInfo.nickname && (
                            <div style={{ fontSize: "13px", color: "#64748b", fontStyle: "italic", marginTop: "2px" }}>&quot;{profile.studentInfo.childInfo.nickname}&quot;</div>
                          )}
                        </div>
                      </div>

                      {/* Details grid */}
                      <div style={{ display: "grid", gap: "6px", marginBottom: "14px" }}>
                        {([
                          { label: "Program", value: profile.studentInfo.programName || profile.studentInfo.program, icon: "🎓" },
                          { label: "Schedule", value: profile.studentInfo.schedule || profile.schedule || "—", icon: "📅" },
                          { label: "Class Time", value: profile.studentInfo.classTime || profile.classTime || "—", icon: "🕐" },
                          { label: "Date of Birth", value: profile.studentInfo.childInfo.dateOfBirth || "—", icon: "🎂" },
                          { label: "Gender", value: profile.studentInfo.childInfo.gender || "—", icon: "👤" },
                          { label: "Health Notes", value: profile.studentInfo.childInfo.healthProfile || "None", icon: "🩺" },
                          { label: "Enrolled", value: profile.studentInfo.enrolledAt ? new Date(profile.studentInfo.enrolledAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—", icon: "📋" },
                          { label: "Reg. ID", value: profile.studentInfo.registrationId || "—", icon: "🔖" },
                        ] as const).map(({ label, value, icon }) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 13px", background: "#f8faff", borderRadius: "10px", gap: "8px" }}>
                            <dt style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.3px", whiteSpace: "nowrap" }}>
                              <span>{icon}</span>{label}
                            </dt>
                            <dd style={{ fontSize: "13px", fontWeight: "700", color: "#002f76", margin: 0, textAlign: "right", maxWidth: "55%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</dd>
                          </div>
                        ))}
                      </div>

                      {/* Favorites */}
                      {(profile.studentInfo.childInfo.favoriteSong || profile.studentInfo.childInfo.favoriteColor || profile.studentInfo.childInfo.favoriteCharacter) && (
                        <div style={{ padding: "14px 16px", background: "linear-gradient(135deg,#fffbeb,#fef3c7)", borderRadius: "14px", border: "1px solid #fde68a" }}>
                          <div style={{ fontSize: "11px", fontWeight: "800", color: "#b45309", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "10px" }}>⭐ Favorites</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {profile.studentInfo.childInfo.favoriteSong && <span style={{ padding: "5px 12px", background: "white", borderRadius: "20px", fontSize: "12px", fontWeight: "700", color: "#92400e", border: "1px solid #fde68a", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>🎵 {profile.studentInfo.childInfo.favoriteSong}</span>}
                            {profile.studentInfo.childInfo.favoriteColor && <span style={{ padding: "5px 12px", background: "white", borderRadius: "20px", fontSize: "12px", fontWeight: "700", color: "#92400e", border: "1px solid #fde68a", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>🎨 {profile.studentInfo.childInfo.favoriteColor}</span>}
                            {profile.studentInfo.childInfo.favoriteCharacter && <span style={{ padding: "5px 12px", background: "white", borderRadius: "20px", fontSize: "12px", fontWeight: "700", color: "#92400e", border: "1px solid #fde68a", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>⭐ {profile.studentInfo.childInfo.favoriteCharacter}</span>}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <dl style={{ margin: 0, display: "grid", gap: "8px" }}>
                      {[
                        { label: "Name", value: profile.childName, icon: "👤" },
                        { label: "Program", value: profile.program, icon: "🎓" },
                        { label: "Schedule", value: profile.schedule || "—", icon: "📅" },
                        { label: "Class Time", value: profile.classTime || "—", icon: "🕐" },
                      ].map(({ label, value, icon }) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 13px", background: "#f8faff", borderRadius: "10px" }}>
                          <dt style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                            <span>{icon}</span>{label}
                          </dt>
                          <dd style={{ fontSize: "13px", fontWeight: "700", color: "#002f76", margin: 0, textAlign: "right", maxWidth: "60%" }}>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ── PHOTOS TAB ──────────────────────────────────────────────────── */}
          {activeTab === "photos" && (
            <div>
              {profile.albums.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", background: "white", borderRadius: "20px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)" }}>
                  <div style={{ fontSize: "56px", marginBottom: "16px" }}>📷</div>
                  <h3 style={{ color: "#002f76", fontWeight: "800", fontSize: "18px", margin: "0 0 8px" }}>No Photos Yet</h3>
                  <p style={{ color: "#64748b", fontSize: "14px" }}>Photos from your child's sessions will appear here once uploaded by the teacher.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "20px" }}>
                  {profile.albums.map((album) => {
                    const expired = isExpired(album.expiresAt);
                    // Expired albums can never be opened
                    const expanded = expandedAlbum === album.id && !expired;
                    return (
                      <div
                        key={album.id}
                        id={`album-${album.id}`}
                        style={{ background: "white", borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)", opacity: expired ? 0.7 : 1 }}
                      >
                        {/* Album header */}
                        <button
                          onClick={() => {
                            if (expired) return;
                            setExpandedAlbum(expanded ? null : album.id);
                          }}
                          disabled={expired}
                          style={{ width: "100%", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: expired ? "default" : "pointer", textAlign: "left" }}
                        >
                          <div>
                            <div style={{ fontWeight: "800", color: "#002f76", fontSize: "15px", marginBottom: "4px" }}>{album.sessionLabel}</div>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "12px", fontWeight: "600", color: "#0050d5", background: "#f0f5ff", padding: "3px 10px", borderRadius: "20px", border: "1px solid #c5d6ff" }}>
                                📸 {album.photoCount} photo{album.photoCount !== 1 ? "s" : ""}
                              </span>
                              {expired ? (
                                <span style={{ fontSize: "12px", fontWeight: "600", color: "#ba1a1a", background: "#fff0f0", padding: "3px 10px", borderRadius: "20px", border: "1px solid #ffd5d5" }}>Expired</span>
                              ) : album.expiresAt ? (
                                <span style={{ fontSize: "12px", fontWeight: "600", color: "#b45309", background: "#fffbeb", padding: "3px 10px", borderRadius: "20px", border: "1px solid #fde68a" }}>
                                  ⏰ Until {fmtExpiry(album.expiresAt)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {!expired && (
                            <span style={{ fontSize: "18px", color: "#94a3b8", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
                          )}
                        </button>

                        {/* Expired message */}
                        {expired && (
                          <p style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "600", textAlign: "center", padding: "0 24px 20px", margin: 0 }}>
                            This album has expired and the photos are no longer available.
                          </p>
                        )}

                        {/* Album photos grid */}
                        {expanded && (
                          <div style={{ padding: "0 24px 24px" }}>
                            {album.note && (
                              <div style={{ background: "#f8faff", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#5a6e8c", fontWeight: "500", lineHeight: "1.6" }}>
                                📝 {album.note}
                              </div>
                            )}
                            {album.photos.length > 0 ? (
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px" }}>
                                {album.photos.map((photo, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="photo-thumb"
                                    onClick={() => setLightbox({ album, photoIdx: pIdx })}
                                    style={{ aspectRatio: "1", borderRadius: "12px", overflow: "hidden", background: "#f0f5ff" }}
                                  >
                                    <img
                                      src={photo.url}
                                      alt={photo.caption || `Photo ${pIdx + 1}`}
                                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "600", textAlign: "center", padding: "20px 0" }}>Photos are not available for this album.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Trailblazer disclaimer (bottom of the tab) */}
              {isTrailblazer && (
                <div style={{ background: "#f0f6ff", border: "1.5px solid #bfdbfe", borderRadius: "16px", padding: "14px 18px", marginTop: "20px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <span style={{ fontSize: "20px", flexShrink: 0 }}>📌</span>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "800", color: "#0033A0", marginBottom: "2px" }}>About Trailblazer photos</div>
                    <p style={{ margin: 0, fontSize: "13px", color: "#334155", lineHeight: "1.6", fontWeight: "500" }}>
                      Photos for Trailblazer are shared every <strong>Thursday and Friday</strong>. Photos from{" "}
                      <strong>Monday to Wednesday</strong> sessions are posted in the <strong>weekly highlights</strong> instead.
                      Albums are removed every <strong>Saturday at 11:59 PM</strong>, so please save any photos you love before then.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── WAIVER TAB ──────────────────────────────────────────────────── */}
          {activeTab === "waiver" && (
            <div style={{ background: "white", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)" }}>
              {/* Status badge */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "28px", padding: "16px 20px", background: waiverSigned ? "#f0fdf4" : "#fff8e1", borderRadius: "14px", border: `1.5px solid ${waiverSigned ? "#bbf7d0" : "#fde68a"}` }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: waiverSigned ? "#dcfce7" : "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
                  {waiverSigned ? "✅" : "⚠️"}
                </div>
                <div>
                  <div style={{ fontWeight: "800", fontSize: "16px", color: waiverSigned ? "#15803d" : "#b45309" }}>
                    {waiverSigned ? "Waiver Signed & On File" : "Waiver Pending"}
                  </div>
                  <div style={{ fontSize: "13px", color: waiverSigned ? "#16a34a" : "#92400e", fontWeight: "500" }}>
                    {waiverSigned
                      ? profile.waiverSignedAt ? `Signed on ${new Date(profile.waiverSignedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}` : "Your participation waiver has been received and is on file."
                      : "Please contact us to complete your waiver form."}
                  </div>
                </div>
              </div>

              {/* Signed-by info */}
              {waiverSigned && (
                <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px", padding: "16px", background: "#f8faff", borderRadius: "12px", border: "1px solid #e8efff" }}>
                  {[
                    { label: "Signed By", value: profile.fullName },
                    { label: "Child", value: profile.childName },
                    { label: "Date Signed", value: profile.waiverSignedAt ? new Date(profile.waiverSignedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—" },
                    { label: "Photo Consent", value: profile.photoConsent ? "Granted" : "Not Granted" }
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{label}</div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#002f76" }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Signature image */}
              {waiverSigned && profile.waiverSignature && (
                <div style={{ marginBottom: "28px" }}>
                  <div style={{ fontWeight: "800", color: "#002f76", fontSize: "14px", marginBottom: "10px" }}>✍️ Your Signature on File</div>
                  <div style={{ border: "1.5px solid #c5d6ff", borderRadius: "12px", padding: "12px", background: "#f8faff", display: "inline-block" }}>
                    <img src={profile.waiverSignature} alt="Your signature" style={{ maxHeight: "100px", display: "block" }} />
                  </div>
                </div>
              )}

              {/* Full waiver text — re-readable */}
              <div style={{ fontWeight: "800", color: "#002f76", fontSize: "15px", marginBottom: "16px" }}>📄 Your Full Agreement</div>
              <div style={{ border: "1px solid #e8efff", borderRadius: "14px", overflow: "hidden" }}>
                <div style={{ background: "#f8faff", padding: "10px 16px", borderBottom: "1px solid #e8efff", fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Read-only — for your reference</div>
                <div style={{ padding: "20px 24px", fontSize: "13px", color: "#334155", lineHeight: 1.75, maxHeight: "400px", overflowY: "auto" }}>
                  <WaiverAgreementText />
                </div>
              </div>

              <p style={{ marginTop: "20px", fontSize: "12px", color: "#94a3b8", lineHeight: "1.6" }}>
                For questions about the waiver, please contact us at{" "}
                <a href="mailto:merryexplorerscenter@gmail.com" style={{ color: "#0050d5", fontWeight: "700" }}>merryexplorerscenter@gmail.com</a>.
              </p>
            </div>
          )}

          {/* ── HISTORY TAB ─────────────────────────────────────────────────── */}
          {activeTab === "history" && (
            <div>
              {profile.albums.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", background: "white", borderRadius: "20px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)" }}>
                  <div style={{ fontSize: "56px", marginBottom: "16px" }}>🗺️</div>
                  <h3 style={{ color: "#002f76", fontWeight: "800", fontSize: "18px", margin: "0 0 8px" }}>The Adventure Begins Soon</h3>
                  <p style={{ color: "#64748b", fontSize: "14px" }}>Your child's adventure history will appear here after their first session.</p>
                </div>
              ) : (
                <div style={{ background: "white", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)" }}>
                  <h3 style={{ margin: "0 0 24px", color: "#002f76", fontWeight: "800", fontSize: "17px" }}>
                    🏕️ {profile.childName}'s Adventure Timeline
                  </h3>

                  <div style={{ position: "relative" }}>
                    {/* Timeline line */}
                    <div style={{ position: "absolute", left: "20px", top: "0", bottom: "0", width: "2px", background: "linear-gradient(to bottom,#0050d5,#4a90d9,transparent)" }} />

                    <div style={{ display: "grid", gap: "20px" }}>
                      {profile.albums.map((album, idx) => (
                        <div key={album.id} style={{ display: "flex", gap: "24px", paddingLeft: "0" }}>
                          {/* Dot */}
                          <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: idx === 0 ? "#0050d5" : "#f0f5ff", border: `3px solid ${idx === 0 ? "#0050d5" : "#c5d6ff"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "16px", fontWeight: "800", color: idx === 0 ? "white" : "#0050d5", zIndex: 1 }}>
                            {profile.albums.length - idx}
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, background: idx === 0 ? "linear-gradient(135deg,#f0f5ff,#e8efff)" : "#f8faff", borderRadius: "14px", padding: "16px 20px", border: `1.5px solid ${idx === 0 ? "#c5d6ff" : "#e8efff"}`, marginBottom: "4px" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                              <div>
                                <div style={{ fontWeight: "800", color: "#002f76", fontSize: "14px", marginBottom: "4px" }}>
                                  {album.sessionLabel}
                                  {idx === 0 && <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: "700", color: "#0050d5", background: "#c5d6ff", padding: "2px 8px", borderRadius: "10px" }}>LATEST</span>}
                                </div>
                                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                                  {album.programName || profile.program} · {album.classTime}
                                </div>
                                {album.note && (
                                  <div style={{ marginTop: "8px", fontSize: "13px", color: "#5a6e8c", lineHeight: "1.5" }}>
                                    📝 {album.note}
                                  </div>
                                )}
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: "#0050d5" }}>📸 {album.photoCount}</div>
                                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>photos</div>
                              </div>
                            </div>
                            {album.photoCount > 0 && !isExpired(album.expiresAt) && (
                              <button
                                onClick={() => { setActiveTab("photos"); setExpandedAlbum(album.id); }}
                                style={{ marginTop: "12px", padding: "7px 16px", background: "transparent", border: "1.5px solid #c5d6ff", color: "#0050d5", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                              >
                                View Photos →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── VIRTUAL CLASS TAB ────────────────────────────────────────────── */}
          {activeTab === "virtual" && (
            (() => {
              if (profile.needsSessionPayment) {
                return (
                  <div style={{ background: "white", borderRadius: "20px", padding: "40px 32px", textAlign: "center", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)" }}>
                    <div style={{ fontSize: "56px", marginBottom: "16px", animation: "bounce 2s infinite" }}>💳</div>
                    <h2 style={{ margin: "0 0 12px", color: "#002f76", fontSize: "24px", fontWeight: "800" }}>Payment Required</h2>
                    <p style={{ margin: "0 auto 32px", color: "#64748b", fontSize: "15px", maxWidth: "400px", lineHeight: 1.6 }}>
                      Your previous virtual session has ended! Please submit your payment of <strong>₱{profile.promoDiscount ? profile.promoDiscount.finalPrice.toLocaleString() : "675"}</strong> to unlock your next session.
                    </p>
                    <button
                      onClick={() => setActiveTab("payments")}
                      style={{ padding: "16px 32px", background: "linear-gradient(135deg,#002f76,#0050d5)", color: "white", borderRadius: "14px", fontSize: "16px", fontWeight: "800", border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,47,118,0.3)" }}
                    >
                      Go to Payment Form →
                    </button>
                  </div>
                );
              }

              const programSetting = allRenewalPrograms?.find((p: any) => p.programKey === profile.program);
              const activeLink = profile.virtualSessionLink || (programSetting?.virtualLinkOpen ? programSetting?.virtualLink : null);
              const pendingPayment = profile.sessionPayments?.find((p: any) => !p.verified && !p.rejected);

              return (
                <div style={{ background: "white", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)" }}>
                  {activeLink ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", background: "linear-gradient(135deg,#e0e7ff,#c7d2fe)", padding: "20px", borderRadius: "16px", border: "1px solid #a5b4fc" }}>
                        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0, boxShadow: "0 4px 12px rgba(79,70,229,0.4)" }}>
                          🖥️
                        </div>
                        <div>
                          <div style={{ fontWeight: "800", fontSize: "18px", color: "#312e81" }}>Virtual Session Link Available</div>
                          <div style={{ fontSize: "14px", color: "#4338ca", fontWeight: "600", marginTop: "4px" }}>Click the button below to join the online session</div>
                        </div>
                      </div>

                      <div style={{ textAlign: "center", padding: "40px 20px", background: "#f8faff", borderRadius: "16px", border: "1px dashed #c5d6ff" }}>
                        <div style={{ fontSize: "40px", marginBottom: "16px", animation: "bounce 2s infinite" }}>🎥</div>
                        <a
                          href={activeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-block",
                            padding: "16px 32px",
                            background: "linear-gradient(135deg,#002f76,#0050d5)",
                            color: "white",
                            borderRadius: "14px",
                            fontSize: "16px",
                            fontWeight: "800",
                            textDecoration: "none",
                            boxShadow: "0 8px 24px rgba(0,47,118,0.3)",
                            transition: "all 0.2s"
                          }}
                        >
                          Join Virtual Class Now
                        </a>
                      </div>
                    </>
                  ) : pendingPayment ? (
                    <div style={{ textAlign: "center", padding: "60px 20px" }}>
                      <div style={{ fontSize: "56px", marginBottom: "16px", animation: "pulse 2s infinite" }}>⏳</div>
                      <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "#b45309", fontWeight: "800" }}>Payment Verification Pending</h3>
                      <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>We&apos;ve received your payment and are currently verifying it. Your session link will be available shortly!</p>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "60px 20px" }}>
                      <div style={{ fontSize: "56px", marginBottom: "16px", opacity: 0.5 }}>📴</div>
                      <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "#002f76", fontWeight: "800" }}>No Virtual Session Link</h3>
                      <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>Your teacher hasn&apos;t posted a virtual session link for your class yet.</p>
                    </div>
                  )}

                  {/* ── Child Profile & Favorites Card ── */}
                  <div style={{ marginTop: "28px", paddingTop: "24px", borderTop: "1.5px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{ width: "54px", height: "54px", borderRadius: "50%", overflow: "hidden", border: "3px solid #ffb800", background: profile.avatarColor || "#002f76", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,47,118,0.15)", flexShrink: 0 }}>
                          {profile.avatarUrl ? (
                            <img src={profile.avatarUrl} alt={profile.childName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontSize: "20px", fontWeight: "800", color: "white" }}>{profile.initials || "🌟"}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#002f76" }}>{profile.childName || "Child"}&apos;s Profile & Favorites</h3>
                            <span style={{ fontSize: "11px", fontWeight: "800", padding: "2px 8px", background: "#f0fdf4", color: "#16a34a", borderRadius: "10px", border: "1px solid #bbf7d0" }}>Active Explorer</span>
                          </div>
                          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>These details help teachers personalize your child&apos;s virtual sessions!</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowEditSurveyModal(true)}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "12px", border: "1.5px solid #0050d5", background: "#eff6ff", color: "#0050d5", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}
                      >
                        ✏️ Edit Favorites & Photo
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                      <div style={{ background: "linear-gradient(135deg, #fffbeb, #fef3c7)", border: "1px solid #fde68a", borderRadius: "14px", padding: "14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                          <span style={{ fontSize: "18px" }}>🎵</span>
                          <span style={{ fontSize: "11px", fontWeight: "800", color: "#b45309", textTransform: "uppercase", letterSpacing: "0.5px" }}>Favorite Song</span>
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: "800", color: "#78350f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {childFavorites?.favoriteSong || <span style={{ color: "#b45309", opacity: 0.6, fontStyle: "italic", fontWeight: "500" }}>Not set yet</span>}
                        </div>
                      </div>

                      <div style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)", border: "1px solid #bfdbfe", borderRadius: "14px", padding: "14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                          <span style={{ fontSize: "18px" }}>🎨</span>
                          <span style={{ fontSize: "11px", fontWeight: "800", color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Favorite Color</span>
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: "800", color: "#1e3a8a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {childFavorites?.favoriteColor || <span style={{ color: "#1d4ed8", opacity: 0.6, fontStyle: "italic", fontWeight: "500" }}>Not set yet</span>}
                        </div>
                      </div>

                      <div style={{ background: "linear-gradient(135deg, #faf5ff, #f3e8ff)", border: "1px solid #e9d5ff", borderRadius: "14px", padding: "14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                          <span style={{ fontSize: "18px" }}>⭐</span>
                          <span style={{ fontSize: "11px", fontWeight: "800", color: "#7e22ce", textTransform: "uppercase", letterSpacing: "0.5px" }}>Favorite Character</span>
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: "800", color: "#581c87", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {childFavorites?.favoriteCharacter || <span style={{ color: "#7e22ce", opacity: 0.6, fontStyle: "italic", fontWeight: "500" }}>Not set yet</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {/* ── FOLDER TAB ────────────────────────────────────────────── */}
          {activeTab === "folder" && (() => {
            const links = (profile.studyMaterials || []).filter((m: any) => m.type === "link");
            const files = (profile.studyMaterials || []).filter((m: any) => m.type === "file");

            // openFile is defined at component level

            return (
              <div style={{ background: "white", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
                  <div style={{ fontSize: "28px" }}>📁</div>
                  <div>
                    <h2 style={{ margin: 0, color: "#002f76", fontSize: "20px", fontWeight: "800" }}>Study Materials</h2>
                    <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>Access your files and video links.</p>
                  </div>
                </div>

                {(!profile.studyMaterials || profile.studyMaterials.length === 0) ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", background: "#f8faff", borderRadius: "16px", border: "1px dashed #c5d6ff" }}>
                    <div style={{ fontSize: "40px", marginBottom: "12px", opacity: 0.5 }}>📂</div>
                    <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>No files or links uploaded yet. Your teacher will add them here.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

                    {/* ── Video & Links Section ── */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg,#fef3c7,#fde68a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>▶️</div>
                        <div style={{ fontSize: "13px", fontWeight: "800", color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px" }}>Video & Links</div>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", background: "#f1f5f9", padding: "2px 8px", borderRadius: "10px" }}>{links.length}</div>
                      </div>
                      {links.length === 0 ? (
                        <div style={{ padding: "16px", background: "#f8faff", borderRadius: "12px", border: "1px dashed #e2e8f0", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No video links added yet.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {links.map((m: any) => (
                            <button
                              key={m.id}
                              onClick={() => openFile(m)}
                              style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#fffbeb", cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.15s" }}
                              onMouseOver={e => (e.currentTarget.style.background = "#fef3c7")}
                              onMouseOut={e => (e.currentTarget.style.background = "#fffbeb")}
                            >
                              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg,#ef4444,#f97316)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>▶️</div>
                              <div style={{ flex: 1, overflow: "hidden" }}>
                                <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                                <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.url}</div>
                              </div>
                              <div style={{ fontSize: "18px", color: "#94a3b8", flexShrink: 0 }}>↗</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── Uploaded Files Section ── */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg,#dbeafe,#bfdbfe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>📄</div>
                        <div style={{ fontSize: "13px", fontWeight: "800", color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px" }}>Uploaded Files</div>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", background: "#f1f5f9", padding: "2px 8px", borderRadius: "10px" }}>{files.length}</div>
                      </div>
                      {/* Hidden file input for submissions */}
                      <input
                        ref={submissionFileRef}
                        type="file"
                        style={{ display: "none" }}
                        accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !submittingForId) return;
                          const materialId = submittingForId;
                          setSubmittingForId(`uploading-${materialId}`);
                          try {
                            // Upload to B2
                            const form = new FormData();
                            form.append("file", file);
                            form.append("folder", `submissions/${profile?.id}`);
                            const upRes = await fetch("/api/upload", { method: "POST", body: form });
                            const upData = await upRes.json();
                            if (!upData.success) throw new Error(upData.error || "Upload failed");
                            // Save submission record
                            const subRes = await fetch("/api/parents/study-materials/submit", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                uid: profile?.id,
                                materialId,
                                key: upData.key,
                                fileName: file.name,
                                fileType: file.type,
                                size: file.size,
                              }),
                            });
                            if (!subRes.ok) throw new Error("Failed to record submission");
                            setSubmissionSuccess(materialId);
                            setProfile((prev: any) => prev ? {
                              ...prev,
                              studyMaterials: prev.studyMaterials?.map((m: any) =>
                                m.id === materialId
                                  ? { ...m, submission: { key: upData.key, fileName: file.name, fileType: file.type, size: file.size, submittedAt: new Date().toISOString() } }
                                  : m
                              )
                            } : prev);
                            showToast("✅ Work submitted successfully!", "success");
                          } catch (err: any) {
                            showToast("Failed to submit. Please try again.", "error");
                          } finally {
                            setSubmittingForId(null);
                            if (submissionFileRef.current) submissionFileRef.current.value = "";
                          }
                        }}
                      />
                      {files.length === 0 ? (
                        <div style={{ padding: "16px", background: "#f8faff", borderRadius: "12px", border: "1px dashed #e2e8f0", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No files uploaded yet.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {files.map((m: any) => {
                            const isLoading = loadingFileId === m.id;
                            const isUploading = submittingForId === `uploading-${m.id}`;
                            const hasSubmission = !!m.submission;
                            return (
                              <div key={m.id} style={{ border: "1px solid #e2e8f0", borderRadius: "14px", overflow: "hidden", background: "#f8faff" }}>
                                {/* File row */}
                                <button
                                  onClick={() => openFile(m)}
                                  disabled={!!loadingFileId}
                                  style={{
                                    display: "flex", alignItems: "center", gap: "14px",
                                    padding: "14px 16px",
                                    border: "none",
                                    borderBottom: "1px solid #e8efff",
                                    background: isLoading ? "linear-gradient(135deg,#eff6ff,#dbeafe)" : "transparent",
                                    cursor: isLoading ? "default" : "pointer",
                                    textAlign: "left", width: "100%",
                                    transition: "all 0.2s",
                                  }}
                                  onMouseOver={e => { if (!isLoading) e.currentTarget.style.background = "#eff6ff"; }}
                                  onMouseOut={e => { if (!isLoading) e.currentTarget.style.background = "transparent"; }}
                                >
                                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: isLoading ? "linear-gradient(135deg,#60a5fa,#818cf8)" : "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                                    {isLoading ? (
                                      <svg style={{ animation: "me-spin 0.7s linear infinite" }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                      </svg>
                                    ) : "📄"}
                                  </div>
                                  <div style={{ flex: 1, overflow: "hidden" }}>
                                    <div style={{ fontWeight: "700", color: isLoading ? "#1d4ed8" : "#0f172a", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                                    <div style={{ color: isLoading ? "#3b82f6" : "#94a3b8", fontSize: "12px", marginTop: "2px", animation: isLoading ? "me-pulse 1.2s ease-in-out infinite" : "none", fontWeight: isLoading ? "600" : "400" }}>
                                      {isLoading ? "Opening… please wait" : "Click to view file"}
                                    </div>
                                  </div>
                                  {!isLoading && <div style={{ fontSize: "18px", color: "#94a3b8", flexShrink: 0 }}>⬇</div>}
                                </button>

                                {/* Submission row */}
                                <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                                  {hasSubmission ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <span style={{ fontSize: "16px" }}>✅</span>
                                      <div>
                                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#15803d" }}>Work Submitted</div>
                                        <div style={{ fontSize: "11px", color: "#64748b" }}>{m.submission.fileName} · {new Date(m.submission.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <span style={{ fontSize: "14px" }}>📤</span>
                                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>No submission yet</span>
                                    </div>
                                  )}
                                  <button
                                    disabled={isUploading}
                                    onClick={() => {
                                      setSubmittingForId(m.id);
                                      submissionFileRef.current?.click();
                                    }}
                                    style={{
                                      display: "inline-flex", alignItems: "center", gap: "6px",
                                      padding: "6px 14px",
                                      borderRadius: "10px",
                                      border: "none",
                                      background: isUploading ? "#e2e8f0" : hasSubmission ? "linear-gradient(135deg,#f0fdf4,#dcfce7)" : "linear-gradient(135deg,#002f76,#0050d5)",
                                      color: isUploading ? "#94a3b8" : hasSubmission ? "#15803d" : "white",
                                      fontSize: "12px", fontWeight: "700",
                                      cursor: isUploading ? "not-allowed" : "pointer",
                                      transition: "all 0.2s",
                                      boxShadow: hasSubmission ? "none" : "0 2px 8px rgba(0,47,118,0.2)",
                                    }}
                                  >
                                    {isUploading ? (
                                      <><svg style={{ animation: "me-spin 0.7s linear infinite" }} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg> Uploading…</>
                                    ) : hasSubmission ? (
                                      <>🔄 Re-submit</>
                                    ) : (
                                      <>📤 Submit Work</>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })()}

          {/* ── PAYMENTS TAB ────────────────────────────────────────────── */}
          {activeTab === "payments" && (
            <div style={{ background: "white", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <div style={{ fontSize: "28px" }}>💳</div>
                <div>
                  <h2 style={{ margin: 0, color: "#002f76", fontSize: "20px", fontWeight: "800" }}>Submit Payment</h2>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>Upload proof of payment for your sessions.</p>
                </div>
              </div>

              {profile.promoDiscount ? (
                <div className="mb-6 rounded-3xl p-5 shadow-xl" style={{ background: "linear-gradient(135deg, #0033A0, #0066CC)" }}>
                  <p className="text-[12px] font-bold uppercase tracking-widest text-white/70 mb-3">Amount Due Per Session</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] text-white/70">Original Price</span>
                      <span className="text-[15px] font-bold text-white/60 line-through">₱{profile.promoDiscount.originalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[13px] text-green-300">Promo Discount</span>
                        <span className="ml-2 text-[11px] font-bold bg-white/20 text-white rounded-full px-2 py-0.5">{profile.promoCode}</span>
                      </div>
                      <span className="text-[13px] font-bold text-green-300">− ₱{profile.promoDiscount.discountAmount.toLocaleString()} ({Math.round(profile.promoDiscount.discountAmount / profile.promoDiscount.originalPrice * 100)}% off)</span>
                    </div>
                    <div className="border-t border-white/20 pt-2 flex justify-between items-center">
                      <span className="text-[13px] font-extrabold text-white">You Pay</span>
                      <span className="text-[40px] font-extrabold leading-none text-white">₱{profile.promoDiscount.finalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-2xl px-3 py-2">
                    <span className="text-[13px]">🏷️</span>
                    <span className="text-[12px] font-semibold text-white/80">{profile.promoDiscount.description} applied to your account</span>
                  </div>
                </div>
              ) : (
                <div className="mb-6 rounded-3xl p-6 text-white shadow-xl bg-gradient-to-br from-[#0033A0] to-[#0066CC]">
                  <p className="text-[12px] font-bold uppercase tracking-widest opacity-70">Amount Due Per Session</p>
                  <p className="mt-1 text-[40px] font-extrabold leading-none">₱675</p>
                </div>
              )}

              <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                <h3 className="mb-4 font-headline text-[16px] font-extrabold text-[#0033A0]">Select Payment Method</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { id: "gcash", label: "GCash", logo: "/gcash-logo.svg" },
                    { id: "bpi", label: "BPI", logo: "/bpi-logo.svg" },
                    { id: "mari-bank", label: "Mari Bank", logo: "/maribank-logo.svg" },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setDpPaymentMethod(method.id)}
                      className={["flex flex-col items-center justify-center gap-3 rounded-2xl border-2 py-5 px-3", dpPaymentMethod === method.id ? "border-[#0033A0] bg-[#0033A0]/5" : "border-slate-200 hover:border-slate-300"].join(" ")}
                      style={{ background: dpPaymentMethod === method.id ? "#f0f5ff" : "white" }}
                    >
                      <div className="relative h-8 w-24"><Image src={method.logo} alt={method.label} fill className="object-contain" /></div>
                      <span className="text-[13px] font-bold" style={{ color: "#0f172a" }}>{method.label}</span>
                    </button>
                  ))}
                </div>
                {dpPaymentMethod && (
                  <div className="mt-5">
                    {[
                      { id: "gcash", label: "GCash", qr: "/GCASHQRONLY.png" },
                      { id: "bpi", label: "BPI", qr: "/BPIQRONLY.png" },
                      { id: "mari-bank", label: "Mari Bank", qr: "/MARIBANKQRONLY.png" },
                    ].filter((pm) => pm.id === dpPaymentMethod).map((pm) => (
                      <div key={pm.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center text-center gap-5">
                        <div className="relative w-full max-w-[200px] aspect-square rounded-2xl border-2 bg-white shadow-md">
                          <Image src={pm.qr} alt="QR" fill className="object-contain p-4" />
                        </div>
                        <div className="max-w-sm">
                          <p className="text-[16px] font-extrabold text-[#002f76] mb-2">📲 Scan to Pay via {pm.label}</p>
                          <p className="text-[12px] text-[#64748b]">Scan the QR code to send <strong>₱{profile.promoDiscount ? profile.promoDiscount.finalPrice.toLocaleString() : "675"}</strong> (or multiple). Then upload the screenshot below.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-6 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                <h3 className="mb-1 font-headline text-[16px] font-extrabold text-[#0033A0]">Upload Payment Receipt *</h3>
                <input ref={dpFileRef as any} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result as string;
                    setDpReceiptPreview(result);
                    setDpReceiptBase64(result);
                    setDpReferenceNumber("");
                    setOcrDone(false);
                    runOCR(result);
                  };
                  reader.readAsDataURL(file);
                }} />
                {dpReceiptPreview ? (
                  <div className="relative">
                    <div className="relative aspect-[4/3] w-full max-w-sm mx-auto rounded-2xl border border-slate-200 overflow-hidden"><img src={dpReceiptPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
                    {ocrLoading && <p className="text-[12px] text-[#64748b] mt-3 animate-pulse text-center font-bold">Reading receipt…</p>}
                    {ocrDone && !ocrLoading && !dpReferenceNumber && (
                      <p className="text-[12px] text-[#ef4444] mt-3 text-center font-bold">Couldn't read reference number. Please type it below.</p>
                    )}
                    <button
                      onClick={() => {
                        setDpReceiptPreview("");
                        setDpReceiptBase64("");
                        setDpReferenceNumber("");
                        setOcrDone(false);
                      }}
                      className="mt-3 text-[13px] text-red-500 font-bold block mx-auto"
                    >
                      Remove Receipt
                    </button>
                  </div>
                ) : (
                  <button onClick={() => dpFileRef.current?.click()} className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 px-6 text-center hover:bg-[#f0f5ff]" style={{ cursor: "pointer", background: "white", color: "#002f76", border: "2px dashed #cbd5e1" }}>
                    <span className="text-4xl">📸</span><p className="text-[14px] font-bold text-[#002f76]">Upload receipt</p>
                  </button>
                )}

                {dpReceiptBase64 && (
                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", color: "#0033A0", opacity: 0.6, marginBottom: "6px" }}>Reference Number</label>
                    <input style={{ width: "100%", background: "#f8fafc", border: "2px solid transparent", borderRadius: "16px", padding: "14px", fontSize: "14px", fontWeight: "600", color: "#002f76", marginBottom: "16px" }} value={dpReferenceNumber} onChange={(e) => setDpReferenceNumber(e.target.value)} placeholder="e.g. 10000000000" />

                    <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", color: "#0033A0", opacity: 0.6, marginBottom: "6px" }}>Amount Sent</label>
                    <input style={{ width: "100%", background: "#f8fafc", border: "2px solid transparent", borderRadius: "16px", padding: "14px", fontSize: "14px", fontWeight: "600", color: "#002f76" }} value={dpAmountPaid} onChange={(e) => setDpAmountPaid(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={`e.g. ${profile.promoDiscount ? profile.promoDiscount.finalPrice : 675}`} />
                  </div>
                )}
              </div>

              <button
                disabled={!dpPaymentMethod || !dpReceiptBase64 || !dpAmountPaid || submittingDp}
                onClick={async () => {
                  if (!user) return;
                  setSubmittingDp(true);
                  try {
                    const res = await fetch("/api/parents/session-payment", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        uid: user.uid,
                        paymentMethod: dpPaymentMethod,
                        receiptBase64: dpReceiptBase64,
                        referenceNumber: dpReferenceNumber,
                        amountPaid: Number(dpAmountPaid) || (profile.promoDiscount ? profile.promoDiscount.finalPrice : 675),
                      }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      setSessionPayments(prev => [data.payment, ...prev]);
                      setDpSubmitted(true);
                      setDpReceiptPreview("");
                      setDpReceiptBase64("");
                      setDpAmountPaid("");
                      setDpReferenceNumber("");
                      setDpPaymentMethod("");
                      showToast("Payment submitted! We'll verify it shortly. ✅", "success");
                      setTimeout(() => window.location.reload(), 1500);
                    } else {
                      showToast(data.error || "Failed to submit payment.", "error");
                    }
                  } catch {
                    showToast("Network error. Please try again.", "error");
                  } finally {
                    setSubmittingDp(false);
                  }
                }}
                style={{ width: "100%", borderRadius: "16px", background: (!dpPaymentMethod || !dpReceiptBase64 || !dpAmountPaid) ? "#cbd5e1" : "linear-gradient(135deg,#059669,#10b981)", padding: "16px", fontSize: "16px", fontWeight: "bold", color: "white", border: "none", cursor: (!dpPaymentMethod || !dpReceiptBase64 || !dpAmountPaid) ? "not-allowed" : "pointer", boxShadow: (!dpPaymentMethod || !dpReceiptBase64 || !dpAmountPaid) ? "none" : "0 8px 24px rgba(16,185,129,0.3)" }}
              >
                {submittingDp ? "Submitting…" : "💳 Submit Payment"}
              </button>

              {/* Payment History */}
              {(sessionPayments.length > 0 || paymentsLoading) && (
                <div className="mt-6">
                  <h3 className="text-[14px] font-extrabold text-[#002f76] mb-3">📋 Payment History</h3>
                  {paymentsLoading ? (
                    <div className="text-center py-6 text-[13px] text-[#94a3b8] animate-pulse">Loading history…</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {sessionPayments.map((p, i) => (
                        <div key={p.id || i} style={{
                          background: p.verified ? "#f0fdf4" : p.rejected ? "#fef2f2" : "#fffbeb",
                          border: `1.5px solid ${p.verified ? "#86efac" : p.rejected ? "#fca5a5" : "#fde68a"}`,
                          borderRadius: "16px", padding: "14px 16px",
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap"
                        }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: "13px", color: "#002f76" }}>
                              {p.verified ? "✅" : p.rejected ? "❌" : "⏳"} ₱{(p.amountPaid || 675).toLocaleString()} via {p.paymentMethod?.toUpperCase()}
                            </div>
                            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                              {new Date(p.submittedAt).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              {p.referenceNumber && ` · Ref: ${p.referenceNumber}`}
                            </div>
                            {p.adminNote && <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Note: {p.adminNote}</div>}
                          </div>
                          <span style={{
                            fontSize: "11px", fontWeight: 800, padding: "4px 10px", borderRadius: "20px",
                            background: p.verified ? "#dcfce7" : p.rejected ? "#fee2e2" : "#fef9c3",
                            color: p.verified ? "#15803d" : p.rejected ? "#b91c1c" : "#92400e",
                            border: `1px solid ${p.verified ? "#86efac" : p.rejected ? "#fca5a5" : "#fde68a"}`,
                          }}>
                            {p.verified ? "Verified" : p.rejected ? "Rejected" : "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── RENEWAL TAB ──────────────────────────────────────────────────── */}
          {activeTab === "renewal" && (() => {
            const isDeadlinePassed = renewalSettings.renewalOpenDate ? new Date() >= new Date(renewalSettings.renewalOpenDate) : false;
            const isDpSubmitted = dpSubmitted || !!profile.renewalStatus?.downpayment?.submitted;
            const isDpVerified = !!profile.renewalStatus?.downpayment?.verified;

            const handleRenewalSubmit = async (e: React.FormEvent) => {
              e.preventDefault();
              if (!renewalForm.agreed || !user) return;
              setSubmittingRenewal(true);

              try {
                const res = await fetch("/api/parents/renewal", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ uid: user.uid, ...renewalForm })
                });

                if (!res.ok) throw new Error("Failed to submit");

                // Refresh profile so the UI instantly updates to the "Submitted" state
                await fetchProfile(user.uid);

                setSubmittingRenewal(false);
                setRenewalSubmitted(true);
                setShowRenewalForm(false);
              } catch (err) {
                console.error(err);
                setSubmittingRenewal(false);
                showToast("Failed to submit renewal. Please try again.", "error");
              }
            };

            // If the parent has already submitted the renewal form
            if (profile.renewalStatus?.hasSubmitted) {
              const status = profile.renewalStatus;

              return (
                <div style={{ background: "white", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", padding: "20px", borderRadius: "16px", border: "1px solid #bbf7d0" }}>
                    <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "linear-gradient(135deg,#16a34a,#15803d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", flexShrink: 0, boxShadow: "0 4px 16px rgba(21,128,61,0.3)" }}>✅</div>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "18px", color: "#14532d" }}>Renewal Submitted</div>
                      <div style={{ fontSize: "13px", color: "#166534", fontWeight: "600", marginTop: "4px" }}>
                        Received on {new Date(status.submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: "24px", background: "#f8faff", borderRadius: "16px", border: "1px solid #c5d6ff" }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: "14px", color: "#002f76", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>Current Status</h3>

                    {status.returning === "no" && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                        <span style={{ fontSize: "24px" }}>👋</span>
                        <div>
                          <p style={{ margin: "0 0 4px", fontWeight: "700", color: "#334155" }}>Not Returning Next Adventure</p>
                          <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>We're sorry to see you go! Thank you for being a part of Merry Explorers.</p>
                        </div>
                      </div>
                    )}

                    {status.returning === "maybe" && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                        <span style={{ fontSize: "24px" }}>🤔</span>
                        <div>
                          <p style={{ margin: "0 0 4px", fontWeight: "700", color: "#334155" }}>Undecided</p>
                          <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>You've indicated you need more time. Please let us know soon so we can hold your slot!</p>
                        </div>
                      </div>
                    )}

                    {status.returning === "yes" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                          <span style={{ fontSize: "24px" }}>{isDpVerified ? "🎉" : isDpSubmitted ? "⏳" : isDeadlinePassed ? "💳" : "🎟️"}</span>
                          <div>
                            <p style={{ margin: "0 0 4px", fontWeight: "800", color: isDpVerified ? "#15803d" : isDpSubmitted ? "#b45309" : isDeadlinePassed ? "#c2410c" : "#15803d" }}>
                              {isDpVerified ? "Slot Confirmed!" : isDpSubmitted ? "Pending Verification" : isDeadlinePassed ? "Pending Downpayment" : "Slot Secured (Free for now)"}
                            </p>
                            <p style={{ margin: 0, fontSize: "14px", color: "#475569" }}>
                              {isDpVerified
                                ? "Your renewal downpayment has been verified. Your slot for the next adventure is fully secured!"
                                : isDpSubmitted
                                  ? "Your downpayment is currently being verified by our team. We'll update this status once confirmed."
                                  : isDeadlinePassed
                                    ? "Your slot is currently on hold. Please submit your downpayment to finalize your renewal."
                                    : `Your slot is secured! A downpayment will be required on ${renewalSettings.renewalOpenDate ? new Date(renewalSettings.renewalOpenDate).toLocaleDateString() : "the deadline"}.`}
                            </p>
                          </div>
                        </div>

                        {!isDpSubmitted && (
                          <div style={{ marginTop: "8px", border: "1.5px solid #e2e8f0", borderRadius: "16px", overflow: "hidden" }}>
                            <div style={{ background: "linear-gradient(135deg,#002f76,#0050d5)", padding: "14px 20px", color: "white" }}>
                              <div style={{ fontWeight: "800", fontSize: "14px", letterSpacing: "0.3px" }}>💳 Submit Downpayment</div>
                              <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "2px" }}>
                                {isDeadlinePassed
                                  ? "Your slot is on hold — submit your downpayment now to secure it."
                                  : "Pay your downpayment early to fully secure your slot before the deadline."}
                              </div>
                            </div>

                            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", background: "#fafbff" }}>

                              {(() => {
                                const progKey = profile.studentInfo?.program || Object.keys(PROGRAM_SLOTS).find(k => PROGRAM_SLOTS[k as keyof typeof PROGRAM_SLOTS].name === profile.program);
                                const progData = progKey ? PROGRAM_SLOTS[progKey as keyof typeof PROGRAM_SLOTS] : null;
                                const dpAmount = progData ? progData.downpayment : 0;
                                const fullAmount = progData ? progData.rate : 0;
                                const amountDue = dpPaymentType === "full" ? fullAmount : dpAmount;

                                return (
                                  <>
                                    {/* Payment Type */}
                                    {progData && (
                                      <div>
                                        <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "10px" }}>Payment Option</div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                          <button
                                            type="button"
                                            onClick={() => setDpPaymentType("downpayment")}
                                            style={{
                                              padding: "16px 12px", borderRadius: "14px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                                              border: `2px solid ${dpPaymentType === "downpayment" ? "#002f76" : "#e2e8f0"}`,
                                              background: dpPaymentType === "downpayment" ? "#f0f5ff" : "white",
                                              cursor: "pointer", transition: "all 0.15s"
                                            }}
                                          >
                                            <span style={{ fontSize: "20px" }}>💳</span>
                                            <span style={{ fontWeight: "800", fontSize: "13px", color: "#002f76" }}>Downpayment</span>
                                            <span style={{ fontWeight: "900", fontSize: "15px", color: "#0050d5" }}>₱{dpAmount.toLocaleString()}</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setDpPaymentType("full")}
                                            style={{
                                              padding: "16px 12px", borderRadius: "14px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                                              border: `2px solid ${dpPaymentType === "full" ? "#15803d" : "#e2e8f0"}`,
                                              background: dpPaymentType === "full" ? "#f0fdf4" : "white",
                                              cursor: "pointer", transition: "all 0.15s"
                                            }}
                                          >
                                            <span style={{ fontSize: "20px" }}>🏆</span>
                                            <span style={{ fontWeight: "800", fontSize: "13px", color: "#002f76" }}>Full Payment</span>
                                            <span style={{ fontWeight: "900", fontSize: "15px", color: "#16a34a" }}>₱{fullAmount.toLocaleString()}</span>
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Amount Due Card */}
                                    {progData && (
                                      <div style={{ background: dpPaymentType === "full" ? "linear-gradient(135deg,#16a34a,#22c55e)" : "linear-gradient(135deg,#002f76,#0050d5)", color: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                                        <div style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.8 }}>Amount Due</div>
                                        <div style={{ fontSize: "32px", fontWeight: "900", marginTop: "2px" }}>₱{amountDue.toLocaleString()}</div>
                                      </div>
                                    )}
                                    <div>
                                      <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "10px" }}>Select Payment Method</div>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                                        {[
                                          { id: "gcash", label: "GCash", qr: "/GCASHQRONLY.png" },
                                          { id: "bpi", label: "BPI", qr: "/BPIQRONLY.png" },
                                          { id: "mari-bank", label: "Mari Bank", qr: "/MARIBANKQRONLY.png" },
                                        ].map((method) => (
                                          <button
                                            key={method.id}
                                            type="button"
                                            onClick={() => setDpPaymentMethod(method.id)}
                                            style={{
                                              padding: "12px 8px",
                                              borderRadius: "12px",
                                              border: `2px solid ${dpPaymentMethod === method.id ? "#002f76" : "#e2e8f0"}`,
                                              background: dpPaymentMethod === method.id ? "#f0f5ff" : "white",
                                              cursor: "pointer",
                                              fontWeight: "700",
                                              fontSize: "12px",
                                              color: dpPaymentMethod === method.id ? "#002f76" : "#64748b",
                                              transition: "all 0.15s"
                                            }}
                                          >
                                            {method.id === "gcash" ? "💚" : method.id === "bpi" ? "🏦" : "🏛️"} {method.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* QR Code */}
                                    {dpPaymentMethod && (
                                      <div style={{ textAlign: "center", padding: "16px", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Scan to Pay via {dpPaymentMethod === "gcash" ? "GCash" : dpPaymentMethod === "bpi" ? "BPI" : "Mari Bank"}</div>
                                        <img
                                          src={dpPaymentMethod === "gcash" ? "/GCASHQRONLY.png" : dpPaymentMethod === "bpi" ? "/BPIQRONLY.png" : "/MARIBANKQRONLY.png"}
                                          alt="QR Code"
                                          style={{ width: "160px", height: "160px", objectFit: "contain", margin: "0 auto", display: "block" }}
                                        />
                                      </div>
                                    )}

                                    {/* Amount Paid */}
                                    <div>
                                      <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>Amount Paid (₱)</div>
                                      <input
                                        type="number"
                                        placeholder={`e.g. ${amountDue || 1500}`}
                                        value={dpAmountPaid}
                                        onChange={(e) => setDpAmountPaid(e.target.value)}
                                        style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", fontWeight: "700", outline: "none", boxSizing: "border-box", background: "white" }}
                                      />
                                    </div>

                                    {/* Reference Number */}
                                    <div>
                                      <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>Reference Number</div>
                                      <input
                                        type="text"
                                        placeholder="e.g. ITO1234567890"
                                        value={dpReferenceNumber}
                                        onChange={(e) => setDpReferenceNumber(e.target.value)}
                                        style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", fontWeight: "700", outline: "none", boxSizing: "border-box", background: "white" }}
                                      />
                                    </div>

                                    {/* Receipt Upload */}
                                    <div>
                                      <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>Upload Receipt / Screenshot</div>
                                      {dpReceiptPreview ? (
                                        <div style={{ position: "relative", textAlign: "center" }}>
                                          <img src={dpReceiptPreview} alt="Receipt" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "10px", border: "1px solid #e2e8f0", objectFit: "contain" }} />
                                          <button
                                            type="button"
                                            onClick={() => { setDpReceiptPreview(""); setDpReceiptBase64(""); }}
                                            style={{ marginTop: "8px", fontSize: "12px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: "700" }}
                                          >✕ Remove</button>
                                        </div>
                                      ) : (
                                        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", padding: "24px", border: "2px dashed #c5d6ff", borderRadius: "12px", cursor: "pointer", background: "#f8faff" }}>
                                          <span style={{ fontSize: "28px" }}>📸</span>
                                          <span style={{ fontSize: "13px", fontWeight: "700", color: "#0050d5" }}>Tap to upload receipt</span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (!file) return;
                                              const reader = new FileReader();
                                              reader.onload = () => {
                                                const result = reader.result as string;
                                                setDpReceiptPreview(result);
                                                setDpReceiptBase64(result);
                                              };
                                              reader.readAsDataURL(file);
                                            }}
                                          />
                                        </label>
                                      )}
                                    </div>

                                    {/* Submit */}
                                    <button
                                      type="button"
                                      disabled={!dpPaymentMethod || !dpReceiptBase64 || !dpAmountPaid || !dpReferenceNumber || submittingDp}
                                      onClick={async () => {
                                        if (!user) return;
                                        setSubmittingDp(true);
                                        try {
                                          const res = await fetch("/api/parents/downpayment", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              uid: user.uid,
                                              paymentMethod: dpPaymentMethod,
                                              paymentType: dpPaymentType,
                                              receiptBase64: dpReceiptBase64,
                                              referenceNumber: dpReferenceNumber,
                                              amountPaid: parseFloat(dpAmountPaid),
                                              expectedAmount: amountDue,
                                            })
                                          });
                                          if (!res.ok) throw new Error("Failed");
                                          setDpSubmitted(true);
                                        } catch {
                                          showToast("Failed to submit. Please try again.", "error");
                                        } finally {
                                          setSubmittingDp(false);
                                        }
                                      }}
                                      style={{
                                        width: "100%",
                                        padding: "14px",
                                        background: (!dpPaymentMethod || !dpReceiptBase64 || !dpAmountPaid || !dpReferenceNumber) ? "#cbd5e1" : "linear-gradient(135deg,#002f76,#0050d5)",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "12px",
                                        fontSize: "15px",
                                        fontWeight: "800",
                                        cursor: (!dpPaymentMethod || !dpReceiptBase64 || !dpAmountPaid || !dpReferenceNumber) ? "not-allowed" : "pointer",
                                        boxShadow: "0 4px 16px rgba(0,47,118,0.2)",
                                        transition: "all 0.2s"
                                      }}
                                    >
                                      {submittingDp ? "Submitting..." : `Submit ${dpPaymentType === 'full' ? 'Full Payment' : 'Downpayment'}`}
                                    </button>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {dpSubmitted && (
                          <div style={{ textAlign: "center", padding: "20px", background: "#f0fdf4", borderRadius: "14px", border: "1px solid #bbf7d0" }}>
                            <div style={{ fontSize: "36px", marginBottom: "8px" }}>🎉</div>
                            <p style={{ fontWeight: "800", color: "#14532d", margin: "0 0 4px" }}>Downpayment Submitted!</p>
                            <p style={{ fontSize: "13px", color: "#166534", margin: 0 }}>Our team will verify your payment within 1–2 business days.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div style={{ background: "white", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)" }}>
                {renewalSettings.renewalOpen ? (
                  <>
                    {renewalSubmitted ? (
                      <div style={{ textAlign: "center", padding: "40px 20px" }}>
                        <div style={{ fontSize: "64px", marginBottom: "16px" }}>🎉</div>
                        <h1 style={{ color: "#002f76", fontSize: "28px", fontWeight: "900", margin: "0 0 12px" }}>Renewal Received!</h1>
                        <p style={{ color: "#64748b", fontSize: "16px", margin: "0 0 32px", lineHeight: "1.6", maxWidth: "400px", display: "inline-block" }}>
                          Thank you for renewing {profile.childName}&apos;s slot for the next adventure.
                          {isDeadlinePassed ? " Our team will contact you shortly regarding your downpayment." : " You've successfully secured your slot for FREE!"}
                        </p>
                      </div>
                    ) : showRenewalForm ? (
                      <div>
                        {/* Form Header with Back Button */}
                        <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
                          <button
                            onClick={() => setShowRenewalForm(false)}
                            style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1px solid #cbd5e1", background: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "20px", color: "#64748b" }}
                          >
                            ←
                          </button>
                          <div>
                            <h2 style={{ color: "#002f76", fontSize: "24px", fontWeight: "900", margin: 0 }}>Renewal Form</h2>
                            <p style={{ color: "#64748b", fontSize: "14px", margin: "4px 0 0" }}>Secure {profile.childName}&apos;s slot in the {profile.program} program.</p>
                          </div>
                        </div>

                        {/* Status Banner inside form */}
                        <div style={{ padding: "16px", borderRadius: "14px", marginBottom: "24px", display: "flex", gap: "12px", alignItems: "center", background: isDeadlinePassed ? "linear-gradient(135deg,#ffedd5,#fed7aa)" : "linear-gradient(135deg,#f0f7ff,#e8f0fe)", border: isDeadlinePassed ? "1px solid #fdba74" : "1px solid #bfdbfe" }}>
                          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: isDeadlinePassed ? "linear-gradient(135deg,#c2410c,#ea580c)" : "linear-gradient(135deg,#002f76,#0050d5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0, boxShadow: isDeadlinePassed ? "0 4px 16px rgba(234,88,12,0.4)" : "0 4px 16px rgba(0,47,118,0.4)" }}>
                            {isDeadlinePassed ? "⚠️" : "🎟️"}
                          </div>
                          <div>
                            <div style={{ fontWeight: "800", fontSize: "14px", color: isDeadlinePassed ? "#7c2d12" : "#002f76" }}>
                              {isDeadlinePassed ? "Downpayment Required" : "Slot Security is FREE"}
                            </div>
                            <div style={{ fontSize: "13px", color: isDeadlinePassed ? "#9a3412" : "#0050d5", fontWeight: "500", marginTop: "2px" }}>
                              {isDeadlinePassed
                                ? "The deadline has passed. A downpayment is now required to renew."
                                : "You are renewing before the deadline! No downpayment required right now."}
                            </div>
                          </div>
                        </div>

                        {/* Inline Form */}
                        <form onSubmit={handleRenewalSubmit} style={{ display: "grid", gap: "20px" }}>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "16px", background: "#f8faff", borderRadius: "14px", border: "1px dashed #cbd5e1" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Explorer Name</label>
                              <div style={{ fontSize: "14px", fontWeight: "700", color: "#002f76" }}>{profile.childName}</div>
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Program</label>
                              <div style={{ fontSize: "14px", fontWeight: "700", color: "#002f76" }}>{profile.program}</div>
                            </div>
                          </div>

                          <div>
                            <label style={{ display: "block", fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
                              Are you renewing for the next adventure?
                            </label>
                            <select
                              value={renewalForm.returning}
                              onChange={(e) => setRenewalForm({ ...renewalForm, returning: e.target.value })}
                              style={{ width: "100%", padding: "14px 16px", border: "1px solid #cbd5e1", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            >
                              <option value="yes">Yes, definitely!</option>
                              <option value="maybe">I need more time to decide</option>
                              <option value="no">No, we will not be returning</option>
                            </select>
                          </div>

                          {renewalForm.returning === "yes" && !profile.program.toLowerCase().includes("trailblazer") && (
                            <div>
                              <label style={{ display: "block", fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
                                Any special requests or schedule changes? (Optional)
                              </label>
                              <textarea
                                value={renewalForm.notes}
                                onChange={(e) => setRenewalForm({ ...renewalForm, notes: e.target.value })}
                                rows={3}
                                placeholder="e.g. Can we switch to the afternoon class?"
                                style={{ width: "100%", padding: "14px 16px", border: "1px solid #cbd5e1", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                              />
                            </div>
                          )}

                          {renewalForm.returning === "no" && (
                            <div>
                              <label style={{ display: "block", fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
                                We&apos;re sorry to see you go! Could you let us know why you won&apos;t be returning? (Optional)
                              </label>
                              <textarea
                                value={renewalForm.reason}
                                onChange={(e) => setRenewalForm({ ...renewalForm, reason: e.target.value })}
                                rows={3}
                                placeholder="Your feedback helps us improve..."
                                style={{ width: "100%", padding: "14px 16px", border: "1px solid #cbd5e1", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                              />
                            </div>
                          )}

                          <label style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginTop: "4px", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={renewalForm.agreed}
                              onChange={(e) => setRenewalForm({ ...renewalForm, agreed: e.target.checked })}
                              style={{ width: "20px", height: "20px", marginTop: "2px", accentColor: "#0050d5" }}
                            />
                            <span style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
                              I confirm that I am the authorized parent/guardian of this child and understand that {isDeadlinePassed ? "a downpayment is required to secure this slot" : "this form secures our slot for the upcoming adventure"}.
                            </span>
                          </label>

                          <div style={{ marginTop: "16px", paddingTop: "20px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
                            <button
                              type="submit"
                              disabled={submittingRenewal || !renewalForm.agreed}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "14px 32px",
                                background: submittingRenewal || !renewalForm.agreed ? "#cbd5e1" : "linear-gradient(135deg,#002f76,#0050d5)",
                                color: submittingRenewal || !renewalForm.agreed ? "#94a3b8" : "white",
                                border: "none",
                                borderRadius: "12px",
                                fontSize: "14px",
                                fontWeight: "800",
                                cursor: submittingRenewal || !renewalForm.agreed ? "not-allowed" : "pointer",
                                boxShadow: submittingRenewal || !renewalForm.agreed ? "none" : "0 4px 16px rgba(0,47,118,0.25)",
                                transition: "all 0.2s"
                              }}
                            >
                              {submittingRenewal ? "Submitting..." : (isDeadlinePassed ? "Submit & Pay Downpayment" : "Secure Slot Now")}
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <>
                        {/* Header banner */}
                        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", background: isDeadlinePassed ? "linear-gradient(135deg,#ffedd5,#fed7aa)" : "linear-gradient(135deg,#f0f7ff,#e8f0fe)", padding: "20px", borderRadius: "16px", border: isDeadlinePassed ? "1px solid #fdba74" : "1px solid #bfdbfe" }}>
                          <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: isDeadlinePassed ? "linear-gradient(135deg,#c2410c,#ea580c)" : "linear-gradient(135deg,#002f76,#0050d5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", flexShrink: 0, boxShadow: isDeadlinePassed ? "0 4px 16px rgba(234,88,12,0.4)" : "0 4px 16px rgba(0,47,118,0.4)" }}>{isDeadlinePassed ? "⚠️" : "🔄"}</div>
                          <div>
                            <div style={{ fontWeight: "800", fontSize: "18px", color: isDeadlinePassed ? "#7c2d12" : "#002f76" }}>{isDeadlinePassed ? "Slot Forfeited — Downpayment Required" : "Renewal is Now Open!"}</div>
                            <div style={{ fontSize: "13px", color: isDeadlinePassed ? "#9a3412" : "#0050d5", fontWeight: "600", marginTop: "4px" }}>
                              {isDeadlinePassed
                                ? `The deadline passed. Secure ${profile.childName || "your child"}'s slot with a downpayment now.`
                                : `Secure ${profile.childName || "your child"}'s slot for the next adventure`}
                            </div>
                          </div>
                        </div>

                        {/* Info cards */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
                          {/* Slot security */}
                          <div style={{ background: isDeadlinePassed ? "linear-gradient(135deg,#fee2e2,#fecaca)" : "linear-gradient(135deg,#f0fdf4,#dcfce7)", borderRadius: "14px", padding: "16px", border: isDeadlinePassed ? "1px solid #fca5a5" : "1px solid #bbf7d0" }}>
                            <div style={{ fontSize: "20px", marginBottom: "6px" }}>🎟️</div>
                            <div style={{ fontSize: "12px", fontWeight: "800", color: isDeadlinePassed ? "#b91c1c" : "#15803d", textTransform: "uppercase", letterSpacing: "0.05em" }}>Slot Security</div>
                            <div style={{ fontSize: "13px", color: isDeadlinePassed ? "#991b1b" : "#166534", fontWeight: "600", marginTop: "4px" }}>
                              {isDeadlinePassed ? "Slot forfeited for next adventure." : "FREE to secure your slot — just fill out the form!"}
                            </div>
                          </div>
                          {/* Downpayment deadline */}
                          <div style={{ background: "linear-gradient(135deg,#fff7ed,#ffedd5)", borderRadius: "14px", padding: "16px", border: "1px solid #fed7aa" }}>
                            <div style={{ fontSize: "20px", marginBottom: "6px" }}>💳</div>
                            <div style={{ fontSize: "12px", fontWeight: "800", color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.05em" }}>{isDeadlinePassed ? "Downpayment Required Now" : "Downpayment Due"}</div>
                            <div style={{ fontSize: "13px", color: "#9a3412", fontWeight: "600", marginTop: "4px" }}>
                              {isDeadlinePassed ? "You must pay the downpayment to renew again." : (renewalSettings.renewalOpenDate
                                ? new Date(renewalSettings.renewalOpenDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                                : "2 weeks before the next adventure")}
                            </div>
                          </div>
                        </div>

                        {/* Next adventure date */}
                        {renewalSettings.nextAdventureStart && (
                          <div style={{ background: "linear-gradient(135deg,#eff6ff,#dbeafe)", borderRadius: "14px", padding: "16px", border: "1px solid #bfdbfe", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ fontSize: "22px" }}>🚀</div>
                            <div>
                              <div style={{ fontSize: "11px", fontWeight: "800", color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Next Adventure Starts</div>
                              <div style={{ fontSize: "15px", color: "#1e3a8a", fontWeight: "800", marginTop: "2px" }}>
                                {new Date(renewalSettings.nextAdventureStart).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* CTA Button */}
                        <div style={{ textAlign: "center", padding: "32px 20px", background: isDeadlinePassed ? "#fff7ed" : "#f8faff", borderRadius: "16px", border: isDeadlinePassed ? "1px dashed #fdba74" : "1px dashed #bfdbfe" }}>
                          <div style={{ fontSize: "36px", marginBottom: "12px" }}>📝</div>
                          <p style={{ margin: "0 0 20px", fontSize: "14px", color: isDeadlinePassed ? "#c2410c" : "#0050d5", fontWeight: "600" }}>
                            {isDeadlinePassed ? `Fill out the renewal form to reserve ${profile.childName || "your child"}'s spot with a downpayment!` : `Fill out the renewal form to reserve ${profile.childName || "your child"}'s spot!`}
                          </p>
                          <button
                            onClick={() => setShowRenewalForm(true)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "16px 36px",
                              background: isDeadlinePassed ? "linear-gradient(135deg,#ea580c,#f97316)" : "linear-gradient(135deg,#002f76,#0050d5)",
                              color: "white",
                              borderRadius: "14px",
                              fontSize: "16px",
                              fontWeight: "800",
                              border: "none",
                              cursor: "pointer",
                              textDecoration: "none",
                              boxShadow: isDeadlinePassed ? "0 8px 24px rgba(234,88,12,0.35)" : "0 8px 24px rgba(0,47,118,0.25)",
                              transition: "all 0.2s",
                            }}
                            onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = isDeadlinePassed ? "0 12px 32px rgba(234,88,12,0.45)" : "0 12px 32px rgba(0,47,118,0.35)"; }}
                            onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = isDeadlinePassed ? "0 8px 24px rgba(234,88,12,0.35)" : "0 8px 24px rgba(0,47,118,0.25)"; }}
                          >
                            <span>📋</span> {isDeadlinePassed ? "Renew with Downpayment" : "Renew Now"}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ fontSize: "56px", marginBottom: "16px", opacity: 0.5 }}>⏳</div>
                    <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "#002f76", fontWeight: "800" }}>Not Ready for Renewal Yet</h3>
                    <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#64748b" }}>We will post the renewal form link here when the current adventure is nearing its end.</p>
                    {renewalSettings.nextAdventureStart && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "linear-gradient(135deg,#eff6ff,#dbeafe)", borderRadius: "14px", padding: "14px 20px", border: "1px solid #bfdbfe" }}>
                        <span style={{ fontSize: "18px" }}>🚀</span>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: "10px", fontWeight: "800", color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Next Adventure Starts</div>
                          <div style={{ fontSize: "14px", color: "#1e3a8a", fontWeight: "800" }}>
                            {new Date(renewalSettings.nextAdventureStart).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── PROFILE TAB ──────────────────────────────────────────────────── */}
          {activeTab === "profile" && <ProfileTab profile={profile} user={user} showToast={showToast} isVirtualTutorial={isVirtualSession} />}

        </div>
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightbox && (
        <Lightbox
          photos={lightbox.album.photos}
          startIndex={lightbox.photoIdx}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* ── Change Password Modal ─────────────────────────────────────────── */}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}

      {/* ── File Viewer Modal ──────────────────────────────────────────────── */}
      {fileViewer && (
        <FileViewerModal viewer={fileViewer} onClose={() => setFileViewer(null)} />
      )}

      {/* ── Edit Virtual Class Favorites & Photo Modal ──────────────────────── */}
      {showEditSurveyModal && (
        <VirtualOnboardingModal
          profile={profile}
          isGateMode={false}
          onClose={() => setShowEditSurveyModal(false)}
          onSave={(updatedData) => {
            setProfile((p) => (p ? { ...p, ...updatedData } : p));
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ─── Profile Tab Component ────────────────────────────────────────────────────
function ProfileTab({ profile, user, showToast, isVirtualTutorial }: { profile: any; user: any; showToast: (msg: string, type?: "success" | "error" | "info") => void; isVirtualTutorial?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const childFavs = profile.studentInfo?.childInfo || profile.childInfo;
  const [formData, setFormData] = useState({
    nickname: childFavs?.nickname || "",
    dateOfBirth: childFavs?.dateOfBirth || "",
    gender: childFavs?.gender || "",
    healthProfile: childFavs?.healthProfile || "",
    favoriteSong: childFavs?.favoriteSong || "",
    favoriteColor: childFavs?.favoriteColor || "",
    favoriteCharacter: childFavs?.favoriteCharacter || "",
    emName: profile.studentInfo?.emergencyContact?.name || profile.emergencyContact?.name || "",
    emRelationship: profile.studentInfo?.emergencyContact?.relationship || profile.emergencyContact?.relationship || "",
    emPhone: profile.studentInfo?.emergencyContact?.phone || profile.emergencyContact?.phone || "",
  });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch("/api/parents/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          childInfo: {
            nickname: formData.nickname,
            dateOfBirth: formData.dateOfBirth,
            gender: formData.gender,
            healthProfile: formData.healthProfile,
            favoriteSong: formData.favoriteSong,
            favoriteColor: formData.favoriteColor,
            favoriteCharacter: formData.favoriteCharacter,
          },
          emergencyContact: {
            name: formData.emName,
            relationship: formData.emRelationship,
            phone: formData.emPhone,
          }
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showToast("Profile changes saved successfully! ✅", "success");
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        showToast(data.error || "Failed to save changes. Please try again.", "error");
        setSaving(false);
      }
    } catch (e) {
      console.error(e);
      showToast("Network error. Please try again.", "error");
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ── Hero Profile Banner ── */}
      <div className="responsive-banner" style={{
        background: "linear-gradient(135deg,#001a4d 0%,#002f76 45%,#0050d5 100%)",
        borderRadius: "24px",
        padding: "36px 40px",
        color: "white",
        boxShadow: "0 12px 48px rgba(0,47,118,0.35)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-60px", right: "80px", width: "160px", height: "160px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

        <div className="responsive-banner-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "24px", position: "relative" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "2px", opacity: 0.6, marginBottom: "8px" }}>👤 Explorer Settings</div>
            <div style={{ fontSize: "28px", fontWeight: "900", lineHeight: "1.2", marginBottom: "20px", letterSpacing: "-0.5px" }}>
              Profile & Emergency Contact
            </div>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "14px", maxWidth: "400px", lineHeight: "1.6" }}>
              Keep your child&apos;s details updated to help us provide the best care and experience in class.
            </p>
          </div>

          <div className="responsive-banner-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} style={{ padding: "12px 24px", borderRadius: "14px", background: "white", color: "#002f76", fontWeight: "800", fontSize: "14px", border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>Edit Profile</button>
            ) : (
              <>
                <button onClick={() => setIsEditing(false)} style={{ padding: "12px 24px", borderRadius: "14px", background: "rgba(255,255,255,0.15)", color: "white", fontWeight: "700", fontSize: "14px", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"} onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: "12px 24px", borderRadius: "14px", background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "white", fontWeight: "800", fontSize: "14px", border: "none", cursor: "pointer", opacity: saving ? 0.7 : 1, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", transition: "all 0.2s" }} onMouseOver={e => !saving && (e.currentTarget.style.transform = "translateY(-2px)")} onMouseOut={e => !saving && (e.currentTarget.style.transform = "translateY(0)")}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="responsive-grid-2" style={{ display: "grid", gap: "24px", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>

        {/* Child Info Card */}
        <div style={{ background: "white", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "linear-gradient(135deg,#e0e7ff,#c7d2fe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>👦</div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#002f76" }}>Child Information</div>
              <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>Basic details and health notes</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>Nickname</label>
              <input disabled={!isEditing} type="text" value={formData.nickname} onChange={e => setFormData({ ...formData, nickname: e.target.value })} style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "14px", color: isEditing ? "#0f172a" : "#64748b", background: isEditing ? "white" : "#f8fafc", boxSizing: "border-box", transition: "border 0.2s" }} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>Date of Birth</label>
                <input disabled={!isEditing} type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "14px", color: isEditing ? "#0f172a" : "#64748b", background: isEditing ? "white" : "#f8fafc", boxSizing: "border-box", transition: "border 0.2s" }} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>Gender</label>
                <select disabled={!isEditing} value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "14px", color: isEditing ? "#0f172a" : "#64748b", background: isEditing ? "white" : "#f8fafc", boxSizing: "border-box", transition: "border 0.2s" }} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"}>
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            {!isVirtualTutorial && (
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>Health Notes & Allergies</label>
                <textarea disabled={!isEditing} value={formData.healthProfile} onChange={e => setFormData({ ...formData, healthProfile: e.target.value })} placeholder="Any allergies or health conditions?" rows={3} style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "14px", color: isEditing ? "#0f172a" : "#64748b", background: isEditing ? "white" : "#f8fafc", resize: "none", boxSizing: "border-box", transition: "border 0.2s" }} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
              </div>
            )}
          </div>
        </div>

        {/* Right side: Favorites & Emergency Contact */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Favorites Card */}
          <div style={{ background: "white", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "linear-gradient(135deg,#fef3c7,#fde68a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>⭐</div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#002f76" }}>Favorites</div>
                <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>Things they love</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>Favorite Song</label>
                <input disabled={!isEditing} type="text" value={formData.favoriteSong} onChange={e => setFormData({ ...formData, favoriteSong: e.target.value })} placeholder="e.g. Baby Shark" style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "14px", color: isEditing ? "#0f172a" : "#64748b", background: isEditing ? "white" : "#f8fafc", boxSizing: "border-box", transition: "border 0.2s" }} onFocus={e => e.target.style.borderColor = "#f59e0b"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>Favorite Color</label>
                <input disabled={!isEditing} type="text" value={formData.favoriteColor} onChange={e => setFormData({ ...formData, favoriteColor: e.target.value })} placeholder="e.g. Blue" style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "14px", color: isEditing ? "#0f172a" : "#64748b", background: isEditing ? "white" : "#f8fafc", boxSizing: "border-box", transition: "border 0.2s" }} onFocus={e => e.target.style.borderColor = "#f59e0b"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>Favorite Character / Show</label>
              <input disabled={!isEditing} type="text" value={formData.favoriteCharacter} onChange={e => setFormData({ ...formData, favoriteCharacter: e.target.value })} placeholder="e.g. Peppa Pig" style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "14px", color: isEditing ? "#0f172a" : "#64748b", background: isEditing ? "white" : "#f8fafc", boxSizing: "border-box", transition: "border 0.2s" }} onFocus={e => e.target.style.borderColor = "#f59e0b"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
            </div>
          </div>

          {/* Emergency Contact Card — hidden for Virtual Tutorial */}
          {!isVirtualTutorial && (
            <div style={{ background: "white", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "linear-gradient(135deg,#fee2e2,#fca5a5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>🚨</div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#002f76" }}>Emergency Contact</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>In case we can&apos;t reach you</div>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>Full Name</label>
                <input disabled={!isEditing} type="text" value={formData.emName} onChange={e => setFormData({ ...formData, emName: e.target.value })} style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "14px", color: isEditing ? "#0f172a" : "#64748b", background: isEditing ? "white" : "#f8fafc", boxSizing: "border-box", transition: "border 0.2s" }} onFocus={e => e.target.style.borderColor = "#ef4444"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>Relationship</label>
                  <input disabled={!isEditing} type="text" value={formData.emRelationship} onChange={e => setFormData({ ...formData, emRelationship: e.target.value })} placeholder="e.g. Aunt" style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "14px", color: isEditing ? "#0f172a" : "#64748b", background: isEditing ? "white" : "#f8fafc", boxSizing: "border-box", transition: "border 0.2s" }} onFocus={e => e.target.style.borderColor = "#ef4444"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>Phone Number</label>
                  <input disabled={!isEditing} type="text" value={formData.emPhone} onChange={e => setFormData({ ...formData, emPhone: e.target.value })} style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "14px", color: isEditing ? "#0f172a" : "#64748b", background: isEditing ? "white" : "#f8fafc", boxSizing: "border-box", transition: "border 0.2s" }} onFocus={e => e.target.style.borderColor = "#ef4444"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !user.email) return;
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill out all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      console.error(err);
      if (err.message.includes("auth/invalid-credential") || err.message.includes("auth/wrong-password")) {
        setError("Current password is incorrect.");
      } else {
        setError(err.message || "Failed to change password.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Design Tokens
  const NAVY = "#0b2a82";
  const SUN = "#ffd23f";
  const SUN_LIGHT = "#ffe066";
  const SUN_DEEP = "#ffb82e";
  const INPUT_BG = "#f2faff";
  const INPUT_BORDER = "#b6dcf5";
  const ERROR = "#b3261e";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,15,40,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", animation: "fadeUp 0.2s ease" }}>
      <div style={{ position: "relative", background: "#fff", border: `4px solid ${NAVY}`, borderRadius: "28px", padding: "28px", width: "100%", maxWidth: "420px", boxShadow: `0 0 0 6px #fff, 0 12px 0 6px rgba(11,42,130,0.18)` }}>
        
        {/* Tape Accent */}
        <span style={{ position: "absolute", top: "-17px", left: "50%", width: "92px", height: "28px", marginLeft: "-46px", transform: "rotate(6deg)", background: `repeating-linear-gradient(45deg, ${SUN} 0 9px, ${SUN_LIGHT} 9px 18px)`, border: `2px solid rgba(11,42,130,0.25)`, borderRadius: "4px" }} aria-hidden="true" />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: NAVY }}>Change password</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: "20px", color: NAVY, cursor: "pointer", fontWeight: "700" }}>✕</button>
        </div>

        {/* Body */}
        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "56px", marginBottom: "16px", animation: "fadeUp 0.5s ease" }}>✅</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "20px", color: "#15803d", fontWeight: "800" }}>Password Updated</h3>
            <p style={{ margin: 0, fontSize: "15px", color: "#3d5a99", lineHeight: 1.5, fontWeight: "500" }}>Your new password has been set securely. You can now use it on your next login.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            <div>
              <label style={{ display: "block", fontSize: "15px", fontWeight: "600", color: NAVY, marginBottom: "6px" }}>Current Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Enter current password"
                  style={{ width: "100%", padding: "13px 14px", background: INPUT_BG, border: `3px solid ${INPUT_BORDER}`, borderRadius: "16px", fontSize: "16px", fontWeight: "500", color: NAVY, boxSizing: "border-box", outline: "none", transition: "border 0.2s" }}
                  onFocus={e => e.target.style.borderColor = NAVY}
                  onBlur={e => e.target.style.borderColor = INPUT_BORDER}
                />
                <button type="button" onClick={() => setShowPasswords(!showPasswords)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: "18px", cursor: "pointer", opacity: 0.6 }}>
                  {showPasswords ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "15px", fontWeight: "600", color: NAVY, marginBottom: "6px" }}>New Password</label>
              <input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                placeholder="At least 6 characters"
                style={{ width: "100%", padding: "13px 14px", background: INPUT_BG, border: `3px solid ${INPUT_BORDER}`, borderRadius: "16px", fontSize: "16px", fontWeight: "500", color: NAVY, boxSizing: "border-box", outline: "none", transition: "border 0.2s" }}
                onFocus={e => e.target.style.borderColor = NAVY}
                onBlur={e => e.target.style.borderColor = INPUT_BORDER}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "15px", fontWeight: "600", color: NAVY, marginBottom: "6px" }}>Confirm New Password</label>
              <input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                placeholder="Repeat new password"
                style={{ width: "100%", padding: "13px 14px", background: INPUT_BG, border: `3px solid ${INPUT_BORDER}`, borderRadius: "16px", fontSize: "16px", fontWeight: "500", color: NAVY, boxSizing: "border-box", outline: "none", transition: "border 0.2s" }}
                onFocus={e => e.target.style.borderColor = NAVY}
                onBlur={e => e.target.style.borderColor = INPUT_BORDER}
              />
            </div>

            {error && (
              <div style={{ background: "#fff0f0", color: ERROR, padding: "12px", borderRadius: "12px", fontSize: "14px", fontWeight: "600", border: "2px solid #ffd5d5", marginTop: "4px" }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: "12px", display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{ flex: 1, padding: "14px", background: "#fff", border: `3px solid ${NAVY}`, color: NAVY, borderRadius: "18px", fontSize: "16px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", boxShadow: `0 6px 0 ${NAVY}` }}
                onMouseOver={e => !loading && (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseOut={e => !loading && (e.currentTarget.style.transform = "none")}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{ flex: 1, padding: "14px", background: `linear-gradient(${SUN_LIGHT}, ${SUN} 50%, ${SUN_DEEP})`, border: `3px solid ${NAVY}`, color: NAVY, borderRadius: "18px", fontSize: "16px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", boxShadow: `0 6px 0 ${NAVY}` }}
                onMouseOver={e => !loading && (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseOut={e => !loading && (e.currentTarget.style.transform = "none")}
              >
                {loading ? "Updating..." : "Update"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
