"use client";

import { useState } from "react";
import type { Teacher } from "@/data/teachers";
import { Modal } from "@/components/ui/modal";

type TeacherCardProps = {
  teacher: Teacher;
};

function EmailIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
}

function PhoneIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
}

export function TeacherCard({ teacher }: TeacherCardProps) {
  const [loading, setLoading] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [shiftClass, setShiftClass] = useState(teacher.classAssigned || "");
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);

  // Leave Form State
  const [leaveType, setLeaveType] = useState("Sick Leave");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  const isOnLeave = teacher.status === "on-leave";

  async function handleFileLeave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: teacher.id,
          teacherName: teacher.name,
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
      }
    } catch (e) {
      console.error("Failed to file leave", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveShifts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${teacher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedRoom: shiftClass }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error("Failed to save shifts", e);
    } finally {
      setLoading(false);
      setIsEditModalOpen(false);
    }
  }

  return (
    <article
      className={`relative flex flex-col rounded-[1.25rem] bg-white shadow-[0_4px_20px_-4px_rgba(0,47,118,0.10)] border border-[#e8effe] overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-6px_rgba(0,47,118,0.16)] ${isOnLeave ? "opacity-80" : ""}`}
    >
      {/* ON LEAVE badge */}
      {isOnLeave && (
        <div className="absolute top-3 right-5 bg-[#f0f0f0] text-[#777] text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full">
          ON LEAVE
        </div>
      )}

      {/* Card body */}
      <div className="px-5 pt-5 pb-4 flex flex-col gap-3 flex-1">
        {/* Avatar + name */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            {teacher.avatarUrl ? (
              <img
                src={teacher.avatarUrl}
                alt={teacher.name}
                referrerPolicy="no-referrer"
                className={`w-14 h-14 rounded-full object-cover border-[3px] border-white shadow-md ${isOnLeave ? "grayscale opacity-80" : ""}`}
              />
            ) : (
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-extrabold text-[18px] border-[3px] border-white shadow-md ${isOnLeave ? "grayscale" : ""}`}
                style={{ backgroundColor: teacher.avatarColor }}
              >
                {teacher.initials}
              </div>
            )}
            {/* Online dot — only for active */}
            {!isOnLeave && (
              <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#2da05b] border-2 border-white" />
            )}
          </div>

          {/* Name + role */}
          <div className="mt-0.5 min-w-0">
            <p className="font-headline text-[16px] font-extrabold text-[#002f76] leading-tight truncate">
              {teacher.name}
            </p>
            <p className="text-[12.5px] font-semibold text-[#5a6e8c] mt-0.5">{teacher.role}</p>
          </div>
        </div>

        {/* Class chip */}
        <div>
          {teacher.classAssigned ? (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-bold border ${teacher.role === "Lead Teacher"
                ? "bg-[#fff8e1] text-[#a07000] border-[#ffd54f]"
                : "bg-[#e8effe] text-[#0050d5] border-[#c5d6ff]"
                }`}
            >
              {teacher.classAssigned}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-bold bg-[#f4f4f4] text-[#999] border border-[#e0e0e0]">
              Unassigned
            </span>
          )}
        </div>

        {/* Contact info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[12.5px] text-[#5a6e8c]">
            <span className={isOnLeave ? "text-[#bbb]" : "text-[#0050d5]"}>
              <EmailIcon />
            </span>
            <span className="truncate font-semibold">{teacher.email}</span>
          </div>
          <div className="flex items-center gap-2 text-[12.5px] text-[#5a6e8c]">
            <span className={isOnLeave ? "text-[#bbb]" : "text-[#0050d5]"}>
              <PhoneIcon />
            </span>
            <span className="font-semibold">{teacher.phone}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#f0f4f9] mx-5" />

      {/* Action buttons */}
      <div className="px-5 py-3 flex items-center gap-2">
        {isOnLeave ? (
          <button className="flex-1 rounded-[10px] border border-[#d0d8e8] py-2 text-[13px] font-bold text-[#5a6e8c] hover:bg-[#f0f4f9] transition-colors">
            View Profile
          </button>
        ) : (
          <>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex-1 rounded-[10px] border border-[#c5d6ff] bg-[#f0f5ff] py-2 text-[12.5px] font-bold text-[#0050d5] hover:bg-[#dde8ff] transition-colors truncate px-1"
            >
              Edit
            </button>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="flex-1 rounded-[10px] border border-[#e2e8f0] bg-white py-2 text-[12.5px] font-bold text-[#4a5568] hover:bg-[#f0f4f9] transition-colors truncate px-1"
            >
              File Leave
            </button>
          </>
        )}
      </div>

      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="File Leave"
        description={`Submit a leave request for ${teacher.name}.`}
        footer={
          <>
            <button
              onClick={() => setIsLeaveModalOpen(false)}
              className="px-4 py-2 rounded-lg font-bold text-[13px] text-[#4a5568] hover:bg-[#e2e8f0] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleFileLeave}
              disabled={loading || !leaveStartDate || !leaveEndDate}
              className="px-4 py-2 rounded-lg font-bold text-[13px] text-white bg-[#0050d5] hover:bg-[#003c9e] transition-colors disabled:opacity-50"
            >
              {loading ? "Filing..." : "Confirm Leave"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-[#fff0f0] border border-[#ffd5d5] rounded-xl p-3 text-[12.5px] font-bold text-[#ba1a1a]">
            This action will immediately update their status on the dashboard and remove them from active shifts.
          </div>

          <div>
            <label className="block text-[13px] font-extrabold text-[#002f76] mb-1.5">Leave Type</label>
            <select
              value={leaveType}
              onChange={e => setLeaveType(e.target.value)}
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
                onChange={e => setLeaveStartDate(e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-xl px-3 py-2 text-[13px] font-bold text-[#002f76] focus:outline-none focus:border-[#0050d5] focus:ring-1 focus:ring-[#0050d5] bg-white shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[13px] font-extrabold text-[#002f76] mb-1.5">End Date</label>
              <input
                type="date"
                value={leaveEndDate}
                onChange={e => setLeaveEndDate(e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-xl px-3 py-2 text-[13px] font-bold text-[#002f76] focus:outline-none focus:border-[#0050d5] focus:ring-1 focus:ring-[#0050d5] bg-white shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-extrabold text-[#002f76] mb-1.5">Reason (Optional)</label>
            <textarea
              value={leaveReason}
              onChange={e => setLeaveReason(e.target.value)}
              rows={2}
              placeholder="Provide a brief reason..."
              className="w-full border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#002f76] focus:outline-none focus:border-[#0050d5] focus:ring-1 focus:ring-[#0050d5] bg-white shadow-sm resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Shifts"
        description={`Modify class assignments for ${teacher.name}.`}
        footer={
          <>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-lg font-bold text-[13px] text-[#4a5568] hover:bg-[#e2e8f0] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveShifts}
              disabled={loading}
              className="px-4 py-2 rounded-lg font-bold text-[13px] text-white bg-[#0050d5] hover:bg-[#003c9e] transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="relative z-20">
            <label className="block text-[13px] font-extrabold text-[#002f76] mb-1.5">Assigned Class</label>
            <div 
              onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
              className={`w-full border ${isClassDropdownOpen ? "border-[#0050d5] ring-1 ring-[#0050d5]" : "border-[#e2e8f0] hover:border-[#0050d5]"} rounded-xl px-3 py-2.5 text-[13px] font-bold text-[#002f76] bg-white shadow-sm cursor-pointer flex justify-between items-center transition-colors`}
            >
              <span>{shiftClass || "Unassigned"}</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-transform ${isClassDropdownOpen ? "rotate-180" : ""}`}>
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </div>

            {isClassDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsClassDropdownOpen(false)} />
                <div className="absolute left-0 right-0 mt-2 bg-white border border-[#e2e8f0] shadow-lg rounded-xl z-20 py-1 overflow-hidden">
                  {["Unassigned", "Little Explorers", "Tiny Explorers"].map((option) => (
                    <div 
                      key={option}
                      onClick={() => {
                        setShiftClass(option === "Unassigned" ? "" : option);
                        setIsClassDropdownOpen(false);
                      }}
                      className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer transition-colors ${
                        (shiftClass === option || (shiftClass === "" && option === "Unassigned"))
                          ? "bg-[#f0f5ff] text-[#0050d5]"
                          : "text-[#002f76] hover:bg-[#f8fafc]"
                      }`}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div>
            <label className="block text-[13px] font-extrabold text-[#002f76] mb-1.5">Shift Time</label>
            <input
              type="text"
              defaultValue="8:00 AM - 5:00 PM"
              disabled
              className="w-full border border-[#e2e8f0] bg-[#f8fafc] rounded-xl px-3 py-2.5 text-[13px] font-bold text-[#9aa3b2] cursor-not-allowed shadow-sm"
            />
            <p className="text-[11px] text-[#a0aec0] mt-1.5 font-bold">Standard shifting applies. Custom times coming soon.</p>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Leave Request Submitted"
        footer={
          <button
            onClick={() => setIsSuccessModalOpen(false)}
            className="px-5 py-2 rounded-lg font-bold text-[13px] text-white bg-[#0050d5] hover:bg-[#003c9e] transition-colors"
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
            <p className="font-extrabold text-[14px] text-[#002f76]">Request Submitted!</p>
            <p className="text-[13px] font-semibold text-[#5a6e8c] mt-1">
              Leave request for <span className="font-extrabold text-[#002f76]">{teacher.name}</span> has been submitted and is pending admin approval.
            </p>
          </div>
        </div>
      </Modal>
    </article>
  );
}
