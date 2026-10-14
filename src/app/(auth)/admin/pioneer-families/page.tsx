"use client";

import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/app-shell";

interface PioneerFamily {
  id: string;
  parentName: string;
  childName: string;
  email: string;
  createdAt?: string;
}

interface RenewalFamily {
  _id: string;
  parentName: string;
  parentEmail: string;
  childName: string;
  previousProgram?: string;
  renewingTo?: string;
}

const PROGRAMS = [
  { key: "curious-explorer", label: "Curious Explorer", regular: 4395, color: "#b45309", bg: "#fffbeb", accent: "#fde68a" },
  { key: "creative-explorer", label: "Creative Explorer", regular: 4985, color: "#1d4ed8", bg: "#eff6ff", accent: "#bfdbfe" },
  { key: "everyday-curious", label: "Everyday Explorer", regular: 7518, color: "#15803d", bg: "#f0fdf4", accent: "#bbf7d0" },
  { key: "brave-explorer", label: "Trailblazer (Brave Explorer)", regular: 6900, color: "#1e1b4b", bg: "#eef2ff", accent: "#c7d2fe" },
  { key: "ballet", label: "Ballet", regular: 4400, color: "#be185d", bg: "#fdf2f8", accent: "#fbcfe8" },
  { key: "saturday-playdate", label: "Saturday Playdate", regular: 2190, color: "#0369a1", bg: "#f0f9ff", accent: "#bae6fd" },
  { key: "virtual-session", label: "Virtual Tutorial", regular: 450, color: "#6d28d9", bg: "#f5f3ff", accent: "#ddd6fe" },
];

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

type ModalMode = "add" | "edit" | "pick" | null;

export default function PioneerFamiliesPage() {
  const [pioneers, setPioneers] = useState<PioneerFamily[]>([]);
  const [renewalFamilies, setRenewalFamilies] = useState<RenewalFamily[]>([]);
  const [pioneerPrices, setPioneerPrices] = useState<Record<string, number>>({});
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [savedPrices, setSavedPrices] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [renewalSearch, setRenewalSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [fParent, setFParent] = useState("");
  const [fChild, setFChild] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    try {
      const [pioneerRes, renewalRes] = await Promise.all([
        fetch("/api/pioneer-families"),
        fetch("/api/renewals/families"),
      ]);
      const pioneerData = await pioneerRes.json();
      const renewalData = await renewalRes.json();
      setPioneers(pioneerData.families || []);
      const prices = pioneerData.pioneerPrices || {};
      if (Object.keys(prices).length > 0) {
        setPioneerPrices(prices);
        const inputs: Record<string, string> = {};
        for (const k of Object.keys(prices)) inputs[k] = String(prices[k]);
        setPriceInputs(inputs);
      }
      // /api/renewals/families returns { success, data: [...] }
      if (renewalData.data) setRenewalFamilies(renewalData.data);
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filteredPioneers = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? pioneers.filter(f => [f.parentName, f.childName, f.email].some(v => v?.toLowerCase().includes(q)))
      : pioneers;
  }, [pioneers, search]);

  const filteredRenewal = useMemo(() => {
    const q = renewalSearch.toLowerCase();
    const alreadyEmails = new Set(pioneers.map(p => p.email.toLowerCase()));
    const base = renewalFamilies.filter(f => !alreadyEmails.has((f.parentEmail || "").toLowerCase()));
    return q
      ? base.filter(f => [f.parentName, f.childName, f.parentEmail].some(v => v?.toLowerCase().includes(q)))
      : base;
  }, [renewalFamilies, pioneers, renewalSearch]);

  function openAdd() {
    setModalMode("add"); setEditId(null); setFParent(""); setFChild(""); setFEmail("");
  }
  function openEdit(f: PioneerFamily) {
    setModalMode("edit"); setEditId(f.id); setFParent(f.parentName); setFChild(f.childName); setFEmail(f.email);
  }
  function openPick() {
    setModalMode("pick"); setPickedIds(new Set()); setRenewalSearch("");
  }
  function closeModal() { setModalMode(null); setEditId(null); }

  function togglePick(id: string) {
    setPickedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleSaveManual() {
    if (!fEmail.trim()) { showToast("Email is required", "error"); return; }
    setSaving(true);
    try {
      const body: any = { parentName: fParent, childName: fChild, email: fEmail };
      if (editId) body.id = editId;
      const res = await fetch("/api/pioneer-families", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.ok) { showToast(editId ? "Updated!" : "Pioneer family added!"); closeModal(); load(); }
      else showToast(data.error || "Failed", "error");
    } catch { showToast("Failed", "error"); }
    finally { setSaving(false); }
  }

  async function handleSavePicked() {
    if (pickedIds.size === 0) { showToast("Select at least one family", "error"); return; }
    setSaving(true);
    try {
      const toAdd = renewalFamilies.filter(f => pickedIds.has(f._id));
      let ok = 0;
      for (const f of toAdd) {
        const res = await fetch("/api/pioneer-families", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentName: f.parentName, childName: f.childName, email: f.parentEmail }),
        });
        if ((await res.json()).ok) ok++;
      }
      showToast(`Added ${ok} pioneer ${ok === 1 ? "family" : "families"}!`);
      closeModal(); load();
    } catch { showToast("Failed", "error"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this pioneer family?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/pioneer-families?id=${id}`, { method: "DELETE" });
      if ((await res.json()).ok) { showToast("Removed"); load(); }
      else showToast("Failed", "error");
    } catch { showToast("Failed", "error"); }
    finally { setDeleting(null); }
  }

  async function handleSavePrice(programKey: string) {
    const price = Number(priceInputs[programKey]);
    if (!priceInputs[programKey] || isNaN(price) || price <= 0) { showToast("Enter a valid price", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/pioneer-families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pioneerPrices: { ...pioneerPrices, [programKey]: price } }),
      });
      const data = await res.json();
      if (data.ok) {
        setPioneerPrices(prev => ({ ...prev, [programKey]: price }));
        setSavedPrices(prev => ({ ...prev, [programKey]: true }));
        setTimeout(() => setSavedPrices(prev => ({ ...prev, [programKey]: false })), 2000);
        showToast("Price saved!");
      } else showToast(data.error || "Failed", "error");
    } catch { showToast("Failed", "error"); }
    finally { setSaving(false); }
  }

  return (
    <AppShell title="Pioneer Families">
      <div className="space-y-6 pb-12">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⭐</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline text-[22px] font-extrabold text-[#002f76]">Pioneer Families</h1>
                <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-0.5 text-[11px] font-bold tracking-wide">Special Pricing</span>
              </div>
              <p className="text-[13px] text-[#64748b]">
                Pioneer families get exclusive pricing on renewal. Set per-program prices below.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openPick}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-[#0033A0] px-4 py-2.5 text-[12.5px] font-bold text-[#0033A0] hover:bg-blue-50 transition-colors"
            >
              👥 Pick from Renewals
            </button>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#0033A0] px-4 py-2.5 text-[12.5px] font-bold text-white shadow-sm hover:bg-[#002f76] transition-colors"
            >
              + Add Manually
            </button>
          </div>
        </div>

        {/* ── Pioneer Prices ── */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 px-1">Pioneer Prices per Program</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PROGRAMS.map(prog => (
              <div key={prog.key} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-[14px] text-[#002f76]">{prog.label}</p>
                    <p className="text-[11px] text-slate-500">Regular price: <span className="font-bold">₱{prog.regular.toLocaleString()}</span></p>
                  </div>
                  {pioneerPrices[prog.key] && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: prog.bg, color: prog.color }}>
                      Current: ₱{pioneerPrices[prog.key].toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#002f76]">₱</span>
                    <input
                      type="number"
                      value={priceInputs[prog.key] || ""}
                      onChange={e => setPriceInputs(prev => ({ ...prev, [prog.key]: e.target.value }))}
                      placeholder={`e.g. ${prog.regular - 100}`}
                      className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-[13px] font-semibold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <button
                    onClick={() => handleSavePrice(prog.key)}
                    disabled={saving}
                    className="rounded-xl px-4 py-2 text-[12.5px] font-bold text-white transition-colors shrink-0"
                    style={{ background: savedPrices[prog.key] ? "#059669" : "#0033A0" }}
                  >
                    {savedPrices[prog.key] ? "✓ Saved" : "Save"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Families Table ── */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
            <div>
              <p className="font-bold text-[15px] text-[#002f76]">Pioneer Families</p>
              <p className="text-[12px] text-slate-400">{filteredPioneers.length} {filteredPioneers.length === 1 ? "family" : "families"} on the list</p>
            </div>
            <div className="relative w-full sm:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-[13px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Column headers */}
          <div className="hidden sm:grid grid-cols-[2fr_1.5fr_2fr_1fr_auto] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100">
            {["Parent", "Child", "Email", "Added", ""].map(h => (
              <p key={h} className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</p>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-[13px] text-slate-400">Loading…</div>
          ) : filteredPioneers.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[14px] font-semibold text-slate-400">
                {search ? "No families match your search." : "No pioneer families yet."}
              </p>
              {!search && (
                <div className="mt-4 flex justify-center gap-3">
                  <button onClick={openPick} className="inline-flex items-center gap-1.5 rounded-xl border border-[#0033A0] px-4 py-2 text-[12.5px] font-bold text-[#0033A0] hover:bg-blue-50">
                    👥 Pick from Renewals
                  </button>
                  <button onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-4 py-2 text-[12.5px] font-bold text-white hover:bg-[#002f76]">
                    + Add Manually
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredPioneers.map((f, i) => (
              <div
                key={f.id}
                className={`grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_2fr_1fr_auto] gap-2 sm:gap-4 px-6 py-4 items-center hover:bg-slate-50/60 transition-colors ${i < filteredPioneers.length - 1 ? "border-b border-slate-100" : ""}`}
              >
                <p className="font-semibold text-[13px] text-[#002f76]">{f.parentName || "—"}</p>
                <p className="text-[13px] text-slate-700">{f.childName || "—"}</p>
                <p className="text-[12px] text-slate-500 truncate">{f.email}</p>
                <p className="text-[12px] text-slate-400">{fmtDate(f.createdAt)}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(f)}
                    className="rounded-lg px-3 py-1.5 text-[11.5px] font-bold text-[#0050d5] bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(f.id)}
                    disabled={deleting === f.id}
                    className="rounded-lg px-3 py-1.5 text-[11.5px] font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    {deleting === f.id ? "…" : "Remove"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Add/Edit Manual Modal ── */}
        {(modalMode === "add" || modalMode === "edit") && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6">
              <h2 className="font-headline text-[18px] font-extrabold text-[#002f76] mb-5">
                {modalMode === "add" ? "⭐ Add Pioneer Family" : "✏️ Edit Pioneer Family"}
              </h2>
              <div className="space-y-4">
                {[
                  { label: "Parent Name", value: fParent, set: setFParent, placeholder: "e.g. Maria Santos" },
                  { label: "Child Name", value: fChild, set: setFChild, placeholder: "e.g. Isabella Santos" },
                  { label: "Email Address *", value: fEmail, set: setFEmail, placeholder: "parent@email.com" },
                ].map(({ label, value, set, placeholder }) => (
                  <div key={label}>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{label}</label>
                    <input
                      value={value}
                      onChange={e => set(e.target.value)}
                      placeholder={placeholder}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[13px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={closeModal} className="rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={handleSaveManual} disabled={saving} className="rounded-xl px-5 py-2.5 text-[13px] font-bold text-white bg-[#0033A0] hover:bg-[#002f76] transition-colors">
                  {saving ? "Saving…" : modalMode === "add" ? "Add Family" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Pick from Renewals Modal ── */}
        {modalMode === "pick" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
              <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-headline text-[18px] font-extrabold text-[#002f76]">👥 Pick from Renewal Families</h2>
                    <p className="text-[12px] text-slate-500 mt-0.5">Select families already in your renewal contact list to mark as pioneer.</p>
                  </div>
                  <span className="rounded-full bg-blue-100 text-[#0033A0] px-3 py-1 text-[11px] font-bold">
                    {pickedIds.size} selected
                  </span>
                </div>
                <div className="relative mt-3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">🔍</span>
                  <input
                    value={renewalSearch}
                    onChange={e => setRenewalSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-[13px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    autoFocus
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                {filteredRenewal.length === 0 ? (
                  <div className="py-12 text-center text-[13px] text-slate-400">
                    {renewalSearch ? "No results found." : "All renewal families are already in the pioneer list."}
                  </div>
                ) : filteredRenewal.map((f, i) => {
                  const picked = pickedIds.has(f._id);
                  return (
                    <button
                      key={f._id}
                      onClick={() => togglePick(f._id)}
                      className={`w-full flex items-center gap-4 px-6 py-3.5 text-left transition-colors ${i > 0 ? "border-t border-slate-100" : ""} ${picked ? "bg-blue-50" : "hover:bg-slate-50"}`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors ${picked ? "border-[#0033A0] bg-[#0033A0]" : "border-slate-300"}`}>
                        {picked && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[13px] text-[#002f76]">{f.childName}</p>
                        <p className="text-[12px] text-slate-500 truncate">{f.parentName} · {f.parentEmail}</p>
                      </div>
                      {f.previousProgram && (
                        <span className="text-[11px] font-semibold text-slate-400 shrink-0">{f.previousProgram.split(":").pop()?.trim()}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center gap-3">
                <p className="text-[12px] text-slate-500">
                  Or{" "}
                  <button onClick={() => { closeModal(); openAdd(); }} className="text-[#0033A0] font-bold underline underline-offset-2 hover:no-underline">
                    add a family manually
                  </button>
                </p>
                <div className="flex gap-2">
                  <button onClick={closeModal} className="rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                  <button
                    onClick={handleSavePicked}
                    disabled={saving || pickedIds.size === 0}
                    className="rounded-xl px-5 py-2.5 text-[13px] font-bold text-white bg-[#0033A0] hover:bg-[#002f76] disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Adding…" : `Add ${pickedIds.size > 0 ? pickedIds.size : ""} ${pickedIds.size === 1 ? "Family" : "Families"}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-2xl text-[13px] font-bold text-white shadow-xl transition-all ${toast.type === "success" ? "bg-[#002f76]" : "bg-red-600"}`}>
            {toast.msg}
          </div>
        )}
      </div>
    </AppShell>
  );
}
