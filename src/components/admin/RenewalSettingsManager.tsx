"use client";

import { useEffect, useState } from "react";

// Visual metadata for programs
export const PROGRAM_CONFIG_META: Record<string, { emoji: string; color: string; bg: string; border: string; gradient: string; short: string; badge: string }> = {
  "Discovery Club: Curious Explorer": {
    emoji: "🔎",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
    gradient: "from-amber-500/10 to-orange-500/10",
    short: "Curious Explorer",
    badge: "bg-amber-100 text-amber-900 border-amber-300",
  },
  "Discovery Club: Creative Explorer": {
    emoji: "🎨",
    color: "#0284c7",
    bg: "#f0f9ff",
    border: "#bae6fd",
    gradient: "from-sky-500/10 to-blue-500/10",
    short: "Creative Explorer",
    badge: "bg-sky-100 text-sky-900 border-sky-300",
  },
  "Discovery Club: Everyday Curious": {
    emoji: "🌈",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    gradient: "from-emerald-500/10 to-teal-500/10",
    short: "Everyday Curious",
    badge: "bg-emerald-100 text-emerald-900 border-emerald-300",
  },
  "Trailblazer: Brave Explorer": {
    emoji: "🏕️",
    color: "#4f46e5",
    bg: "#eef2ff",
    border: "#c7d2fe",
    gradient: "from-indigo-500/10 to-violet-500/10",
    short: "Brave Explorer",
    badge: "bg-indigo-100 text-indigo-900 border-indigo-300",
  },

};

export type ProgramRenewalEntry = {
  programKey: string;
  currentAdventure: number;
  nextAdventureStart: string | null;
  renewalOpen: boolean;
  renewalOpenDate: string | null;
  virtualLink?: string;
  virtualLinkOpen?: boolean;
};

export type RenewalSettingsData = {
  programs: ProgramRenewalEntry[];
  updatedAt: string | null;
};

const DEFAULT_PROGRAMS: string[] = [
  "Discovery Club: Curious Explorer",
  "Discovery Club: Creative Explorer",
  "Discovery Club: Everyday Curious",
  "Trailblazer: Brave Explorer",
];

export function RenewalSettingsManager() {
  const [programs, setPrograms] = useState<ProgramRenewalEntry[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadSettings = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch("/api/renewal-settings");
      const d = await res.json();
      if (Array.isArray(d.programs)) {
        // Merge with DEFAULT_PROGRAMS ensuring every key exists
        const merged: ProgramRenewalEntry[] = DEFAULT_PROGRAMS.map((key) => {
          const existing = d.programs.find((p: ProgramRenewalEntry) => p.programKey === key);
          return existing ?? {
            programKey: key,
            currentAdventure: 2,
            nextAdventureStart: null,
            renewalOpen: true,
            renewalOpenDate: null,
            virtualLink: "",
            virtualLinkOpen: false,
          };
        });
        setPrograms(merged);
        setUpdatedAt(d.updatedAt || null);
      }
    } catch {
      setErrorMsg("Failed to load settings. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateProgram = (key: string, patch: Partial<ProgramRenewalEntry>) => {
    setPrograms((prev) =>
      prev.map((item) => (item.programKey === key ? { ...item, ...patch } : item))
    );
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setSavedSuccess(false);
      setErrorMsg("");
      const res = await fetch("/api/renewal-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programs }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.programs)) {
        setPrograms(data.programs);
        setUpdatedAt(new Date().toISOString());
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3500);
      } else {
        setErrorMsg(data.error || "Failed to save settings");
      }
    } catch {
      setErrorMsg("Network error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const openProgramsCount = programs.filter((p) => p.renewalOpen).length;

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner ── */}
      <div className="rounded-3xl bg-gradient-to-r from-[#002f76] via-[#0033a0] to-[#1e40af] p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 opacity-10 text-[160px] select-none pointer-events-none">
          ⚙️
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-[11px] font-black uppercase tracking-wider text-amber-300">
              <span>🌟 Global System Controller</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Program Adventure &amp; Schedule Settings
            </h2>
            <p className="text-[13.5px] text-blue-100 max-w-2xl leading-relaxed">
              Configure the current Adventure cycle number and start dates for each program. 
              Changes saved here instantly propagate across <strong>Registration forms</strong>, <strong>Renewal forms</strong>, and <strong>outbound parent notification emails</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <button
              onClick={handleSaveAll}
              disabled={saving || loading}
              className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#002f76] px-6 py-3.5 text-[14px] font-black shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-[#002f76]/30 border-t-[#002f76] animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Save All Settings</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status / Saved Bar */}
        {(savedSuccess || errorMsg || updatedAt) && (
          <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-[12px]">
            <div className="flex items-center gap-2">
              {savedSuccess && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/30 border border-emerald-300 text-emerald-100 font-bold">
                  ✓ Settings successfully synchronized to Registration, Renewals &amp; Emails!
                </span>
              )}
              {errorMsg && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/30 border border-rose-300 text-rose-100 font-bold">
                  ⚠️ {errorMsg}
                </span>
              )}
            </div>
            {updatedAt && (
              <span className="text-blue-200 font-medium">
                Last synchronized: {new Date(updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Summary Indicator Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">Active Programs</p>
            <p className="text-2xl font-black text-[#002f76] mt-1">{programs.length}</p>
            <p className="text-[11.5px] text-slate-500 font-medium mt-0.5">Discovery, Trailblazer &amp; Playdate</p>
          </div>
          <span className="text-3xl">📚</span>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">Registration Open</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{openProgramsCount} of {programs.length}</p>
            <p className="text-[11.5px] text-emerald-700 font-semibold mt-0.5">Accepting reservations</p>
          </div>
          <span className="text-3xl">🟢</span>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">Downpayment Deadline</p>
            <p className="text-sm font-black text-[#0033a0] mt-1.5">Auto 2 Weeks Prior</p>
            <p className="text-[11.5px] text-slate-500 font-medium mt-0.5">Calculated from start date</p>
          </div>
          <span className="text-3xl">🗓️</span>
        </div>
      </div>

      {/* ── Program Cards Grid ── */}
      {loading ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-12 text-center text-slate-500">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-[#0033a0] mb-3" />
          <p className="font-bold text-[14px]">Loading program renewal configurations...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {programs.map((prog) => {
            const meta = PROGRAM_CONFIG_META[prog.programKey] ?? {
              emoji: "🎒",
              color: "#002f76",
              bg: "#f8fafc",
              border: "#e2e8f0",
              gradient: "from-slate-500/10 to-blue-500/10",
              short: prog.programKey,
              badge: "bg-slate-100 text-slate-800 border-slate-300",
            };

            const deadlineDisplay = prog.renewalOpenDate
              ? new Date(prog.renewalOpenDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : prog.nextAdventureStart
              ? "Calculated upon save"
              : "No date set";

            const startDateDisplay = prog.nextAdventureStart
              ? new Date(prog.nextAdventureStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "Not scheduled";

            return (
              <div
                key={prog.programKey}
                className="rounded-3xl bg-white border-2 border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Card Header Strip */}
                <div className={`p-5 pb-4 border-b border-slate-100 bg-gradient-to-r ${meta.gradient}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs shrink-0"
                        style={{ backgroundColor: meta.bg, border: `2px solid ${meta.border}` }}
                      >
                        {meta.emoji}
                      </div>
                      <div>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider border mb-1 ${meta.badge}`}>
                          {meta.short}
                        </span>
                        <h3 className="font-headline text-[17px] font-black text-[#002f76]">
                          {prog.programKey}
                        </h3>
                      </div>
                    </div>

                    {/* Open / Closed Toggle Switch */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11.5px] font-black tracking-wide ${prog.renewalOpen ? "text-emerald-700" : "text-slate-400"}`}>
                          {prog.renewalOpen ? "OPEN" : "CLOSED"}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateProgram(prog.programKey, { renewalOpen: !prog.renewalOpen })}
                          className={`relative h-6 w-12 rounded-full transition-colors cursor-pointer ${
                            prog.renewalOpen ? "bg-emerald-500 shadow-emerald-500/20" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                              prog.renewalOpen ? "translate-x-6" : ""
                            }`}
                          />
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {prog.renewalOpen ? "Showing in forms" : "Hidden in forms"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Controls Body */}
                <div className="p-6 space-y-5 flex-1">
                  {/* Row: Adventure Selector & Start Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Adventure Number Selector */}
                    <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/60 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                          Current Cycle
                        </label>
                        <span className="text-[10.5px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                          Cycle / Stage
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateProgram(prog.programKey, {
                              currentAdventure: Math.max(1, (prog.currentAdventure ?? 1) - 1),
                            })
                          }
                          className="h-10 w-10 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-[#002f76] font-black text-[18px] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          −
                        </button>

                        <div className="text-center flex-1">
                          <p className="text-[20px] font-black text-[#002f76] leading-none">
                            Adventure {prog.currentAdventure ?? 1}
                          </p>
                          <p className="text-[10.5px] font-semibold text-slate-400 mt-1">
                            Cycle {prog.currentAdventure ?? 1}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            updateProgram(prog.programKey, {
                              currentAdventure: (prog.currentAdventure ?? 1) + 1,
                            })
                          }
                          className="h-10 w-10 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-[#002f76] font-black text-[18px] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Next Adventure Start Date Picker */}
                    <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/60 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                          Start Date
                        </label>
                        <span className="text-[10.5px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                          Adventure Start
                        </span>
                      </div>

                      <input
                        type="date"
                        value={prog.nextAdventureStart ? prog.nextAdventureStart.slice(0, 10) : ""}
                        onChange={(e) =>
                          updateProgram(prog.programKey, {
                            nextAdventureStart: e.target.value ? `${e.target.value}T00:00:00.000Z` : null,
                          })
                        }
                        className="w-full h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-[13px] font-black text-[#002f76] focus:border-[#0033a0] focus:outline-none transition-all cursor-pointer"
                      />

                      <p className="text-[10.5px] font-semibold text-slate-500">
                        Scheduled: <strong>{startDateDisplay}</strong>
                      </p>
                    </div>
                  </div>



                  {/* Brave Explorer Extra: Virtual Session Classroom Link */}
                  {prog.programKey === "Trailblazer: Brave Explorer" && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                          <span>🖥️</span> Trailblazer Virtual Classroom Link
                        </label>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold ${prog.virtualLinkOpen ? "text-emerald-700" : "text-slate-400"}`}>
                            {prog.virtualLinkOpen ? "Open for Students" : "Hidden"}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateProgram(prog.programKey, { virtualLinkOpen: !prog.virtualLinkOpen })}
                            className={`relative h-4 w-8 rounded-full transition-colors cursor-pointer ${
                              prog.virtualLinkOpen ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow-xs transition-transform ${
                                prog.virtualLinkOpen ? "translate-x-4" : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      <input
                        type="url"
                        placeholder="e.g. https://meet.google.com/xyz-abcd-efg"
                        value={prog.virtualLink || ""}
                        onChange={(e) => updateProgram(prog.programKey, { virtualLink: e.target.value })}
                        className="w-full rounded-xl border border-indigo-200 bg-indigo-50/40 px-3.5 py-2 text-[12.5px] font-medium text-[#002f76] placeholder:text-indigo-300 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Card Footer Live Summary */}
                <div className="bg-slate-50/80 px-6 py-3 border-t border-slate-100 text-[11.5px] font-semibold text-slate-500 flex items-center justify-between">
                  <span>
                    Sync preview: <strong>Adventure {prog.currentAdventure ?? 1}</strong>
                    {prog.nextAdventureStart ? ` · Starts ${startDateDisplay}` : ""}
                  </span>
                  <span className="text-emerald-700 font-bold">● Form Active</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bottom Save Action Bar ── */}
      <div className="sticky bottom-6 z-20 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-[12.5px] text-slate-600">
          <span className="text-lg">💡</span>
          <span>
            Once saved, dates and adventure numbers reflect instantly in registration cards, renewal selectors, and email dispatches.
          </span>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving || loading}
          className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#0033a0] hover:bg-[#002f76] text-white px-7 py-3 text-[13.5px] font-black shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer ml-auto"
        >
          {saving ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <span>💾 Save All Programs</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
