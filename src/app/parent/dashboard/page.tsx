"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  waiverSignature?: string;
  waiverSignedAt?: string;
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

// ─── Waiver Gate ─────────────────────────────────────────────────────────────

function WaiverGate({ profile, onComplete }: { profile: ParentProfile; onComplete: (sig: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#002f76";
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSigned(true);
  }

  function stopDraw() { setIsDrawing(false); }

  function clearCanvas() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setHasScrolled(true);
    }
  }

  async function handleSubmit() {
    if (!hasSigned) { setError("Please sign the waiver before proceeding."); return; }
    const sig = canvasRef.current!.toDataURL("image/png");
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/parents/waiver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: profile.id, signature: sig }),
      });
      if (!res.ok) throw new Error("Failed to save signature.");
      onComplete(sig);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#f0f7ff 0%,#e8f0fe 40%,#fdf4ff 100%)", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .waiver-section h3 { color: #0050d5; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px; margin: 20px 0 6px; }
        .waiver-section p { margin: 0 0 10px; }
        .waiver-section ul { margin: 0 0 10px; padding-left: 20px; }
        .waiver-section li { margin-bottom: 4px; }
        .sig-canvas { touch-action: none; cursor: crosshair; }
      `}</style>

      {/* Header */}
      <nav style={{ background: "linear-gradient(90deg,#002f76 0%,#0050d5 100%)", padding: "0 24px", boxShadow: "0 2px 20px rgba(0,47,118,0.25)", flexShrink: 0 }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", gap: "12px", height: "64px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.15)", position: "relative", flexShrink: 0 }}>
            <Image src="/LOGO-noBG.png" alt="Merry Explorers" fill style={{ objectFit: "contain", padding: "3px" }} />
          </div>
          <div>
            <span style={{ color: "white", fontWeight: "800", fontSize: "16px" }}>Merry Explorers</span>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: "500", marginLeft: "8px" }}>Parent Portal</span>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 20px", flex: 1, display: "flex", flexDirection: "column", gap: "24px", animation: "fadeUp 0.4s ease" }}>

        {/* Intro banner */}
        <div style={{ background: "linear-gradient(135deg,#002f76 0%,#0050d5 100%)", borderRadius: "20px", padding: "28px 32px", color: "white", boxShadow: "0 8px 32px rgba(0,47,118,0.25)" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📋</div>
          <h1 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: "800", letterSpacing: "-0.3px" }}>Welcome, {profile.fullName.split(" ")[0]}!</h1>
          <p style={{ margin: 0, fontSize: "15px", opacity: 0.85, lineHeight: 1.6 }}>Before you enter the Parent Portal, please read the full Merry Explorers Parent/Guardian Acknowledgment & Agreement below. Scroll all the way to the bottom, then sign to confirm.</p>
        </div>

        {/* Waiver text card */}
        <div style={{ background: "white", borderRadius: "20px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)", overflow: "hidden" }}>
          <div style={{ background: "#f8faff", padding: "16px 24px", borderBottom: "1px solid #e8efff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "800", color: "#002f76", fontSize: "14px" }}>📄 Parent/Guardian Acknowledgment &amp; Agreement</span>
            {!hasScrolled && <span style={{ fontSize: "12px", fontWeight: "600", color: "#f59e0b", background: "#fffbeb", padding: "4px 12px", borderRadius: "20px", border: "1px solid #fde68a" }}>↓ Scroll to read all</span>}
            {hasScrolled && <span style={{ fontSize: "12px", fontWeight: "600", color: "#15803d", background: "#f0fdf4", padding: "4px 12px", borderRadius: "20px", border: "1px solid #bbf7d0" }}>✅ Read complete</span>}
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{ height: "420px", overflowY: "auto", padding: "24px", fontSize: "13px", color: "#334155", lineHeight: 1.75 }}
          >
            <div className="waiver-section">
              <p style={{ fontWeight: "800", color: "#002f76", fontSize: "14px", marginBottom: "12px" }}>MERRY EXPLORERS PLAYGROUP LEARNING CENTER<br />PARENT/GUARDIAN ACKNOWLEDGMENT &amp; AGREEMENT</p>
              <p>By registering my child with Merry Explorers Playgroup Learning Center, I confirm that I have read, understood, and agree to the following program terms and policies:</p>

              <h3>1. ADVENTURE / CYCLE</h3>
              <p>For Merry Explorers, &quot;Adventure&quot; means &quot;Cycle.&quot; Adventure 1, Adventure 2, Adventure 3, and so on refer to the succeeding stages of the program. An Adventure is not tied to a calendar month. A child progresses to the next Adventure once the required sessions for their program have been completed, including applicable make-up sessions. Adventure dates may therefore differ between programs.</p>

              <h3>2. PROGRAMS</h3>
              <p style={{ fontWeight: "700", marginBottom: "4px" }}>Discovery Club — Discover Through Play</p>
              <ul>
                <li>🔎 <strong>Discovery Club: Curious Explorer:</strong> Ages 1.5–4.11 | ₱4,295 (Pioneer Family); ₱4,395 (New Family) | 8 sessions | 1 hr/session</li>
                <li>🎨 <strong>Discovery Club: Creative Explorer:</strong> Ages 2.6–4.11 | ₱4,820 (Pioneer Family); ₱4,985 (New Family) | 12 sessions | 1 hr 15 mins/session</li>
                <li>🌈 <strong>Discovery Club: Everyday Curious:</strong> Ages 1.5–4.11 | ₱7,518 | 15 sessions | 1 hr/session</li>
              </ul>
              <p>Discovery Club provides a play-based environment that encourages socialization, interaction, shared play, and confidence-building. It may also be a suitable starting point for children who are not yet using verbal communication.</p>
              <p style={{ fontWeight: "700" }}>💡 Trailblazer: Brave Explorer — Prepare for What&apos;s Next</p>
              <ul>
                <li>Ages 3–4.11 | ₱6,900 | 18 sessions | 1 hr 15 mins/face-to-face session/shift to online</li>
              </ul>
              <p><strong>Milestone Checkpoint:</strong> The 18th session includes the Exploration Diary presentation, review of the child&apos;s learning and discoveries, and milestone recognition through a Certificate of Recognition/Completion.</p>
              <p style={{ fontWeight: "700" }}>Little Trailblazer Prerequisites:</p>
              <p>The child should be able to comfortably grip age-appropriate materials, participate independently with teachers, and sit still independently for at least 3 minutes.</p>

              <h3>3. REGISTRATION, PAYMENTS &amp; PENALTIES</h3>
              <p>Upon registration, 60% of the total program fee is required as a non-refundable reservation fee. The remaining 40% balance is due on or before the 6th session. An interest of 4% per week will be applied to overdue balances starting the week after the due date. Merry Explorers accepts the following payment methods: Cash, GCash, BDO Bank Transfer, and Credit/Debit Card (via GCash QR). Official receipts or proof of payment must be submitted upon payment.</p>

              <h3>4. ATTENDANCE, ABSENCES &amp; MAKE-UP SESSIONS</h3>
              <p>Each program has a set number of sessions. Attending all sessions within your program is encouraged to maximize your child&apos;s learning. Make-up sessions may be arranged for absences, subject to teacher and slot availability. Make-up sessions must be completed within the current Adventure. Unused make-up sessions do not carry over to the next Adventure. Habitual absences without notice may result in forfeiture of make-up privileges. Merry Explorers reserves the right to reschedule or cancel classes due to unforeseen circumstances (e.g., typhoons, public holidays, or force majeure events). In such cases, a make-up session will be scheduled at no additional charge.</p>

              <h3>5. PHOTO &amp; VIDEO HIGHLIGHTS</h3>
              <p>Photos and videos taken during sessions are for documentation and sharing within the Merry Explorers community. These are shared via a private portal or class group. Files will be automatically deleted 30 days after sharing. Merry Explorers is not responsible for files once downloaded and shared externally by parents or guardians. If you do not wish your child to be photographed or filmed, please inform us in writing before the first session.</p>

              <h3>6. UNIFORM POLICY</h3>
              <p>We would also like to clarify an important part of our uniform policy. <strong>The Merry Explorers uniform is the SAME uniform.</strong></p>
              <p>If your child already has a Merry Explorers uniform from the previous chapter, you are NOT required to purchase a new set for Adventure 1. We want families to be able to continue using the uniform they already have.</p>
              <p><strong>Uniform Days:</strong> Wednesday &amp; Friday. On all other class days, children may wear anything comfortable, safe, and appropriate for active play and learning.</p>
              <p><strong>Welcome Kit — ₱750</strong><br />For families who need a new set or an additional set, the Uniform Kit is available for ₱750 and includes: 1 Merry Explorers polo shirt with logo, 1 pair of jogging pants, 1 name tag with Merry Explorers lanyard.</p>
              <p><strong>Lanyard &amp; Name Tag — ₱200</strong><br />A Merry Explorers lanyard with laminated name tag may also be purchased separately for ₱200.</p>
              <p>If you just need the uniform, you may still purchase the polo and jogging pants with the Merry Explorers logo priced at ₱550/set.</p>

              <div style={{ background: "#f0f5ff", border: "1.5px solid #c5d6ff", borderRadius: "12px", padding: "18px", marginTop: "20px" }}>
                <p style={{ fontWeight: "800", color: "#002f76", fontSize: "13px", marginBottom: "8px" }}>PARENT/GUARDIAN ACKNOWLEDGMENT</p>
                <p>I, the undersigned Parent/Guardian, confirm that I have read, understood, and voluntarily agree to all terms and policies stated in this Agreement, including those covering program requirements, payments, attendance and make-ups, photos and videos, and uniforms.</p>
                <p>I confirm that the information I provided about my child is true and complete, and I agree to comply with Merry Explorers&apos; policies and arrangements.</p>
                <p style={{ marginBottom: 0 }}>By signing below, I voluntarily acknowledge, accept, and agree to be bound by these terms and policies as part of my child&apos;s registration with Merry Explorers Playgroup Learning Center.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Signature section — unlocked only after scrolling */}
        <div style={{ background: "white", borderRadius: "20px", padding: "28px 32px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)", opacity: hasScrolled ? 1 : 0.45, pointerEvents: hasScrolled ? "auto" : "none", transition: "opacity 0.4s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <div style={{ fontWeight: "800", color: "#002f76", fontSize: "16px" }}>✍️ Your Signature</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>Sign in the box below to confirm you have read and agree to the waiver.</div>
            </div>
            <button onClick={clearCanvas} style={{ background: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>Clear</button>
          </div>

          <div style={{ border: `2px dashed ${hasSigned ? "#0050d5" : "#c5d6ff"}`, borderRadius: "14px", overflow: "hidden", background: "#f8faff", transition: "border-color 0.2s" }}>
            <canvas
              ref={canvasRef}
              width={800}
              height={180}
              className="sig-canvas"
              style={{ width: "100%", height: "180px", display: "block" }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
          </div>
          {!hasSigned && hasScrolled && <p style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", marginTop: "8px", fontWeight: "600" }}>Draw your signature above</p>}

          {/* Signed-by line */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginTop: "20px", padding: "16px", background: "#f8faff", borderRadius: "12px", border: "1px solid #e8efff" }}>
            {[
              { label: "Name", value: profile.fullName },
              { label: "Child", value: profile.childName },
              { label: "Date", value: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{label}</div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#002f76" }}>{value}</div>
              </div>
            ))}
          </div>

          {error && <div style={{ background: "#fff0f0", color: "#ba1a1a", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", border: "1px solid #ffd5d5", marginTop: "16px" }}>{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={!hasScrolled || !hasSigned || saving}
            style={{
              width: "100%",
              marginTop: "20px",
              padding: "16px",
              background: hasScrolled && hasSigned ? "linear-gradient(135deg,#002f76,#0050d5)" : "#cbd5e1",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "800",
              cursor: hasScrolled && hasSigned && !saving ? "pointer" : "not-allowed",
              boxShadow: hasScrolled && hasSigned ? "0 8px 24px rgba(0,47,118,0.3)" : "none",
              transition: "all 0.3s",
            }}
          >
            {saving ? "Saving..." : (!hasScrolled ? "↓ Please scroll through the full waiver first" : !hasSigned ? "✍️ Please sign above to continue" : "✅ I Agree — Enter the Parent Portal")}
          </button>
        </div>

      </div>
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

  // Show waiver gate if not yet signed
  if (!profile.waiverSignature) {
    return (
      <WaiverGate
        profile={profile}
        onComplete={(sig) => setProfile((p) => p ? { ...p, waiverSignature: sig, waiverSignedAt: new Date().toISOString() } : p)}
      />
    );
  }

  const recentAlbum = profile.albums[0] ?? null;
  const waiverSigned = !!profile.waiverSignature;

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
                      ? profile.waiverSignedAt ? `Signed on ${new Date(profile.waiverSignedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}` : "Your participation waiver has been received and is on file."
                      : "Please contact us to complete your waiver form."}
                  </div>
                </div>
              </div>

              {/* Signed-by info */}
              {waiverSigned && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "24px", padding: "16px", background: "#f8faff", borderRadius: "12px", border: "1px solid #e8efff" }}>
                  {[
                    { label: "Signed By", value: profile.fullName },
                    { label: "Child", value: profile.childName },
                    { label: "Date Signed", value: profile.waiverSignedAt ? new Date(profile.waiverSignedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—" },
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
                  <style>{`
                    .waiver-ro h3 { color: #0050d5; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px; margin: 18px 0 6px; }
                    .waiver-ro p { margin: 0 0 10px; }
                    .waiver-ro ul { margin: 0 0 10px; padding-left: 20px; }
                    .waiver-ro li { margin-bottom: 4px; }
                  `}</style>
                  <div className="waiver-ro">
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
