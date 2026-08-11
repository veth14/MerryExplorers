"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import EmojiPicker from "emoji-picker-react";

type InquiryStatus = "New" | "Read" | "Replied" | "Awaiting Reply" | "Closed";

type ThreadMessage = {
  from: "client" | "school";
  message: string;
  sentAt: string;
  gmailId?: string;
  manual?: boolean;
};

type Inquiry = {
  id: string;
  parentName: string;
  email: string;
  phone: string;
  childName: string;
  childAge: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  thread?: ThreadMessage[];
  /** Legacy — kept for backward compat with older records */
  replies?: { message: string; sentAt: string }[];
};

const STATUS_STYLES: Record<InquiryStatus, { bg: string; text: string; dot: string }> = {
  New:             { bg: "bg-[#fff8e1]", text: "text-[#a07000]", dot: "bg-[#ffb800]" },
  Read:            { bg: "bg-[#f0f5ff]", text: "text-[#005cc8]", dot: "bg-[#005cc8]" },
  Replied:         { bg: "bg-[#e8f9ef]", text: "text-[#1a7f4b]", dot: "bg-[#2da05b]" },
  "Awaiting Reply":{ bg: "bg-[#fff3e0]", text: "text-[#d97706]", dot: "bg-[#f59e0b]" },
  Closed:          { bg: "bg-[#f3f4f6]", text: "text-[#4b5563]", dot: "bg-[#9ca3af]" },
};

const ALL_STATUSES: InquiryStatus[] = ["New", "Read", "Replied", "Awaiting Reply", "Closed"];

function StatusBadge({ status }: { status: InquiryStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function MetricCard({
  label, value, borderColor, textColor, metaIcon, metaText, metaColor, svgDecoration
}: {
  label: string; value: number | string; borderColor: string; textColor: string;
  metaIcon: string; metaText: string; metaColor: string; svgDecoration: React.ReactNode;
}) {
  return (
    <article className={`relative overflow-hidden rounded-[1.25rem] bg-white px-5 pb-5 pt-5 border-b-[4px] ${borderColor} shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)]`}>
      <div className="absolute right-2 top-2 w-[72px] h-[54px] opacity-70 pointer-events-none">{svgDecoration}</div>
      <p className={`text-[11.5px] font-extrabold uppercase tracking-widest ${textColor}`}>{label}</p>
      <p className="font-headline text-[42px] font-extrabold leading-none tracking-tight text-[#002f76] mt-2">{value}</p>
      <p className={`mt-2.5 text-[13px] font-bold ${metaColor} flex items-center gap-1.5`}>
        <span>{metaIcon}</span> {metaText}
      </p>
    </article>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Build a unified, sorted thread from the new thread[] and legacy replies[] */
function buildThread(inquiry: Inquiry): ThreadMessage[] {
  const thread: ThreadMessage[] = [];

  // Initial client message always first
  thread.push({
    from: "client",
    message: inquiry.message,
    sentAt: inquiry.createdAt,
  });

  // Merge new thread[] entries
  if (inquiry.thread && inquiry.thread.length > 0) {
    thread.push(...inquiry.thread);
  } else if (inquiry.replies && inquiry.replies.length > 0) {
    // Legacy fallback
    thread.push(...inquiry.replies.map((r) => ({
      from: "school" as const,
      message: r.message,
      sentAt: r.sentAt,
    })));
  }

  // Sort chronologically
  thread.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  return thread;
}

export default function InquiriesPage() {
  const { user, userProfile } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [filterStatus, setFilterStatus] = useState<InquiryStatus | "All">("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Reply state
  const [isReplying, setIsReplying] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Log client reply state
  const [isLoggingClient, setIsLoggingClient] = useState(false);
  const [clientMessage, setClientMessage] = useState("");
  const [loggingClient, setLoggingClient] = useState(false);

  // Gmail poll state
  const [polling, setPolling] = useState(false);
  const [pollResult, setPollResult] = useState<{ newReplies: number; checked: number } | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

  const fetchInquiries = useCallback(async () => {
    try {
      const res = await fetch("/api/inquiries");
      const json = await res.json();
      if (json.success) setInquiries(json.data);
    } catch (e) {
      console.error("Failed to load inquiries", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);

  // Auto-poll Gmail for new client replies every 2 minutes
  const handlePollReplies = useCallback(async (silent = false) => {
    if (!silent) setPolling(true);
    try {
      const res = await fetch("/api/inquiries/fetch-replies");
      const data = await res.json();
      if (data.success) {
        setLastChecked(new Date());
        if (!silent) setPollResult({ newReplies: data.newReplies, checked: data.checked });
        if (data.newReplies > 0) {
          setPollResult({ newReplies: data.newReplies, checked: data.checked });
          await fetchInquiries();
        }
      }
    } catch { /* non-fatal */ }
    finally { if (!silent) setPolling(false); }
  }, [fetchInquiries]);

  useEffect(() => {
    // Initial poll when page loads
    handlePollReplies(true);
    // Then auto-poll every 2 minutes
    const timer = setInterval(() => handlePollReplies(true), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [handlePollReplies, POLL_INTERVAL_MS]);

  const updateStatus = async (id: string, status: InquiryStatus) => {
    setUpdating(true);
    try {
      await fetch(`/api/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setInquiries((prev) => prev.map((inq) => inq.id === id ? { ...inq, status } : inq));
      if (selectedInquiry?.id === id) setSelectedInquiry((prev) => prev ? { ...prev, status } : null);
      const targetInq = inquiries.find((i) => i.id === id);
      try {
        await fetch("/api/audit-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorUid: user?.uid || null,
            actorName: userProfile?.fullName || user?.email || "Unknown",
            actorRole: userProfile?.role || "Unknown",
            action: "EDIT", category: "inquiry", targetId: id,
            targetTitle: targetInq?.parentName || "Unknown",
            details: `Changed inquiry status to ${status} for ${targetInq?.parentName || "Unknown"}`,
          }),
        });
      } catch { /* non-fatal */ }
    } finally { setUpdating(false); }
  };

  const deleteInquiry = async (id: string) => {
    const targetInq = inquiries.find((i) => i.id === id);
    await fetch(`/api/inquiries/${id}`, { method: "DELETE" });
    setInquiries((prev) => prev.filter((inq) => inq.id !== id));
    setDeleteConfirm(null);
    if (selectedInquiry?.id === id) setSelectedInquiry(null);
    try {
      await fetch("/api/audit-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorUid: user?.uid || null,
          actorName: userProfile?.fullName || user?.email || "Unknown",
          actorRole: userProfile?.role || "Unknown",
          action: "DELETE", category: "inquiry", targetId: id,
          targetTitle: targetInq?.parentName || "Unknown",
          details: `Deleted inquiry from ${targetInq?.parentName || "Unknown"}`,
        }),
      });
    } catch { /* non-fatal */ }
  };

  const handleSendReply = async () => {
    if (!selectedInquiry || !replyMessage.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/inquiries/${selectedInquiry.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyMessage }),
      });
      const data = await res.json();
      if (data.success) {
        const newEntry: ThreadMessage = { from: "school", message: replyMessage, sentAt: new Date().toISOString() };
        const updated = {
          ...selectedInquiry,
          status: "Replied" as InquiryStatus,
          thread: [...(selectedInquiry.thread || []), newEntry],
        };
        setInquiries((prev) => prev.map((inq) => inq.id === selectedInquiry.id ? updated : inq));
        setSelectedInquiry(updated);
        setIsReplying(false);
        setReplyMessage("");
        try {
          await fetch("/api/audit-log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actorUid: user?.uid || null,
              actorName: userProfile?.fullName || user?.email || "Unknown",
              actorRole: userProfile?.role || "Unknown",
              action: "EDIT", category: "inquiry",
              targetId: selectedInquiry.id,
              targetTitle: selectedInquiry.parentName,
              details: `Sent reply to inquiry from ${selectedInquiry.parentName}`,
            }),
          });
        } catch { /* non-fatal */ }
      } else {
        alert("Failed to send reply: " + data.error);
      }
    } catch (e) {
      alert("An error occurred while sending the reply.");
    } finally { setSendingReply(false); }
  };

  const handleLogClientReply = async () => {
    if (!selectedInquiry || !clientMessage.trim()) return;
    setLoggingClient(true);
    try {
      const res = await fetch(`/api/inquiries/${selectedInquiry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientMessage }),
      });
      const data = await res.json();
      if (data.success) {
        const newEntry: ThreadMessage = {
          from: "client", message: clientMessage.trim(),
          sentAt: new Date().toISOString(), manual: true,
        };
        const updated = {
          ...selectedInquiry,
          status: "Awaiting Reply" as InquiryStatus,
          thread: [...(selectedInquiry.thread || []), newEntry],
        };
        setInquiries((prev) => prev.map((inq) => inq.id === selectedInquiry.id ? updated : inq));
        setSelectedInquiry(updated);
        setIsLoggingClient(false);
        setClientMessage("");
      } else {
        alert("Failed to log reply: " + data.error);
      }
    } catch { alert("An error occurred."); }
    finally { setLoggingClient(false); }
  };


  const handleExport = () => {
    const headers = ["Name", "Email", "Phone", "Child Name", "Child Age", "Status", "Message", "Date"];
    const rows = filtered.map((inq) => [
      inq.parentName, inq.email, inq.phone, inq.childName, inq.childAge,
      inq.status, `"${inq.message.replace(/"/g, '""')}"`, formatDate(inq.createdAt),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = inquiries.filter((inq) => {
    const matchStatus = filterStatus === "All" || inq.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || inq.parentName.toLowerCase().includes(q) || inq.email.toLowerCase().includes(q) || inq.childName?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const metrics = {
    total: inquiries.length,
    newToday: inquiries.filter((i) => new Date(i.createdAt).toDateString() === new Date().toDateString()).length,
    newCount: inquiries.filter((i) => i.status === "New").length,
    awaitingCount: inquiries.filter((i) => i.status === "Awaiting Reply").length,
  };

  return (
    <AppShell title="Inquiries" description="Manage playgroup inquiries from parents and guardians.">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-[3px] bg-[#ffb800]" />
          <h1 className="text-[14px] font-black uppercase tracking-[0.1em] text-[#002f76]">Playgroup Inquiries</h1>
        </div>

        {/* Gmail Poll Button */}
        <div className="flex items-center gap-3">
          {/* Auto-poll indicator */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5a6e8c]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2da05b] opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2da05b]" />
            </span>
            {lastChecked
              ? `Auto-checking · Last: ${lastChecked.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
              : "Auto-check active (every 2 min)"}
          </div>

          {pollResult && pollResult.newReplies > 0 && (
            <span className="text-[12px] font-bold px-3 py-1.5 rounded-full bg-[#e8f9ef] text-[#1a7f4b]">
              ✅ {pollResult.newReplies} new client {pollResult.newReplies === 1 ? "reply" : "replies"} found!
            </span>
          )}

          <button
            onClick={() => handlePollReplies(false)}
            disabled={polling}
            className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold text-white bg-[#002f76] rounded-full hover:bg-[#00256a] transition-colors disabled:opacity-60"
          >
            {polling ? (
              <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M21 12a9 9 0 1 1-9-9" /><path d="M21 3v5h-5" />
              </svg>
            )}
            {polling ? "Checking…" : "Check Now"}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <section className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Inquiries" value={metrics.total} borderColor="border-[#005cc8]" textColor="text-[#005cc8]" metaIcon="💬" metaText="All messages" metaColor="text-[#005cc8]"
          svgDecoration={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full"><rect x="24" y="20" width="32" height="24" rx="4" fill="#dbe8ff" stroke="#005cc8" strokeWidth="2" /><line x1="32" y1="28" x2="48" y2="28" stroke="#005cc8" strokeWidth="2" strokeLinecap="round" /><line x1="32" y1="36" x2="40" y2="36" stroke="#005cc8" strokeWidth="2" strokeLinecap="round" /></svg>}
        />
        <MetricCard label="New Today" value={metrics.newToday} borderColor="border-[#ffb800]" textColor="text-[#ffb800]" metaIcon="📅" metaText="Received today" metaColor="text-[#ffb800]"
          svgDecoration={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full"><circle cx="40" cy="28" r="22" fill="#fff9e6" stroke="#ffb800" strokeWidth="2" /><line x1="40" y1="12" x2="40" y2="28" stroke="#ffb800" strokeWidth="3" strokeLinecap="round" /><line x1="40" y1="28" x2="52" y2="36" stroke="#002f76" strokeWidth="3" strokeLinecap="round" /><circle cx="40" cy="28" r="3" fill="#002f76" /></svg>}
        />
        <MetricCard label="Unread" value={metrics.newCount} borderColor="border-[#e11d48]" textColor="text-[#e11d48]" metaIcon="🚨" metaText="Requires attention" metaColor="text-[#e11d48]"
          svgDecoration={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full"><circle cx="40" cy="28" r="22" fill="#fef2f2" stroke="#e11d48" strokeWidth="2" /><path d="M40 14 C36 14 30 18 30 24 V34 L26 38 H54 L50 34 V24 C50 18 44 14 40 14 Z" fill="none" stroke="#e11d48" strokeWidth="3" strokeLinejoin="round" /><path d="M36 40 A4 4 0 0 0 44 40" fill="none" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" /></svg>}
        />
        <MetricCard label="Awaiting Reply" value={metrics.awaitingCount} borderColor="border-[#f59e0b]" textColor="text-[#d97706]" metaIcon="⏳" metaText="Client replied, needs response" metaColor="text-[#d97706]"
          svgDecoration={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full"><circle cx="40" cy="28" r="22" fill="#fffbeb" stroke="#f59e0b" strokeWidth="2" /><path d="M40 16v12l8 4" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
        />
      </section>

      {/* Table Card */}
      <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-[#e4e2e1]/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <h2 className="text-[20px] font-extrabold text-[#002f76]">All Inquiries</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0aec0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" placeholder="Search name, email..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-[13px] font-semibold border border-[#e2e8f0] rounded-full focus:outline-none focus:border-[#005cc8] bg-[#f8fafc] w-52" />
            </div>
            <div className="relative">
              <button onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-[#002f76] border border-[#e2e8f0] rounded-full bg-white hover:bg-[#f8fafc] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                </svg>
                {filterStatus !== "All" ? filterStatus : "Filter"}
              </button>
              {filterOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-[#e2e8f0] rounded-xl shadow-lg py-1 z-20">
                  {(["All", ...ALL_STATUSES] as const).map((s) => (
                    <button key={s} onClick={() => { setFilterStatus(s as any); setFilterOpen(false); }}
                      className={`block w-full text-left px-4 py-2 text-[13px] font-bold ${filterStatus === s ? "text-[#005cc8] bg-[#f0f5ff]" : "text-[#002f76] hover:bg-[#f8fafc]"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-white bg-[#005cc8] rounded-full hover:bg-[#004bb0] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3 py-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-[#f0f5ff] rounded-full mx-auto flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#005cc8" strokeWidth={2} className="w-6 h-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <p className="text-[14px] font-bold text-[#002f76]">No inquiries found</p>
            <p className="text-[13px] text-[#5a6e8c] mt-1">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#f1f5f9]">
                  <th className="pb-3 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8]">Parent / Guardian</th>
                  <th className="pb-3 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8]">Contact</th>
                  <th className="pb-3 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8]">Child</th>
                  <th className="pb-3 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8]">Status</th>
                  <th className="pb-3 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8]">Date</th>
                  <th className="pb-3 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {filtered.map((inq) => (
                  <tr key={inq.id} onClick={() => { setSelectedInquiry(inq); if (inq.status === "New") updateStatus(inq.id, "Read"); }}
                    className={`group cursor-pointer hover:bg-[#f8fafc] transition-colors ${inq.status === "New" ? "font-extrabold" : ""}`}>
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-extrabold shrink-0 ${inq.status === "Awaiting Reply" ? "bg-[#fff3e0] text-[#d97706] ring-2 ring-[#f59e0b]/40" : "bg-[#f0f5ff] text-[#005cc8]"}`}>
                          {inq.parentName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-[#002f76]">{inq.parentName}</p>
                          {inq.status === "New" && <span className="text-[10px] font-extrabold text-[#ffb800] uppercase tracking-wider">● New</span>}
                          {inq.status === "Awaiting Reply" && <span className="text-[10px] font-extrabold text-[#d97706] uppercase tracking-wider">● Client replied</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <p className="text-[13px] font-semibold text-[#002f76]">{inq.email}</p>
                      {inq.phone && <p className="text-[12px] text-[#5a6e8c]">{inq.phone}</p>}
                    </td>
                    <td className="py-3.5">
                      {inq.childName ? (
                        <div>
                          <p className="text-[13px] font-semibold text-[#002f76]">{inq.childName}</p>
                          {inq.childAge && <p className="text-[12px] text-[#5a6e8c]">Age: {inq.childAge}</p>}
                        </div>
                      ) : <span className="text-[12px] text-[#a0aec0]">—</span>}
                    </td>
                    <td className="py-3.5"><StatusBadge status={inq.status} /></td>
                    <td className="py-3.5 text-[12px] text-[#5a6e8c] font-semibold">{formatDate(inq.createdAt)}</td>
                    <td className="py-3.5">
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(inq.id); }}
                        className="p-1.5 rounded-lg text-[#a0aec0] hover:text-[#ba1a1a] hover:bg-[#fef2f2] transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#001a4d]/40 backdrop-blur-sm" onClick={() => { setSelectedInquiry(null); setIsReplying(false); setIsLoggingClient(false); setShowEmojiPicker(false); }} />
          <div className="relative w-full max-w-lg bg-white rounded-[1.5rem] shadow-2xl border border-[#e8effe] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-[#002f76] to-[#0050d5] px-6 py-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-white text-[18px] font-extrabold">Inquiry Thread</h3>
                <p className="text-white/60 text-[12px] font-semibold mt-0.5">{selectedInquiry.parentName} · {selectedInquiry.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedInquiry.status} />
                <button onClick={() => { setSelectedInquiry(null); setIsReplying(false); setIsLoggingClient(false); setShowEmojiPicker(false); }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors ml-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Child Info strip */}
            {(selectedInquiry.childName || selectedInquiry.childAge) && (
              <div className="bg-[#f8fafc] border-b border-[#f1f5f9] px-6 py-3 flex gap-6 shrink-0">
                {selectedInquiry.childName && (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#5a6e8c]">Child</p>
                    <p className="text-[13px] font-bold text-[#002f76]">{selectedInquiry.childName}</p>
                  </div>
                )}
                {selectedInquiry.childAge && (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#5a6e8c]">Age</p>
                    <p className="text-[13px] font-bold text-[#002f76]">{selectedInquiry.childAge}</p>
                  </div>
                )}
              </div>
            )}

            {/* Conversation Thread */}
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-3 bg-[#f8fafc]">
              {buildThread(selectedInquiry).map((msg, idx) => {
                const isSchool = msg.from === "school";
                return (
                  <div key={idx} className={`flex flex-col gap-1 ${isSchool ? "items-end" : "items-start"}`}>
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${isSchool ? "text-[#005cc8] flex-row-reverse" : "text-[#d97706]"}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-black ${isSchool ? "bg-[#005cc8]" : "bg-[#f59e0b]"}`}>
                        {isSchool ? "S" : "C"}
                      </span>
                      {isSchool ? "Merry Explorers" : selectedInquiry.parentName}
                      {msg.manual && <span className="text-[9px] text-[#9ca3af] normal-case tracking-normal">(manual)</span>}
                    </div>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] font-semibold leading-relaxed shadow-sm ${
                      isSchool
                        ? "bg-[#002f76] text-white rounded-tr-sm"
                        : "bg-white text-[#002f76] border border-[#e2e8f0] rounded-tl-sm"
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                    <p className="text-[10px] text-[#9ca3af] font-medium">
                      {formatDate(msg.sentAt)} · {formatTime(msg.sentAt)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Bottom action area */}
            <div className="px-5 py-4 border-t border-[#f1f5f9] bg-white shrink-0 space-y-3">
              {/* Status buttons */}
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.map((s) => (
                  <button key={s} disabled={updating || selectedInquiry.status === s} onClick={() => updateStatus(selectedInquiry.id, s)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${selectedInquiry.status === s ? "bg-[#005cc8] text-white border-[#005cc8]" : "bg-white text-[#005cc8] border-[#e2e8f0] hover:border-[#005cc8]"} disabled:opacity-50`}>
                    {s}
                  </button>
                ))}
              </div>

              {/* Log Client Reply */}
              {isLoggingClient ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#d97706] mb-1.5">Paste Client's Reply</p>
                  <textarea value={clientMessage} onChange={(e) => setClientMessage(e.target.value)}
                    placeholder="Paste the client's email reply here..."
                    className="w-full min-h-[90px] p-3 text-[13px] font-semibold text-[#002f76] border border-[#fde68a] rounded-xl focus:outline-none focus:border-[#f59e0b] bg-[#fffbeb] mb-2 resize-y" />
                  <div className="flex gap-2">
                    <button onClick={() => { setIsLoggingClient(false); setClientMessage(""); }} disabled={loggingClient}
                      className="flex-1 py-2 rounded-xl border border-[#e2e8f0] text-[12px] font-bold text-[#002f76] hover:bg-[#f8fafc] transition-colors disabled:opacity-50">
                      Cancel
                    </button>
                    <button onClick={handleLogClientReply} disabled={loggingClient || !clientMessage.trim()}
                      className="flex-1 py-2 rounded-xl bg-[#f59e0b] text-white text-[12px] font-bold hover:bg-[#d97706] transition-colors disabled:opacity-50 flex justify-center items-center gap-1.5">
                      {loggingClient ? "Saving…" : "Log Reply"}
                    </button>
                  </div>
                </div>
              ) : isReplying ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#005cc8]">Compose Reply</p>
                    <div className="relative">
                      <button 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                        className="w-7 h-7 rounded-full bg-[#f0f5ff] text-[#005cc8] flex items-center justify-center hover:bg-[#e2e8f0] transition-colors"
                        title="Insert Emoji"
                      >
                        😊
                      </button>
                      {showEmojiPicker && (
                        <div className="absolute right-0 bottom-full mb-2 z-50">
                          <EmojiPicker 
                            onEmojiClick={(emojiData) => setReplyMessage((prev) => prev + emojiData.emoji)} 
                            width={300} 
                            height={350} 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <textarea value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply here..."
                    className="w-full min-h-[100px] p-3 text-[13px] font-semibold text-[#002f76] border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-[#005cc8] bg-[#f8fafc] mb-2 resize-y" />
                  <div className="flex gap-2">
                    <button onClick={() => { setIsReplying(false); setReplyMessage(""); setShowEmojiPicker(false); }} disabled={sendingReply}
                      className="flex-1 py-2 rounded-xl border border-[#e2e8f0] text-[12px] font-bold text-[#002f76] hover:bg-[#f8fafc] transition-colors disabled:opacity-50">
                      Cancel
                    </button>
                    <button onClick={handleSendReply} disabled={sendingReply || !replyMessage.trim()}
                      className="flex-1 py-2 rounded-xl bg-[#005cc8] text-white text-[12px] font-bold hover:bg-[#004bb0] transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                      {sendingReply ? (
                        <><svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Sending…</>
                      ) : "Send Reply"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setIsLoggingClient(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#fde68a] bg-[#fffbeb] text-[#d97706] text-[12px] font-bold hover:bg-[#fff3e0] transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Log Client Reply
                  </button>
                  <button onClick={() => setIsReplying(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#005cc8] text-white text-[12px] font-bold hover:bg-[#004bb0] transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/>
                    </svg>
                    Reply via Email
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#001a4d]/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-[1.25rem] shadow-2xl p-6 w-full max-w-sm border border-[#e8effe]">
            <div className="w-12 h-12 bg-[#fef2f2] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ba1a1a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
            </div>
            <h3 className="text-center text-[16px] font-extrabold text-[#002f76] mb-2">Delete Inquiry?</h3>
            <p className="text-center text-[13px] text-[#5a6e8c] mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-[13px] font-bold text-[#002f76] hover:bg-[#f8fafc] transition-colors">
                Cancel
              </button>
              <button onClick={() => deleteInquiry(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-[#ba1a1a] text-white text-[13px] font-bold hover:bg-[#9a1515] transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
