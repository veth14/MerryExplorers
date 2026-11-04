"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";

type Account = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  accountType: "staff" | "parent";
  status: string;
  childName?: string;
  program?: string;
  classTime?: string;
  phone?: string;
};

type HistoryItem = {
  id: string;
  targetName: string;
  targetEmail: string;
  targetRole: string;
  accountType?: "staff" | "parent";
  childName?: string;
  program?: string;
  requestedByName: string;
  createdAt: string;
  outcome: string;
};

function generateTemporaryPassword(): string {
  const words = ["Merry", "Explorer", "Adventure", "Joyful", "Bright", "Playgroup"];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const specials = ["!", "@", "#", "$", "%"];
  const special = specials[Math.floor(Math.random() * specials.length)];
  return `${word}${num}${special}`;
}

export default function PasswordResetsPage() {
  const { user, userProfile } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "staff" | "parent">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

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
      if (!response.ok) throw new Error(data.error || "Unable to load password reset accounts.");
      setAccounts(data.accounts || []);
      setHistory(data.history || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load password reset accounts.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const staff = accounts.filter((a) => a.accountType === "staff").length;
    const parent = accounts.filter((a) => a.accountType === "parent").length;
    return { all: accounts.length, staff, parent };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    let list = accounts;
    if (filterType !== "all") {
      list = list.filter((a) => a.accountType === filterType);
    }
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((account) =>
      `${account.fullName} ${account.email} ${account.role} ${account.childName || ""} ${account.program || ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [accounts, filterType, search]);

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedId) || null;
  }, [accounts, selectedId]);

  const handleGeneratePassword = () => {
    const pwd = generateTemporaryPassword();
    setNewPassword(pwd);
    setShowNewPassword(true);
    setCopied(false);
  };

  const handleCopyPassword = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleReset = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !selectedId) return;
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
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
      setNotice(
        data.warning ||
          `Password updated for ${selectedAccount?.fullName || "the account"}. Provide this temporary password to them securely.`,
      );
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update the password.");
    } finally {
      setSaving(false);
    }
  };

  const userRole = (userProfile?.role || "").toLowerCase();
  const isAuthorized = userRole === "developer" || userRole === "admin";

  if (!isAuthorized) {
    return (
      <AppShell
        title="Password Resets"
        description="Administrative password management for locked-out accounts."
      >
        <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
          <p className="mt-2 text-sm text-slate-600">
            This administrative tool is reserved for Developers and Administrators.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Password Resets"
      description="Directly reset passwords for locked-out staff and parent accounts."
    >
      <div className="space-y-6">
        {/* Main 2-column grid */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
          {/* Account directory list */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Header with tabs and search */}
            <div className="border-b border-slate-100 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Account Directory</h2>
                  <p className="text-xs text-slate-500">
                    Select a staff member or parent to reset their sign-in credentials.
                  </p>
                </div>

                {/* Filter tabs */}
                <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setFilterType("all")}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      filterType === "all"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All ({counts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("staff")}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      filterType === "staff"
                        ? "bg-white text-[#002f76] shadow-sm font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Staff ({counts.staff})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("parent")}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      filterType === "parent"
                        ? "bg-white text-emerald-700 shadow-sm font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Parents ({counts.parent})
                  </button>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative mt-4">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, email, child's name, or program..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* List of accounts */}
            <div className="max-h-[580px] min-h-[300px] overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-sm text-slate-500">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <span className="mt-3">Loading accounts...</span>
                </div>
              ) : filteredAccounts.length ? (
                filteredAccounts.map((account) => {
                  const isSelected = selectedId === account.id;
                  const isParent = account.accountType === "parent";

                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(account.id);
                        setError("");
                        setNotice("");
                      }}
                      className={`flex w-full items-start justify-between gap-4 p-4 text-left transition ${
                        isSelected
                          ? "bg-blue-50/80 ring-1 ring-inset ring-blue-500/30"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Avatar initials circle */}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold uppercase ${
                            isParent
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-[#002f76]"
                          }`}
                        >
                          {account.fullName
                            ? account.fullName
                                .split(" ")
                                .map((n) => n[0])
                                .filter(Boolean)
                                .slice(0, 2)
                                .join("")
                            : "U"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-semibold text-slate-900">
                              {account.fullName}
                            </span>
                            {isParent ? (
                              <span className="inline-flex shrink-0 items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                Parent
                              </span>
                            ) : (
                              <span className="inline-flex shrink-0 items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                {account.role}
                              </span>
                            )}
                          </div>

                          <div className="mt-0.5 truncate text-xs text-slate-500">
                            {account.email}
                          </div>

                          {/* Extra info for parents */}
                          {isParent && (account.childName || account.program) && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                              {account.childName && (
                                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                                  <svg
                                    className="h-3 w-3 text-slate-400"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                  </svg>
                                  Child: {account.childName}
                                </span>
                              )}
                              {account.program && (
                                <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-amber-800 ring-1 ring-inset ring-amber-600/20">
                                  {account.program}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right selection checkmark / arrow */}
                      <div className="shrink-0 pt-1">
                        {isSelected ? (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full text-slate-300">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-12 text-center text-sm text-slate-500">
                  No matching accounts found for &quot;{search}&quot;.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Reset Password Action Panel */}
          <div className="flex flex-col gap-6">
            <form
              onSubmit={handleReset}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#002f76]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Set New Password</h2>
                  <p className="text-xs text-slate-500">
                    Instantly update the Firebase credentials for this user.
                  </p>
                </div>
              </div>

              {/* Selected account details banner */}
              {selectedAccount ? (
                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{selectedAccount.fullName}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            selectedAccount.accountType === "parent"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {selectedAccount.accountType === "parent" ? "Parent" : selectedAccount.role}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600 font-mono">
                        {selectedAccount.email}
                      </div>
                      {selectedAccount.childName && (
                        <div className="mt-1 text-xs text-slate-600">
                          <span className="font-medium text-slate-700">Child:</span> {selectedAccount.childName}
                        </div>
                      )}
                      {selectedAccount.program && (
                        <div className="mt-0.5 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">Program:</span> {selectedAccount.program}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId("");
                        setError("");
                        setNotice("");
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center text-sm text-slate-500">
                  <svg
                    className="mx-auto h-7 w-7 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                    />
                  </svg>
                  <p className="mt-2 font-medium text-slate-700">No account selected</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Click any staff member or parent in the list on the left to set their password.
                  </p>
                </div>
              )}

              {/* Password controls */}
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="temp-password" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Temporary Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Generate Random
                  </button>
                </div>

                <div className="relative flex items-center">
                  <input
                    id="temp-password"
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={!selectedId}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-24 text-sm font-mono outline-none transition placeholder:text-slate-400 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                    placeholder="At least 8 characters"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    {newPassword && (
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(newPassword)}
                        title="Copy password"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                      >
                        {copied ? (
                          <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                    >
                      {showNewPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  Password must be 8–128 characters. Once set, send this password privately to the account holder.
                </p>
              </div>

              {/* Status & Error messages */}
              {error && (
                <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
                  <svg className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {notice && (
                <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-900">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Password successfully updated!
                  </div>
                  <p className="mt-1 text-emerald-800">{notice}</p>
                  {newPassword && (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-white/80 p-2 font-mono text-xs text-slate-800 border border-emerald-200">
                      <span>{newPassword}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(newPassword)}
                        className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition"
                      >
                        {copied ? "Copied!" : "Copy Password"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={!selectedId || newPassword.length < 8 || saving}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#003b8e] px-4 py-3 font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Updating Firebase Password...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Update Account Password</span>
                  </>
                )}
              </button>

              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
                <span className="font-semibold text-slate-700">Security note:</span> Passwords are transmitted directly to Google Firebase Identity Toolkit and never stored in plain text or saved to application database logs.
              </div>
            </form>
          </div>
        </div>

        {/* Audit Log Table: Recent Password Changes */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Recent Password Reset Audit Logs</h2>
                <p className="text-xs text-slate-500">
                  Records who reset which account and when. Passwords are never saved or revealed.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {history.length} {history.length === 1 ? "log entry" : "log entries"}
              </span>
            </div>
          </div>

          {history.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Target Account</th>
                    <th className="px-5 py-3">Account Type / Role</th>
                    <th className="px-5 py-3">Reset Performed By</th>
                    <th className="px-5 py-3">Date & Time</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {history.map((item) => {
                    const isParent = item.accountType === "parent" || item.targetRole?.toLowerCase() === "parent";
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-slate-900 block">{item.targetName}</span>
                          <span className="text-slate-500 font-mono text-[11px]">{item.targetEmail}</span>
                          {item.childName && (
                            <span className="mt-0.5 block text-[11px] text-slate-600">
                              Child: <span className="font-medium text-slate-800">{item.childName}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {isParent ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              Parent
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                              {item.targetRole}
                            </span>
                          )}
                          {item.program && (
                            <span className="ml-1.5 text-[11px] text-slate-500">({item.program})</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-medium">
                          {item.requestedByName}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {new Date(item.createdAt).toLocaleString("en-US", {
                            timeZone: "Asia/Manila",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Success
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              No password changes recorded yet.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
