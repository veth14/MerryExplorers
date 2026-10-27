"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { auth } from "@/lib/firebase";

type RenewalPeriod = {
  _id: string;
  name: string;
  slug: string;
  targetProgram?: string;
  targetAdventure?: number;
  createdAt?: string;
  isActive?: boolean;
};

async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  await auth.authStateReady();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Your admin session has expired. Please sign in again.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${await currentUser.getIdToken()}`);
  return fetch(input, { ...init, headers });
}

export function RenewalPeriodsManager() {
  const [periods, setPeriods] = useState<RenewalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [targetAdventure, setTargetAdventure] = useState(2);

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminFetch("/api/renewals/periods");
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Could not load renewal periods.");
      setPeriods(data.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load renewal periods.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);

  const createPeriod = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter a name for this renewal period.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await adminFetch("/api/renewals/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          targetAdventure,
          targetProgram: `Adventure ${targetAdventure}`,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Could not create this period.");
      setName("");
      setTargetAdventure((value) => value + 1);
      setIsCreating(false);
      await loadPeriods();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create this period.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="renewal-periods" className="scroll-mt-6 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#0033A0]/60">Renewal history</p>
          <h2 className="mt-1 font-headline text-[18px] font-extrabold text-[#002f76]">Renewal periods</h2>
          <p className="mt-1 text-[12px] text-slate-500">
            Create a period for an adventure cycle. Submitted registrations are grouped by their target adventure.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setError(""); setIsCreating(true); }}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-[12.5px] font-bold text-white shadow-sm transition-colors hover:bg-[#002f76]"
        >
          <span>+</span> Add Renewal Period
        </button>
      </div>

      {error && !isCreating && (
        <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700">{error}</p>
      )}

      {loading ? (
        <p className="mt-4 text-[12px] text-slate-500">Loading renewal periods…</p>
      ) : periods.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {periods.map((period) => (
            <div key={period._id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-bold text-[#002f76]">{period.name}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {period.targetProgram || (period.targetAdventure ? `Adventure ${period.targetAdventure}` : "Target adventure not set")}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${period.isActive ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-[#0033A0]"}`}>
                {period.isActive ? "Current · " : ""}Adventure {period.targetAdventure || "—"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-center text-[12px] text-slate-500">
          No renewal periods yet. Add one here, then choose it from the Renewals Hub.
        </p>
      )}

      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
          <button type="button" aria-label="Close dialog" className="absolute inset-0" onClick={() => !saving && setIsCreating(false)} />
          <form onSubmit={createPeriod} className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[2rem] border-t border-slate-200 bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.15)] sm:max-w-lg sm:rounded-3xl sm:border sm:shadow-2xl">
            <div className="shrink-0 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-headline text-[17px] font-extrabold text-[#002f76]">Add Renewal Period</h3>
                  <p className="mt-1 text-[12px] text-slate-500">Link this cycle to the adventure families are registering for.</p>
                </div>
                <button type="button" disabled={saving} onClick={() => setIsCreating(false)} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50">✕</button>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              <label className="block text-[12px] font-bold text-slate-700">
                Period name <span className="text-rose-500">*</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={`e.g. Adventure ${targetAdventure} Renewal`}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/10"
                />
              </label>
              <label className="block text-[12px] font-bold text-slate-700">
                Target adventure
                <input
                  type="number"
                  min={1}
                  value={targetAdventure}
                  onChange={(event) => setTargetAdventure(Math.max(1, Number(event.target.value) || 1))}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/10"
                />
              </label>
              {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700">{error}</p>}
            </div>
            <div className="shrink-0 flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">
              <button type="button" disabled={saving} onClick={() => setIsCreating(false)} className="rounded-xl px-4 py-2.5 text-[12.5px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-xl bg-[#0033A0] px-5 py-2.5 text-[12.5px] font-bold text-white shadow-sm hover:bg-[#002f76] disabled:opacity-50">
                {saving ? "Creating…" : "Create Period"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
