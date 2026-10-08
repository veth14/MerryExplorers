// Save as: app/api/photo-albums/general-note/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

const COLLECTION = "settings";
const LEGACY_ID = "photoAlbumGeneralNote"; // the single note saved by the first version
const MAX_HISTORY = 3;

// "all" = note for every program; the rest are per-program overrides
const SCOPES = ["all", "curious-explorer", "creative-explorer", "everyday-curious", "brave-explorer"];
const idFor = (scope: string) => `photoAlbumNote:${scope}`;

function toEntry(d: any) {
    return {
        note: d?.note ?? "",
        updatedAt: d?.updatedAt ?? null,
        updatedBy: d?.updatedBy ?? "",
        history: Array.isArray(d?.history) ? d.history.slice(0, MAX_HISTORY) : [],
    };
}

export async function GET() {
    try {
        const { db } = await connectToDatabase();
        const docs = await db
            .collection(COLLECTION)
            .find({ _id: { $in: [...SCOPES.map(idFor), LEGACY_ID] as any[] } })
            .toArray();
        const byId = new Map(docs.map((d: any) => [String(d._id), d]));

        const notes: Record<string, ReturnType<typeof toEntry>> = {};
        for (const scope of SCOPES) {
            let doc = byId.get(idFor(scope));
            // carry over the note saved before per-program notes existed
            if (!doc && scope === "all") doc = byId.get(LEGACY_ID);
            notes[scope] = toEntry(doc);
        }
        return NextResponse.json({ success: true, data: { notes } });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { scope, note, actorUid, actorName } = await req.json();
        // TODO (recommended): verify the caller is an admin, same as your other routes.
        if (!SCOPES.includes(scope)) {
            return NextResponse.json({ success: false, error: "Invalid program" }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const col = db.collection(COLLECTION);
        const _id = idFor(scope) as any;

        let current: any = await col.findOne({ _id });
        if (!current && scope === "all") current = await col.findOne({ _id: LEGACY_ID as any });

        const newNote = String(note ?? "").trim().slice(0, 1000);
        const prevNote: string = current?.note ?? "";

        // Nothing changed — don't create a history entry
        if (newNote === prevNote && current) {
            return NextResponse.json({ success: true, data: toEntry(current) });
        }

        const now = new Date().toISOString();
        let history: any[] = Array.isArray(current?.history) ? current.history : [];
        if (prevNote) {
            history = [
                {
                    note: prevNote,
                    updatedAt: current?.updatedAt ?? null, // when that version was set
                    replacedAt: now,                       // when it was replaced
                    updatedBy: current?.updatedBy ?? "",
                },
                ...history,
            ].slice(0, MAX_HISTORY);
        }

        const updated = {
            note: newNote,
            updatedAt: now,
            updatedBy: actorName || actorUid || "",
            history,
        };
        await col.updateOne({ _id }, { $set: updated }, { upsert: true });

        return NextResponse.json({ success: true, data: toEntry(updated) });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}