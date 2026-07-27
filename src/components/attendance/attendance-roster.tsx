"use client";

import { useState } from "react";
import { StaffAttendance } from "@/data/attendance";
import { Modal } from "@/components/ui/modal";

type AttendanceRosterProps = {
  data: StaffAttendance[];
};

export function AttendanceRoster({ data }: AttendanceRosterProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<StaffAttendance["status"] | "All">("All");
  
  // Modal state
  const [selectedStaff, setSelectedStaff] = useState<StaffAttendance | null>(null);

  const filteredData = data.filter(staff => filterStatus === "All" || staff.status === filterStatus);

  const getStatusBadge = (status: StaffAttendance["status"]) => {
    switch (status) {
      case "On Time":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#f0f5ff] text-[#005cc8] border border-[#d6e4ff]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#005cc8]" />
            On Time
          </span>
        );
      case "Late":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#fffdf0] text-[#d97706] border border-[#fef08a]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]" />
            Late
          </span>
        );
      case "Absent":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#fef2f2] text-[#ef4444] border border-[#fecaca]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
            Absent
          </span>
        );
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            Completed
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-[1.5rem] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-[#e4e2e1]/50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[#002f76] text-[22px] font-extrabold tracking-tight">Staff Roster</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-4 py-2 text-[13px] font-bold text-[#002f76] hover:bg-[#f8fafc] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
              </svg>
              Filter {filterStatus !== "All" && <span className="ml-1 px-1.5 rounded-full bg-[#005cc8] text-white text-[10px]">{filterStatus}</span>}
            </button>
            {filterOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-xl bg-white shadow-lg border border-[#e2e8f0] py-1 z-20">
                {(["All", "On Time", "Late", "Absent", "Completed"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setFilterStatus(status);
                      setFilterOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-[13px] font-bold ${filterStatus === status ? "text-[#005cc8] bg-[#f0f5ff]" : "text-[#002f76] hover:bg-[#f8fafc]"}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="rounded-full bg-[#005cc8] px-5 py-2 text-[13px] font-bold text-white shadow-sm hover:bg-[#004bb0] transition-colors">
            Export
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#f1f5f9]">
              <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[30%]">Teacher Name</th>
              <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[20%]">Group</th>
              <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[15%]">Time In</th>
              <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[15%]">Time Out</th>
              <th className="pb-4 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8] w-[20%]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {filteredData.map((staff) => (
              <tr 
                key={staff.id} 
                onClick={() => setSelectedStaff(staff)}
                className="group hover:bg-[#f8fafc] transition-colors cursor-pointer"
              >
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex shrink-0 items-center justify-center text-white text-[13px] font-bold shadow-sm"
                      style={{ backgroundColor: staff.avatarColor }}
                    >
                      {staff.avatarInitials}
                    </div>
                    <span className="font-bold text-[14px] text-[#002f76]">{staff.name}</span>
                  </div>
                </td>
                <td className="py-4 text-[13.5px] font-semibold text-[#005cc8]">{staff.group}</td>
                <td className="py-4 text-[13.5px] font-bold text-[#002f76]">{staff.timeIn}</td>
                <td className="py-4 text-[13.5px] font-bold text-[#002f76]">{staff.timeOut}</td>
                <td className="py-4">{getStatusBadge(staff.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Attendance Details Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#001a4d]/40 backdrop-blur-sm"
            onClick={() => setSelectedStaff(null)}
          />

          {/* Modal Panel */}
          <div className="relative w-full max-w-lg bg-white rounded-[1.5rem] shadow-2xl border border-[#e8effe] overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-gradient-to-br from-[#002f76] to-[#0050d5] px-6 py-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-white text-[18px] font-extrabold">Attendance Details</h3>
                <p className="text-white/60 text-[12px] font-semibold mt-0.5">Daily check-in record</p>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1">

              {/* Teacher Info */}
              <div className="px-6 pt-5 pb-4 flex items-center gap-4 border-b border-[#f1f5f9]">
                <div
                  className="w-14 h-14 rounded-full shrink-0 flex items-center justify-center text-white text-[18px] font-extrabold shadow-md"
                  style={{ backgroundColor: selectedStaff.avatarColor }}
                >
                  {selectedStaff.avatarInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[16px] font-extrabold text-[#002f76] truncate">{selectedStaff.name}</h4>
                  <p className="text-[13px] font-semibold text-[#5a6e8c] truncate">{selectedStaff.group}</p>
                </div>
                <div className="shrink-0">
                  {getStatusBadge(selectedStaff.status)}
                </div>
              </div>

              {/* Time Info */}
              <div className="px-6 py-4 grid grid-cols-2 gap-4 border-b border-[#f1f5f9]">
                <div className="bg-[#f8fafc] rounded-xl p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">Clock In</p>
                  <p className="text-[20px] font-extrabold text-[#002f76]">{selectedStaff.timeIn}</p>
                </div>
                <div className="bg-[#f8fafc] rounded-xl p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">Clock Out</p>
                  <p className="text-[20px] font-extrabold text-[#002f76]">{selectedStaff.timeOut}</p>
                </div>
              </div>

              {/* Photos */}
              <div className="px-6 py-5 space-y-5">
                {selectedStaff.clockInPhotoUrl ? (
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-3">Clock In Photo</p>
                    <div className="w-full rounded-2xl overflow-hidden border border-[#e2e8f0] bg-[#f8fafc]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedStaff.clockInPhotoUrl}
                        alt="Clock In"
                        className="w-full h-auto object-contain"
                        style={{ maxHeight: "320px" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-3">Clock In Photo</p>
                    <div className="w-full h-32 rounded-2xl border-2 border-dashed border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-center">
                      <p className="text-[13px] font-semibold text-[#a0aec0]">No photo available</p>
                    </div>
                  </div>
                )}

                {selectedStaff.clockOutPhotoUrl && (
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-3">Clock Out Photo</p>
                    <div className="w-full rounded-2xl overflow-hidden border border-[#e2e8f0] bg-[#f8fafc]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedStaff.clockOutPhotoUrl}
                        alt="Clock Out"
                        className="w-full h-auto object-contain"
                        style={{ maxHeight: "320px" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

