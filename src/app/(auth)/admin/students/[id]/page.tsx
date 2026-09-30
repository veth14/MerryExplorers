"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";

const PROGRAM_META: Record<string, { color: string; bg: string; label: string; emoji: string }> = {
  "curious-explorer":  { color: "#b45309", bg: "#fffbeb", label: "Curious Explorer",  emoji: "🔎" },
  "creative-explorer": { color: "#1d4ed8", bg: "#eff6ff", label: "Creative Explorer", emoji: "🎨" },
  "everyday-curious":  { color: "#7c3aed", bg: "#f5f3ff", label: "Everyday Curious",  emoji: "🌈" },
  "brave-explorer":    { color: "#047857", bg: "#f0fdf4", label: "Brave Explorer",    emoji: "💡" },
};

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#002f76,#0050d5)",
  "linear-gradient(135deg,#7c3aed,#a78bfa)",
  "linear-gradient(135deg,#047857,#34d399)",
  "linear-gradient(135deg,#b45309,#fbbf24)",
];

function getInitials(first: string, last: string) {
  return `${first[0] || ""}${last[0] || ""}`.toUpperCase();
}

function getAge(dob?: string) {
  if (!dob) return null;
  const parts = dob.split("-");
  if (parts.length !== 3) return null;
  const [yyyy, mm, dd] = parts.map(Number);
  const now = new Date();
  let age = now.getFullYear() - yyyy;
  const monthDiff = (now.getMonth() + 1) - mm;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dd)) age--;
  return age < 0 ? 0 : age;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", flexShrink: 0, width: "44%" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155", textAlign: "right", flex: 1 }}>{value || "—"}</span>
    </div>
  );
}

function Section({ title, icon, children, accentColor = "#0050d5", iconBg }: { title: string; icon: string; children: React.ReactNode; accentColor?: string; iconBg?: string }) {
  return (
    <div style={{ background: "white", borderRadius: "20px", border: "1px solid rgba(0,47,118,0.06)", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", overflow: "hidden" }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: iconBg || `linear-gradient(135deg,${accentColor}22,${accentColor}44)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>{icon}</div>
        <span style={{ fontWeight: "800", fontSize: "15px", color: "#002f76" }}>{title}</span>
      </div>
      <div style={{ padding: "4px 24px 12px" }}>{children}</div>
    </div>
  );
}

export default function AdminStudentProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/students")
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const found = data.data.find((s: any) => s.id === id);
          if (found) setStudent(found);
          else setError("Student not found");
        } else setError(data.error);
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppShell title="Student Profile">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "280px", flexDirection: "column", gap: "12px", color: "#94a3b8" }}>
          <div style={{ fontSize: "32px" }}>⏳</div>
          <div style={{ fontWeight: "600", fontSize: "15px" }}>Loading profile…</div>
        </div>
      </AppShell>
    );
  }

  if (error || !student) {
    return (
      <AppShell title="Student Profile">
        <div style={{ background: "#fff0f0", border: "1.5px solid #fecaca", borderRadius: "16px", padding: "24px", color: "#b91c1c" }}>
          <p style={{ fontWeight: "800", fontSize: "16px" }}>❌ Error</p>
          <p style={{ fontSize: "13px", marginTop: "4px" }}>{error}</p>
          <button onClick={() => router.push("/admin/students")} style={{ marginTop: "16px", background: "#fecaca", border: "none", borderRadius: "10px", padding: "8px 18px", fontSize: "13px", fontWeight: "700", cursor: "pointer", color: "#b91c1c" }}>
            ← Back to Students
          </button>
        </div>
      </AppShell>
    );
  }

  const meta = PROGRAM_META[student.program];
  const age = getAge(student.childInfo?.dateOfBirth);
  const avatarGrad = AVATAR_GRADIENTS[student.childInfo?.firstName?.charCodeAt(0) % AVATAR_GRADIENTS.length] || AVATAR_GRADIENTS[0];
  const enrolledDate = new Date(student.enrolledAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <AppShell title={`${student.childInfo.firstName} ${student.childInfo.lastName}`}>
      {/* Back */}
      <button onClick={() => router.push("/admin/students")} style={{ marginBottom: "20px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "700", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", padding: 0 }}>
        ← Back to Students
      </button>

      {/* ── Hero Banner ── */}
      <div style={{ background: "linear-gradient(135deg,#001a4d 0%,#002f76 45%,#0050d5 100%)", borderRadius: "24px", padding: "32px 36px", marginBottom: "24px", position: "relative", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,47,118,0.25)" }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-50px", right: "120px", width: "140px", height: "140px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap", position: "relative" }}>
          {/* Avatar */}
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: avatarGrad, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "28px", fontWeight: "900", flexShrink: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.25)", border: "3px solid rgba(255,255,255,0.25)" }}>
            {getInitials(student.childInfo.firstName, student.childInfo.lastName)}
          </div>

          {/* Name & badges */}
          <div style={{ flex: 1, minWidth: "200px" }}>
            <h1 style={{ color: "white", fontWeight: "900", fontSize: "24px", margin: "0 0 4px", letterSpacing: "-0.3px" }}>
              {student.childInfo.firstName} {student.childInfo.lastName}
            </h1>
            {student.childInfo.nickname && (
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", margin: "0 0 10px" }}>"{student.childInfo.nickname}"</p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {meta && (
                <span style={{ padding: "4px 12px", background: meta.bg, color: meta.color, borderRadius: "20px", fontSize: "12px", fontWeight: "700" }}>
                  {meta.emoji} {meta.label}
                </span>
              )}
              {age !== null && (
                <span style={{ padding: "4px 12px", background: "rgba(255,255,255,0.12)", color: "white", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: "1px solid rgba(255,255,255,0.2)" }}>
                  {age} yrs old
                </span>
              )}
              {student.childInfo.gender && (
                <span style={{ padding: "4px 12px", background: "rgba(255,255,255,0.12)", color: "white", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: "1px solid rgba(255,255,255,0.2)" }}>
                  {student.childInfo.gender}
                </span>
              )}
              <span style={{ padding: "4px 12px", background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.9)", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: "1px solid rgba(255,255,255,0.2)" }}>
                Enrolled {enrolledDate}
              </span>
            </div>
          </div>

          {/* Quick class info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", textAlign: "right" }}>
            {student.classTime && (
              <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: "12px", padding: "8px 14px", border: "1px solid rgba(255,255,255,0.15)" }}>
                <div style={{ fontSize: "10px", opacity: 0.6, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "white" }}>Class Time</div>
                <div style={{ fontWeight: "800", fontSize: "13px", color: "white" }}>{student.classTime}</div>
              </div>
            )}
            {student.schedule && (
              <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: "12px", padding: "8px 14px", border: "1px solid rgba(255,255,255,0.15)" }}>
                <div style={{ fontSize: "10px", opacity: 0.6, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "white" }}>Schedule</div>
                <div style={{ fontWeight: "800", fontSize: "13px", color: "white" }}>{student.schedule}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2-column grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>

        <Section title="Explorer Details" icon="🧒" accentColor="#0050d5" iconBg="linear-gradient(135deg,#dbeafe,#bfdbfe)">
          <InfoRow label="Full Name" value={`${student.childInfo.firstName} ${student.childInfo.lastName}`} />
          <InfoRow label="Nickname" value={student.childInfo.nickname} />
          <InfoRow label="Date of Birth" value={student.childInfo.dateOfBirth ? (() => { const [y,m,d] = student.childInfo.dateOfBirth.split("-"); return new Date(+y, +m-1, +d).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}); })() : null} />
          <InfoRow label="Gender" value={student.childInfo.gender} />
          <InfoRow label="Age" value={age !== null ? `${age} years old` : null} />
          <InfoRow label="Health Notes" value={student.childInfo.healthProfile || "None noted"} />
        </Section>

        <Section title="Parent / Guardian" icon="👨‍👩‍👧" accentColor="#7c3aed" iconBg="linear-gradient(135deg,#ede9fe,#ddd6fe)">
          <InfoRow label="Name" value={student.parentInfo.name} />
          <InfoRow label="Relationship" value={student.parentInfo.relationship} />
          <InfoRow label="Email" value={student.parentInfo.email} />
          <InfoRow label="Phone" value={student.parentInfo.phone} />
        </Section>

        <Section title="Favorites" icon="⭐" accentColor="#b45309" iconBg="linear-gradient(135deg,#fef3c7,#fde68a)">
          <InfoRow label="Favorite Song" value={student.childInfo.favoriteSong} />
          <InfoRow label="Favorite Color" value={student.childInfo.favoriteColor} />
          <InfoRow label="Favorite Character" value={student.childInfo.favoriteCharacter} />
        </Section>

        <Section title="Emergency Contact" icon="🚨" accentColor="#be123c" iconBg="linear-gradient(135deg,#fee2e2,#fecaca)">
          <InfoRow label="Name" value={student.emergencyContact?.name} />
          <InfoRow label="Relationship" value={student.emergencyContact?.relationship} />
          <InfoRow label="Phone" value={student.emergencyContact?.phone} />
        </Section>

        <Section title="Enrollment Details" icon="📋" accentColor="#047857" iconBg="linear-gradient(135deg,#d1fae5,#a7f3d0)">
          <InfoRow label="Program" value={student.programName} />
          <InfoRow label="Class Time" value={student.classTime} />
          <InfoRow label="Schedule" value={student.schedule} />
          <InfoRow label="Uniform Kit" value={student.uniformOrdered ? "✅ Ordered" : "No"} />
          <InfoRow label="Lanyard" value={student.lanyardOrdered ? "✅ Ordered" : "No"} />
          <InfoRow label="Enrolled On" value={enrolledDate} />
        </Section>

        <Section title="Consents & Waivers" icon="📝" accentColor="#0e7490" iconBg="linear-gradient(135deg,#cffafe,#a5f3fc)">
          <InfoRow label="Photo Consent" value={
            student.photoConsent === true || student.photoConsent === "yes"
              ? <span style={{ color: "#15803d", fontWeight: "800" }}>✅ Granted</span>
              : <span style={{ color: "#b91c1c", fontWeight: "800" }}>❌ Not Granted</span>
          } />
          <InfoRow label="Program Waiver" value={
            <span style={{ color: "#15803d", fontWeight: "800" }}>✅ Digitally Signed</span>
          } />
        </Section>

      </div>
    </AppShell>
  );
}

