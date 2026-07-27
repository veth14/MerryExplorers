"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/app-shell";

type InquiryStatus = "New" | "Read" | "Replied" | "Closed";

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
  replies?: { message: string; sentAt: string }[];
};

const STATUS_STYLES: Record<InquiryStatus, { bg: string; text: string; dot: string }> = {
  New: { bg: "bg-[#fff8e1]", text: "text-[#a07000]", dot: "bg-[#ffb800]" },
  Read: { bg: "bg-[#f0f5ff]", text: "text-[#005cc8]", dot: "bg-[#005cc8]" },
  Replied: { bg: "bg-[#e8f9ef]", text: "text-[#1a7f4b]", dot: "bg-[#2da05b]" },
  Closed: { bg: "bg-[#f3f4f6]", text: "text-[#4b5563]", dot: "bg-[#9ca3af]" },
};

const ALL_STATUSES: InquiryStatus[] = ["New", "Read", "Replied", "Closed"];

function StatusBadge({ status }: { status: InquiryStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#e4e2e1]/50 shadow-sm flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#5a6e8c]">{label}</p>
        <p className="text-[26px] font-extrabold text-[#002f76] leading-tight">{value}</p>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [filterStatus, setFilterStatus] = useState<InquiryStatus | "All">("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Reply State
  const [isReplying, setIsReplying] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

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
    } finally {
      setUpdating(false);
    }
  };

  const deleteInquiry = async (id: string) => {
    await fetch(`/api/inquiries/${id}`, { method: "DELETE" });
    setInquiries((prev) => prev.filter((inq) => inq.id !== id));
    setDeleteConfirm(null);
    if (selectedInquiry?.id === id) setSelectedInquiry(null);
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
        // Update local status and append the new reply to history
        const newReply = { message: replyMessage, sentAt: new Date().toISOString() };
        
        setInquiries((prev) => prev.map((inq) => 
          inq.id === selectedInquiry.id 
            ? { ...inq, status: "Replied", replies: [...(inq.replies || []), newReply] } 
            : inq
        ));
        
        setSelectedInquiry((prev) => 
          prev ? { ...prev, status: "Replied", replies: [...(prev.replies || []), newReply] } : null
        );
        
        setIsReplying(false);
        setReplyMessage("");
      } else {
        alert("Failed to send reply: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while sending the reply.");
    } finally {
      setSendingReply(false);
    }
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
    newToday: inquiries.filter((i) => {
      const d = new Date(i.createdAt);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }).length,
    newCount: inquiries.filter((i) => i.status === "New").length,
    repliedCount: inquiries.filter((i) => i.status === "Replied").length,
  };

  return (
    <AppShell title="Inquiries" description="Manage playgroup inquiries from parents and guardians.">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-[3px] bg-[#ffb800]" />
        <h1 className="text-[14px] font-black uppercase tracking-[0.1em] text-[#002f76]">
          Playgroup Inquiries
        </h1>
      </div>

      {/* Metric Cards */}
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Inquiries"
          value={metrics.total}
          color="bg-[#f0f5ff] text-[#005cc8]"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          }
        />
        <MetricCard
          label="New Today"
          value={metrics.newToday}
          color="bg-[#fff8e1] text-[#a07000]"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
          }
        />
        <MetricCard
          label="Unread"
          value={metrics.newCount}
          color="bg-[#fef2f2] text-[#ef4444]"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          }
        />
        <MetricCard
          label="Replied"
          value={metrics.repliedCount}
          color="bg-[#e8f9ef] text-[#1a7f4b]"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          }
        />
      </section>

      {/* Table Card */}
      <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-[#e4e2e1]/50">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <h2 className="text-[20px] font-extrabold text-[#002f76]">All Inquiries</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0aec0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-[13px] font-semibold border border-[#e2e8f0] rounded-full focus:outline-none focus:border-[#005cc8] bg-[#f8fafc] w-52"
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-[#002f76] border border-[#e2e8f0] rounded-full bg-white hover:bg-[#f8fafc] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                </svg>
                {filterStatus !== "All" ? filterStatus : "Filter"}
              </button>
              {filterOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-[#e2e8f0] rounded-xl shadow-lg py-1 z-20">
                  {(["All", ...ALL_STATUSES] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setFilterStatus(s as any); setFilterOpen(false); }}
                      className={`block w-full text-left px-4 py-2 text-[13px] font-bold ${filterStatus === s ? "text-[#005cc8] bg-[#f0f5ff]" : "text-[#002f76] hover:bg-[#f8fafc]"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export */}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-white bg-[#005cc8] rounded-full hover:bg-[#004bb0] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center text-[14px] font-semibold text-[#a0aec0]">Loading inquiries...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-[#f0f5ff] rounded-full mx-auto flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#005cc8" strokeWidth={2} className="w-6 h-6">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
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
                  <tr
                    key={inq.id}
                    onClick={() => {
                      setSelectedInquiry(inq);
                      if (inq.status === "New") updateStatus(inq.id, "Read");
                    }}
                    className={`group cursor-pointer hover:bg-[#f8fafc] transition-colors ${inq.status === "New" ? "font-extrabold" : ""}`}
                  >
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#f0f5ff] flex items-center justify-center text-[#005cc8] text-[12px] font-extrabold shrink-0">
                          {inq.parentName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-[#002f76]">{inq.parentName}</p>
                          {inq.status === "New" && (
                            <span className="text-[10px] font-extrabold text-[#ffb800] uppercase tracking-wider">● New</span>
                          )}
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
                      ) : (
                        <span className="text-[12px] text-[#a0aec0]">—</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <StatusBadge status={inq.status} />
                    </td>
                    <td className="py-3.5 text-[12px] text-[#5a6e8c] font-semibold">{formatDate(inq.createdAt)}</td>
                    <td className="py-3.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(inq.id); }}
                        className="p-1.5 rounded-lg text-[#a0aec0] hover:text-[#ba1a1a] hover:bg-[#fef2f2] transition-colors"
                      >
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
          <div className="fixed inset-0 bg-[#001a4d]/40 backdrop-blur-sm" onClick={() => { setSelectedInquiry(null); setIsReplying(false); }} />
          <div className="relative w-full max-w-lg bg-white rounded-[1.5rem] shadow-2xl border border-[#e8effe] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-[#002f76] to-[#0050d5] px-6 py-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-white text-[18px] font-extrabold">Inquiry Details</h3>
                <p className="text-white/60 text-[12px] font-semibold mt-0.5">{formatDate(selectedInquiry.createdAt)}</p>
              </div>
              <button
                onClick={() => { setSelectedInquiry(null); setIsReplying(false); }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Parent Info */}
              <div className="flex items-center gap-4 border-b border-[#f1f5f9] pb-5">
                <div className="w-14 h-14 rounded-full bg-[#f0f5ff] flex items-center justify-center text-[#005cc8] text-[18px] font-extrabold shrink-0">
                  {selectedInquiry.parentName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h4 className="text-[16px] font-extrabold text-[#002f76]">{selectedInquiry.parentName}</h4>
                  <p className="text-[13px] text-[#5a6e8c]">{selectedInquiry.email}</p>
                  {selectedInquiry.phone && <p className="text-[13px] text-[#5a6e8c]">{selectedInquiry.phone}</p>}
                </div>
                <StatusBadge status={selectedInquiry.status} />
              </div>

              {/* Child Info */}
              {(selectedInquiry.childName || selectedInquiry.childAge) && (
                <div className="grid grid-cols-2 gap-3">
                  {selectedInquiry.childName && (
                    <div className="bg-[#f8fafc] rounded-xl p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1">Child's Name</p>
                      <p className="text-[14px] font-bold text-[#002f76]">{selectedInquiry.childName}</p>
                    </div>
                  )}
                  {selectedInquiry.childAge && (
                    <div className="bg-[#f8fafc] rounded-xl p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1">Child's Age</p>
                      <p className="text-[14px] font-bold text-[#002f76]">{selectedInquiry.childAge}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Message */}
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-2">Original Message</p>
                <div className="bg-[#f8fafc] rounded-xl p-4 text-[14px] font-semibold text-[#002f76] leading-relaxed border border-[#e2e8f0]">
                  {selectedInquiry.message}
                </div>
              </div>

              {/* Reply History */}
              {selectedInquiry.replies && selectedInquiry.replies.length > 0 && (
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#1a7f4b] mb-2">Reply History</p>
                  <div className="space-y-3">
                    {selectedInquiry.replies.map((reply, idx) => (
                      <div key={idx} className="bg-[#e8f9ef] rounded-xl p-4 border border-[#bbf7d0]">
                        <p className="text-[10px] font-extrabold text-[#2da05b] uppercase tracking-wider mb-1">
                          Sent on {formatDate(reply.sentAt)}
                        </p>
                        <div className="text-[13px] font-bold text-[#14532d] leading-relaxed whitespace-pre-wrap">
                          {reply.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Change Status */}
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      disabled={updating || selectedInquiry.status === s}
                      onClick={() => updateStatus(selectedInquiry.id, s)}
                      className={`px-4 py-2 rounded-full text-[12px] font-bold border transition-all ${
                        selectedInquiry.status === s
                          ? "bg-[#005cc8] text-white border-[#005cc8]"
                          : "bg-white text-[#005cc8] border-[#e2e8f0] hover:border-[#005cc8]"
                      } disabled:opacity-50`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply via Email */}
              {!isReplying ? (
                <button
                  onClick={() => setIsReplying(true)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#005cc8] text-white text-[14px] font-bold hover:bg-[#004bb0] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/>
                  </svg>
                  Reply via Email
                </button>
              ) : (
                <div className="border-t border-[#f1f5f9] pt-5 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-2">Compose Reply</p>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply here..."
                    className="w-full min-h-[120px] p-3 text-[13px] font-semibold text-[#002f76] border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-[#005cc8] bg-[#f8fafc] mb-3 resize-y"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setIsReplying(false); setReplyMessage(""); }}
                      disabled={sendingReply}
                      className="flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-[13px] font-bold text-[#002f76] hover:bg-[#f8fafc] transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendReply}
                      disabled={sendingReply || !replyMessage.trim()}
                      className="flex-1 py-2.5 rounded-xl bg-[#005cc8] text-white text-[13px] font-bold hover:bg-[#004bb0] transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      {sendingReply ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>Send Reply</>
                      )}
                    </button>
                  </div>
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
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-[13px] font-bold text-[#002f76] hover:bg-[#f8fafc] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteInquiry(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-[#ba1a1a] text-white text-[13px] font-bold hover:bg-[#9a1515] transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
