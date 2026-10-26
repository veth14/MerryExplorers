import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { computeAdventureBadge } from "@/lib/adventure-badge";
import { requireAdmin } from "@/lib/auth-guard";

const SETTINGS_KEY = "renewal_settings_v2";

// Programs that can each have their own renewal cycle
const RENEWAL_PROGRAMS = [
  "Discovery Club: Curious Explorer",
  "Discovery Club: Creative Explorer",
  "Discovery Club: Everyday Explorer",
  "Trailblazer: Brave Explorer",
  "Saturday Playdate",
  "Ballet",
  "Virtual Tutorial",
] as const;

type ProgramKey = typeof RENEWAL_PROGRAMS[number];

const ADVENTURE_PROGRAMS: readonly ProgramKey[] = [
  "Discovery Club: Curious Explorer",
  "Discovery Club: Creative Explorer",
  "Discovery Club: Everyday Explorer",
  "Trailblazer: Brave Explorer",
];

const CURIOUS_EXPLORER_KEY: ProgramKey = "Discovery Club: Curious Explorer";

export type ProgramRenewalEntry = {
  programKey: ProgramKey;
  currentAdventure: number;            // which adventure number the program is currently in (e.g. 2)
  adventureStartDate?: string | null;  // when current adventure started/starts (ISO date or YYYY-MM-DD)
  nextAdventureStart: string | null;  // ISO date string for next adventure (e.g. Adventure 3)
  registrationOpen: boolean;          // whether public registration is open (true = open, false = closed)
  registrationAutoCloseDays?: number | null; // e.g. 7 (days after adventureStartDate to auto-close)
  customClosedMessage?: string;       // optional override for closed notice
  renewalOpen: boolean;               // whether priority renewal is open for returning families
  renewalOpenDate: string | null;     // auto-computed: 2 weeks before start
  virtualLink?: string;
  virtualLinkOpen?: boolean;
  newFamilyRegistrationOpenDate?: string | null; // optional: date when /register opens for new families
  closedClasses?: string[];           // optional: specific class/session names closed for registration (e.g. ["Baby Ballet (Morning)"])
};

function computeDeadline(startIso: string | null): string | null {
  if (!startIso) return null;
  const d = new Date(startIso);
  d.setDate(d.getDate() - 14);
  return d.toISOString();
}

function getManilaDateStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Evaluates and applies the auto-increment rollover rule:
 * 1. Curious Explorer is the master source for the adventure cycle increment.
 * 2. When today >= Curious Explorer's nextAdventureStart date:
 *    - currentAdventure increments (e.g. Adv 1 -> Adv 2)
 *    - All adventure programs adopt the incremented adventure number
 *    - The nextAdventureStart date moves to the left side (adventureStartDate)
 *    - The right side (nextAdventureStart) is cleared to null and ready to be set again
 * 3. For non-adventure programs (Ballet, Virtual Tutorial):
 *    - They do not track adventure numbers (start date only)
 *    - When their next date arrives, it moves to adventureStartDate and nextAdventureStart is cleared
 */
function applyAutoRollover(programs: ProgramRenewalEntry[]): {
  changed: boolean;
  programs: ProgramRenewalEntry[];
} {
  const todayStr = getManilaDateStr();
  let changed = false;

  const curiousProg = programs.find((p) => p.programKey === CURIOUS_EXPLORER_KEY);
  const curiousNext = curiousProg?.nextAdventureStart;
  const isCuriousAdvReached = Boolean(
    curiousNext && todayStr >= curiousNext.slice(0, 10)
  );

  const updated = programs.map((p) => {
    const isAdv = ADVENTURE_PROGRAMS.includes(p.programKey);

    // 1) Adventure programs roll over together when Curious Explorer reaches next start date
    if (isAdv && isCuriousAdvReached && curiousProg) {
      changed = true;
      const nextAdvNum = (curiousProg.currentAdventure ?? 1) + 1;
      const shiftedStart = p.nextAdventureStart || curiousNext;
      return {
        ...p,
        currentAdventure: nextAdvNum,
        adventureStartDate: shiftedStart, // moved to left side
        nextAdventureStart: null,          // right side is empty and ready to be set again
        registrationOpen: true,            // new adventure starts open for registration
        renewalOpenDate: null,
        newFamilyRegistrationOpenDate: null,
      };
    }

    // 2) Non-adventure programs (Ballet, Virtual Tutorial): start date only
    if (!isAdv && p.nextAdventureStart) {
      const nextDateStr = p.nextAdventureStart.slice(0, 10);
      if (todayStr >= nextDateStr) {
        changed = true;
        return {
          ...p,
          adventureStartDate: p.nextAdventureStart, // moved to left side
          nextAdventureStart: null,                  // right side is empty
          registrationOpen: true,
          renewalOpenDate: null,
          newFamilyRegistrationOpenDate: null,
        };
      }
    }

    return p;
  });

  return { changed, programs: updated };
}

function defaultPrograms(): ProgramRenewalEntry[] {
  return RENEWAL_PROGRAMS.map((programKey) => ({
    programKey,
    currentAdventure: 2,
    adventureStartDate: null,
    nextAdventureStart: null,
    registrationOpen: true,
    registrationAutoCloseDays: 7,
    customClosedMessage: "",
    renewalOpen: true,
    renewalOpenDate: null,
    virtualLink: "",
    virtualLinkOpen: false,
    newFamilyRegistrationOpenDate: null,
    closedClasses: [],
  }));
}

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const doc = await db.collection("settings").findOne({ _key: SETTINGS_KEY });

    const programs: ProgramRenewalEntry[] = doc?.programs ?? defaultPrograms();

    // Fill in any programs that might not exist in the stored doc
    const merged: ProgramRenewalEntry[] = RENEWAL_PROGRAMS.map((key) => {
      const existing = programs.find((p) => p.programKey === key || (key === "Discovery Club: Everyday Explorer" && (p.programKey as string) === "Discovery Club: Everyday Curious"));
      return existing
        ? {
            ...existing,
            programKey: key,
            currentAdventure: existing.currentAdventure ?? 2,
            adventureStartDate: existing.adventureStartDate ?? null,
            registrationOpen: existing.registrationOpen !== false,
            registrationAutoCloseDays: existing.registrationAutoCloseDays ?? 7,
            customClosedMessage: existing.customClosedMessage ?? "",
            renewalOpen: existing.renewalOpen !== false,
            newFamilyRegistrationOpenDate: existing.newFamilyRegistrationOpenDate ?? null,
            closedClasses: Array.isArray(existing.closedClasses) ? existing.closedClasses : [],
          }
        : {
            programKey: key,
            currentAdventure: 2,
            adventureStartDate: null,
            nextAdventureStart: null,
            registrationOpen: true,
            registrationAutoCloseDays: 7,
            customClosedMessage: "",
            renewalOpen: true,
            renewalOpenDate: null,
            virtualLink: "",
            virtualLinkOpen: false,
            newFamilyRegistrationOpenDate: null,
            closedClasses: [],
          };
    });

    // Check & apply automatic rollover
    const { changed, programs: finalPrograms } = applyAutoRollover(merged);

    if (changed) {
      await db.collection("settings").updateOne(
        { _key: SETTINGS_KEY },
        { $set: { _key: SETTINGS_KEY, programs: finalPrograms, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
    }

    const heroBadgeOverride = typeof doc?.heroBadgeOverride === "string" ? doc.heroBadgeOverride : null;
    const heroBadge = computeAdventureBadge(finalPrograms, heroBadgeOverride);

    const classSlots: Record<string, Record<string, { time?: string; maxSlots?: number }>> =
      doc?.classSlots && typeof doc.classSlots === "object" ? doc.classSlots : {};

    return NextResponse.json({
      programs: finalPrograms,
      heroBadgeOverride,
      heroBadge,
      classSlots,
      updatedAt: changed ? new Date().toISOString() : (doc?.updatedAt ?? null),
    });
  } catch (err) {
    console.error("[renewal-settings GET]", err);
    return NextResponse.json({ error: "Failed to load renewal settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const incoming: ProgramRenewalEntry[] = body.programs ?? [];

    const programs: ProgramRenewalEntry[] = RENEWAL_PROGRAMS.map((key) => {
      const p = incoming.find((x) => x.programKey === key);
      const nextAdventureStart = p?.nextAdventureStart ?? null;
      const renewalOpen = p?.renewalOpen !== false;
      const registrationOpen = p?.registrationOpen !== false;
      return {
        programKey: key,
        currentAdventure: p?.currentAdventure ?? 2,
        adventureStartDate: p?.adventureStartDate ?? null,
        nextAdventureStart,
        registrationOpen,
        registrationAutoCloseDays: p?.registrationAutoCloseDays ?? 7,
        customClosedMessage: p?.customClosedMessage ?? "",
        renewalOpen,
        renewalOpenDate: computeDeadline(nextAdventureStart),
        virtualLink: p?.virtualLink ?? "",
        virtualLinkOpen: p?.virtualLinkOpen ?? false,
        newFamilyRegistrationOpenDate: p?.newFamilyRegistrationOpenDate ?? null,
        closedClasses: Array.isArray(p?.closedClasses) ? p.closedClasses : [],
      };
    });

    const heroBadgeOverride = typeof body.heroBadgeOverride === "string" ? body.heroBadgeOverride : (body.heroBadgeOverride === null ? null : undefined);

    // classSlots: { [programId]: { [className]: { time?, maxSlots? } } }
    // Validate shape loosely — only persist if it's a plain object
    const rawClassSlots = body.classSlots;
    const classSlots: Record<string, Record<string, { time?: string; maxSlots?: number }>> | undefined =
      rawClassSlots && typeof rawClassSlots === "object" && !Array.isArray(rawClassSlots)
        ? rawClassSlots
        : undefined;

    const updateDoc: Record<string, any> = {
      _key: SETTINGS_KEY,
      programs,
      updatedAt: new Date().toISOString(),
    };
    if (heroBadgeOverride !== undefined) {
      updateDoc.heroBadgeOverride = heroBadgeOverride;
    }
    if (classSlots !== undefined) {
      updateDoc.classSlots = classSlots;
    }

    const { db } = await connectToDatabase();
    await db.collection("settings").updateOne(
      { _key: SETTINGS_KEY },
      { $set: updateDoc },
      { upsert: true }
    );

    const effectiveHeroBadge = computeAdventureBadge(programs, heroBadgeOverride);

    return NextResponse.json({ ok: true, programs, heroBadgeOverride, heroBadge: effectiveHeroBadge, classSlots: classSlots ?? {} });
  } catch (err) {
    console.error("[renewal-settings PUT]", err);
    return NextResponse.json({ error: "Failed to save renewal settings" }, { status: 500 });
  }
}
