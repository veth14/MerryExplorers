"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { DualMonthCalendar } from "@/components/calendar/dual-calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { cachedFetch, invalidateCache } from "@/lib/cache";
import { useAuth } from "@/lib/auth-context";

type SuspendedDay = {
  dateStr: string;
  type: "suspension" | "holiday";
  reason?: string;
};

export default function CalendarPage() {
  const { user, userProfile } = useAuth();
  const [suspendedDays, setSuspendedDays] = useState<SuspendedDay[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [existingRecord, setExistingRecord] = useState<SuspendedDay | null>(null);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [showUndoModal, setShowUndoModal] = useState(false);
  
  // Mark Form State
  const [dayOffType, setDayOffType] = useState<"suspension" | "holiday">("suspension");
  const [suspendInput, setSuspendInput] = useState("");
  const [autoAnnounce, setAutoAnnounce] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Use date=today trick to reuse the GET attendance logic which returns all suspended days
      // Add timestamp to bust browser/Next.js caching since the API has Cache-Control headers
      const json = await cachedFetch<any>("calendar:suspended", `/api/attendance?date=today&_t=${Date.now()}`, 20_000);
      if (json?.success && Array.isArray(json.suspendedDays)) {
        setSuspendedDays(json.suspendedDays);
      }
    } catch (err) {
      console.error("Failed to fetch calendar data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateClick = (dateStr: string, record: SuspendedDay | undefined) => {
    setSelectedDate(dateStr);
    if (record) {
      setExistingRecord(record);
      setShowUndoModal(true);
    } else {
      setExistingRecord(null);
      setDayOffType("suspension");
      setSuspendInput("");
      setShowMarkModal(true);
    }
  };

  const handleMarkDayOff = async () => {
    if (!selectedDate) return;
    setActionLoading(true);
    try {
      await fetch("/api/attendance/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateStr: selectedDate,
          reason: suspendInput.trim() || (dayOffType === "holiday" ? "Philippine Public Holiday" : "Suspension announced"),
          type: dayOffType,
        }),
      });

      // Write audit log
      try {
        await fetch("/api/audit-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorUid: user?.uid || null,
            actorName: userProfile?.fullName || user?.email || "Unknown",
            actorRole: userProfile?.role || "Unknown",
            action: "CREATE",
            category: dayOffType === "holiday" ? "holiday" : "suspension",
            targetId: selectedDate,
            targetTitle: selectedDate,
            details: `Marked ${selectedDate} as ${dayOffType === "holiday" ? "Holiday" : "Suspension"} via Calendar: ${suspendInput.trim() || "No reason"}`,
          }),
        });
      } catch { /* non-fatal */ }

      if (autoAnnounce) {
        const reason = suspendInput.trim() || (dayOffType === "holiday" ? "Philippine Public Holiday" : "Suspension announced");
        const endDateObj = new Date(selectedDate);
        endDateObj.setHours(23, 59, 59, 999);

        await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: dayOffType === "holiday"
              ? `Holiday: ${selectedDate}`
              : `Classes Suspended: ${selectedDate}`,
            content: dayOffType === "holiday"
              ? `${selectedDate} is a public holiday. No classes will be held. Reason: ${reason}.`
              : `Please be advised that classes are suspended on ${selectedDate}. Reason: ${reason}.`,
            type: "alert",
            startDate: new Date().toISOString(),
            endDate: endDateObj.toISOString(),
          }),
        });
      }

      invalidateCache("calendar:suspended");
      setShowMarkModal(false);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUndoDayOff = async () => {
    if (!selectedDate || !existingRecord) return;
    setActionLoading(true);
    try {
      await fetch(`/api/attendance/suspend?dateStr=${selectedDate}`, { method: "DELETE" });

      try {
        await fetch("/api/audit-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorUid: user?.uid || null,
            actorName: userProfile?.fullName || user?.email || "Unknown",
            actorRole: userProfile?.role || "Unknown",
            action: "DELETE",
            category: existingRecord.type === "holiday" ? "holiday" : "suspension",
            targetId: selectedDate,
            targetTitle: selectedDate,
            details: `Lifted ${existingRecord.type === "holiday" ? "holiday" : "suspension"} for ${selectedDate} via Calendar`,
          }),
        });
      } catch { /* non-fatal */ }

      invalidateCache("calendar:suspended");
      setShowUndoModal(false);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppShell title="School Calendar" description="View and manage public holidays and class suspensions.">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-[3px] bg-[#ffb800]" />
          <h1 className="text-[14px] font-black uppercase tracking-[0.1em] text-[#002f76]">
            School Calendar
          </h1>
        </div>

        {loading ? (
          <div className="h-[500px] w-full rounded-[2rem] border-2 border-[#e2e8f0] bg-white p-6 shadow-lg flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-2xl" />
          </div>
        ) : (
          <DualMonthCalendar suspendedDays={suspendedDays} onDateClick={handleDateClick} />
        )}
      </div>

      {/* ── Mark Day Off Modal ── */}
      {showMarkModal && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !actionLoading && setShowMarkModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md mx-4 z-10">
            {/* Type toggle */}
            <div className="flex rounded-2xl border-2 border-[#e2e8f0] overflow-hidden mb-5">
              <button
                onClick={() => setDayOffType("suspension")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-black transition-all ${dayOffType === "suspension" ? "bg-red-600 text-white" : "text-[#5a6e8c] hover:bg-[#f8faff]"}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>block</span>
                Suspension
              </button>
              <button
                onClick={() => setDayOffType("holiday")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-black transition-all ${dayOffType === "holiday" ? "bg-amber-500 text-white" : "text-[#5a6e8c] hover:bg-[#f8faff]"}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>celebration</span>
                Holiday
              </button>
            </div>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mx-auto ${dayOffType === "holiday" ? "bg-amber-50" : "bg-red-50"}`}>
              <span className={`material-symbols-outlined ${dayOffType === "holiday" ? "text-amber-500" : "text-red-600"}`} style={{ fontSize: "30px" }}>
                {dayOffType === "holiday" ? "celebration" : "block"}
              </span>
            </div>

            <h2 className="text-[18px] font-black text-[#002f76] text-center mb-1">
              Mark <span className="text-[#005cc8]">{selectedDate}</span>
            </h2>
            <p className="text-[12px] font-medium text-[#5a6e8c] text-center mb-5">
              {dayOffType === "holiday"
                ? <>All staff will be marked <span className="font-bold text-amber-600">&quot;Holiday&quot;</span>. Monthly staff will be paid; daily staff will not.</>
                : <>All staff will be marked <span className="font-bold text-orange-600">&quot;Suspended&quot;</span>. No one will be penalized as Late or Absent.</>
              }
            </p>

            {/* Reason */}
            <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">
              Reason <span className="text-[#9aa3b2] font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder={dayOffType === "holiday" ? "e.g. Ninoy Aquino Day, National Heroes Day..." : "e.g. Typhoon, Emergency..."}
              value={suspendInput}
              onChange={(e) => setSuspendInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !actionLoading && handleMarkDayOff()}
              className="w-full rounded-xl border-2 border-[#e2e8f0] bg-[#f8faff] px-4 py-2.5 text-[13px] font-bold text-[#002f76] outline-none focus:border-[#0050d5] focus:bg-white transition-all mb-4"
            />

            {/* Auto Announce */}
            <div className="flex items-center gap-2 mb-6 ml-1">
              <input
                type="checkbox"
                id="autoAnnounce"
                checked={autoAnnounce}
                onChange={(e) => setAutoAnnounce(e.target.checked)}
                className="w-4 h-4 text-[#005cc8] rounded border-gray-300 focus:ring-[#005cc8]"
              />
              <label htmlFor="autoAnnounce" className="text-[12px] font-bold text-[#002f76] cursor-pointer">
                Auto-generate announcement
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMarkModal(false)}
                disabled={actionLoading}
                className="flex-1 rounded-xl border-2 border-[#e2e8f0] py-2.5 text-[13px] font-bold text-[#5a6e8c] hover:bg-[#f0f4f9] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkDayOff}
                disabled={actionLoading}
                className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${dayOffType === "holiday" ? "bg-amber-500 hover:bg-amber-600" : "bg-red-600 hover:bg-red-700"}`}
              >
                {actionLoading ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                    {dayOffType === "holiday" ? "celebration" : "block"}
                  </span>
                )}
                {actionLoading ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Undo Modal ── */}
      {showUndoModal && selectedDate && existingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !actionLoading && setShowUndoModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm mx-4 z-10">
            <div className="w-14 h-14 rounded-2xl bg-[#f0f5ff] flex items-center justify-center mb-4 mx-auto">
              <span className="material-symbols-outlined text-[#005cc8]" style={{ fontSize: "30px" }}>undo</span>
            </div>
            <h2 className="text-[18px] font-black text-[#002f76] text-center mb-1">
              Undo {existingRecord.type === "holiday" ? "Holiday" : "Suspension"}
            </h2>
            <p className="text-[12px] font-medium text-[#5a6e8c] text-center mb-5">
              Are you sure you want to remove the {existingRecord.type === "holiday" ? "holiday" : "suspension"} for <span className="font-bold text-[#005cc8]">{selectedDate}</span>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUndoModal(false)}
                disabled={actionLoading}
                className="flex-1 rounded-xl border-2 border-[#e2e8f0] py-2.5 text-[13px] font-bold text-[#5a6e8c] hover:bg-[#f0f4f9] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUndoDayOff}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 py-2.5 text-[13px] font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {actionLoading ? "Processing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
