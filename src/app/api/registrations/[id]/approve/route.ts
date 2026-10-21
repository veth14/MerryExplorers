import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";
import { getCurrentAdventureNumber, getCurrentAdventureStartDate, getProgramAdventureSetting, getRegistrationAdventureNumber, getAdventureStartDateForNumber } from "@/lib/adventure-cycle";
import { FALLBACK_PIONEER_RATES, getRegistrationTotal, isRegistrationVerified } from "@/lib/payment-terms";
import { PROGRAM_SLOTS } from "@/data/landing";
import { pioneerEmailQuery } from "@/lib/pioneer-families";
import { isReturningFamilyRecord } from "@/lib/returning-family";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

const PROGRAM_NAMES: Record<string, string> = {
  "curious-explorer": "Discovery Club: Curious Explorer",
  "everyday-curious": "Discovery Club: Everyday Explorer",
  "creative-explorer": "Discovery Club: Creative Explorer",
  "brave-explorer": "Trailblazer: Brave Explorer",
};

const PROGRAM_SCHEDULES: Record<string, string> = {
  "curious-explorer": "Monday & Wednesday",
  "everyday-curious": "Monday – Friday",
  "creative-explorer": "Tuesday, Thursday & Friday",
  "brave-explorer": "Monday – Friday",
};

// Actual clock times for each program's class slots
const PROGRAM_CLASS_TIMES: Record<string, Record<string, string>> = {
  "curious-explorer": {
    "Morning Session": "9:45 AM – 11:00 AM",
    "Morning Class": "9:45 AM – 11:00 AM",
    "Afternoon Session": "1:30 PM – 2:45 PM",
    "Afternoon Class": "1:30 PM – 2:45 PM",
  },
  "everyday-curious": {
    "Mid-Day Session": "11:15 AM – 12:30 PM",
    "Afternoon Session": "11:15 AM – 12:30 PM",
    "Afternoon Class": "11:15 AM – 12:30 PM",
  },
  "creative-explorer": {
    "Morning Session": "9:45 AM – 11:00 AM",
    "Morning Class": "9:45 AM – 11:00 AM",
    "Mid-Day Session": "11:15 AM – 12:30 PM",
    "Mid-Day Class": "11:15 AM – 12:30 PM",
    "Afternoon Session": "1:30 PM – 2:45 PM",
    "Afternoon Class": "1:30 PM – 2:45 PM",
  },
  "brave-explorer": {
    "Afternoon Session": "3:00 PM – 4:15 PM",
    "Afternoon Class": "3:00 PM – 4:15 PM",
  },
  "saturday-playdate": {
    "Morning Session": "10:30 AM – 11:45 AM",
    "Morning Class": "10:30 AM – 11:45 AM",
  },
};

function formatClassTime(program: string, classTime: string): string {
  const time = PROGRAM_CLASS_TIMES[program]?.[classTime];
  return time ? `${classTime} (${time})` : classTime;
}

function formatStartDate(value: string | Date | null | undefined): string {
  if (!value) return "To be announced";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("en-PH", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    }).format(new Date(Date.UTC(year, month - 1, day, 12)));
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireInternalAuth(request);
  if (deny) return deny;

  const resolvedParams = await params;
  const { id } = resolvedParams;
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { actorUid, actorName, actorRole } = body;
    const resendConfirmation = body.emailAction === "resendConfirmation";

    const { db } = await connectToDatabase();

    const registration = await db
      .collection("student_registrations")
      .findOne({ _id: new ObjectId(id) });

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const inferredReturningFamily = Boolean(
      registration.isPioneer || registration.parentInfo?.isRenewal || await isReturningFamilyRecord(db, registration, id)
    );
    if (inferredReturningFamily) {
      registration.isNewFamily = false;
      registration.welcomeKitOrdered = false;
      await db.collection("student_registrations").updateOne(
        { _id: new ObjectId(id) },
        { $set: { isNewFamily: false, welcomeKitOrdered: false } }
      );
    }

    if (registration.status === "approved" && !resendConfirmation) {
      return NextResponse.json({ error: "Already approved" }, { status: 409 });
    }
    if (resendConfirmation && !isRegistrationVerified(registration.status)) {
      return NextResponse.json({ error: "Only approved registrations can receive a confirmation email." }, { status: 409 });
    }

    const settingsDoc = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
    const adventureSettings = settingsDoc?.programs || [];
    const adventureSetting = getProgramAdventureSetting(registration.program, adventureSettings);
    const adventureNumber = adventureSetting
      ? getRegistrationAdventureNumber({
          adventureNumber: registration.adventureNumber,
          period: registration.period,
          submittedAt: registration.submittedAt,
        }, registration.program, adventureSettings)
      : null;
    const adventureStartDate = registration.adventureStartDate || (
      adventureSetting
        ? getAdventureStartDateForNumber(registration.program, adventureNumber, adventureSettings)
        : null
    );

    const { childInfo, parentInfo, emergencyContact, program, classTime, uniformOrdered, lanyardOrdered } = registration;
    if (!resendConfirmation) {
      // Update status
      await db.collection("student_registrations").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "approved",
            approvedAt: new Date(),
            approvedBy: actorName || actorUid || "Admin",
            confirmationEmailSent: false,
            ...(adventureNumber !== null ? { adventureNumber, period: `adventure-${adventureNumber}` } : {}),
            ...(adventureStartDate ? { adventureStartDate } : {}),
          },
        }
      );

      // Create student profile in students collection
      await db.collection("students").insertOne({
        registrationId: id,
        childInfo,
        parentInfo,
        emergencyContact: emergencyContact || {},
        program,
        classTime,
        adventureNumber,
        adventureStartDate,
        programName: PROGRAM_NAMES[program] || program,
        schedule: PROGRAM_SCHEDULES[program] || "",
        uniformOrdered: uniformOrdered || false,
        lanyardOrdered: lanyardOrdered || false,
        photoConsent: registration.photoConsent,
        waiverSignature: registration.signatureUrl,
        waiverSignedAt: registration.submittedAt,
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
    }

    // Send confirmation email to parent
    let emailSent = false;
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });

      const prog = (PROGRAM_SLOTS as Record<string, any>)[program];
      const programName = PROGRAM_NAMES[program] || program;
      const schedule = PROGRAM_SCHEDULES[program] || "";
      const classTimeDisplay = formatClassTime(program, classTime);
      const startDateDisplay = formatStartDate(adventureStartDate);
      const parentEmail = (parentInfo?.email || "").toLowerCase().trim();
      const parentEmailRegex = new RegExp(`^${parentEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      const pioneerFamily = parentEmail
        ? await db.collection("pioneer_families").findOne(pioneerEmailQuery(parentEmail))
        : null;
      const isPioneerRegistration = Boolean(registration.isPioneer || pioneerFamily);
      const pioneerSettings = await db.collection("settings").findOne({ _key: "pioneer_settings_v1" });
      const currentPioneerRate = Number(pioneerSettings?.pioneerPrices?.[program]) || FALLBACK_PIONEER_RATES[program];
      const pricingRegistration = {
        ...registration,
        isPioneer: isPioneerRegistration,
        ...(isPioneerRegistration && currentPioneerRate ? { customRate: currentPioneerRate } : {}),
      };
      // Use the registration pricing rules so pioneer/custom rates match the
      // amount collected during registration. Preserve the legacy uniform fee.
      const totalRate =
        (getRegistrationTotal({ ...pricingRegistration, uniformOrdered: false }, prog?.rate || 0) || 0) +
        (uniformOrdered ? 650 : 0);
      const balancePaid = Array.isArray(registration.balancePayments)
        ? registration.balancePayments.reduce((sum: number, payment: any) => sum + (Number(payment.amountPaid) || 0), 0)
        : 0;
      const amountPaid = (Number(registration.amountPaid) || 0) + balancePaid;
      // previousAdventureBalance = unpaid carried over from the previous Adventure cycle (e.g. Adventure 1)
      const prevAdventureBal = typeof registration.previousAdventureBalance === "number"
        ? registration.previousAdventureBalance
        : 0;
      const sessionBalance = Math.max(0, totalRate - amountPaid);
      const totalRemaining = sessionBalance + prevAdventureBal;
      const isFullyPaid = totalRemaining <= 0;

      await transporter.sendMail({
        from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
        to: parentInfo.email,
        subject: `🎉 ${childInfo.firstName} is Officially Registered at Merry Explorers!${adventureNumber !== null ? ` (Adventure ${adventureNumber})` : ""}`,

        html: `
          <!DOCTYPE html>
          <html>
          <body style="margin: 0; padding: 0; background-color: #eaf4ff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eaf4ff; padding: 32px 16px;">
              <tr>
                <td align="center">
                  <table width="620" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 6px 20px rgba(0, 51, 160, 0.12); border: 3px solid #ffd84d;">

                    <!-- Yellow banner strip -->
                    <tr>
                      <td style="background-color: #ffd84d; padding: 14px 20px; text-align: center;">
                        <p style="margin: 0; color: #0033A0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">
                          🎉 WELCOME TO THE MERRY EXPLORERS FAMILY${adventureNumber !== null ? ` — ADVENTURE ${adventureNumber}` : ""} 🎉
                        </p>
                      </td>
                    </tr>

                    <!-- Header -->
                    <tr>
                      <td style="background-color: #0033A0; padding: 36px 20px; text-align: center;">
                        <p style="margin: 0 0 4px 0; font-size: 40px;">🎒🎈🧭</p>
                        <h1 style="color: #ffffff; margin: 0; font-size: 30px; font-weight: 800; letter-spacing: 1px;">MERRY EXPLORERS</h1>
                        <p style="color: #ffd84d; margin: 6px 0 0 0; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Playgroup and Learning Center</p>
                        <p style="color: #a3c4f3; margin: 14px 0 0 0; font-size: 15px; font-style: italic;">Dream. Discover. Explore. 🤍</p>
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td style="padding: 36px 40px 30px 40px;">

                        <p style="text-align: center; margin: 0 0 6px 0;">
                          <span style="font-size: 48px;">🎊</span>
                        </p>
                        <h2 style="color: #1e293b; font-size: 24px; margin: 0 0 4px 0; text-align: center;">Congratulations!</h2>
                        <p style="color: #0033A0; font-size: 16px; font-weight: 700; margin: 0 0 26px 0; text-align: center;">${childInfo.firstName} is officially an Explorer!</p>

                        <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 26px 0;">
                          Hi <strong>${parentInfo.name}</strong>! We're thrilled to confirm that your payment has been verified and <strong>${childInfo.firstName}</strong> is now officially registered at Merry Explorers${adventureNumber !== null ? ` for <strong>Adventure ${adventureNumber}</strong>` : ""}. 🎉
                        </p>

                        <!-- Registration details card -->
                        <div style="background-color: #f8fbff; border: 1.5px solid #dbeafe; border-radius: 16px; padding: 22px 24px; margin: 0 0 20px 0;">
                          <p style="margin: 0 0 14px 0; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">📋 Registration Details</p>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600; width: 40%;">Explorer</td><td style="padding: 6px 0; color: #0033A0; font-size: 14px; font-weight: 700;">${childInfo.firstName} ${childInfo.lastName}</td></tr>
                            ${adventureNumber !== null ? `<tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Adventure</td><td style="padding: 6px 0; color: #0033A0; font-size: 14px; font-weight: 700;">Adventure ${adventureNumber}</td></tr>` : ""}
                            <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Program</td><td style="padding: 6px 0; color: #0033A0; font-size: 14px; font-weight: 700;">${programName}</td></tr>
                            <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Class</td><td style="padding: 6px 0; color: #0033A0; font-size: 14px; font-weight: 700;">${classTimeDisplay}</td></tr>
                            <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Schedule</td><td style="padding: 6px 0; color: #0033A0; font-size: 14px; font-weight: 700;">${schedule}</td></tr>
                            <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Session Start Date</td><td style="padding: 6px 0; color: #0033A0; font-size: 14px; font-weight: 700;">${startDateDisplay}</td></tr>
                            <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Sessions</td><td style="padding: 6px 0; color: #0033A0; font-size: 14px; font-weight: 700;">${prog?.sessions || "—"} Sessions</td></tr>
                          </table>
                        </div>

                        <!-- Payment summary -->
                        <div style="background-color: #fffbea; border: 2px dashed #ffd84d; border-radius: 16px; padding: 22px 24px; margin: 0 0 20px 0;">
                          <p style="margin: 0 0 14px 0; color: #92400e; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">💰 Payment Summary</p>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr><td style="padding: 5px 0; color: #78350f; font-size: 13px;">Total Rate${isPioneerRegistration ? " · Pioneer Family Rate" : ""}</td><td style="padding: 5px 0; color: #78350f; font-size: 14px; font-weight: 700; text-align: right;">₱${totalRate.toLocaleString()}</td></tr>
                            <tr><td style="padding: 5px 0; color: #78350f; font-size: 13px;">Amount Paid</td><td style="padding: 5px 0; color: #16a34a; font-size: 14px; font-weight: 700; text-align: right;">₱${amountPaid.toLocaleString()} ✓</td></tr>
                            ${prevAdventureBal > 0 ? `<tr><td style="padding: 5px 0; color: #dc2626; font-size: 13px;">Previous Adventure Unpaid Balance</td><td style="padding: 5px 0; color: #dc2626; font-size: 14px; font-weight: 700; text-align: right;">+ ₱${prevAdventureBal.toLocaleString()}</td></tr>` : ""}
                            <tr>
                              <td style="padding: 10px 0 4px 0; color: #92400e; font-size: 13px; font-weight: 700; border-top: 1px solid #fde68a;">Remaining Balance</td>
                              <td style="padding: 10px 0 4px 0; color: ${isFullyPaid ? "#16a34a" : "#b45309"}; font-size: 15px; font-weight: 800; text-align: right; border-top: 1px solid #fde68a;">
                                ${isFullyPaid ? "₱0 (Fully Paid)" : `₱${totalRemaining.toLocaleString()}`}
                              </td>
                            </tr>
                          </table>
                          ${!isFullyPaid ? `<p style="margin: 12px 0 0 0; color: #b45309; font-size: 12px; line-height: 1.5;">⚠️ The remaining balance is due on the 6th session. A 4% weekly interest applies to overdue balances.</p>` : ""}
                        </div>

                        <!-- Uniform reminder -->
                        <div style="background-color: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 16px; padding: 20px 24px; margin: 0 0 26px 0;">
                          <p style="margin: 0 0 8px 0; color: #166534; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">👕 Uniform Reminder</p>
                          <p style="margin: 0; color: #15803d; font-size: 13px; line-height: 1.6;">Uniform days are <strong>Wednesday &amp; Friday</strong>. On all other days, children may wear anything comfortable and appropriate for active play.</p>
                          ${uniformOrdered ? `<p style="margin: 8px 0 0 0; color: #15803d; font-size: 13px;">✅ Uniform kit ordered — we'll prepare it for you!</p>` : ""}
                          ${lanyardOrdered ? `<p style="margin: 4px 0 0 0; color: #15803d; font-size: 13px;">✅ Lanyard &amp; Name Tag ordered.</p>` : ""}
                        </div>

                        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
                          We can't wait to see <strong>${childInfo.firstName}</strong> start this amazing adventure! If you have any questions, message us on Facebook. 💛
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #eaf4ff; padding: 22px 40px; text-align: center; border-top: 2px dashed #ffd84d;">
                        <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.6;">
                          <strong style="color: #0033A0;">Merry Explorers Center</strong><br>
                          📍 2nd floor, Starla 88 Bldg., Camarin Road, Caloocan — near Camarin Doctors Hospital
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
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
