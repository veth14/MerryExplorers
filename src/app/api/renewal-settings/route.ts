import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

const SETTINGS_KEY = "renewal_settings_v2";

// Programs that can each have their own renewal cycle
const RENEWAL_PROGRAMS = [
  "Discovery Club: Curious Explorer",
  "Discovery Club: Creative Explorer",
  "Discovery Club: Everyday Curious",
  "Trailblazer: Brave Explorer",
] as const;

type ProgramKey = typeof RENEWAL_PROGRAMS[number];

export type ProgramRenewalEntry = {
  programKey: ProgramKey;
  currentAdventure: number;            // which adventure number the program is currently in
  nextAdventureStart: string | null;  // ISO date string
  renewalOpen: boolean;
  renewalOpenDate: string | null;     // auto-computed: 2 weeks before start
  virtualLink?: string;
  virtualLinkOpen?: boolean;
};

function computeDeadline(startIso: string | null): string | null {
  if (!startIso) return null;
  const d = new Date(startIso);
  d.setDate(d.getDate() - 14);
  return d.toISOString();
}

function defaultPrograms(): ProgramRenewalEntry[] {
  return RENEWAL_PROGRAMS.map((programKey) => ({
    programKey,
    currentAdventure: 1,
    nextAdventureStart: null,
    renewalOpen: false,
    renewalOpenDate: null,
    virtualLink: "",
    virtualLinkOpen: false,
  }));
}

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const doc = await db.collection("settings").findOne({ _key: SETTINGS_KEY });

    const programs: ProgramRenewalEntry[] = doc?.programs ?? defaultPrograms();

    // Fill in any programs that might not exist in the stored doc
    const merged = RENEWAL_PROGRAMS.map((key) => {
      const existing = programs.find((p) => p.programKey === key);
      // Always spread existing so legacy records get the new currentAdventure field backfilled
      return existing
        ? { ...existing, currentAdventure: existing.currentAdventure ?? 1 }
        : { programKey: key, currentAdventure: 1, nextAdventureStart: null, renewalOpen: false, renewalOpenDate: null, virtualLink: "", virtualLinkOpen: false };
    });

    return NextResponse.json({ programs: merged, updatedAt: doc?.updatedAt ?? null });
  } catch (err) {
    console.error("[renewal-settings GET]", err);
    return NextResponse.json({ error: "Failed to load renewal settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    // Expecting: { programs: ProgramRenewalEntry[] }
    const incoming: ProgramRenewalEntry[] = body.programs ?? [];

    // Compute deadlines server-side
    const programs: ProgramRenewalEntry[] = RENEWAL_PROGRAMS.map((key) => {
      const p = incoming.find((x) => x.programKey === key);
      const nextAdventureStart = p?.nextAdventureStart ?? null;
      const renewalOpen = p?.renewalOpen ?? false;
      return {
        programKey: key,
        currentAdventure: p?.currentAdventure ?? 1,
        nextAdventureStart,
        renewalOpen,
        renewalOpenDate: computeDeadline(nextAdventureStart),
        virtualLink: p?.virtualLink ?? "",
        virtualLinkOpen: p?.virtualLinkOpen ?? false,
      };
    });

    const { db } = await connectToDatabase();
    await db.collection("settings").updateOne(
      { _key: SETTINGS_KEY },
      { $set: { _key: SETTINGS_KEY, programs, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, programs });
  } catch (err) {
    console.error("[renewal-settings PUT]", err);
    return NextResponse.json({ error: "Failed to save renewal settings" }, { status: 500 });
  }
}
