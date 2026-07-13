"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Modal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";
import { cachedFetch, invalidateCache } from "@/lib/cache";

type LeaveStatus = "Pending" | "Approved" | "Rejected";

type LeaveRequest = {
  id: string;
  teacherId: string;
  teacherName: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
};

const statusColors: Record<LeaveStatus, { bg: string; text: string; dot: string }> = {
  Pending: { bg: "bg-[#fff8e1]", text: "text-[#a07000]", dot: "bg-[#ffb800]" },
  Approved: { bg: "bg-[#e8f9ef]", text: "text-[#1a7f4b]", dot: "bg-[#2da05b]" },
  Rejected: { bg: "bg-[#fff0f0]", text: "text-[#ba1a1a]", dot: "bg-[#e53935]" },
};

const leaveTypeIcons: Record<string, string> = {
  "Sick Leave": "🤒",
  "Vacation Leave": "🏖️",
  "Emergency Leave": "🚨",
  "Unpaid Leave": "📋",
};

export default function LeavePage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"All" | LeaveStatus>("All");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [confirmAction, setConfirmAction] = useState<"Approved" | "Rejected" | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: "success" | "error" } | null>(null);

  async function fetchLeaves() {
    try {
      const json = await cachedFetch<any>("leaves:all", "/api/leaves", 30_000);
      if (json?.success) setLeaves(json.data);
    } catch (err) {
      console.error("Failed to fetch leaves:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeaves();
  }, []);

  async function handleAction(id: string, status: "Approved" | "Rejected") {
    setActionLoading(id);
    try {
      await fetch(`/api/leaves/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      // Invalidate so next fetch is fresh
      invalidateCache("leaves:all");
      invalidateCache("dashboard:metrics");
      await fetchLeaves();
      setToastMessage({
        message: `Leave request successfully ${status.toLowerCase()}`,
        type: "success"
      });
    } catch (err) {
      console.error("Action failed:", err);
      setToastMessage({
        message: "Failed to process leave request",
        type: "error"
      });
    } finally {
      setActionLoading(null);
      setSelectedLeave(null);
      setConfirmAction(null);
    }
  }

  const tabs = ["All", "Pending", "Approved", "Rejected"] as const;
  const filtered = activeTab === "All" ? leaves : leaves.filter((l) => l.status === activeTab);

  const pendingCount = leaves.filter((l) => l.status === "Pending").length;

  function getDuration(start: string, end: string) {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const days = Math.round(ms / 86400000) + 1;
    return `${days} day${days !== 1 ? "s" : ""}`;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <AppShell
      title="Leave Management"
      description="Review and approve staff leave requests."
    >
      {/* Summary cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        {/* Total Requests */}
        <article className="relative overflow-hidden rounded-[1.25rem] bg-white px-5 pb-5 pt-5 border-b-[4px] border-[#0050d5] shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)]">
          <div className="absolute right-2 top-2 w-[72px] h-[54px] opacity-70 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full">
              <rect x="10" y="8" width="60" height="44" rx="6" fill="#e8effe" />
              <line x1="20" y1="22" x2="60" y2="22" stroke="#6c98ff" strokeWidth="3" strokeLinecap="round" />
              <line x1="20" y1="32" x2="50" y2="32" stroke="#6c98ff" strokeWidth="3" strokeLinecap="round" />
              <line x1="20" y1="42" x2="40" y2="42" stroke="#6c98ff" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[11.5px] font-extrabold uppercase tracking-widest text-[#0050d5]">
            Total Requests
          </p>
          <p className="font-headline text-[42px] font-extrabold leading-none tracking-tight text-[#002f76] mt-2">
            {leaves.length}
          </p>
          <p className="mt-2.5 text-[13px] font-bold text-[#2da05b] flex items-center gap-1.5">
            <span>📋</span> All leave records
          </p>
        </article>

        {/* Pending Review */}
        <article className="relative overflow-hidden rounded-[1.25rem] bg-white px-5 pb-5 pt-5 border-b-[4px] border-[#ffb800] shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)]">
          <div className="absolute right-2 top-2 w-[72px] h-[54px] opacity-70 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full">
              <circle cx="40" cy="28" r="22" fill="#fff9e6" stroke="#ffb800" strokeWidth="2" />
              <line x1="40" y1="12" x2="40" y2="28" stroke="#ffb800" strokeWidth="3" strokeLinecap="round" />
              <line x1="40" y1="28" x2="52" y2="36" stroke="#002f76" strokeWidth="3" strokeLinecap="round" />
              <circle cx="40" cy="28" r="3" fill="#002f76" />
            </svg>
          </div>
          <p className="text-[11.5px] font-extrabold uppercase tracking-widest text-[#ffb800]">
            Pending Review
          </p>
          <p className="font-headline text-[42px] font-extrabold leading-none tracking-tight text-[#002f76] mt-2">
            {pendingCount}
          </p>
          <p className="mt-2.5 text-[13px] font-bold text-[#555] flex items-center gap-1.5">
            <span>⏳</span> Awaiting approval
          </p>
        </article>

        {/* Approved */}
        <article className="relative overflow-hidden rounded-[1.25rem] bg-white px-5 pb-5 pt-5 border-b-[4px] border-[#2da05b] shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)]">
          <div className="absolute right-2 top-2 w-[72px] h-[54px] opacity-70 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full">
              <circle cx="40" cy="28" r="22" fill="#d4f0e2" stroke="#2da05b" strokeWidth="2" />
              <path
                d="M28 28 L36 36 L52 20"
                stroke="#2da05b"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <p className="text-[11.5px] font-extrabold uppercase tracking-widest text-[#2da05b]">
            Approved
          </p>
          <p className="font-headline text-[42px] font-extrabold leading-none tracking-tight text-[#002f76] mt-2">
            {leaves.filter((l) => l.status === "Approved").length}
          </p>
          <p className="mt-2.5 text-[13px] font-bold text-[#2da05b] flex items-center gap-1.5">
            <span>✅</span> Leaves approved
          </p>
        </article>
      </section>

      {/* Tab bar */}
      <div className="flex items-center gap-2 mt-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all relative ${activeTab === tab
                ? "bg-[#0050d5] text-white shadow-md shadow-[#0050d5]/20"
                : "bg-white text-[#002f76] hover:bg-[#f0f5ff] border border-[#e2e8f0]"
              }`}
          >
            {tab}
            {tab === "Pending" && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#ba1a1a] text-white text-[9px] font-black">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Leave table */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-[#5a6e8c] font-bold text-sm">
          Loading leave requests…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-[#9aa3b2]">
          <span className="text-4xl">🗂️</span>
          <p className="font-bold text-sm">
            No {activeTab !== "All" ? activeTab.toLowerCase() : ""} leave
            requests.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[1.25rem] border border-[#e8effe] shadow-[0_4px_20px_-4px_rgba(0,47,118,0.10)] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1.2fr_1.2fr_1fr_1fr_1.4fr] gap-4 px-6 py-3 border-b border-[#f0f4f9] bg-[#f8fafc]">
            {["Teacher", "Leave Type", "Duration", "Date Filed", "Status", "Action"].map(
              (h) => (
                <p
                  key={h}
                  className="text-[11px] font-extrabold uppercase tracking-widest text-[#9aa3b2]"
                >
                  {h}
                </p>
              )
            )}
          </div>

          {/* Rows */}
          {filtered.map((leave) => {
            const sc = statusColors[leave.status];
            return (
              <div
                key={leave.id}
                className="grid grid-cols-[2fr_1.2fr_1.2fr_1fr_1fr_1.4fr] gap-4 items-center px-6 py-4 border-b border-[#f0f4f9] last:border-0 hover:bg-[#f8fafc] transition-colors"
              >
                {/* Teacher */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#e8effe] flex items-center justify-center text-[#0050d5] font-extrabold text-[12px] shrink-0">
                    {leave.teacherName
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-[13px] text-[#002f76] truncate">
                      {leave.teacherName || "Unknown"}
                    </p>
                    {leave.reason && (
                      <p className="text-[11px] text-[#9aa3b2] font-semibold truncate max-w-[180px]">
                        {leave.reason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Type */}
                <p className="text-[13px] font-bold text-[#002f76]">
                  {leaveTypeIcons[leave.type] || "📋"} {leave.type}
                </p>

                {/* Duration */}
                <div>
                  <p className="text-[13px] font-bold text-[#002f76]">
                    {getDuration(leave.startDate, leave.endDate)}
                  </p>
                  <p className="text-[11px] text-[#9aa3b2] font-semibold">
                    {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                  </p>
                </div>

                {/* Date filed */}
                <p className="text-[12px] font-semibold text-[#5a6e8c]">
                  {leave.createdAt ? formatDate(leave.createdAt) : "—"}
                </p>

                {/* Status only */}
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${sc.bg} ${sc.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {leave.status}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {leave.status === "Pending" ? (
                    <>
                      <button
                        onClick={() => {
                          setSelectedLeave(leave);
                          setConfirmAction("Approved");
                        }}
                        disabled={actionLoading === leave.id}
                        className="px-3 py-1.5 rounded-full bg-[#e8f9ef] text-[#1a7f4b] text-[11px] font-bold hover:bg-[#d1f5e2] transition-colors border border-[#b3e8c9] disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLeave(leave);
                          setConfirmAction("Rejected");
                        }}
                        disabled={actionLoading === leave.id}
                        className="px-3 py-1.5 rounded-full bg-[#fff0f0] text-[#ba1a1a] text-[11px] font-bold hover:bg-[#ffe0e0] transition-colors border border-[#ffd5d5] disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-[12px] font-semibold text-[#9aa3b2]">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Modal */}
      {selectedLeave && confirmAction && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedLeave(null);
            setConfirmAction(null);
          }}
          title={confirmAction === "Approved" ? "Approve Leave" : "Reject Leave"}
          description={`${confirmAction === "Approved" ? "Approve" : "Reject"
            } leave request for ${selectedLeave.teacherName}?`}
          footer={
            <>
              <button
                onClick={() => {
                  setSelectedLeave(null);
                  setConfirmAction(null);
                }}
                className="px-4 py-2 rounded-lg font-bold text-[13px] text-[#4a5568] hover:bg-[#e2e8f0] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(selectedLeave.id, confirmAction)}
                disabled={actionLoading === selectedLeave.id}
                className={`px-4 py-2 rounded-lg font-bold text-[13px] text-white transition-colors disabled:opacity-50 ${confirmAction === "Approved"
                    ? "bg-[#2da05b] hover:bg-[#1a7f4b]"
                    : "bg-[#e53935] hover:bg-[#ba1a1a]"
                  }`}
              >
                {actionLoading === selectedLeave.id
                  ? "Processing..."
                  : `Confirm ${confirmAction === "Approved" ? "Approval" : "Rejection"
                  }`}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div
              className={`rounded-xl p-4 ${confirmAction === "Approved"
                  ? "bg-[#e8f9ef] border border-[#b3e8c9]"
                  : "bg-[#fff0f0] border border-[#ffd5d5]"
                }`}
            >
              <p
                className={`text-[13px] font-bold ${confirmAction === "Approved"
                    ? "text-[#1a7f4b]"
                    : "text-[#ba1a1a]"
                  }`}
              >
                {confirmAction === "Approved"
                  ? "This will mark the teacher as On Leave and update the dashboard."
                  : "The leave request will be rejected and the teacher's status remains active."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[12.5px]">
              <div className="bg-[#f8fafc] rounded-xl p-3 border border-[#e2e8f0]">
                <p className="text-[#9aa3b2] font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  Leave Type
                </p>
                <p className="font-bold text-[#002f76]">{selectedLeave.type}</p>
              </div>
              <div className="bg-[#f8fafc] rounded-xl p-3 border border-[#e2e8f0]">
                <p className="text-[#9aa3b2] font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  Duration
                </p>
                <p className="font-bold text-[#002f76]">
                  {getDuration(selectedLeave.startDate, selectedLeave.endDate)}
                </p>
              </div>
              <div className="bg-[#f8fafc] rounded-xl p-3 border border-[#e2e8f0]">
                <p className="text-[#9aa3b2] font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  Start Date
                </p>
                <p className="font-bold text-[#002f76]">
                  {formatDate(selectedLeave.startDate)}
                </p>
              </div>
              <div className="bg-[#f8fafc] rounded-xl p-3 border border-[#e2e8f0]">
                <p className="text-[#9aa3b2] font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  End Date
                </p>
                <p className="font-bold text-[#002f76]">
                  {formatDate(selectedLeave.endDate)}
                </p>
              </div>
            </div>
            {selectedLeave.reason && (
              <div className="bg-[#f8fafc] rounded-xl p-3 border border-[#e2e8f0]">
                <p className="text-[#9aa3b2] font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  Reason
                </p>
                <p className="font-semibold text-[#002f76] text-[13px]">
                  {selectedLeave.reason}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </AppShell>
  );
}