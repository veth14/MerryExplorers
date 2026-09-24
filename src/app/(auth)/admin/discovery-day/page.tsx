"use client";

import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/app-shell";

type ResultStatus = "New" | "Contacted" | "Enrolled" | "Closed";

type DiscoveryResult = {
  id: string;
  parentName: string;
  email: string;
  childName: string;
  childAge: string;
  scores: Record<string, number>;
  finalProgram: string;
  attempted: string[];
  status: ResultStatus;
  createdAt: string;
};

const STATUS_STYLES: Record<ResultStatus, { bg: string; text: string; dot: string }> = {
  New:       { bg: "bg-[#fff8e1]", text: "text-[#a07000]", dot: "bg-[#ffb800]" },
  Contacted: { bg: "bg-[#f0f5ff]", text: "text-[#005cc8]", dot: "bg-[#005cc8]" },
  Enrolled:  { bg: "bg-[#e8f9ef]", text: "text-[#1a7f4b]", dot: "bg-[#2da05b]" },
  Closed:    { bg: "bg-[#f3f4f6]", text: "text-[#4b5563]", dot: "bg-[#9ca3af]" },
};

const PROGRAM_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Curious Explorer":  { bg: "bg-sky-50",    text: "text-sky-700",    border: "border-sky-200" },
  "Creative Explorer": { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
  "Trailblazer":       { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
};

const ALL_STATUSES: ResultStatus[] = ["New", "Contacted", "Enrolled", "Closed"];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function StatusBadge({ status }: { status: ResultStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES["New"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function ProgramBadge({ program }: { program: string }) {
  const s = PROGRAM_STYLES[program] ?? { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${s.bg} ${s.text} ${s.border}`}>
      {program}
    </span>
  );
}

export default function DiscoveryDayAdminPage() {
  const [results, setResults] = useState<DiscoveryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterProgram, setFilterProgram] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [selected, setSelected] = useState<DiscoveryResult | null>(null);
  const [updating, setUpdating] = useState(false);

  async function fetchResults() {
    setLoading(true);
    try {
      const res = await fetch("/api/discovery-day-results");
      const json = await res.json();
      if (json.success) setResults(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchResults(); }, []);

  async function updateStatus(id: string, status: ResultStatus) {
    setUpdating(true);
    try {
      await fetch(`/api/discovery-day-results/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setResults((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
      setSelected((prev) => prev?.id === id ? { ...prev, status } : prev);
    } finally {
      setUpdating(false);
    }
  }

  const programs = useMemo(() => {
    const set = new Set(results.map((r) => r.finalProgram));
    return ["All", ...Array.from(set)];
  }, [results]);

  const filtered = useMemo(() => {
    return results.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.parentName?.toLowerCase().includes(q) ||
        r.childName?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q);
      const matchProgram = filterProgram === "All" || r.finalProgram === filterProgram;
      const matchStatus = filterStatus === "All" || r.status === filterStatus;
      return matchSearch && matchProgram && matchStatus;
    });
  }, [results, search, filterProgram, filterStatus]);

  const total = results.length;
  const newCount = results.filter((r) => r.status === "New").length;
  const programCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    results.forEach((r) => { counts[r.finalProgram] = (counts[r.finalProgram] || 0) + 1; });
    return counts;
  }, [results]);

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl font-extrabold text-[#002f76]">
              Discovery Day Results
            </h1>
            <p className="text-sm text-[#64748b] mt-0.5">
              Quiz submissions from the Merry Explorers Fit Score
            </p>
          </div>
          <button
            onClick={fetchResults}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0033A0] text-white text-sm font-bold hover:bg-[#002080] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white border border-[#e2e8f0] px-5 py-4 shadow-sm">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#64748b]">Total Submissions</p>
            <p className="font-headline text-4xl font-extrabold text-[#002f76] mt-1">{loading ? "—" : total}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#e2e8f0] px-5 py-4 shadow-sm">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-amber-600">Needs Follow-up</p>
            <p className="font-headline text-4xl font-extrabold text-amber-600 mt-1">{loading ? "—" : newCount}</p>
          </div>
          {Object.entries(programCounts).slice(0, 2).map(([prog, count]) => (
            <div key={prog} className="rounded-2xl bg-white border border-[#e2e8f0] px-5 py-4 shadow-sm">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#64748b] truncate">{prog}</p>
              <p className="font-headline text-4xl font-extrabold text-[#002f76] mt-1">{count}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1 min-w-[200px] rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-medium text-[#334155] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#0033A0]/40"
          />
          <select
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
            className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-bold text-[#334155] focus:outline-none focus:border-[#0033A0]/40"
          >
            {programs.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-bold text-[#334155] focus:outline-none focus:border-[#0033A0]/40"
          >
            <option value="All">All Statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex gap-4 relative items-start">
          {/* Table */}
          <div className="flex-1 overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-sm font-bold text-[#94a3b8]">Loading results…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-sm font-bold text-[#64748b]">No results found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                    <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#64748b]">Child</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#64748b]">Parent / Email</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#64748b]">Best Fit</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#64748b]">Scores</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#64748b]">Status</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#64748b]">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className={`border-b border-[#f1f5f9] cursor-pointer transition-colors hover:bg-[#f8faff] ${selected?.id === r.id ? "bg-[#f0f5ff]" : i % 2 === 0 ? "bg-white" : "bg-[#fafbff]"}`}
                    >
                      <td className="px-5 py-4">
                        <p className="font-extrabold text-[#002f76]">{r.childName || "—"}</p>
                        <p className="text-[12px] text-[#94a3b8] font-medium">{r.childAge || "Age not provided"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-[#334155]">{r.parentName}</p>
                        <p className="text-[12px] text-[#94a3b8]">{r.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <ProgramBadge program={r.finalProgram} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          {(r.attempted || []).map((sec) => (
                            <span key={sec} className="text-[12px] font-medium text-[#64748b]">
                              <span className="font-bold capitalize">{sec}:</span> {r.scores?.[sec] ?? 0}/10
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={r.status as ResultStatus} />
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-[12px] font-bold text-[#334155]">{formatDate(r.createdAt)}</p>
                        <p className="text-[11px] text-[#94a3b8]">{formatTime(r.createdAt)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="w-[300px] shrink-0 rounded-2xl border border-[#e2e8f0] bg-white shadow-sm p-5 space-y-4 sticky top-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-headline text-base font-extrabold text-[#002f76] leading-tight">
                  {selected.childName ? `${selected.childName}'s` : "Child's"} Results
                </h2>
                <button onClick={() => setSelected(null)} className="text-[#94a3b8] hover:text-[#334155] p-1 rounded-lg hover:bg-[#f1f5f9]">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Child Info */}
              <div className="rounded-xl bg-[#f8fafc] p-4 space-y-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#94a3b8]">Child</p>
                  <p className="font-bold text-[#334155]">
                    {selected.childName || "—"}{" "}
                    <span className="font-medium text-[#94a3b8]">({selected.childAge || "age not set"})</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#94a3b8]">Parent</p>
                  <p className="font-bold text-[#334155]">{selected.parentName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#94a3b8]">Email</p>
                  <a href={`mailto:${selected.email}`} className="font-bold text-[#0033A0] hover:underline break-all text-sm">{selected.email}</a>
                </div>
              </div>

              {/* Best Fit */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#94a3b8] mb-2">Best Fit Program</p>
                <ProgramBadge program={selected.finalProgram} />
              </div>

              {/* Score Bars */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#94a3b8] mb-2">Scores</p>
                <div className="space-y-2.5">
                  {(selected.attempted || []).map((sec) => {
                    const score = selected.scores?.[sec] ?? 0;
                    return (
                      <div key={sec}>
                        <div className="flex justify-between mb-1">
                          <span className="text-[12px] font-bold text-[#334155] capitalize">{sec}</span>
                          <span className="text-[12px] font-extrabold text-[#002f76]">{score}/10</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#e2e8f0] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#0033A0] to-[#0047df] transition-all"
                            style={{ width: `${(score / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Buttons */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#94a3b8] mb-2">Update Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      disabled={updating || selected.status === s}
                      onClick={() => updateStatus(selected.id, s)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                        selected.status === s
                          ? "bg-[#0033A0] text-white border-[#0033A0]"
                          : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#0033A0]/40 hover:text-[#0033A0]"
                      } disabled:opacity-50`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Email */}
              <div className="pt-2 border-t border-[#f1f5f9]">
                <a
                  href={`mailto:${selected.email}?subject=Your Discovery Day Booking – Merry Explorers&body=Hi ${selected.parentName},%0A%0AThank you for completing our Discovery Day Fit Score quiz! Based on your results, ${selected.childName || "your child"} is a great fit for our ${selected.finalProgram} program.%0A%0AWe'd love to invite you to book a Discovery Day slot. Please reply to this email to schedule your visit.%0A%0AWarmly,%0AThe Merry Explorers Team`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0033A0] text-white text-[12px] font-bold hover:bg-[#002080] transition-colors"
                >
                  ✉ Email Parent
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

