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

    // Default configuration
    const promoCode = "A1RENEWAL2026";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://merry-explorers.vercel.app";
    const registerUrl = `${baseUrl}/renew?ref=${family._id.toString()}`;
    const parentName = family.parentName || "Parent / Guardian";
    const childName = family.childName || "Explorer";

    let subject = customSubject;
    let htmlContent = "";

    if (emailType === "promo_code") {
      subject = subject || `Priority Renewal & Slot Reservation Code for ${childName} 🌈`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #002f76; padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 20px; font-weight: bold;">Merry Explorers Playgroup Learning Center</h1>
            <p style="margin: 4px 0 0; font-size: 13px; color: #ffb800; font-weight: bold;">Priority Renewal Access</p>
          </div>
          <div style="padding: 28px;">
            <p>Dear <strong>${parentName}</strong>,</p>
            <p>We are excited to welcome back <strong>${childName}</strong> for our upcoming adventure!</p>
            <p>As a valued returning family, you have priority access to reserve your slot before general registration:</p>
            
            <div style="background-color: #f8fafc; border: 2px dashed #0033a0; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
              <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: bold;">Your Priority Reservation Code</p>
              <p style="margin: 6px 0 0; font-size: 26px; font-family: monospace; font-weight: 900; color: #002f76; letter-spacing: 2px;">${promoCode}</p>
            </div>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${registerUrl}" style="background-color: #0033a0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">
                Complete Registration Form →
              </a>
            </p>

            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-top: 24px; font-size: 13px; color: #92400e;">
              <p style="margin: 0 0 8px; font-weight: bold;">⚠️ Key Reminders Regarding Your Reservation:</p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>This code is <strong>not a discount voucher</strong>. It reserves your child's slot without upfront payment today.</li>
                <li><strong>Code validity:</strong> Valid only until <strong>October 15, 2026</strong>.</li>
                <li><strong>Slot release policy:</strong> All unpaid slots as of <strong>October 16, 2026 at 1:00 PM</strong> will be released.</li>
                <li><strong>Confirmation:</strong> Your slot is officially confirmed upon receipt of the 60% non-refundable downpayment.</li>
              </ul>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
              If you have any questions about schedules or need help accessing the form, feel free to approach Teacher Kyle or Teacher Angel onsite, or reply directly to this email.
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
          lastEmailSent: emailType === "promo_code" ? "Promo Code Email Sent" : "Message Sent",
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
