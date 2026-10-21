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
    label: "School Event",
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
