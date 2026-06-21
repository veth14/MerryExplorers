"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { teacherMetrics, teachers, FilterTab } from "@/data/teachers";
import { TeacherMetricCard } from "@/components/teachers/teacher-metric-card";
import { TeacherCard } from "@/components/teachers/teacher-card";

export default function TeachersPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("All Staff");

  const filteredTeachers = teachers.filter((t) => {
    if (activeTab === "Lead Teachers") return t.role === "Lead Teacher";
    if (activeTab === "Assistants") return t.role === "Assistant Teacher";
    return true; // All Staff
  });

  return (
    <AppShell title="Teachers" description="Manage your staff, view schedules, and monitor attendance.">
      {/* Metric cards */}
      <section className="grid gap-4 grid-cols-1 md:grid-cols-3 shrink-0">
        {teacherMetrics.map((metric) => (
          <TeacherMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            meta={metric.meta}
            type={metric.type}
          />
        ))}
      </section>

      {/* Controls row */}
      <div className="flex items-center justify-between gap-4 mt-2">
        {/* Tabs */}
        <div className="flex items-center gap-2">
          {(["All Staff", "Lead Teachers", "Assistants"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${
                activeTab === tab
                  ? "bg-[#0050d5] text-white shadow-md shadow-[#0050d5]/20"
                  : "bg-white text-[#002f76] hover:bg-[#f0f5ff] border border-[#e2e8f0]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-extrabold text-[#002f76]">Sort by:</span>
          <button className="flex items-center gap-2 rounded-full border border-[#e2e8f0]/80 bg-white px-4 py-1.5 shadow-sm text-[13px] font-bold text-[#0050d5] hover:bg-[#f0f5ff] transition-colors">
            Name (A-Z)
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Teacher Grid */}
      <section className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {filteredTeachers.map((teacher) => (
          <TeacherCard key={teacher.id} teacher={teacher} />
        ))}
      </section>
    </AppShell>
  );
}
