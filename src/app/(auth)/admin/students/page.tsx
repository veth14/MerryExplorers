"use client";

import { useEffect, useState, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ClassCapacityTracker } from "@/components/admin/ClassCapacityTracker";
import { useAuth } from "@/lib/auth-context";
import { StudentEditModal } from "@/components/admin/StudentEditModal";
import { ParentAccountCreateModal } from "@/components/admin/ParentAccountCreateModal";
import { ExplorerDetailModal } from "@/components/admin/ExplorerDetailModal";

interface Student {
  id: string;
  registrationId?: string;
  program: string;
  programName: string;
  classTime: string;
  schedule: string;
  period?: string;
  adventureNumber?: number | null;
  adventureStartDate?: string | null;
  activeAdventureNumber?: number | null;
  upcomingAdventureNumber?: number | null;
  previousAdventureNumber?: number | null;
  upcomingAdventureStartDate?: string | null;
  childInfo: {
    firstName: string;
    lastName: string;
    nickname?: string;
    gender?: string;
    dateOfBirth?: string;
    healthProfile?: string;
    allergies?: string;
    favoriteColor?: string;
    favoriteSong?: string;
    favoriteCharacter?: string;
  };
  parentInfo: {
    name: string;
    email: string;
    phone: string;
    relationship?: string;
    address?: string;
  };
  emergencyContact?: {
    name: string;
    relationship?: string;
    phone: string;
  };
  enrolledAt: string;
  status: string;
  receiptUrl?: string | boolean | null;
  paymentStatus?: string | null;
  paid?: boolean;
  paymentMethod?: string | null;
  amountDue?: number | null;
  amountPaid?: number | null;
  referenceNumber?: string | null;
  signatureUrl?: string | null;
  photoConsent?: boolean | string | null;
  hasAccount?: boolean;
  isPioneer?: boolean;
  notes?: string;
  source?: string;
}

interface ParentRecord {
  email: string;
  name: string;
  phone: string;
  relationship: string;
  address?: string;
  hasAccount: boolean;
  accountId?: string | null;
  accountRole?: string | null;
  children: {
    studentId: string;
    firstName: string;
    lastName: string;
    nickname?: string;
    program: string;
    programName: string;
    adventureNumber?: number | null;
    status: string;
  }[];
}

const PROGRAM_META: Record<string, { color: string; bg: string; label: string; emoji: string }> = {
  "curious-explorer": { color: "#b45309", bg: "#fffbeb", label: "Curious Explorer", emoji: "🔎" },
  "creative-explorer": { color: "#1d4ed8", bg: "#eff6ff", label: "Creative Explorer", emoji: "🎨" },
  "everyday-explorer": { color: "#7c3aed", bg: "#f5f3ff", label: "Everyday Explorer", emoji: "🌈" },
  "everyday-curious": { color: "#7c3aed", bg: "#f5f3ff", label: "Everyday Explorer", emoji: "🌈" },
  "brave-explorer": { color: "#047857", bg: "#f0fdf4", label: "Trailblazer (Brave)", emoji: "💡" },
  "saturday-playdate": { color: "#ea580c", bg: "#fff7ed", label: "Saturday Playdate", emoji: "🎈" },
  "ballet": { color: "#db2777", bg: "#fdf2f8", label: "Ballet", emoji: "🩰" },
  "virtual-session": { color: "#0891b2", bg: "#ecfeff", label: "Virtual Tutorial", emoji: "💻" },
};

const FILTERS = [
  { id: "all", label: "All Programs" },
  { id: "brave-explorer", label: "Trailblazer (Brave)" },
  { id: "curious-explorer", label: "Curious Explorer" },
  { id: "creative-explorer", label: "Creative Explorer" },
  { id: "everyday-curious", label: "Everyday Explorer" },
  { id: "saturday-playdate", label: "Saturday Playdate" },
  { id: "ballet", label: "Ballet" },
];

const AVATAR_COLORS = [
  "linear-gradient(135deg,#002f76,#0050d5)",
  "linear-gradient(135deg,#7c3aed,#a78bfa)",
  "linear-gradient(135deg,#047857,#34d399)",
  "linear-gradient(135deg,#b45309,#fbbf24)",
  "linear-gradient(135deg,#be123c,#fb7185)",
  "linear-gradient(135deg,#0e7490,#22d3ee)",
];

function getInitials(name: string) {
  return name.trim().split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase();
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

function normalizeIdentity(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// STRICT filter: ONLY matches Ian Angelo Valmores (Jr, Great Grand Father, etc.)
function isIanAngeloValmores(item: any): boolean {
  if (!item) return false;
  const target = "ian angelo valmores";
  const names = [
    item.childName,
    item.childInfo ? `${item.childInfo.firstName || ""} ${item.childInfo.lastName || ""}` : "",
    item.parentInfo?.name,
    item.name,
    item.parentInfo?.email,
    item.email,
  ];

  return names.some(n => typeof n === "string" && (
    normalizeIdentity(n).includes(target) ||
    n.toLowerCase().includes("vianangelo") ||
    n.toLowerCase().includes("valmores.ianangelo")
  ));
}

function getAdventureKey(program: string) {
  return program === "everyday-explorer" ? "everyday-curious" : program;
}

function formatRegistrationDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Current Adventure Cell
function CurrentAdventureCell({
  student,
  startDate,
}: {
  student?: Student;
  startDate?: string | null;
}) {
  if (!student) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div style={{ fontSize: "13px", color: "#cbd5e1", fontWeight: "600" }}>—</div>
      </div>
    );
  }

  const meta = PROGRAM_META[getAdventureKey(student.program)];
  const isNonAdv = ["saturday-playdate", "ballet"].includes(student.program);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "3px 10px 3px 8px",
          background: meta?.bg || "#f8faff",
          color: meta?.color || "#64748b",
          borderRadius: "20px",
          fontSize: "11px",
          fontWeight: "800",
          width: "fit-content",
          border: `1px solid ${meta?.color ? meta.color + "22" : "#e2e8f0"}`,
        }}
      >
        {!isNonAdv && student.adventureNumber ? (
          <span style={{ fontSize: "10px", opacity: 0.7, fontWeight: "700" }}>Adv {student.adventureNumber} ·</span>
        ) : null}
        {meta?.emoji || "⭐"} {meta?.label || student.programName}
      </span>
      {student.classTime && (
        <div style={{ fontSize: "11px", color: "#475569", fontWeight: "600", paddingLeft: "2px" }}>
          {student.classTime}
        </div>
      )}
      {startDate && (
        <div style={{ fontSize: "10px", color: "#15803d", fontWeight: "700", paddingLeft: "2px" }}>
          Starts {formatRegistrationDate(startDate)}
        </div>
      )}
      <div style={{ fontSize: "10px", color: "#94a3b8", paddingLeft: "2px" }}>
        Reg {formatRegistrationDate(student.enrolledAt)}
      </div>
    </div>
  );
}

// Badge helper for payment/confirmation status
function PaymentStatusBadge({ student }: { student: Student }) {
  // An empty string receiptUrl is NOT paid — strictly check for truthy non-empty
  const hasReceipt = typeof student.receiptUrl === "string"
    ? student.receiptUrl.trim().length > 0
    : !!student.receiptUrl;
  const isPaid = student.paid === true || student.paymentStatus === "paid" || hasReceipt;

  if (student.status === "approved" || student.status === "active") {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "4px",
        padding: "3px 9px", borderRadius: "20px", fontSize: "10px", fontWeight: "800",
        background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
        color: "#15803d", border: "1px solid #86efac",
      }}>
        ✅ Confirmed
      </div>
    );
  } else if ((student.status === "pending" || student.status === "reserved") && isPaid) {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "4px",
        padding: "3px 9px", borderRadius: "20px", fontSize: "10px", fontWeight: "800",
        background: "linear-gradient(135deg, #fef9c3, #fde68a)",
        color: "#92400e", border: "1px solid #fcd34d",
      }}>
        💳 Paid · Awaiting Confirmation
      </div>
    );
  } else if (student.status === "reserved" && !isPaid) {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "4px",
        padding: "3px 9px", borderRadius: "20px", fontSize: "10px", fontWeight: "800",
        background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
        color: "#1d4ed8", border: "1px solid #93c5fd",
      }}>
        📌 Reserved · No Payment Yet
      </div>
    );
  } else if (student.status === "pending" && !isPaid) {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "4px",
        padding: "3px 9px", borderRadius: "20px", fontSize: "10px", fontWeight: "800",
        background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
        color: "#c2410c", border: "1px solid #fdba74",
      }}>
        ⏳ Pending Review
      </div>
    );
  }
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "3px 9px", borderRadius: "20px", fontSize: "10px", fontWeight: "800",
      background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0",
    }}>
      {student.status}
    </div>
  );
}

// Next Adventure (Upcoming) Cell — Card-style with program badge + payment ribbon
function NextAdventureCell({
  student,
  isNonAdv,
}: {
  student?: Student;
  isNonAdv?: boolean;
}) {
  if (isNonAdv) {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "5px",
        padding: "4px 10px", borderRadius: "10px",
        background: "#f8fafc", border: "1px solid #e2e8f0",
        fontSize: "11px", fontWeight: "700", color: "#64748b",
      }}>
        🔁 Session-based
      </div>
    );
  }

  if (!student) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <div style={{ fontSize: "12px", color: "#cbd5e1", fontWeight: "600" }}>—</div>
        <div style={{ fontSize: "10px", color: "#cbd5e1", fontStyle: "italic" }}>Not yet registered</div>
      </div>
    );
  }

  const meta = PROGRAM_META[getAdventureKey(student.program)];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "5px",
      padding: "8px 10px",
      borderRadius: "12px",
      background: meta?.bg || "#f8faff",
      border: `1.5px solid ${meta?.color ? meta.color + "33" : "#e2e8f0"}`,
      maxWidth: "220px",
    }}>
      {/* Program row */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <span style={{ fontSize: "13px" }}>{meta?.emoji || "⭐"}</span>
        <span style={{
          fontSize: "11px", fontWeight: "900", color: meta?.color || "#334155",
          lineHeight: 1.2,
        }}>
          Adv {student.adventureNumber || 2} · {meta?.label || student.programName}
        </span>
      </div>

      {/* Payment/Confirmation status */}
      <PaymentStatusBadge student={student} />

      {/* Time & Date meta */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1px", paddingTop: "1px", borderTop: "1px solid #e2e8f0" }}>
        {student.classTime && (
          <div style={{ fontSize: "10.5px", color: "#475569", fontWeight: "600" }}>
            🕒 {student.classTime}
          </div>
        )}
        {student.adventureStartDate && (
          <div style={{ fontSize: "10px", color: "#15803d", fontWeight: "700" }}>
            Starts {formatRegistrationDate(student.adventureStartDate)}
          </div>
        )}
        <div style={{ fontSize: "9.5px", color: "#94a3b8" }}>
          Reg {formatRegistrationDate(student.enrolledAt)}
        </div>
      </div>
    </div>
  );
}

export default function AdminStudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"students" | "parents">("students");
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<ParentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Modals state
  const [selectedGroupForView, setSelectedGroupForView] = useState<any>(null);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);
  const [selectedParentForAccount, setSelectedParentForAccount] = useState<ParentRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = () => {
    setLoading(true);
    setLoadError("");

    fetch("/api/students", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load directory (HTTP ${res.status}).`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setStudents(data.data || []);
          if (data.parents) {
            setParents(data.parents);
          }
        } else {
          throw new Error(data.error || "Failed to load directory.");
        }
      })
      .catch((err) => {
        setLoadError(err.message || "Failed to load directory.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setLoadError("Your sign-in session could not be verified. Sign out and sign in again.");
      setLoading(false);
      return;
    }
    loadData();
  }, [authLoading, userId]);

  // Handle edit save success
  const handleStudentSaveSuccess = (updatedStudent: any) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? { ...s, ...updatedStudent } : s))
    );
    showToast(`Updated ${updatedStudent.childInfo?.firstName}'s information successfully.`);
    loadData();
  };

  // Group and deduplicate students by child identity
  const groupedExplorers = useMemo(() => {
    const groups = new Map<string, Student[]>();

    for (const student of students) {
      const fn = normalizeIdentity(student.childInfo?.firstName);
      const ln = normalizeIdentity(student.childInfo?.lastName);
      const primaryFirst = fn.split(" ")[0] || "";
      const parentEmail = normalizeIdentity(student.parentInfo?.email);
      const parentPhone = normalizeIdentity(student.parentInfo?.phone);
      const family = parentEmail || parentPhone;
      const key = `${family}|${ln}|${primaryFirst}`;

      const list = groups.get(key) || [];
      list.push(student);
      groups.set(key, list);
    }

    return Array.from(groups.entries()).map(([key, regs]) => {
      // Sort newest to oldest
      const sorted = [...regs].sort((a, b) => {
        const timeA = new Date(a.enrolledAt).getTime() || 0;
        const timeB = new Date(b.enrolledAt).getTime() || 0;
        return timeB - timeA;
      });

      const latest = sorted[0];

      // Identify adv1 vs adv2
      const adv2 = sorted.find((r) => r.adventureNumber === 2 || r.period?.includes("adventure-2"));
      const adv1 = sorted.find((r) => r !== adv2 && (r.adventureNumber === 1 || r.period?.includes("adventure-1") || (!r.adventureNumber && !r.period?.includes("adventure-2"))));
      const isNonAdv = sorted.some((r) => ["saturday-playdate", "ballet"].includes(r.program));

      let currentAdventure: Student | undefined;
      let upcomingAdventure: Student | undefined;
      let previousAdventure: Student | undefined;

      if (isNonAdv) {
        currentAdventure = sorted[0];
        upcomingAdventure = undefined;
        previousAdventure = sorted.length > 1 ? sorted[1] : undefined;
      } else if (adv1 && adv2) {
        currentAdventure = adv1;
        upcomingAdventure = adv2;
        previousAdventure = undefined;
      } else if (adv2 && !adv1) {
        // Brand new student registered only for Adventure 2:
        // Do NOT input anything into Current Adventure! Leave it empty!
        currentAdventure = undefined;
        upcomingAdventure = adv2;
        previousAdventure = undefined;
      } else {
        // Enrolled in Adventure 1, has not registered for Adventure 2 yet
        currentAdventure = adv1;
        upcomingAdventure = undefined;
        previousAdventure = undefined;
      }

      const activeStatus = sorted.some((r) => ["active", "approved"].includes(r.status))
        ? "active"
        : sorted.some((r) => r.status === "reserved")
        ? "reserved"
        : sorted[0]?.status || "pending";

      return {
        key,
        childName: `${latest.childInfo?.firstName || ""} ${latest.childInfo?.lastName || ""}`.trim(),
        childInfo: latest.childInfo,
        parentInfo: latest.parentInfo,
        emergencyContact: latest.emergencyContact,
        registrations: sorted,
        latestStudent: latest,
        currentAdventure,
        upcomingAdventure,
        previousAdventure,
        hasUpcomingRegistration: !!adv2,
        isNonAdv,
        hasAccount: sorted.some((r) => r.hasAccount === true),
        isPioneer: sorted.some((r) => r.isPioneer === true),
        status: activeStatus,
        latestRegistrationDate: latest.enrolledAt,
      };
    });
  }, [students]);

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    return groupedExplorers.filter((group) => {
      const matchProgram =
        programFilter === "all" ||
        group.registrations.some(
          (s) => getAdventureKey(s.program) === programFilter || s.program === programFilter
        );

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && group.status === "active") ||
        (statusFilter === "reserved" && group.status === "reserved") ||
        (statusFilter === "pending" && group.status === "pending");

      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        group.childName.toLowerCase().includes(q) ||
        (group.childInfo?.nickname || "").toLowerCase().includes(q) ||
        (group.parentInfo?.name || "").toLowerCase().includes(q) ||
        (group.parentInfo?.email || "").toLowerCase().includes(q) ||
        (group.parentInfo?.phone || "").toLowerCase().includes(q) ||
        group.registrations.some((s) => (s.programName || "").toLowerCase().includes(q));

      return matchProgram && matchStatus && matchSearch;
    });
  }, [groupedExplorers, programFilter, statusFilter, search]);

  // Separate Real Explorers vs Ian Angelo Valmores Testing Accounts
  const realExplorers = useMemo(() => {
    return filteredGroups.filter((g) => !isIanAngeloValmores(g));
  }, [filteredGroups]);

  const testExplorers = useMemo(() => {
    return filteredGroups.filter((g) => isIanAngeloValmores(g));
  }, [filteredGroups]);

  // Filtered Parents (Separate Real Parents vs Ian Angelo Valmores Testing Account)
  const filteredParents = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return parents;
    return parents.filter((p) => {
      const matchParent =
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q);

      const matchKids = p.children?.some((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        (c.programName || "").toLowerCase().includes(q)
      );

      return matchParent || matchKids;
    });
  }, [parents, search]);

  const realParents = useMemo(() => {
    return filteredParents.filter((p) => !isIanAngeloValmores(p));
  }, [filteredParents]);

  const testParents = useMemo(() => {
    return filteredParents.filter((p) => isIanAngeloValmores(p));
  }, [filteredParents]);

  // Overall Stats — STRICTLY EXCLUDES IAN ANGELO VALMORES FROM KPIS
  const stats = useMemo(() => {
    const validExplorers = groupedExplorers.filter((g) => !isIanAngeloValmores(g));
    const validParents = parents.filter((p) => !isIanAngeloValmores(p));

    const totalKids = validExplorers.length;
    const activeKids = validExplorers.filter((g) => g.status === "active").length;
    const renewedKids = validExplorers.filter((g) => g.hasUpcomingRegistration).length;
    const totalParents = validParents.length;

    return {
      totalKids,
      activeKids,
      renewedKids,
      totalParents,
    };
  }, [groupedExplorers, parents]);

  return (
    <AppShell title="Students & Family Directory">
      <style>{`
        .clickable-row {
          transition: all 0.15s ease-in-out;
          cursor: pointer;
        }
        .clickable-row:hover {
          background: #f8faff !important;
          transform: translateY(-1px);
          box-shadow: inset 0 0 0 1px #cbd5e1, 0 4px 14px rgba(0, 47, 118, 0.05);
        }
        .filter-pill { transition: all 0.15s; cursor: pointer; }
        .filter-pill:hover { transform: translateY(-1px); }
        .action-btn { transition: all 0.15s; border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
        .action-btn:hover { transform: scale(1.05); }

        /* Police Investigation / Caution Tape Styling */
        .police-tape-bar {
          background: repeating-linear-gradient(
            -45deg,
            #facc15,
            #facc15 16px,
            #000000 16px,
            #000000 32px
          );
          height: 10px;
          width: 100%;
        }
        .police-banner {
          background: #facc15;
          color: #000;
          font-family: 'Courier New', Courier, monospace, sans-serif;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2.5px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          text-transform: uppercase;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
        }
        .police-row {
          background: #fffbeb !important;
          border-left: 5px solid #eab308 !important;
          cursor: pointer;
        }
        .police-row:hover {
          background: #fef3c7 !important;
        }
      `}</style>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <m.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            style={{
              position: "fixed",
              top: "24px",
              right: "32px",
              zIndex: 99999,
              background: "#0b2a82",
              color: "white",
              padding: "12px 22px",
              borderRadius: "14px",
              boxShadow: "0 10px 30px rgba(0, 47, 118, 0.3)",
              fontSize: "13px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>✅</span>
            <span>{toastMessage}</span>
          </m.div>
        )}
      </AnimatePresence>

      <ClassCapacityTracker />

      {/* ── Stats Row (KPIs - Strictly Real Students & Families Only) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total Explorers", value: stats.totalKids, icon: "🧒", color: "#0050d5", bg: "linear-gradient(135deg,#eff6ff,#dbeafe)" },
          { label: "Active Enrolled", value: stats.activeKids, icon: "✅", color: "#15803d", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
          { label: "Registered Next Adv", value: stats.renewedKids, icon: "🚀", color: "#b45309", bg: "linear-gradient(135deg,#fffbeb,#fef3c7)" },
          { label: "Total Families", value: stats.totalParents, icon: "👨‍👩‍👧", color: "#7c3aed", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "white",
              borderRadius: "20px",
              padding: "18px 22px",
              boxShadow: "0 4px 24px rgba(0,47,118,0.07)",
              border: "1px solid rgba(0,47,118,0.06)",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "14px",
                background: s.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                flexShrink: 0,
              }}
            >
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: "26px", fontWeight: "900", color: s.color, lineHeight: 1 }}>
                {loading ? "—" : s.value}
              </div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "4px" }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs & View Switcher ── */}
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "6px 8px",
          boxShadow: "0 4px 24px rgba(0,47,118,0.07)",
          border: "1px solid rgba(0,47,118,0.06)",
          marginBottom: "18px",
          display: "inline-flex",
          gap: "6px",
        }}
      >
        <button
          onClick={() => setActiveTab("students")}
          style={{
            padding: "10px 22px",
            borderRadius: "14px",
            fontSize: "13px",
            fontWeight: "800",
            cursor: "pointer",
            border: "none",
            background: activeTab === "students" ? "linear-gradient(135deg, #0b2a82, #0050d5)" : "transparent",
            color: activeTab === "students" ? "white" : "#64748b",
            boxShadow: activeTab === "students" ? "0 4px 12px rgba(0, 80, 213, 0.25)" : "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>🧒</span>
          <span>Explorers ({realExplorers.length} real)</span>
        </button>

        <button
          onClick={() => setActiveTab("parents")}
          style={{
            padding: "10px 22px",
            borderRadius: "14px",
            fontSize: "13px",
            fontWeight: "800",
            cursor: "pointer",
            border: "none",
            background: activeTab === "parents" ? "linear-gradient(135deg, #0b2a82, #0050d5)" : "transparent",
            color: activeTab === "parents" ? "white" : "#64748b",
            boxShadow: activeTab === "parents" ? "0 4px 12px rgba(0, 80, 213, 0.25)" : "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>👨‍👩‍👧</span>
          <span>Parents & Guardians ({realParents.length} real)</span>
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "16px 20px",
          boxShadow: "0 4px 24px rgba(0,47,118,0.07)",
          border: "1px solid rgba(0,47,118,0.06)",
          marginBottom: "20px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: "200px" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", pointerEvents: "none" }}>
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === "students" ? "Search explorer, nickname, parent, email..." : "Search parent name, email, phone..."}
            style={{
              width: "100%",
              paddingLeft: "40px",
              paddingRight: "14px",
              paddingTop: "10px",
              paddingBottom: "10px",
              border: "1.5px solid #e2e8f0",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: "600",
              color: "#334155",
              outline: "none",
              background: "#f8faff",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Program Filter Pills (Explorers Tab only) */}
        {activeTab === "students" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {FILTERS.map((f) => {
              const meta = PROGRAM_META[f.id];
              const active = programFilter === f.id;
              return (
                <button
                  key={f.id}
                  className="filter-pill"
                  onClick={() => setProgramFilter(f.id)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "16px",
                    fontSize: "12px",
                    fontWeight: "700",
                    border: active ? "none" : "1.5px solid #e2e8f0",
                    background: active ? meta?.bg || "#eff6ff" : "white",
                    color: active ? meta?.color || "#0050d5" : "#64748b",
                    boxShadow: active ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {f.id !== "all" && meta ? `${meta.emoji} ` : ""}
                  {f.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Status Filter */}
        {activeTab === "students" && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "12px",
              border: "1.5px solid #e2e8f0",
              background: "#f8faff",
              fontSize: "12px",
              fontWeight: "700",
              color: "#475569",
              outline: "none",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Enrolled</option>
            <option value="reserved">Reserved</option>
            <option value="pending">Pending</option>
          </select>
        )}

        {/* Refresh button */}
        <button
          onClick={loadData}
          title="Refresh Directory"
          style={{
            marginLeft: "auto",
            padding: "8px 14px",
            borderRadius: "12px",
            border: "1.5px solid #e2e8f0",
            background: "white",
            fontSize: "13px",
            fontWeight: "700",
            color: "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", color: "#94a3b8", fontSize: "15px", fontWeight: "600", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          <div>Loading student & family records…</div>
        </div>
      ) : loadError ? (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "20px", padding: "32px 24px", textAlign: "center", color: "#9a3412" }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>🔒</div>
          <div style={{ fontWeight: "800", fontSize: "16px", marginBottom: "6px" }}>Directory could not be loaded</div>
          <div style={{ fontSize: "13px" }}>{loadError}</div>
        </div>
      ) : activeTab === "students" ? (
        /* ═══════════════════════════════════════════════════
           TAB 1: EXPLORERS DIRECTORY (REAL STUDENTS)
           ═══════════════════════════════════════════════════ */
        <div>
          {realExplorers.length === 0 ? (
            <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", border: "2px dashed #e2e8f0" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🧒</div>
              <div style={{ fontWeight: "800", color: "#002f76", fontSize: "18px", marginBottom: "6px" }}>No explorers found</div>
              <div style={{ color: "#94a3b8", fontSize: "14px" }}>Try adjusting your program filter or search.</div>
            </div>
          ) : (
            <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,47,118,0.06)", overflow: "hidden" }}>
              {/* Header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1.3fr 1.85fr 1.2fr 90px 105px",
                  padding: "14px 24px",
                  background: "#f8faff",
                  borderBottom: "1px solid #e8efff",
                }}
              >
                {["Explorer", "Current Adventure", "Next Adventure (Upcoming)", "Parent / Guardian", "Status", "Actions"].map((h, i) => (
                  <div key={i} style={{ fontSize: "11px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Real Student Rows — CLICKABLE TO OPEN STUDENT PROFILE */}
              {realExplorers.map((group, idx) => {
                const avatarGrad = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const age = getAge(group.childInfo?.dateOfBirth);
                const studentForModal = group.latestStudent;

                return (
                  <div
                    key={group.key}
                    className="clickable-row stu-row"
                    onClick={() => setSelectedGroupForView(group)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1.3fr 1.85fr 1.2fr 90px 105px",
                      padding: "14px 24px",
                      borderBottom: idx < realExplorers.length - 1 ? "1px solid #f1f5f9" : "none",
                      alignItems: "start",
                      background: "white",
                      gap: "4px",
                    }}
                  >
                    {/* Explorer col */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "50%",
                          background: avatarGrad,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "14px",
                          fontWeight: "900",
                          flexShrink: 0,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        }}
                      >
                        {getInitials(group.childName)}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: "800", fontSize: "14px", color: "#002f76", lineHeight: 1.2 }}>
                            {group.childName}
                          </span>
                          {group.isPioneer && (
                            <span
                              style={{
                                background: "#fef9c3",
                                color: "#854d0e",
                                border: "1px solid #fde047",
                                borderRadius: "6px",
                                padding: "1px 6px",
                                fontSize: "10px",
                                fontWeight: "800",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "2px",
                              }}
                            >
                              ⭐ Pioneer
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>
                          {[
                            group.childInfo?.nickname ? `"${group.childInfo?.nickname}"` : null,
                            age !== null ? `${age} yrs` : null,
                            group.childInfo?.gender,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                        {group.registrations.length > 1 && (
                          <div style={{ fontSize: "10px", color: "#0050d5", fontWeight: "700", marginTop: "2px" }}>
                            🔄 {group.registrations.length} cycles on record
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Current Adventure (CLEAN & EMPTY IF NONE) */}
                    <div>
                      <CurrentAdventureCell
                        student={group.currentAdventure}
                        startDate={group.currentAdventure?.adventureStartDate}
                      />
                    </div>

                    {/* Next Adventure (Upcoming Adventure) — SLEEK DESIGN WITH PAYMENT & CONFIRMATION STATUS */}
                    <div>
                      <NextAdventureCell
                        student={group.upcomingAdventure}
                        isNonAdv={group.isNonAdv}
                      />
                    </div>

                    {/* Parent / Guardian */}
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "13px", color: "#334155" }}>
                        {group.parentInfo?.name || "No parent name"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#0050d5", marginTop: "2px", fontWeight: "600" }}>
                        {group.parentInfo?.email || "—"}
                      </div>
                      {group.parentInfo?.phone && (
                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px" }}>
                          📞 {group.parentInfo.phone}
                        </div>
                      )}
                      {group.hasAccount ? (
                        <div style={{ fontSize: "10px", color: "#15803d", fontWeight: "700", marginTop: "3px", display: "inline-flex", alignItems: "center", gap: "3px", background: "#dcfce7", padding: "1px 6px", borderRadius: "6px" }}>
                          ✅ Portal Active
                        </div>
                      ) : (
                        <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", marginTop: "3px", display: "inline-flex", alignItems: "center", gap: "3px", background: "#f1f5f9", padding: "1px 6px", borderRadius: "6px" }}>
                          ⚪ No Portal Account
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "800",
                          textTransform: "capitalize",
                          background:
                            group.status === "active" || group.status === "approved"
                              ? "#dcfce7"
                              : group.status === "reserved"
                              ? "#fef3c7"
                              : "#ffedd5",
                          color:
                            group.status === "active" || group.status === "approved"
                              ? "#15803d"
                              : group.status === "reserved"
                              ? "#b45309"
                              : "#c2410c",
                        }}
                      >
                        {group.status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudentForEdit(studentForModal);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "10px",
                          background: "#eff6ff",
                          color: "#0050d5",
                          fontSize: "12px",
                          fontWeight: "800",
                        }}
                        title="Edit explorer details, parent contact, or program"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGroupForView(group);
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "10px",
                          background: "#f1f5f9",
                          color: "#475569",
                          fontSize: "12px",
                          fontWeight: "700",
                        }}
                        title="View full explorer profile"
                      >
                        👁️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════════
              POLICE INVESTIGATION SCENE: TEST ACCOUNTS (ONLY IAN ANGELO VALMORES)
             ══════════════════════════════════════════════════════════════════════════ */}
          {testExplorers.length > 0 && (
            <div style={{ marginTop: "40px", borderRadius: "20px", overflow: "hidden", border: "2px solid #000", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
              {/* Caution Diagonal Stripe Top */}
              <div className="police-tape-bar" />

              {/* Police Warning Ribbon */}
              <div className="police-banner">
                <span>🚧 POLICE LINE DO NOT CROSS 🚧</span>
                <span>INTERNAL TESTING ACCOUNT EVIDENCE // IAN ANGELO VALMORES // EXCLUDED FROM KPIS</span>
                <span>🚧 POLICE LINE DO NOT CROSS 🚧</span>
              </div>

              {/* Caution Diagonal Stripe Middle */}
              <div className="police-tape-bar" />

              {/* Test Rows Table Header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1.3fr 1.85fr 1.2fr 90px 105px",
                  padding: "12px 24px",
                  background: "#fef08a",
                  borderBottom: "2px solid #ca8a04",
                }}
              >
                {["Test Explorer", "Current Cycle", "Next Cycle Registration", "Test Parent / Contact", "Status", "Actions"].map((h, i) => (
                  <div key={i} style={{ fontSize: "11px", fontWeight: "900", color: "#854d0e", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Test Rows */}
              {testExplorers.map((group, idx) => {
                const studentForModal = group.latestStudent;

                return (
                  <div
                    key={group.key}
                    className="police-row clickable-row stu-row"
                    onClick={() => setSelectedGroupForView(group)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1.3fr 1.85fr 1.2fr 90px 105px",
                      padding: "14px 24px",
                      borderBottom: idx < testExplorers.length - 1 ? "1px solid #fde047" : "none",
                      alignItems: "start",
                      gap: "4px",
                    }}
                  >
                    {/* Explorer col */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "50%",
                          background: "#000",
                          border: "2px solid #facc15",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#facc15",
                          fontSize: "14px",
                          fontWeight: "900",
                          flexShrink: 0,
                        }}
                      >
                        ⚠️
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: "900", fontSize: "14px", color: "#000" }}>
                            {group.childName}
                          </span>
                          <span style={{ background: "#000", color: "#facc15", fontSize: "10px", fontWeight: "800", padding: "1px 6px", borderRadius: "4px", fontFamily: "monospace" }}>
                            TEST
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#713f12", marginTop: "2px", fontWeight: "600" }}>
                          {group.childInfo?.nickname ? `"${group.childInfo?.nickname}"` : "Internal Test Account"}
                        </div>
                      </div>
                    </div>

                    {/* Current Adventure */}
                    <div>
                      <CurrentAdventureCell
                        student={group.currentAdventure}
                        startDate={group.currentAdventure?.adventureStartDate}
                      />
                    </div>

                    {/* Next Adventure */}
                    <div>
                      <NextAdventureCell
                        student={group.upcomingAdventure}
                        isNonAdv={group.isNonAdv}
                      />
                    </div>

                    {/* Parent */}
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "13px", color: "#000" }}>
                        {group.parentInfo?.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#854d0e", fontWeight: "700" }}>
                        {group.parentInfo?.email}
                      </div>
                      {group.hasAccount ? (
                        <div style={{ fontSize: "10px", color: "#15803d", fontWeight: "700", marginTop: "3px", display: "inline-flex", alignItems: "center", gap: "3px", background: "#dcfce7", padding: "1px 6px", borderRadius: "6px" }}>
                          ✅ Portal Active
                        </div>
                      ) : (
                        <div style={{ fontSize: "10px", color: "#854d0e", fontWeight: "600", marginTop: "3px", display: "inline-flex", alignItems: "center", gap: "3px", background: "#fef9c3", padding: "1px 6px", borderRadius: "6px" }}>
                          ⚪ No Portal Account
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <span style={{ background: "#000", color: "#facc15", padding: "3px 8px", borderRadius: "8px", fontSize: "11px", fontWeight: "900", textTransform: "uppercase" }}>
                        TEST ONLY
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudentForEdit(studentForModal);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "10px",
                          background: "#000",
                          color: "#facc15",
                          fontSize: "12px",
                          fontWeight: "800",
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGroupForView(group);
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "10px",
                          background: "#fef08a",
                          color: "#854d0e",
                          border: "1px solid #ca8a04",
                          fontSize: "12px",
                          fontWeight: "700",
                        }}
                      >
                        👁️
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Bottom Caution Stripe */}
              <div className="police-tape-bar" />
            </div>
          )}
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════
           TAB 2: PARENTS & GUARDIANS DIRECTORY
           ═══════════════════════════════════════════════════ */
        <div>
          {realParents.length === 0 ? (
            <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", border: "2px dashed #e2e8f0" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>👨‍👩‍👧</div>
              <div style={{ fontWeight: "800", color: "#002f76", fontSize: "18px", marginBottom: "6px" }}>No parents found</div>
              <div style={{ color: "#94a3b8", fontSize: "14px" }}>Try searching by name, email, or child's name.</div>
            </div>
          ) : (
            <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,47,118,0.06)", overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.4fr 1.6fr 1.2fr 130px", padding: "14px 24px", background: "#f8faff", borderBottom: "1px solid #e8efff" }}>
                {["Parent / Guardian", "Contact Info", "Linked Children", "Portal Account", "Actions"].map((h, i) => (
                  <div key={i} style={{ fontSize: "11px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Real Parents Rows */}
              {realParents.map((parent, idx) => {
                const avatarGrad = AVATAR_COLORS[idx % AVATAR_COLORS.length];

                return (
                  <div
                    key={parent.email || idx}
                    className="stu-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1.4fr 1.6fr 1.2fr 130px",
                      padding: "16px 24px",
                      borderBottom: idx < realParents.length - 1 ? "1px solid #f1f5f9" : "none",
                      alignItems: "center",
                      background: "white",
                    }}
                  >
                    {/* Parent info */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: avatarGrad,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "13px",
                          fontWeight: "900",
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(parent.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "14px", color: "#002f76" }}>
                          {parent.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                          {parent.relationship || "Parent"}
                        </div>
                      </div>
                    </div>

                    {/* Contact */}
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "13px", color: "#0050d5" }}>
                        {parent.email}
                      </div>
                      {parent.phone && (
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                          📞 {parent.phone}
                        </div>
                      )}
                    </div>

                    {/* Linked Children */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {parent.children?.length > 0 ? (
                        parent.children.map((c, cIdx) => {
                          const meta = PROGRAM_META[getAdventureKey(c.program)];
                          const matchingStudent = students.find((s) => s.id === c.studentId);

                          return (
                            <button
                              key={cIdx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (matchingStudent) {
                                  setSelectedStudentForEdit(matchingStudent);
                                }
                              }}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "14px",
                                background: meta?.bg || "#eff6ff",
                                color: meta?.color || "#0050d5",
                                border: "1px solid rgba(0,0,0,0.06)",
                                fontSize: "11px",
                                fontWeight: "700",
                                cursor: matchingStudent ? "pointer" : "default",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                              title="Click to view/edit child"
                            >
                              <span>{meta?.emoji || "🧒"}</span>
                              <span>{c.firstName} {c.lastName}</span>
                              {matchingStudent && <span style={{ opacity: 0.6, fontSize: "9px" }}>✏️</span>}
                            </button>
                          );
                        })
                      ) : (
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>No children linked</span>
                      )}
                    </div>

                    {/* Portal Account Status */}
                    <div>
                      {parent.hasAccount ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            background: "#dcfce7",
                            color: "#15803d",
                            fontSize: "11px",
                            fontWeight: "800",
                          }}
                        >
                          ✅ Active Login
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            background: "#fef3c7",
                            color: "#b45309",
                            fontSize: "11px",
                            fontWeight: "800",
                          }}
                        >
                          ⚠️ No Portal Login
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div>
                      {!parent.hasAccount ? (
                        <button
                          className="action-btn"
                          onClick={() => setSelectedParentForAccount(parent)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "10px",
                            background: "linear-gradient(135deg, #0b2a82, #0050d5)",
                            color: "white",
                            fontSize: "11px",
                            fontWeight: "800",
                            boxShadow: "0 2px 8px rgba(0,80,213,0.25)",
                          }}
                        >
                          + Create Account
                        </button>
                      ) : (
                        <button
                          className="action-btn"
                          onClick={() => {
                            const firstStudent = students.find((s) => parent.children?.some((c) => c.studentId === s.id));
                            if (firstStudent) setSelectedStudentForEdit(firstStudent);
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "10px",
                            background: "#eff6ff",
                            color: "#0050d5",
                            fontSize: "11px",
                            fontWeight: "800",
                          }}
                        >
                          ✏️ Edit Contact
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════════
              POLICE INVESTIGATION SCENE: TEST PARENT ACCOUNTS (IAN ANGELO VALMORES)
             ══════════════════════════════════════════════════════════════════════════ */}
          {testParents.length > 0 && (
            <div style={{ marginTop: "40px", borderRadius: "20px", overflow: "hidden", border: "2px solid #000", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
              <div className="police-tape-bar" />
              <div className="police-banner">
                <span>🚧 POLICE LINE DO NOT CROSS 🚧</span>
                <span>INTERNAL TEST PARENT ACCOUNTS // IAN ANGELO VALMORES // EXCLUDED FROM KPIS</span>
                <span>🚧 POLICE LINE DO NOT CROSS 🚧</span>
              </div>
              <div className="police-tape-bar" />

              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.4fr 1.6fr 1.2fr 130px", padding: "12px 24px", background: "#fef08a", borderBottom: "2px solid #ca8a04" }}>
                {["Test Parent", "Email & Phone", "Linked Test Children", "Portal Status", "Actions"].map((h, i) => (
                  <div key={i} style={{ fontSize: "11px", fontWeight: "900", color: "#854d0e", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                    {h}
                  </div>
                ))}
              </div>

              {testParents.map((parent, idx) => (
                <div
                  key={parent.email || idx}
                  className="police-row stu-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr 1.4fr 1.6fr 1.2fr 130px",
                    padding: "16px 24px",
                    borderBottom: idx < testParents.length - 1 ? "1px solid #fde047" : "none",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#000", color: "#facc15", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", fontSize: "14px" }}>
                      ⚠️
                    </div>
                    <div>
                      <div style={{ fontWeight: "900", fontSize: "14px", color: "#000" }}>{parent.name}</div>
                      <div style={{ fontSize: "11px", color: "#854d0e", fontWeight: "700" }}>Test Account</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontWeight: "800", fontSize: "13px", color: "#000" }}>{parent.email}</div>
                    <div style={{ fontSize: "11px", color: "#854d0e" }}>{parent.phone || "—"}</div>
                  </div>

                  <div>
                    <span style={{ background: "#facc15", color: "#000", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "800" }}>
                      {parent.children?.map(c => c.firstName).join(", ") || "Test Child"}
                    </span>
                  </div>

                  <div>
                    <span style={{ background: "#000", color: "#facc15", padding: "3px 8px", borderRadius: "8px", fontSize: "10px", fontWeight: "900" }}>
                      TEST ACCOUNT
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: "11px", color: "#854d0e", fontStyle: "italic", fontWeight: "700" }}>
                      Isolated from KPIs
                    </span>
                  </div>
                </div>
              ))}
              <div className="police-tape-bar" />
            </div>
          )}
        </div>
      )}

      {/* ── View Explorer Profile Modal ── */}
      <ExplorerDetailModal
        isOpen={!!selectedGroupForView}
        group={selectedGroupForView}
        onClose={() => setSelectedGroupForView(null)}
        onEditStudent={(stu) => {
          setSelectedGroupForView(null);
          setSelectedStudentForEdit(stu);
        }}
        onCreateParentAccount={(parentData) => {
          setSelectedParentForAccount(parentData);
        }}
      />

      {/* ── Edit Student Modal ── */}
      <StudentEditModal
        isOpen={!!selectedStudentForEdit}
        student={selectedStudentForEdit}
        onClose={() => setSelectedStudentForEdit(null)}
        onSaveSuccess={handleStudentSaveSuccess}
      />

      {/* ── Create Parent Account Modal ── */}
      <ParentAccountCreateModal
        isOpen={!!selectedParentForAccount}
        parent={selectedParentForAccount}
        onClose={() => setSelectedParentForAccount(null)}
        onSuccess={() => {
          showToast(`Portal account created successfully!`);
          loadData();
        }}
      />
    </AppShell>
  );
}
