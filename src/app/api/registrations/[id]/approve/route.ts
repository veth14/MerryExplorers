import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

const PROGRAM_NAMES: Record<string, string> = {
  "curious-explorer": "Discovery Club: Curious Explorer",
  "creative-explorer": "Discovery Club: Creative Explorer",
  "brave-explorer": "Trailblazer: Brave Explorer",
};

const PROGRAM_SCHEDULES: Record<string, string> = {
  "curious-explorer": "Monday & Wednesday",
  "creative-explorer": "Tuesday, Thursday & Friday",
  "brave-explorer": "Monday – Friday",
};

const PROGRAM_RATES: Record<string, { rate: number; downpayment: number; balance: number; sessions: number }> = {
  "curious-explorer": { rate: 4395, downpayment: 2637, balance: 1758, sessions: 8 },
  "creative-explorer": { rate: 4985, downpayment: 2991, balance: 1994, sessions: 12 },
  "brave-explorer": { rate: 6900, downpayment: 4140, balance: 2760, sessions: 18 },
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  const resolvedParams = await params;
  const { id } = resolvedParams;
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { actorUid, actorName, actorRole } = body;

    const { db } = await connectToDatabase();

    const registration = await db
      .collection("student_registrations")
      .findOne({ _id: new ObjectId(id) });

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    if (registration.status === "approved") {
      return NextResponse.json({ error: "Already approved" }, { status: 409 });
    }

    // Update status
    await db.collection("student_registrations").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "approved",
          approvedAt: new Date(),
          approvedBy: actorName || actorUid || "Admin",
          confirmationEmailSent: false,
        },
      }
    );

    // Create student profile in students collection
    const { childInfo, parentInfo, emergencyContact, program, classTime, uniformOrdered, lanyardOrdered } = registration;
    await db.collection("students").insertOne({
      registrationId: id,
      childInfo,
      parentInfo,
      emergencyContact: emergencyContact || {},
      program,
      classTime,
      programName: PROGRAM_NAMES[program] || program,
      schedule: PROGRAM_SCHEDULES[program] || "",
      uniformOrdered: uniformOrdered || false,
      lanyardOrdered: lanyardOrdered || false,
      enrolledAt: new Date(),
      status: "active",
    });

    // Audit log
    if (actorUid) {
      await db.collection("audit_log").insertOne({
        actorUid,
        actorName: actorName || "Unknown",
        actorRole: actorRole || "Unknown",
        action: "APPROVE",
        category: "registration",
        targetId: id,
        details: `Approved registration for ${childInfo?.firstName} ${childInfo?.lastName}`,
        createdAt: new Date(),
      });
    }

    // Send confirmation email to parent
    let emailSent = false;
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });

      const prog = PROGRAM_RATES[program];
      const programName = PROGRAM_NAMES[program] || program;
      const schedule = PROGRAM_SCHEDULES[program] || "";

      await transporter.sendMail({
        from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
        to: parentInfo.email,
        subject: `🎉 ${childInfo.firstName} is Officially Enrolled at Merry Explorers!`,
        html: `
          <div style="font-family:'Segoe UI',sans-serif;max-width:620px;margin:0 auto;background:#f0f8ff;padding:0;border-radius:24px;overflow:hidden;border:2px solid #dde8ff;">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#0033A0,#0066CC);padding:36px 30px;text-align:center;">
              <h1 style="color:white;font-size:30px;margin:0;">Merry Explorers 🌟</h1>
              <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Play • Learn • Grow</p>
            </div>
            <!-- Body -->
            <div style="padding:32px 30px;">
              <div style="text-align:center;margin-bottom:24px;">
                <div style="font-size:56px;margin-bottom:8px;">🎒</div>
                <h2 style="color:#002f76;font-size:26px;margin:0;">Congratulations!</h2>
                <p style="color:#0066CC;font-size:16px;margin:8px 0 0;font-weight:600;">${childInfo.firstName} is officially an Explorer!</p>
              </div>

              <p style="color:#334155;line-height:1.8;margin-bottom:20px;">
                Hi <strong>${parentInfo.name}</strong>! We're thrilled to confirm that your payment has been verified and <strong>${childInfo.firstName}</strong> is now officially enrolled at Merry Explorers. 🎉
              </p>

              <!-- Enrollment Card -->
              <div style="background:white;border-radius:16px;padding:24px;margin:20px 0;border:1.5px solid #dde8ff;">
                <p style="margin:0 0 16px;color:#64748b;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;">Enrollment Details</p>
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:600;width:40%;">Explorer</td><td style="padding:8px 0;color:#002f76;font-size:14px;font-weight:700;">${childInfo.firstName} ${childInfo.lastName}</td></tr>
                  <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:600;">Program</td><td style="padding:8px 0;color:#002f76;font-size:14px;font-weight:700;">${programName}</td></tr>
                  <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:600;">Class</td><td style="padding:8px 0;color:#002f76;font-size:14px;font-weight:700;">${classTime}</td></tr>
                  <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:600;">Schedule</td><td style="padding:8px 0;color:#002f76;font-size:14px;font-weight:700;">${schedule}</td></tr>
                  <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:600;">Sessions</td><td style="padding:8px 0;color:#002f76;font-size:14px;font-weight:700;">${prog?.sessions || "—"} Sessions</td></tr>
                </table>
              </div>

              <!-- Payment Summary -->
              <div style="background:#fffbeb;border-radius:16px;padding:24px;margin:20px 0;border:1.5px solid #fde68a;">
                <p style="margin:0 0 16px;color:#92400e;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;">Payment Summary</p>
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:6px 0;color:#78350f;font-size:13px;">Total Rate</td><td style="padding:6px 0;color:#78350f;font-size:14px;font-weight:700;text-align:right;">₱${((prog?.rate || 0) + (uniformOrdered ? 650 : 0)).toLocaleString()}</td></tr>
                  <tr><td style="padding:6px 0;color:#78350f;font-size:13px;">Amount Paid</td><td style="padding:6px 0;color:#16a34a;font-size:14px;font-weight:700;text-align:right;">₱${(registration.amountPaid || 0).toLocaleString()} ✓</td></tr>
                  <tr style="border-top:1px solid #fde68a;">
                    <td style="padding:10px 0 6px;color:#92400e;font-size:13px;font-weight:700;">Remaining Balance</td>
                    <td style="padding:10px 0 6px;color:${((prog?.rate || 0) + (uniformOrdered ? 650 : 0) - (registration.amountPaid || 0)) > 0 ? '#b45309' : '#16a34a'};font-size:15px;font-weight:800;text-align:right;">
                      ${((prog?.rate || 0) + (uniformOrdered ? 650 : 0) - (registration.amountPaid || 0)) > 0 
                        ? `₱${((prog?.rate || 0) + (uniformOrdered ? 650 : 0) - (registration.amountPaid || 0)).toLocaleString()}` 
                        : "₱0 (Fully Paid)"}
                    </td>
                  </tr>
                </table>
                ${((prog?.rate || 0) + (uniformOrdered ? 650 : 0) - (registration.amountPaid || 0)) > 0 
                  ? `<p style="margin:12px 0 0;color:#b45309;font-size:12px;">⚠️ The remaining balance is due on the 6th session. A 4% weekly interest applies to overdue balances.</p>` 
                  : ""}
              </div>

              <!-- Uniform Reminder -->
              <div style="background:#f0fdf4;border-radius:16px;padding:20px;margin:20px 0;border:1.5px solid #bbf7d0;">
                <p style="margin:0 0 8px;color:#166534;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;">👕 Uniform Reminder</p>
                <p style="margin:0;color:#15803d;font-size:13px;line-height:1.7;">Uniform days are <strong>Wednesday & Friday</strong>. On all other days, children may wear anything comfortable and appropriate for active play.</p>
                ${uniformOrdered ? `<p style="margin:8px 0 0;color:#15803d;font-size:13px;">✅ Uniform kit ordered — we'll prepare it for you!</p>` : ""}
                ${lanyardOrdered ? `<p style="margin:4px 0 0;color:#15803d;font-size:13px;">✅ Lanyard & Name Tag ordered.</p>` : ""}
              </div>

              <p style="color:#334155;line-height:1.8;margin-top:24px;">We can't wait to see <strong>${childInfo.firstName}</strong> start this amazing adventure! If you have any questions, message us on Facebook. 💛</p>
            </div>
            <!-- Footer -->
            <div style="background:#f8faff;padding:20px 30px;text-align:center;border-top:1px solid #dde8ff;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">Merry Explorers • 2nd floor, Starla 88 Bldg., Camarin Road, Caloocan — near Camarin Doctors Hospital</p>
            </div>
          </div>
        `,
      });
      emailSent = true;

      await db.collection("student_registrations").updateOne(
        { _id: new ObjectId(id) },
        { $set: { confirmationEmailSent: true } }
      );
    } catch (emailErr) {
      console.warn("[approve] Failed to send confirmation email:", emailErr);
    }

    return NextResponse.json({ success: true, emailSent });
  } catch (error: any) {
    console.error("[approve POST]", error);
    return NextResponse.json({ error: error.message || "Failed to approve" }, { status: 500 });
  }
}
