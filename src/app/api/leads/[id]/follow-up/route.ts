import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";
import { requireAdmin } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { PROGRAM_SLOTS } from "@/data/landing";

export const dynamic = "force-dynamic";

const FACEBOOK_PAGE_URL = "https://www.facebook.com/profile.php?id=61588889372224";
const FACEBOOK_MESSENGER_URL = "https://m.me/61588889372224";
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
  const programName = PROGRAM_LABELS[lead.selectedProgram] || lead.selectedProgram;
  const hasProgramSelection = Boolean(lead.selectedProgram);
  const hasSessionSelection = Boolean(lead.selectedClass);
  const programDetails = lead.selectedProgram
    ? PROGRAM_SLOTS[lead.selectedProgram as keyof typeof PROGRAM_SLOTS]
    : null;
  const selectedSession = programDetails?.classes.find((item) => item.name === lead.selectedClass);
  const session = lead.selectedClass ? ` (${lead.selectedClass})` : "";
  const subjectChildName = childName.replace(/[\r\n]+/g, " ").trim();
  const subject = `Need a hand with ${subjectChildName}’s Merry Explorers Playgroup Learning Center registration?`;

  const progressText = step === 0
    ? `You started a registration for ${childName}, and we’re here if you have questions before choosing a program and session.`
    : step === 1
      ? hasProgramSelection
        ? `You were looking at ${programName}${session}. If you need help choosing a session or moving to the next step, we’d be happy to help.`
        : `You reached the program and session selection step. If you need help choosing a program or session, we’d be happy to help.`
      : step === 2
        ? `You reached the consents and waivers for ${childName}’s registration. If anything is unclear, please reach out and we can guide you through it.`
        : `You reached the review and payment step for ${childName}’s registration. If you need help completing it, just let us know.`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:32px 16px;background:#eaf4ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#17366b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eaf4ff;padding:0;">
    <tr><td align="center">
      <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#fff;border:3px solid #ffd84d;border-radius:20px;overflow:hidden;box-shadow:0 6px 20px rgba(0,51,160,.12);">
        <tr><td style="background:#ffd84d;padding:14px 20px;text-align:center;"><p style="margin:0;color:#0033a0;font-size:13px;font-weight:700;letter-spacing:.5px;">🌟 WE’RE HERE TO HELP WITH YOUR REGISTRATION 🌟</p></td></tr>
        <tr><td style="background:#0033a0;padding:32px 20px;text-align:center;">
          <p style="margin:0 0 4px;font-size:40px;">🎒🎈🧭</p>
          <h1 style="margin:0;color:#fff;font-size:30px;font-weight:800;letter-spacing:1px;">MERRY EXPLORERS</h1>
          <p style="margin:6px 0 0;color:#ffd84d;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Playgroup Learning Center</p>
          <p style="margin:14px 0 0;color:#a3c4f3;font-size:15px;font-style:italic;">Dream. Discover. Explore. 🤍</p>
        </td></tr>
        <tr><td style="padding:30px 26px;">
          <p style="margin:0 0 4px;text-align:center;font-size:42px;">🤝</p>
          <h2 style="margin:0 0 8px;text-align:center;color:#1e293b;font-size:23px;">Need a hand with registration?</h2>
          <p style="margin:0 0 24px;text-align:center;color:#0033a0;font-size:14px;font-weight:700;">We’ll be happy to help you and ${escapeHtml(childName)}!</p>
          <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.7;">Hi ${escapeHtml(greetingName)}! ${escapeHtml(progressText)}</p>
          <div style="margin:0 0 20px;padding:20px 22px;background:#f8fbff;border:1.5px solid #dbeafe;border-radius:16px;">
            <p style="margin:0 0 12px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">📋 Registration Progress</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;font-weight:600;width:40%;">Explorer</td><td style="padding:6px 0;color:#0033a0;font-size:14px;font-weight:700;">${escapeHtml(childName)}</td></tr>
              <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;font-weight:600;">Current Step</td><td style="padding:6px 0;color:#0033a0;font-size:14px;font-weight:700;">${escapeHtml(stepLabel)}</td></tr>
              ${hasProgramSelection ? `<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;font-weight:600;">Program</td><td style="padding:6px 0;color:#0033a0;font-size:14px;font-weight:700;">${escapeHtml(programDetails?.name || programName)}</td></tr>` : ""}
              ${hasSessionSelection ? `<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;font-weight:600;">Session</td><td style="padding:6px 0;color:#0033a0;font-size:14px;font-weight:700;">${escapeHtml(lead.selectedClass)}</td></tr>` : ""}
              ${hasSessionSelection && programDetails?.schedule ? `<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;font-weight:600;">Session days</td><td style="padding:6px 0;color:#0033a0;font-size:14px;font-weight:700;">${escapeHtml(programDetails.schedule)}</td></tr>` : ""}
              ${hasSessionSelection && selectedSession?.time ? `<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;font-weight:600;">Session time</td><td style="padding:6px 0;color:#0033a0;font-size:14px;font-weight:700;">${escapeHtml(selectedSession.time)}</td></tr>` : ""}
            </table>
          </div>
          <div style="margin:0 0 22px;padding:19px 22px;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:16px;">
            <p style="margin:0 0 8px;color:#166534;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">💬 We’re just a message away</p>
            <p style="margin:0 0 16px;color:#15803d;font-size:13px;line-height:1.6;">Do you need help in registration? Kindly message us on Facebook Messenger or visit our Facebook page. We’ll be happy to help you!</p>
            <p style="margin:0;text-align:center;"><a href="${FACEBOOK_MESSENGER_URL}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#0866ff;color:#fff;text-decoration:none;font-size:14px;font-weight:700;">Message us on Facebook</a></p>
            <p style="margin:12px 0 0;text-align:center;"><a href="${FACEBOOK_PAGE_URL}" style="color:#0033a0;font-size:13px;font-weight:700;text-decoration:underline;">Visit the Merry Explorers Facebook page</a></p>
          </div>
          <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">We can guide you through the next step whenever you’re ready. 💛</p>
        </td></tr>
        <tr><td style="background:#eaf4ff;padding:20px 28px;text-align:center;border-top:2px dashed #ffd84d;">
          <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;"><strong style="color:#0033a0;">Merry Explorers Playgroup Learning Center</strong><br>📍 2nd floor, Starla 88 Bldg., Camarin Road, Caloocan — near Camarin Doctors Hospital</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const selectionLines: string[] = [];
  if (hasProgramSelection) selectionLines.push(`Program: ${programDetails?.name || programName}`);
  if (hasSessionSelection) {
    selectionLines.push(`Session: ${lead.selectedClass}`);
    if (programDetails?.schedule) selectionLines.push(`Session days: ${programDetails.schedule}`);
    if (selectedSession?.time) selectionLines.push(`Session time: ${selectedSession.time}`);
  }
  const selectionSummary = selectionLines.length ? `\n${selectionLines.join("\n")}` : "";
  const text = `Hi ${greetingName},\n\n${progressText}\n\nExplorer: ${childName}\nCurrent step: ${stepLabel}${selectionSummary}\n\nDo you need help in registration? Kindly message us on Facebook Messenger or visit our Facebook page. We’ll be happy to help you!\n\nMessage us: ${FACEBOOK_MESSENGER_URL}\nFacebook page: ${FACEBOOK_PAGE_URL}\n\nWarmly,\nMerry Explorers Playgroup Learning Center`;
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
