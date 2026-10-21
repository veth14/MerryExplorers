import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";
import { PROGRAM_SLOTS } from "@/data/landing";
import { FALLBACK_PIONEER_RATES } from "@/lib/renewals";
import { pioneerEmailQuery } from "@/lib/pioneer-families";

export const dynamic = "force-dynamic";

// POST /api/renewals/send-email
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const {
      familyId,
      emailType, // "payment_reminder" | "slot_released" | "custom"
      customSubject,
      customMessage,
    } = body;

    if (!familyId || !ObjectId.isValid(familyId)) {
      return NextResponse.json({ error: "Invalid family ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const family = await db.collection("renewal_families").findOne({ _id: new ObjectId(familyId) });

    if (!family) {
      return NextResponse.json({ error: "Family record not found" }, { status: 404 });
    }

    if (!family.parentEmail) {
      return NextResponse.json({ error: "Family does not have a valid email address" }, { status: 400 });
    }

    if (emailType === "promo_code") {
      return NextResponse.json({ error: "Priority-code campaign emails have been retired. Send a payment reminder with the family's renewal link instead." }, { status: 410 });
    }

    // 1. Fetch linked student registration if already submitted
    let studentReg: any = null;
    if (family.registrationId) {
      try {
        studentReg = await db.collection("student_registrations").findOne({
          $or: [
            ...(ObjectId.isValid(family.registrationId) ? [{ _id: new ObjectId(family.registrationId) }] : []),
            { _id: family.registrationId as any }
          ]
        });
      } catch {
        // ignore
      }
    }
    if (!studentReg && family.parentEmail && family.childName) {
      try {
        const cleanEmail = (family.parentEmail || "").toLowerCase().trim();
        const emailRegex = new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
        const childFirst = (family.childName || "").trim().split(/\s+/)[0];
        studentReg = await db.collection("student_registrations").findOne({
          "parentInfo.email": emailRegex,
          "childInfo.firstName": new RegExp(childFirst, "i"),
        });
      } catch {
        // ignore
      }
    }

    // 2. Canonical program metadata registry
    const PROGRAM_META: Record<string, {
      slug: string;
      displayName: string;
      isAdv: boolean;
    }> = {
      "curious-explorer": {
        slug: "curious-explorer",
        displayName: "Discovery Club: Curious Explorer",
        isAdv: true,
      },
      "creative-explorer": {
        slug: "creative-explorer",
        displayName: "Discovery Club: Creative Explorer",
        isAdv: true,
      },
      "everyday-curious": {
        slug: "everyday-curious",
        displayName: "Discovery Club: Everyday Explorer",
        isAdv: true,
      },
      "brave-explorer": {
        slug: "brave-explorer",
        displayName: "Trailblazer: Brave Explorer",
        isAdv: true,
      },
      "ballet": {
        slug: "ballet",
        displayName: "Ballet",
        isAdv: false,
      },
      "saturday-playdate": {
        slug: "saturday-playdate",
        displayName: "Saturday Playdate",
        isAdv: true,
      },
      "virtual-session": {
        slug: "virtual-session",
        displayName: "Virtual Tutorial",
        isAdv: false,
      },
    };

    const resolveProgramSlug = (input?: string | null): string => {
      if (!input) return "curious-explorer";
      const s = input.toLowerCase().trim();
      if (s.includes("brave") || s.includes("trailblazer")) return "brave-explorer";
      if (s.includes("creative")) return "creative-explorer";
      if (s.includes("everyday")) return "everyday-curious";
      if (s.includes("curious")) return "curious-explorer";
      if (s.includes("ballet")) return "ballet";
      if (s.includes("playdate") || s.includes("saturday")) return "saturday-playdate";
      if (s.includes("virtual") || s.includes("tutorial")) return "virtual-session";
      return "curious-explorer";
    };

    // 3. Fetch renewal settings to dynamically populate program Adventure # and start dates
    const renewalSettingsDoc = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
    const storedPrograms: Array<{
      programKey: string;
      currentAdventure: number;
      adventureStartDate?: string | null;
      nextAdventureStart: string | null;
    }> = renewalSettingsDoc?.programs || [];

    // Match the target program (priority: student's actual registration -> renewingTo -> previousProgram)
    const targetProgramRaw = studentReg?.program || family.renewingTo || family.previousProgram || "Curious Explorer";
    const targetProgramSlug = resolveProgramSlug(targetProgramRaw);
    const meta = PROGRAM_META[targetProgramSlug] || PROGRAM_META["curious-explorer"];
    const programDefinition = (PROGRAM_SLOTS as Record<string, any>)[targetProgramSlug] || PROGRAM_SLOTS["curious-explorer"];

    const matchedProgramEntry = storedPrograms.find((p) =>
      resolveProgramSlug(p.programKey) === targetProgramSlug
    );
    const programDisplayName = matchedProgramEntry?.programKey || meta.displayName;
    const isAdvProg = meta.isAdv;

    // Adventure cycle determination:
    let advNumber = 2;
    const regPeriod = String(studentReg?.period || "");
    const regMatch = regPeriod.match(/adventure\s*[-_]?\s*(\d+)/i);
    const renewingToMatch = String(family.renewingTo || "").match(/adventure\s*[-_]?\s*(\d+)/i);
    if (regMatch) {
      advNumber = parseInt(regMatch[1], 10);
    } else if (renewingToMatch) {
      advNumber = parseInt(renewingToMatch[1], 10);
    } else if (matchedProgramEntry?.nextAdventureStart) {
      advNumber = (matchedProgramEntry.currentAdventure ?? 1) + 1;
    } else {
      advNumber = 2;
    }
    const adventureLabel = isAdvProg ? `Adventure ${advNumber}` : programDisplayName;

    const rawStartDate = matchedProgramEntry?.nextAdventureStart || matchedProgramEntry?.adventureStartDate;
    const formattedStartDate = rawStartDate
      ? new Date(rawStartDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
      : null;

    const classTime = studentReg?.classTime || "";

    // 4. Pioneer verification & Financials
    const pioneerSettingsDoc = await db.collection("settings").findOne({ _key: "pioneer_settings_v1" });
    const cleanEmail = (family.parentEmail || "").toLowerCase().trim();
    const pioneerFamily = cleanEmail
      ? await db.collection("pioneer_families").findOne(pioneerEmailQuery(cleanEmail))
      : null;
    const isPioneer = Boolean(pioneerFamily || studentReg?.isPioneer);

    const pioneerPrices: Record<string, number> = pioneerSettingsDoc?.pioneerPrices || {};
    const specificPioneerPrice = Number(pioneerPrices[targetProgramSlug]) || FALLBACK_PIONEER_RATES[targetProgramSlug] || 0;
    const hasPioneerDiscount = isPioneer && (specificPioneerPrice > 0 || Number(studentReg?.customRate) > 0);

    const totalTuition: number = hasPioneerDiscount
      ? (specificPioneerPrice || Number(studentReg?.customRate) || programDefinition.rate)
      : (Number(studentReg?.customRate) || programDefinition.rate);

    const expectedDownpayment: number = hasPioneerDiscount
      ? Math.round(totalTuition * 0.6)
      : (Number(studentReg?.amountDue) || Math.round(totalTuition * 0.6) || programDefinition.downpayment);

    const initialPaid = Number(studentReg?.amountPaid) || 0;
    const balancePaid = Array.isArray(studentReg?.balancePayments)
      ? studentReg.balancePayments.reduce((acc: number, b: any) => acc + (Number(b.amountPaid) || 0), 0)
      : 0;
    const totalPaid = initialPaid + balancePaid;
    const prevAdventureBal = typeof studentReg?.previousAdventureBalance === "number" ? studentReg.previousAdventureBalance : 0;
    const paidToPrevious = Math.min(totalPaid, prevAdventureBal);
    const appliedToCurrentSession = Math.max(0, totalPaid - paidToPrevious);
    const remainingToConfirm = Math.max(0, expectedDownpayment - appliedToCurrentSession);

    // Default configuration
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://merry-explorers.vercel.app";
    const registerUrl = `${baseUrl}/renew?ref=${family._id.toString()}`;
    const parentName = family.parentName || "Parent / Guardian";
    const childName = family.childName || "Explorer";
    const reservationDeadlineValue = studentReg?.reservedUntil || family.reservedUntil;
    const reservationDeadline = reservationDeadlineValue ? new Date(reservationDeadlineValue) : null;
    const validDeadline = reservationDeadline && !Number.isNaN(reservationDeadline.getTime()) ? reservationDeadline : null;
    const deadlineText = validDeadline
      ? validDeadline.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "long", timeStyle: "short" })
      : null;
    const futureDeadlineText = validDeadline && validDeadline > new Date() ? deadlineText : null;

    let subject = customSubject;
    let htmlContent = "";

    if (emailType === "payment_reminder") {
      const regId = studentReg?._id?.toString() || family.registrationId || "";
      const paymentUrl = regId ? `${baseUrl}/register/payment/${regId}` : `${baseUrl}/renew?ref=${family._id.toString()}`;
      subject = subject || `Payment Reminder & Slot Confirmation: ${programDisplayName} (${adventureLabel}) for ${childName} 🌈`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #002f76; padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 20px; font-weight: bold;">Merry Explorers Playgroup Learning Center</h1>
            <p style="margin: 4px 0 0; font-size: 13px; color: #ffb800; font-weight: bold;">Slot Reservation & Payment Confirmation · ${adventureLabel}</p>
          </div>
          <div style="padding: 28px;">
            <p>Dear <strong>${parentName}</strong>,</p>
            <p>Thank you for submitting your priority renewal registration for <strong>${childName}</strong>! Your slot is currently on hold under reservation.</p>

            <!-- Specific Program Details -->
            <div style="background-color: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 14px; padding: 18px 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px; font-size: 12px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">📋 Confirmed Reservation Details</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13.5px; color: #1e293b;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; width: 150px;"><strong>Explorer:</strong></td>
                  <td style="padding: 4px 0; font-weight: bold; color: #002f76;">${childName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Program:</strong></td>
                  <td style="padding: 4px 0; font-weight: bold; color: #002f76;">${programDisplayName}</td>
                </tr>
                ${classTime ? `
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Class / Session:</strong></td>
                  <td style="padding: 4px 0; font-weight: bold; color: #002f76;">${classTime}</td>
                </tr>
                ` : ""}
                ${isAdvProg ? `
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Adventure Cycle:</strong></td>
                  <td style="padding: 4px 0; font-weight: bold; color: #059669;">${adventureLabel}</td>
                </tr>
                ` : ""}
                ${formattedStartDate ? `
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>${isAdvProg ? "Adventure Starts:" : "Program Starts:"}</strong></td>
                  <td style="padding: 4px 0; font-weight: 800; color: #d97706;">🚀 ${formattedStartDate}</td>
                </tr>
                ` : ""}
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Total Tuition:</strong></td>
                  <td style="padding: 4px 0; font-weight: bold; color: #1e293b;">
                    ₱${totalTuition.toLocaleString()}
                    ${hasPioneerDiscount ? `<span style="font-size: 11px; background: #d1fae5; color: #065f46; padding: 2px 7px; border-radius: 20px; font-weight: 800; margin-left: 6px;">PIONEER FAMILY</span>` : ""}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>60% Downpayment Due:</strong></td>
                  <td style="padding: 4px 0; font-weight: 900; color: #059669; font-size: 15px;">⭐ ₱${expectedDownpayment.toLocaleString()}</td>
                </tr>
                ${totalPaid > 0 ? `
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Amount Paid:</strong></td>
                  <td style="padding: 4px 0; font-weight: bold; color: #0284c7;">₱${totalPaid.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Remaining to Confirm:</strong></td>
                  <td style="padding: 4px 0; font-weight: 900; color: #dc2626;">₱${remainingToConfirm.toLocaleString()}</td>
                </tr>
                ` : ""}
              </table>
            </div>

            <div style="background-color: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
              <p style="margin: 0; font-size: 14px; color: #1e40af; font-weight: bold;">Ready to complete your payment?</p>
              <p style="margin: 8px 0 16px; font-size: 13px; color: #3b82f6;">Click the button below to upload your payment receipt and confirm your child's slot:</p>
              <a href="${paymentUrl}" style="background-color: #0033a0; color: white; padding: 13px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">
                Proceed to Payment Page →
              </a>
            </div>

            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #92400e;">
              <p style="margin: 0 0 6px; font-weight: bold;">⚠️ IMPORTANT NOTE &amp; DISCLAIMER:</p>
              <p style="margin: 0 0 8px;">Please ensure to settle your <strong>Adventure 1 Balance</strong> before you can proceed to the registration.</p>
              <p style="margin: 0; font-style: italic;">
                "In the event that a family has unsettled balance, your downpayment for ${adventureLabel} will be credited as your balance payment for the previous cycle."
              </p>
            </div>

            ${futureDeadlineText ? `<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-top: 20px; font-size: 12.5px; color: #475569;">
              <p style="margin: 0 0 4px; font-weight: bold;">⏰ Deadline Reminder:</p>
              <p style="margin: 0;">Your reservation is held until <strong>${futureDeadlineText}</strong>.</p>
            </div>` : ""}

            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
              Need help? Feel free to approach Teacher Angel onsite, or reply directly to this email.
            </p>
            
            <p style="margin-top: 24px; font-size: 14px; color: #002f76; font-weight: bold;">
              Warm regards,<br />
              The Merry Explorers Team 💛
            </p>
          </div>
        </div>
      `;
    } else if (emailType === "slot_released") {
      const newRegUrl = `${baseUrl}/register`;
      subject = subject || `Notice of Released Slot for ${childName} ⏳`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #002f76; padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 20px; font-weight: bold;">Merry Explorers Playgroup Learning Center</h1>
            <p style="margin: 4px 0 0; font-size: 13px; color: #f59e0b; font-weight: bold;">${adventureLabel} Reservation Update</p>
          </div>
          <div style="padding: 28px;">
            <p>Dear <strong>${parentName}</strong>,</p>
            <p>We are reaching out to inform you regarding your temporary reservation for <strong>${childName}</strong> for the upcoming <strong>${adventureLabel}</strong> program.</p>

            <div style="background-color: #fef2f2; border: 1.5px solid #fecaca; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
              <p style="margin: 0; font-size: 16px; color: #991b1b; font-weight: 800;">Notice of Released Slot</p>
              <p style="margin: 8px 0 0; font-size: 13px; color: #b91c1c; line-height: 1.5;">
                ${deadlineText ? `The payment deadline of <strong>${deadlineText}</strong> has passed.` : "The payment deadline has passed."} Because payment was not received or confirmed before the cutoff, your reserved slot has now been <strong>released</strong> to waitlisted families.
              </p>
            </div>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 20px 0; font-size: 13px;">
              <p style="margin: 0 0 8px; font-weight: bold; color: #002f76;">Would you still like ${childName} to join us for ${adventureLabel}?</p>
              <p style="margin: 0 0 16px; color: #475569;">
                Families who miss the payment deadline and still wish to secure a slot must submit a <strong>new registration form</strong> through our standard registration portal, subject to remaining program availability.
              </p>
              <p style="text-align: center; margin: 0;">
                <a href="${newRegUrl}" style="background-color: #0033a0; color: white; padding: 13px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">
                  Submit New Registration Form →
                </a>
              </p>
            </div>

            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px; margin: 20px 0; font-size: 12.5px; color: #92400e;">
              <p style="margin: 0 0 4px; font-weight: bold;">⚠️ Reminder for Account Balances:</p>
              <p style="margin: 0;">
                If you have an unsettled account balance from a previous cycle, please remember that any new downpayments will be credited toward outstanding balances first.
              </p>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
              If you have any questions or have already made a payment that needs verification, please reach out to Teacher Angel immediately, or reply directly to this email.
            </p>
            
            <p style="margin-top: 24px; font-size: 14px; color: #002f76; font-weight: bold;">
              Warm regards,<br />
              The Merry Explorers Team 💛
            </p>
          </div>
        </div>
      `;
    } else {
      subject = subject || `Merry Explorers: Message regarding ${childName}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; padding: 28px;">
          <h2 style="color: #002f76;">Merry Explorers Update</h2>
          <p>Dear ${parentName},</p>
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; margin: 16px 0;">
            ${(customMessage || "").replace(/\n/g, "<br />")}
          </div>
          <p>Warm regards,<br />The Merry Explorers Team 💛</p>
        </div>
      `;
    }

    // Configure transporter
    const auth = process.env.GMAIL_CLIENT_ID
      ? {
        type: "OAuth2",
        user: "merryexplorerscenter@gmail.com",
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      }
      : {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      };

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: auth as any,
    });

    await transporter.sendMail({
      from: `"Merry Explorers" <merryexplorerscenter@gmail.com>`,
      to: family.parentEmail,
      subject,
      html: htmlContent,
    });

    const emailRecord = {
      type: emailType,
      subject,
      sentAt: new Date(),
      sentBy: "Admin",
      recipient: family.parentEmail,
    };

    // Update email log in family record
    await db.collection("renewal_families").updateOne(
      { _id: new ObjectId(familyId) },
      {
        $set: {
          lastEmailSent: emailType === "payment_reminder"
              ? "Payment Reminder Sent"
              : emailType === "slot_released"
                ? "Slot Released Notice Sent"
                : "Message Sent",
          lastEmailDate: new Date(),
          updatedAt: new Date(),
        },
        $push: {
          emailHistory: emailRecord as any,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Email successfully sent to ${family.parentEmail}!`,
    });
  } catch (error: any) {
    console.error("[send-email POST]", error);
    return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
  }
}
