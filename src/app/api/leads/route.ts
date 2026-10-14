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
        const query = status && status !== "all" ? { status } : { status: { $ne: "converted" } };

        // Fetch renewal families to exclude from prospective leads
        const renewalFamilies = await db.collection("renewal_families").find({}).toArray();
        const renewalEmails = new Set(
            renewalFamilies.map((r) => (r.parentEmail || "").toLowerCase().trim()).filter(Boolean)
        );
        const renewalPhones = new Set(
            renewalFamilies.map((r) => (r.parentPhone || "").replace(/\D/g, "")).filter(Boolean)
        );
        const renewalChildNames = new Set(
            renewalFamilies
                .map((r) => `${r.childFirstName || ""} ${r.childLastName || ""}`.trim().toLowerCase())
                .filter(Boolean)
        );

        const leads = await db
            .collection("leads")
            .find(query)
            .sort({ updatedAt: -1, createdAt: -1 })
            .toArray();

        // Exclude leads that belong to renewal families
        const filteredLeads = leads.filter((l) => {
            if (l.source === "renewal" || l.isRenewal) return false;
            if (l.promoCode && l.promoCode.toUpperCase() === "A1RENEWAL2026") return false;

            const pEmail = (l.parentInfo?.email || "").toLowerCase().trim();
            if (pEmail && renewalEmails.has(pEmail)) return false;

            const pPhone = (l.parentInfo?.phone || "").replace(/\D/g, "");
            if (pPhone && renewalPhones.has(pPhone)) return false;

            const cFirst = (l.childInfo?.firstName || "").trim().toLowerCase();
            const cLast = (l.childInfo?.lastName || "").trim().toLowerCase();
            const cFull = `${cFirst} ${cLast}`.trim();
            if (cFull && renewalChildNames.has(cFull)) return false;

            return true;
        });

        const formatted = filteredLeads.map((l) => ({
            ...l,
            id: l._id.toString(),
            _id: undefined,
            status: l.status === "converted" || l.status === "contacted" || l.status === "archived" ? l.status : "in-progress",
            step: typeof l.step === "number" ? l.step : 0,
            stepName: l.stepName || (typeof l.step === "number" ? `Step ${l.step}` : "Step 0: Parent & Child Details"),
        }));

        return NextResponse.json({ success: true, data: formatted });
    } catch (error) {
        console.error("[leads GET]", error);
        return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
    }
}

// POST /api/leads — Public, saved as parents progress through registration
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            leadId,
            step,
            stepName,
            source,
            childInfo,
            parentInfo,
            emergencyContact,
            selectedProgram,
            selectedClass,
            promoCode,
            photoConsent,
            hasSignature,
        } = body;

        // Skip renewal registrations from lead tracking
        if (
            source === "renewal" ||
            body.isRenewal ||
            (promoCode && promoCode.toUpperCase() === "A1RENEWAL2026")
        ) {
            return NextResponse.json({
                success: true,
                isRenewal: true,
                message: "Renewal families are tracked in renewals, not leads",
            });
        }

        const hasIdentifier =
            parentInfo?.name ||
            parentInfo?.email ||
            parentInfo?.phone ||
            childInfo?.firstName;

        if (!hasIdentifier) {
            return NextResponse.json(
                { success: false, error: "Missing identifying information" },
                { status: 400 }
            );
        }

        const { db } = await connectToDatabase();

        // Check if parent or child is in renewal_families
        const pEmail = (parentInfo?.email || "").toLowerCase().trim();
        const pPhone = (parentInfo?.phone || "").replace(/\D/g, "");
        if (pEmail || pPhone) {
            const renewalCheck = await db.collection("renewal_families").findOne({
                $or: [
                    ...(pEmail ? [{ parentEmail: { $regex: new RegExp(`^${pEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } }] : []),
                    ...(pPhone ? [{ parentPhone: { $regex: new RegExp(pPhone.slice(-7)) } }] : []),
                ],
            });
            if (renewalCheck) {
                return NextResponse.json({
                    success: true,
                    isRenewal: true,
                    message: "Renewal family is tracked in renewals, not leads",
                });
            }
        }

        const now = new Date();

        const doc: Record<string, any> = {
            source: source || "register",
            updatedAt: now,
            lastActiveAt: now,
        };

        if (step !== undefined) doc.step = Number(step);
        if (stepName) doc.stepName = stepName;
        if (childInfo) doc.childInfo = childInfo;
        if (parentInfo) doc.parentInfo = parentInfo;
        if (emergencyContact) doc.emergencyContact = emergencyContact;
        if (selectedProgram !== undefined) doc.selectedProgram = selectedProgram;
        if (selectedClass !== undefined) doc.selectedClass = selectedClass;
        if (promoCode !== undefined) doc.promoCode = promoCode;
        if (photoConsent !== undefined) doc.photoConsent = photoConsent;
        if (hasSignature !== undefined) doc.hasSignature = hasSignature;

        // Returning lead: update the existing document and append to history
        if (leadId && ObjectId.isValid(leadId)) {
            const historyItem = {
                step: doc.step ?? 0,
                stepName: doc.stepName || `Step ${doc.step ?? 0}`,
                selectedProgram: doc.selectedProgram || null,
                selectedClass: doc.selectedClass || null,
                timestamp: now,
            };

            await db.collection("leads").updateOne(
                { _id: new ObjectId(leadId) },
                {
                    $set: doc,
                    $push: { history: historyItem } as any,
                }
            );

            return NextResponse.json({ success: true, data: { id: leadId } });
        }

        // New lead: insert new document
        const initialHistory = [
            {
                step: doc.step ?? 0,
                stepName: doc.stepName || "Step 0: Details Entered",
                selectedProgram: doc.selectedProgram || null,
                selectedClass: doc.selectedClass || null,
                timestamp: now,
            },
        ];

        const result = await db.collection("leads").insertOne({
            ...doc,
            status: "in-progress",
            createdAt: now,
            history: initialHistory,
        });

        return NextResponse.json({
            success: true,
            data: { id: result.insertedId.toString() },
        });
    } catch (error) {
        console.error("[leads POST]", error);
        return NextResponse.json(
            { success: false, error: "Failed to save lead" },
            { status: 500 }
        );
    }
}

// PATCH /api/leads — Admin only, update lead status or notes
export async function PATCH(request: Request) {
    const deny = requireInternalAuth(request);
    if (deny) return deny;

    try {
        const body = await request.json();
        const { id, status, notes } = body;

        if (!id || !ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const updates: Record<string, any> = { updatedAt: new Date() };
        if (status) updates.status = status;
        if (notes !== undefined) updates.notes = notes;

        await db.collection("leads").updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[leads PATCH]", error);
        return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }
}

// DELETE /api/leads — Admin only, delete a lead permanently
export async function DELETE(request: Request) {
    const deny = requireInternalAuth(request);
    if (deny) return deny;

    try {
        const url = new URL(request.url);
        let id = url.searchParams.get("id");

        if (!id) {
            try {
                const body = await request.json();
                id = body.id;
            } catch {
                // ignore
            }
        }

        if (!id || !ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const result = await db.collection("leads").deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Lead deleted successfully" });
    } catch (error) {
        console.error("[leads DELETE]", error);
        return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
    }
}