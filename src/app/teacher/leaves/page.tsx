"use client";

import { useEffect, useState } from "react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import { useAuth } from "@/lib/auth-context";
import { Modal } from "@/components/ui/modal";

type LeaveStatus = "Pending" | "Approved" | "Rejected";

type LeaveRequest = {
  id: string;
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

export default function TeacherLeavesPage() {
  const { user, userProfile } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // File Leave State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("Sick Leave");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [filing, setFiling] = useState(false);

  async function fetchLeaves() {
    if (!user) return;
    try {
      const res = await fetch(`/api/leaves`);
      const json = await res.json();
      if (json.success) {
        // Filter out only this teacher's leaves
        const myLeaves = json.data.filter((l: any) => l.teacherId === user.uid);
        setLeaves(myLeaves);
      }
    } catch (err) {
      console.error("Failed to fetch leaves:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeaves();
  }, [user]);

  async function handleFileLeave() {
    if (!user || !userProfile) return;
    setFiling(true);
    try {
      const res = await fetch(`/api/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: user.uid,
          teacherName: userProfile.fullName || "Unknown",
          type: leaveType,
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          reason: leaveReason,
        }),
      });
      if (res.ok) {
        setIsLeaveModalOpen(false);
        setLeaveReason("");
        setLeaveStartDate("");
        setLeaveEndDate("");
        setLeaveType("Sick Leave");
        setIsSuccessModalOpen(true);
        fetchLeaves(); // Refresh the list
      }
    } catch (e) {
      console.error("Failed to file leave", e);
    } finally {
      setFiling(false);
    }
  }

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
    <TeacherShell title="My Leaves" description="View and file your leave requests.">

      {/* Header and File Leave Button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black text-[#002f76]">Leave History</h2>
        <button
          onClick={() => setIsLeaveModalOpen(true)}
          className="px-5 py-2.5 rounded-full bg-[#0050d5] text-white font-bold text-[13px] hover:bg-[#003c9e] transition-colors shadow-sm flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          File Leave
        </button>
      </div>

      {/* Leave table */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-[#5a6e8c] font-bold text-sm">
          Loading leave requests…
        </div>
      ) : leaves.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-[#9aa3b2] bg-white rounded-[2rem] shadow-sm border border-[#e2e8f0]">
          <span className="text-4xl">🗂️</span>
          <p className="font-bold text-sm">You haven't filed any leave requests yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-[#e8effe] shadow-lg overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 px-6 py-4 border-b border-[#f0f4f9] bg-[#f8fafc]">
            {["Leave Type", "Duration", "Date Filed", "Status"].map(
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
          {leaves.map((leave) => {
            const sc = statusColors[leave.status];
            return (
              <div
                key={leave.id}
                className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4 border-b border-[#f0f4f9] last:border-0 hover:bg-[#f8fafc] transition-colors"
              >
                {/* Type */}
                <div>
                  <p className="text-[14px] font-black text-[#002f76]">
                    {leaveTypeIcons[leave.type] || "📋"} {leave.type}
                  </p>
                  {leave.reason && (
                    <p className="text-[12px] text-[#9aa3b2] font-semibold mt-0.5 truncate max-w-[250px]">
                      {leave.reason}
                    </p>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <p className="text-[13px] font-bold text-[#002f76]">
                    {getDuration(leave.startDate, leave.endDate)}
                  </p>
                  <p className="text-[11px] text-[#9aa3b2] font-semibold mt-0.5">
                    {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                  </p>
                </div>

                {/* Date filed */}
                <p className="text-[12px] font-semibold text-[#5a6e8c]">
                  {leave.createdAt ? formatDate(leave.createdAt) : "—"}
                </p>

                {/* Status */}
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold ${sc.bg} ${sc.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {leave.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* File Leave Modal */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="File Leave"
        description="Submit a new leave request."
        footer={
          <>
            <button
              onClick={() => setIsLeaveModalOpen(false)}
              className="px-4 py-2 rounded-full font-bold text-[13px] text-[#4a5568] hover:bg-[#e2e8f0] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleFileLeave}
              disabled={filing || !leaveStartDate || !leaveEndDate}
              className="px-5 py-2 rounded-full font-bold text-[13px] text-white bg-[#0050d5] hover:bg-[#003c9e] transition-colors disabled:opacity-50"
            >
              {filing ? "Filing..." : "Submit Request"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-extrabold text-[#002f76] mb-1.5">Leave Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-[13px] font-bold text-[#002f76] focus:outline-none focus:border-[#0050d5] focus:ring-1 focus:ring-[#0050d5] bg-white shadow-sm"
            >
              <option value="Sick Leave">Sick Leave</option>
              <option value="Vacation Leave">Vacation Leave</option>
              <option value="Emergency Leave">Emergency Leave</option>
              <option value="Unpaid Leave">Unpaid Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-extrabold text-[#002f76] mb-1.5">Start Date</label>
              <input
                type="date"
                value={leaveStartDate}
                onChange={(e) => setLeaveStartDate(e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-xl px-3 py-2 text-[13px] font-bold text-[#002f76] focus:outline-none focus:border-[#0050d5] focus:ring-1 focus:ring-[#0050d5] bg-white shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[13px] font-extrabold text-[#002f76] mb-1.5">End Date</label>
              <input
                type="date"
                value={leaveEndDate}
                onChange={(e) => setLeaveEndDate(e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-xl px-3 py-2 text-[13px] font-bold text-[#002f76] focus:outline-none focus:border-[#0050d5] focus:ring-1 focus:ring-[#0050d5] bg-white shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-extrabold text-[#002f76] mb-1.5">Reason (Optional)</label>
            <textarea
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              rows={2}
              placeholder="Provide a brief reason..."
              className="w-full border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#002f76] focus:outline-none focus:border-[#0050d5] focus:ring-1 focus:ring-[#0050d5] bg-white shadow-sm resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Request Submitted"
        footer={
          <button
            onClick={() => setIsSuccessModalOpen(false)}
            className="px-5 py-2 rounded-full font-bold text-[13px] text-white bg-[#0050d5] hover:bg-[#003c9e] transition-colors"
          >
            Got it
          </button>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="w-14 h-14 rounded-full bg-[#e8f9ef] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#2da05b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <p className="font-extrabold text-[14px] text-[#002f76]">Leave Filed Successfully!</p>
            <p className="text-[13px] font-semibold text-[#5a6e8c] mt-1">
              Your leave request has been submitted and is pending admin approval. You will be notified once it's reviewed.
            </p>
          </div>
        </div>
      </Modal>

    </TeacherShell>
  );
}
