import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import * as nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generatePassword(length = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "@#!";
  const all = upper + lower + digits + special;
  // Guarantee at least one from each character class
  const guaranteed = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  const rest = Array.from({ length: length - 4 }, () => all[Math.floor(Math.random() * all.length)]);
  return [...guaranteed, ...rest].sort(() => Math.random() - 0.5).join("");
}

async function sendWelcomeEmail(
  toEmail: string,
  parentName: string,
  childName: string,
  program: string,
  classTime: string,
  password: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://merry-explorers.vercel.app";
  const loginUrl = `${appUrl}/parent/login`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Merry Explorers Parent Portal</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,47,118,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#002f76 0%,#0050d5 100%);padding:36px 40px;text-align:center;">
              <div style="font-size:36px;margin-bottom:10px;">🌟</div>
              <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0;letter-spacing:-0.3px;">Welcome to Merry Explorers!</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0;">Your Parent Portal Account is Ready</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 20px;">
                Hi <strong style="color:#002f76;">${parentName}</strong>,
              </p>
              <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 20px;">
                We're thrilled to have you and <strong style="color:#002f76;">${childName}</strong> as part of the Merry Explorers family! Your Parent Portal account has been set up so you can follow your child's adventures, view session photos, and access important documents.
              </p>
              <div style="background:#f0f5ff;border-left:4px solid #0050d5;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
                <p style="color:#002f76;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Program Enrolled</p>
                <p style="color:#1e3a6e;font-size:15px;font-weight:600;margin:0 0 4px;">📚 ${program}</p>
                ${classTime ? `<p style="color:#5a6e8c;font-size:14px;margin:0;">🕐 ${classTime}</p>` : ""}
              </div>
              <div style="background:#fafbff;border:2px solid #c5d6ff;border-radius:12px;padding:24px;margin:0 0 28px;">
                <p style="color:#002f76;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 16px;">🔐 Your Login Credentials</p>
                <div style="margin-bottom:14px;">
                  <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;margin:0 0 4px;">Email Address</p>
                  <p style="color:#0050d5;font-size:15px;font-weight:700;background:#e8f0ff;padding:10px 14px;border-radius:8px;margin:0;">${toEmail}</p>
                </div>
                <div>
                  <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;margin:0 0 4px;">Temporary Password</p>
                  <p style="color:#002f76;font-size:19px;font-weight:800;letter-spacing:2px;background:#fff3cd;padding:10px 14px;border-radius:8px;margin:0;font-family:monospace;">${password}</p>
                </div>
              </div>
              <div style="text-align:center;margin:0 0 28px;">
                <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#002f76,#0050d5);color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;padding:14px 40px;border-radius:50px;box-shadow:0 6px 20px rgba(0,47,118,0.3);">
                  Sign In to Parent Portal →
                </a>
              </div>
              <div style="background:#fff8e1;border:1px solid #fcd34d;border-radius:10px;padding:14px 18px;margin:0 0 24px;">
                <p style="color:#92400e;font-size:13px;font-weight:600;margin:0;">⚠️ For your security, please change your password after your first login. Keep these credentials private.</p>
              </div>
              <p style="color:#64748b;font-size:13px;line-height:1.7;margin:0;">
                Need help? Reply to this email or reach out to your child's teacher directly.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} Merry Explorers. All rights reserved.</p>
              <p style="color:#94a3b8;font-size:12px;margin:6px 0 0;">This is an automated message — please do not reply directly to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🌟 Your Merry Explorers Parent Portal Access, ${parentName}!`,
    html,
  });
}

// ─── POST /api/parents — Create parent Firebase + MongoDB account ─────────────

export async function POST(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const data = await request.json();
    const {
      fullName,
      email,
      phone,
      relationship,
      childName,
      program,
      schedule,
      classTime,
      status,
      avatarUrl,
      avatarColor,
      initials,
    } = data;

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanName = String(fullName || "").trim();

    if (!cleanEmail || !cleanName || !childName || !program) {
      return NextResponse.json({ error: "Full name, email, child name, and program are required." }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Check if email already exists in MongoDB accounts
    const existing = await db.collection("accounts").findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    // Generate a readable temporary password to send to the parent
    const tempPassword = generatePassword(12);

    // Create Firebase user via Identity Toolkit REST API (no Admin SDK needed)
    const firebaseRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: tempPassword,
          returnSecureToken: false,
        }),
      }
    );

    if (!firebaseRes.ok) {
      const errBody = await firebaseRes.json();
      const msg = errBody?.error?.message || "Failed to create authentication account";
      if (msg.includes("EMAIL_EXISTS")) {
        return NextResponse.json({ error: "An account with this email already exists in the authentication system." }, { status: 409 });
      }
      if (msg.includes("INVALID_EMAIL")) {
        return NextResponse.json({ error: "That email address isn't valid." }, { status: 400 });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const firebaseData = await firebaseRes.json();
    const uid = firebaseData.localId;

    // Store parent account in MongoDB (Firebase UID = MongoDB _id)
    const autoInitials = initials || cleanName.trim().split(" ").filter(Boolean).map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

    const accountDoc = {
      _id: uid,
      fullName: cleanName,
      email: cleanEmail,
      phone: String(phone || "").trim(),
      relationship: relationship || "Parent",
      childName: String(childName || "").trim(),
      childrenNames: String(childName || "").trim(), // backwards-compat alias
      program: String(program || "").trim(),
      schedule: String(schedule || "").trim(),
      classTime: String(classTime || "").trim(),
      status: status || "active",
      role: "parent",
      avatarUrl: avatarUrl || "",
      avatarColor: avatarColor || "#002f76",
      initials: autoInitials,
      mustChangePassword: true,
      createdAt: new Date(),
    };

    await db.collection("accounts").insertOne(accountDoc);

    // Send the welcome email with login credentials
    let emailSent = false;
    let emailWarning: string | undefined;
    try {
      await sendWelcomeEmail(
        cleanEmail,
        cleanName,
        String(childName || "").trim(),
        String(program || "").trim(),
        String(classTime || schedule || "").trim(),
        tempPassword
      );
      emailSent = true;
    } catch (emailErr: any) {
      console.error("[parents POST] Email failed (non-fatal):", emailErr.message);
      emailWarning = "Account created but the welcome email could not be sent. Please share credentials manually.";
    }

    const responsePayload: any = {
      success: true,
      id: uid,
      emailSent,
    };
    if (emailWarning) responsePayload.warning = emailWarning;

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error: any) {
    console.error("[parents POST]", error);
    return NextResponse.json({ error: error.message || "Failed to create parent account." }, { status: 500 });
  }
}

// ─── GET /api/parents?uid= — Parent fetches their own profile + albums ────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const account = await db.collection("accounts").findOne({ _id: uid as any });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Normalize role check (handle "parent" and "Parent")
    const role = String(account.role || "").toLowerCase();
    if (role !== "parent") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch this parent's photo albums by their email
    const albums = await db
      .collection("student_photo_albums")
      .find({ parentEmail: account.email })
      .sort({ createdAt: -1 })
      .toArray();

    const safeAlbums = albums.map((a) => ({
      id: a._id.toString(),
      accessCode: a.accessCode,
      childFirstName: a.childFirstName,
      childNickname: a.childNickname,
      programName: a.programName,
      classTime: a.classTime,
      sessionLabel: a.sessionLabel,
      sessionDate: a.sessionDate,
      note: a.note,
      photoCount: a.photos?.length || 0,
      expiresAt: a.expiresAt,
      createdAt: a.createdAt,
      photos: (a.photos || []).map((p: any) => ({ url: p.url, caption: p.caption })),
    }));

    // Fetch the linked student record via parent email
    const studentRecord = await db
      .collection("students")
      .findOne({ "parentInfo.email": account.email });

    const studentInfo = studentRecord
      ? {
          id: studentRecord._id.toString(),
          registrationId: studentRecord.registrationId,
          program: studentRecord.program,
          programName: studentRecord.programName,
          classTime: studentRecord.classTime,
          schedule: studentRecord.schedule,
          enrolledAt: studentRecord.enrolledAt,
          status: studentRecord.status,
          childInfo: studentRecord.childInfo,
          emergencyContact: studentRecord.emergencyContact || { name: "", relationship: "", phone: "" },
        }
      : null;

    return NextResponse.json({
      ...account,
      id: uid,
      _id: undefined,
      waiverSignature: account.waiverSignature || null,
      waiverSignedAt: account.waiverSignedAt ? new Date(account.waiverSignedAt).toISOString() : null,
      virtualSessionLink: account.virtualSessionLink || null,
      renewalLink: account.renewalLink || null,
      studentInfo,
      albums: safeAlbums,
    });
  } catch (error: any) {
    console.error("[parents GET]", error);
    return NextResponse.json({ error: "Failed to fetch parent data" }, { status: 500 });
  }
}