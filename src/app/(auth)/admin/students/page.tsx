"use client";

import { useEffect, useState, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { AppShell } from "@/components/app-shell";
import { ClassCapacityTracker } from "@/components/admin/ClassCapacityTracker";
import { useAuth } from "@/lib/auth-context";
import { PROGRAM_SLOTS } from "@/data/landing";

const StudentEditModal = dynamic(
  () => import("@/components/admin/StudentEditModal").then((m) => m.StudentEditModal),
  { ssr: false }
);
const ParentAccountCreateModal = dynamic(
  () => import("@/components/admin/ParentAccountCreateModal").then((m) => m.ParentAccountCreateModal),
  { ssr: false }
);
const ExplorerDetailModal = dynamic(
  () => import("@/components/admin/ExplorerDetailModal").then((m) => m.ExplorerDetailModal),
  { ssr: false }
);

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

function getStudentAdvNum(s?: Student | null): number {
  if (!s) return 2;
  if (typeof s.adventureNumber === "number" && s.adventureNumber > 0) return s.adventureNumber;
  if (typeof s.activeAdventureNumber === "number" && s.activeAdventureNumber > 0) return s.activeAdventureNumber;
  if (s.period && /adventure\s*[-_]?\s*(\d+)/i.test(s.period)) {
    const m = s.period.match(/adventure\s*[-_]?\s*(\d+)/i);
    if (m) return parseInt(m[1], 10);
  }
  return 2;
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

  const [activeTab, setActiveTab] = useState<"students" | "parents" | "reschedule">("students");
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

  // ─── Reschedule tab state ─────────────────────────────────────────────────
  const [rescheduleModal, setRescheduleModal] = useState<Student | null>(null);
  const [reschedNewTime, setReschedNewTime] = useState("");
  const [reschedNewSchedule, setReschedNewSchedule] = useState("");
  const [reschedReason, setReschedReason] = useState("");
  const [reschedSaving, setReschedSaving] = useState(false);
  const [reschedSearch, setReschedSearch] = useState("");
  const [reschedProgFilter, setReschedProgFilter] = useState("all");
  const [reschedAdvFilter, setReschedAdvFilter] = useState<number>(2);

  // Auto-sync to highest available adventure if needed
  useEffect(() => {
    if (students.length > 0) {
      const realEnrolled = students.filter(s =>
        !isIanAngeloValmores(s) &&
        (s.status === "active" || s.paid === true || s.paymentStatus === "approved" || s.paymentStatus === "confirmed")
      );
      const advNums = Array.from(
        new Set(
          realEnrolled
            .map(getStudentAdvNum)
            .filter((n): n is number => typeof n === "number" && n > 0)
        )
      ).sort((a, b) => b - a);

      if (advNums.length > 0 && !advNums.includes(reschedAdvFilter)) {
        setReschedAdvFilter(advNums[0]);
      }
    }
  }, [students, reschedAdvFilter]);

  async function handleReschedule() {
    if (!rescheduleModal) return;
    if (!reschedNewTime.trim() && !reschedNewSchedule.trim()) {
      showToast("Please enter a new class time or schedule day.");
      return;
    }
    setReschedSaving(true);
    try {
      const res = await fetch("/api/students/reschedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rescheduleModal.id,
          classTime: reschedNewTime.trim() || rescheduleModal.classTime,
          schedule: reschedNewSchedule.trim() || rescheduleModal.schedule,
          reason: reschedReason.trim(),
        }),
      });
      if (res.ok) {
        const childName = `${rescheduleModal.childInfo?.firstName || ""} ${rescheduleModal.childInfo?.lastName || ""}`.trim();
        showToast(`✅ Rescheduled ${childName} successfully!`);
        setRescheduleModal(null);
        setReschedNewTime("");
        setReschedNewSchedule("");
        setReschedReason("");
        loadData();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(`Error: ${data.error || "Failed to reschedule"}`);
      }
    } catch {
      showToast("Network error. Please try again.");
    } finally {
      setReschedSaving(false);
    }
  }

  // SWR data fetching with 30s deduping interval
  const {
    mutate: mutateStudents,
  } = useSWR(
    userId ? "/api/students" : null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load directory (HTTP ${res.status}).`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load directory.");
      return data;
    },
    {
      dedupingInterval: 30_000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      onSuccess: (data) => {
        setStudents(data.data || []);
        if (data.parents) setParents(data.parents);
        setLoading(false);
      },
      onError: (err) => {
        setLoadError(err.message || "Failed to load directory.");
        setLoading(false);
      },
    }
  );

  const loadData = () => {
    setLoading(true);
    setLoadError("");
    mutateStudents().finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading && !userId) {
      setLoadError("Your sign-in session could not be verified. Sign out and sign in again.");
      setLoading(false);
    }
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
        // Check if student is an ongoing/continuing explorer from Adventure 1 (e.g. from renewal_families, pioneer cohort, or detected previous adventure)
        const prevProg = (adv2 as any).previousProgram || (latest as any).previousProgram || (adv2 as any).previousProgramName;
        const prevAdvNum = (adv2 as any).previousAdventureNumber || (latest as any).previousAdventureNumber || (adv2 as any).detectedPreviousAdventure;
        const isContinuing = Boolean(prevProg || prevAdvNum === 1 || adv2.isPioneer || (adv2 as any).selfDeclaredPreviousAdventure);

        if (isContinuing) {
          const progSlug = prevProg
            ? (prevProg.toLowerCase().includes("everyday") ? "everyday-curious" : prevProg.toLowerCase().includes("creative") ? "creative-explorer" : prevProg.toLowerCase().includes("brave") ? "brave-explorer" : "curious-explorer")
            : adv2.program;
          currentAdventure = {
            ...adv2,
            id: `${adv2.id}_adv1`,
            adventureNumber: 1,
            program: progSlug,
            programName: prevProg || adv2.programName || "Adventure 1",
            classTime: "Completed Adventure 1",
            enrolledAt: adv2.enrolledAt,
            status: "approved",
          };
          upcomingAdventure = adv2;
          previousAdventure = undefined;
        } else {
          // Brand new student registered only for Adventure 2:
          // Do NOT input anything into Current Adventure! Leave it empty!
          currentAdventure = undefined;
          upcomingAdventure = adv2;
          previousAdventure = undefined;
        }
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

  // Reschedule adventure-specific KPIs — dynamic per selected adventure
  const reschedStats = useMemo(() => {
    const realPaid = students.filter(s =>
      !isIanAngeloValmores(s) &&
      (s.status === "active" || s.paid === true || s.paymentStatus === "approved" || s.paymentStatus === "confirmed")
    );

    const advStudents = realPaid.filter(s => getStudentAdvNum(s) === reschedAdvFilter);
    const scheduled = advStudents.filter(s => Boolean(s.schedule && s.classTime && !s.schedule.startsWith("⚠️")));
    const unassigned = advStudents.filter(s => !s.schedule || !s.classTime || s.schedule.startsWith("⚠️"));
    const sessionGroups = new Set(
      advStudents
        .map(s => [s.schedule, s.classTime].filter(Boolean).join(" · "))
        .filter(k => k && !k.startsWith("⚠️"))
    );

    return {
      totalEnrolled: advStudents.length,
      scheduledCount: scheduled.length,
      unassignedCount: unassigned.length,
      sessionGroupsCount: sessionGroups.size,
    };
  }, [students, reschedAdvFilter]);

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

      {/* ── Stats Row (KPIs - Strictly Real Students & Families Only, updates per Adventure when on Reschedule) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {(activeTab === "reschedule" ? [
          { label: `Enrolled in Adv ${reschedAdvFilter}`, value: reschedStats.totalEnrolled, icon: "🌟", color: "#002f76", bg: "linear-gradient(135deg,#eff6ff,#dbeafe)" },
          { label: "Confirmed in Sessions", value: reschedStats.scheduledCount, icon: "🗓️", color: "#15803d", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
          { label: "Unassigned / Needs Slot", value: reschedStats.unassignedCount, icon: "⚠️", color: reschedStats.unassignedCount > 0 ? "#b45309" : "#64748b", bg: reschedStats.unassignedCount > 0 ? "linear-gradient(135deg,#fffbeb,#fef3c7)" : "linear-gradient(135deg,#f8fafc,#f1f5f9)" },
          { label: "Active Session Groups", value: reschedStats.sessionGroupsCount, icon: "🏫", color: "#7c3aed", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)" },
        ] : [
          { label: "Total Explorers", value: stats.totalKids, icon: "🧒", color: "#0050d5", bg: "linear-gradient(135deg,#eff6ff,#dbeafe)" },
          { label: "Active Enrolled", value: stats.activeKids, icon: "✅", color: "#15803d", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
          { label: "Registered Next Adv", value: stats.renewedKids, icon: "🚀", color: "#b45309", bg: "linear-gradient(135deg,#fffbeb,#fef3c7)" },
          { label: "Total Families", value: stats.totalParents, icon: "👨‍👩‍👧", color: "#7c3aed", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)" },
        ]).map((s) => (
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

        <button
          onClick={() => setActiveTab("reschedule")}
          style={{
            padding: "10px 22px",
            borderRadius: "14px",
            fontSize: "13px",
            fontWeight: "800",
            cursor: "pointer",
            border: "none",
            background: activeTab === "reschedule"
              ? "linear-gradient(135deg, #002f76, #0050d5)"
              : "transparent",
            color: activeTab === "reschedule" ? "white" : "#64748b",
            boxShadow: activeTab === "reschedule" ? "0 4px 12px rgba(0, 47, 118, 0.25)" : "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>🔄</span>
          <span>Reschedule Sessions</span>
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
      {loading && students.length === 0 ? (
        <div style={{ background: "white", borderRadius: "20px", padding: "24px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "12px" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer" style={{ height: "48px", borderRadius: "12px" }} />
          ))}
        </div>
      ) : loadError ? (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "20px", padding: "32px 24px", textAlign: "center", color: "#9a3412" }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>🔒</div>
          <div style={{ fontWeight: "800", fontSize: "16px", marginBottom: "6px" }}>Directory could not be loaded</div>
          <div style={{ fontSize: "13px" }}>{loadError}</div>
        </div>
      ) : activeTab === "reschedule" ? (
        /* ═══════════════════════════════════════════════════
           TAB 3: RESCHEDULE SESSIONS
           ═══════════════════════════════════════════════════ */
        <div>
          {/* ── Adventure Category Bar (Per-Adventure Only, No 'All') ── */}
          {(() => {
            const realPaid = students.filter(s =>
              !isIanAngeloValmores(s) &&
              (s.status === "active" || s.paid === true || s.paymentStatus === "approved" || s.paymentStatus === "confirmed")
            );

            const distinctAdvs = Array.from(
              new Set(
                realPaid
                  .map(getStudentAdvNum)
                  .filter((n): n is number => typeof n === "number" && n > 0)
              )
            ).sort((a, b) => a - b);

            const advList = distinctAdvs.length > 0 ? distinctAdvs : [1, 2];

            return (
              <div style={{
                background: "white",
                borderRadius: "20px",
                padding: "12px 20px",
                boxShadow: "0 4px 20px rgba(0, 47, 118, 0.05)",
                border: "1.5px solid #dbe4f6",
                marginBottom: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginRight: "6px" }}>
                    <span style={{ fontSize: "16px" }}>🗺️</span>
                    <span style={{ fontSize: "11px", fontWeight: "900", color: "#002f76", textTransform: "uppercase", letterSpacing: "1px" }}>
                      Adventure Cycle
                    </span>
                  </div>

                  {advList.map(num => {
                    const active = reschedAdvFilter === num;
                    const count = realPaid.filter(s => getStudentAdvNum(s) === num).length;
                    return (
                      <button
                        key={num}
                        onClick={() => setReschedAdvFilter(num)}
                        style={{
                          padding: "8px 18px",
                          borderRadius: "14px",
                          fontSize: "13px",
                          fontWeight: "800",
                          border: active ? "none" : "1.5px solid #dbe4f6",
                          background: active ? "linear-gradient(135deg, #001a4d 0%, #002f76 100%)" : "white",
                          color: active ? "#ffb800" : "#475569",
                          cursor: "pointer",
                          boxShadow: active ? "0 4px 14px rgba(0, 26, 77, 0.25)" : "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span style={{ fontSize: "12px" }}>🌟</span>
                        <span>Adventure {num}</span>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          background: active ? "rgba(255, 184, 0, 0.2)" : "#f1f5f9",
                          color: active ? "#ffb800" : "#64748b",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          minWidth: "20px",
                          textAlign: "center",
                        }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                  Selected Cycle: <span style={{ color: "#002f76", fontWeight: "900" }}>Adventure {reschedAdvFilter}</span>
                </div>
              </div>
            );
          })()}

          {/* ── Reschedule toolbar (Search + Program Pills + Live Count) ── */}
          <div style={{
            background: "white",
            borderRadius: "20px",
            padding: "18px 22px",
            boxShadow: "0 4px 24px rgba(0, 47, 118, 0.06)",
            border: "1.5px solid #dbe4f6",
            marginBottom: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}>
            {/* Row 1: search + dynamic adventure-filtered count */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "1 1 240px", minWidth: "180px" }}>
                <span style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", pointerEvents: "none" }}>🔍</span>
                <input
                  value={reschedSearch}
                  onChange={e => setReschedSearch(e.target.value)}
                  placeholder="Search by student or parent name…"
                  style={{ width: "100%", paddingLeft: "38px", paddingRight: "14px", paddingTop: "10px", paddingBottom: "10px", border: "1.5px solid #dbe4f6", borderRadius: "12px", fontSize: "13px", fontWeight: "600", color: "#334155", outline: "none", background: "#f8faff", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>
              <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "1px", flexShrink: 0 }}>
                <span style={{ fontSize: "20px", fontWeight: "900", color: "#002f76", lineHeight: 1 }}>
                  {reschedStats.totalEnrolled}
                </span>
                <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Adv {reschedAdvFilter} Enrolled
                </span>
              </div>
            </div>

            {/* Row 2: Program filter chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginRight: "4px" }}>Program</span>
              {[{ id: "all", label: "All Programs" }, ...FILTERS.filter(f => f.id !== "all")].map(f => {
                const meta = PROGRAM_META[f.id];
                const active = reschedProgFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setReschedProgFilter(f.id)}
                    style={{
                      padding: "6px 14px", borderRadius: "16px", fontSize: "12px", fontWeight: "700",
                      border: active ? "none" : "1.5px solid #dbe4f6",
                      background: active ? (meta?.bg || "#eff6ff") : "white",
                      color: active ? (meta?.color || "#002f76") : "#64748b",
                      cursor: "pointer",
                      boxShadow: active ? "0 2px 8px rgba(0, 47, 118, 0.15)" : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    {f.id !== "all" && meta ? `${meta.emoji} ` : ""}{f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Schedule groups ── */}
          {(() => {
            const realStudents = students.filter(s => !isIanAngeloValmores(s));

            // Helper: is this student's payment confirmed/approved?
            const isPaid = (s: Student) =>
              s.status === "active" ||
              s.paid === true ||
              s.paymentStatus === "approved" ||
              s.paymentStatus === "confirmed";

            // Only enrolled/paid students are eligible for rescheduling
            const enrolledStudents = realStudents.filter(isPaid);

            const filtered = enrolledStudents.filter(s => {
              const q = reschedSearch.toLowerCase().trim();
              const matchSearch = !q ||
                `${s.childInfo?.firstName} ${s.childInfo?.lastName}`.toLowerCase().includes(q) ||
                (s.parentInfo?.name || "").toLowerCase().includes(q) ||
                (s.parentInfo?.email || "").toLowerCase().includes(q);
              const matchProg = reschedProgFilter === "all" ||
                s.program === reschedProgFilter ||
                (s.program === "everyday-explorer" && reschedProgFilter === "everyday-curious");
              const matchAdv = getStudentAdvNum(s) === reschedAdvFilter;
              return matchSearch && matchProg && matchAdv;
            });

            // Group by current schedule + classTime
            const groups = new Map<string, Student[]>();
            for (const s of filtered) {
              const key = [s.schedule, s.classTime].filter(Boolean).join(" · ") || "⚠️ No Schedule Set";
              const list = groups.get(key) || [];
              list.push(s);
              groups.set(key, list);
            }

            if (filtered.length === 0) {
              return (
                <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", border: "2px dashed #dbe4f6" }}>
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔄</div>
                  <div style={{ fontWeight: "800", color: "#002f76", fontSize: "18px", marginBottom: "6px" }}>No students found</div>
                  <div style={{ color: "#94a3b8", fontSize: "14px" }}>Try adjusting your search or filter.</div>
                </div>
              );
            }

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {Array.from(groups.entries()).map(([scheduleKey, groupStudents]) => {
                  const count = groupStudents.length;
                  const isUnset = scheduleKey.startsWith("⚠️");
                  return (
                    <div key={scheduleKey} style={{ background: "white", borderRadius: "20px", border: isUnset ? "1.5px solid #fde68a" : "1.5px solid #dbe4f6", boxShadow: isUnset ? "0 4px 24px rgba(245,158,11,0.08)" : "0 4px 24px rgba(0, 47, 118, 0.05)", overflow: "hidden" }}>
                      {/* Group header */}
                      <div style={{ padding: "14px 24px", background: isUnset ? "linear-gradient(135deg, #fffbeb, #fef3c7)" : "linear-gradient(135deg, #f0f5ff, #e6efff)", borderBottom: isUnset ? "1.5px solid #fde68a" : "1.5px solid #dbe4f6", display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "38px", height: "38px", borderRadius: "12px", background: isUnset ? "linear-gradient(135deg, #f59e0b, #fbbf24)" : "linear-gradient(135deg, #002f76, #0050d5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: "white", flexShrink: 0 }}>{isUnset ? "⚠️" : "🗓️"}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "900", fontSize: "15px", color: isUnset ? "#92400e" : "#002f76" }}>{scheduleKey}</div>
                          <div style={{ fontSize: "11px", fontWeight: "700", color: isUnset ? "#d97706" : "#0050d5", marginTop: "2px" }}>{count} student{count !== 1 ? "s" : ""} on this schedule</div>
                        </div>
                      </div>

                      {/* Column header */}
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.6fr 1.4fr 110px", padding: "10px 24px", background: isUnset ? "#fffbeb" : "#f8faff", borderBottom: isUnset ? "1px solid #fde68a" : "1px solid #e2e8f0" }}>
                        {["Student", "Program", "Current Schedule", "Parent", "Action"].map((h, i) => (
                          <div key={i} style={{ fontSize: "10px", fontWeight: "800", color: isUnset ? "#d97706" : "#002f76", textTransform: "uppercase", letterSpacing: "0.7px", textAlign: h === "Action" ? "right" : "left" }}>{h}</div>
                        ))}
                      </div>

                      {/* Rows */}
                      {groupStudents.map((student, idx) => {
                        const prog = PROGRAM_META[student.program] || PROGRAM_META["everyday-curious"];
                        const childName = `${student.childInfo?.firstName || ""} ${student.childInfo?.lastName || ""}`.trim();
                        const avatarGrad = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                        return (
                          <div
                            key={student.id}
                            style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.6fr 1.4fr 110px", padding: "14px 24px", borderBottom: idx < groupStudents.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", background: "white", transition: "background 0.15s" }}
                          >
                            {/* Student — name + nickname + adventure number as a small inline tag */}
                            <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: avatarGrad, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "13px", fontWeight: "800", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
                                {getInitials(childName)}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a", lineHeight: 1.2 }}>{childName}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
                                  {student.childInfo?.nickname && (
                                    <span style={{ fontSize: "11px", color: "#0050d5", fontWeight: "700" }}>&ldquo;{student.childInfo.nickname}&rdquo;</span>
                                  )}
                                  {(() => {
                                    const advNum = student.adventureNumber ?? student.activeAdventureNumber;
                                    const isNonAdv = ["saturday-playdate", "ballet"].includes(student.program);
                                    if (isNonAdv) return null;
                                    return (
                                      <span style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "1px 6px", letterSpacing: "0.2px" }}>
                                        Adv {advNum ?? "?"}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>

                            {/* Program */}
                            <div>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 9px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", background: prog?.bg || "#eff6ff", color: prog?.color || "#002f76", border: `1px solid ${prog?.color ? prog.color + "22" : "#dbe4f6"}` }}>
                                {prog?.emoji || "⭐"} {prog?.label || student.programName}
                              </span>
                            </div>

                            {/* Current Schedule */}
                            <div>
                              {student.schedule && (
                                <div style={{ fontSize: "12px", fontWeight: "700", color: "#334155" }}>📅 {student.schedule}</div>
                              )}
                              {student.classTime && (
                                <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", marginTop: "2px" }}>🕒 {student.classTime}</div>
                              )}
                              {!student.schedule && !student.classTime && (
                                <span style={{ fontSize: "11px", color: "#d97706", fontWeight: "700", background: "#fffbeb", padding: "2px 8px", borderRadius: "10px" }}>⚠️ Not set</span>
                              )}
                            </div>

                            {/* Parent */}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: "12px", fontWeight: "700", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{student.parentInfo?.name || "—"}</div>
                              <div style={{ fontSize: "10.5px", color: "#94a3b8", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{student.parentInfo?.email || ""}</div>
                            </div>

                            {/* Action */}
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                              <button
                                onClick={() => {
                                  setRescheduleModal(student);
                                  setReschedNewTime(student.classTime || "");
                                  setReschedNewSchedule(student.schedule || "");
                                  setReschedReason("");
                                }}
                                style={{ padding: "7px 14px", borderRadius: "10px", background: "linear-gradient(135deg, #002f76, #0050d5)", color: "white", fontSize: "12px", fontWeight: "800", border: "none", cursor: "pointer", boxShadow: "0 3px 10px rgba(0, 47, 118, 0.2)", whiteSpace: "nowrap" }}
                              >
                                🔄 Move
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ── Reschedule Modal (Merry Explorers Design System & Live Capacity Dropdown) ── */}
          {rescheduleModal && (() => {
            const childName = `${rescheduleModal.childInfo?.firstName || ""} ${rescheduleModal.childInfo?.lastName || ""}`.trim();
            const prog = PROGRAM_META[rescheduleModal.program] || PROGRAM_META["everyday-curious"];
            // Only count enrolled/paid students for slot capacity (pending payments don't consume a slot)
            const realStudents = students.filter(s =>
              !isIanAngeloValmores(s) &&
              (s.status === "active" || s.paid === true || s.paymentStatus === "approved" || s.paymentStatus === "confirmed")
            );

            // Extract program config from landing
            const targetProgDef = (PROGRAM_SLOTS as any)[rescheduleModal.program] || (PROGRAM_SLOTS as any)["everyday-curious"];
            const currentSchedulePreset = targetProgDef?.schedule || rescheduleModal.schedule || "";

            const targetAdv = getStudentAdvNum(rescheduleModal);

            // Helper to compute slot availability for any class within this adventure
            const getSlotAvailability = (progId: string, className: string, maxSlots: number) => {
              const taken = realStudents.filter(s => {
                const matchAdv = getStudentAdvNum(s) === targetAdv;
                const matchProg = s.program === progId || (progId === "everyday-curious" && s.program === "everyday-explorer");
                const ct = (s.classTime || "").toLowerCase();
                const cn = className.toLowerCase();
                return matchAdv && matchProg && (ct.includes(cn) || cn.includes(ct));
              }).length;
              const available = Math.max(0, maxSlots - taken);
              return { taken, available, maxSlots };
            };

            // Selected slot stats
            const selectedMatchClass = targetProgDef?.classes?.find((c: any) =>
              c.name.toLowerCase() === reschedNewTime.toLowerCase() ||
              reschedNewTime.toLowerCase().includes(c.name.toLowerCase()) ||
              c.time.toLowerCase() === reschedNewTime.toLowerCase()
            );
            const slotStats = selectedMatchClass
              ? getSlotAvailability(rescheduleModal.program, selectedMatchClass.name, selectedMatchClass.maxSlots || 4)
              : null;

            return (
              <div
                onClick={() => setRescheduleModal(null)}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 1000,
                  background: "rgba(0, 26, 77, 0.6)",
                  backdropFilter: "blur(6px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px",
                }}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: "white",
                    borderRadius: "26px",
                    width: "100%",
                    maxWidth: "540px",
                    boxShadow: "0 28px 70px rgba(0, 26, 77, 0.28)",
                    border: "1.5px solid #dbe4f6",
                    overflow: "hidden",
                  }}
                >
                  {/* Modal header - Brand Navy Gradient with Gold Accents */}
                  <div style={{ padding: "22px 28px", background: "linear-gradient(135deg, #001a4d 0%, #002f76 60%, #0050d5 100%)", display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", border: "1.5px solid rgba(255,184,0,0.4)", flexShrink: 0 }}>
                      🔄
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: "900", color: "white", margin: 0, lineHeight: 1.2 }}>
                          Reschedule Session
                        </h2>
                        <span style={{ fontSize: "11px", fontWeight: "800", color: "#ffb800", background: "rgba(255,184,0,0.18)", padding: "2px 8px", borderRadius: "8px", border: "1px solid rgba(255,184,0,0.3)" }}>
                          Adv {targetAdv}
                        </span>
                      </div>
                      <div style={{ fontSize: "12.5px", color: "#ffb800", marginTop: "3px", fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {childName}
                      </div>
                    </div>
                    <button
                      onClick={() => setRescheduleModal(null)}
                      style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.14)", border: "1.5px solid rgba(255,255,255,0.3)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "15px", fontWeight: "700", flexShrink: 0 }}
                    >✕</button>
                  </div>

                  {/* Modal body */}
                  <div style={{ padding: "26px 28px" }}>
                    {/* Current info card */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", background: "#f0f5ff", borderRadius: "14px", border: "1.5px solid #dbe4f6", marginBottom: "22px" }}>
                      <span style={{ fontSize: "24px", flexShrink: 0 }}>{prog?.emoji || "⭐"}</span>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: "800", color: "#002f76" }}>{prog?.label || rescheduleModal.programName}</div>
                        <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>
                          Current: <span style={{ color: "#0050d5", fontWeight: "700" }}>{rescheduleModal.schedule || "—"}</span> · <span style={{ color: "#0050d5", fontWeight: "700" }}>{rescheduleModal.classTime || "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* ── Dropdown Button: Select Available Session & Time with Slots Left ── */}
                    <div style={{ marginBottom: "18px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "800", color: "#002f76", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                          🎯 Select Target Session & Time
                        </label>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>
                          Live Slot Capacity
                        </span>
                      </div>

                      <select
                        value={
                          selectedMatchClass
                            ? `${reschedNewSchedule || currentSchedulePreset}|||${selectedMatchClass.name}`
                            : reschedNewTime ? "custom" : ""
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "custom") {
                            // keep existing or clear for custom typing
                            return;
                          }
                          const [sched, clsName] = val.split("|||");
                          if (sched && clsName) {
                            setReschedNewSchedule(sched);
                            setReschedNewTime(clsName);
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          border: "1.5px solid #0050d5",
                          borderRadius: "14px",
                          fontSize: "13px",
                          fontWeight: "700",
                          color: "#0f172a",
                          outline: "none",
                          background: "#f8faff",
                          boxSizing: "border-box",
                          fontFamily: "inherit",
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(0, 47, 118, 0.08)",
                        }}
                      >
                        <option value="" disabled>-- Choose a session slot --</option>

                        {/* Standard sessions for current program */}
                        {targetProgDef && targetProgDef.classes?.length > 0 && (
                          <optgroup label={`Standard ${targetProgDef.name} Sessions`}>
                            {targetProgDef.classes.map((cls: any) => {
                              const stats = getSlotAvailability(rescheduleModal.program, cls.name, cls.maxSlots || 4);
                              const isFull = stats.available === 0;
                              const slotText = isFull ? "🔴 FULL (0 slots left)" : `🟢 ${stats.available} slots left (${stats.taken}/${stats.maxSlots} taken)`;
                              return (
                                <option
                                  key={cls.name}
                                  value={`${targetProgDef.schedule}|||${cls.name}`}
                                >
                                  {cls.name} · {cls.time} ({targetProgDef.schedule}) — {slotText}
                                </option>
                              );
                            })}
                          </optgroup>
                        )}

                        {/* Other programs sessions */}
                        {Object.entries(PROGRAM_SLOTS).map(([pId, pConfig]: [string, any]) => {
                          if (pId === rescheduleModal.program) return null;
                          return (
                            <optgroup key={pId} label={`Other: ${pConfig.name} (${pConfig.schedule})`}>
                              {pConfig.classes?.map((cls: any) => {
                                const stats = getSlotAvailability(pId, cls.name, cls.maxSlots || 4);
                                const isFull = stats.available === 0;
                                const slotText = isFull ? "🔴 FULL" : `🟢 ${stats.available} left`;
                                return (
                                  <option key={`${pId}-${cls.name}`} value={`${pConfig.schedule}|||${cls.name}`}>
                                    {cls.name} · {cls.time} ({pConfig.schedule}) — {slotText}
                                  </option>
                                );
                              })}
                            </optgroup>
                          );
                        })}

                        <option value="custom">✏️ Enter Custom Schedule & Time Manually...</option>
                      </select>
                    </div>

                    {/* ── Slot Detail & Capacity Indicator Card ── */}
                    <div style={{ padding: "12px 16px", borderRadius: "14px", background: "#f8faff", border: "1.5px solid #dbe4f6", marginBottom: "18px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Selected Session Days & Time:</div>
                          <div style={{ fontSize: "13px", fontWeight: "800", color: "#002f76", marginTop: "2px" }}>
                            📅 {reschedNewSchedule || "Not chosen yet"} · 🕒 {reschedNewTime || "Not chosen yet"}
                            {selectedMatchClass?.time ? ` (${selectedMatchClass.time})` : ""}
                          </div>
                        </div>

                        {slotStats ? (
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "11.5px",
                              fontWeight: "800",
                              background: slotStats.available > 0 ? "#dcfce7" : "#fee2e2",
                              color: slotStats.available > 0 ? "#15803d" : "#b91c1c",
                              border: slotStats.available > 0 ? "1px solid #86efac" : "1px solid #fca5a5",
                            }}
                          >
                            {slotStats.available > 0 ? `✓ ${slotStats.available} slots left (${slotStats.taken}/${slotStats.maxSlots} enrolled)` : `⚠️ Session Full (${slotStats.taken}/${slotStats.maxSlots})`}
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Custom Slot</span>
                        )}
                      </div>
                    </div>

                    {/* Optional: manual edits if custom or fine-tuning */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "18px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "10.5px", fontWeight: "800", color: "#002f76", marginBottom: "6px", textTransform: "uppercase" }}>
                          📅 Schedule Days
                        </label>
                        <input
                          value={reschedNewSchedule}
                          onChange={e => setReschedNewSchedule(e.target.value)}
                          placeholder="e.g. Monday & Wednesday"
                          style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #dbe4f6", borderRadius: "10px", fontSize: "12px", fontWeight: "600", color: "#334155", outline: "none", background: "white", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "10.5px", fontWeight: "800", color: "#002f76", marginBottom: "6px", textTransform: "uppercase" }}>
                          🕒 Class Time / Session
                        </label>
                        <input
                          value={reschedNewTime}
                          onChange={e => setReschedNewTime(e.target.value)}
                          placeholder="e.g. Morning Session"
                          style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #dbe4f6", borderRadius: "10px", fontSize: "12px", fontWeight: "600", color: "#334155", outline: "none", background: "white", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    {/* Reason */}
                    <div style={{ marginBottom: "24px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#002f76", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        📝 Reason / Notes <span style={{ fontWeight: "500", textTransform: "none", fontSize: "11px", color: "#64748b" }}>(optional)</span>
                      </label>
                      <textarea
                        value={reschedReason}
                        onChange={e => setReschedReason(e.target.value)}
                        rows={2}
                        placeholder="e.g. Parent requested change, schedule conflict with another class…"
                        style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #dbe4f6", borderRadius: "10px", fontSize: "12px", fontWeight: "600", color: "#334155", outline: "none", background: "#f8faff", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }}
                      />
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => setRescheduleModal(null)}
                        style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1.5px solid #cbd5e1", background: "white", color: "#475569", fontSize: "13px", fontWeight: "800", cursor: "pointer", transition: "background 0.2s" }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReschedule}
                        disabled={reschedSaving}
                        style={{ flex: 2, padding: "12px", borderRadius: "12px", border: "none", background: reschedSaving ? "#93c5fd" : "linear-gradient(135deg, #002f76, #0050d5)", color: "white", fontSize: "13px", fontWeight: "800", cursor: reschedSaving ? "not-allowed" : "pointer", boxShadow: reschedSaving ? "none" : "0 6px 18px rgba(0, 47, 118, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                      >
                        {reschedSaving ? (
                          <>
                            <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                            Saving…
                          </>
                        ) : "🔄 Confirm Reschedule"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
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
