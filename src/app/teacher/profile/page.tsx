"use client";

import { TeacherShell } from "@/components/teacher/teacher-shell";

export default function TeacherProfilePage() {
  const teacherData = {
    personalInfo: {
      fullName: "Sarah Elizabeth Jenkins",
      dateOfBirth: "May 14, 1990",
      email: "sarah.j@merryexplorers.edu",
      phone: "(555) 123-4567",
      homeAddress: "123 Maple Street, Apt 4B, Springfield, IL 62704",
    },
    workDetails: {
      role: "Lead Educator",
      assignedRoom: "Sunshine Room (Toddlers)",
      employeeId: "ME-2021-042",
      scheduleType: "Full-Time (M-F)",
    },
    profileCard: {
      firstName: "Sarah",
      lastName: "Jenkins",
      title: "Lead Educator - Toddlers",
      tags: ["Early Childhood Ed", "CPR Certified"],
      joined: "Aug 2021",
      status: "Active",
    },
    emergencyContacts: [
      {
        name: "David Jenkins",
        relationship: "Spouse",
        phone: "(555) 987-6543",
      },
      {
        name: "Martha Jenkins",
        relationship: "Mother",
        phone: "(555) 456-7890",
      },
    ],
  };

  return (
    <TeacherShell
      title="My Profile"
      description="View and update your personal and professional information."
    >
      <div className="flex gap-6 items-start">
        {/* ── Left: Profile Card ── */}
        <div
          className="flex-shrink-0 w-[220px] bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-sm"
          style={{ border: "1.5px solid #ffe9a0" }}
        >
          {/* Avatar */}
          <div
            className="w-24 h-24 rounded-full overflow-hidden mb-4"
            style={{
              border: "3px solid #ffd700",
              background: "linear-gradient(135deg, #ffe9a0 0%, #ffd700 100%)",
            }}
          >
            <div
              className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#002f76]"
              style={{ background: "#f0e6c8" }}
            >
              SJ
            </div>
          </div>

          {/* Name */}
          <h2 className="text-[17px] font-bold text-[#002f76] leading-tight">
            {teacherData.profileCard.firstName}{" "}
            {teacherData.profileCard.lastName}
          </h2>
          <p className="text-[12px] text-[#5a7184] mt-1 mb-4">
            {teacherData.profileCard.title}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 justify-center mb-5">
            {teacherData.profileCard.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                style={{
                  background:
                    tag === "CPR Certified" ? "#fff0c0" : "#ffb800",
                  color: tag === "CPR Certified" ? "#b07800" : "#fff",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div
            className="w-full border-t mb-4"
            style={{ borderColor: "#f0e6c0" }}
          />

          {/* Joined & Status */}
          <div className="flex w-full justify-around text-center">
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                style={{ color: "#a0aec0" }}
              >
                Joined
              </p>
              <p className="text-[13px] font-semibold text-[#002f76]">
                {teacherData.profileCard.joined}
              </p>
            </div>
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                style={{ color: "#a0aec0" }}
              >
                Status
              </p>
              <p
                className="text-[13px] font-semibold"
                style={{ color: "#2da05b" }}
              >
                {teacherData.profileCard.status}
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: Info Panels ── */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Personal Information */}
          <section
            className="bg-white rounded-2xl p-6 shadow-sm"
            style={{ border: "1.5px solid #e8eef5" }}
          >
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xl">🧑</span>
              <h2 className="text-[17px] font-bold text-[#002f76]">
                Personal Information
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {/* Full Name */}
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#a0aec0" }}
                >
                  Full Name
                </p>
                <div
                  className="rounded-lg px-3 py-2 text-[14px] font-semibold text-[#002f76]"
                  style={{ background: "#f9fbfd", border: "1px solid #e8eef5" }}
                >
                  {teacherData.personalInfo.fullName}
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#a0aec0" }}
                >
                  Date of Birth
                </p>
                <div
                  className="rounded-lg px-3 py-2 text-[14px] font-semibold text-[#002f76]"
                  style={{ background: "#f9fbfd", border: "1px solid #e8eef5" }}
                >
                  {teacherData.personalInfo.dateOfBirth}
                </div>
              </div>

              {/* Email */}
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#a0aec0" }}
                >
                  Email Address
                </p>
                <div
                  className="rounded-lg px-3 py-2 text-[14px] font-semibold text-[#002f76]"
                  style={{ background: "#f9fbfd", border: "1px solid #e8eef5" }}
                >
                  {teacherData.personalInfo.email}
                </div>
              </div>

              {/* Phone */}
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#a0aec0" }}
                >
                  Phone Number
                </p>
                <div
                  className="rounded-lg px-3 py-2 text-[14px] font-semibold text-[#002f76]"
                  style={{ background: "#f9fbfd", border: "1px solid #e8eef5" }}
                >
                  {teacherData.personalInfo.phone}
                </div>
              </div>

              {/* Home Address – full width */}
              <div className="col-span-2">
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#a0aec0" }}
                >
                  Home Address
                </p>
                <div
                  className="rounded-lg px-3 py-2 text-[14px] font-semibold text-[#002f76]"
                  style={{ background: "#f9fbfd", border: "1px solid #e8eef5" }}
                >
                  {teacherData.personalInfo.homeAddress}
                </div>
              </div>
            </div>
          </section>

          {/* Work Details */}
          <section
            className="bg-white rounded-2xl p-6 shadow-sm"
            style={{ border: "1.5px solid #e8eef5" }}
          >
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xl">💼</span>
              <h2 className="text-[17px] font-bold text-[#002f76]">
                Work Details
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#a0aec0" }}
                >
                  Role
                </p>
                <div
                  className="rounded-lg px-3 py-2 text-[14px] font-semibold text-[#002f76]"
                  style={{ background: "#f9fbfd", border: "1px solid #e8eef5" }}
                >
                  {teacherData.workDetails.role}
                </div>
              </div>

              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#a0aec0" }}
                >
                  Assigned Room
                </p>
                <div
                  className="rounded-lg px-3 py-2 text-[14px] font-semibold text-[#002f76]"
                  style={{ background: "#f9fbfd", border: "1px solid #e8eef5" }}
                >
                  {teacherData.workDetails.assignedRoom}
                </div>
              </div>

              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#a0aec0" }}
                >
                  Employee ID
                </p>
                <div
                  className="rounded-lg px-3 py-2 text-[14px] font-semibold text-[#002f76]"
                  style={{ background: "#f9fbfd", border: "1px solid #e8eef5" }}
                >
                  {teacherData.workDetails.employeeId}
                </div>
              </div>

              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#a0aec0" }}
                >
                  Schedule Type
                </p>
                <div
                  className="rounded-lg px-3 py-2 text-[14px] font-semibold text-[#002f76]"
                  style={{ background: "#f9fbfd", border: "1px solid #e8eef5" }}
                >
                  {teacherData.workDetails.scheduleType}
                </div>
              </div>
            </div>
          </section>

          {/* Emergency Contacts */}
          <section
            className="bg-white rounded-2xl p-6 shadow-sm"
            style={{ border: "1.5px solid #ffd7d7" }}
          >
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xl">🚑</span>
              <h2 className="text-[17px] font-bold text-[#002f76]">
                Emergency Contacts
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              {teacherData.emergencyContacts.map((contact) => (
                <div
                  key={contact.name}
                  className="flex items-center gap-4 rounded-xl px-4 py-3"
                  style={{
                    background: "#fff8f8",
                    border: "1px solid #ffe4e4",
                  }}
                >
                  {/* Avatar icon */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "#ffd7d7" }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="12" cy="8" r="4" fill="#e05252" />
                      <path
                        d="M4 20c0-4 3.582-7 8-7s8 3 8 7"
                        stroke="#e05252"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Name & Relationship */}
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-[#002f76] leading-tight">
                      {contact.name}
                    </p>
                    <p
                      className="text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: "#e05252" }}
                    >
                      {contact.relationship}
                    </p>
                  </div>

                  {/* Phone */}
                  <p className="text-[14px] font-semibold text-[#002f76]">
                    {contact.phone}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </TeacherShell>
  );
}