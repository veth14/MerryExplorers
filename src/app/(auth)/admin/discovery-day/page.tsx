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

function MetricCard({
  label, value, borderColor, textColor, metaIcon, metaText, metaColor, svgDecoration
}: {
  label: string; value: number | string; borderColor: string; textColor: string;
  metaIcon: string; metaText: string; metaColor: string; svgDecoration: React.ReactNode;
}) {
  return (
    <article className={`relative overflow-hidden rounded-[1.25rem] bg-white px-5 pb-5 pt-5 border-b-[4px] ${borderColor} shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)]`}>
      <div className="absolute right-2 top-2 w-[72px] h-[54px] opacity-70 pointer-events-none">{svgDecoration}</div>
      <p className={`text-[11.5px] font-extrabold uppercase tracking-widest ${textColor}`}>{label}</p>
      <p className="font-headline text-[42px] font-extrabold leading-none tracking-tight text-[#002f76] mt-2">{value}</p>
      <p className={`mt-2.5 text-[13px] font-bold ${metaColor} flex items-center gap-1.5`}>
        <span>{metaIcon}</span> {metaText}
      </p>
    </article>
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
    <AppShell title="Discovery Day Results" description="Manage quiz submissions from the Merry Explorers Fit Score.">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-[3px] bg-[#ffb800]" />
          <h1 className="text-[14px] font-black uppercase tracking-[0.1em] text-[#002f76]">Results Overview</h1>
        </div>
        <button
          onClick={fetchResults}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold text-white bg-[#002f76] rounded-full hover:bg-[#00256a] transition-colors disabled:opacity-60"
        >
          {loading ? (
            <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M21 12a9 9 0 1 1-9-9" /><path d="M21 3v5h-5" />
            </svg>
          )}
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

        {/* Metric Cards */}
        <section className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <MetricCard 
            label="Total Submissions" value={loading ? "—" : total} 
            borderColor="border-[#005cc8]" textColor="text-[#005cc8]" 
            metaIcon="📋" metaText="All quiz completions" metaColor="text-[#005cc8]"
            svgDecoration={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full"><rect x="24" y="20" width="32" height="24" rx="4" fill="#dbe8ff" stroke="#005cc8" strokeWidth="2" /><line x1="32" y1="28" x2="48" y2="28" stroke="#005cc8" strokeWidth="2" strokeLinecap="round" /><line x1="32" y1="36" x2="40" y2="36" stroke="#005cc8" strokeWidth="2" strokeLinecap="round" /></svg>}
          />
          <MetricCard 
            label="Needs Follow-up" value={loading ? "—" : newCount} 
            borderColor="border-[#ffb800]" textColor="text-[#ffb800]" 
            metaIcon="⏳" metaText="Awaiting contact" metaColor="text-[#ffb800]"
            svgDecoration={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full"><circle cx="40" cy="28" r="22" fill="#fff9e6" stroke="#ffb800" strokeWidth="2" /><line x1="40" y1="12" x2="40" y2="28" stroke="#ffb800" strokeWidth="3" strokeLinecap="round" /><line x1="40" y1="28" x2="52" y2="36" stroke="#002f76" strokeWidth="3" strokeLinecap="round" /><circle cx="40" cy="28" r="3" fill="#002f76" /></svg>}
          />
          <MetricCard 
            label="Trailblazers" value={loading ? "—" : (programCounts["Trailblazer"] || 0)} 
            borderColor="border-[#9333ea]" textColor="text-[#9333ea]" 
            metaIcon="🚀" metaText="Top recommendation" metaColor="text-[#9333ea]"
            svgDecoration={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" className="w-full h-full"><circle cx="40" cy="28" r="22" fill="#faf5ff" stroke="#9333ea" strokeWidth="2" /><path d="M40 14 C36 14 30 18 30 24 V34 L26 38 H54 L50 34 V24 C50 18 44 14 40 14 Z" fill="none" stroke="#9333ea" strokeWidth="3" strokeLinejoin="round" /></svg>}
          />
        </section>

        <div className="flex gap-4 relative items-start">
          {/* Table Container matching Inquiries */}
          <div className="flex-1 overflow-x-auto bg-white rounded-[1.5rem] p-6 shadow-sm border border-[#e4e2e1]/50">
            
            {/* Filters Row inside the table card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <h2 className="text-[20px] font-extrabold text-[#002f76]">All Results</h2>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0aec0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or email..."
                    className="pl-9 pr-4 py-2 text-[13px] font-semibold border border-[#e2e8f0] rounded-full focus:outline-none focus:border-[#005cc8] bg-[#f8fafc] w-52"
                  />
                </div>
                <select
                  value={filterProgram}
                  onChange={(e) => setFilterProgram(e.target.value)}
                  className="px-4 py-2 text-[13px] font-bold border border-[#e2e8f0] rounded-full bg-white hover:bg-[#f8fafc] transition-colors focus:outline-none focus:border-[#005cc8] appearance-none"
                  style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" viewBox="0 0 24 24" stroke="%23334155" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "12px", paddingRight: "30px" }}
                >
                  {programs.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 text-[13px] font-bold border border-[#e2e8f0] rounded-full bg-white hover:bg-[#f8fafc] transition-colors focus:outline-none focus:border-[#005cc8] appearance-none"
                  style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" viewBox="0 0 24 24" stroke="%23334155" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "12px", paddingRight: "30px" }}
                >
                  <option value="All">All Statuses</option>
                  {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {loading ? (
              <div className="p-12 text-center text-[14px] font-bold text-[#94a3b8]">Loading results…</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 bg-[#f0f5ff] rounded-full mx-auto flex items-center justify-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#005cc8" strokeWidth={2} className="w-6 h-6"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <p className="text-[14px] font-bold text-[#002f76]">No results found</p>
                <p className="text-[13px] text-[#5a6e8c] mt-1">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#f1f5f9]">
                    <th className="pb-3 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8]">Child</th>
                    <th className="pb-3 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8]">Parent / Email</th>
                    <th className="pb-3 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8]">Best Fit</th>
                    <th className="pb-3 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8]">Scores</th>
                    <th className="pb-3 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8]">Status</th>
                    <th className="pb-3 font-extrabold text-[11px] uppercase tracking-widest text-[#005cc8]">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className={`group cursor-pointer hover:bg-[#f8fafc] transition-colors ${selected?.id === r.id ? "bg-[#f0f5ff]" : ""} ${r.status === "New" ? "font-extrabold" : ""}`}
                    >
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-extrabold shrink-0 ${r.status === "New" ? "bg-[#fff8e1] text-[#a07000] ring-2 ring-[#ffb800]/40" : "bg-[#f0f5ff] text-[#005cc8]"}`}>
                            {r.childName ? r.childName.slice(0, 2).toUpperCase() : "??"}
                          </div>
                          <div>
                            <p className="text-[13px] font-extrabold text-[#002f76]">{r.childName || "—"}</p>
                            <p className="text-[11.5px] text-[#5a6e8c] font-medium">{r.childAge || "Age not provided"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <p className="text-[13px] font-bold text-[#334155]">{r.parentName}</p>
                        <p className="text-[11.5px] text-[#5a6e8c]">{r.email}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <ProgramBadge program={r.finalProgram} />
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-col gap-0.5">
                          {(r.attempted || []).map((sec) => (
                            <span key={sec} className="text-[11.5px] font-medium text-[#5a6e8c]">
                              <span className="font-bold capitalize">{sec}:</span> {r.scores?.[sec] ?? 0}/10
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <StatusBadge status={r.status as ResultStatus} />
                      </td>
                      <td className="py-4 whitespace-nowrap">
                        <p className="text-[12.5px] font-bold text-[#334155]">{formatDate(r.createdAt)}</p>
                        <p className="text-[11px] text-[#a0aec0] font-medium">{formatTime(r.createdAt)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="w-[320px] shrink-0 rounded-[1.5rem] bg-white p-6 shadow-sm border border-[#e4e2e1]/50 space-y-5 sticky top-4">
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
    </AppShell>
  );
}

