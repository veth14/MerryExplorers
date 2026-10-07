"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      timeZone: "Asia/Manila",
    }) + " PHT";
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

type FileViewerState = {
  title: string;
  url: string;
  contentType: string;
  uid: string;
  materialId: string;
  fileKey?: string;
  submission?: {
    key: string;
    fileName: string;
    fileType: string;
    submittedAt: string;
  };
};

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

  const isPdf = contentType === "application/pdf" || contentType.includes("pdf") || lowerTitle.endsWith(".pdf") || lowerKey.endsWith(".pdf");
  const isOffice =
    contentType.includes("spreadsheet") || contentType.includes("presentation") || contentType.includes("wordprocessing") ||
    contentType === "application/msword" || contentType === "application/vnd.ms-excel" || contentType === "application/vnd.ms-powerpoint" ||
    lowerTitle.endsWith(".xlsx") || lowerTitle.endsWith(".xls") || lowerTitle.endsWith(".docx") || lowerTitle.endsWith(".doc") ||
    lowerTitle.endsWith(".pptx") || lowerTitle.endsWith(".ppt") || lowerKey.endsWith(".xlsx") || lowerKey.endsWith(".xls") ||
    lowerKey.endsWith(".docx") || lowerKey.endsWith(".doc") || lowerKey.endsWith(".pptx") || lowerKey.endsWith(".ppt");

  const [isLandscape, setIsLandscape] = useState(false);

  function getFileInfo() {
    if (isImage) return { icon: "🖼️", label: "Image" };
    if (isPdf) return { icon: "📕", label: "PDF" };
    if (lowerTitle.endsWith(".mp4") || lowerTitle.endsWith(".mov")) return { icon: "🎬", label: "Video" };
    if (lowerTitle.endsWith(".doc") || lowerTitle.endsWith(".docx")) return { icon: "📝", label: "Document" };
    if (lowerTitle.endsWith(".ppt") || lowerTitle.endsWith(".pptx")) return { icon: "📊", label: "Slides" };
    if (lowerTitle.endsWith(".xls") || lowerTitle.endsWith(".xlsx")) return { icon: "📈", label: "Spreadsheet" };
    return { icon: "📄", label: "File" };
  }

  const { icon, label } = getFileInfo();

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cardWidth = isLandscape ? "min(98vw, 1400px)" : "min(92vw, 820px)";
  const cardHeight = isLandscape ? "96vh" : "min(92vh, 960px)";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "linear-gradient(160deg,#1a6bbf 0%,#2d8fd4 40%,#5bc8f5 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: isLandscape ? "8px" : "16px",
        overflow: "hidden",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: cardWidth, height: cardHeight,
          display: "flex", flexDirection: "column",
          borderRadius: isLandscape ? "20px" : "28px",
          overflow: "hidden", boxShadow: "0 0 0 4px #FFD700, 0 20px 60px rgba(0,0,0,0.4)",
          background: "white", transition: "width 0.3s ease, height 0.3s ease, border-radius 0.3s ease",
        }}
      >
        <div style={{ flexShrink: 0, background: "linear-gradient(135deg,#0050d5 0%,#1a7fde 50%,#38b6ff 100%)", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "4px solid #FFD700" }}>
          <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "linear-gradient(135deg,#FFD700,#FFB300)", border: "3px solid white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", flexShrink: 0, boxShadow: "0 3px 10px rgba(0,0,0,0.2)" }}>
            {icon}
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontWeight: "900", fontSize: "15px", color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
              <span style={{ fontSize: "10px", fontWeight: "800", color: "#001a4d", background: "#FFD700", padding: "2px 9px", borderRadius: "20px" }}>{label}</span>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)" }}>Esc to close</span>
            </div>
          </div>
          <button
            onClick={() => setIsLandscape(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 14px", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: "50px", color: "white", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}
          >
            {isLandscape ? "Portrait" : "Landscape"}
          </button>
          
          {/* Open in New Tab */}
          <button
            onClick={() => window.open(url, "_blank")}
            style={{
              display:"flex", alignItems:"center", gap:"6px",
              padding:"8px 14px",
              background:"linear-gradient(135deg,#FFD700,#FFB300)",
              border:"1.5px solid white",
              borderRadius:"50px",
              color:"#002f76", fontWeight:"800", fontSize:"12px",
              cursor:"pointer", flexShrink:0,
              boxShadow:"0 3px 10px rgba(0,0,0,0.2)",
            }}
            title="Open in new tab"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Open File
          </button>

          <button
            onClick={onClose}
            style={{ width: "38px", height: "38px", borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.45)", color: "white", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}
          >✕</button>
        </div>
        <div style={{ flex: 1, overflow: "hidden", position: "relative", background: isOffice ? "linear-gradient(135deg,#f0f9ff,#e0f2fe)" : isPdf ? "#525659" : "linear-gradient(135deg,#f0f8ff,#e8f4ff)" }}>
          {isImage && (
            <div style={{ width: "100%", height: "100%", overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
              <img src={url} alt={title} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "16px", boxShadow: "0 8px 32px rgba(0,0,0,0.2), 0 0 0 3px #FFD700" }} />
            </div>
          )}
          {!isImage && isPdf && (
            <iframe key={`${url}-${isLandscape}`} src={url} style={{ width: "100%", height: "100%", border: "none", display: "block" }} title={title} />
          )}
          {!isImage && !isPdf && isOffice && (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
              <div style={{ textAlign: "center", maxWidth: "380px" }}>
                <div style={{ fontSize: "80px", lineHeight: 1, marginBottom: "16px" }}>{icon}</div>
                <h3 style={{ margin: "0 0 8px", fontSize: "20px", color: "#002f76", fontWeight: "800" }}>{title}</h3>
                <p style={{ color: "#64748b", fontSize: "14px", lineHeight: 1.5, marginBottom: "24px" }}>This file type requires an external app to view. Click download below to save it to your device.</p>
                <a href={url} download style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 24px", background: "#0050d5", color: "white", textDecoration: "none", borderRadius: "12px", fontWeight: "800" }}>⬇ Download to View</a>
              </div>
            </div>
          )}
          {!isImage && !isPdf && !isOffice && (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "80px", marginBottom: "16px" }}>{icon}</div>
                <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "#002f76" }}>Preview not available</h3>
                <a href={url} download style={{ color: "#0050d5", fontWeight: "bold" }}>Download file instead</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminVirtualSessionsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  
  const [fileViewer, setFileViewer] = useState<FileViewerState | null>(null);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [manageModal, setManageModal] = useState<any | null>(null);
  const [confirmEndModal, setConfirmEndModal] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string; type?: "error"|"success"|"warning" } | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ uid: string; materialId: string; title: string } | null>(null);

  function showAlert(message: string, title = "Notice", type: "error"|"success"|"warning" = "error") {
    setAlertModal({ title, message, type });
  }

  // Link and Time state
  const [newLink, setNewLink] = useState("");
  const [newTime, setNewTime] = useState("");
  const [sendEmailOnSave, setSendEmailOnSave] = useState(true);
  const [savingLink, setSavingLink] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [linkSaveResult, setLinkSaveResult] = useState<{ ok: boolean, isEnd?: boolean } | null>(null);
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [refreshingModal, setRefreshingModal] = useState(false);

  // Material state
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [materialType, setMaterialType] = useState<"link"|"file">("link");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedKey, setUploadedKey] = useState(""); // B2 key for file-type materials
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // datetime-local gives "2026-10-05T18:45" with no timezone.
      // Append "+08:00" so it's treated as Philippine Standard Time,
      // not UTC (which would shift it 8 hours forward in the email).
      const phtTime = newTime ? `${newTime}:00+08:00` : "";
      const res = await fetch("/api/parents/virtual-link", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, virtualSessionLink: newLink, virtualSessionTime: phtTime, sendEmail: sendEmailOnSave }),
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
      showAlert("Failed to end session. Please try again.", "Error", "error");
    } finally {
      setEndingSession(false);
    }
  }

  async function handleAddMaterial(uid: string) {
    if (!materialTitle) return showAlert("Please provide a title.", "Missing Fields", "warning");
    if (materialType === "link" && !materialUrl) return showAlert("Please provide a URL.", "Missing Fields", "warning");
    if (materialType === "file" && !uploadedKey) return showAlert("Please upload a file first.", "Missing Fields", "warning");
    try {
      const body: Record<string, any> = { uid, title: materialTitle, type: materialType };
      if (materialType === "link") body.url = materialUrl;
      else body.key = uploadedKey;

      const res = await fetch("/api/parents/study-materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(prev => prev.map(a => a.id === uid ? { ...a, studyMaterials: data.studyMaterials } : a));
        setManageModal((prev: any) => prev ? { ...prev, studyMaterials: data.studyMaterials } : prev);
        setIsAddingMaterial(false);
        setMaterialTitle("");
        setMaterialUrl("");
        setUploadedKey("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        showAlert("Failed to add material. Please try again.", "Error", "error");
      }
    } catch (e) {
      showAlert("An unexpected error occurred while adding the material.", "Error", "error");
    }
  }

  async function handleDeleteMaterial(uid: string, materialId: string) {
    const mat = manageModal?.studyMaterials?.find((m: any) => m.id === materialId);
    setConfirmDeleteModal({ uid, materialId, title: mat?.title || "this material" });
  }

  async function executeDeleteMaterial(uid: string, materialId: string) {
    setConfirmDeleteModal(null);
    try {
      const res = await fetch("/api/parents/study-materials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, materialId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(prev => prev.map(a => a.id === uid ? { ...a, studyMaterials: data.studyMaterials } : a));
        setManageModal((prev: any) => prev ? { ...prev, studyMaterials: data.studyMaterials } : prev);
      }
    } catch (e) {
      showAlert("Failed to delete material. Please try again.", "Error", "error");
    }
  }

  async function handleFileUpload(file: File) {
    setUploadingFile(true);
    setUploadedKey("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "study-materials");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.success) {
        setUploadedKey(data.key);                          // Store B2 key, NOT a URL
        setMaterialUrl(data.key);                          // Show in the "uploaded" confirmation UI
        if (!materialTitle) setMaterialTitle(file.name.replace(/\.[^.]+$/, ""));
      } else {
        showAlert("Upload failed: " + (data.error || "Unknown error"), "Upload Failed", "error");
      }
    } catch (e) {
      showAlert("An error occurred during upload. Please try again.", "Upload Error", "error");
    } finally {
      setUploadingFile(false);
    }
  }

  async function openMaterial(uid: string, m: any) {
    // For link-type (YouTube, etc.) open directly
    if (m.type === "link" || m.url) {
      let url = m.url;
      if (url && !/^https?:\/\//i.test(url)) {
        url = "https://" + url;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (loadingFileId === m.id) return;
    setLoadingFileId(m.id);
    // For file-type stored in B2, get a short-lived presigned URL
    try {
      const res = await fetch(`/api/files/download-url?uid=${encodeURIComponent(uid)}&materialId=${encodeURIComponent(m.id)}`);
      const data = await res.json();
      if (data.success && data.url) {
        setFileViewer({
          title: m.title || "File",
          url: data.url,
          contentType: m.contentType || "application/octet-stream",
          uid,
          materialId: m.id,
          fileKey: m.key,
          submission: m.submission,
        });
      } else {
        showAlert(data.error || "Could not open file.", "Error", "error");
      }
    } catch {
      showAlert("Network error. Please try again.", "Error", "error");
    } finally {
      setLoadingFileId(null);
    }
  }

  async function openManageModal(acc: any) {
    // Show modal immediately with cached data, then refresh in background
    setManageModal(acc);
    setNewLink(acc.virtualSessionLink || "");
    setNewTime(acc.virtualSessionTime || "");
    setIsEditingLink(false);
    setIsAddingMaterial(false);
    setLinkSaveResult(null);
    // Fetch fresh data to ensure submissions are up to date
    refreshModalData(acc.id);
  }

  async function refreshModalData(uid: string) {
    setRefreshingModal(true);
    try {
      const res = await fetch(`/api/parents?uid=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const fresh = await res.json();
        const formatted = { ...fresh, id: fresh.id || uid };
        setManageModal(formatted);
        setAccounts(prev => prev.map(a => a.id === uid ? formatted : a));
      }
    } catch {
      // Silently fail — cached data is still shown
    } finally {
      setRefreshingModal(false);
    }
  }

  return (
    <AppShell title="Virtual Sessions">
      <AnimatePresence>
        {fileViewer && <FileViewerModal viewer={fileViewer} onClose={() => setFileViewer(null)} />}
      </AnimatePresence>
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
        {manageModal && (() => {
          const matLinks = (manageModal.studyMaterials || []).filter((m: any) => m.type === "link");
          const matFiles = (manageModal.studyMaterials || []).filter((m: any) => m.type === "file");

          return (
            <div onClick={() => setManageModal(null)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,18,51,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px", overflowY: "auto" }}>
              <m.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                onClick={e => e.stopPropagation()}
                style={{ background: "white", borderRadius: "28px", width: "100%", maxWidth: "880px", margin: "auto", boxShadow: "0 32px 80px rgba(0,47,118,0.2)", overflow: "hidden" }}
              >
                {/* ── Header ── */}
                <div style={{ padding: "22px 28px", borderBottom: "2px solid #eef2ff", background: "linear-gradient(135deg,#002f76 0%,#0050d5 100%)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", border: "2px solid rgba(255,255,255,0.4)" }}>🖥️</div>
                    <div>
                      <h2 style={{ fontSize: "18px", fontWeight: "900", color: "white", margin: 0, letterSpacing: "-0.3px" }}>
                        {manageModal.childName || manageModal.fullName || manageModal.email}
                      </h2>
                      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", marginTop: "2px", fontWeight: "600" }}>
                        Virtual Session Workspace
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      onClick={() => refreshModalData(manageModal.id)}
                      disabled={refreshingModal}
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", color: "white", fontWeight: "700", fontSize: "12px", cursor: refreshingModal ? "not-allowed" : "pointer", transition: "all 0.2s" }}
                    >
                      <svg style={{ animation: refreshingModal ? "me-spin 0.7s linear infinite" : "none" }} xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                      </svg>
                      {refreshingModal ? "Refreshing…" : "Refresh"}
                    </button>
                    <button onClick={() => setManageModal(null)} style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}>✕</button>
                  </div>
                </div>

                {/* ── Two-column Body ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>

                  {/* LEFT: Meeting Link Panel */}
                  <div style={{ padding: "24px 28px", borderRight: "1.5px solid #eef2ff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                      <span style={{ width: "28px", height: "28px", background: "#eff6ff", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>🔗</span>
                      <span style={{ fontSize: "12px", fontWeight: "800", color: "#334155", textTransform: "uppercase", letterSpacing: "0.8px" }}>Meeting Link & Time</span>
                    </div>

                    {isEditingLink ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Virtual Class Link</label>
                          <input
                            value={newLink}
                            onChange={e => setNewLink(e.target.value)}
                            placeholder="https://zoom.us/j/... or Google Meet"
                            style={{ width: "100%", padding: "10px 14px", borderRadius: "12px", border: "2px solid #bfdbfe", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border 0.2s" }}
                            onFocus={e => (e.target.style.borderColor = "#0050d5")}
                            onBlur={e => (e.target.style.borderColor = "#bfdbfe")}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Session Time (Optional)</label>
                          <input
                            type="datetime-local"
                            value={newTime}
                            onChange={e => setNewTime(e.target.value)}
                            style={{ width: "100%", padding: "10px 14px", borderRadius: "12px", border: "2px solid #bfdbfe", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                          />
                        </div>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "600", color: "#475569", cursor: "pointer", padding: "10px 14px", background: "#f8faff", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                          <input type="checkbox" checked={sendEmailOnSave} onChange={e => setSendEmailOnSave(e.target.checked)} style={{ width: "16px", height: "16px", accentColor: "#0050d5" }} />
                          Email parent when session is ready
                        </label>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => handleSaveLink(manageModal.id)} disabled={savingLink} style={{ flex: 1, padding: "10px", background: savingLink ? "#94a3b8" : "#10b981", color: "white", border: "none", borderRadius: "12px", fontWeight: "800", fontSize: "13px", cursor: savingLink ? "not-allowed" : "pointer" }}>
                            {savingLink ? "Saving…" : "✓ Save"}
                          </button>
                          <button onClick={() => setIsEditingLink(false)} style={{ flex: 1, padding: "10px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "12px", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {manageModal.virtualSessionLink ? (
                          <div style={{ background: "#eff6ff", borderRadius: "16px", padding: "16px", border: "1.5px solid #bfdbfe", marginBottom: "12px" }}>
                            <a href={manageModal.virtualSessionLink} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#0050d5", textDecoration: "none", wordBreak: "break-all", marginBottom: "6px" }}>
                              🔗 {manageModal.virtualSessionLink}
                            </a>
                            {manageModal.virtualSessionTime && (
                              <div style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                                🕒 {formatSessionTime(manageModal.virtualSessionTime)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ padding: "24px 16px", background: "#fffbeb", borderRadius: "16px", border: "2px dashed #fde68a", textAlign: "center", marginBottom: "12px" }}>
                            <div style={{ fontSize: "28px", marginBottom: "6px" }}>⚠️</div>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#92400e" }}>No meeting link set yet</div>
                            <div style={{ fontSize: "11px", color: "#a16207", marginTop: "3px" }}>Click Edit to add a link for this student</div>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => setIsEditingLink(true)} style={{ flex: 1, padding: "9px 14px", background: "#eff6ff", color: "#0050d5", border: "1.5px solid #bfdbfe", borderRadius: "12px", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>
                            ✏️ Edit Details
                          </button>
                          {manageModal.virtualSessionLink && (
                            <button onClick={() => promptEndSession(manageModal.id)} disabled={endingSession} style={{ flex: 1, padding: "9px 14px", background: "#fef2f2", color: "#ef4444", border: "1px solid #fca5a5", borderRadius: "12px", fontWeight: "700", fontSize: "12px", cursor: endingSession ? "not-allowed" : "pointer" }}>
                              {endingSession ? "Ending…" : "🛑 End Session"}
                            </button>
                          )}
                        </div>
                        {linkSaveResult && (
                          <div style={{ marginTop: "10px", fontSize: "12px", fontWeight: "700", color: linkSaveResult.ok ? "#15803d" : "#b91c1c", padding: "8px 12px", background: linkSaveResult.ok ? "#f0fdf4" : "#fef2f2", borderRadius: "10px" }}>
                            {linkSaveResult.ok ? (linkSaveResult.isEnd ? "✅ Session ended and payment requested!" : "✅ Saved!" + (sendEmailOnSave ? " Email sent!" : "")) : (linkSaveResult.isEnd ? "❌ Failed to end session" : "❌ Failed to save")}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick-add link section */}
                    {!isEditingLink && !isAddingMaterial && (
                      <div style={{ marginTop: "24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                          <span style={{ width: "28px", height: "28px", background: "#fef3c7", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>▶️</span>
                          <span style={{ fontSize: "12px", fontWeight: "800", color: "#334155", textTransform: "uppercase", letterSpacing: "0.8px" }}>Quick Send Link</span>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input
                            placeholder="Paste YouTube, Google Drive, or any URL…"
                            id="quick-link-input"
                            style={{ flex: 1, padding: "10px 14px", borderRadius: "12px", border: "2px solid #e2e8f0", fontSize: "12px", outline: "none", fontFamily: "inherit" }}
                            onFocus={e => (e.target.style.borderColor = "#0050d5")}
                            onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
                          />
                          <button
                            onClick={() => {
                              const input = document.getElementById("quick-link-input") as HTMLInputElement;
                              const url = input?.value?.trim();
                              if (!url) return;
                              setMaterialType("link");
                              setMaterialUrl(url);
                              setMaterialTitle(url.includes("youtube") ? "YouTube Video" : "Shared Link");
                              setIsAddingMaterial(true);
                            }}
                            style={{ padding: "10px 16px", background: "#0050d5", color: "white", border: "none", borderRadius: "12px", fontWeight: "800", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            Send →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Study Folder / Drop Zone */}
                  <div style={{ padding: "24px 28px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "28px", height: "28px", background: "#f0fdf4", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>📁</span>
                        <span style={{ fontSize: "12px", fontWeight: "800", color: "#334155", textTransform: "uppercase", letterSpacing: "0.8px" }}>Study Folder</span>
                        <span style={{ fontSize: "10px", fontWeight: "800", background: "#dbeafe", color: "#1d4ed8", padding: "2px 8px", borderRadius: "20px" }}>
                          {(manageModal.studyMaterials || []).length} items
                        </span>
                      </div>
                      {!isAddingMaterial && (
                        <button onClick={() => { setIsAddingMaterial(true); setMaterialType("file"); setMaterialUrl(""); setMaterialTitle(""); setUploadedKey(""); }}
                          style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 14px", background: "#002f76", color: "white", border: "none", borderRadius: "10px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
                          + Add
                        </button>
                      )}
                    </div>

                    {/* Drag & Drop Zone */}
                    {!isAddingMaterial && (
                      <div
                        onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.background = "#eff6ff"; (e.currentTarget as HTMLElement).style.borderColor = "#0050d5"; }}
                        onDragLeave={e => { (e.currentTarget as HTMLElement).style.background = "#f8faff"; (e.currentTarget as HTMLElement).style.borderColor = "#cbd5e1"; }}
                        onDrop={e => {
                          e.preventDefault();
                          (e.currentTarget as HTMLElement).style.background = "#f8faff";
                          (e.currentTarget as HTMLElement).style.borderColor = "#cbd5e1";
                          const file = e.dataTransfer.files?.[0];
                          if (file) {
                            setIsAddingMaterial(true);
                            setMaterialType("file");
                            setMaterialTitle(file.name.replace(/\.[^.]+$/, ""));
                            handleFileUpload(file);
                          }
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        style={{ padding: "28px 20px", borderRadius: "16px", border: "2.5px dashed #cbd5e1", background: "#f8faff", textAlign: "center", cursor: "pointer", transition: "all 0.2s", marginBottom: "16px" }}
                      >
                        <div style={{ fontSize: "32px", marginBottom: "8px" }}>📤</div>
                        <div style={{ fontSize: "13px", fontWeight: "800", color: "#334155", marginBottom: "4px" }}>Drag & drop files here</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600" }}>or click to browse · PDF, DOC, MP4, IMG, ZIP</div>
                        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.mp3,.png,.jpg,.jpeg,.gif,.zip" style={{ display: "none" }}
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setIsAddingMaterial(true);
                              setMaterialType("file");
                              setMaterialTitle(f.name.replace(/\.[^.]+$/, ""));
                              handleFileUpload(f);
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* Add Material Form */}
                    {isAddingMaterial && (
                      <div style={{ background: "#f8faff", padding: "16px", borderRadius: "16px", border: "2px solid #bfdbfe", marginBottom: "14px" }}>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                          {["link","file"].map(t => (
                            <button key={t} onClick={() => { setMaterialType(t as any); setMaterialUrl(""); setUploadedKey(""); if(fileInputRef.current) fileInputRef.current.value=""; }}
                              style={{ flex: 1, padding: "8px", borderRadius: "10px", border: materialType === t ? "none" : "1.5px solid #cbd5e1", background: materialType === t ? "#eff6ff" : "white", color: materialType === t ? "#0050d5" : "#64748b", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>
                              {t === "link" ? "▶️ Link / YouTube" : "📄 Upload File"}
                            </button>
                          ))}
                        </div>
                        <input value={materialTitle} onChange={e => setMaterialTitle(e.target.value)} placeholder="Title…" style={{ width: "100%", padding: "9px 14px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "13px", outline: "none", marginBottom: "8px", boxSizing: "border-box", fontFamily: "inherit" }} />
                        {materialType === "link" ? (
                          <input value={materialUrl} onChange={e => setMaterialUrl(e.target.value)} placeholder="https://…" style={{ width: "100%", padding: "9px 14px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "13px", outline: "none", marginBottom: "10px", boxSizing: "border-box", fontFamily: "inherit" }} />
                        ) : (
                          <div style={{ marginBottom: "10px" }}>
                            {materialUrl ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#f0fdf4", borderRadius: "10px", border: "1.5px solid #86efac" }}>
                                <span style={{ fontSize: "18px" }}>✅</span>
                                <div style={{ flex: 1, overflow: "hidden" }}>
                                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#15803d" }}>Uploaded!</div>
                                  <div style={{ fontSize: "11px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{materialUrl}</div>
                                </div>
                                <button onClick={() => { setMaterialUrl(""); setUploadedKey(""); if(fileInputRef.current) fileInputRef.current.value=""; }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "16px" }}>✕</button>
                              </div>
                            ) : (
                              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                                style={{ width: "100%", padding: "18px", borderRadius: "10px", border: "2px dashed #cbd5e1", background: uploadingFile ? "#f8faff" : "white", color: uploadingFile ? "#64748b" : "#0050d5", fontWeight: "700", fontSize: "13px", cursor: uploadingFile ? "not-allowed" : "pointer", textAlign: "center" }}>
                                {uploadingFile ? "⏳ Uploading…" : "📤 Click or drop a file"}
                              </button>
                            )}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => handleAddMaterial(manageModal.id)} disabled={!materialTitle || (!materialUrl && !uploadedKey) || uploadingFile}
                            style={{ flex: 1, padding: "10px", background: (!materialTitle || (!materialUrl && !uploadedKey) || uploadingFile) ? "#cbd5e1" : "#002f76", color: "white", border: "none", borderRadius: "10px", fontWeight: "800", fontSize: "13px", cursor: (!materialTitle || (!materialUrl && !uploadedKey) || uploadingFile) ? "not-allowed" : "pointer" }}>
                            Add to Folder
                          </button>
                          <button onClick={() => { setIsAddingMaterial(false); setMaterialUrl(""); setMaterialTitle(""); setUploadedKey(""); if(fileInputRef.current) fileInputRef.current.value=""; }}
                            style={{ flex: 1, padding: "10px", background: "#e2e8f0", color: "#475569", border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Material cards */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
                      {(manageModal.studyMaterials || []).length === 0 && !isAddingMaterial ? (
                        <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "12px", fontWeight: "600" }}>
                          No materials yet. Drop files or paste a link above.
                        </div>
                      ) : (
                        <>
                          {matLinks.map((m: any) => (
                            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: "12px" }}>
                              <span style={{ fontSize: "18px", flexShrink: 0 }}>▶️</span>
                              <button onClick={() => openMaterial(manageModal.id, m)} style={{ flex: 1, background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: 0, overflow: "hidden" }}>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: "#92400e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                                <div style={{ fontSize: "11px", color: "#a16207", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.url}</div>
                              </button>
                              <button onClick={() => handleDeleteMaterial(manageModal.id, m.id)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "16px", flexShrink: 0 }} title="Remove">✕</button>
                            </div>
                          ))}
                          {matFiles.map((m: any) => (
                            <div key={m.id} style={{ border: "1.5px solid #bfdbfe", borderRadius: "12px", overflow: "hidden", background: "#eff6ff" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px" }}>
                                <span style={{ fontSize: "18px", flexShrink: 0 }}>📄</span>
                                <button onClick={() => openMaterial(manageModal.id, m)} style={{ flex: 1, background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: 0, overflow: "hidden" }}>
                                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e40af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                                  <div style={{ fontSize: "11px", color: "#64748b" }}>{loadingFileId === m.id ? "Opening…" : "Click to open"}</div>
                                </button>
                                <button onClick={() => handleDeleteMaterial(manageModal.id, m.id)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "16px", flexShrink: 0 }} title="Remove">✕</button>
                              </div>
                              {m.submission ? (
                                <div style={{ padding: "8px 14px", background: "#f0fdf4", borderTop: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontSize: "14px" }}>📬</span>
                                  <div style={{ flex: 1, overflow: "hidden" }}>
                                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#15803d" }}>Student Submitted</div>
                                    <div style={{ fontSize: "10px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.submission.fileName} · {new Date(m.submission.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (loadingFileId === m.id) return;
                                      setLoadingFileId(m.id);
                                      try {
                                        const res = await fetch(`/api/files/download-url?uid=${encodeURIComponent(manageModal.id)}&submissionKey=${encodeURIComponent(m.submission.key)}`);
                                        const data = await res.json();
                                        if (data.success && data.url) {
                                          setFileViewer({ title: m.submission.fileName, url: data.url, contentType: m.submission.fileType || "application/octet-stream", uid: manageModal.id, materialId: m.id, fileKey: m.submission.key });
                                        } else { alert("Could not fetch view link."); }
                                      } finally { setLoadingFileId(null); }
                                    }}
                                    style={{ padding: "4px 10px", borderRadius: "8px", background: "#10b981", color: "white", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: "700", flexShrink: 0 }}
                                  >⬇ View</button>
                                </div>
                              ) : (
                                <div style={{ padding: "6px 14px", background: "rgba(0,0,0,0.02)", borderTop: "1px solid #bfdbfe" }}>
                                  <span style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>No submission yet</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </m.div>
            </div>
          );
        })()}
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
                This will instantly clear the student's meeting link and trigger a <strong>session payment prompt</strong> in their Parent Portal for their next session.
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

      {/* ── Alert Modal ── */}
      <AnimatePresence>
        {alertModal && (
          <div onClick={() => setAlertModal(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,18,51,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <m.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "white", borderRadius: "24px", width: "100%", maxWidth: "400px", margin: "auto", boxShadow: "0 20px 40px rgba(0,47,118,0.2)", textAlign: "center", padding: "32px 24px" }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                {alertModal.type === "success" ? "✅" : alertModal.type === "warning" ? "⚠️" : "❌"}
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: "0 0 10px" }}>{alertModal.title}</h2>
              <p style={{ color: "#475569", fontSize: "14px", lineHeight: "1.6", margin: "0 0 24px" }}>{alertModal.message}</p>
              <button
                onClick={() => setAlertModal(null)}
                style={{ padding: "12px 32px", background: "linear-gradient(135deg,#002f76,#0050d5)", color: "white", border: "none", borderRadius: "12px", fontWeight: "800", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,47,118,0.3)" }}
              >
                Got it
              </button>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirm Delete Material Modal ── */}
      <AnimatePresence>
        {confirmDeleteModal && (
          <div onClick={() => setConfirmDeleteModal(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,18,51,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <m.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "white", borderRadius: "24px", width: "100%", maxWidth: "400px", margin: "auto", boxShadow: "0 20px 40px rgba(0,47,118,0.2)", textAlign: "center", padding: "32px 24px" }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🗑️</div>
              <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: "0 0 10px" }}>Remove Material?</h2>
              <p style={{ color: "#475569", fontSize: "14px", lineHeight: "1.6", margin: "0 0 24px" }}>
                Are you sure you want to remove <strong>"{confirmDeleteModal.title}"</strong> from the Study Folder? This cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => executeDeleteMaterial(confirmDeleteModal.uid, confirmDeleteModal.materialId)}
                  style={{ flex: 1, padding: "12px", background: "#ef4444", color: "white", border: "none", borderRadius: "12px", fontWeight: "800", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(239,68,68,0.3)" }}
                >
                  Yes, Remove
                </button>
                <button
                  onClick={() => setConfirmDeleteModal(null)}
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
