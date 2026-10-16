"use client";

import { useEffect, useState, useMemo } from "react";
import { m } from "framer-motion";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";

interface Student {
  id: string;
  registrationId: string;
  program: string;
  programName: string;
  classTime: string;
  schedule: string;
  adventureNumber?: number | null;
  adventureStartDate?: string | null;
  activeAdventureNumber?: number | null;
  upcomingAdventureNumber?: number | null;
  previousAdventureNumber?: number | null;
  upcomingAdventureStartDate?: string | null;
  childInfo: { firstName: string; lastName: string; nickname?: string; gender?: string; dateOfBirth?: string };
  parentInfo: { name: string; email: string; phone: string; relationship?: string };
  enrolledAt: string;
  status: string;
}

const PROGRAM_META: Record<string, { color: string; bg: string; label: string; emoji: string }> = {
  "curious-explorer": { color: "#b45309", bg: "#fffbeb", label: "Curious Explorer", emoji: "🔎" },
  "creative-explorer": { color: "#1d4ed8", bg: "#eff6ff", label: "Creative Explorer", emoji: "🎨" },
  "everyday-explorer": { color: "#7c3aed", bg: "#f5f3ff", label: "Everyday Explorer", emoji: "🌈" },
  "everyday-curious": { color: "#7c3aed", bg: "#f5f3ff", label: "Everyday Explorer", emoji: "🌈" },
  "brave-explorer": { color: "#047857", bg: "#f0fdf4", label: "Brave Explorer", emoji: "💡" },
};

const FILTERS = [
  { id: "all", label: "All Programs" },
  { id: "curious-explorer", label: "Curious Explorer" },
  { id: "everyday-curious", label: "Everyday Explorer" },
  { id: "creative-explorer", label: "Creative Explorer" },
  { id: "brave-explorer", label: "Brave Explorer" },
];

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function getAge(dob?: string) {
  if (!dob) return null;
  // Parse parts directly to avoid UTC timezone offset issues
  const parts = dob.split("-");
  if (parts.length !== 3) return null;
  const [yyyy, mm, dd] = parts.map(Number);
  const now = new Date();
  let age = now.getFullYear() - yyyy;
  const monthDiff = (now.getMonth() + 1) - mm;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dd)) age--;
  return age < 0 ? 0 : age;
}

function normalizeIdentity(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getStudentGroupKey(student: Student) {
  const childName = normalizeIdentity(`${student.childInfo?.firstName || ""} ${student.childInfo?.lastName || ""}`);
  const dateOfBirth = normalizeIdentity(student.childInfo?.dateOfBirth);
  const familyIdentity = normalizeIdentity(student.parentInfo?.email) || normalizeIdentity(student.parentInfo?.phone);

  // Only combine records when there is enough information to avoid merging
  // different children who happen to share a name.
  if (!childName || !dateOfBirth || !familyIdentity) return `registration:${student.id}`;
  return `${familyIdentity}|${childName}|${dateOfBirth}`;
}

function getRegistrationTime(student: Student) {
  const time = new Date(student.enrolledAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getAdventureKey(program: string) {
  return program === "everyday-explorer" ? "everyday-curious" : program;
}

function formatRegistrationDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function AdventureCell({ student, fallback, startDate }: { student?: Student; fallback: string; startDate?: string | null }) {
  if (!student) {
    return <div style={{ fontSize: "12px", color: "#94a3b8" }}>{fallback}</div>;
  }

  const meta = PROGRAM_META[getAdventureKey(student.program)];
  return (
    <div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", background: meta?.bg || "#f8faff", color: meta?.color || "#64748b", borderRadius: "20px", fontSize: "11px", fontWeight: "700" }}>
        {student.adventureNumber ? `Adventure ${student.adventureNumber} · ` : ""}{meta?.emoji} {meta?.label || student.programName}
      </span>
      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>{student.classTime || "Class time not set"}</div>
      {startDate && <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>Starts {formatRegistrationDate(startDate)}</div>}
      <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>Registered {formatRegistrationDate(student.enrolledAt)}</div>
    </div>
  );
}

const AVATAR_COLORS = [
  "linear-gradient(135deg,#002f76,#0050d5)",
  "linear-gradient(135deg,#7c3aed,#a78bfa)",
  "linear-gradient(135deg,#047857,#34d399)",
  "linear-gradient(135deg,#b45309,#fbbf24)",
  "linear-gradient(135deg,#be123c,#fb7185)",
  "linear-gradient(135deg,#0e7490,#22d3ee)",
];

export default function AdminStudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid;
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      setLoadError("Your sign-in session could not be verified. Sign out and sign in again.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");

    fetch("/api/students", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Your sign-in session could not be verified. Sign out and sign in again.");
          }
          throw new Error(`Could not load students (HTTP ${response.status}).`);
        }
        return response.json();
      })
      .then(data => {
        if (cancelled) return;
        if (data.success) setStudents(data.data);
        else throw new Error(data.error || "Could not load students.");
      })
      .catch(error => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Could not load students.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [authLoading, userId]);

  const filtered = useMemo(() => {
    const groups = new Map<string, Student[]>();
    for (const student of students) {
      const key = getStudentGroupKey(student);
      const registrations = groups.get(key) || [];
      registrations.push(student);
      groups.set(key, registrations);
    }

    return Array.from(groups, ([key, registrations]) => ({
      key,
      registrations: registrations.sort((a, b) => getRegistrationTime(b) - getRegistrationTime(a)),
    })).filter(group => {
      const matchProgram = programFilter === "all" || group.registrations.some(s => getAdventureKey(s.program) === programFilter);
      const q = search.toLowerCase();
      const matchSearch = !q || group.registrations.some(s =>
        `${s.childInfo.firstName} ${s.childInfo.lastName}`.toLowerCase().includes(q) ||
        s.parentInfo.name.toLowerCase().includes(q) ||
        s.programName.toLowerCase().includes(q) ||
        (s.childInfo.nickname || "").toLowerCase().includes(q)
      );
      return matchProgram && matchSearch;
    });
  }, [students, programFilter, search]);

  const stats = useMemo(() => {
    const groups = new Map<string, Student[]>();
    for (const student of students) {
      const key = getStudentGroupKey(student);
      const registrations = groups.get(key) || [];
      registrations.push(student);
      groups.set(key, registrations);
    }
    const explorers = Array.from(groups.values());
    return {
      total: explorers.length,
      active: explorers.filter(registrations => registrations.some(s => s.status === "active")).length,
      programs: new Set(students.map(s => getAdventureKey(s.program))).size,
      today: explorers.filter(registrations => registrations.some(s => new Date(s.enrolledAt).toDateString() === new Date().toDateString())).length,
    };
  }, [students]);

  const filteredRegistrationCount = filtered.reduce((count, group) => count + group.registrations.length, 0);

  return (
    <AppShell title="Students">
      <style>{`
        .stu-row { transition: background 0.15s; }
        .stu-row:hover { background: #f8faff !important; }
        .stu-row:hover .stu-arrow { opacity: 1 !important; transform: translateX(0) !important; }
        .stu-arrow { opacity: 0; transform: translateX(-6px); transition: all 0.2s; }
        .filter-pill { transition: all 0.15s; cursor: pointer; }
        .filter-pill:hover { transform: translateY(-1px); }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* ── Stats Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total Explorers", value: stats.total, icon: "🧒", color: "#0050d5", bg: "linear-gradient(135deg,#eff6ff,#dbeafe)" },
          { label: "Active", value: stats.active, icon: "✅", color: "#15803d", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
          { label: "Programs", value: stats.programs, icon: "📚", color: "#7c3aed", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)" },
          { label: "Registered Today", value: stats.today, icon: "🆕", color: "#b45309", bg: "linear-gradient(135deg,#fffbeb,#fef3c7)" },
        ].map(s => (
          <div key={s.label} style={{ background: "white", borderRadius: "20px", padding: "20px 24px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: s.color, lineHeight: 1 }}>{loading ? "—" : s.value}</div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "3px" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ background: "white", borderRadius: "20px", padding: "16px 20px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)", marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: "180px" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", pointerEvents: "none" }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search explorer or parent..."
            style={{ width: "100%", paddingLeft: "36px", paddingRight: "12px", paddingTop: "10px", paddingBottom: "10px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", fontWeight: "500", color: "#334155", outline: "none", background: "#f8faff", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {FILTERS.map(f => {
            const meta = PROGRAM_META[f.id];
            const active = programFilter === f.id;
            return (
              <button key={f.id} className="filter-pill" onClick={() => setProgramFilter(f.id)} style={{ padding: "8px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: active ? "none" : "1.5px solid #e2e8f0", background: active ? (meta?.bg || "#eff6ff") : "white", color: active ? (meta?.color || "#0050d5") : "#64748b", boxShadow: active ? "0 2px 8px rgba(0,0,0,0.08)" : "none" }}>
                {f.id !== "all" && meta ? meta.emoji + " " : ""}{f.label}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: "auto", fontSize: "12px", fontWeight: "600", color: "#94a3b8", flexShrink: 0 }}>
          {loading ? "Loading…" : `${filtered.length} explorers · ${filteredRegistrationCount} registration records`}
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", color: "#94a3b8", fontSize: "15px", fontWeight: "600", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          <div>Loading students…</div>
        </div>
      ) : loadError ? (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "20px", padding: "32px 24px", textAlign: "center", color: "#9a3412" }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>🔒</div>
          <div style={{ fontWeight: "800", fontSize: "16px", marginBottom: "6px" }}>Students could not be loaded</div>
          <div style={{ fontSize: "13px" }}>{loadError}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", border: "2px dashed #e2e8f0" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🧒</div>
          <div style={{ fontWeight: "800", color: "#002f76", fontSize: "18px", marginBottom: "6px" }}>No explorers found</div>
          <div style={{ color: "#94a3b8", fontSize: "14px" }}>Try adjusting your search or filter.</div>
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,47,118,0.06)", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1.2fr 1.2fr 1.2fr 1.4fr 1fr 40px", padding: "12px 24px", background: "#f8faff", borderBottom: "1px solid #e8efff" }}>
            {["Explorer", "Current Adventure", "Upcoming Adventure", "Previous Adventure", "Parent / Guardian", "Latest Registration", ""].map((h, i) => (
              <div key={i} style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px" }}>{h}</div>
            ))}
          </div>

          {filtered.map((group, idx) => {
            const student = group.registrations[0];
            const adventureHistory = Array.from(
              new Map(group.registrations.map(registration => [
                registration.adventureNumber ? `adventure-${registration.adventureNumber}` : getAdventureKey(registration.program),
                registration,
              ])).values()
            ).sort((a, b) =>
              (b.adventureNumber || 0) - (a.adventureNumber || 0) || getRegistrationTime(b) - getRegistrationTime(a)
            );
            const adventuresByNumber = new Map(
              group.registrations
                .filter(registration => registration.adventureNumber)
                .map(registration => [registration.adventureNumber!, registration])
            );
            const currentAdventure = student.activeAdventureNumber
              ? adventuresByNumber.get(student.activeAdventureNumber)
              : student.upcomingAdventureNumber
                ? undefined
                : adventureHistory[0];
            const upcomingAdventure = student.upcomingAdventureNumber
              ? adventuresByNumber.get(student.upcomingAdventureNumber)
              : undefined;
            const previousAdventure = student.activeAdventureNumber !== null && student.activeAdventureNumber !== undefined
              ? student.previousAdventureNumber
                ? adventuresByNumber.get(student.previousAdventureNumber)
                : undefined
              : adventureHistory.find(registration => registration !== currentAdventure && registration !== upcomingAdventure);
            const avatarGrad = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const age = getAge(student.childInfo.dateOfBirth);

            return (
              <Link key={group.key} href={`/admin/students/${student.id}`} style={{ textDecoration: "none", display: "block" }}>
                <m.div
                  className="stu-row"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.025 }}
                  style={{ display: "grid", gridTemplateColumns: "1.55fr 1.2fr 1.2fr 1.2fr 1.4fr 1fr 40px", padding: "15px 24px", borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", background: "white", cursor: "pointer" }}
                >
                  {/* Explorer col */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: avatarGrad, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "13px", fontWeight: "800", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                      {getInitials(`${student.childInfo.firstName} ${student.childInfo.lastName}`)}
                    </div>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "14px", color: "#002f76", lineHeight: 1.2 }}>
                        {student.childInfo.firstName} {student.childInfo.lastName}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                        {[student.childInfo.nickname ? `"${student.childInfo.nickname}"` : null, age !== null ? `${age} yrs` : null, student.childInfo.gender].filter(Boolean).join(" · ")}
                      </div>
                      {group.registrations.length > 1 && (
                        <div style={{ fontSize: "10px", color: "#64748b", marginTop: "3px", fontWeight: "600" }}>
                          {group.registrations.length} registration records
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Current adventure */}
                  <AdventureCell student={currentAdventure} fallback="No current adventure registration" startDate={currentAdventure?.adventureStartDate} />

                  {/* Upcoming adventure */}
                  <AdventureCell student={upcomingAdventure} fallback="No upcoming adventure registration" startDate={student.upcomingAdventureStartDate || upcomingAdventure?.adventureStartDate} />

                  {/* Previous adventure */}
                  <AdventureCell student={previousAdventure} fallback="No previous adventure on record" />

                  {/* Parent col */}
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "13px", color: "#334155" }}>{student.parentInfo.name}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>{student.parentInfo.phone || student.parentInfo.email}</div>
                  </div>

                  {/* Latest registration date */}
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
                    {formatRegistrationDate(student.enrolledAt)}
                  </div>

                  {/* Arrow */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div className="stu-arrow" style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0050d5", fontSize: "14px", fontWeight: "900" }}>→</div>
                  </div>
                </m.div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

