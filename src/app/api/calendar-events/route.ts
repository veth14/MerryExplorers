import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth-guard";
import { getManilaDateStr, CalendarEvent, deriveProgramEvents, deduplicateCalendarEvents } from "@/lib/calendar-events";

/** GET /api/calendar-events
 * Query params:
 *   - month: "YYYY-MM" (returns events for that month range)
 *   - upcoming: "true" (returns next N public events from today)
 *   - limit: number (default 20 for upcoming)
 *   - includePrograms: "true" (merge live program-derived events)
 *   - visibility: "public" (filter to public only)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const upcoming = searchParams.get("upcoming") === "true";
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const includePrograms = searchParams.get("includePrograms") === "true";
    const visibilityFilter = searchParams.get("visibility");

    const { db } = await connectToDatabase();

    const query: Record<string, unknown> = { hidden: { $ne: true } };

    if (visibilityFilter === "public") {
      query.visibility = "public";
    }

    if (month) {
      const [y, m] = month.split("-").map(Number);
      const firstDay = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;
      query.$or = [
        { startDate: { $gte: firstDay, $lte: lastDay } },
        { startDate: { $lt: firstDay }, endDate: { $gte: firstDay } },
      ];
    }

    if (upcoming) {
      const todayStr = getManilaDateStr();
      query.startDate = { $gte: todayStr };
    }

    const limit = upcoming ? limitParam : 500;

    const docs = await db
      .collection("calendar_events")
      .find(query)
      .sort({ startDate: 1 })
      .limit(limit)
      .toArray();

    const events: CalendarEvent[] = docs.map((d) => ({
      _id: d._id.toString(),
      title: d.title,
      type: d.type,
      startDate: d.startDate,
      endDate: d.endDate,
      visibility: d.visibility,
      source: d.source,
      sourceRef: d.sourceRef,
      description: d.description || undefined,
      notes: d.notes,
      imageUrl: d.imageUrl || undefined,
      autoAdded: d.autoAdded,
      hidden: d.hidden,
      createdBy: d.createdBy,
      updatedBy: d.updatedBy,
      updatedAt: d.updatedAt,
    }));

    let programEvents: CalendarEvent[] = [];
    if (includePrograms) {
      try {
        const settingsDoc = await db
          .collection("settings")
          .findOne({ _key: "renewal_settings_v2" });
        if (settingsDoc?.programs) {
          programEvents = deriveProgramEvents(settingsDoc.programs);

          if (month) {
            const [y, m] = month.split("-").map(Number);
            const firstDay = `${y}-${String(m).padStart(2, "0")}-01`;
            const lastDay = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;
            programEvents = programEvents.filter(
              (e) => e.startDate >= firstDay && e.startDate <= lastDay
            );
          }
          if (upcoming) {
            const todayStr = getManilaDateStr();
            programEvents = programEvents
              .filter((e) => e.startDate >= todayStr)
              .slice(0, limitParam);
          }
          if (visibilityFilter === "public") {
            programEvents = programEvents.filter((e) => e.visibility === "public");
          }
        }
      } catch { /* non-fatal */ }
    }

    const all = deduplicateCalendarEvents([...events, ...programEvents]).sort((a, b) =>
      a.startDate.localeCompare(b.startDate)
    );

    return NextResponse.json({ events: all });
  } catch (err) {
    console.error("[calendar-events GET]", err);
    return NextResponse.json({ error: "Failed to load calendar events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { title, type, startDate, endDate, visibility, description, notes, imageUrl } = body;

    if (!title?.trim() || !type || !startDate || !visibility) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json({ error: "startDate must be YYYY-MM-DD" }, { status: 400 });
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json({ error: "endDate must be YYYY-MM-DD" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const now = new Date().toISOString();

    const doc = {
      title: title.trim(),
      type,
      startDate,
      endDate: endDate || null,
      visibility,
      source: "manual" as const,
      description: description?.trim() || null,
      notes: notes?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      autoAdded: false,
      hidden: false,
      createdBy: auth.user.uid,
      updatedBy: auth.user.uid,
      updatedAt: now,
    };

    const result = await db.collection("calendar_events").insertOne(doc);

    try {
      await db.collection("audit_log").insertOne({
        actorUid: auth.user.uid,
        actorName: auth.user.email,
        action: "CREATE",
        category: "calendar_event",
        targetId: result.insertedId.toString(),
        targetTitle: title.trim(),
        details: `Created calendar event: "${title.trim()}" (${type}) on ${startDate}`,
        createdAt: now,
      });
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true, event: { ...doc, _id: result.insertedId.toString() } });
  } catch (err) {
    console.error("[calendar-events POST]", err);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json();
    const { title, type, startDate, endDate, visibility, description, notes, hidden, imageUrl } = body;

    const { db } = await connectToDatabase();

    const existing = await db
      .collection("calendar_events")
      .findOne({ _id: new ObjectId(id) as never });

    if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const now = new Date().toISOString();
    const update: Record<string, unknown> = { updatedBy: auth.user.uid, updatedAt: now };

    if (title !== undefined) update.title = title.trim();
    if (type !== undefined) update.type = type;
    if (startDate !== undefined) update.startDate = startDate;
    if (endDate !== undefined) update.endDate = endDate || null;
    if (visibility !== undefined) update.visibility = visibility;
    if (description !== undefined) update.description = description?.trim() || null;
    if (notes !== undefined) update.notes = notes?.trim() || null;
    if (imageUrl !== undefined) update.imageUrl = imageUrl?.trim() || null;
    if (hidden !== undefined) update.hidden = hidden;

    await db.collection("calendar_events").updateOne(
      { _id: new ObjectId(id) as never },
      { $set: update }
    );

    try {
      await db.collection("audit_log").insertOne({
        actorUid: auth.user.uid,
        actorName: auth.user.email,
        action: "UPDATE",
        category: "calendar_event",
        targetId: id,
        targetTitle: update.title || existing.title,
        details: `Updated calendar event "${update.title || existing.title}"`,
        createdAt: now,
      });
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[calendar-events PUT]", err);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { db } = await connectToDatabase();

    const existing = await db
      .collection("calendar_events")
      .findOne({ _id: new ObjectId(id) as never });

    if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    await db.collection("calendar_events").deleteOne({ _id: new ObjectId(id) as never });

    try {
      await db.collection("audit_log").insertOne({
        actorUid: auth.user.uid,
        actorName: auth.user.email,
        action: "DELETE",
        category: "calendar_event",
        targetId: id,
        targetTitle: existing.title,
        details: `Deleted calendar event "${existing.title}" (${existing.type}) on ${existing.startDate}`,
        createdAt: new Date().toISOString(),
      });
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[calendar-events DELETE]", err);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
