"use client";

import { useEffect, useState, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/app-shell";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatSessionTime(dt: string) {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return dt; // Fallback if already plain string
    return d.toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
    });
  } catch {
    return dt;
  }
}

const AVATAR_COLORS = [
  "linear-gradient(135deg,#002f76,#0050d5)",
  "linear-gradient(135deg,#7c3aed,#a78bfa)",
  "linear-gradient(135deg,#047857,#34d399)",
  "linear-gradient(135deg,#b45309,#fbbf24)",
  "linear-gradient(135deg,#be123c,#fb7185)",
  "linear-gradient(135deg,#0e7490,#22d3ee)",
];

const FILTERS = [
  { id: "all", label: "All Students" },
  { id: "no-link", label: "Needs Link" },
  { id: "has-link", label: "Link Set" },
];

export default function AdminVirtualSessionsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  
  const [manageModal, setManageModal] = useState<any | null>(null);
  const [confirmEndModal, setConfirmEndModal] = useState<string | null>(null);

  // Link and Time state
  const [newLink, setNewLink] = useState("");
  const [newTime, setNewTime] = useState("");
  const [sendEmailOnSave, setSendEmailOnSave] = useState(true);
  const [savingLink, setSavingLink] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [linkSaveResult, setLinkSaveResult] = useState<{ ok: boolean, isEnd?: boolean } | null>(null);
  const [isEditingLink, setIsEditingLink] = useState(false);

  // Material state
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [materialType, setMaterialType] = useState<"link"|"file">("link");

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (Array.isArray(data)) {
        const virtual = data.filter(acc => 
          acc.program === "Virtual Tutorial" || 
          acc.program === "virtual-session" ||
          (acc.role?.toLowerCase() === "parent" && acc.sessionPayments)
        );
        setAccounts(virtual);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Auto-update modal data if background accounts refresh
  useEffect(() => {
    if (manageModal) {
      const updated = accounts.find(a => a.id === manageModal.id);
      if (updated) setManageModal(updated);
    }
  }, [accounts]);

  const stats = useMemo(() => {
    const total = accounts.length;
    const noLink = accounts.filter(a => !a.virtualSessionLink).length;
    const totalMaterials = accounts.reduce((sum, a) => sum + (a.studyMaterials?.length || 0), 0);
    return { total, noLink, totalMaterials };
  }, [accounts]);

  const filtered = useMemo(() => {
    return accounts.filter(acc => {
      const matchSearch = !search || 
        (acc.fullName || "").toLowerCase().includes(search.toLowerCase()) || 
        (acc.childName || "").toLowerCase().includes(search.toLowerCase());
      
      const matchFilter = 
        activeFilter === "all" || 
        (activeFilter === "no-link" && !acc.virtualSessionLink) ||
        (activeFilter === "has-link" && !!acc.virtualSessionLink);

      return matchSearch && matchFilter;
    });
  }, [accounts, search, activeFilter]);

  async function handleSaveLink(uid: string) {
    setSavingLink(true);
    try {
      const res = await fetch("/api/parents/virtual-link", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, virtualSessionLink: newLink, virtualSessionTime: newTime, sendEmail: sendEmailOnSave }),
      });
      if (res.ok) {
        setAccounts(prev => prev.map(a => a.id === uid ? { ...a, virtualSessionLink: newLink, virtualSessionTime: newTime } : a));
        setLinkSaveResult({ ok: true });
        setIsEditingLink(false);
        setTimeout(() => setLinkSaveResult(null), 3000);
      } else {
        setLinkSaveResult({ ok: false });
        setTimeout(() => setLinkSaveResult(null), 3000);
      }
    } catch (e) {
      alert("Error saving link");
    } finally {
      setSavingLink(false);
    }
  }

  function promptEndSession(uid: string) {
    setConfirmEndModal(uid);
  }

  async function executeEndSession(uid: string) {
    setConfirmEndModal(null);
    setEndingSession(true);
    try {
      const res = await fetch("/api/parents/end-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      if (res.ok) {
        setAccounts(prev => prev.map(a => {
          if (a.id === uid) {
            return {
              ...a,
              virtualSessionLink: null,
              virtualSessionTime: null,
              needsSessionPayment: true
            };
          }
          return a;
        }));
        setLinkSaveResult({ ok: true, isEnd: true });
        setTimeout(() => setLinkSaveResult(null), 3000);
      } else {
        setLinkSaveResult({ ok: false, isEnd: true });
        setTimeout(() => setLinkSaveResult(null), 3000);
      }
    } catch (e) {
      alert("Error ending session");
    } finally {
      setEndingSession(false);
    }
  }

  async function handleAddMaterial(uid: string) {
    if (!materialTitle || !materialUrl) return alert("Title and URL required");
    try {
      const res = await fetch("/api/parents/study-materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, title: materialTitle, url: materialUrl, type: materialType }),
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(prev => prev.map(a => a.id === uid ? { ...a, studyMaterials: data.studyMaterials } : a));
        setIsAddingMaterial(false);
        setMaterialTitle("");
        setMaterialUrl("");
      } else {
        alert("Failed to add material");
      }
    } catch (e) {
      alert("Error adding material");
    }
  }

  async function handleDeleteMaterial(uid: string, materialId: string) {
    if (!confirm("Remove this material?")) return;
    try {
      const res = await fetch("/api/parents/study-materials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, materialId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(prev => prev.map(a => a.id === uid ? { ...a, studyMaterials: data.studyMaterials } : a));
      }
    } catch (e) {
      alert("Error deleting material");
    }
  }

  function openManageModal(acc: any) {
    setManageModal(acc);
    setNewLink(acc.virtualSessionLink || "");
    setNewTime(acc.virtualSessionTime || "");
    setIsEditingLink(false);
    setIsAddingMaterial(false);
    setLinkSaveResult(null);
  }

  return (
    <AppShell title="Virtual Sessions">
      <style>{`
        .row-hover { transition: background 0.15s; cursor: pointer; }
        .row-hover:hover { background: #f8faff !important; }
        .filter-pill { transition: all 0.15s; cursor: pointer; }
        .filter-pill:hover { transform: translateY(-1px); }
      `}</style>

      {/* ── Stats Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total Students",  value: stats.total,    icon: "👥", color: "#0050d5", bg: "linear-gradient(135deg,#eff6ff,#dbeafe)" },
          { label: "Needs Link",      value: stats.noLink,   icon: "⚠️", color: "#b45309", bg: "linear-gradient(135deg,#fffbeb,#fef3c7)" },
          { label: "Total Materials", value: stats.totalMaterials, icon: "📁", color: "#15803d", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
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
            placeholder="Search student or parent..."
            style={{ width: "100%", paddingLeft: "36px", paddingRight: "12px", paddingTop: "10px", paddingBottom: "10px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", fontWeight: "500", color: "#334155", outline: "none", background: "#f8faff", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {FILTERS.map(f => {
            const active = activeFilter === f.id;
            const bgMap: Record<string, string> = { "no-link": "#fffbeb", "has-link": "#f0fdf4" };
            const colorMap: Record<string, string> = { "no-link": "#b45309", "has-link": "#15803d" };
            return (
              <button key={f.id} className="filter-pill" onClick={() => setActiveFilter(f.id)} style={{ padding: "8px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: active ? "none" : "1.5px solid #e2e8f0", background: active ? (bgMap[f.id] || "#eff6ff") : "white", color: active ? (colorMap[f.id] || "#0050d5") : "#64748b", boxShadow: active ? "0 2px 8px rgba(0,0,0,0.08)" : "none" }}>
                {f.label}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: "auto", fontSize: "12px", fontWeight: "600", color: "#94a3b8", flexShrink: 0 }}>
          {loading ? "Loading…" : `${filtered.length} of ${accounts.length} students`}
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", color: "#94a3b8", fontSize: "15px", fontWeight: "600", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          <div>Loading students…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", border: "2px dashed #e2e8f0" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🖥️</div>
          <div style={{ fontWeight: "800", color: "#002f76", fontSize: "18px", marginBottom: "6px" }}>No virtual students found</div>
          <div style={{ color: "#94a3b8", fontSize: "14px" }}>Try adjusting your search or filter.</div>
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,47,118,0.06)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.5fr 1fr 1.2fr 100px", padding: "12px 24px", background: "#f8faff", borderBottom: "1px solid #e8efff" }}>
            {["Student / Parent", "Virtual Link", "Materials", "Latest Payment", "Actions"].map((h, i) => (
              <div key={i} style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", textAlign: h === "Actions" ? "right" : "left" }}>{h}</div>
            ))}
          </div>

          {filtered.map((acc, idx) => {
            const avatarGrad = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const latestPayment = (acc.sessionPayments || [])[0];

            return (
              <m.div
                key={acc.id}
                className="row-hover"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.025 }}
                onClick={() => openManageModal(acc)}
                style={{ display: "grid", gridTemplateColumns: "1.8fr 1.5fr 1fr 1.2fr 100px", padding: "15px 24px", borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", background: "white" }}
              >
                {/* Parent/Child col */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: avatarGrad, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "13px", fontWeight: "800", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                    {getInitials(acc.childName || acc.fullName || acc.email)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: "800", fontSize: "14px", color: "#002f76", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {acc.childName || acc.fullName || acc.email}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {acc.childName ? `Parent: ${acc.fullName || acc.email}` : "Virtual Tutorial"}
                    </div>
                  </div>
                </div>

                {/* Link col */}
                <div style={{ minWidth: 0, paddingRight: "16px" }}>
                  {acc.virtualSessionLink ? (
                    <>
                      <a href={acc.virtualSessionLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display: "inline-block", fontSize: "12px", fontWeight: "700", color: "#0050d5", background: "#eff6ff", padding: "4px 10px", borderRadius: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                        🔗 {acc.virtualSessionLink}
                      </a>
                      {acc.virtualSessionTime && (
                        <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", marginTop: "4px" }}>
                          🕒 {formatSessionTime(acc.virtualSessionTime)}
                        </div>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#b45309", background: "#fffbeb", padding: "4px 10px", borderRadius: "12px" }}>
                      ⚠️ No Link Set
                    </span>
                  )}
                </div>

                {/* Materials col */}
                <div>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#334155" }}>
                    📁 {(acc.studyMaterials || []).length} items
                  </span>
                </div>

                {/* Payment col */}
                <div>
                  {latestPayment ? (
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", background: latestPayment.verified ? "#f0fdf4" : latestPayment.rejected ? "#fef2f2" : "#fffbeb", color: latestPayment.verified ? "#15803d" : latestPayment.rejected ? "#b91c1c" : "#b45309", borderRadius: "20px", fontSize: "11px", fontWeight: "800" }}>
                      {latestPayment.verified ? "VERIFIED" : latestPayment.rejected ? "REJECTED" : "PENDING"} (₱{latestPayment.amountPaid})
                    </span>
                  ) : (
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>None</span>
                  )}
                </div>

                {/* Actions col */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={(e) => { e.stopPropagation(); openManageModal(acc); }} style={{ padding: "6px 14px", borderRadius: "8px", background: "#f1f5f9", color: "#334155", fontSize: "12px", fontWeight: "700", border: "none", cursor: "pointer", transition: "background 0.2s" }} className="hover:bg-[#e2e8f0]">
                    Manage
                  </button>
                </div>
              </m.div>
            );
          })}
        </div>
      )}

      {/* ── Manage Modal ── */}
      <AnimatePresence>
        {manageModal && (
          <div onClick={() => setManageModal(null)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,18,51,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyItems: "center", padding: "16px", overflowY: "auto" }}>
            <m.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()} 
              style={{ background: "white", borderRadius: "24px", width: "100%", maxWidth: "600px", margin: "auto", boxShadow: "0 20px 40px rgba(0,47,118,0.15)", overflow: "hidden" }}
            >
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8faff" }}>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#002f76", margin: 0 }}>
                    Manage Virtual Session
                  </h2>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", fontWeight: "600" }}>
                    {manageModal.childName || manageModal.fullName || manageModal.email}
                  </div>
                </div>
                <button onClick={() => setManageModal(null)} style={{ width: "32px", height: "32px", borderRadius: "50%", background: "white", border: "1px solid #e2e8f0", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: "bold" }}>✕</button>
              </div>

              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Link Section */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "800", color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px" }}>🔗 Meeting Link & Time</div>
                    {!isEditingLink && (
                      <button onClick={() => setIsEditingLink(true)} style={{ fontSize: "12px", fontWeight: "700", color: "#0050d5", background: "#eff6ff", border: "none", padding: "4px 12px", borderRadius: "8px", cursor: "pointer" }}>Edit Details</button>
                    )}
                  </div>
                  
                  {isEditingLink ? (
                    <div style={{ background: "#f8faff", padding: "16px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>Virtual Class Link</label>
                      <input 
                        value={newLink}
                        onChange={e => setNewLink(e.target.value)}
                        placeholder="https://zoom.us/j/..."
                        style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "13px", outline: "none", marginBottom: "12px", boxSizing: "border-box" }}
                      />
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>Session Time (Optional)</label>
                      <input 
                        type="datetime-local"
                        value={newTime}
                        onChange={e => setNewTime(e.target.value)}
                        style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "13px", outline: "none", marginBottom: "12px", boxSizing: "border-box" }}
                      />
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "16px", cursor: "pointer" }}>
                        <input type="checkbox" checked={sendEmailOnSave} onChange={e => setSendEmailOnSave(e.target.checked)} style={{ width: "16px", height: "16px", accentColor: "#0050d5" }} />
                        Email parent that their session is ready
                      </label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => handleSaveLink(manageModal.id)} disabled={savingLink} style={{ flex: 1, padding: "10px", background: "#10b981", color: "white", border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "13px", cursor: savingLink ? "not-allowed" : "pointer" }}>
                          {savingLink ? "Saving..." : "Save Details"}
                        </button>
                        <button onClick={() => setIsEditingLink(false)} style={{ flex: 1, padding: "10px", background: "#e2e8f0", color: "#475569", border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: "#f8faff", padding: "16px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                      {manageModal.virtualSessionLink ? (
                        <>
                          <div style={{ marginBottom: manageModal.virtualSessionTime ? "8px" : "0" }}>
                            <a href={manageModal.virtualSessionLink} target="_blank" rel="noreferrer" style={{ fontSize: "14px", fontWeight: "700", color: "#0050d5", textDecoration: "underline", wordBreak: "break-all" }}>
                              {manageModal.virtualSessionLink}
                            </a>
                          </div>
                          {manageModal.virtualSessionTime && (
                            <div style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>
                              🕒 Time: <span style={{ color: "#334155" }}>{formatSessionTime(manageModal.virtualSessionTime)}</span>
                            </div>
                          )}
                          <div style={{ marginTop: "16px" }}>
                            <button onClick={() => promptEndSession(manageModal.id)} disabled={endingSession} style={{ padding: "8px 16px", background: "#fef2f2", color: "#ef4444", border: "1px solid #fca5a5", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: endingSession ? "not-allowed" : "pointer", opacity: endingSession ? 0.7 : 1 }}>
                              {endingSession ? "Ending..." : "🛑 End Session & Request Payment"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: "14px", color: "#94a3b8", fontWeight: "500", fontStyle: "italic" }}>No meeting link has been set yet.</div>
                      )}
                      {linkSaveResult && (
                        <div style={{ marginTop: "12px", fontSize: "12px", fontWeight: "700", color: linkSaveResult.ok ? "#15803d" : "#b91c1c" }}>
                          {linkSaveResult.ok ? (linkSaveResult.isEnd ? "✅ Session ended and payment requested!" : "✅ Details successfully saved" + (sendEmailOnSave ? " and email sent!" : "!")) : (linkSaveResult.isEnd ? "❌ Failed to end session" : "❌ Failed to save details")}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Study Folder Section */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "800", color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px" }}>📁 Study Folder</div>
                    {!isAddingMaterial && (
                      <button onClick={() => setIsAddingMaterial(true)} style={{ fontSize: "12px", fontWeight: "700", color: "white", background: "#002f76", border: "none", padding: "4px 12px", borderRadius: "8px", cursor: "pointer" }}>+ Add Material</button>
                    )}
                  </div>

                  {isAddingMaterial && (
                    <div style={{ background: "#f8faff", padding: "16px", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                        <button onClick={() => setMaterialType("link")} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: materialType === "link" ? "none" : "1px solid #cbd5e1", background: materialType === "link" ? "#eff6ff" : "white", color: materialType === "link" ? "#0050d5" : "#64748b", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>▶️ YouTube/Link</button>
                        <button onClick={() => setMaterialType("file")} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: materialType === "file" ? "none" : "1px solid #cbd5e1", background: materialType === "file" ? "#eff6ff" : "white", color: materialType === "file" ? "#0050d5" : "#64748b", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>📄 File URL</button>
                      </div>
                      <input value={materialTitle} onChange={e => setMaterialTitle(e.target.value)} placeholder="Material Title..." style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "13px", outline: "none", marginBottom: "8px", boxSizing: "border-box" }} />
                      <input value={materialUrl} onChange={e => setMaterialUrl(e.target.value)} placeholder="https://..." style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "13px", outline: "none", marginBottom: "12px", boxSizing: "border-box" }} />
                      
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => handleAddMaterial(manageModal.id)} style={{ flex: 1, padding: "10px", background: "#10b981", color: "white", border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>Add to Folder</button>
                        <button onClick={() => setIsAddingMaterial(false)} style={{ flex: 1, padding: "10px", background: "#e2e8f0", color: "#475569", border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {(!manageModal.studyMaterials || manageModal.studyMaterials.length === 0) && !isAddingMaterial && (
                      <div style={{ textAlign: "center", padding: "24px", background: "#f8faff", borderRadius: "16px", border: "1px dashed #cbd5e1", color: "#94a3b8", fontSize: "13px", fontWeight: "600" }}>
                        Folder is empty. Add videos or files here.
                      </div>
                    )}
                    {(manageModal.studyMaterials || []).map((m: any) => (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                        <a href={m.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", overflow: "hidden" }}>
                          <span style={{ fontSize: "20px" }}>{m.type === "link" ? "▶️" : "📄"}</span>
                          <div style={{ overflow: "hidden" }}>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#002f76", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                            <div style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.url}</div>
                          </div>
                        </a>
                        <button onClick={() => handleDeleteMaterial(manageModal.id, m.id)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px", marginLeft: "12px", fontSize: "16px" }} title="Remove">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
      {/* ── Confirm End Session Modal ── */}
      <AnimatePresence>
        {confirmEndModal && (
          <div onClick={() => setConfirmEndModal(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,18,51,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyItems: "center", padding: "16px" }}>
            <m.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              onClick={e => e.stopPropagation()} 
              style={{ background: "white", borderRadius: "24px", width: "100%", maxWidth: "420px", margin: "auto", boxShadow: "0 20px 40px rgba(0,47,118,0.2)", overflow: "hidden", textAlign: "center", padding: "32px 24px" }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛑</div>
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "0 0 12px" }}>End Virtual Session?</h2>
              <p style={{ color: "#475569", fontSize: "14px", lineHeight: "1.6", margin: "0 0 24px" }}>
                This will instantly clear the student's meeting link and trigger a <strong>₱450 payment prompt</strong> in their Parent Portal for their next session.
              </p>
              <div style={{ display: "flex", gap: "12px" }}>
                <button 
                  onClick={() => executeEndSession(confirmEndModal)}
                  style={{ flex: 1, padding: "12px", background: "#ef4444", color: "white", border: "none", borderRadius: "12px", fontWeight: "800", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(239,68,68,0.3)" }}
                >
                  Yes, End Session
                </button>
                <button 
                  onClick={() => setConfirmEndModal(null)}
                  style={{ flex: 1, padding: "12px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "12px", fontWeight: "800", fontSize: "14px", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>

    </AppShell>
  );
}
