"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

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

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "linear-gradient(135deg,#f0f7ff 0%,#e8f0fe 40%,#fdf4ff 100%)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "3px solid rgba(0,80,213,0.15)", borderTopColor: "#0050d5", animation: "spin 0.7s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#64748b", fontSize: "14px", fontWeight: "600" }}>Loading your dashboard…</p>
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
        onClick={onClose}
        style={{ position: "absolute", top: "20px", right: "20px", background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: "40px", height: "40px", color: "white", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      >✕</button>
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function ParentDashboardPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"session" | "photos" | "waiver" | "history">("session");
  const [lightbox, setLightbox] = useState<{ album: Album; photoIdx: number } | null>(null);
  const [expandedAlbum, setExpandedAlbum] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/parent/login");
      return;
    }
    fetchProfile(user.uid);
  }, [user, authLoading, router]);

  async function fetchProfile(uid: string) {
    try {
      setLoading(true);
      const res = await fetch(`/api/parents?uid=${uid}`);
      if (!res.ok) {
        if (res.status === 403) {
          await signOut();
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

  const recentAlbum = profile.albums[0] ?? null;
  const waiverSigned = true; // Will be driven by DB in the future; assume signed on portal creation

  // ─── Tabs ─────────────────────────────────────────────────────────────────

  const tabs = [
    { id: "session", label: "📅 Session", icon: "📅" },
    { id: "photos", label: "📸 Photos", icon: "📸" },
    { id: "waiver", label: "📄 Waiver", icon: "📄" },
    { id: "history", label: "🏕️ History", icon: "🏕️" },
  ] as const;

  return (
    <div
      id="parent-dashboard"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#f0f7ff 0%,#e8f0fe 40%,#fdf4ff 100%)",
        fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif",
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        .photo-thumb { transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
        .photo-thumb:hover { transform: scale(1.04); box-shadow: 0 12px 32px rgba(0,47,118,0.2); }
        .tab-btn { transition: all 0.2s; cursor: pointer; border: none; background: none; }
        .tab-btn:hover { background: rgba(0,80,213,0.08) !important; }
        .nav-link:hover { background: rgba(255,255,255,0.15) !important; }
      `}</style>

      {/* ── Top Nav ─────────────────────────────────────────────────────────── */}
      <nav
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
            <div>
              <span style={{ color: "white", fontWeight: "800", fontSize: "16px", letterSpacing: "-0.2px" }}>Merry Explorers</span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: "500", marginLeft: "8px" }}>Parent Portal</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "13px", fontWeight: "600", display: "none" }} className="sm:block">
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
              onClick={signOut}
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
          className="fade-up"
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ padding: "4px 12px", background: "#f0f5ff", color: "#0050d5", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: "1px solid #c5d6ff" }}>
                {profile.program}
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
          <div style={{ display: "flex", gap: "16px", flexShrink: 0 }}>
            <div style={{ textAlign: "center", padding: "12px 18px", background: "#f8faff", borderRadius: "14px", border: "1px solid #e8efff" }}>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#0050d5" }}>
                {profile.albums.length}
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
              </div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Sessions</div>
            </div>
            <div style={{ textAlign: "center", padding: "12px 18px", background: "#f8faff", borderRadius: "14px", border: "1px solid #e8efff" }}>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#0050d5" }}>
                {profile.albums.reduce((sum, a) => sum + a.photoCount, 0)}
              </div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Photos</div>
            </div>
          </div>
        </div>

        {/* ── Tab Bar ───────────────────────────────────────────────────────── */}
        <div
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
              className="tab-btn"
              onClick={() => setActiveTab(tab.id)}
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
            <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>

              {/* Current Program Card */}
              <div style={{ background: "linear-gradient(135deg,#002f76 0%,#0050d5 100%)", borderRadius: "20px", padding: "28px", color: "white", boxShadow: "0 8px 32px rgba(0,47,118,0.25)", display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7, marginBottom: "12px" }}>Current Program</div>
                <div style={{ fontSize: "22px", fontWeight: "800", marginBottom: "16px", lineHeight: "1.3", flex: 1 }}>
                  {profile.program || "—"}
                </div>
                {profile.schedule && (
                  <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: "10px", padding: "10px 14px", marginBottom: "10px" }}>
                    <div style={{ fontSize: "11px", opacity: 0.7, fontWeight: "600", marginBottom: "2px" }}>SCHEDULE</div>
                    <div style={{ fontWeight: "700", fontSize: "14px" }}>{profile.schedule}</div>
                  </div>
                )}
                {profile.classTime && (
                  <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: "10px", padding: "10px 14px" }}>
                    <div style={{ fontSize: "11px", opacity: 0.7, fontWeight: "600", marginBottom: "2px" }}>CLASS TIME</div>
                    <div style={{ fontWeight: "700", fontSize: "14px" }}>{profile.classTime}</div>
                  </div>
                )}
                
                {/* Next Session Timer */}
                {profile.schedule && profile.classTime && (
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7 }}>Next Session Starts In:</div>
                    <NextSessionCountdown schedule={profile.schedule} classTime={profile.classTime} />
                  </div>
                )}
              </div>

              {/* Latest Session Card */}
              <div style={{ background: "white", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>📅</div>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#002f76" }}>Latest Session</div>
                </div>

                {recentAlbum ? (
                  <div>
                    <p style={{ fontWeight: "700", color: "#002f76", fontSize: "15px", margin: "0 0 6px" }}>{recentAlbum.sessionLabel}</p>
                    {recentAlbum.note && (
                      <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.6", background: "#f8faff", borderRadius: "10px", padding: "10px 14px", margin: "0 0 12px" }}>
                        📝 {recentAlbum.note}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "10px" }}>
                      <span style={{ padding: "4px 12px", background: "#f0f5ff", color: "#0050d5", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: "1px solid #c5d6ff" }}>
                        📸 {recentAlbum.photoCount} photo{recentAlbum.photoCount !== 1 ? "s" : ""}
                      </span>
                      {recentAlbum.expiresAt && !isExpired(recentAlbum.expiresAt) && (
                        <span style={{ padding: "4px 12px", background: "#fff8e1", color: "#b45309", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: "1px solid #fde68a" }}>
                          ⏰ Expires {fmtDate(recentAlbum.expiresAt)}
                        </span>
                      )}
                      {recentAlbum.expiresAt && isExpired(recentAlbum.expiresAt) && (
                        <span style={{ padding: "4px 12px", background: "#fff0f0", color: "#ba1a1a", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: "1px solid #ffd5d5" }}>
                          Expired
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => { setActiveTab("photos"); setExpandedAlbum(recentAlbum.id); }}
                      style={{ marginTop: "16px", padding: "10px 20px", background: "linear-gradient(135deg,#002f76,#0050d5)", color: "white", border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "13px", cursor: "pointer", width: "100%" }}
                    >
                      View Photos →
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8" }}>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>📷</div>
                    <p style={{ fontSize: "13px", fontWeight: "600" }}>No sessions recorded yet</p>
                  </div>
                )}
              </div>

              {/* Child Info Card */}
              <div style={{ background: "white", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>👦</div>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#002f76" }}>Child Information</div>
                </div>
                <dl style={{ margin: 0, display: "grid", gap: "10px" }}>
                  {[
                    { label: "Name", value: profile.childName },
                    { label: "Program", value: profile.program },
                    { label: "Schedule", value: profile.schedule || "—" },
                    { label: "Class Time", value: profile.classTime || "—" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8faff", borderRadius: "8px" }}>
                      <dt style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</dt>
                      <dd style={{ fontSize: "13px", fontWeight: "700", color: "#002f76", margin: 0, textAlign: "right", maxWidth: "60%" }}>{value}</dd>
                    </div>
                  ))}
                </dl>
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
                    const expanded = expandedAlbum === album.id;
                    const expired = isExpired(album.expiresAt);
                    return (
                      <div
                        key={album.id}
                        id={`album-${album.id}`}
                        style={{ background: "white", borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)" }}
                      >
                        {/* Album header */}
                        <button
                          onClick={() => setExpandedAlbum(expanded ? null : album.id)}
                          style={{ width: "100%", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
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
                                  ⏰ Until {fmtDate(album.expiresAt)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <span style={{ fontSize: "18px", color: "#94a3b8", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
                        </button>

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
                      ? "Your participation waiver has been received and is on file."
                      : "Please contact us to complete your waiver form."}
                  </div>
                </div>
              </div>

              {/* Waiver contents summary */}
              <h3 style={{ color: "#002f76", fontWeight: "800", fontSize: "16px", margin: "0 0 16px" }}>What's Covered in Your Waiver</h3>
              <div style={{ display: "grid", gap: "10px" }}>
                {[
                  { icon: "🏃", title: "Physical Activity Consent", desc: "Consent for your child to participate in indoor and outdoor play activities, arts & crafts, and structured movement." },
                  { icon: "📸", title: "Photo & Video Authorization", desc: "Permission for Merry Explorers to photograph and video your child for internal documentation and parent communications." },
                  { icon: "🏥", title: "Emergency Medical Consent", desc: "Authorization for staff to seek emergency medical treatment for your child if you are unreachable." },
                  { icon: "🔒", title: "Data Privacy Agreement", desc: "Acknowledgment that your personal and child information is stored securely per our privacy policy." },
                  { icon: "📋", title: "Program Rules & Policies", desc: "Agreement to abide by the Merry Explorers code of conduct, attendance policies, and pickup procedures." },
                ].map(({ icon, title, desc }) => (
                  <div key={title} style={{ display: "flex", gap: "14px", padding: "14px 16px", background: "#f8faff", borderRadius: "12px", border: "1px solid #e8efff" }}>
                    <span style={{ fontSize: "20px", flexShrink: 0, marginTop: "2px" }}>{icon}</span>
                    <div>
                      <div style={{ fontWeight: "700", color: "#002f76", fontSize: "14px", marginBottom: "3px" }}>{title}</div>
                      <div style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.55" }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ marginTop: "20px", fontSize: "12px", color: "#94a3b8", lineHeight: "1.6" }}>
                For questions about the waiver or to request a copy, please contact us at{" "}
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
                            {idx === 0 ? "★" : profile.albums.length - idx}
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
                            {album.photoCount > 0 && (
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
      // Re-authenticate first to ensure session is fresh
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
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

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,15,40,0.6)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", animation: "fadeUp 0.3s ease" }}>
      <div style={{ background: "white", borderRadius: "24px", width: "100%", maxWidth: "420px", overflow: "hidden", boxShadow: "0 32px 100px rgba(0,47,118,0.3)" }}>
        
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#f8faff,#f0f4ff)", padding: "24px", borderBottom: "1px solid #e8efff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#002f76", letterSpacing: "-0.2px" }}>Change Password</h2>
          <button onClick={onClose} style={{ background: "rgba(0,47,118,0.05)", border: "none", fontSize: "16px", color: "#64748b", cursor: "pointer", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "rgba(0,47,118,0.1)"} onMouseOut={e => e.currentTarget.style.background = "rgba(0,47,118,0.05)"}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "32px 24px" }}>
          {success ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "56px", marginBottom: "16px", animation: "fadeUp 0.5s ease" }}>✅</div>
              <h3 style={{ margin: "0 0 8px", fontSize: "20px", color: "#15803d", fontWeight: "800" }}>Password Updated</h3>
              <p style={{ margin: 0, fontSize: "15px", color: "#64748b", lineHeight: 1.5 }}>Your new password has been set securely. You can now use it on your next login.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1e3a6e", marginBottom: "8px" }}>Current Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Enter current password"
                    style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #dde5f0", borderRadius: "12px", fontSize: "15px", background: "#f8faff", outline: "none", boxSizing: "border-box", transition: "border 0.2s" }}
                    onFocus={e => e.target.style.borderColor = "#0050d5"}
                    onBlur={e => e.target.style.borderColor = "#dde5f0"}
                  />
                  <button type="button" onClick={() => setShowPasswords(!showPasswords)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: "18px", cursor: "pointer", opacity: 0.6 }}>
                    {showPasswords ? "👁️‍🗨️" : "👁️"}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1e3a6e", marginBottom: "8px" }}>New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    placeholder="At least 6 characters"
                    style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #dde5f0", borderRadius: "12px", fontSize: "15px", background: "#f8faff", outline: "none", boxSizing: "border-box", transition: "border 0.2s" }}
                    onFocus={e => e.target.style.borderColor = "#0050d5"}
                    onBlur={e => e.target.style.borderColor = "#dde5f0"}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1e3a6e", marginBottom: "8px" }}>Confirm New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Repeat new password"
                    style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #dde5f0", borderRadius: "12px", fontSize: "15px", background: "#f8faff", outline: "none", boxSizing: "border-box", transition: "border 0.2s" }}
                    onFocus={e => e.target.style.borderColor = "#0050d5"}
                    onBlur={e => e.target.style.borderColor = "#dde5f0"}
                  />
                </div>
              </div>

              {error && (
                <div style={{ background: "#fff0f0", color: "#ba1a1a", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", border: "1px solid #ffd5d5" }}>
                  {error}
                </div>
              )}

              <div style={{ marginTop: "12px", display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  style={{ flex: 1, padding: "14px", background: "rgba(148,163,184,0.1)", border: "none", color: "#64748b", borderRadius: "12px", fontSize: "14px", fontWeight: "800", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s" }}
                  onMouseOver={e => !loading && (e.currentTarget.style.background = "rgba(148,163,184,0.15)")}
                  onMouseOut={e => !loading && (e.currentTarget.style.background = "rgba(148,163,184,0.1)")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ flex: 1, padding: "14px", background: "linear-gradient(135deg,#002f76,#0050d5)", border: "none", color: "white", borderRadius: "12px", fontSize: "14px", fontWeight: "800", cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 8px 20px rgba(0,47,118,0.25)", transition: "all 0.2s" }}
                  onMouseOver={e => !loading && (e.currentTarget.style.transform = "translateY(-1px)")}
                  onMouseOut={e => !loading && (e.currentTarget.style.transform = "translateY(0)")}
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}
