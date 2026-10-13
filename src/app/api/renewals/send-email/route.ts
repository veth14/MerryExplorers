import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

// POST /api/renewals/send-email
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      familyId,
      emailType, // "promo_code" | "payment_reminder" | "announcement"
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

    // Fetch renewal settings to dynamically populate program Adventure # and start dates
    const renewalSettingsDoc = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
    const storedPrograms: Array<{ programKey: string; currentAdventure: number; nextAdventureStart: string | null }> = renewalSettingsDoc?.programs || [];

    // Match the family's renewingTo or previousProgram
    const targetProgramName = family.renewingTo || family.previousProgram || "Curious Explorer";
    const matchedProgramEntry = storedPrograms.find((p) =>
      p.programKey.toLowerCase().includes(targetProgramName.toLowerCase()) ||
      targetProgramName.toLowerCase().includes(p.programKey.toLowerCase())
    ) || storedPrograms[0];

    const targetProgramKey = (targetProgramName || "").toLowerCase().includes("creative")
      ? "creative-explorer"
      : "curious-explorer";

    // Fetch pioneer settings + check if this family is a pioneer
    const pioneerSettingsDoc = await db.collection("settings").findOne({ _key: "pioneer_settings_v1" });
    const cleanEmail = (family.parentEmail || "").toLowerCase().trim();
    const pioneerFamily = await db.collection("pioneer_families").findOne({
      $or: [
        { email: cleanEmail },
        { email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, "i") } }
      ]
    });
    const isPioneer = !!pioneerFamily;
    const resolvedPioneerPrice: number | null =
      pioneerSettingsDoc?.pioneerPrices?.[targetProgramKey] ??
      pioneerSettingsDoc?.pioneerPrice ??
      null;
    const displayPrice = isPioneer && resolvedPioneerPrice ? resolvedPioneerPrice : null;

    const currentAdventureNum = matchedProgramEntry?.currentAdventure ?? 2;
    const adventureLabel = `Adventure ${currentAdventureNum}`;
    const formattedStartDate = matchedProgramEntry?.nextAdventureStart
      ? new Date(matchedProgramEntry.nextAdventureStart).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
      : null;
    const programDisplayName = matchedProgramEntry?.programKey || targetProgramName;

    // Default configuration
    const promoCode = "A1RENEWAL2026";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://merry-explorers.vercel.app";
    const registerUrl = `${baseUrl}/renew?ref=${family._id.toString()}`;
    const parentName = family.parentName || "Parent / Guardian";
    const childName = family.childName || "Explorer";

    let subject = customSubject;
    let htmlContent = "";

    if (emailType === "promo_code") {
      subject = subject || `Priority Renewal: ${programDisplayName} (${adventureLabel}) for ${childName} 🌈`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #002f76; padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 20px; font-weight: bold;">Merry Explorers Playgroup Learning Center</h1>
            <p style="margin: 4px 0 0; font-size: 13px; color: #ffb800; font-weight: bold;">Priority Renewal Access · ${adventureLabel}</p>
          </div>
          <div style="padding: 28px;">
            <p>Dear <strong>${parentName}</strong>,</p>
            <p>We are thrilled to welcome back <strong>${childName}</strong> for <strong>${adventureLabel}</strong>!</p>
            
            <!-- Specific Renewal Program & Schedule Details Box -->
            <div style="background-color: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 14px; padding: 18px 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px; font-size: 12px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">📋 Program & Schedule Information</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13.5px; color: #1e293b;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; width: 140px;"><strong>Explorer:</strong></td>
                  <td style="padding: 4px 0; font-weight: bold; color: #002f76;">${childName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Program:</strong></td>
                  <td style="padding: 4px 0; font-weight: bold; color: #002f76;">${programDisplayName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Adventure Cycle:</strong></td>
                  <td style="padding: 4px 0; font-weight: bold; color: #059669;">${adventureLabel}</td>
                </tr>
                ${formattedStartDate ? `
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Adventure Starts:</strong></td>
                  <td style="padding: 4px 0; font-weight: 800; color: #ffb800;">🚀 ${formattedStartDate}</td>
                </tr>
                ` : ""}
                ${displayPrice ? `
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Your Price:</strong></td>
                  <td style="padding: 4px 0; font-weight: 900; color: #059669;">⭐ ₱${displayPrice.toLocaleString()} <span style="font-size: 11px; background: #d1fae5; color: #065f46; padding: 2px 7px; border-radius: 20px; font-weight: 800;">PIONEER FAMILY</span></td>
                </tr>
                ` : ""}
              </table>
            </div>

            <p>As a valued returning family, you have priority access to reserve your slot before general registration opens:</p>
            
            <div style="background-color: #f8fafc; border: 2px dashed #0033a0; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
              <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: bold;">Your Priority Reservation Code</p>
              <p style="margin: 6px 0 0; font-size: 26px; font-family: monospace; font-weight: 900; color: #002f76; letter-spacing: 2px;">${promoCode}</p>
            </div>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${registerUrl}" style="background-color: #0033a0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">
                Complete Renewal Registration Form →
              </a>
            </p>

            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-top: 24px; font-size: 13px; color: #92400e;">
              <p style="margin: 0 0 8px; font-weight: bold;">⚠️ Key Reminders Regarding Your Reservation:</p>
              <ul style="margin: 0 0 12px; padding-left: 20px;">
                <li>This code is <strong>not a discount voucher</strong>. It holds your child's slot without upfront payment today.</li>
                <li><strong>Code validity:</strong> Valid only until <strong>October 15, 2026</strong>.</li>
                <li><strong>Slot release policy:</strong> All unpaid slots as of <strong>October 16, 2026 at 1:00 PM</strong> will be released.</li>
                <li><strong>Confirmation:</strong> Your slot is officially confirmed upon receipt of the 60% non-refundable downpayment.</li>
              </ul>
              <div style="border-top: 1px dashed #fcd34d; padding-top: 10px; margin-top: 10px;">
                <p style="margin: 0 0 4px; font-weight: bold; color: #b45309;">⚠️ NOTE &amp; DISCLAIMER:</p>
                <p style="margin: 0 0 6px;">Please ensure to settle your <strong>Adventure 1 Balance</strong> before you can proceed to the registration.</p>
                <p style="margin: 0; font-style: italic; color: #78350f;">
                  "In the event that a family has unsettled balance, your downpayment for ${adventureLabel} will be credited as your balance payment for the previous cycle."
                </p>
              </div>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
              If you have any questions about schedules or need help accessing the form, feel free to approach Teacher Angel onsite, or reply directly to this email.
            </p>
            
            <p style="margin-top: 24px; font-size: 14px; color: #002f76; font-weight: bold;">
              Warm regards,<br />
              The Merry Explorers Team 💛
            </p>
          </div>
        </div>
      `;
    } else if (emailType === "payment_reminder") {
      const regId = family.registrationId || "";
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
                  <td style="padding: 4px 0; color: #64748b; width: 140px;"><strong>Explorer:</strong></td>
                  <td style="padding: 4px 0; font-weight: bold; color: #002f76;">${childName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Program:</strong></td>
                  <td style="padding: 4px 0; font-weight: bold; color: #002f76;">${programDisplayName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Adventure Cycle:</strong></td>
                  <td style="padding: 4px 0; font-weight: bold; color: #059669;">${adventureLabel}</td>
                </tr>
                ${formattedStartDate ? `
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Adventure Starts:</strong></td>
                  <td style="padding: 4px 0; font-weight: 800; color: #d97706;">🚀 ${formattedStartDate}</td>
                </tr>
                ` : ""}
                ${displayPrice ? `
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Your Price:</strong></td>
                  <td style="padding: 4px 0; font-weight: 900; color: #059669;">⭐ ₱${displayPrice.toLocaleString()} <span style="font-size: 11px; background: #d1fae5; color: #065f46; padding: 2px 7px; border-radius: 20px; font-weight: 800;">PIONEER FAMILY</span></td>
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

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-top: 20px; font-size: 12.5px; color: #475569;">
              <p style="margin: 0 0 4px; font-weight: bold;">⏰ Deadline Reminder:</p>
              <p style="margin: 0;">Unpaid reservations will be held until <strong>October 16, 2026 at 1:00 PM</strong>, after which unpaid slots will be released to the waitlist.</p>
            </div>

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
      subject = subject || `Notice of Released Slot: Priority Reservation Expired for ${childName} ⏳`;
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
                As of <strong>October 16, 2026 at 1:00 PM</strong>, our priority reservation payment deadline has officially closed. Because payment was not received or confirmed before the cutoff, your reserved slot has now been <strong>released</strong> to waitlisted families.
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
          lastEmailSent: emailType === "promo_code"
            ? "Promo Code Email Sent"
            : emailType === "payment_reminder"
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
