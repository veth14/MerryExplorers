/**
 * calendar-events.ts
 * Shared types + helpers for the Adventure Calendar feature.
 * All dates stored / compared as plain "YYYY-MM-DD" strings to avoid
 * UTC/Asia-Manila day-shift bugs.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalendarEventType =
  | "holiday"
  | "merry_event"
  | "main_event"
  | "registration_open"
  | "renewal"
  | "adventure_start"
  | "suspension";

export type CalendarVisibility = "public" | "internal";
export type CalendarSource = "manual" | "programs" | "holiday_auto";

export interface CalendarEvent {
  _id: string;
  title: string;
  type: CalendarEventType;
  startDate: string;   // "YYYY-MM-DD"
  endDate?: string;    // "YYYY-MM-DD" (optional)
  visibility: CalendarVisibility;
  source: CalendarSource;
  sourceRef?: string;  // e.g. program key if source==="programs"
  description?: string; // Public-facing event description shown on landing page & public calendar
  notes?: string;       // Admin-only internal notes
  imageUrl?: string;    // Optional event photo (1080x1080 square or 1920x1080 presentation)
  autoAdded?: boolean;
  hidden?: boolean;    // soft-delete flag (used for auto holidays admins removed)
  createdBy?: string;
  updatedBy?: string;
  updatedAt?: string;
}

/** Lightweight read model sent to client (no internal notes for public consumers) */
export type CalendarEventPublic = Omit<CalendarEvent, "notes" | "createdBy" | "updatedBy">;

// ─── Manila Date Helpers ───────────────────────────────────────────────────────

/** Returns today's date string in Asia/Manila timezone as "YYYY-MM-DD" */
export function getManilaDateStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Returns the "YYYY-MM" month string for the given date (Manila tz) */
export function getManilaMonthStr(d: Date = new Date()): string {
  return getManilaDateStr().slice(0, 7);
}

/** Return Manila "YYYY-MM-DD" for a Date object */
export function toManilaDateStr(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Add N months to a "YYYY-MM" string */
export function addMonths(yearMonth: string, n: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Color / Label Maps ───────────────────────────────────────────────────────

export const EVENT_TYPE_META: Record<
  CalendarEventType,
  { label: string; color: string; bg: string; border: string; emoji: string }
> = {
  holiday: {
    label: "Holiday",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
    emoji: "🎉",
  },
  suspension: {
    label: "Suspension",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
    emoji: "🚫",
  },
  merry_event: {
    label: "Merry Event",
    color: "#0284c7",
    bg: "#f0f9ff",
    border: "#bae6fd",
    emoji: "🌟",
  },
  main_event: {
    label: "Main Event",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    emoji: "🏫",
  },
  registration_open: {
    label: "Registration Open",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    emoji: "📝",
  },
  renewal: {
    label: "Renewal Window",
    color: "#0369a1",
    bg: "#e0f2fe",
    border: "#bae6fd",
    emoji: "🔄",
  },
  adventure_start: {
    label: "Adventure Start",
    color: "#4f46e5",
    bg: "#eef2ff",
    border: "#c7d2fe",
    emoji: "🗺️",
  },
};

// ─── Programs → Calendar Live Merge ──────────────────────────────────────────

export interface ProgramEntry {
  programKey: string;
  currentAdventure: number;
  adventureStartDate?: string | null;
  nextAdventureStart?: string | null;
  renewalOpen: boolean;
  renewalOpenDate?: string | null;
  registrationOpen: boolean;
  newFamilyRegistrationOpenDate?: string | null;
}

/**
 * Derives live CalendarEvents from the renewal-settings Programs data.
 * Consolidates duplicate and repetitive events:
 * - Adventure starts: Only ONE event per adventure round, on the earliest Monday start date.
 * - Renewals: Programs sharing the same open date are consolidated into a single "Renewal Window Opens" event.
 * - Registrations: Programs sharing the same open date are consolidated into a single "Public Registration Opens" event.
 */
export function deriveProgramEvents(programs: ProgramEntry[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  const ADVENTURE_PROGRAMS = new Set([
    "Discovery Club: Curious Explorer",
    "Discovery Club: Creative Explorer",
    "Discovery Club: Everyday Explorer",
    "Trailblazer: Brave Explorer",
  ]);

  // 1. Next Adventure Starts — Group by adventure number and select the earliest start date (Monday)
  const nextAdvMap = new Map<number, { earliestDate: string; programNames: string[] }>();
  for (const p of programs) {
    if (!ADVENTURE_PROGRAMS.has(p.programKey) || !p.nextAdventureStart) continue;
    const nextAdvNum = (p.currentAdventure ?? 1) + 1;
    const dateStr = p.nextAdventureStart.slice(0, 10);
    const existing = nextAdvMap.get(nextAdvNum);
    const shortName = programShortName(p.programKey);
    if (!existing) {
      nextAdvMap.set(nextAdvNum, { earliestDate: dateStr, programNames: [shortName] });
    } else {
      if (dateStr < existing.earliestDate) {
        existing.earliestDate = dateStr;
      }
      if (!existing.programNames.includes(shortName)) {
        existing.programNames.push(shortName);
      }
    }
  }

  // 2. Current Adventure Starts (if in future or current month)
  const curAdvMap = new Map<number, { earliestDate: string; programNames: string[] }>();
  for (const p of programs) {
    if (!ADVENTURE_PROGRAMS.has(p.programKey) || !p.adventureStartDate) continue;
    const curAdvNum = p.currentAdventure;
    if (!curAdvNum) continue;
    const dateStr = p.adventureStartDate.slice(0, 10);
    const existing = curAdvMap.get(curAdvNum);
    const shortName = programShortName(p.programKey);
    if (!existing) {
      curAdvMap.set(curAdvNum, { earliestDate: dateStr, programNames: [shortName] });
    } else {
      if (dateStr < existing.earliestDate) {
        existing.earliestDate = dateStr;
      }
      if (!existing.programNames.includes(shortName)) {
        existing.programNames.push(shortName);
      }
    }
  }

  // Emit consolidated adventure starts (one per adventure round)
  for (const [advNum, data] of curAdvMap.entries()) {
    events.push({
      _id: `prog:adventure_start:adv${advNum}:${data.earliestDate}`,
      title: `Adventure ${advNum} Begins`,
      type: "adventure_start",
      startDate: data.earliestDate,
      visibility: "public",
      source: "programs",
      notes: `Programs starting this week: ${data.programNames.join(", ")}`,
      autoAdded: true,
    });
  }

  for (const [advNum, data] of nextAdvMap.entries()) {
    // Avoid re-emitting if already in curAdvMap with same adventure number
    if (curAdvMap.has(advNum)) continue;
    events.push({
      _id: `prog:next_adventure_start:adv${advNum}:${data.earliestDate}`,
      title: `Adventure ${advNum} Begins`,
      type: "adventure_start",
      startDate: data.earliestDate,
      visibility: "public",
      source: "programs",
      notes: `Programs starting this week: ${data.programNames.join(", ")}`,
      autoAdded: true,
    });
  }

  // 3. Renewals — Curious Explorer is the master cycle source (earliest date)
  // Renewal opens for Pioneer parents/families first!
  const curiousProg = programs.find((p) => p.programKey === "Discovery Club: Curious Explorer");
  const masterRenewalDate = curiousProg?.renewalOpen && curiousProg?.renewalOpenDate
    ? curiousProg.renewalOpenDate.slice(0, 10)
    : null;

  if (masterRenewalDate) {
    events.push({
      _id: `prog:renewal:${masterRenewalDate}`,
      title: "Renewal Opens for Pioneer Families",
      type: "renewal",
      startDate: masterRenewalDate,
      visibility: "public",
      source: "programs",
      notes: "Priority renewal access opens for Pioneer and returning families (Discovery Club & Trailblazer programs).",
      autoAdded: true,
    });
  } else {
    // Fallback if Curious Explorer has no renewal date: find earliest renewal date among adventure programs
    let earliestRenewalDate: string | null = null;
    for (const p of programs) {
      if (ADVENTURE_PROGRAMS.has(p.programKey) && p.renewalOpen && p.renewalOpenDate) {
        const d = p.renewalOpenDate.slice(0, 10);
        if (!earliestRenewalDate || d < earliestRenewalDate) earliestRenewalDate = d;
      }
    }
    if (earliestRenewalDate) {
      events.push({
        _id: `prog:renewal:${earliestRenewalDate}`,
        title: "Renewal Opens for Pioneer Families",
        type: "renewal",
        startDate: earliestRenewalDate,
        visibility: "public",
        source: "programs",
        notes: "Priority renewal access opens for Pioneer and returning families.",
        autoAdded: true,
      });
    }
  }

  // Also check non-adventure programs (e.g. Ballet, Virtual Tutorial) if they have separate renewal dates
  for (const p of programs) {
    if (ADVENTURE_PROGRAMS.has(p.programKey)) continue; // skip adventure programs, they follow Curious Explorer master
    if (p.renewalOpen && p.renewalOpenDate) {
      const dateStr = p.renewalOpenDate.slice(0, 10);
      if (dateStr !== masterRenewalDate) {
        events.push({
          _id: `prog:renewal:${p.programKey}:${dateStr}`,
          title: `Renewal Opens - ${programShortName(p.programKey)}`,
          type: "renewal",
          startDate: dateStr,
          visibility: "public",
          source: "programs",
          notes: `Open for: ${programShortName(p.programKey)}`,
          autoAdded: true,
        });
      }
    }
  }

  // 4. Registration — Group by open date so multiple programs on the same date become 1 consolidated event
  const regByDate = new Map<string, string[]>();
  for (const p of programs) {
    if (p.registrationOpen && p.newFamilyRegistrationOpenDate) {
      const dateStr = p.newFamilyRegistrationOpenDate.slice(0, 10);
      const list = regByDate.get(dateStr) || [];
      const shortName = programShortName(p.programKey);
      if (!list.includes(shortName)) list.push(shortName);
      regByDate.set(dateStr, list);
    }
  }

  for (const [dateStr, progNames] of regByDate.entries()) {
    const isConsolidated = progNames.length >= 2;
    const title = isConsolidated
      ? "Public Registration Opens (New Families)"
      : `Registration Opens - ${progNames.join(", ")}`;

    events.push({
      _id: `prog:registration_open:${dateStr}`,
      title,
      type: "registration_open",
      startDate: dateStr,
      visibility: "public",
      source: "programs",
      notes: `Open for: ${progNames.join(", ")}`,
      autoAdded: true,
    });
  }

  return events;
}

/**
 * Deduplicates events list so no identical events appear on the same date.
 */
export function deduplicateCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>();
  const out: CalendarEvent[] = [];

  for (const e of events) {
    // Unique key by date + normalized title
    const normTitle = e.title.trim().toLowerCase();
    const key = `${e.startDate}:${normTitle}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(e);
    }
  }

  return out;
}

export function programShortName(key: string): string {
  const map: Record<string, string> = {
    "Discovery Club: Curious Explorer": "Curious Explorer",
    "Discovery Club: Creative Explorer": "Creative Explorer",
    "Discovery Club: Everyday Explorer": "Everyday Explorer",
    "Trailblazer: Brave Explorer": "Brave Explorer",
    "Saturday Playdate": "Saturday Playdate",
    Ballet: "Ballet",
    "Virtual Tutorial": "Virtual Tutorial",
  };
  return map[key] ?? key;
}

// ─── Native App & Web Calendar Handlers ────────────────────────────────────────

/**
 * Generates web Google Calendar template URL (ideal for desktop browsers).
 */
export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const [y, m, d] = event.startDate.split("-").map(Number);
  const startYmd = `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`;

  let endYmd: string;
  if (event.endDate && event.endDate > event.startDate) {
    const [ey, em, ed] = event.endDate.split("-").map(Number);
    const endDateObj = new Date(ey, em - 1, ed + 1);
    endYmd = `${endDateObj.getFullYear()}${String(endDateObj.getMonth() + 1).padStart(2, "0")}${String(endDateObj.getDate()).padStart(2, "0")}`;
  } else {
    const nextDay = new Date(y, m - 1, d + 1);
    endYmd = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, "0")}${String(nextDay.getDate()).padStart(2, "0")}`;
  }

  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent(
    [
      EVENT_TYPE_META[event.type]?.label ? `Category: ${EVENT_TYPE_META[event.type].label}` : "",
      event.description || event.notes || "",
      "Merry Explorers Playgroup & Learning Center",
    ]
      .filter(Boolean)
      .join("\n\n")
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startYmd}/${endYmd}&details=${details}&location=${encodeURIComponent("Merry Explorers, Caloocan")}`;
}

/**
 * Builds the URL for downloading a single-event .ics file.
 * On iOS devices, navigating to this endpoint prompts the native Apple Calendar app sheet.
 */
export function buildSingleEventIcsUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    title: event.title,
    startDate: event.startDate,
    type: event.type,
  });
  if (event.endDate) params.set("endDate", event.endDate);
  const desc = event.description || event.notes || "";
  if (desc) params.set("description", desc);
  return `/api/calendar-events/single-ics?${params.toString()}`;
}

/**
 * Builds the Android intent URI.
 * In Android browsers, tapping this launches the default calendar app (Google Calendar or Samsung Calendar).
 */
export function buildAndroidCalendarIntent(event: CalendarEvent): string {
  const [sy, sm, sd] = event.startDate.split("-").map(Number);
  const beginTime = Date.UTC(sy, sm - 1, sd, 0, 0, 0);

  const endDay = event.endDate && event.endDate >= event.startDate ? event.endDate : event.startDate;
  const [ey, em, ed] = endDay.split("-").map(Number);
  const endTime = Date.UTC(ey, em - 1, ed, 23, 59, 59);

  const title = encodeURIComponent(event.title);
  const description = encodeURIComponent(
    [
      EVENT_TYPE_META[event.type]?.label ? `Category: ${EVENT_TYPE_META[event.type].label}` : "",
      event.description || event.notes || "",
      "Merry Explorers Playgroup & Learning Center",
    ]
      .filter(Boolean)
      .join("\n\n")
  );
  const location = encodeURIComponent("Merry Explorers Playgroup & Learning Center, North Caloocan");

  return `intent://#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.dir/event;S.title=${title};S.description=${description};S.eventLocation=${location};l.beginTime=${beginTime};l.endTime=${endTime};B.allDay=true;end`;
}

/**
 * Detects device and opens calendar:
 * - On iOS (iPhone/iPad): opens Apple Calendar native sheet via .ics
 * - On Android: opens native Calendar app via Android intent with fallback
 * - On Desktop: opens Google Calendar in a new tab
 */
export function openCalendarEvent(event: CalendarEvent): void {
  if (typeof window === "undefined") return;

  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);

  if (isIOS) {
    window.location.href = buildSingleEventIcsUrl(event);
    return;
  }

  if (isAndroid) {
    const intentUrl = buildAndroidCalendarIntent(event);
    const prevTime = Date.now();
    window.location.href = intentUrl;

    setTimeout(() => {
      if (document.visibilityState === "visible" && Date.now() - prevTime < 2500) {
        window.open(buildGoogleCalendarUrl(event), "_blank");
      }
    }, 1200);
    return;
  }

  // Desktop default
  window.open(buildGoogleCalendarUrl(event), "_blank", "noopener,noreferrer");
}

