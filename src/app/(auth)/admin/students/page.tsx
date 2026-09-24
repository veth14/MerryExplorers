"use client";

import { useEffect, useState } from "react";
import { m } from "framer-motion";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

interface Student {
  id: string;
  registrationId: string;
  program: string;
  programName: string;
  classTime: string;
  childInfo: { firstName: string; lastName: string; nickname?: string };
  parentInfo: { name: string; email: string; phone: string };
  enrolledAt: string;
  status: string;
}

const PROGRAM_ACCENTS: Record<string, string> = {
  "curious-explorer": "#FFC107",
  "creative-explorer": "#0033A0",
  "brave-explorer": "#1a2e6b",
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [programFilter, setProgramFilter] = useState("all");

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch("/api/students");
        const data = await res.json();
        if (data.success) setStudents(data.data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    fetchStudents();
  }, []);

  const filtered = students.filter(s => programFilter === "all" || s.program === programFilter);

  return (
    <AppShell title="Students">
      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { id: "all", label: "All Programs" },
          { id: "curious-explorer", label: "Curious Explorer" },
          { id: "everyday-curious", label: "Everyday Curious" },
          { id: "creative-explorer", label: "Creative Explorer" },
          { id: "brave-explorer", label: "Brave Explorer" },
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setProgramFilter(filter.id)}
            className={[
              "rounded-2xl px-4 py-2 text-[13px] font-bold transition-all duration-150",
              programFilter === filter.id
                ? "bg-[#0033A0] text-white shadow-md shadow-[#0033A0]/20"
                : "bg-white border border-slate-200 text-[#64748b] hover:border-[#0033A0]/30",
            ].join(" ")}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-[#64748b] animate-pulse">Loading students...</div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white/70 text-center p-8">
          <span className="text-4xl mb-3">🧒</span>
          <p className="text-[16px] font-bold text-[#0033A0]">No students found</p>
          <p className="mt-1 text-[13px] text-[#64748b]">Approved registrations will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((student) => (
            <Link key={student.id} href={`/admin/students/${student.id}`}>
              <m.div
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex flex-col h-full rounded-[1.5rem] bg-white border border-slate-100 overflow-hidden shadow-sm hover:shadow-md hover:border-[#0033A0]/30 transition-all duration-200 cursor-pointer"
              >
                {/* Header color bar */}
                <div className="h-2 w-full shrink-0 transition-colors" style={{ backgroundColor: PROGRAM_ACCENTS[student.program] || "#64748b" }} />

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-[16px] font-extrabold text-[#002f76]">
                        {student.childInfo.firstName} {student.childInfo.lastName}
                      </h3>
                      {student.childInfo.nickname && (
                        <p className="text-[12px] text-[#94a3b8]">&quot;{student.childInfo.nickname}&quot;</p>
                      )}
                    </div>
                    <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#f8fafc] text-sm group-hover:bg-[#0033A0] group-hover:text-white transition-colors">
                      →
                    </span>
                  </div>

                  <div className="space-y-1 mb-4 flex-1">
                    <p className="text-[12px] font-bold text-[#64748b]">{student.programName}</p>
                    <p className="text-[12px] text-[#94a3b8]">{student.classTime}</p>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-[#94a3b8]">
                    <span>Enrolled {new Date(student.enrolledAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </m.div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
