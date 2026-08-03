"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

type AuditEntry = {
  id: string;
  actorName: string;
  actorRole: string;
  action: "CREATE" | "EDIT" | "DELETE";
  category: string;
  targetTitle: string | null;
  details: string | null;
  createdAt: string;
};

const ACTION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  CREATE: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Created" },
  EDIT: { bg: "bg-blue-100", text: "text-blue-700", label: "Edited" },
  DELETE: { bg: "bg-red-100", text: "text-red-600", label: "Deleted" },
};

const CATEGORY_ICON: Record<string, string> = {
  announcement: "campaign",
  suspension: "event_busy",
  attendance: "fingerprint",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/* ── Custom Dropdown ─────────────────────────────────────────── */
type DropdownOption = {
  value: string;
  label: string;
  icon?: string;
  dot?: string; // tailwind bg color class for dot
};

function FilterDropdown({
  options,
  value,
  onChange,
  triggerIcon,
}: {
  options: DropdownOption[];
  value: string;
  onChange: (v: string) => void;
  triggerIcon: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2.5 bg-white rounded-2xl border-2 px-4 py-2.5 shadow-sm transition-all select-none ${
          open
            ? "border-[#005cc8] shadow-[0_0_0_3px_rgba(0,92,200,0.10)]"
            : "border-[#e2e8f0] hover:border-[#a8c4f0]"
        }`}
      >
        <span className="material-symbols-outlined text-[17px] text-[#005cc8]">{triggerIcon}</span>
        <span className="text-[13px] font-bold text-[#002f76]">{selected.label}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-3.5 h-3.5 text-[#005cc8] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown panel */}
      <div
        className={`absolute top-[calc(100%+8px)] left-0 z-50 min-w-[190px] bg-white rounded-2xl border-2 border-[#e2e8f0] shadow-[0_12px_40px_-10px_rgba(0,47,118,0.18)] overflow-hidden transition-all duration-200 origin-top-left ${
          open ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
        }`}
      >
        <div className="p-1.5 flex flex-col gap-0.5">
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-bold text-left transition-colors ${
                  isActive
                    ? "bg-[#005cc8] text-white"
                    : "text-[#002f76] hover:bg-[#f0f5ff]"
                }`}
              >
                {/* Icon or dot */}
                {opt.icon ? (
                  <span className={`material-symbols-outlined text-[17px] ${isActive ? "text-white" : "text-[#005cc8]"}`}>
                    {opt.icon}
                  </span>
                ) : opt.dot ? (
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? "bg-white/80" : opt.dot}`} />
                ) : null}
                <span className="flex-1">{opt.label}</span>
                {isActive && (
                  <span className="material-symbols-outlined text-[15px] text-white">check</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Constants ──────────────────────────────────────────────── */
const CATEGORY_OPTIONS: DropdownOption[] = [
  { value: "all", label: "All Categories", icon: "layers" },
  { value: "announcement", label: "Announcements", icon: "campaign" },
  { value: "suspension", label: "Suspensions", icon: "event_busy" },
  { value: "attendance", label: "Attendance", icon: "fingerprint" },
];

const ACTION_OPTIONS: DropdownOption[] = [
  { value: "all", label: "All Actions", icon: "bolt" },
  { value: "CREATE", label: "Created", dot: "bg-emerald-500" },
  { value: "EDIT", label: "Edited", dot: "bg-blue-500" },
  { value: "DELETE", label: "Deleted", dot: "bg-red-500" },
];

/* ── Page ───────────────────────────────────────────────────── */
export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const fetchLog = async () => {
    setLoading(true);
    try {
      const url =
        categoryFilter === "all"
          ? "/api/audit-log?limit=200"
          : `/api/audit-log?limit=200&category=${categoryFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setEntries(json.data);
    } catch (err) {
      console.error("Failed to fetch audit log:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  const filtered =
    actionFilter === "all"
      ? entries
      : entries.filter((e) => e.action === actionFilter);

  return (
    <AppShell title="Audit Log" description="Track every admin action across announcements, suspensions, and attendance.">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <FilterDropdown
          options={CATEGORY_OPTIONS}
          value={categoryFilter}
          onChange={setCategoryFilter}
          triggerIcon="filter_list"
        />
        <FilterDropdown
          options={ACTION_OPTIONS}
          value={actionFilter}
          onChange={setActionFilter}
          triggerIcon="bolt"
        />

        {/* Refresh */}
        <button
          onClick={fetchLog}
          className="ml-auto flex items-center gap-2 bg-[#005cc8] hover:bg-[#004bb0] text-white px-4 py-2.5 rounded-2xl text-[13px] font-bold transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border-2 border-[#e2e8f0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#f8faff] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#a1b0c9] text-3xl">history</span>
            </div>
            <h3 className="text-[16px] font-bold text-[#002f76] mb-1">No Log Entries</h3>
            <p className="text-[13px] text-[#5a6e8c] max-w-sm">
              No audit log entries match your filters yet. Start making changes to see them logged here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#f0f4f8] bg-[#f8faff]">
                  <th className="text-left px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-[#9aa3b2]">When</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-[#9aa3b2]">Who</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-[#9aa3b2]">Action</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-[#9aa3b2]">Category</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-[#9aa3b2]">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f4f8]">
                {filtered.map((entry) => {
                  const actionStyle = ACTION_STYLES[entry.action] ?? {
                    bg: "bg-gray-100",
                    text: "text-gray-600",
                    label: entry.action,
                  };
                  const icon = CATEGORY_ICON[entry.category] ?? "history_edu";
                  return (
                    <tr key={entry.id} className="hover:bg-[#f8faff] transition-colors">
                      {/* When */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-[12px] font-semibold text-[#5a6e8c]">
                          {formatDateTime(entry.createdAt)}
                        </span>
                      </td>
                      {/* Who */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#dbe8ff] flex items-center justify-center text-[11px] font-black text-[#005cc8] shrink-0">
                            {entry.actorName
                              .split(" ")
                              .slice(0, 2)
                              .map((w) => w[0]?.toUpperCase())
                              .join("")}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-[#002f76] leading-tight">{entry.actorName}</p>
                            <p className="text-[11px] font-semibold text-[#9aa3b2]">{entry.actorRole}</p>
                          </div>
                        </div>
                      </td>
                      {/* Action */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${actionStyle.bg} ${actionStyle.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            entry.action === "CREATE" ? "bg-emerald-500" :
                            entry.action === "DELETE" ? "bg-red-500" : "bg-blue-500"
                          }`} />
                          {actionStyle.label}
                        </span>
                      </td>
                      {/* Category */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-[#9aa3b2]">{icon}</span>
                          <span className="text-[12px] font-semibold text-[#5a6e8c] capitalize">{entry.category}</span>
                        </div>
                      </td>
                      {/* Details */}
                      <td className="px-5 py-4 max-w-[300px]">
                        <p className="text-[12px] font-medium text-[#5a6e8c] truncate">
                          {entry.details || entry.targetTitle || "—"}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-center text-[11px] font-semibold text-[#9aa3b2] mt-3">
          Showing {filtered.length} entr{filtered.length === 1 ? "y" : "ies"}
        </p>
      )}
    </AppShell>
  );
}
