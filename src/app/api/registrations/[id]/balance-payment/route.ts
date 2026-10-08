// app/api/registrations/[id]/balance-payment/route.ts
// Admin-only: records a payment against the REMAINING BALANCE of an already-approved registration.
// (The existing /payment route only accepts the first payment, and /approve must not run again.)
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { v2 as cloudinary } from "cloudinary";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { calcRegistrationTerms, getStudentSessionInfo, isRegistrationVerified } from "@/lib/payment-terms";
import { allocateBalancePayment } from "@/lib/balance-payment";

export const dynamic = "force-dynamic";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const METHODS = ["gcash", "bpi", "mari-bank"];
const SETTLEABLE_STATUSES = ["approved", "active"];
const MAX_RECEIPT_CHARS = 2_500_000; // base64 text; the page already compresses to ~1.2MB

const r2 = (n: number) => Math.round(n * 100) / 100;
const peso = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normRef = (s: unknown) => String(s ?? "").replace(/\s+/g, "").toLowerCase();

function statusMessage(status: string): string {
    switch (status) {
        case "reserved":
            return "This registration has no payment yet. Encode it as a first payment instead.";
        case "pending":
            return "The first payment of this registration is still waiting to be verified. Verify it first, then encode the balance payment.";
        case "rejected":
            return "This registration's payment was rejected. Fix that first.";
        case "expired":
            return "This slot reservation has expired.";
        default:
            return `A balance payment can't be recorded while the registration status is "${status}".`;
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const deny = requireInternalAuth(request);
    if (deny) return deny;

    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
    }

    let uploadedPublicId = "";

    try {
        const body = await request.json();
        const {
            paymentMethod,
            receiptBase64,
            referenceNumber,
            amountPaid,
            paidOn,
            adminNote,
            waiveInterest,
            expectedTotalPayable,
            actorUid,
            actorName,
        } = body;

        // ── basic validation ──
        const amount = r2(Number(amountPaid));
        const reference = String(referenceNumber ?? "").trim();
        const paidOnDate = paidOn ? new Date(paidOn) : null;

        if (!METHODS.includes(paymentMethod)) {
            return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ error: "Amount paid must be more than ₱0." }, { status: 400 });
        }
        if (!reference) {
            return NextResponse.json({ error: "Reference number is required." }, { status: 400 });
        }
        if (typeof receiptBase64 !== "string" || !/^data:(image\/|application\/pdf)/.test(receiptBase64)) {
            return NextResponse.json({ error: "A receipt image or PDF is required." }, { status: 400 });
        }
        if (receiptBase64.length > MAX_RECEIPT_CHARS) {
            return NextResponse.json({ error: "The receipt file is too large." }, { status: 413 });
        }
        if (!paidOnDate || isNaN(paidOnDate.getTime())) {
            return NextResponse.json({ error: "A valid date paid is required." }, { status: 400 });
        }
        if (paidOnDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
            return NextResponse.json({ error: "The date paid can't be in the future." }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const regs = db.collection("student_registrations");

        const reg = await regs.findOne({ _id: new ObjectId(id) });
        if (!reg) {
            return NextResponse.json({ error: "Registration not found" }, { status: 404 });
        }
        if (!SETTLEABLE_STATUSES.includes(reg.status)) {
            return NextResponse.json({ error: statusMessage(String(reg.status)) }, { status: 409 });
        }

        // ── duplicate reference on the same registration ──
        const existingRefs: string[] = [
            reg.referenceNumber,
            ...(Array.isArray(reg.balancePayments) ? reg.balancePayments.map((b: any) => b.referenceNumber) : []),
        ]
            .filter(Boolean)
            .map(normRef);
        if (existingRefs.includes(normRef(reference))) {
            return NextResponse.json(
                { error: "This reference number is already recorded for this registration. It looks like a duplicate." },
                { status: 409 }
            );
        }

        // ── compute the balance on the server with the SAME rules as the UI ──
        const parentEmail = String(reg.parentInfo?.email || "").trim();
        const parentAcc = parentEmail
            ? await db.collection("accounts").findOne({ email: { $regex: `^${escapeRegex(parentEmail)}$`, $options: "i" } })
            : null;
        const student = getStudentSessionInfo(reg, parentAcc);
        const paidVerified = isRegistrationVerified(reg.status) ? reg.amountPaid || reg.amountDue || 0 : 0;
        const terms = calcRegistrationTerms(reg, student, paidVerified, reg.amountDue);

        // The admin's screen showed a "total payable". If it no longer matches (interest ticked over, or
        // another payment was just saved) refuse instead of applying money against numbers they never saw.
        if (expectedTotalPayable != null && terms.totalPayable != null) {
            if (Math.abs(Number(expectedTotalPayable) - terms.totalPayable) > 0.01) {
                return NextResponse.json(
                    {
                        error: `The balance changed since this screen was loaded. Total payable is now ${peso(terms.totalPayable)}. Please close this window, reopen it and check the amount again.`,
                        currentTotalPayable: terms.totalPayable,
                    },
                    { status: 409 }
                );
            }
        }

        const alloc = allocateBalancePayment(terms, amount, !!waiveInterest);
        if (!alloc.ok) {
            return NextResponse.json({ error: alloc.error || "This payment can't be applied." }, { status: 400 });
        }

        // ── upload the receipt (Cloudinary, same folder as parent receipts) ──
        let receiptUrl = "";
        try {
            const up = await cloudinary.uploader.upload(receiptBase64, {
                folder: "merry_explorers_receipts",
                resource_type: "auto", // "auto" so PDFs are accepted too
            });
            receiptUrl = up.secure_url;
            uploadedPublicId = up.public_id;
        } catch (err) {
            console.error("[balance-payment] Cloudinary upload failed:", err);
            return NextResponse.json({ error: "Failed to upload the receipt. Please try again." }, { status: 502 });
        }

        // ── save atomically ──
        const now = new Date();
        const entry = {
            id: new ObjectId().toString(),
            amountPaid: amount,
            paymentMethod,
            referenceNumber: reference,
            receiptUrl,
            receiptPublicId: uploadedPublicId,
            paidOn: paidOnDate,
            recordedAt: now,
            verified: true, // the admin has the receipt in hand
            encodedByAdmin: true,
            encodedBy: { uid: actorUid || null, name: actorName || "Admin" }, // NOTE: from the request body, not verified
            adminNote: String(adminNote ?? "").trim(),
            balanceBefore: alloc.balanceBefore,
            interestAtTime: alloc.interest,
            totalPayableAtTime: alloc.totalPayable,
            balanceAfter: alloc.balanceAfter,
            interestWaived: alloc.interestWaived,
            creditAdded: alloc.creditAdded,
        };

        const newAmountPaid = r2(paidVerified + amount);
        const $set: Record<string, unknown> = { amountPaid: newAmountPaid, lastBalancePaymentAt: now };
        if (alloc.creditAdded > 0) $set.creditBalance = r2((Number(reg.creditBalance) || 0) + alloc.creditAdded);

        // The filter makes sure nobody changed the registration between our read and this write
        const res = await regs.updateOne(
            { _id: new ObjectId(id), status: reg.status, amountPaid: reg.amountPaid ?? null },
            { $set, $push: { balancePayments: entry } } as any
        );

        if (res.matchedCount === 0) {
            await cloudinary.uploader.destroy(uploadedPublicId).catch(() => { });
            return NextResponse.json(
                { error: "This registration was changed by someone else while saving. Nothing was recorded. Please try again." },
                { status: 409 }
            );
        }
        uploadedPublicId = ""; // saved, keep the receipt

        // ── audit log ──
        const childName = `${reg.childInfo?.firstName ?? ""} ${reg.childInfo?.lastName ?? ""}`.trim() || "student";
        await db.collection("audit_log").insertOne({
            actorUid: actorUid || null,
            actorName: actorName || "Admin",
            actorRole: "admin",
            action: "BALANCE_PAYMENT",
            category: "payments",
            targetId: id,
            details:
                `Encoded balance payment of ${peso(amount)} (${paymentMethod}, ref ${reference}) for ${childName}. ` +
                `Balance ${peso(alloc.balanceBefore)} → ${peso(alloc.balanceAfter)}` +
                (alloc.interestWaived > 0 ? `, interest waived ${peso(alloc.interestWaived)}` : "") +
                (alloc.creditAdded > 0 ? `, credit added ${peso(alloc.creditAdded)}` : ""),
            createdAt: now,
        });

        return NextResponse.json({
            success: true,
            paymentId: entry.id,
            receiptUrl,
            amountPaidTotal: newAmountPaid,
            balanceBefore: alloc.balanceBefore,
            interest: alloc.interest,
            totalPayable: alloc.totalPayable,
            balanceAfter: alloc.balanceAfter,
            interestWaived: alloc.interestWaived,
            creditAdded: alloc.creditAdded,
            fullySettled: alloc.fullySettled,
        });
    } catch (error: any) {
        if (uploadedPublicId) await cloudinary.uploader.destroy(uploadedPublicId).catch(() => { });
        console.error("[balance-payment POST]", error);
        return NextResponse.json({ error: error.message || "Failed to record the payment" }, { status: 500 });
    }
}