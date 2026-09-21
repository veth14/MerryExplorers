import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

function buildEmailHtml({
  childFirstName,
  childNickname,
  programName,
  sessionLabel,
  note,
  accessCode,
  pin,
  expiresAt,
  photoCount,
  appUrl,
}: {
  childFirstName: string;
  childNickname: string;
  programName: string;
  sessionLabel: string;
  note: string;
  accessCode: string;
  pin?: string;
  expiresAt: Date;
  photoCount: number;
  appUrl: string;
}): string {
  const displayName = childNickname || childFirstName;
  const viewUrl = `${appUrl}/photos/${accessCode}`;
  const expiryStr = new Date(expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${displayName}'s Photos — Merry Explorers</title>
</head>
<body style="margin:0;padding:0;background:#f0f6ff;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f6ff;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(0,51,160,0.10);">

      <!-- Header gradient -->
      <tr><td style="background:linear-gradient(135deg,#0033A0 0%,#0055cc 60%,#1a75ff 100%);padding:36px 40px 28px;text-align:center;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:0.18em;color:rgba(255,255,255,0.6);text-transform:uppercase;">Merry Explorers Playgroup</p>
        <h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">📸 ${displayName}'s Highlights</h1>
        <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">${sessionLabel}</p>
      </td></tr>

      <!-- Photo count badge -->
      <tr><td style="background:#FFC107;padding:10px 40px;text-align:center;">
        <p style="margin:0;font-size:13px;font-weight:800;color:#003399;">✨ ${photoCount} special moment${photoCount !== 1 ? "s" : ""} captured just for ${displayName}!</p>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 12px;font-size:15px;color:#1a2e6b;font-weight:700;">Hello, ${displayName}'s family! 👋</p>
        <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7;">
          We had a wonderful session and captured some incredible moments of ${displayName} in 
          <strong style="color:#0033A0;">${programName}</strong>. Click below to see all the photos — we hope they bring you as much joy as they brought us! 🌟
        </p>

        ${note ? `
        <!-- Teacher note -->
        <div style="background:#f0f6ff;border-left:4px solid #0033A0;border-radius:0 12px 12px 0;padding:14px 18px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:0.1em;color:#0033A0;text-transform:uppercase;">Note from your teacher</p>
          <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">${note}</p>
        </div>` : ""}

        ${pin ? `
        <!-- Secure PIN -->
        <div style="background:#fff3cd;border:1.5px solid #ffecb5;border-radius:12px;padding:16px 20px;text-align:center;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#664d03;">🔒 Secure PIN Required</p>
          <p style="margin:0;font-size:24px;font-weight:900;letter-spacing:0.25em;color:#000000;">${pin}</p>
          <p style="margin:8px 0 0;font-size:12px;color:#664d03;">Please enter this code when prompted to view the photos.</p>
        </div>` : ""}

        <!-- CTA Button -->
        <div style="text-align:center;margin:28px 0;">
          <a href="${viewUrl}" style="display:inline-block;background:#FFC107;color:#003399;font-size:16px;font-weight:900;text-decoration:none;padding:16px 40px;border-radius:50px;box-shadow:0 6px 20px rgba(255,193,7,0.45);letter-spacing:0.02em;">
            View ${displayName}'s Photos 📷
          </a>
        </div>

        <p style="text-align:center;font-size:12px;color:#94a3b8;margin:0 0 4px;">Or copy this link:</p>
        <p style="text-align:center;font-size:12px;color:#0033A0;word-break:break-all;margin:0 0 28px;">
          <a href="${viewUrl}" style="color:#0033A0;">${viewUrl}</a>
        </p>

        <!-- Expiry notice -->
        <div style="background:#fff8e1;border:1.5px solid #fbbf24;border-radius:12px;padding:14px 18px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#92400e;font-weight:700;">
            ⏰ Photos available until <strong>${expiryStr} (PHT)</strong>
          </p>
          <p style="margin:4px 0 0;font-size:11px;color:#a16207;">Please save any photos you love before the link expires.</p>
        </div>
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

// POST /api/photo-albums/send-email — Admin only
export async function POST(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const data = await request.json();
    const { albumId, actorUid, actorName } = data;

    if (!albumId) {
      return NextResponse.json({ error: "Missing albumId" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const { ObjectId } = await import("mongodb");

    const album = await db
      .collection("student_photo_albums")
      .findOne({ _id: new ObjectId(albumId) });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    if (!album.parentEmail) {
      return NextResponse.json({ error: "No parent email on record for this student" }, { status: 400 });
    }

    // Build transporter using Gmail credentials from .env.local
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const appUrl = new URL(request.url).origin;
    const displayName = album.childNickname || album.childFirstName;

    await transporter.sendMail({
      from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
      to: album.parentEmail,
      subject: `📸 ${displayName}'s Merry Explorers Photos — ${album.sessionLabel}`,
      html: buildEmailHtml({
        childFirstName: album.childFirstName,
        childNickname: album.childNickname,
        programName: album.programName,
        sessionLabel: album.sessionLabel,
        note: album.note,
        accessCode: album.accessCode,
        pin: album.pin,
        expiresAt: album.expiresAt,
        photoCount: album.photos.length,
        appUrl,
      }),
    });

    // Mark email as sent
    await db
      .collection("student_photo_albums")
      .updateOne(
        { _id: new ObjectId(albumId) },
        { $set: { emailSent: true, emailSentAt: new Date() } }
      );

    // Audit log
    if (actorUid) {
      await db.collection("audit_log").insertOne({
        actorUid,
        actorName: actorName || "Admin",
        actorRole: "admin",
        action: "EMAIL_SENT",
        category: "photo_albums",
        targetId: albumId,
        details: `Sent photo album email to parent for ${album.childFirstName} (${album.sessionLabel})`,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[photo-albums/send-email POST]", error);
    return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
  }
}
