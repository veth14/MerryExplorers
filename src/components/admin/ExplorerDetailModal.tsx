"use client";

import React, { useState } from "react";

const PROGRAM_META: Record<string, { color: string; bg: string; label: string; emoji: string }> = {
  "curious-explorer":  { color: "#b45309", bg: "#fffbeb", label: "Curious Explorer",  emoji: "🔎" },
  "creative-explorer": { color: "#1d4ed8", bg: "#eff6ff", label: "Creative Explorer", emoji: "🎨" },
  "everyday-curious":  { color: "#7c3aed", bg: "#f5f3ff", label: "Everyday Explorer", emoji: "🌈" },
  "everyday-explorer": { color: "#7c3aed", bg: "#f5f3ff", label: "Everyday Explorer", emoji: "🌈" },
  "brave-explorer":    { color: "#047857", bg: "#f0fdf4", label: "Trailblazer (Brave)",    emoji: "💡" },
  "saturday-playdate": { color: "#ea580c", bg: "#fff7ed", label: "Saturday Playdate", emoji: "🎈" },
  "ballet":            { color: "#db2777", bg: "#fdf2f8", label: "Ballet",            emoji: "🩰" },
  "virtual-session":   { color: "#0891b2", bg: "#ecfeff", label: "Virtual Tutorial",  emoji: "💻" },
};

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #002f76, #0050d5)",
  "linear-gradient(135deg, #7c3aed, #a78bfa)",
  "linear-gradient(135deg, #047857, #34d399)",
  "linear-gradient(135deg, #b45309, #fbbf24)",
  "linear-gradient(135deg, #db2777, #f472b6)",
];

function getInitials(name?: string) {
  if (!name) return "EX";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAge(dob?: string) {
  if (!dob) return null;
  const parts = dob.split("-");
  if (parts.length !== 3) return null;
  const [yyyy, mm, dd] = parts.map(Number);
  const now = new Date();
  let age = now.getFullYear() - yyyy;
  const monthDiff = now.getMonth() + 1 - mm;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dd)) age--;
  return age < 0 ? 0 : age;
}

function formatDate(val?: string) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface ExplorerGroup {
  key: string;
  childName: string;
  childInfo?: any;
  parentInfo?: any;
  emergencyContact?: any;
  registrations: any[];
  latestStudent: any;
  currentAdventure?: any;
  upcomingAdventure?: any;
  hasAccount?: boolean;
  isPioneer?: boolean;
  status: string;
  latestRegistrationDate?: string;
  isNonAdv?: boolean;
}

interface ExplorerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: ExplorerGroup | null;
  onEditStudent: (student: any) => void;
  onCreateParentAccount?: (parentData: any) => void;
}

export function ExplorerDetailModal({
  isOpen,
  onClose,
  group,
  onEditStudent,
  onCreateParentAccount,
}: ExplorerDetailModalProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  if (!isOpen || !group) return null;

  const { childInfo, parentInfo, emergencyContact, currentAdventure, upcomingAdventure } = group;
  const student = group.latestStudent;
  const age = getAge(childInfo?.dateOfBirth);
  const hasAccount = !!(group.hasAccount || student?.hasAccount || group.registrations?.some((r: any) => r.hasAccount));
  const isPioneer = Boolean(
    group.isPioneer ||
    student?.isPioneer ||
    group.registrations?.some((r: any) => r.isPioneer)
  );

  const charCode = (childInfo?.firstName || "A").charCodeAt(0);
  const avatarGrad = AVATAR_GRADIENTS[charCode % AVATAR_GRADIENTS.length];

  const currentMeta = currentAdventure ? (PROGRAM_META[currentAdventure.program] || PROGRAM_META["curious-explorer"]) : null;
  const upcomingMeta = upcomingAdventure ? (PROGRAM_META[upcomingAdventure.program] || PROGRAM_META["curious-explorer"]) : null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 15, 45, 0.65)",
          backdropFilter: "blur(6px)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          animation: "fadeIn 0.2s ease-out",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            width: "100%",
            maxWidth: "780px",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0, 47, 118, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.8)",
            animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* ── Top Hero Header ── */}
          <div
            style={{
              background: "linear-gradient(135deg, #001a4d 0%, #002f76 50%, #0050d5 100%)",
              padding: "24px 28px",
              color: "white",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Ambient Background Circles */}
            <div
              style={{
                position: "absolute",
                top: "-40px",
                right: "-40px",
                width: "180px",
                height: "180px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.05)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-30px",
                right: "120px",
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.04)",
                pointerEvents: "none",
              }}
            />

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                top: "18px",
                right: "18px",
                background: "rgba(255, 255, 255, 0.15)",
                border: "none",
                borderRadius: "50%",
                width: "34px",
                height: "34px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "16px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Close modal"
            >
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
              {/* Avatar */}
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: avatarGrad,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "26px",
                  fontWeight: "900",
                  flexShrink: 0,
                  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)",
                  border: "3px solid rgba(255, 255, 255, 0.3)",
                }}
              >
                {getInitials(group.childName)}
              </div>

              {/* Title & Explorer info */}
              <div style={{ flex: 1, minWidth: "220px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: "22px", fontWeight: "900", margin: 0, letterSpacing: "-0.3px", color: "white" }}>
                    {group.childName}
                  </h2>
                  {childInfo?.nickname && (
                    <span
                      style={{
                        background: "rgba(255, 255, 255, 0.2)",
                        color: "#fef08a",
                        padding: "2px 10px",
                        borderRadius: "14px",
                        fontSize: "12px",
                        fontWeight: "800",
                      }}
                    >
                      "{childInfo.nickname}"
                    </span>
                  )}
                </div>

                {/* Subtitle Badges */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                  {age !== null && (
                    <span
                      style={{
                        background: "rgba(255, 255, 255, 0.12)",
                        border: "1px solid rgba(255, 255, 255, 0.25)",
                        padding: "2px 9px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "700",
                      }}
                    >
                      🎂 {age} yrs old
                    </span>
                  )}
                  {childInfo?.gender && (
                    <span
                      style={{
                        background: "rgba(255, 255, 255, 0.12)",
                        border: "1px solid rgba(255, 255, 255, 0.25)",
                        padding: "2px 9px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "700",
                      }}
                    >
                      {childInfo.gender === "Female" ? "👧 Female" : "👦 Male"}
                    </span>
                  )}
                  <span
                    style={{
                      background:
                        group.status === "active" || group.status === "approved"
                          ? "#22c55e"
                          : group.status === "reserved"
                          ? "#f59e0b"
                          : "#f97316",
                      color: "white",
                      padding: "2px 10px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: "900",
                      textTransform: "capitalize",
                    }}
                  >
                    ● {group.status}
                  </span>

                  {/* Pioneer Status Badge */}
                  {isPioneer ? (
                    <span
                      style={{
                        background: "linear-gradient(135deg, #fef08a, #fde047)",
                        color: "#713f12",
                        border: "1px solid #eab308",
                        padding: "2px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "900",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.18)",
                      }}
                    >
                      ⭐ Pioneer Family
                    </span>
                  ) : (
                    <span
                      style={{
                        background: "rgba(255, 255, 255, 0.14)",
                        color: "white",
                        border: "1px solid rgba(255, 255, 255, 0.25)",
                        padding: "2px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "700",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      🌱 Standard Enrollment
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Scrollable Body ── */}
          <div
            style={{
              padding: "24px 28px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* 1. Adventure Status Section (Current vs Next) */}
            <div>
              <div style={{ fontSize: "11px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.8px", color: "#64748b", marginBottom: "10px" }}>
                🎯 Adventure Enrollments
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                {/* Current Adventure Card */}
                <div
                  style={{
                    border: currentAdventure ? `1.5px solid ${currentMeta?.color ? currentMeta.color + "33" : "#e2e8f0"}` : "1.5px dashed #cbd5e1",
                    borderRadius: "16px",
                    padding: "16px",
                    background: currentAdventure ? currentMeta?.bg || "#f8fafc" : "#fafafa",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b" }}>
                      Current Adventure
                    </span>
                    {currentAdventure && (
                      <span
                        style={{
                          background: "#dcfce7",
                          color: "#15803d",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "10px",
                          fontWeight: "800",
                        }}
                      >
                        Active Cycle
                      </span>
                    )}
                  </div>

                  {currentAdventure ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "18px" }}>{currentMeta?.emoji || "⭐"}</span>
                        <div>
                          <div style={{ fontWeight: "900", fontSize: "14px", color: currentMeta?.color || "#002f76" }}>
                            {currentAdventure.adventureNumber ? `Adv ${currentAdventure.adventureNumber} · ` : ""}
                            {currentMeta?.label || currentAdventure.programName}
                          </div>
                          {currentAdventure.classTime && (
                            <div style={{ fontSize: "11px", color: "#475569", fontWeight: "700" }}>
                              🕒 {currentAdventure.classTime}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", paddingTop: "4px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                        Enrolled: {formatDate(currentAdventure.enrolledAt)}
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: "14px 0", textAlign: "center", color: "#94a3b8", fontSize: "12px", fontStyle: "italic" }}>
                      No prior Adventure 1 cycle. Explorer registered directly for upcoming cycle.
                    </div>
                  )}
                </div>

                {/* Next Adventure (Upcoming) Card */}
                <div
                  style={{
                    border: upcomingAdventure ? `1.5px solid ${upcomingMeta?.color ? upcomingMeta.color + "44" : "#e2e8f0"}` : "1.5px dashed #cbd5e1",
                    borderRadius: "16px",
                    padding: "16px",
                    background: upcomingAdventure ? upcomingMeta?.bg || "#f8fafc" : "#fafafa",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b" }}>
                      Next Adventure (Upcoming)
                    </span>
                    {upcomingAdventure && (
                      <span
                        style={{
                          background:
                            upcomingAdventure.status === "approved" || upcomingAdventure.status === "active"
                              ? "#dcfce7"
                              : upcomingAdventure.receiptUrl
                              ? "#fef9c3"
                              : "#dbeafe",
                          color:
                            upcomingAdventure.status === "approved" || upcomingAdventure.status === "active"
                              ? "#15803d"
                              : upcomingAdventure.receiptUrl
                              ? "#854d0e"
                              : "#1e40af",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "10px",
                          fontWeight: "800",
                        }}
                      >
                        {upcomingAdventure.status === "approved"
                          ? "✅ Confirmed"
                          : upcomingAdventure.receiptUrl
                          ? "💳 Paid · Awaiting Confirmation"
                          : "⏳ Reserved · Pending Payment"}
                      </span>
                    )}
                  </div>

                  {upcomingAdventure ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "18px" }}>{upcomingMeta?.emoji || "⭐"}</span>
                        <div>
                          <div style={{ fontWeight: "900", fontSize: "14px", color: upcomingMeta?.color || "#002f76" }}>
                            {upcomingAdventure.adventureNumber ? `Adv ${upcomingAdventure.adventureNumber} · ` : "Adv 2 · "}
                            {upcomingMeta?.label || upcomingAdventure.programName}
                          </div>
                          {upcomingAdventure.classTime && (
                            <div style={{ fontSize: "11px", color: "#475569", fontWeight: "700" }}>
                              🕒 {upcomingAdventure.classTime}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingTop: "4px", borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: "11px" }}>
                        <div style={{ color: "#64748b" }}>
                          Registered: {formatDate(upcomingAdventure.enrolledAt)}
                        </div>
                        {upcomingAdventure.adventureStartDate && (
                          <div style={{ color: "#15803d", fontWeight: "700" }}>
                            Starts: {formatDate(upcomingAdventure.adventureStartDate)}
                          </div>
                        )}
                        {upcomingAdventure.referenceNumber && (
                          <div style={{ color: "#002f76", fontWeight: "700" }}>
                            Ref #: {upcomingAdventure.referenceNumber}
                          </div>
                        )}
                        {upcomingAdventure.receiptUrl && (
                          <div style={{ marginTop: "4px" }}>
                            <button
                              onClick={() => setSelectedReceipt(upcomingAdventure.receiptUrl)}
                              style={{
                                background: "#0050d5",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                padding: "4px 10px",
                                fontSize: "11px",
                                fontWeight: "800",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              🧾 View Payment Receipt
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: "14px 0", textAlign: "center", color: "#94a3b8", fontSize: "12px", fontStyle: "italic" }}>
                      Not yet registered for Adventure 2.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Two-column Explorer & Parent details */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              {/* Explorer Profile Details */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "18px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: "900", color: "#002f76", display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                  <span>🧒</span> Explorer Profile
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8", fontWeight: "600" }}>Full Name</span>
                    <span style={{ fontWeight: "700", color: "#1e293b" }}>{group.childName}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8", fontWeight: "600" }}>Nickname</span>
                    <span style={{ fontWeight: "700", color: "#1e293b" }}>{childInfo?.nickname || "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8", fontWeight: "600" }}>Date of Birth</span>
                    <span style={{ fontWeight: "700", color: "#1e293b" }}>{childInfo?.dateOfBirth ? formatDate(childInfo.dateOfBirth) : "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8", fontWeight: "600" }}>Gender</span>
                    <span style={{ fontWeight: "700", color: "#1e293b" }}>{childInfo?.gender || "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ color: "#94a3b8", fontWeight: "600" }}>Allergies / Health</span>
                    <span style={{ fontWeight: "700", color: childInfo?.healthProfile && childInfo.healthProfile !== "None" ? "#b91c1c" : "#15803d", textAlign: "right", maxWidth: "60%" }}>
                      {childInfo?.healthProfile || "None"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#94a3b8", fontWeight: "600" }}>Pioneer Status</span>
                    {isPioneer ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 8px",
                          borderRadius: "8px",
                          fontSize: "11px",
                          fontWeight: "800",
                          background: "#fef9c3",
                          color: "#854d0e",
                          border: "1px solid #fde047",
                        }}
                      >
                        ⭐ Pioneer Family (Inaugural Cohort)
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 8px",
                          borderRadius: "8px",
                          fontSize: "11px",
                          fontWeight: "600",
                          background: "#f1f5f9",
                          color: "#64748b",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        Standard Enrollment
                      </span>
                    )}
                  </div>
                </div>

                {/* Favorites */}
                <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", marginBottom: "8px", textTransform: "uppercase" }}>
                    ⭐ Favorites
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#94a3b8" }}>Color</span>
                      <span style={{ fontWeight: "700", color: "#334155" }}>{childInfo?.favoriteColor || "—"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#94a3b8" }}>Song</span>
                      <span style={{ fontWeight: "700", color: "#334155" }}>{childInfo?.favoriteSong || "—"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#94a3b8" }}>Character</span>
                      <span style={{ fontWeight: "700", color: "#334155" }}>{childInfo?.favoriteCharacter || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parent & Emergency Details */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "18px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: "900", color: "#002f76", display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                  <span>👨‍👩‍👧</span> Parent & Emergency Contacts
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8", fontWeight: "600" }}>Parent Name</span>
                    <span style={{ fontWeight: "700", color: "#1e293b" }}>{parentInfo?.name || "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8", fontWeight: "600" }}>Relationship</span>
                    <span style={{ fontWeight: "700", color: "#1e293b" }}>{parentInfo?.relationship || "Parent"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#94a3b8", fontWeight: "600" }}>Email</span>
                    {parentInfo?.email ? (
                      <a
                        href={`mailto:${parentInfo.email}`}
                        style={{ fontWeight: "700", color: "#0050d5", textDecoration: "none" }}
                      >
                        {parentInfo.email}
                      </a>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#94a3b8", fontWeight: "600" }}>Phone</span>
                    {parentInfo?.phone ? (
                      <a
                        href={`tel:${parentInfo.phone}`}
                        style={{ fontWeight: "700", color: "#0050d5", textDecoration: "none" }}
                      >
                        📞 {parentInfo.phone}
                      </a>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </div>
                  {parentInfo?.address && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#94a3b8", fontWeight: "600" }}>Address</span>
                      <span style={{ fontWeight: "600", color: "#334155", textAlign: "right", maxWidth: "60%" }}>
                        {parentInfo.address}
                      </span>
                    </div>
                  )}
                </div>

                {/* Parent Portal Dashboard Access */}
                <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", marginBottom: "8px", textTransform: "uppercase" }}>
                    🔐 Parent Portal Dashboard Access
                  </div>
                  {hasAccount ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        background: "#f0fdf4",
                        border: "1.5px solid #bbf7d0",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "800", color: "#166534", display: "flex", alignItems: "center", gap: "5px" }}>
                          ✅ Active Portal Account
                        </div>
                        <div style={{ fontSize: "11px", color: "#15803d", marginTop: "2px" }}>
                          Login: <strong>{parentInfo?.email}</strong>
                        </div>
                      </div>
                      <span style={{ fontSize: "10.5px", background: "#dcfce7", color: "#166534", padding: "3px 8px", borderRadius: "8px", fontWeight: "800" }}>
                        Parent Dashboard Enabled
                      </span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "10px",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        background: "#fffbeb",
                        border: "1.5px solid #fde68a",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "800", color: "#92400e", display: "flex", alignItems: "center", gap: "5px" }}>
                          ⚠️ No Portal Account Yet
                        </div>
                        <div style={{ fontSize: "11px", color: "#a16207", marginTop: "2px" }}>
                          Family cannot log in to view child dashboard or photos
                        </div>
                      </div>
                      {onCreateParentAccount && parentInfo?.email && (
                        <button
                          type="button"
                          onClick={() => {
                            onCreateParentAccount({
                              name: parentInfo?.name || "Parent",
                              email: parentInfo?.email,
                              phone: parentInfo?.phone || "",
                              relationship: parentInfo?.relationship || "Parent",
                              children: [
                                {
                                  firstName: childInfo?.firstName || "",
                                  lastName: childInfo?.lastName || "",
                                  programName: student?.programName || student?.program,
                                },
                              ],
                            });
                          }}
                          style={{
                            background: "linear-gradient(135deg, #0b2a82, #0050d5)",
                            color: "white",
                            border: "none",
                            borderRadius: "10px",
                            padding: "6px 14px",
                            fontSize: "12px",
                            fontWeight: "800",
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(0, 80, 213, 0.25)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          🔑 + Create Account
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Emergency Contact */}
                <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", marginBottom: "8px", textTransform: "uppercase" }}>
                    🚨 Emergency Contact
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#94a3b8" }}>Name</span>
                      <span style={{ fontWeight: "700", color: "#334155" }}>{emergencyContact?.name || "Same as parent"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#94a3b8" }}>Relationship</span>
                      <span style={{ fontWeight: "700", color: "#334155" }}>{emergencyContact?.relationship || "Parent"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#94a3b8" }}>Phone</span>
                      <span style={{ fontWeight: "700", color: "#0050d5" }}>{emergencyContact?.phone ? `📞 ${emergencyContact.phone}` : "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Consents & Notes */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "16px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ fontSize: "12px" }}>
                  <span style={{ color: "#64748b", fontWeight: "600" }}>Photo Consent: </span>
                  <span style={{ fontWeight: "800", color: "#15803d" }}>
                    {student.photoConsent === "no" || student.photoConsent === false ? "❌ Not Granted" : "✅ Granted"}
                  </span>
                </div>
                <div style={{ fontSize: "12px" }}>
                  <span style={{ color: "#64748b", fontWeight: "600" }}>Program Waiver: </span>
                  <span style={{ fontWeight: "800", color: "#15803d" }}>✅ Signed Online</span>
                </div>
              </div>

              {student.signatureUrl && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Signature:</span>
                  <img
                    src={student.signatureUrl}
                    alt="Digital signature"
                    style={{ maxHeight: "30px", maxWidth: "90px", objectFit: "contain", border: "1px solid #cbd5e1", borderRadius: "6px", background: "white", padding: "2px" }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Modal Footer ── */}
          <div
            style={{
              padding: "14px 28px",
              background: "#ffffff",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <button
              onClick={onClose}
              style={{
                background: "#f1f5f9",
                color: "#475569",
                border: "none",
                borderRadius: "10px",
                padding: "8px 18px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onEditStudent(student);
              }}
              style={{
                background: "linear-gradient(135deg, #0b2a82, #0050d5)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "8px 20px",
                fontSize: "13px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0, 80, 213, 0.25)",
              }}
            >
              ✏️ Edit Explorer
            </button>
          </div>
        </div>
      </div>

      {/* ── Receipt Viewer Sub-Modal ── */}
      {selectedReceipt && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedReceipt(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(4px)",
            zIndex: 100000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "16px",
              maxWidth: "500px",
              width: "100%",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              alignItems: "center",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <span style={{ fontWeight: "800", fontSize: "14px", color: "#002f76" }}>
                🧾 GCash / Bank Payment Receipt
              </span>
              <button
                onClick={() => setSelectedReceipt(null)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", width: "100%" }}>
              <img
                src={selectedReceipt}
                alt="Payment Receipt"
                style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: "8px" }}
              />
            </div>
            <a
              href={selectedReceipt}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "12px",
                color: "#0050d5",
                fontWeight: "700",
                textDecoration: "none",
              }}
            >
              Open Original in New Tab ↗
            </a>
          </div>
        </div>
      )}
    </>
  );
}
