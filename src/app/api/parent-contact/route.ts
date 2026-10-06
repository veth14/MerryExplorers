import { NextRequest, NextResponse } from "next/server";
import * as nodemailer from "nodemailer";

const SCHOOL_EMAIL = "merryexplorerscenter@gmail.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://merry-explorers.vercel.app";

function makeTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// ─── Email to the school ──────────────────────────────────────────────────────

function buildSchoolEmail(name: string, email: string, subject: string, message: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>New Parent Message</title></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,47,118,0.12);">
        <tr><td style="background:linear-gradient(135deg,#002f76 0%,#0050d5 100%);padding:32px 40px;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">📬</div>
          <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;">New Parent Message</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:8px 0 0;">Received via the Merry Explorers Parent Portal</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
            <tr style="background:#f8faff;">
              <td style="padding:12px 18px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e2e8f0;width:90px;">From</td>
              <td style="padding:12px 18px;font-size:14px;font-weight:600;color:#1e3a6e;border-bottom:1px solid #e2e8f0;">${name}</td>
            </tr>
            <tr style="background:#ffffff;">
              <td style="padding:12px 18px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e2e8f0;">Email</td>
              <td style="padding:12px 18px;font-size:14px;font-weight:600;color:#0050d5;border-bottom:1px solid #e2e8f0;"><a href="mailto:${email}" style="color:#0050d5;text-decoration:none;">${email}</a></td>
            </tr>
            <tr style="background:#f8faff;">
              <td style="padding:12px 18px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Subject</td>
              <td style="padding:12px 18px;font-size:14px;font-weight:600;color:#1e3a6e;">${subject || "(no subject)"}</td>
            </tr>
          </table>
          <div style="background:#f8faff;border:1.5px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
            <p style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px;">Message</p>
            <p style="font-size:15px;color:#334155;line-height:1.7;margin:0;white-space:pre-wrap;">${message}</p>
          </div>
          <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject || "Your message to Merry Explorers")}" style="display:inline-block;background:linear-gradient(135deg,#002f76,#0050d5);color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;padding:12px 32px;border-radius:50px;box-shadow:0 6px 20px rgba(0,47,118,0.3);">
            Reply to ${name} →
          </a>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} Merry Explorers. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Confirmation email to the parent ────────────────────────────────────────

function buildParentConfirmEmail(name: string, subject: string, message: string) {
  const portalUrl = `${APP_URL}/parent/login`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>We received your message</title></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,47,118,0.12);">
        <tr><td style="background:linear-gradient(135deg,#002f76 0%,#0050d5 100%);padding:32px 40px;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">✅</div>
          <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;">Message Received!</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:8px 0 0;">Merry Explorers Parent Portal</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi <strong style="color:#002f76;">${name}</strong>,</p>
          <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 24px;">
            Thank you for reaching out! We have received your message and our team will get back to you as soon as possible — usually within the same school day.
          </p>
          <div style="background:#f0f5ff;border-left:4px solid #0050d5;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
            <p style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Your message summary</p>
            <p style="font-size:13px;font-weight:700;color:#002f76;margin:0 0 4px;">${subject || "(no subject)"}</p>
            <p style="font-size:13px;color:#334155;line-height:1.6;margin:0;white-space:pre-wrap;">${message.length > 200 ? message.substring(0, 200) + "…" : message}</p>
          </div>
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:16px 20px;margin:0 0 28px;">
            <p style="color:#92400e;font-size:13px;font-weight:600;margin:0;">💡 For urgent concerns about your child, please call us directly at <strong>0917 123 4567</strong> or visit the school during office hours (Mon–Fri, 10:00 AM–5:00 PM).</p>
          </div>
          <div style="text-align:center;">
            <a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#002f76,#0050d5);color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;padding:14px 40px;border-radius:50px;box-shadow:0 6px 20px rgba(0,47,118,0.3);">
              Go to Parent Portal →
            </a>
          </div>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} Merry Explorers · Secure Parent Portal</p>
          <p style="color:#cbd5e1;font-size:11px;margin:6px 0 0;">This is an automated confirmation — please do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body as {
      name: string;
      email: string;
      subject: string;
      message: string;
    };

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const transporter = makeTransporter();

    // 1. Notify the school
    await transporter.sendMail({
      from: `"Merry Explorers Portal" <${process.env.EMAIL_USER}>`,
      to: SCHOOL_EMAIL,
      replyTo: email.trim(),
      subject: `📬 Parent Message: ${subject || "(no subject)"} — from ${name}`,
      html: buildSchoolEmail(name, email.trim(), subject, message),
    });

    // 2. Send confirmation to the parent
    await transporter.sendMail({
      from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
      to: email.trim(),
      subject: "✅ We received your message — Merry Explorers",
      html: buildParentConfirmEmail(name, subject, message),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[parent-contact] Email send failed:", err);
    return NextResponse.json({ error: "Failed to send email. Please try again." }, { status: 500 });
  }
}
