// Save as: src/app/api/leads/route.ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// GET /api/leads — Admin only, lists all leads (newest first)
export async function GET(request: Request) {
    const deny = requireInternalAuth(request);
    if (deny) return deny;

    try {
        const { db } = await connectToDatabase();
        const url = new URL(request.url);
        const status = url.searchParams.get("status");
        const query = status && status !== "all" ? { status } : {};

        const leads = await db.collection("leads").find(query).sort({ createdAt: -1 }).toArray();
        const formatted = leads.map((l) => ({ ...l, id: l._id.toString(), _id: undefined }));

        return NextResponse.json({ success: true, data: formatted });
    } catch (error) {
        console.error("[leads GET]", error);
        return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
    }
}

// POST /api/leads — Public, saved when a parent continues from the Details step
export async function POST(request: Request) {
    try {
        const { leadId, source, childInfo, parentInfo, emergencyContact } = await request.json();

        if (!parentInfo?.name || !parentInfo?.email) {
            return NextResponse.json({ success: false, error: "Missing contact info" }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const now = new Date();
        const doc = {
            source: source || "register",
            childInfo: childInfo || {},
            parentInfo,
            emergencyContact: emergencyContact || {},
            updatedAt: now,
        };

        // Returning parent: update the same lead instead of creating a duplicate
        if (leadId && ObjectId.isValid(leadId)) {
            await db.collection("leads").updateOne({ _id: new ObjectId(leadId) }, { $set: doc });
            return NextResponse.json({ success: true, data: { id: leadId } });
        }

        const result = await db.collection("leads").insertOne({ ...doc, status: "new", createdAt: now });
        return NextResponse.json({ success: true, data: { id: result.insertedId.toString() } });
    } catch (error) {
        console.error("[leads POST]", error);
        return NextResponse.json({ success: false, error: "Failed to save lead" }, { status: 500 });
    }
}