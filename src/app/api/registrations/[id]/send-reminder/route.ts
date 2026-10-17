import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth-guard";
import { getRegistrationTotal, isRegistrationVerified } from "@/lib/payment-terms";
import { PROGRAM_SLOTS } from "@/data/landing";

export const dynamic = "force-dynamic";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]!));

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const registration = await db.collection("student_registrations").findOne({ _id: new ObjectId(id) });
    if (!registration) return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    const email = registration.parentInfo?.email;
    if (!email) return NextResponse.json({ error: "No parent email is on this registration." }, { status: 400 });

    const program = (PROGRAM_SLOTS as any)[registration.program];
    const total =
      (getRegistrationTotal({ ...registration, uniformOrdered: false }, program?.rate || 0) || 0) +
      (registration.uniformOrdered ? 650 : 0);
    const amountPaid = isRegistrationVerified(registration.status)
      ? Number(registration.amountPaid || registration.amountDue || 0)
      : 0;
    const balance = Math.max(0, total - amountPaid);
    if (balance === 0) {
      return NextResponse.json({ error: "This registration has no remaining balance to remind about." }, { status: 409 });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://merry-explorers.vercel.app";
    const paymentUrl = `${baseUrl}/register/payment/${id}`;
    const parentName = escapeHtml(registration.parentInfo?.name || "Parent / Guardian");
    const childName = escapeHtml(registration.childInfo?.firstName || "your child");
    const programName = escapeHtml(program?.name || registration.program || "your program");

    await transporter.sendMail({
      from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Payment Reminder — ${registration.childInfo?.firstName || "Your Explorer"} at Merry Explorers`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#334155;border:1px solid #dbeafe;border-radius:18px;overflow:hidden">
          <div style="background:#0033A0;padding:26px;text-align:center;color:white">
            <h1 style="margin:0;font-size:22px">Merry Explorers</h1>
            <p style="margin:6px 0 0;color:#ffd84d;font-weight:700">Payment Reminder</p>
          </div>
          <div style="padding:28px">
            <p>Hi <strong>${parentName}</strong>,</p>
            <p>This is a friendly reminder about <strong>${childName}</strong>&apos;s registration for <strong>${programName}</strong>.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbea;border:1px dashed #ffd84d;border-radius:12px;padding:16px">
              <tr><td style="padding:5px 0">Total rate</td><td style="text-align:right;font-weight:700">₱${total.toLocaleString()}</td></tr>
              <tr><td style="padding:5px 0">Verified amount paid</td><td style="text-align:right;color:#15803d;font-weight:700">₱${amountPaid.toLocaleString()}</td></tr>
              <tr><td style="padding:9px 0 0;border-top:1px solid #fde68a;font-weight:800">Remaining balance</td><td style="padding:9px 0 0;border-top:1px solid #fde68a;text-align:right;color:#b45309;font-weight:800">₱${balance.toLocaleString()}</td></tr>
            </table>
            <p style="margin:20px 0;color:#64748b;line-height:1.6">Please use the button below to review your registration and payment details.</p>
            <p style="text-align:center;margin:26px 0"><a href="${paymentUrl}" style="display:inline-block;background:#0033A0;color:#fff;padding:13px 24px;border-radius:10px;text-decoration:none;font-weight:700">Review Payment Details →</a></p>
            <p style="font-size:13px;color:#64748b">If you have already paid or need help, please reply to this email or message us on Facebook.</p>
            <p style="font-weight:700;color:#0033A0">Merry Explorers Playgroup and Learning Center 💛</p>
          </div>
        </div>`,
    });

    return NextResponse.json({ success: true, emailSent: true });
  } catch (error: any) {
    console.error("[send-reminder POST]", error);
    return NextResponse.json({ error: error.message || "Failed to send payment reminder." }, { status: 500 });
  }
}
