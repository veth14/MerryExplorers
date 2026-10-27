"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import {
  CalendarEvent,
  CalendarEventType,
  CalendarVisibility,
  EVENT_TYPE_META,
  getManilaDateStr,
  addMonths,
} from "@/lib/calendar-events";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getManilaMonthStr(): string {
  return getManilaDateStr().slice(0, 7);
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay(); // 0=Sun
}

type EventsByDate = Record<string, CalendarEvent[]>;

function buildEventsByDate(events: CalendarEvent[]): EventsByDate {
  const map: EventsByDate = {};
  for (const e of events) {
    if (!map[e.startDate]) map[e.startDate] = [];
    map[e.startDate].push(e);
    // If multi-day, also add to intermediate dates
    if (e.endDate && e.endDate > e.startDate) {
      let cur = e.startDate;
      while (cur < e.endDate) {
        const [y, m, d] = cur.split("-").map(Number);
        const next = new Date(y, m - 1, d + 1);
        cur = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
        if (!map[cur]) map[cur] = [];
        map[cur].push(e);
      }
    }
  }
  return map;
}

// ─── Type Chip ────────────────────────────────────────────────────────────────

function TypeChip({ type }: { type: CalendarEventType }) {
  const meta = EVENT_TYPE_META[type];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
      style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}
    >
      {meta.emoji} {meta.label}
    </span>
  );
}

// ─── Source Lock Badge ────────────────────────────────────────────────────────

function SourceLock({ source, sourceRef }: { source: string; sourceRef?: string }) {
  if (source === "programs") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
        🔒 Programs
        {sourceRef && (
          <a
            href="/admin/programs"
            className="ml-1 underline text-[#005cc8] hover:text-[#002f76]"
            onClick={(e) => e.stopPropagation()}
          >
            Edit
          </a>
        )}
      </span>
    );
  }
  if (source === "holiday_auto") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        🤖 Auto-Holiday
      </span>
    );
  }
  return null;
}

// ─── Month Grid Calendar ──────────────────────────────────────────────────────

function MonthGrid({
  yearMonth,
  eventsByDate,
  today,
  onDayClick,
}: {
  yearMonth: string;
  eventsByDate: EventsByDate;
  today: string;
  onDayClick: (dateStr: string, events: CalendarEvent[]) => void;
}) {
  const [year, month] = yearMonth.split("-").map(Number);
  const days = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const cells: (string | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: days }, (_, i) =>
      `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
    ),
  ];

  // Pad to complete rows
  while (cells.length % 7 !== 0) cells.push(null);

  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      {/* Day of week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((d) => (
          <div key={d} className="text-center text-[10px] font-black uppercase tracking-wider text-[#9aa3b2] py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-[#e8edf5] rounded-2xl overflow-hidden border border-[#e8edf5]">
        {cells.map((dateStr, idx) => {
          if (!dateStr) {
            return <div key={`empty-${idx}`} className="bg-[#f8faff] min-h-[80px] sm:min-h-[90px]" />;
          }

          const dayEvents = eventsByDate[dateStr] || [];
          const isToday = dateStr === today;
          const dayNum = parseInt(dateStr.split("-")[2], 10);
          const isSunday = idx % 7 === 0;

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(dateStr, dayEvents)}
              className={`
                relative bg-white min-h-[80px] sm:min-h-[90px] p-1.5 text-left
                hover:bg-[#f0f5ff] transition-colors group
                ${isSunday ? "bg-[#fafafa]" : ""}
              `}
            >
              <span
                className={`
                  inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-black mb-1
                  ${isToday ? "bg-[#0033a0] text-white" : "text-[#002f76]"}
                  ${isSunday && !isToday ? "text-[#dc2626]" : ""}
                `}
              >
                {dayNum}
              </span>

              {/* Event dots / chips */}
              <div className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map((e, i) => {
                  const meta = EVENT_TYPE_META[e.type];
                  return (
                    <div
                      key={`${e._id}-${i}`}
                      className="truncate text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded-md"
                      style={{ backgroundColor: meta.bg, color: meta.color }}
                      title={e.title}
                    >
                      {meta.emoji} {e.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] font-bold text-[#5a6e8c] px-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Event Form Modal ─────────────────────────────────────────────────────────

const EVENT_TYPE_OPTIONS: { value: CalendarEventType; label: string; emoji: string }[] = [
  { value: "holiday", label: "Holiday", emoji: "🎉" },
  { value: "suspension", label: "Class Suspension", emoji: "🚫" },
  { value: "merry_event", label: "Merry Event (Parents invited)", emoji: "🌟" },
  { value: "main_event", label: "Main Event (Staff only)", emoji: "🏫" },
  { value: "registration_open", label: "Registration Opens", emoji: "📝" },
  { value: "renewal", label: "Renewal Window", emoji: "🔄" },
  { value: "adventure_start", label: "Adventure Start", emoji: "🗺️" },
];

function EventFormModal({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial?: Partial<CalendarEvent> & { defaultDate?: string };
  onClose: () => void;
  onSave: (data: Partial<CalendarEvent>) => Promise<void>;
  saving: boolean;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState(initial?.title || "");
  const [type, setType] = useState<CalendarEventType>(initial?.type || "merry_event");
  const [startDate, setStartDate] = useState(initial?.startDate || initial?.defaultDate || "");
  const [endDate, setEndDate] = useState(initial?.endDate || "");
  const [visibility, setVisibility] = useState<CalendarVisibility>(initial?.visibility || "public");
  const [description, setDescription] = useState(initial?.description || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Image size must be under 8MB");
      return;
    }

    setUploadingImage(true);
    setError("");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const token = await user?.getIdToken();
          const res = await fetch("/api/upload-photo", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ base64 }),
          });

          const data = await res.json();
          if (data.url) {
            setImageUrl(data.url);
          } else {
            setError(data.error || "Failed to upload image");
          }
        } catch {
          setError("Failed to upload image");
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setError("Error reading file");
      setUploadingImage(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Event title is required"); return; }
    if (!startDate) { setError("Start date is required"); return; }
    setError("");
    await onSave({
      title: title.trim(),
      type,
      startDate,
      endDate: endDate || undefined,
      visibility,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => !saving && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-t-[2rem] rounded-b-none sm:rounded-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.15)] sm:shadow-2xl w-full sm:max-w-2xl z-10 max-h-[94dvh] sm:max-h-[92vh] flex flex-col overflow-hidden border-t border-[#dbe6f6] sm:border">
        {/* Header */}
        <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-[#edf2f7] flex items-center justify-between shrink-0 bg-gradient-to-r from-white via-white to-[#fbfdff]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#eef4ff] text-[#0033a0] flex items-center justify-center text-xl font-bold border border-[#d6e7ff] shadow-xs">
              🗓️
            </div>
            <div>
              <h2 className="text-[19px] sm:text-[20px] font-black text-[#002f76] leading-tight">
                {initial?._id ? "Edit Calendar Event" : "Add Calendar Event"}
              </h2>
              <p className="text-[12px] font-medium text-[#64748b]">
                Set dates, add photos, write public event details, or save internal notes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-[#5a6e8c] hover:text-[#002f76] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} id="calendar-event-form" className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-8 py-5 sm:py-6 space-y-6">
          {/* Section 1: Title & Category */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#002f76] mb-1.5">
                Event Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Adventure 3 Starts, Christmas Playdate, Family Sports Day..."
                className="w-full rounded-2xl border-2 border-[#e2e8f0] bg-[#f8faff] px-4 py-3 text-[14px] font-bold text-[#002f76] outline-none focus:border-[#0050d5] focus:bg-white transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#002f76] mb-2">
                Event Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {EVENT_TYPE_OPTIONS.map((opt) => {
                  const meta = EVENT_TYPE_META[opt.value];
                  const isSelected = type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border-2 text-[12px] font-bold transition-all text-left cursor-pointer ${
                        isSelected
                          ? "border-[#0050d5] bg-[#eef4ff] text-[#002f76] shadow-sm ring-2 ring-[#0050d5]/15"
                          : "border-[#e2e8f0] bg-white text-[#5a6e8c] hover:border-[#c7d8f0] hover:bg-[#fafcff]"
                      }`}
                    >
                      <span className="text-base">{opt.emoji}</span>
                      <span className="truncate flex-1">{meta.label}</span>
                      {isSelected && <span className="text-[#0050d5] text-xs font-black">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Dates & Audience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#edf2f7]">
            {/* Dates */}
            <div className="space-y-3">
              <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#002f76]">
                Schedule &amp; Dates <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[10px] font-bold text-[#718096] uppercase mb-1 block">Start Date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#e2e8f0] bg-[#f8faff] px-3 py-2 text-[12.5px] font-bold text-[#002f76] outline-none focus:border-[#0050d5] focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#718096] uppercase mb-1 block">End Date (opt)</span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#e2e8f0] bg-[#f8faff] px-3 py-2 text-[12.5px] font-bold text-[#002f76] outline-none focus:border-[#0050d5] focus:bg-white transition-all"
                  />
                </div>
              </div>
              <p className="text-[10.5px] text-[#9aa3b2]">Leave end date empty for 1-day events.</p>
            </div>

            {/* Visibility */}
            <div className="space-y-3">
              <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#002f76]">
                Audience Visibility <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    visibility === "public"
                      ? "border-[#0050d5] bg-[#eef4ff] text-[#002f76] ring-2 ring-[#0050d5]/15"
                      : "border-[#e2e8f0] bg-white text-[#5a6e8c] hover:border-[#c7d8f0]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black text-[12px] mb-0.5">
                    <span>🌐</span> Public
                  </div>
                  <p className="text-[10px] text-[#718096] leading-tight">Shown to parents on website</p>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility("internal")}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    visibility === "internal"
                      ? "border-[#0050d5] bg-[#eef4ff] text-[#002f76] ring-2 ring-[#0050d5]/15"
                      : "border-[#e2e8f0] bg-white text-[#5a6e8c] hover:border-[#c7d8f0]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black text-[12px] mb-0.5">
                    <span>🔒</span> Internal
                  </div>
                  <p className="text-[10px] text-[#718096] leading-tight">Staff and admin eyes only</p>
                </button>
              </div>
              <p className="text-[10.5px] text-[#9aa3b2]">
                {visibility === "public" ? "Visible on landing page & calendar feed." : "Hidden from public website."}
              </p>
            </div>
          </div>

          {/* Section 3: Public Event Description (NEW!) */}
          <div className="pt-2 border-t border-[#edf2f7] space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#002f76]">
                Event Description <span className="font-normal text-[#64748b] normal-case tracking-normal">(shown to parents)</span>
              </label>
              <span className="text-[10px] font-bold text-[#0050d5] bg-[#eef4ff] px-2 py-0.5 rounded-md border border-[#c7d8f0]">
                📢 Appears in Event Details Modal
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. Join us for a fun-filled morning of interactive storytelling, music, and playful exploration! All curious explorers and families are warmly invited."
              className="w-full rounded-2xl border-2 border-[#e2e8f0] bg-[#f8faff] px-4 py-3 text-[13px] font-medium text-[#002f76] outline-none focus:border-[#0050d5] focus:bg-white transition-all resize-none shadow-xs"
            />
            <p className="text-[10.5px] text-[#9aa3b2]">
              Parents see this when they click the event card on the homepage to read details.
            </p>
          </div>

          {/* Section 4: Event Photo / Banner (Optional) */}
          <div className="pt-2 border-t border-[#edf2f7] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#002f76]">
                📸 Event Photo <span className="font-normal text-[#9aa3b2] normal-case tracking-normal">(optional)</span>
              </label>
              <span className="text-[10px] font-bold text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded-md border border-[#e2e8f0]">
                Square (1080×1080) or Presentation (1920×1080)
              </span>
            </div>

            {imageUrl ? (
              <div className="rounded-2xl border-2 border-[#c7d8f0] bg-[#f8faff] p-3 space-y-2">
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm">
                  <img
                    src={imageUrl}
                    alt="Event Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="px-3 py-1 rounded-lg bg-black/70 hover:bg-red-600 text-white text-[11px] font-bold backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      ✕ Remove Photo
                    </button>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10.5px] font-bold px-2.5 py-1 rounded-lg">
                    ✨ Photo Attached
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-[#cbd5e1] bg-[#f8faff] p-4 space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#eef4ff] text-[#0033a0] text-[12.5px] font-bold border-2 border-[#c7d8f0] shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    {uploadingImage ? (
                      <>
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0033a0]/30 border-t-[#0033a0] animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <span>📁</span> Upload Photo
                      </>
                    )}
                  </button>

                  <span className="text-[11px] text-[#94a3b8] font-bold">or</span>

                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Paste image URL (https://...)"
                    className="flex-1 w-full px-3.5 py-2.5 text-[12px] font-medium text-[#002f76] bg-white rounded-xl border border-[#cbd5e1] outline-none focus:border-[#0050d5]"
                  />
                </div>
                <p className="text-[10.5px] text-[#9aa3b2] leading-tight">
                  Supports social square posts (1080×1080) and widescreen presentation banners (1920×1080). If left empty, our default playful event illustration is automatically used.
                </p>
              </div>
            )}
          </div>

          {/* Section 5: Internal Staff Notes (Optional) */}
          <div className="pt-2 border-t border-[#edf2f7] space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c]">
                Internal Notes <span className="font-normal text-[#9aa3b2] normal-case tracking-normal">(admin only)</span>
              </label>
              <span className="text-[10px] font-bold text-[#64748b]">🔒 Not visible to parents</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Teacher rosters, materials to prepare, or internal reminders."
              className="w-full rounded-2xl border-2 border-[#e2e8f0] bg-[#f8faff] px-4 py-2.5 text-[12.5px] font-medium text-[#002f76] outline-none focus:border-[#0050d5] focus:bg-white transition-all resize-none"
            />
          </div>
        </form>

        {/* Footer Actions (Sticky at bottom, never cut off) */}
        <div className="shrink-0 px-4 sm:px-8 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 bg-[#f8faff] border-t border-[#e2e8f0] flex items-center justify-between gap-3">
          <div>
            {error ? (
              <p className="text-[12px] font-bold text-red-600 bg-red-50 rounded-xl px-3 py-1.5 border border-red-200">
                ⚠️ {error}
              </p>
            ) : (
              <span className="text-[11px] text-[#94a3b8] hidden sm:inline">
                Changes will sync across the calendar.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border-2 border-[#e2e8f0] bg-white text-[13px] font-bold text-[#5a6e8c] hover:bg-[#f0f4f9] hover:text-[#002f76] transition-all disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="calendar-event-form"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#0033a0] hover:bg-[#002270] text-[13px] font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Saving...
                </>
              ) : (
                <>{initial?._id ? "Save Changes" : "✚ Add Event"}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Day Detail Drawer ────────────────────────────────────────────────────────

function DayDrawer({
  dateStr,
  events,
  onClose,
  onAdd,
  onEdit,
  onDelete,
  onHide,
}: {
  dateStr: string;
  events: CalendarEvent[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (e: CalendarEvent) => void;
  onDelete: (e: CalendarEvent) => void;
  onHide: (e: CalendarEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 z-10 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[16px] font-black text-[#002f76]">{formatDate(dateStr)}</h3>
            <p className="text-[11px] text-[#9aa3b2] font-medium">
              {events.length === 0 ? "No events" : `${events.length} event${events.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0033a0] text-white text-[12px] font-black hover:bg-[#002270] transition-all"
          >
            ✚ Add Event
          </button>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📅</div>
            <p className="text-[13px] font-bold text-[#9aa3b2]">No events on this day</p>
            <button onClick={onAdd} className="mt-3 text-[12px] font-bold text-[#0050d5] underline">
              Add one
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((e) => {
              const isLocked = e.source === "programs";
              return (
                <div
                  key={e._id}
                  className="rounded-2xl border border-[#e8edf5] bg-[#f8faff] p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-black text-[#002f76] leading-snug">{e.title}</p>
                      {e.endDate && e.endDate !== e.startDate && (
                        <p className="text-[10.5px] font-medium text-[#9aa3b2] mt-0.5">
                          Until {formatDate(e.endDate)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <TypeChip type={e.type} />
                    </div>
                  </div>

                  {e.imageUrl && (
                    <div className="mb-3 relative w-full h-28 rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                      <img
                        src={e.imageUrl}
                        alt={e.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <SourceLock source={e.source} sourceRef={e.sourceRef} />

                    {!isLocked && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEdit(e)}
                          className="text-[11px] font-bold text-[#0050d5] hover:text-[#002f76] px-2 py-1 rounded-lg hover:bg-[#eef4ff] transition-all"
                        >
                          Edit
                        </button>
                        {e.source === "holiday_auto" ? (
                          <button
                            onClick={() => onHide(e)}
                            className="text-[11px] font-bold text-[#9aa3b2] hover:text-[#5a6e8c] px-2 py-1 rounded-lg hover:bg-slate-100 transition-all"
                          >
                            Hide
                          </button>
                        ) : (
                          <button
                            onClick={() => onDelete(e)}
                            className="text-[11px] font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-all"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {e.description && (
                    <p className="text-[11.5px] font-medium text-[#2d4367] mt-2 border-t border-[#e8edf5] pt-2 leading-relaxed">
                      📢 <span className="font-bold text-[#0033a0]">Public Description:</span> {e.description}
                    </p>
                  )}

                  {e.notes && (
                    <p className="text-[11px] font-medium text-[#9aa3b2] mt-1.5 border-t border-dashed border-[#e8edf5] pt-1.5">
                      🔒 <span className="font-bold">Staff notes:</span> {e.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl border-2 border-[#e2e8f0] py-2.5 text-[13px] font-bold text-[#5a6e8c] hover:bg-[#f0f4f9] transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

function ShareModal({ onClose }: { onClose: () => void }) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${base}/calendar`;
  const icsUrl = `${base}/api/calendar.ics`;
  const webcalUrl = icsUrl.replace(/^https?:\/\//, "webcal://");
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md mx-4 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[18px] font-black text-[#002f76]">🔗 Share Calendar</h2>
          <button onClick={onClose} className="text-[#5a6e8c] hover:text-[#002f76]">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {[
            { label: "Public Calendar Page", url: publicUrl, key: "public" },
            { label: "Subscribe (.ics feed)", url: icsUrl, key: "ics" },
            { label: "Subscribe (webcal://)", url: webcalUrl, key: "webcal" },
          ].map(({ label, url, key }) => (
            <div key={key} className="rounded-2xl border border-[#e2e8f0] bg-[#f8faff] p-4">
              <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">{label}</p>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-[11.5px] font-mono text-[#002f76] truncate">{url}</p>
                <button
                  onClick={() => copy(url, key)}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-[#0033a0] text-white text-[11px] font-black hover:bg-[#002270] transition-all"
                >
                  {copied === key ? "✓ Copied!" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10.5px] text-[#9aa3b2] font-medium text-center mt-4">
          Paste the webcal:// link in Google Calendar, Apple Calendar, or Outlook to subscribe.
        </p>
      </div>
    </div>
  );
}

// ─── Main Admin Calendar Page ─────────────────────────────────────────────────

type HolidaySyncState = { syncing: boolean; synced: boolean; count: number; syncedAt: string | null };

export default function AdminAdventureCalendarPage() {
  const { user, userProfile } = useAuth();
  const today = getManilaDateStr();
  const [currentMonth, setCurrentMonth] = useState(getManilaMonthStr());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Holiday sync state (for current year + next year)
  const currentYear = parseInt(today.slice(0, 4), 10);
  const [holidaySync, setHolidaySync] = useState<Record<number, HolidaySyncState>>({});

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [formDefaultDate, setFormDefaultDate] = useState<string>("");
  const [savingForm, setSavingForm] = useState(false);

  const [dayDrawer, setDayDrawer] = useState<{ date: string; events: CalendarEvent[] } | null>(null);
  const [showShare, setShowShare] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Typed auth header helper
  const getAuthHeader = async (): Promise<Record<string, string>> => {
    const token = await user?.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Load events for current month
  const loadEvents = useCallback(async (month: string) => {
    if (!isMountedRef.current) return;
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      const res = await fetch(
        `/api/calendar-events?month=${month}&includePrograms=true`,
        { headers }
      );
      if (!isMountedRef.current) return;
      const data = await res.json();
      if (data.events && isMountedRef.current) setEvents(data.events);
    } catch (err) {
      console.error("[admin calendar] load events:", err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    loadEvents(currentMonth);
  }, [currentMonth, loadEvents]);

  const triggerHolidaySync = useCallback(async (year: number) => {
    if (!isMountedRef.current) return;
    setHolidaySync((prev) => ({ ...prev, [year]: { ...(prev[year] || {}), syncing: true, synced: false, count: 0, syncedAt: null } }));
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/calendar-events/sync-holidays?year=${year}`, {
        method: "POST",
        headers,
      });
      if (!isMountedRef.current) return;
      const data = await res.json();
      if (isMountedRef.current) {
        setHolidaySync((prev) => ({
          ...prev,
          [year]: { syncing: false, synced: true, count: data.synced || 0, syncedAt: new Date().toISOString() },
        }));
        loadEvents(currentMonth);
      }
    } catch {
      if (isMountedRef.current) {
        setHolidaySync((prev) => ({ ...prev, [year]: { ...(prev[year] || {}), syncing: false, synced: false, count: 0, syncedAt: null } }));
      }
    }
  }, [currentMonth, loadEvents]);

  // Check holiday sync status on mount
  useEffect(() => {
    async function checkSync(year: number) {
      try {
        const res = await fetch(`/api/calendar-events/sync-holidays?year=${year}`);
        if (!isMountedRef.current) return;
        const data = await res.json();
        if (isMountedRef.current) {
          setHolidaySync((prev) => ({
            ...prev,
            [year]: { syncing: false, synced: data.synced, count: data.count, syncedAt: data.syncedAt },
          }));
          // Auto-sync if this year hasn't been synced yet
          if (!data.synced) {
            triggerHolidaySync(year);
          }
        }
      } catch { /* non-fatal */ }
    }
    checkSync(currentYear);
    checkSync(currentYear + 1);
  }, [currentYear, triggerHolidaySync]);

  // Month navigation
  const prevMonth = () => setCurrentMonth(addMonths(currentMonth, -1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToday = () => setCurrentMonth(getManilaMonthStr());

  const [year, month] = currentMonth.split("-").map(Number);
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Upcoming events (next 30 days from today)
  const upcoming = useMemo(() => {
    const next30 = new Date();
    next30.setDate(next30.getDate() + 30);
    const next30Str = next30.toISOString().slice(0, 10);
    return events
      .filter((e) => e.startDate >= today && e.startDate <= next30Str)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 10);
  }, [events, today]);

  // Month summary
  const thisMonthStr = getManilaMonthStr();
  const nextMonthStr = addMonths(thisMonthStr, 1);
  const thisMonthEvents = useMemo(() => events.filter((e) => e.startDate.startsWith(thisMonthStr)), [events, thisMonthStr]);
  const nextMonthEvents = useMemo(() => events.filter((e) => e.startDate.startsWith(nextMonthStr)), [events, nextMonthStr]);

  const eventsByDate = useMemo(() => buildEventsByDate(events), [events]);

  // CRUD handlers
  async function handleSaveEvent(data: Partial<CalendarEvent>) {
    setSavingForm(true);
    try {
      const base = await getAuthHeader();
      const headers: Record<string, string> = { "Content-Type": "application/json", ...base };

      if (editEvent?._id) {
        await fetch(`/api/calendar-events?id=${editEvent._id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(data),
        });
      } else {
        await fetch("/api/calendar-events", {
          method: "POST",
          headers,
          body: JSON.stringify(data),
        });
      }

      setShowForm(false);
      setEditEvent(null);
      await loadEvents(currentMonth);
    } catch (err) {
      console.error("save event:", err);
    } finally {
      setSavingForm(false);
    }
  }

  async function handleDeleteEvent(e: CalendarEvent) {
    if (!confirm(`Delete "${e.title}"? This cannot be undone.`)) return;
    try {
      const headers = await getAuthHeader();
      await fetch(`/api/calendar-events?id=${e._id}`, { method: "DELETE", headers });
      setDayDrawer(null);
      await loadEvents(currentMonth);
    } catch (err) {
      console.error("delete event:", err);
    }
  }

  async function handleHideEvent(e: CalendarEvent) {
    if (!confirm(`Hide "${e.title}"? It won't be shown on the public calendar. You can re-sync holidays to reveal it.`)) return;
    try {
      const base = await getAuthHeader();
      const headers: Record<string, string> = { "Content-Type": "application/json", ...base };
      await fetch(`/api/calendar-events?id=${e._id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ hidden: true }),
      });
      setDayDrawer(null);
      await loadEvents(currentMonth);
    } catch (err) {
      console.error("hide event:", err);
    }
  }

  function openAddFromDay(dateStr: string) {
    setFormDefaultDate(dateStr);
    setEditEvent(null);
    setShowForm(true);
    setDayDrawer(null);
  }

  function openEdit(e: CalendarEvent) {
    setEditEvent(e);
    setShowForm(true);
    setDayDrawer(null);
  }

  return (
    <AppShell title="Adventure Calendar" description="Manage events, holidays, and adventure dates.">
      <div className="flex flex-col gap-6 w-full pb-12">

        {/* ── Top Header ── */}
        <div className="rounded-3xl bg-gradient-to-r from-[#002f76] via-[#0033a0] to-[#1e40af] p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 opacity-10 text-[160px] select-none pointer-events-none">🗓️</div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2">
                🗺️ Adventure Calendar
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Merry Explorers Calendar
              </h1>
              <p className="text-[13px] text-blue-100 mt-1 max-w-xl">
                Manage holidays, events, adventure starts, and registration dates. Events marked{" "}
                <strong>Public</strong> appear on the parent-facing calendar and .ics feed.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => { setEditEvent(null); setFormDefaultDate(today); setShowForm(true); }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#002f76] text-[13px] font-black transition-all shadow-md"
              >
                ✚ Add Event
              </button>
              <button
                onClick={() => setShowShare(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-[13px] font-black transition-all border border-white/20"
              >
                🔗 Share
              </button>
            </div>
          </div>
        </div>

        {/* ── Holiday Sync Notice ── */}
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">🤖</span>
            <div>
              <p className="text-[13px] font-black text-amber-900">Philippine Holidays Auto-Sync</p>
              <p className="text-[11.5px] font-medium text-amber-800 leading-relaxed max-w-xl">
                Holidays are auto-generated from official PH data. Please verify special non-working days and moveable holidays against official DOLE proclamations.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            {[currentYear, currentYear + 1].map((yr) => {
              const s = holidaySync[yr];
              return (
                <button
                  key={yr}
                  onClick={() => triggerHolidaySync(yr)}
                  disabled={s?.syncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black transition-all disabled:opacity-60"
                >
                  {s?.syncing ? (
                    <><span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Syncing {yr}...</>
                  ) : (
                    <>🔄 Re-sync {yr} ({s?.count || 0} holidays)</>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Month Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "This Month", monthStr: thisMonthStr, evts: thisMonthEvents },
            { label: "Next Month", monthStr: nextMonthStr, evts: nextMonthEvents },
          ].map(({ label, monthStr, evts }) => {
            const [y, m] = monthStr.split("-").map(Number);
            const mLabel = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
            return (
              <div key={monthStr} className="rounded-3xl bg-white border border-[#e2e8f0] shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-[#9aa3b2]">{label}</p>
                    <p className="text-[16px] font-black text-[#002f76]">{mLabel}</p>
                  </div>
                  <span className="text-[28px]">📅</span>
                </div>
                {evts.length === 0 ? (
                  <p className="text-[12px] text-[#9aa3b2] font-medium">No events</p>
                ) : (
                  <div className="space-y-2">
                    {evts.slice(0, 5).map((e) => (
                      <div key={e._id} className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-[#5a6e8c] w-12 shrink-0">
                          {formatDate(e.startDate).slice(0, 6)}
                        </span>
                        <TypeChip type={e.type} />
                        <span className="text-[11.5px] font-bold text-[#002f76] truncate">{e.title}</span>
                      </div>
                    ))}
                    {evts.length > 5 && (
                      <p className="text-[11px] text-[#9aa3b2] font-medium">+{evts.length - 5} more</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Month Grid Calendar ── */}
        <div className="rounded-3xl bg-white border border-[#e2e8f0] shadow-sm p-5 sm:p-6">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="h-9 w-9 rounded-xl border-2 border-[#e2e8f0] flex items-center justify-center text-[#5a6e8c] hover:bg-[#f0f4f9] transition-all"
              >
                ‹
              </button>
              <h2 className="text-[16px] font-black text-[#002f76] w-44 text-center">{monthLabel}</h2>
              <button
                onClick={nextMonth}
                className="h-9 w-9 rounded-xl border-2 border-[#e2e8f0] flex items-center justify-center text-[#5a6e8c] hover:bg-[#f0f4f9] transition-all"
              >
                ›
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToday}
                className="px-3 py-1.5 rounded-xl border-2 border-[#e2e8f0] text-[11px] font-black text-[#5a6e8c] hover:bg-[#f0f4f9] transition-all"
              >
                Today
              </button>
              <button
                onClick={() => { setEditEvent(null); setFormDefaultDate(today); setShowForm(true); }}
                className="px-3 py-1.5 rounded-xl bg-[#0033a0] text-white text-[11px] font-black hover:bg-[#002270] transition-all hidden sm:inline-flex items-center gap-1"
              >
                ✚ Event
              </button>
            </div>
          </div>

          {loading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="h-10 w-10 rounded-full border-4 border-[#e2e8f0] border-t-[#0033a0] animate-spin" />
            </div>
          ) : (
            <MonthGrid
              yearMonth={currentMonth}
              eventsByDate={eventsByDate}
              today={today}
              onDayClick={(dateStr, evts) => setDayDrawer({ date: dateStr, events: evts })}
            />
          )}
        </div>

        {/* ── Upcoming Events List ── */}
        <div className="rounded-3xl bg-white border border-[#e2e8f0] shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-[3px] bg-[#ffb800]" />
            <h2 className="text-[14px] font-black uppercase tracking-[0.1em] text-[#002f76]">
              Upcoming (Next 30 Days)
            </h2>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-[13px] text-[#9aa3b2] font-medium">No upcoming events in the next 30 days.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((e) => (
                <div
                  key={e._id}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-[#e8edf5] hover:bg-[#f8faff] transition-all cursor-pointer"
                  onClick={() => openEdit(e)}
                >
                  <div className="text-center w-12 shrink-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#9aa3b2]">
                      {new Date(parseInt(e.startDate.slice(0,4)), parseInt(e.startDate.slice(5,7))-1, 1).toLocaleDateString("en-US", { month: "short" })}
                    </p>
                    <p className="text-[20px] font-black text-[#002f76] leading-none">
                      {parseInt(e.startDate.slice(8, 10), 10)}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-black text-[#002f76]">{e.title}</p>
                      <TypeChip type={e.type} />
                      {e.source !== "manual" && <SourceLock source={e.source} />}
                    </div>
                    {e.endDate && <p className="text-[10.5px] text-[#9aa3b2] font-medium">Until {formatDate(e.endDate)}</p>}
                  </div>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${e.visibility === "public" ? "bg-emerald-400" : "bg-slate-300"}`} title={e.visibility} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Legend ── */}
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
          <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-[#9aa3b2] mb-3">Legend</p>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(EVENT_TYPE_META) as [CalendarEventType, typeof EVENT_TYPE_META[CalendarEventType]][]).map(([type, meta]) => (
              <span
                key={type}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold border"
                style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}
              >
                {meta.emoji} {meta.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold border bg-slate-100 text-slate-600 border-slate-200">
              🟢 Public &nbsp;&nbsp; ⚪ Internal
            </span>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showForm && (
        <EventFormModal
          initial={editEvent ? editEvent : { defaultDate: formDefaultDate }}
          onClose={() => { setShowForm(false); setEditEvent(null); }}
          onSave={handleSaveEvent}
          saving={savingForm}
        />
      )}

      {dayDrawer && (
        <DayDrawer
          dateStr={dayDrawer.date}
          events={dayDrawer.events}
          onClose={() => setDayDrawer(null)}
          onAdd={() => openAddFromDay(dayDrawer.date)}
          onEdit={openEdit}
          onDelete={handleDeleteEvent}
          onHide={handleHideEvent}
        />
      )}

      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
    </AppShell>
  );
}
