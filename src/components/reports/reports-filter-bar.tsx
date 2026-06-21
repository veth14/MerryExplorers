"use client";

import { useState, useRef, useEffect } from "react";

function FilterIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#005cc8]">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ChevronDown({ open }: { open?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function GenerateIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

const roleOptions = ["All Staff", "Lead", "Teachers", "Assistant"] as const;

export function ReportsFilterBar() {
  const [roleOpen, setRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("Role");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRoleOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between rounded-[1.25rem] bg-white px-5 py-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-visible flex-wrap gap-4">
      <div className="flex items-center gap-5 overflow-visible">
        {/* Label */}
        <div className="flex items-center gap-2.5 shrink-0">
          <FilterIcon />
          <span className="text-[12px] font-extrabold text-[#002f76]">Report Options:</span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Report Type */}
          <button
            id="report-type-selector"
            className="flex items-center gap-2 rounded-full border border-[#e2e8f0]/80 bg-[#f8fafc] px-4 py-2 text-[12px] font-bold text-[#005cc8] hover:bg-[#e8f0fe] transition-all duration-200 whitespace-nowrap hover:border-[#005cc8]/30 hover:shadow-sm"
          >
            Attendance Summary
          </button>

          {/* Date Picker */}
          <button
            id="date-picker-button"
            className="flex items-center gap-2.5 rounded-full border border-[#e2e8f0]/80 bg-[#f8fafc] px-4 py-2 text-[12px] font-bold text-[#475569] hover:bg-[#e8f0fe] hover:text-[#005cc8] transition-all duration-200 whitespace-nowrap hover:border-[#005cc8]/30 hover:shadow-sm"
          >
            dd/mm/yyyy
            <CalendarIcon />
          </button>

          {/* Divider */}
          <div className="w-[1px] h-6 bg-[#e2e8f0] mx-1 hidden sm:block" />

          {/* Role Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="role-dropdown-trigger"
              onClick={() => setRoleOpen(!roleOpen)}
              className={`flex items-center gap-4 rounded-full border px-4 py-2 text-[12px] font-bold transition-all duration-200 whitespace-nowrap min-w-[110px] justify-between ${
                roleOpen
                  ? "border-[#005cc8]/40 bg-[#e8f0fe] text-[#005cc8] shadow-sm"
                  : "border-[#e2e8f0]/80 bg-[#f8fafc] text-[#475569] hover:bg-[#e8f0fe] hover:text-[#005cc8] hover:border-[#005cc8]/30 hover:shadow-sm"
              }`}
            >
              {selectedRole}
              <ChevronDown open={roleOpen} />
            </button>

            {/* Dropdown Menu */}
            <div
              className={`absolute top-[calc(100%+6px)] left-0 z-50 min-w-[160px] rounded-xl bg-white border border-[#e2e8f0] shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-200 origin-top ${
                roleOpen
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
              }`}
            >
              <div className="py-1.5">
                {roleOptions.map((role) => (
                  <button
                    key={role}
                    id={`role-option-${role.toLowerCase().replace(/\s/g, "-")}`}
                    onClick={() => {
                      setSelectedRole(role);
                      setRoleOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-[12px] font-bold transition-all duration-150 ${
                      selectedRole === role
                        ? "bg-[#e8f0fe] text-[#005cc8]"
                        : "text-[#475569] hover:bg-[#f8fafc] hover:text-[#005cc8]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {selectedRole === role && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-[#005cc8]">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      )}
                      {selectedRole !== role && <div className="w-3.5" />}
                      {role}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Action */}
      <button
        id="generate-report-button"
        className="flex items-center gap-2 rounded-full bg-[#005cc8] px-6 py-2.5 text-[13px] font-bold text-white shadow-md shadow-[#005cc8]/20 hover:bg-[#004bb0] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0 active:shadow-md shrink-0 ml-auto md:ml-0"
      >
        <GenerateIcon />
        Generate
      </button>
    </div>
  );
}
