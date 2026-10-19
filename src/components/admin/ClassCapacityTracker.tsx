"use client";

import { useCallback, useEffect, useState } from "react";
import { PROGRAM_SLOTS } from "@/data/landing";

type SlotAvailability = {
  maxSlots: number;
  taken: number;
  available: number;
  closed?: boolean;
};

type SlotOverview = Record<string, Record<string, SlotAvailability>>;

const MIN_STUDENTS_PER_SESSION = 3;

export function ClassCapacityTracker() {
  const [slots, setSlots] = useState<SlotOverview>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/registrations/slots", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not load class capacity.");
      }
      setSlots(result.data || {});
      setUpdatedAt(new Date());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load class capacity.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    const handleFocus = () => void refresh();
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-lg">🏫</div>
          <div>
            <h2 className="font-headline text-[15px] font-extrabold text-[#002f76]">Class Size &amp; Session Tracker</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Current-cycle sign-ups from new families and renewals. Expired reservations and previous adventures are excluded; each child counts once per session.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold">
          <span className="rounded-xl border border-orange-200 bg-orange-50 px-2.5 py-1 text-orange-700">⚠️ Below Min (&lt;{MIN_STUDENTS_PER_SESSION})</span>
          <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">✓ Proceeding ({MIN_STUDENTS_PER_SESSION}+)</span>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="ml-1 rounded-xl border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Updating…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="p-5">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error} <button type="button" onClick={() => void refresh()} className="ml-2 font-bold underline">Try again</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(PROGRAM_SLOTS).map(([programId, program]) => {
              const sessions = program.classes
                .map(session => ({ ...session, availability: slots[programId]?.[session.name] }))
                .filter(session => session.availability);
              return (
                <div key={programId} className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                  <p className="flex items-center justify-between gap-2 text-[13px] font-bold text-[#002f76]">
                    <span>{program.name}</span>
                    <span className="shrink-0 text-[11px] font-normal text-slate-500">Cap: {program.totalSlots}</span>
                  </p>
                  {loading && sessions.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-400">Loading sessions…</div>
                  ) : sessions.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-400">No sessions available.</div>
                  ) : (
                    <div className="space-y-2">
                      {sessions.map(session => {
                        const count = session.availability!.taken;
                        const max = session.availability!.maxSlots;
                        const belowMin = count < MIN_STUDENTS_PER_SESSION;
                        return (
                          <div key={session.name} className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 text-xs ${belowMin ? "border-orange-200 bg-orange-50/70 text-orange-950" : "border-emerald-200/60 bg-emerald-50/40 text-slate-700"}`}>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold">{session.name}</p>
                                {session.availability?.closed && (
                                  <span className="rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[9.5px] font-black uppercase text-rose-800">
                                    🔒 Closed
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[10px] text-slate-500">Max: {max} students</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-bold ${belowMin ? "bg-orange-200 text-orange-800" : count >= max ? "bg-slate-200 text-slate-800" : "bg-emerald-100 text-emerald-800"}`}>
                                {count} / {max}
                              </span>
                              {belowMin && <p className="mt-0.5 text-[10px] font-bold text-orange-700">Needs {MIN_STUDENTS_PER_SESSION - count} more</p>}
                              {!belowMin && <p className="mt-0.5 text-[10px] text-slate-500">{Math.max(0, max - count)} slots left</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-right text-[10px] text-slate-400">
          {updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · refreshes every minute` : "Live capacity"}
        </p>
      </div>
    </section>
  );
}
