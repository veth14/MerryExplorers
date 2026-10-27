"use client";

import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { TablePagination } from "@/components/ui/table-pagination";

interface PioneerFamily {
  id: string;
  parentName: string;
  childName: string;
  email: string;
  email2?: string;
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

interface DirectoryStudent {
  id: string;
  childInfo?: { firstName?: string; lastName?: string };
  parentInfo?: { name?: string; email?: string };
  program?: string;
  programName?: string;
  isPioneer?: boolean;
}

interface PickerFamily {
  key: string;
  parentName: string;
  parentEmail: string;
  childName: string;
  programName?: string;
}

const PROGRAMS = [
  { key: "curious-explorer", label: "Curious Explorer", icon: "🔍", regular: 4395, color: "#b45309", bg: "#fffbeb", accent: "#fde68a" },
  { key: "creative-explorer", label: "Creative Explorer", icon: "🎨", regular: 4985, color: "#1d4ed8", bg: "#eff6ff", accent: "#bfdbfe" },
  { key: "everyday-curious", label: "Everyday Explorer", icon: "🌈", regular: 7518, color: "#15803d", bg: "#f0fdf4", accent: "#bbf7d0" },
  { key: "brave-explorer", label: "Trailblazer (Brave Explorer)", icon: "🚀", regular: 6900, color: "#1e1b4b", bg: "#eef2ff", accent: "#c7d2fe" },
  { key: "ballet", label: "Ballet", icon: "🩰", regular: 4400, color: "#be185d", bg: "#fdf2f8", accent: "#fbcfe8" },
  { key: "saturday-playdate", label: "Saturday Playdate", icon: "🎉", regular: 2190, color: "#0369a1", bg: "#f0f9ff", accent: "#bae6fd" },
  { key: "virtual-session", label: "Virtual Tutorial", icon: "💻", regular: 450, color: "#6d28d9", bg: "#f5f3ff", accent: "#ddd6fe" },
];

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const getInitials = (name?: string) =>
  (name || "P").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "P";

type ModalMode = "add" | "edit" | "pick" | null;

export default function PioneerFamiliesPage() {
  const [pioneers, setPioneers] = useState<PioneerFamily[]>([]);
  const [renewalFamilies, setRenewalFamilies] = useState<RenewalFamily[]>([]);
  const [directoryStudents, setDirectoryStudents] = useState<DirectoryStudent[]>([]);
  const [pioneerPrices, setPioneerPrices] = useState<Record<string, number>>({});
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [savedPrices, setSavedPrices] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pricesOpen, setPricesOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [renewalSearch, setRenewalSearch] = useState("");
  const [pickSource, setPickSource] = useState<"renewals" | "students">("renewals");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [fParent, setFParent] = useState("");
  const [fChild, setFChild] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fEmail2, setFEmail2] = useState("");
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    try {
      const [pioneerRes, renewalRes, studentRes] = await Promise.all([
        fetch("/api/pioneer-families"),
        fetch("/api/renewals/families"),
        fetch("/api/students"),
      ]);
      const [pioneerData, renewalData, studentData] = await Promise.all([
        pioneerRes.json(),
        renewalRes.json(),
        studentRes.json(),
      ]);
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
      if (studentData.success && Array.isArray(studentData.data)) setDirectoryStudents(studentData.data);
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
      ? pioneers.filter(f => [f.parentName, f.childName, f.email, f.email2].some(v => v?.toLowerCase().includes(q)))
      : pioneers;
  }, [pioneers, search]);

  const pageCount = Math.max(1, Math.ceil(filteredPioneers.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginatedPioneers = filteredPioneers.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const filteredRenewal = useMemo(() => {
    const q = renewalSearch.toLowerCase();
    const alreadyEmails = new Set(pioneers.flatMap(p => [p.email, p.email2].map(email => (email || "").toLowerCase())));
    const base = renewalFamilies.filter(f => !alreadyEmails.has((f.parentEmail || "").toLowerCase()));
    return q
      ? base.filter(f => [f.parentName, f.childName, f.parentEmail].some(v => v?.toLowerCase().includes(q)))
      : base;
  }, [renewalFamilies, pioneers, renewalSearch]);

  const registeredFamilies = useMemo(() => {
    const pioneerEmails = new Set(pioneers.flatMap(f => [f.email, f.email2].map(email => (email || "").trim().toLowerCase()).filter(Boolean)));
    const grouped = new Map<string, { parentName: string; parentEmail: string; children: Set<string>; programs: Set<string> }>();

    for (const student of directoryStudents) {
      const parentEmail = (student.parentInfo?.email || "").trim().toLowerCase();
      const parentName = (student.parentInfo?.name || "").trim();
      const childName = [student.childInfo?.firstName, student.childInfo?.lastName].filter(Boolean).join(" ").trim();
      const identity = `${parentName} ${childName} ${parentEmail}`.toLowerCase();
      if (!parentEmail || pioneerEmails.has(parentEmail) || student.isPioneer || identity.includes("ian angelo valmores")) continue;

      const family = grouped.get(parentEmail) || { parentName: parentName || "Parent/Guardian", parentEmail, children: new Set<string>(), programs: new Set<string>() };
      if (childName) family.children.add(childName);
      const programName = student.programName || student.program;
      if (programName) family.programs.add(programName);
      grouped.set(parentEmail, family);
    }

    const query = renewalSearch.trim().toLowerCase();
    return Array.from(grouped.entries())
      .map(([email, family]) => ({
        key: email,
        parentName: family.parentName,
        parentEmail: email,
        childName: Array.from(family.children).join(", "),
        programName: Array.from(family.programs).join(", "),
      }))
      .filter(family => !query || `${family.parentName} ${family.parentEmail} ${family.childName} ${family.programName}`.toLowerCase().includes(query));
  }, [directoryStudents, pioneers, renewalSearch]);

  const pickerFamilies: PickerFamily[] = pickSource === "renewals"
    ? filteredRenewal.map(f => ({ key: `renewal:${f._id}`, parentName: f.parentName, parentEmail: f.parentEmail, childName: f.childName, programName: f.previousProgram }))
    : registeredFamilies.map(f => ({ ...f, key: `student:${f.key}` }));

  const configuredPriceCount = PROGRAMS.filter(program => Boolean(pioneerPrices[program.key])).length;

  function openAdd() {
    setModalMode("add"); setEditId(null); setFParent(""); setFChild(""); setFEmail(""); setFEmail2("");
  }
  function openEdit(f: PioneerFamily) {
    setModalMode("edit"); setEditId(f.id); setFParent(f.parentName); setFChild(f.childName); setFEmail(f.email); setFEmail2(f.email2 || "");
  }
  function openPick() {
    setModalMode("pick"); setPickedIds(new Set()); setRenewalSearch(""); setPickSource("renewals");
  }
  function closeModal() { setModalMode(null); setEditId(null); }

  function togglePick(id: string) {
    setPickedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleSaveManual() {
    if (!fEmail.trim()) { showToast("Email is required", "error"); return; }
    setSaving(true);
    try {
      const body: any = { parentName: fParent, childName: fChild, email: fEmail, email2: fEmail2 };
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
      const selectedRenewalFamilies = renewalFamilies
        .filter(f => pickedIds.has(`renewal:${f._id}`))
        .map(f => ({ parentName: f.parentName, childName: f.childName, email: f.parentEmail }));
      const selectedStudentFamilies = registeredFamilies
        .filter(f => pickedIds.has(`student:${f.key}`))
        .map(f => ({ parentName: f.parentName, childName: f.childName, email: f.parentEmail }));
      const toAdd = Array.from(new Map(
        [...selectedRenewalFamilies, ...selectedStudentFamilies]
          .map(family => [family.email.trim().toLowerCase(), family] as const)
      ).values());
      let ok = 0;
      for (const family of toAdd) {
        const res = await fetch("/api/pioneer-families", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(family),
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
        <div className="relative isolate flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-3xl border border-[#174da8] bg-gradient-to-br from-[#0033A0] via-[#0646b5] to-[#002f76] p-6 shadow-[0_12px_30px_rgba(0,47,118,0.18)]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 -z-10 h-64 w-64 rounded-full border-[32px] border-white/[0.06]" />
          <div aria-hidden="true" className="pointer-events-none absolute right-36 -bottom-24 -z-10 h-48 w-48 rounded-full bg-white/[0.04]" />
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-3xl shadow-inner">⭐</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline text-[22px] font-extrabold text-white">Pioneer Families</h1>
                <span className="rounded-full border border-amber-200/40 bg-amber-300 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-950">Special Pricing</span>
              </div>
              <p className="mt-1 text-[13px] text-blue-100">
                Pioneer families get exclusive pricing on renewal. Set per-program prices below.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={openPick}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-white/30 bg-white/10 px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-white/20"
            >
              👥 Pick Families
            </button>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-300 px-4 py-2.5 text-[12.5px] font-extrabold text-[#002f76] shadow-sm transition-colors hover:bg-amber-200"
            >
              + Add Manually
            </button>
          </div>
        </div>

        {/* ── Pioneer Prices ── */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(0,47,118,0.06)]">
          <button
            type="button"
            onClick={() => setPricesOpen(open => !open)}
            aria-expanded={pricesOpen}
            aria-controls="pioneer-program-prices"
            className="flex w-full flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#f5f8ff] via-white to-amber-50/70 px-5 py-4 text-left transition-colors hover:from-blue-50 hover:to-amber-50 sm:px-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0033A0] text-xl text-white shadow-md shadow-blue-900/15">₱</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span role="heading" aria-level={2} className="font-headline text-[17px] font-extrabold text-[#002f76]">Pioneer Prices per Program</span>
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#0033A0]">{configuredPriceCount} of {PROGRAMS.length} set</span>
                </div>
                <p className="mt-0.5 text-[12px] text-slate-500">Configure special renewal rates for each program.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-800 sm:inline-flex">
                ⭐ Pioneer family rates
              </span>
              <span className={`flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-transform ${pricesOpen ? "rotate-180" : ""}`} aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2"><path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </div>
          </button>

          <div id="pioneer-program-prices" className={`${pricesOpen ? "grid" : "hidden"} grid-cols-1 gap-4 border-t border-slate-100 bg-[#fbfcff] p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3`}>
            {PROGRAMS.map(prog => (
              <div key={prog.key} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-[#f8faff] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-5">
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: prog.accent }} />
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl" style={{ background: prog.bg, color: prog.color }}>
                      {prog.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[14px] text-[#002f76]">{prog.label}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">Regular tuition <span className="font-extrabold text-slate-700">₱{prog.regular.toLocaleString()}</span></p>
                    </div>
                  </div>
                </div>
                <div className="mb-3 flex min-h-9 items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white/80 px-3 py-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Current pioneer price</span>
                  {pioneerPrices[prog.key] ? (
                    <span className="text-[13px] font-extrabold" style={{ color: prog.color }}>₱{pioneerPrices[prog.key].toLocaleString()}</span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400">Not set</span>
                  )}
                </div>
                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor={`pioneer-price-${prog.key}`}>Set pioneer price</label>
                <div className="flex items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-extrabold text-[#002f76]">₱</span>
                    <input
                      id={`pioneer-price-${prog.key}`}
                      type="number"
                      min="1"
                      value={priceInputs[prog.key] || ""}
                      onChange={e => setPriceInputs(prev => ({ ...prev, [prog.key]: e.target.value }))}
                      placeholder={`e.g. ${prog.regular - 100}`}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-[13px] font-bold text-[#002f76] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <button
                    onClick={() => handleSavePrice(prog.key)}
                    disabled={saving}
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-[12px] font-extrabold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 ${savedPrices[prog.key] ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#0033A0] hover:bg-[#002f76]"}`}
                  >
                    {savedPrices[prog.key] ? "✓ Saved" : saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Families Table ── */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(0,47,118,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-[#f5f8ff] via-white to-white px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-xl text-amber-700">⭐</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-headline text-[17px] font-extrabold text-[#002f76]">Pioneer Families</h2>
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-extrabold text-[#0033A0]">{filteredPioneers.length} {filteredPioneers.length === 1 ? "family" : "families"}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-slate-500">Families eligible for special renewal pricing.</p>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" stroke="currentColor" strokeWidth="2"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5" strokeLinecap="round"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                aria-label="Search pioneer families by name or email"
                className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-[12px] font-semibold text-[#002f76] outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Column headers */}
          <div className="hidden sm:grid grid-cols-[2fr_1.5fr_2fr_1fr_auto] gap-4 border-b border-slate-100 bg-[#f8faff] px-6 py-3">
            {["Parent / Guardian", "Explorer", "Email", "Added", "Actions"].map(h => (
              <p key={h} className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#6680a5]">{h}</p>
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
                    👥 Pick Families
                  </button>
                  <button onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-4 py-2 text-[12.5px] font-bold text-white hover:bg-[#002f76]">
                    + Add Manually
                  </button>
                </div>
              )}
            </div>
          ) : (
            paginatedPioneers.map((f, i) => (
              <div
                key={f.id}
                className={`group grid grid-cols-1 items-center gap-3 px-5 py-4 transition-colors hover:bg-blue-50/40 sm:grid-cols-[2fr_1.5fr_2fr_1fr_auto] sm:gap-4 sm:px-6 ${i < paginatedPioneers.length - 1 ? "border-b border-slate-100" : ""}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0b57c2] to-[#0033A0] text-[11px] font-extrabold text-white shadow-sm ring-2 ring-blue-100">{getInitials(f.parentName)}</div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-[13px] text-[#002f76]">{f.parentName || "—"}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Parent / Guardian</p>
                  </div>
                </div>
                <div className="min-w-0 pl-[52px] sm:pl-0">
                  <p className="truncate text-[12px] font-semibold text-slate-700">{f.childName || "—"}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Explorer</p>
                </div>
                <div className="min-w-0 pl-[52px] sm:pl-0">
                  <p className="truncate text-[12px] text-slate-600">{f.email || "—"}</p>
                  {f.email2 && <p className="truncate text-[11px] text-slate-400">{f.email2}</p>}
                </div>
                <div className="pl-[52px] sm:pl-0">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{fmtDate(f.createdAt)}</span>
                </div>
                <div className="flex gap-2 pl-[52px] sm:pl-0">
                  <button
                    onClick={() => openEdit(f)}
                    className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold text-[#0050d5] transition-colors hover:border-blue-200 hover:bg-blue-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(f.id)}
                    disabled={deleting === f.id}
                    className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-[11px] font-extrabold text-red-600 transition-colors hover:border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleting === f.id ? "…" : "Remove"}
                  </button>
                </div>
              </div>
            ))
          )}
          {!loading && filteredPioneers.length > 0 && (
            <TablePagination
              total={filteredPioneers.length}
              page={safePage}
              pageCount={pageCount}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
              itemLabel="families"
              ariaLabel="Pioneer family pages"
            />
          )}
        </section>

        {/* ── Add/Edit Manual Modal ── */}
        {(modalMode === "add" || modalMode === "edit") && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071a35]/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
            <div role="dialog" aria-modal="true" aria-labelledby="pioneer-family-dialog-title" className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_24px_80px_rgba(2,20,55,0.3)]">
              <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-[#0033A0] to-[#002f76] px-6 py-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl text-white">{modalMode === "add" ? "⭐" : "✏️"}</span>
                  <div>
                    <h2 id="pioneer-family-dialog-title" className="font-headline text-[18px] font-extrabold text-white">
                      {modalMode === "add" ? "Add Pioneer Family" : "Edit Pioneer Family"}
                    </h2>
                    <p className="mt-0.5 text-[12px] text-blue-100">{modalMode === "add" ? "Add a family to the special renewal pricing list." : "Update this family’s contact details."}</p>
                  </div>
                </div>
                <button type="button" onClick={closeModal} aria-label="Close dialog" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white">×</button>
              </div>

              <div className="space-y-4 p-6">
                {[
                  { label: "Parent Name", value: fParent, set: setFParent, placeholder: "e.g. Maria Santos" },
                  { label: "Child Name", value: fChild, set: setFChild, placeholder: "e.g. Isabella Santos" },
                  { label: "Email Address *", value: fEmail, set: setFEmail, placeholder: "parent@email.com" },
                  { label: "Second Email Address (optional)", value: fEmail2, set: setFEmail2, placeholder: "second-parent@email.com" },
                ].map(({ label, value, set, placeholder }) => (
                  <div key={label}>
                    <label htmlFor={`pioneer-modal-${label}`} className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">{label}</label>
                    <input
                      id={`pioneer-modal-${label}`}
                      type={label.toLowerCase().includes("email") ? "email" : "text"}
                      value={value}
                      onChange={e => set(e.target.value)}
                      placeholder={placeholder}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-[13px] font-semibold text-[#002f76] outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                <button onClick={closeModal} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-100">Cancel</button>
                <button onClick={handleSaveManual} disabled={saving} className="rounded-xl bg-[#0033A0] px-5 py-2.5 text-[13px] font-extrabold text-white shadow-sm transition-colors hover:bg-[#002f76] disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? "Saving…" : modalMode === "add" ? "Add Family" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Pick Families Modal ── */}
        {modalMode === "pick" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071a35]/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
            <div role="dialog" aria-modal="true" aria-labelledby="renewal-family-dialog-title" className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_24px_80px_rgba(2,20,55,0.3)]">
              <div className="border-b border-slate-100 bg-gradient-to-br from-[#0033A0] to-[#002f76] px-5 py-5 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl text-white">👥</span>
                    <div>
                      <h2 id="renewal-family-dialog-title" className="font-headline text-[18px] font-extrabold text-white">Pick Families for Pioneer Pricing</h2>
                      <p className="mt-0.5 text-[12px] text-blue-100">Select from renewals or registered students.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold text-white">
                    {pickedIds.size} selected
                    </span>
                    <button type="button" onClick={closeModal} aria-label="Close dialog" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white">×</button>
                  </div>
                </div>
                <div className="mt-4 inline-flex rounded-xl border border-white/15 bg-white/10 p-1">
                  <button
                    type="button"
                    onClick={() => setPickSource("renewals")}
                    className={`rounded-lg px-3 py-2 text-[11px] font-extrabold transition-colors ${pickSource === "renewals" ? "bg-white text-[#0033A0] shadow-sm" : "text-blue-100 hover:bg-white/10"}`}
                  >
                    Renewals <span className="ml-1 opacity-70">{filteredRenewal.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickSource("students")}
                    className={`rounded-lg px-3 py-2 text-[11px] font-extrabold transition-colors ${pickSource === "students" ? "bg-white text-[#0033A0] shadow-sm" : "text-blue-100 hover:bg-white/10"}`}
                  >
                    Registered Students <span className="ml-1 opacity-70">{registeredFamilies.length}</span>
                  </button>
                </div>
                <div className="relative mt-4">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" stroke="currentColor" strokeWidth="2"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5" strokeLinecap="round"/></svg>
                  <input
                    value={renewalSearch}
                    onChange={e => setRenewalSearch(e.target.value)}
                    placeholder={`Search ${pickSource === "renewals" ? "renewal families" : "registered students"} by name or email…`}
                    aria-label={`Search ${pickSource === "renewals" ? "renewal families" : "registered students"}`}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-[13px] font-semibold text-[#002f76] outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-[#fbfcff]">
                {pickerFamilies.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl">👨‍👩‍👧</span>
                    <p className="text-[13px] font-bold text-[#002f76]">{renewalSearch ? "No matching families" : pickSource === "renewals" ? "No renewal families to add" : "No registered families to add"}</p>
                    <p className="mt-1 text-[12px] text-slate-500">{renewalSearch ? "Try another name or email." : "Families already on the Pioneer list are hidden here."}</p>
                  </div>
                ) : pickerFamilies.map((f, i) => {
                  const picked = pickedIds.has(f.key);
                  return (
                    <button
                      key={f.key}
                      onClick={() => togglePick(f.key)}
                      className={`flex w-full items-center gap-3 border-b border-slate-100 px-5 py-3.5 text-left transition-colors sm:px-6 ${picked ? "bg-blue-50" : "bg-white hover:bg-blue-50/50"} ${i === 0 ? "border-t border-slate-100" : ""}`}
                    >
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${picked ? "border-[#0033A0] bg-[#0033A0]" : "border-slate-300 bg-white"}`}>
                        {picked && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0b57c2] to-[#0033A0] text-[11px] font-extrabold text-white shadow-sm">{getInitials(f.parentName)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-[13px] text-[#002f76]">{f.childName || "Child not listed"}</p>
                        <p className="truncate text-[12px] text-slate-500">{f.parentName} · {f.parentEmail}</p>
                      </div>
                      {f.programName && (
                        <span className="hidden shrink-0 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-[#31547f] sm:inline-flex">{f.programName.split(":").pop()?.trim()}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
                <p className="text-[12px] text-slate-500">
                  Or{" "}
                  <button onClick={() => { closeModal(); openAdd(); }} className="font-extrabold text-[#0033A0] underline underline-offset-2 hover:no-underline">
                    add a family manually
                  </button>
                </p>
                <div className="flex gap-2">
                  <button onClick={closeModal} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-100">Cancel</button>
                  <button
                    onClick={handleSavePicked}
                    disabled={saving || pickedIds.size === 0}
                    className="rounded-xl bg-[#0033A0] px-5 py-2.5 text-[13px] font-extrabold text-white shadow-sm transition-colors hover:bg-[#002f76] disabled:cursor-not-allowed disabled:opacity-50"
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
