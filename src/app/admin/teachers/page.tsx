"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { TeacherMetricCard } from "@/components/teachers/teacher-metric-card";
import { TeacherCard } from "@/components/teachers/teacher-card";
import type { FilterTab, Teacher } from "@/data/teachers";
import { cachedFetch, invalidateCachePrefix } from "@/lib/cache";
import { Skeleton } from "@/components/ui/skeleton";

type AccountDoc = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  phone?: string;
  role: string;
  status?: string;
  classAssigned?: string;
  assignedRoom?: string;
  avatarUrl?: string;
  avatarColor?: string;
  initials?: string;
};

function mapAccountToTeacher(acc: AccountDoc): Teacher {
  const name = acc.fullName || `${acc.firstName ?? ""} ${acc.lastName ?? ""}`.trim() || "Unknown Teacher";
  const initials = acc.initials || name.slice(0, 2).toUpperCase();
  const COLORS = ["#ffb347", "#4a90d9", "#9b9b9b", "#6c5ce7", "#e17055", "#00b894"];
  const colorIndex = name.charCodeAt(0) % COLORS.length;
  
  return {
    id: acc.id || acc._id || "",
    name,
    initials,
    role: (acc.role === "Lead Teacher" || acc.role === "lead_teacher") ? "Lead Teacher" : "Assistant Teacher",
    status: (acc.status as "active" | "on-leave") || "active",
    classAssigned: acc.assignedRoom || acc.classAssigned || null,
    email: acc.email,
    phone: acc.phone ?? "–",
    avatarColor: acc.avatarColor || COLORS[colorIndex],
    avatarUrl: acc.avatarUrl,
  };
}

export default function TeachersPage() {
  const [accounts, setAccounts] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("All Staff");

  useEffect(() => {
    async function fetchData() {
      try {
        const json = await cachedFetch<any[]>("accounts:all", "/api/accounts", 60_000);
        if (Array.isArray(json)) {
          const teachersOnly = json.filter((acc) => (acc.role || "").toLowerCase() !== "admin");
          setAccounts(teachersOnly.map(mapAccountToTeacher));
        }
      } catch (err) {
        console.error("Failed to fetch teachers:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredTeachers = accounts.filter((t) => {
    if (activeTab === "Lead Teachers") return t.role === "Lead Teacher";
    if (activeTab === "Assistants") return t.role === "Assistant Teacher";
    return true;
  });

  const totalLeads = accounts.filter((t) => t.role === "Lead Teacher").length;
  const totalActive = accounts.filter((t) => t.status === "active").length;
  const totalOnLeave = accounts.filter((t) => t.status === "on-leave").length;

  const teacherMetrics = [
    { label: "Total Teachers", value: accounts.length.toString(), meta: "Registered accounts", type: "total" as const },
    { label: "Active Today", value: totalActive.toString(), meta: `${totalLeads} lead teachers`, type: "active" as const, totalValue: accounts.length.toString() },
    { label: "On Leave", value: totalOnLeave.toString(), meta: "Currently on leave", type: "leave" as const },
  ];

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
            totalValue={metric.totalValue}
          />
        ))}
      </section>

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
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
      {loading ? (
        <section className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-[2rem]" />
          ))}
        </section>
      ) : filteredTeachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-[#9aa3b2] gap-2">
          <p className="font-bold text-sm">No teachers found.</p>
          <p className="text-xs">Add teacher accounts from the Accounts page.</p>
        </div>
      ) : (
        <section className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filteredTeachers.map((teacher) => (
            <TeacherCard key={teacher.id} teacher={teacher} />
          ))}
        </section>
      )}
    </AppShell>
  );
}
