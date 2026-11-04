"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";

type Account = { id: string; fullName: string; email: string; role: string; status: string };
type HistoryItem = {
  id: string;
  targetName: string;
  targetEmail: string;
  targetRole: string;
  requestedByName: string;
  createdAt: string;
  outcome: string;
};

export default function PasswordResetsPage() {
  const { user, userProfile } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/password-resets", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load password tools.");
      setAccounts(data.accounts || []);
      setHistory(data.history || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load password tools.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const filteredAccounts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return accounts;
    return accounts.filter((account) =>
      `${account.fullName} ${account.email} ${account.role}`.toLowerCase().includes(term),
    );
  }, [accounts, search]);

  const handleReset = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !selectedId) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/password-resets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId: selectedId, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update the password.");
      setNotice(data.warning || "Password updated. Share the new password with the account holder through a secure channel.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update the password.");
    } finally {
      setSaving(false);
    }
  };

  if ((userProfile?.role || "").toLowerCase() !== "developer") {
    return <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-8 text-center text-slate-700">This page is available to developers only.</div>;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Developer tools</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#002f76]">Password resets</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">Set a new password for an account when its owner is locked out. This works with the account’s existing sign-in email, even if that address cannot receive email.</p>
      </header>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Staff accounts</h2>
                <p className="mt-1 text-sm text-slate-500">Choose an account to set a new password.</p>
              </div>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search accounts" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 sm:w-64" />
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading accounts…</div>
          ) : filteredAccounts.length ? (
            <div className="divide-y divide-slate-100">
              {filteredAccounts.map((account) => (
                <button key={account.id} type="button" onClick={() => setSelectedId(account.id)} className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-blue-50/60 ${selectedId === account.id ? "bg-blue-50" : ""}`}>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-900">{account.fullName}</span>
                    <span className="mt-1 block truncate text-sm text-slate-500">{account.email}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">{account.role}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">No matching accounts.</div>
          )}
        </div>

        <form onSubmit={handleReset} className="h-fit rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl" aria-hidden="true">🔐</div>
          <h2 className="text-lg font-bold text-slate-900">Set a new password</h2>
          <p className="mt-1 text-sm text-slate-500">{accounts.find((account) => account.id === selectedId)?.email || "Select an account from the list first."}</p>
          <label htmlFor="new-password" className="mt-5 block text-sm font-semibold text-slate-700">Temporary password</label>
          <div className="mt-2 flex gap-2">
            <input id="new-password" type={showNewPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" placeholder="At least 8 characters" />
            <button type="button" onClick={() => setShowNewPassword((visible) => !visible)} className="rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">{showNewPassword ? "Hide" : "Show"}</button>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Give this password to the account holder privately. Ask them to change it after signing in.</p>
          {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
          <button type="submit" disabled={!selectedId || !newPassword || saving} className="mt-5 w-full rounded-xl bg-[#003b8e] px-4 py-3 font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Updating password…" : "Set new password"}
          </button>
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Passwords are sent directly to Firebase for the update, then discarded. The app records only who reset which account and when. Passwords are never saved or shown in history.</p>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-lg font-bold text-slate-900">Recent password changes</h2>
          <p className="mt-1 text-sm text-slate-500">Audit details only; no passwords are included.</p>
        </div>
        {history.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Account</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Updated by</th><th className="px-5 py-3">Date</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{history.map((item) => <tr key={item.id}><td className="px-5 py-4"><span className="font-semibold text-slate-800">{item.targetName}</span><span className="mt-1 block text-xs text-slate-500">{item.targetEmail}</span></td><td className="px-5 py-4 capitalize text-slate-600">{item.targetRole}</td><td className="px-5 py-4 text-slate-600">{item.requestedByName}</td><td className="px-5 py-4 text-slate-600">{new Date(item.createdAt).toLocaleString()}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <div className="p-6 text-sm text-slate-500">No password changes recorded yet.</div>}
      </section>
    </main>
  );
}
