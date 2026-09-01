import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";

const NAGER_BASE = "https://date.nager.at/api/v3/PublicHolidays";

// PH holiday types that we want to import (skip "Optional" observances)
const INCLUDED_TYPES = new Set(["Public", "Bank", "School", "Optional", "Authorities", "Observance"]);

interface NagerHoliday {
  date: string;          // "YYYY-MM-DD"
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  types: string[];
}

// GET /api/holidays?year=YYYY — list seeded holidays for a year
export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") ?? new Date().getFullYear().toString();

    const { db } = await connectToDatabase();
    const docs = await db
      .collection("suspended_days")
      .find({ type: "holiday", dateStr: { $gte: `${year}-01-01`, $lte: `${year}-12-31` } })
      .sort({ dateStr: 1 })
      .toArray();

    return NextResponse.json({ success: true, holidays: docs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/holidays/seed?year=YYYY — fetch from Nager.Date and upsert into suspended_days
export async function POST(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") ?? new Date().getFullYear().toString();

    // Fetch from Nager.Date public API
    const resp = await fetch(`${NAGER_BASE}/${year}/PH`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 }, // cache 24h
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: `Nager.Date returned ${resp.status}` },
        { status: 502 }
      );
    }

    const holidays: NagerHoliday[] = await resp.json();

    const { db } = await connectToDatabase();
    let seeded = 0;

    for (const h of holidays) {
      await db.collection("suspended_days").updateOne(
        { dateStr: h.date },
        {
          $set: {
            dateStr: h.date,
            reason: h.localName || h.name,
            type: "holiday",
            source: "nager",
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
      seeded++;
    }

    return NextResponse.json({ success: true, year, seeded });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
