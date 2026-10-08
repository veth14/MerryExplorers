// app/api/payments/notify/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

const esc = (v: unknown) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const peso = (n: number) =>
    `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const METHOD_LABELS: Record<string, string> = { gcash: "GCash", bpi: "BPI", "mari-bank": "Mari Bank" };

type Settlement = {
    previousBalance: number;
    interest: number;
    totalPayable: number;
    interestWaived: number;
    creditAdded: number;
};

function buildEmailHtml(p: {
    parentName: string;
    childName: string;
    programName: string;
    paymentLabel: string;
    amountPaid: number;
    paymentMethod: string;
    referenceNumber: string;
    paidOn: Date;
    remainingBalance: number | null;
    dueNote: string;
    // set when this payment settles (or reduces) the remaining balance of a registration
    settlement: Settlement | null;
}): string {
    const paidOnStr = p.paidOn.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    });

    const after = p.remainingBalance ?? 0;
    const title = !p.settlement
        ? "✅ Payment Received"
        : after === 0
            ? "✅ Balance Fully Settled"
            : "✅ Payment Applied to Balance";
    const intro = !p.settlement
        ? "Thank you! We have received and verified your payment. Here are the details for your records:"
        : after === 0
            ? "Thank you! We have received and verified your payment, and it has been applied to your account. Your remaining balance is now fully settled. Here is your statement:"
            : "Thank you! We have received and verified your payment and applied it to your remaining balance. Here is your statement:";

    // Statement rows: only rows that apply are shown, and the shading alternates automatically
    const stRows: { label: string; value: string; color: string }[] = [];
    if (p.settlement) {
        const s = p.settlement;
        stRows.push({ label: "Remaining balance before this payment", value: peso(s.previousBalance), color: "#334155" });
        if (s.interest > 0) {
            stRows.push({ label: "Overdue interest", value: peso(s.interest), color: "#b91c1c" });
            stRows.push({ label: "Total payable", value: peso(s.totalPayable), color: "#334155" });
        }
        stRows.push({ label: "Amount paid (this payment)", value: `− ${peso(p.amountPaid)}`, color: "#15803d" });
        if (s.interestWaived > 0) {
            stRows.push({ label: "Remaining interest waived", value: `− ${peso(s.interestWaived)}`, color: "#15803d" });
        }
        if (s.creditAdded > 0) {
            stRows.push({ label: "Extra amount kept as credit on your account", value: peso(s.creditAdded), color: "#0033A0" });
        }
    }
    const statementBlock = p.settlement
        ? `
        <p style="margin:24px 0 8px;font-size:11px;font-weight:800;letter-spacing:0.1em;color:#0033A0;text-transform:uppercase;">Balance statement</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2eaf8;border-radius:12px;overflow:hidden;font-size:14px;">
          ${stRows
            .map(
                (r, i) =>
                    `<tr style="background:${i % 2 ? "#ffffff" : "#f8faff"};"><td style="padding:10px 16px;color:#94a3b8;font-weight:600;">${esc(r.label)}</td><td style="padding:10px 16px;text-align:right;color:${r.color};font-weight:700;">${r.value}</td></tr>`
            )
            .join("")}
          <tr style="background:#f0f6ff;"><td style="padding:12px 16px;color:#0033A0;font-weight:800;">Balance after this payment</td><td style="padding:12px 16px;text-align:right;color:${after === 0 ? "#15803d" : "#b45309"};font-weight:900;font-size:16px;">${peso(after)}</td></tr>
        </table>`
        : "";

    const rows: [string, string][] = [
        ["Student", p.childName || "—"],
        ["Program", p.programName || "—"],
        ["Payment for", p.paymentLabel],
        ["Payment method", METHOD_LABELS[p.paymentMethod] || p.paymentMethod.toUpperCase() || "—"],
        ["Reference no.", p.referenceNumber || "—"],
        ["Date paid", paidOnStr],
    ];

    const balanceBlock =
        p.remainingBalance == null
            ? ""
            : p.remainingBalance > 0
                ? `
        <div style="background:#fff8e1;border:1.5px solid #fbbf24;border-radius:12px;padding:14px 18px;text-align:center;margin-top:20px;">
          <p style="margin:0;font-size:12px;color:#92400e;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;">Remaining balance</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:900;color:#b45309;">${peso(p.remainingBalance)}</p>
          ${p.dueNote ? `<p style="margin:4px 0 0;font-size:12px;color:#a16207;">${esc(p.dueNote)}</p>` : ""}
        </div>`
                : `
        <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:14px 18px;text-align:center;margin-top:20px;">
          <p style="margin:0;font-size:14px;color:#15803d;font-weight:800;">🎉 Your account is fully paid. Thank you!</p>
        </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Payment Received — Merry Explorers</title>
</head>
<body style="margin:0;padding:0;background:#f0f6ff;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f6ff;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(0,51,160,0.10);">

      <!-- Header gradient -->
      <tr><td style="background:linear-gradient(135deg,#0033A0 0%,#0055cc 60%,#1a75ff 100%);padding:36px 40px 28px;text-align:center;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:0.18em;color:rgba(255,255,255,0.6);text-transform:uppercase;">Merry Explorers Playgroup</p>
        <h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">${esc(title)}</h1>
        <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">${esc(p.paymentLabel)}</p>
      </td></tr>

      <!-- Amount badge -->
      <tr><td style="background:#FFC107;padding:10px 40px;text-align:center;">
        <p style="margin:0;font-size:13px;font-weight:800;color:#003399;">💰 We received ${peso(p.amountPaid)}</p>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 12px;font-size:15px;color:#1a2e6b;font-weight:700;">Hello, ${esc(p.parentName || "there")}! 👋</p>
        <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7;">
          ${intro}
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2eaf8;border-radius:12px;overflow:hidden;font-size:14px;">
          ${rows
            .map(
                ([k, v], i) =>
                    `<tr style="background:${i % 2 ? "#ffffff" : "#f8faff"};"><td style="padding:10px 16px;color:#94a3b8;font-weight:600;">${k}</td><td style="padding:10px 16px;text-align:right;color:#334155;font-weight:700;">${esc(v)}</td></tr>`
            )
            .join("")}
          ${p.settlement ? "" : `<tr style="background:#f0f6ff;"><td style="padding:12px 16px;color:#0033A0;font-weight:800;">Amount received</td><td style="padding:12px 16px;text-align:right;color:#0033A0;font-weight:900;font-size:16px;">${peso(p.amountPaid)}</td></tr>`}
        </table>

        ${statementBlock}

        ${balanceBlock}

        <p style="margin:24px 0 0;text-align:center;font-size:12px;color:#94a3b8;">Please keep this email as your proof of payment.</p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f8faff;border-top:1px solid #e2eaf8;padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#64748b;">
          Merry Explorers Playgroup Learning Center<br/>
          <span style="color:#94a3b8;">This is an automated message. Please do not reply to this email.</span>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// POST /api/payments/notify — Admin only
// Only call this AFTER the payment was saved. For balance payments pass the numbers the
// balance-payment route returned (balanceAfter etc.), not numbers computed in the browser.
export async function POST(request: Request) {
    const deny = requireInternalAuth(request);
    if (deny) return deny;

    try {
        const data = await request.json();
        const {
            to,
            parentName,
            childName,
            programName,
            paymentLabel,
            amountPaid,
            paymentMethod,
            referenceNumber,
            paidOn,
            remainingBalance,
            dueNote,
            settlement,
            targetId,
            actorUid,
            actorName,
        } = data;

        const amount = Number(amountPaid);
        if (!to || !/^\S+@\S+\.\S+$/.test(String(to)) || !(amount > 0)) {
            return NextResponse.json({ error: "Missing parent email or amount" }, { status: 400 });
        }

        // Same Gmail setup as the photo-albums email route
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
            to,
            subject: settlement
                ? `✅ ${Number(remainingBalance) === 0 ? "Balance settled" : "Payment applied to your balance"} — ${peso(amount)} · Merry Explorers`
                : `✅ Payment received — ${peso(amount)} · Merry Explorers`,
            html: buildEmailHtml({
                parentName: parentName || "",
                childName: childName || "",
                programName: programName || "",
                paymentLabel: paymentLabel || "Payment",
                amountPaid: amount,
                paymentMethod: String(paymentMethod || ""),
                referenceNumber: String(referenceNumber || ""),
                paidOn: paidOn ? new Date(paidOn) : new Date(),
                remainingBalance: remainingBalance == null ? null : Number(remainingBalance),
                dueNote: dueNote || "",
                settlement: settlement
                    ? {
                        previousBalance: Number(settlement.previousBalance) || 0,
                        interest: Number(settlement.interest) || 0,
                        totalPayable: Number(settlement.totalPayable) || 0,
                        interestWaived: Number(settlement.interestWaived) || 0,
                        creditAdded: Number(settlement.creditAdded) || 0,
                    }
                    : null,
            }),
        });

        // Audit log (same shape as the photo-albums route)
        if (actorUid) {
            const { db } = await connectToDatabase();
            await db.collection("audit_log").insertOne({
                actorUid,
                actorName: actorName || "Admin",
                actorRole: "admin",
                action: "EMAIL_SENT",
                category: "payments",
                targetId: targetId || null,
                details: `Sent payment confirmation (${peso(amount)}) to parent of ${childName || "student"}`,
                createdAt: new Date(),
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[payments/notify POST]", error);
        return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
    }
}