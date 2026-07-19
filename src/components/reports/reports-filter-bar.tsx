"use client";

import { useState, useRef, useEffect } from "react";

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
    <div className="flex flex-col md:flex-row md:items-center justify-between rounded-[2rem] bg-white px-6 py-4 shadow-lg border-2 border-brand-sky overflow-visible gap-4 w-full">
      <div className="flex flex-wrap items-center gap-3 overflow-visible">
        {/* Label */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "20px" }}>
            tune
          </span>
          <span className="text-[13px] font-black text-brand-navy">Report Options:</span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Report Type */}
          <button
            id="report-type-selector"
            className="flex items-center gap-2 rounded-full border border-brand-sky bg-brand-sky/40 px-4 py-2 text-[12px] font-bold text-brand-navy hover:bg-brand-sky transition-all duration-200 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "16px" }}>
              summarize
            </span>
            Attendance Summary
          </button>

          {/* Date Picker */}
          <button
            id="date-picker-button"
            className="flex items-center gap-2.5 rounded-full border border-brand-sky bg-brand-sky/40 px-4 py-2 text-[12px] font-bold text-brand-navy hover:bg-brand-sky transition-all duration-200 whitespace-nowrap"
          >
            dd/mm/yyyy
            <span className="material-symbols-outlined text-brand-blue" style={{ fontSize: "16px" }}>
              calendar_month
            </span>
          </button>

          {/* Divider */}
          <div className="w-[1px] h-6 bg-brand-sky mx-1 hidden sm:block" />

          {/* Role Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="role-dropdown-trigger"
              onClick={() => setRoleOpen(!roleOpen)}
              className={`flex items-center gap-4 rounded-full border px-4 py-2 text-[12px] font-bold transition-all duration-200 whitespace-nowrap min-w-[110px] justify-between ${
                roleOpen
                  ? "border-brand-blue/40 bg-brand-sky text-brand-blue shadow-sm"
                  : "border-brand-sky bg-brand-sky/40 text-brand-navy hover:bg-brand-sky"
              }`}
            >
              {selectedRole}
              <span
                className="material-symbols-outlined text-brand-blue transition-transform duration-200"
                style={{
                  fontSize: "16px",
                  transform: roleOpen ? "rotate(180deg)" : "none",
                }}
              >
                expand_more
              </span>
            </button>

            {/* Dropdown Menu */}
            <div
              className={`absolute top-[calc(100%+6px)] left-0 z-50 min-w-[160px] rounded-2xl bg-white border-2 border-brand-sky shadow-lg transition-all duration-200 origin-top ${
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
                    className={`w-full text-left px-4 py-2.5 text-[12px] font-bold transition-all duration-150 flex items-center gap-2.5 ${
                      selectedRole === role
                        ? "bg-brand-sky text-brand-blue"
                        : "text-brand-navy hover:bg-brand-sky/60 hover:text-brand-blue"
                    }`}
                  >
                    {selectedRole === role ? (
                      <span
                        className="material-symbols-outlined text-brand-blue"
                        style={{ fontSize: "16px" }}
                      >
                        check
                      </span>
                    ) : (
                      <div className="w-4" />
                    )}
                    {role}
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
        className="flex items-center gap-2 rounded-full bg-brand-blue px-6 py-2.5 text-[13px] font-bold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0 shrink-0 ml-auto md:ml-0"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
          autorenew
        </span>
        Generate
      </button>
    </div>
  );
}
