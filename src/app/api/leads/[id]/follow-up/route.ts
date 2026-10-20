import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";
import { requireAdmin } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const FACEBOOK_PAGE_URL = "https://m.me/61588889372224";
const STEP_LABELS: Record<number, string> = {
  0: "Parent & Child Details",
  1: "Program & Session Selection",
  2: "Consents & Waivers",
  3: "Review & Payment",
};
const PROGRAM_LABELS: Record<string, string> = {
  "curious-explorer": "Curious Explorer",
  "everyday-curious": "Everyday Explorer",
  "creative-explorer": "Creative Explorer",
  "brave-explorer": "Brave Explorer",
  ballet: "Ballet",
};
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
}

function buildFollowUp(lead: any) {
  const step = Number.isInteger(lead.step) ? lead.step : 0;
  const stepLabel = STEP_LABELS[step] || lead.stepName || `Step ${step}`;
  const parentName = String(lead.parentInfo?.name || "Parent/Guardian").trim();
  const greetingName = parentName.split(/\s+/)[0] || "there";
  const childName = [lead.childInfo?.firstName, lead.childInfo?.lastName].filter(Boolean).join(" ") || "your child";
  const programName = PROGRAM_LABELS[lead.selectedProgram] || lead.selectedProgram || "a program";
  const session = lead.selectedClass ? ` (${lead.selectedClass})` : "";
  const subjectChildName = childName.replace(/[\r\n]+/g, " ").trim();
  const subject = `Need a hand with ${subjectChildName}’s Merry Explorers Playgroup Learning Center registration?`;

  const progressText = step === 0
    ? `You started a registration for ${childName}, and we’re here if you have questions before choosing a program and session.`
    : step === 1
      ? `You were looking at ${programName}${session}. If you need help choosing a session or moving to the next step, we’d be happy to help.`
      : step === 2
        ? `You reached the consents and waivers for ${childName}’s registration. If anything is unclear, please reach out and we can guide you through it.`
        : `You reached the review and payment step for ${childName}’s registration. If you need help completing it, just let us know.`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#eef5ff;font-family:Arial,Helvetica,sans-serif;color:#17366b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #d9e6f7;border-radius:20px;overflow:hidden;">
    <tr><td style="padding:22px 28px;background:#ffd84d;text-align:center;color:#002f76;font-size:15px;font-weight:700;">MERRY EXPLORERS PLAYGROUP LEARNING CENTER</td></tr>
    <tr><td style="padding:32px 30px 18px;"><h1 style="margin:0 0 18px;font-size:23px;line-height:1.35;color:#002f76;">We’re happy to help! 🌟</h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.65;">Hi ${escapeHtml(greetingName)},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">${escapeHtml(progressText)}</p>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.7;">Do you need help with registration? Kindly message us on Facebook Messenger. We’ll be happy to help you!</p>
      <p style="margin:0 0 24px;text-align:center;"><a href="${FACEBOOK_PAGE_URL}" style="display:inline-block;padding:13px 22px;border-radius:12px;background:#0866ff;color:#fff;text-decoration:none;font-size:15px;font-weight:700;">Message us on Facebook</a></p>
      <p style="margin:0;font-size:14px;line-height:1.65;color:#587096;">Warmly,<br><strong style="color:#002f76;">Merry Explorers Playgroup Learning Center</strong></p>
    </td></tr>
    <tr><td style="padding:15px 28px;background:#f7faff;text-align:center;color:#8293ac;font-size:12px;">A little help can make the next step easier. 🌈</td></tr>
  </table>
</body></html>`;

  const text = `Hi ${greetingName},\n\n${progressText}\n\nDo you need help with registration? Kindly message us on Facebook Messenger. We’ll be happy to help you!\n\nMessage us: ${FACEBOOK_PAGE_URL}\n\nWarmly,\nMerry Explorers Playgroup Learning Center`;
  return { to: String(lead.parentInfo?.email || "").trim(), subject, html, text, step, stepLabel };
}

async function getLead(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const { db } = await connectToDatabase();
  return db.collection("leads").findOne({ _id: new ObjectId(id) });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    const lead = await getLead(id);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const preview = buildFollowUp(lead);
    if (!preview.to) return NextResponse.json({ error: "This lead does not have an email address." }, { status: 400 });
    const version = new Date(lead.updatedAt || lead.createdAt || 0).toISOString();

    return NextResponse.json({
      success: true,
      preview: {
        to: preview.to,
        subject: preview.subject,
        html: preview.html,
        step: preview.step,
        stepLabel: preview.stepLabel,
        version,
      },
    });
  } catch (error) {
    console.error("[lead follow-up preview]", error);
    return NextResponse.json({ error: "Failed to prepare email preview" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const lead = await getLead(id);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const currentVersion = new Date(lead.updatedAt || lead.createdAt || 0).toISOString();
    if (!body.expectedVersion || body.expectedVersion !== currentVersion) {
      return NextResponse.json({ error: "Lead details changed after the preview. Please preview the email again before sending." }, { status: 409 });
    }

    const email = buildFollowUp(lead);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.to)) {
      return NextResponse.json({ error: "This lead does not have a valid email address." }, { status: 400 });
    }
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return NextResponse.json({ error: "Email sending is not configured." }, { status: 503 });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    const sentAt = new Date();
    try {
      const { db } = await connectToDatabase();
      await db.collection("leads").updateOne(
        { _id: new ObjectId(id) },
        { $push: { followUpEmails: {
          to: email.to,
          subject: email.subject,
          step: email.step,
          stepLabel: email.stepLabel,
          sentAt,
          sentBy: auth.user.email || auth.user.uid,
        } } as any },
      );
    } catch (error) {
      console.error("[lead follow-up] Email sent, but send history could not be saved:", error);
    }

    return NextResponse.json({ success: true, sentAt: sentAt.toISOString(), to: email.to });
  } catch (error) {
    console.error("[lead follow-up send]", error);
    return NextResponse.json({ error: "Failed to send follow-up email" }, { status: 500 });
  }
}
