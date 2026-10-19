"use client";

import { useState, useEffect } from "react";

interface StudentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any | null;
  onSaveSuccess: (updatedStudent: any) => void;
}

const PROGRAM_OPTIONS = [
  { value: "curious-explorer", label: "Curious Explorer", fullName: "Discovery Club: Curious Explorer" },
  { value: "creative-explorer", label: "Creative Explorer", fullName: "Discovery Club: Creative Explorer" },
  { value: "everyday-curious", label: "Everyday Explorer", fullName: "Discovery Club: Everyday Explorer" },
  { value: "everyday-explorer", label: "Everyday Explorer (Alt Key)", fullName: "Discovery Club: Everyday Explorer" },
  { value: "brave-explorer", label: "Trailblazer: Brave Explorer", fullName: "Trailblazer: Brave Explorer" },
  { value: "saturday-playdate", label: "Saturday Playdate", fullName: "Saturday Playdate" },
  { value: "ballet", label: "Ballet", fullName: "Ballet" },
  { value: "virtual-session", label: "Virtual Tutorial", fullName: "Virtual Tutorial" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active / Enrolled", color: "#16a34a" },
  { value: "approved", label: "Approved", color: "#2563eb" },
  { value: "reserved", label: "Reserved", color: "#d97706" },
  { value: "pending", label: "Pending Verification", color: "#ea580c" },
  { value: "completed", label: "Completed", color: "#4b5563" },
  { value: "inactive", label: "Inactive / Withdrawn", color: "#dc2626" },
];

export function StudentEditModal({ isOpen, onClose, student, onSaveSuccess }: StudentEditModalProps) {
  const [activeTab, setActiveTab] = useState<"child" | "parent" | "program">("child");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [childInfo, setChildInfo] = useState({
    firstName: "",
    lastName: "",
    nickname: "",
    dateOfBirth: "",
    gender: "",
    healthProfile: "",
    allergies: "",
    favoriteColor: "",
    favoriteSong: "",
    favoriteCharacter: "",
  });

  const [parentInfo, setParentInfo] = useState({
    name: "",
    email: "",
    phone: "",
    relationship: "Parent",
    address: "",
  });

  const [emergencyContact, setEmergencyContact] = useState({
    name: "",
    relationship: "",
    phone: "",
  });

  const [program, setProgram] = useState("curious-explorer");
  const [programName, setProgramName] = useState("Discovery Club: Curious Explorer");
  const [adventureNumber, setAdventureNumber] = useState<string>("1");
  const [classTime, setClassTime] = useState("");
  const [schedule, setSchedule] = useState("");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (student) {
      setChildInfo({
        firstName: student.childInfo?.firstName || "",
        lastName: student.childInfo?.lastName || "",
        nickname: student.childInfo?.nickname || "",
        dateOfBirth: student.childInfo?.dateOfBirth || "",
        gender: student.childInfo?.gender || "",
        healthProfile: student.childInfo?.healthProfile || "",
        allergies: student.childInfo?.allergies || "",
        favoriteColor: student.childInfo?.favoriteColor || "",
        favoriteSong: student.childInfo?.favoriteSong || "",
        favoriteCharacter: student.childInfo?.favoriteCharacter || "",
      });

      setParentInfo({
        name: student.parentInfo?.name || "",
        email: student.parentInfo?.email || "",
        phone: student.parentInfo?.phone || "",
        relationship: student.parentInfo?.relationship || "Parent",
        address: student.parentInfo?.address || "",
      });

      setEmergencyContact({
        name: student.emergencyContact?.name || "",
        relationship: student.emergencyContact?.relationship || "",
        phone: student.emergencyContact?.phone || "",
      });

      setProgram(student.program || "curious-explorer");
      setProgramName(student.programName || "Discovery Club: Curious Explorer");
      setAdventureNumber(student.adventureNumber !== null && student.adventureNumber !== undefined ? String(student.adventureNumber) : "1");
      setClassTime(student.classTime || "");
      setSchedule(student.schedule || "");
      setStatus(student.status || "active");
      setNotes(student.notes || "");
      setError("");
      setActiveTab("child");
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleProgramChange = (progValue: string) => {
    setProgram(progValue);
    const found = PROGRAM_OPTIONS.find((p) => p.value === progValue);
    if (found) {
      setProgramName(found.fullName);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!childInfo.firstName.trim() || !childInfo.lastName.trim()) {
      setError("Child's first and last name are required.");
      setActiveTab("child");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: student.id || student._id,
        childInfo,
        parentInfo,
        emergencyContact,
        program,
        programName,
        adventureNumber: adventureNumber ? Number(adventureNumber) : null,
        classTime,
        schedule,
        status,
        notes,
      };

      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update student information.");
      }

      onSaveSuccess({
        ...student,
        ...payload,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(11, 26, 60, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 47, 118, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          animation: "modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <style>{`
          @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.96) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .edit-input {
            width: 100%;
            padding: 10px 14px;
            border-radius: 12px;
            border: 1.5px solid #e2e8f0;
            background: #f8faff;
            font-size: 13px;
            color: #1e293b;
            font-family: inherit;
            outline: none;
            transition: all 0.15s;
            box-sizing: border-box;
          }
          .edit-input:focus {
            border-color: #2563eb;
            background: white;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
          }
          .edit-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 6px;
            display: block;
          }
        `}</style>

        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, #0b2a82 0%, #0050d5 100%)",
            color: "white",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px", opacity: 0.85 }}>
              Edit Explorer Record
            </div>
            <div style={{ fontSize: "18px", fontWeight: "900", marginTop: "2px" }}>
              {childInfo.firstName || "Explorer"} {childInfo.lastName}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              color: "white",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "700",
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#f8faff", padding: "0 16px" }}>
          {[
            { id: "child", label: "🧒 Child Information" },
            { id: "parent", label: "👨‍👩‍👧 Parent & Emergency" },
            { id: "program", label: "📚 Program & Status" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: "12px 18px",
                  fontSize: "13px",
                  fontWeight: active ? "800" : "600",
                  color: active ? "#0050d5" : "#64748b",
                  background: "none",
                  border: "none",
                  borderBottom: active ? "2.5px solid #0050d5" : "2.5px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} style={{ overflowY: "auto", flex: 1, padding: "24px" }}>
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1.5px solid #fecaca",
                color: "#b91c1c",
                borderRadius: "12px",
                padding: "12px 16px",
                fontSize: "13px",
                fontWeight: "600",
                marginBottom: "20px",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* TAB 1: CHILD INFORMATION */}
          {activeTab === "child" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="edit-label">First Name *</label>
                  <input
                    className="edit-input"
                    value={childInfo.firstName}
                    onChange={(e) => setChildInfo({ ...childInfo, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="edit-label">Last Name *</label>
                  <input
                    className="edit-input"
                    value={childInfo.lastName}
                    onChange={(e) => setChildInfo({ ...childInfo, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="edit-label">Nickname</label>
                  <input
                    className="edit-input"
                    value={childInfo.nickname}
                    onChange={(e) => setChildInfo({ ...childInfo, nickname: e.target.value })}
                    placeholder="e.g. Leo"
                  />
                </div>
                <div>
                  <label className="edit-label">Date of Birth</label>
                  <input
                    type="date"
                    className="edit-input"
                    value={childInfo.dateOfBirth}
                    onChange={(e) => setChildInfo({ ...childInfo, dateOfBirth: e.target.value })}
                  />
                </div>
                <div>
                  <label className="edit-label">Gender</label>
                  <select
                    className="edit-input"
                    value={childInfo.gender}
                    onChange={(e) => setChildInfo({ ...childInfo, gender: e.target.value })}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Boy / Male</option>
                    <option value="Female">Girl / Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="edit-label">Health Profile & Allergies</label>
                <textarea
                  className="edit-input"
                  style={{ minHeight: "68px", resize: "vertical" }}
                  value={childInfo.healthProfile}
                  onChange={(e) => setChildInfo({ ...childInfo, healthProfile: e.target.value })}
                  placeholder="Any allergies, dietary restrictions, medical conditions or sensitivities..."
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="edit-label">Favorite Color</label>
                  <input
                    className="edit-input"
                    value={childInfo.favoriteColor}
                    onChange={(e) => setChildInfo({ ...childInfo, favoriteColor: e.target.value })}
                    placeholder="e.g. Blue"
                  />
                </div>
                <div>
                  <label className="edit-label">Favorite Song</label>
                  <input
                    className="edit-input"
                    value={childInfo.favoriteSong}
                    onChange={(e) => setChildInfo({ ...childInfo, favoriteSong: e.target.value })}
                    placeholder="e.g. Wheels on the Bus"
                  />
                </div>
                <div>
                  <label className="edit-label">Favorite Character</label>
                  <input
                    className="edit-input"
                    value={childInfo.favoriteCharacter}
                    onChange={(e) => setChildInfo({ ...childInfo, favoriteCharacter: e.target.value })}
                    placeholder="e.g. Elsa / Spiderman"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PARENT & EMERGENCY */}
          {activeTab === "parent" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Primary Parent / Guardian */}
              <div>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#002f76", marginBottom: "12px" }}>
                  Primary Parent / Guardian
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label className="edit-label">Parent Full Name</label>
                    <input
                      className="edit-input"
                      value={parentInfo.name}
                      onChange={(e) => setParentInfo({ ...parentInfo, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="edit-label">Relationship to Child</label>
                    <input
                      className="edit-input"
                      value={parentInfo.relationship}
                      onChange={(e) => setParentInfo({ ...parentInfo, relationship: e.target.value })}
                      placeholder="e.g. Mother, Father, Guardian"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label className="edit-label">Email Address</label>
                    <input
                      type="email"
                      className="edit-input"
                      value={parentInfo.email}
                      onChange={(e) => setParentInfo({ ...parentInfo, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="edit-label">Mobile Phone Number</label>
                    <input
                      className="edit-input"
                      value={parentInfo.phone}
                      onChange={(e) => setParentInfo({ ...parentInfo, phone: e.target.value })}
                      placeholder="e.g. 09171234567"
                    />
                  </div>
                </div>

                <div>
                  <label className="edit-label">Home Address</label>
                  <input
                    className="edit-input"
                    value={parentInfo.address}
                    onChange={(e) => setParentInfo({ ...parentInfo, address: e.target.value })}
                    placeholder="City, Province or full address"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#002f76", marginBottom: "12px" }}>
                  Secondary Emergency Contact
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="edit-label">Emergency Contact Name</label>
                    <input
                      className="edit-input"
                      value={emergencyContact.name}
                      onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="edit-label">Relationship</label>
                    <input
                      className="edit-input"
                      value={emergencyContact.relationship}
                      onChange={(e) => setEmergencyContact({ ...emergencyContact, relationship: e.target.value })}
                      placeholder="e.g. Grandmother"
                    />
                  </div>
                  <div>
                    <label className="edit-label">Emergency Phone</label>
                    <input
                      className="edit-input"
                      value={emergencyContact.phone}
                      onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROGRAM & STATUS */}
          {activeTab === "program" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "16px" }}>
                <div>
                  <label className="edit-label">Program</label>
                  <select
                    className="edit-input"
                    value={program}
                    onChange={(e) => handleProgramChange(e.target.value)}
                  >
                    {PROGRAM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="edit-label">Adventure Cycle #</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="edit-input"
                    value={adventureNumber}
                    onChange={(e) => setAdventureNumber(e.target.value)}
                    placeholder="e.g. 1, 2"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="edit-label">Class Time / Batch</label>
                  <input
                    className="edit-input"
                    value={classTime}
                    onChange={(e) => setClassTime(e.target.value)}
                    placeholder="e.g. Morning Session (9:00 AM – 10:15 AM)"
                  />
                </div>
                <div>
                  <label className="edit-label">Schedule</label>
                  <input
                    className="edit-input"
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    placeholder="e.g. Mon / Wed / Fri or Saturdays"
                  />
                </div>
              </div>

              <div>
                <label className="edit-label">Enrollment Status</label>
                <select
                  className="edit-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="edit-label">Administrative Notes</label>
                <textarea
                  className="edit-input"
                  style={{ minHeight: "72px", resize: "vertical" }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes about this explorer's registration, payments, or attendance..."
                />
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div
            style={{
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                border: "1.5px solid #e2e8f0",
                background: "white",
                color: "#64748b",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 24px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #0b2a82, #0050d5)",
                color: "white",
                fontWeight: "800",
                fontSize: "13px",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                boxShadow: "0 4px 14px rgba(0, 80, 213, 0.3)",
              }}
            >
              {saving ? "Saving Changes…" : "💾 Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
