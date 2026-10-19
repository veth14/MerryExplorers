"use client";

import { useEffect, useMemo, useState } from "react";
import { computeAdventureBadge } from "@/lib/adventure-badge";

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
  "Discovery Club: Everyday Explorer": {
    emoji: "🌈",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    gradient: "from-emerald-500/10 to-teal-500/10",
    short: "Everyday Explorer",
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
  "Saturday Playdate": {
    emoji: "🛝",
    color: "#0ea5e9",
    bg: "#f0f9ff",
    border: "#bae6fd",
    gradient: "from-sky-500/10 to-cyan-500/10",
    short: "Playdate",
    badge: "bg-cyan-100 text-cyan-900 border-cyan-300",
  },
  "Ballet": {
    emoji: "🩰",
    color: "#be185d",
    bg: "#fdf2f8",
    border: "#fbcfe8",
    gradient: "from-pink-500/10 to-rose-500/10",
    short: "Ballet",
    badge: "bg-pink-100 text-pink-900 border-pink-300",
  },
  "Virtual Tutorial": {
    emoji: "🖥️",
    color: "#6d28d9",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    gradient: "from-purple-500/10 to-violet-500/10",
    short: "Virtual Tutorial",
    badge: "bg-purple-100 text-purple-900 border-purple-300",
  },
};

export type ProgramRenewalEntry = {
  programKey: string;
  currentAdventure: number;            // which adventure number the program is currently in (e.g. 2)
  adventureStartDate?: string | null;  // when current adventure started/starts (ISO or YYYY-MM-DD)
  nextAdventureStart: string | null;  // ISO date string for next adventure (e.g. Adventure 3)
  registrationOpen: boolean;          // whether public registration is open (true = open, false = closed)
  registrationAutoCloseDays?: number | null; // e.g. 7 (days after adventureStartDate to auto-close)
  customClosedMessage?: string;       // optional override for closed notice
  renewalOpen: boolean;               // whether priority renewal is open
  renewalOpenDate: string | null;     // auto-computed: 2 weeks before start
  newFamilyRegistrationOpenDate?: string | null; // optional: date when /register opens for new families
  virtualLink?: string;
  virtualLinkOpen?: boolean;
  closedClasses?: string[];           // optional: specific class/session names closed for registration (e.g. ["Baby Ballet (Morning)"])
};

export type RenewalSettingsData = {
  programs: ProgramRenewalEntry[];
  updatedAt: string | null;
};

export const BALLET_CLASSES = [
  { name: "Baby Ballet (Morning)", time: "9:00 AM – 10:00 AM", ageRange: "Ages 2.5 to 4.11", maxSlots: 6 },
  { name: "Baby Ballet (Afternoon)", time: "12:30 PM – 1:30 PM", ageRange: "Ages 2.5 to 4.11", maxSlots: 6 },
  { name: "Basic Ballet", time: "1:45 PM – 2:45 PM", ageRange: "Ages 5+", maxSlots: 8 },
] as const;

// Programs that use Adventure cycles (show current/next adventure dates + cycle stepper)
const ADVENTURE_PROGRAMS = new Set([
  "Discovery Club: Curious Explorer",
  "Discovery Club: Creative Explorer",
  "Discovery Club: Everyday Explorer",
  "Trailblazer: Brave Explorer",
  "Saturday Playdate",
]);

// Source of truth for adventure cycle auto-increment
const MASTER_PROGRAM = "Discovery Club: Curious Explorer";

export const DEFAULT_PROGRAMS: string[] = [
  "Discovery Club: Curious Explorer",
  "Discovery Club: Creative Explorer",
  "Discovery Club: Everyday Explorer",
  "Trailblazer: Brave Explorer",
  "Saturday Playdate",
  "Ballet",
  "Virtual Tutorial",
];

export function isRegistrationClosedForProgram(p: ProgramRenewalEntry): boolean {
  if (p.registrationOpen === false) return true;

  // If a new family registration open date is specified:
  if (p.newFamilyRegistrationOpenDate) {
    const openDateStr = p.newFamilyRegistrationOpenDate.slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);
    // If open date has arrived or passed, it overrides past auto-close -> it is OPEN!
    if (openDateStr <= todayStr) return false;
    // If open date is in the future, it is scheduled to open (handled by isFuture / not-yet-open state)
    return false;
  }

  // Auto-close rule: close N days after current adventure started
  if (p.adventureStartDate && p.registrationAutoCloseDays) {
    const started = new Date(p.adventureStartDate).getTime();
    const closeThreshold = started + p.registrationAutoCloseDays * 86400000;
    if (Date.now() >= closeThreshold) return true;
  }
  return false;
}

export function RenewalSettingsManager() {
  const [programs, setPrograms] = useState<ProgramRenewalEntry[]>([]);
  const [heroBadgeOverride, setHeroBadgeOverride] = useState<string>("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [rollConfirm, setRollConfirm] = useState(false);

  function fmtDate(iso?: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function toDateInput(iso?: string | null) {
    if (!iso) return "";
    return iso.slice(0, 10);
  }

  const loadSettings = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch("/api/renewal-settings");
      const d = await res.json();
      if (typeof d.heroBadgeOverride === "string") {
        setHeroBadgeOverride(d.heroBadgeOverride);
      }
      if (Array.isArray(d.programs)) {
        const merged: ProgramRenewalEntry[] = DEFAULT_PROGRAMS.map((key) => {
          const existing = d.programs.find((p: ProgramRenewalEntry) => p.programKey === key);
          return existing ?? {
            programKey: key,
            currentAdventure: 1,
            adventureStartDate: null,
            nextAdventureStart: null,
            registrationOpen: true,
            registrationAutoCloseDays: 7,
            customClosedMessage: "",
            renewalOpen: true,
            renewalOpenDate: null,
            newFamilyRegistrationOpenDate: null,
            virtualLink: "",
            virtualLinkOpen: false,
          };
        });
        // Auto-increment: if master program's nextAdventureStart has arrived, roll all adventure programs
        const master = merged.find(p => p.programKey === MASTER_PROGRAM);
        const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
        if (master?.nextAdventureStart && todayStr >= master.nextAdventureStart.slice(0, 10)) {
          const nextAdvNum = (master.currentAdventure ?? 1) + 1;
          const masterNextDate = master.nextAdventureStart;
          merged.forEach((p) => {
            if (ADVENTURE_PROGRAMS.has(p.programKey)) {
              p.currentAdventure = nextAdvNum;
              p.adventureStartDate = p.nextAdventureStart || masterNextDate;
              p.nextAdventureStart = null;
              p.registrationOpen = true;
            } else if (p.nextAdventureStart && todayStr >= p.nextAdventureStart.slice(0, 10)) {
              p.adventureStartDate = p.nextAdventureStart;
              p.nextAdventureStart = null;
              p.registrationOpen = true;
            }
          });
        }
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
        body: JSON.stringify({ programs, heroBadgeOverride: heroBadgeOverride.trim() || null }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.programs)) {
        setPrograms(data.programs);
        if (data.heroBadgeOverride !== undefined) {
          setHeroBadgeOverride(data.heroBadgeOverride || "");
        }
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

  /** Roll all adventure programs to the next cycle: increment number, shift dates */
  const handleRollAdventure = () => {
    const master = programs.find(p => p.programKey === MASTER_PROGRAM);
    const nextAdvNum = (master?.currentAdventure ?? 1) + 1;
    const masterNext = master?.nextAdventureStart;

    setPrograms((prev) =>
      prev.map((p) => {
        if (!ADVENTURE_PROGRAMS.has(p.programKey)) return p;
        return {
          ...p,
          currentAdventure: nextAdvNum,
          adventureStartDate: p.nextAdventureStart || masterNext || p.adventureStartDate, // next → current (moves to left side)
          nextAdventureStart: null,                                                        // clear right side (empty)
          registrationOpen: true,
        };
      })
    );
    setRollConfirm(false);
  };

  /** Sync Curious Explorer's next start date across all adventure programs */
  const handleSyncDateToAdventures = () => {
    const master = programs.find(p => p.programKey === MASTER_PROGRAM);
    const masterNext = master?.nextAdventureStart;
    if (!masterNext) return;
    setPrograms((prev) =>
      prev.map((p) => {
        if (!ADVENTURE_PROGRAMS.has(p.programKey)) return p;
        return {
          ...p,
          nextAdventureStart: masterNext,
        };
      })
    );
  };

  const openRegistrationCount = programs.filter((p) => !isRegistrationClosedForProgram(p)).length;
  const renewalOpenCount = programs.filter((p) => p.renewalOpen !== false).length;

  // Detect if master program's next date has been reached
  const master = useMemo(() => programs.find(p => p.programKey === MASTER_PROGRAM), [programs]);
  const masterNextReached = useMemo(() => {
    if (!master?.nextAdventureStart) return false;
    const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return todayStr >= master.nextAdventureStart.slice(0, 10);
  }, [master]);

  const liveBadge = useMemo(() => computeAdventureBadge(programs, heroBadgeOverride), [programs, heroBadgeOverride]);
  const autoBadge = useMemo(() => computeAdventureBadge(programs, null), [programs]);

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
              <span>🌟 Global Adventure &amp; Program Controller</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Programs &amp; Registration Control
            </h2>
            <p className="text-[13.5px] text-blue-100 max-w-2xl leading-relaxed">
              Manage Adventure cycles, schedule start dates, and <strong>close public registration</strong> for programs once their adventure starts (e.g. 1 week post-start).
              <span className="block mt-1 text-amber-200 font-semibold">
                ⭐ Priority renewals for returning families remain protected and accessible.
              </span>
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

      {/* ── Homepage Hero Badge Live Status Card ── */}
      <div className="rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-[11px] font-black uppercase tracking-wider text-amber-800">
              <span>🌐 Homepage Live Hero Announcement</span>
            </div>
            <h3 className="text-lg font-black text-[#002f76]">
              Visitor Badge on Landing Page
            </h3>
            <p className="text-[13px] text-slate-600 leading-relaxed max-w-2xl">
              Directly connected to <strong>Discovery Club: Curious Explorer</strong> (Master Program). When Adventure 2 (or any next adventure) has a future start date, visitors are informed it is starting soon. Once that date arrives, the badge automatically flips to <strong>Now Ongoing 🎉</strong>.
            </p>
          </div>

          {/* Live Preview Box */}
          <div className="shrink-0 flex flex-col items-start lg:items-end gap-2 bg-white/90 border border-amber-200/70 rounded-2xl p-4 shadow-xs">
            <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-slate-400">
              Live Visitor Preview
            </span>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF8E1] px-4 py-2 text-[14px] font-fredoka font-semibold text-[#B8860B] ring-2 ring-[#FFC107]/40 shadow-xs">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: liveBadge.pulse }}
              />
              <span>{liveBadge.label}</span>
            </div>
            <p className="text-[11.5px] font-semibold text-slate-500">
              {liveBadge.status === "upcoming"
                ? `⏳ Scheduled — flips to "Adventure ${liveBadge.adventureNumber} · Now Ongoing 🎉" once ${fmtDate(liveBadge.targetDate)} arrives`
                : liveBadge.status === "ongoing"
                  ? `✅ Active ongoing adventure cycle`
                  : `✏️ Custom override enabled`}
            </p>
          </div>
        </div>

        {/* Optional Custom Override Input */}
        <div className="mt-5 pt-4 border-t border-amber-200/60 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-[12px] font-bold text-slate-700 shrink-0">
            Custom Badge Text (Optional override):
          </label>
          <input
            type="text"
            placeholder={`Auto: ${autoBadge.label}`}
            value={heroBadgeOverride}
            onChange={(e) => setHeroBadgeOverride(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#0033A0]/40 focus:ring-2 focus:ring-[#0033A0]/10 transition-all"
          />
          {heroBadgeOverride && (
            <button
              type="button"
              onClick={() => setHeroBadgeOverride("")}
              className="text-[11.5px] font-bold text-slate-500 hover:text-slate-800 underline underline-offset-2 cursor-pointer"
            >
              Reset to Auto
            </button>
          )}
        </div>
      </div>

      {/* ── Summary Indicator Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">Public Registration</p>
            <p className="text-2xl font-black text-[#002f76] mt-1">{openRegistrationCount} of {programs.length} Open</p>
            <p className="text-[11.5px] text-slate-500 font-medium mt-0.5">Available for new families</p>
          </div>
          <span className="text-3xl">{openRegistrationCount === programs.length ? "🟢" : "🟡"}</span>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">Priority Renewals</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{renewalOpenCount} of {programs.length} Active</p>
            <p className="text-[11.5px] text-emerald-700 font-semibold mt-0.5">Protected returning slots</p>
          </div>
          <span className="text-3xl">⭐</span>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">Auto-Close Policy</p>
            <p className="text-sm font-black text-[#0033a0] mt-1.5">1 Week Post-Start</p>
            <p className="text-[11.5px] text-slate-500 font-medium mt-0.5">7 days after adventure start</p>
          </div>
          <span className="text-3xl">⏱️</span>
        </div>
      </div>

      {/* ── Roll Adventure Notice (shown when master next-start date has arrived) ── */}
      {masterNextReached && (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">🎉</span>
            <div>
              <p className="font-black text-[14px] text-emerald-950">
                Adventure {(master?.currentAdventure ?? 1) + 1} Start Date Has Arrived!
              </p>
              <p className="text-[12.5px] font-medium text-emerald-800 leading-relaxed mt-0.5">
                <strong>{fmtDate(master?.nextAdventureStart)}</strong> — The next adventure cycle is ready to begin.
                Rolling will increment all adventure programs by 1, shift their start dates, and clear the &ldquo;Next Start&rdquo; fields for you to update.
              </p>
            </div>
          </div>
          {!rollConfirm ? (
            <button
              type="button"
              onClick={() => setRollConfirm(true)}
              className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-[13px] font-black hover:bg-emerald-700 transition-all shadow-sm"
            >
              🔄 Roll to Adventure {(master?.currentAdventure ?? 1) + 1}
            </button>
          ) : (
            <div className="shrink-0 flex items-center gap-2">
              <span className="text-[12px] font-bold text-emerald-900">Confirm roll?</span>
              <button type="button" onClick={handleRollAdventure} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-[12px] font-black hover:bg-emerald-700 transition-all">✓ Yes, Roll</button>
              <button type="button" onClick={() => setRollConfirm(false)} className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-[12px] font-bold hover:bg-slate-300 transition-all">Cancel</button>
            </div>
          )}
        </div>
      )}

      {/* Manual Roll (always available) */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setRollConfirm(v => !v)}
          className="text-[11.5px] font-bold text-slate-400 hover:text-[#002f76] underline underline-offset-2 transition-colors"
        >
          🔄 Manually advance all adventure programs to next cycle
        </button>
        {rollConfirm && !masterNextReached && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleRollAdventure} className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[11.5px] font-black hover:bg-amber-600 transition-all">✓ Confirm Roll</button>
            <button type="button" onClick={() => setRollConfirm(false)} className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-[11.5px] font-bold hover:bg-slate-300 transition-all">Cancel</button>
          </div>
        )}
      </div>

      {/* ── Program Cards Grid ── */}
      {loading ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-12 text-center text-slate-500">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-[#0033a0] mb-3" />
          <p className="font-bold text-[14px]">Loading program configurations...</p>
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

            const isClosed = isRegistrationClosedForProgram(prog);
            const isAdventureProg = ADVENTURE_PROGRAMS.has(prog.programKey);
            const isFuture = Boolean(
              prog.newFamilyRegistrationOpenDate &&
              prog.newFamilyRegistrationOpenDate.slice(0, 10) > new Date().toISOString().slice(0, 10)
            );

            const nextStartDateDisplay = prog.nextAdventureStart
              ? fmtDate(prog.nextAdventureStart) ?? "Not scheduled"
              : "Not scheduled";

            const currentStartDateDisplay = prog.adventureStartDate
              ? fmtDate(prog.adventureStartDate) ?? "Not set"
              : "Not set";

            const currentAdv = prog.currentAdventure ?? 2;
            const nextAdv = currentAdv + 1;

            return (
              <div
                key={prog.programKey}
                className={`rounded-3xl bg-white border-2 transition-all overflow-hidden flex flex-col justify-between ${isClosed
                  ? "border-amber-300 shadow-sm"
                  : isFuture
                    ? "border-blue-300 shadow-sm hover:shadow-md"
                    : "border-slate-200/80 shadow-sm hover:shadow-md"
                  }`}
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
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider border ${meta.badge}`}>
                            {meta.short}
                          </span>
                          {prog.programKey === MASTER_PROGRAM && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                              👑 Master Cycle Source
                            </span>
                          )}
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isClosed
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : isFuture
                                ? "bg-blue-100 text-blue-900 border border-blue-300"
                                : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              }`}
                          >
                            {isClosed
                              ? "🔒 Registration Closed"
                              : isFuture
                                ? `📅 Opens ${fmtDate(prog.newFamilyRegistrationOpenDate)}`
                                : "🟢 Registration Open"}
                          </span>
                        </div>
                        <h3 className="font-headline text-[17px] font-black text-[#002f76]">
                          {prog.programKey}
                        </h3>
                      </div>
                    </div>

                    {/* Master Public Registration Toggle */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const willOpen = isClosed;
                          updateProgram(prog.programKey, {
                            registrationOpen: willOpen,
                            ...(willOpen
                              ? { newFamilyRegistrationOpenDate: new Date().toISOString() }
                              : { newFamilyRegistrationOpenDate: null }),
                          });
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-xs ${isClosed
                          ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                          : isFuture
                            ? "bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200"
                            : "bg-emerald-600 text-white hover:bg-emerald-700"
                          }`}
                      >
                        <span>{isClosed ? "🔒 Closed" : isFuture ? "📅 Scheduled" : "🟢 Open"}</span>
                      </button>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Public Form
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Controls Body */}
                <div className="p-6 space-y-5 flex-1">

                  {/* ── ADVENTURE PROGRAMS: Cycle Stepper + 2 date fields ── */}
                  {isAdventureProg && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Current Adventure Number */}
                      <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/60 p-3 space-y-1 text-center">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                          Current Cycle
                        </label>
                        <div className="flex items-center justify-center gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateProgram(prog.programKey, {
                                currentAdventure: Math.max(1, currentAdv - 1),
                              })
                            }
                            className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-[#002f76] font-black text-[15px] flex items-center justify-center hover:bg-slate-100"
                          >
                            −
                          </button>
                          <span className="text-[16px] font-black text-[#002f76] px-1">
                            Adv {currentAdv}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateProgram(prog.programKey, {
                                currentAdventure: currentAdv + 1,
                              })
                            }
                            className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-[#002f76] font-black text-[15px] flex items-center justify-center hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Current Adventure Start Date */}
                      <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/60 p-3 space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                          Adv {currentAdv} Started
                        </label>
                        <input
                          type="date"
                          value={prog.adventureStartDate ? prog.adventureStartDate.slice(0, 10) : ""}
                          onChange={(e) =>
                            updateProgram(prog.programKey, {
                              adventureStartDate: e.target.value ? `${e.target.value}T00:00:00.000Z` : null,
                            })
                          }
                          className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-[11.5px] font-bold text-[#002f76] focus:border-[#0033a0] focus:outline-none"
                        />
                        <p className="text-[9.5px] text-slate-400 font-semibold truncate">
                          {currentStartDateDisplay}
                        </p>
                      </div>

                      {/* Next Adventure Start Date */}
                      <div className={`rounded-2xl border-2 p-3 space-y-1 ${prog.nextAdventureStart ? "border-slate-100 bg-slate-50/60" : "border-dashed border-amber-200 bg-amber-50/40"}`}>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                          Adv {nextAdv} Starts
                        </label>
                        <input
                          type="date"
                          value={prog.nextAdventureStart ? prog.nextAdventureStart.slice(0, 10) : ""}
                          onChange={(e) =>
                            updateProgram(prog.programKey, {
                              nextAdventureStart: e.target.value ? `${e.target.value}T00:00:00.000Z` : null,
                            })
                          }
                          className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-[11.5px] font-bold text-[#002f76] focus:border-[#0033a0] focus:outline-none"
                        />
                        <p className={`text-[9.5px] font-semibold truncate ${prog.nextAdventureStart ? "text-slate-400" : "text-amber-500"}`}>
                          {prog.nextAdventureStart ? nextStartDateDisplay : "⚠ Not set yet — please update"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Curious Explorer Master Sync Helper */}
                  {prog.programKey === MASTER_PROGRAM && prog.nextAdventureStart && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200/90 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-amber-950">
                        <span>👑</span>
                        <span><strong>Master Cycle Source:</strong> Adv {nextAdv} starts {nextStartDateDisplay}. Will auto-roll all adventure programs when reached.</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSyncDateToAdventures}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black transition-colors cursor-pointer shadow-xs"
                      >
                        ⚡ Sync date to all Adventure programs
                      </button>
                    </div>
                  )}

                  {/* ── Ballet / Virtual Tutorial: simplified Start Date + Next Batch ── */}
                  {!isAdventureProg && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/60 p-3 space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={prog.adventureStartDate ? prog.adventureStartDate.slice(0, 10) : ""}
                          onChange={(e) =>
                            updateProgram(prog.programKey, {
                              adventureStartDate: e.target.value ? `${e.target.value}T00:00:00.000Z` : null,
                            })
                          }
                          className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-[11.5px] font-bold text-[#002f76] focus:border-[#0033a0] focus:outline-none"
                        />
                        <p className="text-[9.5px] text-slate-400 font-semibold truncate">{currentStartDateDisplay}</p>
                      </div>
                      <div className={`rounded-2xl border-2 p-3 space-y-1 ${prog.nextAdventureStart ? "border-slate-100 bg-slate-50/60" : "border-dashed border-slate-200"}`}>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                          Next Batch / End Date
                        </label>
                        <input
                          type="date"
                          value={prog.nextAdventureStart ? prog.nextAdventureStart.slice(0, 10) : ""}
                          onChange={(e) =>
                            updateProgram(prog.programKey, {
                              nextAdventureStart: e.target.value ? `${e.target.value}T00:00:00.000Z` : null,
                            })
                          }
                          className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-[11.5px] font-bold text-[#002f76] focus:border-[#0033a0] focus:outline-none"
                        />
                        <p className="text-[9.5px] text-slate-400 font-semibold truncate">
                          {prog.nextAdventureStart ? nextStartDateDisplay : "Optional"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── Ballet Specific: Class Time / Session Availability Control ── */}
                  {prog.programKey === "Ballet" && (
                    <div className="rounded-2xl border-2 border-pink-200/90 bg-pink-50/40 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[12px] font-black uppercase tracking-wider text-pink-900 flex items-center gap-1.5">
                            <span>🩰</span> Ballet Class Time Controls
                          </span>
                          <p className="text-[11px] font-medium text-pink-800/80 mt-0.5">
                            Open or close individual session times for public registration.
                          </p>
                        </div>
                        {Array.isArray(prog.closedClasses) && prog.closedClasses.length > 0 ? (
                          <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                            {prog.closedClasses.length} {prog.closedClasses.length === 1 ? "Session Closed" : "Sessions Closed"}
                          </span>
                        ) : (
                          <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            All 3 Sessions Open
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 pt-1">
                        {BALLET_CLASSES.map((cls) => {
                          const isSessionClosed = Array.isArray(prog.closedClasses) && prog.closedClasses.includes(cls.name);
                          return (
                            <div
                              key={cls.name}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border-2 transition-all ${
                                isSessionClosed
                                  ? "bg-white border-rose-300 shadow-2xs"
                                  : "bg-white border-pink-200/80 hover:border-pink-300 shadow-2xs"
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-[13px] font-black text-slate-800">{cls.name}</p>
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider ${
                                      isSessionClosed
                                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                                        : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    }`}
                                  >
                                    {isSessionClosed ? "🔒 Closed" : "🟢 Open"}
                                  </span>
                                </div>
                                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                  {cls.time} · {cls.ageRange} · Max {cls.maxSlots} students
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const currentClosed = Array.isArray(prog.closedClasses) ? [...prog.closedClasses] : [];
                                  const updatedClosed = isSessionClosed
                                    ? currentClosed.filter((name) => name !== cls.name)
                                    : [...currentClosed, cls.name];
                                  updateProgram(prog.programKey, { closedClasses: updatedClosed });
                                }}
                                className={`shrink-0 px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-xs ${
                                  isSessionClosed
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                    : "bg-rose-500 text-white hover:bg-rose-600"
                                }`}
                              >
                                {isSessionClosed ? "✓ Reopen Session" : "🔒 Close Session"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Row 2: Public Registration Status & Auto-Close */}
                  <div className="rounded-2xl border-2 border-slate-100 p-4 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] font-black uppercase tracking-wider text-[#002f76] flex items-center gap-1.5">
                        <span>🎒</span> Public Registration Control
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const willOpen = isClosed;
                            updateProgram(prog.programKey, {
                              registrationOpen: willOpen,
                              ...(willOpen
                                ? { newFamilyRegistrationOpenDate: new Date().toISOString() }
                                : { newFamilyRegistrationOpenDate: null }),
                            });
                          }}
                          className={`px-3 py-1 rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors ${isClosed
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-amber-500 text-white hover:bg-amber-600"
                            }`}
                        >
                          {isClosed ? "Reopen Registration" : isAdventureProg ? `Close Adventure ${currentAdv}` : `Close Registration`}
                        </button>
                      </div>
                    </div>

                    {/* Auto-close rule — only for adventure programs */}
                    {isAdventureProg && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11.5px]">
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={prog.registrationAutoCloseDays === 7}
                            onChange={(e) =>
                              updateProgram(prog.programKey, {
                                registrationAutoCloseDays: e.target.checked ? 7 : null,
                              })
                            }
                            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span>Auto-close registration 1 week (7 days) after Adventure {currentAdv} starts</span>
                        </label>
                        <span className="text-[10.5px] font-bold text-slate-400">
                          {prog.registrationAutoCloseDays ? "7 days" : "Manual only"}
                        </span>
                      </div>
                    )}

                    {/* New Family Registration Open Date */}
                    {(() => {
                      const openDateStr = prog.newFamilyRegistrationOpenDate ? prog.newFamilyRegistrationOpenDate.slice(0, 10) : "";
                      const openDateFmt = prog.newFamilyRegistrationOpenDate ? fmtDate(prog.newFamilyRegistrationOpenDate) : null;
                      const isFuture = openDateStr ? openDateStr > new Date().toISOString().slice(0, 10) : false;
                      return (
                        <div className={`rounded-xl border p-3 space-y-2 ${isFuture ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-white"
                          }`}>
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[10.5px] font-black uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                              <span>📅</span> New Family Registration Opens On
                            </label>
                            {openDateStr && (
                              <button
                                type="button"
                                onClick={() => updateProgram(prog.programKey, { newFamilyRegistrationOpenDate: null })}
                                className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors"
                              >
                                ✕ Clear
                              </button>
                            )}
                          </div>
                          <input
                            type="date"
                            value={openDateStr}
                            onChange={(e) =>
                              updateProgram(prog.programKey, {
                                newFamilyRegistrationOpenDate: e.target.value ? `${e.target.value}T00:00:00.000Z` : null,
                                ...(e.target.value ? { registrationOpen: true } : {}),
                              })
                            }
                            className="w-full h-8 rounded-lg border border-blue-200 bg-white px-2 text-[11.5px] font-bold text-[#002f76] focus:border-[#0033a0] focus:outline-none"
                          />
                          {isFuture ? (
                            <p className="text-[10px] font-bold text-blue-700">
                              🔒 /register will show &quot;Opens on {openDateFmt}&quot; to new families until this date.
                            </p>
                          ) : openDateStr ? (
                            <p className="text-[10px] font-semibold text-emerald-700">
                              ✅ Open date has passed — registration is visible to new families.
                            </p>
                          ) : (
                            <p className="text-[10px] font-semibold text-slate-400">
                              Leave blank to allow registration immediately when the form is open.
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Public Live Preview Banner */}
                    {(() => {
                      const openDateStr = prog.newFamilyRegistrationOpenDate ? prog.newFamilyRegistrationOpenDate.slice(0, 10) : "";
                      const openDateFmt = prog.newFamilyRegistrationOpenDate ? fmtDate(prog.newFamilyRegistrationOpenDate) : null;
                      const isFuture = openDateStr ? openDateStr > new Date().toISOString().slice(0, 10) : false;
                      return (
                        <div className="rounded-xl border border-dashed border-slate-300 p-3 bg-white space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Visitor Preview on /register:
                          </p>
                          {isClosed ? (
                            <div className="text-[12px] font-medium text-amber-800 leading-snug">
                              🔒{" "}
                              {isAdventureProg ? (
                                <><strong>Current Adventure {currentAdv} is starting!</strong> Online registration for Adventure {currentAdv} is now closed. Please wait for the next <strong>Adventure {nextAdv}</strong>{prog.nextAdventureStart ? ` (Starts ${nextStartDateDisplay})` : ""}!</>
                              ) : (
                                <><strong>Registration for {meta.short} is currently closed.</strong>{prog.adventureStartDate ? ` Started ${currentStartDateDisplay}.` : ""} Please check back soon or inquire for the next batch!</>
                              )}
                            </div>
                          ) : isFuture ? (
                            <div className="text-[12px] font-medium text-blue-800 leading-snug">
                              📅 <strong>Registration for new families opens on {openDateFmt}.</strong> Returning families can still renew anytime.
                            </div>
                          ) : (
                            <div className="text-[12px] font-medium text-emerald-800 leading-snug">
                              ✓{" "}
                              {isAdventureProg ? (
                                <><strong>Adventure {currentAdv} is Open for Registration!</strong> Families can select classes and reserve slots online.</>
                              ) : (
                                <><strong>{meta.short} is Open for Registration!</strong> Families can sign up online.</>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Row 3: Priority Renewal Access */}
                  <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⭐</span>
                        <div>
                          <p className="text-[12px] font-black text-emerald-950">
                            Priority Renewal Access (/renew)
                          </p>
                          <p className="text-[11px] text-emerald-700 font-medium">
                            Returning families can renew even if public registration is closed.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10.5px] font-bold ${prog.renewalOpen !== false ? "text-emerald-700" : "text-slate-400"}`}>
                          {prog.renewalOpen !== false ? "Protected" : "Paused"}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateProgram(prog.programKey, { renewalOpen: prog.renewalOpen === false ? true : false })}
                          className={`relative h-5 w-10 rounded-full transition-colors cursor-pointer ${prog.renewalOpen !== false ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${prog.renewalOpen !== false ? "translate-x-5" : ""
                              }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Brave Explorer Virtual Session Link */}
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
                            className={`relative h-4 w-8 rounded-full transition-colors cursor-pointer ${prog.virtualLinkOpen ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow-xs transition-transform ${prog.virtualLinkOpen ? "translate-x-4" : ""
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
                    {isAdventureProg ? (
                      <>Current Cycle: <strong>Adventure {currentAdv}</strong>{prog.nextAdventureStart ? ` · Next: Adv ${nextAdv} (${nextStartDateDisplay})` : " · Next date not set"}</>
                    ) : (
                      <>{prog.adventureStartDate ? `Starts: ${currentStartDateDisplay}` : "No start date set"}</>
                    )}
                  </span>
                  <span className={`font-bold ${isClosed ? "text-amber-700" : isFuture ? "text-blue-700" : "text-emerald-700"}`}>
                    {isClosed ? "● Registration Closed" : isFuture ? "● Scheduled to Open" : "● Registration Open"}
                  </span>
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
            Changes to registration status and dates immediately update `/register` for visitors while preserving `/renew` for priority families.
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
              <span>💾 Save All Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
