import { NextResponse } from "next/server";
import { ObjectId } from "mongodb"; // NEW
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { v2 as cloudinary } from "cloudinary";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET /api/registrations — Admin only, lists all registrations
export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { db } = await connectToDatabase();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    const query = status && status !== "all" ? { status } : {};
    const registrations = await db
      .collection("student_registrations")
      .find(query)
      .sort({ submittedAt: -1 })
      .toArray();

    const formatted = registrations.map((r) => ({
      ...r,
      id: r._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("[registrations GET]", error);
    return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 500 });
  }
}

// POST /api/registrations — Public, submit new registration
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      program,
      classTime,
      parentInfo,
      childInfo,
      emergencyContact,
      paymentMethod,
      receiptBase64,
      photoConsent,
      signatureBase64,
      uniformOrdered,
      lanyardOrdered,
      welcomeKitOrdered,
      paymentType,
      amountDue,
      amountPaid,
      creditBalance,
      referenceNumber,
      leadId, // NEW — sent by the register page after the Details step
      promoCode,
      isPromoRegistration,
    } = data;

    // Validate required fields
    if (!program || !classTime || !parentInfo?.email || !parentInfo?.name || !childInfo?.firstName || (program !== "brave-explorer" && !signatureBase64)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Payment receipt upload has been moved to the second step of the flow.
    let receiptUrl = "";
    let receiptPublicId = "";

    // Upload signature to Cloudinary
    let signatureUrl = "";
    let signaturePublicId = "";
    if (signatureBase64) {
      try {
        const uploadResult = await cloudinary.uploader.upload(signatureBase64, {
          folder: "merry_explorers_signatures",
          resource_type: "image",
        });
        signatureUrl = uploadResult.secure_url;
        signaturePublicId = uploadResult.public_id;
      } catch (err: any) {
        console.error("[registrations POST] Cloudinary signature upload failed:", err);
        return NextResponse.json({ error: "Failed to upload signature. Please try again." }, { status: 500 });
      }
    }


    const { db } = await connectToDatabase();

    // Check slot availability
    const programConfig = {
      "curious-explorer": { classes: { "Morning Class": 4, "Afternoon Class": 4 } },
      "everyday-curious": { classes: { "Afternoon Class": 5 } },
      "creative-explorer": { classes: { "Morning Class": 5, "Mid-Day Class": 5, "Afternoon Class": 5 } },
      "brave-explorer": { classes: { "Afternoon Class": 6 } },
    } as Record<string, { classes: Record<string, number> }>;

    // Adventure 2 start — only count registrations from this cycle onward
    const ADVENTURE_2_START = new Date("2026-10-12T00:00:00+08:00");

    const maxSlots = programConfig[program]?.classes[classTime];
    if (maxSlots !== undefined) {
      const takenSlots = await db.collection("student_registrations").countDocuments({
        program,
        classTime,
        status: { $in: ["pending", "approved", "reserved"] },
        submittedAt: { $gte: ADVENTURE_2_START },
      });
      if (takenSlots >= maxSlots) {
        return NextResponse.json({ error: `Sorry, ${classTime} for this program is now full.` }, { status: 409 });
      }
    }

    const isPromo = Boolean(isPromoRegistration && promoCode === "A1RENEWAL2026");
    // All unpaid slots as of October 16, 1:00 PM will be released for promo reservations; standard reservations get 1 hour
    const reservedUntil = isPromo
      ? new Date("2026-10-16T13:00:00+08:00")
      : new Date(Date.now() + 60 * 60 * 1000);

    // Auto-detect pioneer status if not explicitly passed
    let isPioneer = Boolean(data.isPioneer);
    let customRate = data.customRate ? Number(data.customRate) : undefined;
    const parentEmailClean = (parentInfo?.email || "").toLowerCase().trim();
    if (!isPioneer && parentEmailClean) {
      const pioneerCheck = await db.collection("pioneer_families").findOne({
        $or: [
          { email: parentEmailClean },
          { email: { $regex: new RegExp(`^${parentEmailClean.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, "i") } },
        ],
      });
      if (pioneerCheck) {
        isPioneer = true;
        if (!customRate) {
          const pioneerSettingsDoc = await db.collection("settings").findOne({ _key: "pioneer_settings_v1" });
          if (pioneerSettingsDoc?.pioneerPrices?.[program]) {
            customRate = pioneerSettingsDoc.pioneerPrices[program];
          } else if (pioneerSettingsDoc?.pioneerPrice) {
            customRate = pioneerSettingsDoc.pioneerPrice;
          }
        }
      }
    }

    const newRegistration = {
      status: "reserved",
      reservedUntil,
      program,
      classTime,
      parentInfo,
      childInfo,
      emergencyContact: emergencyContact || {},
      paymentMethod: paymentMethod || "",
      paymentType: paymentType || "downpayment",
      amountDue: amountDue || 0,
      amountPaid: amountPaid || 0,
      creditBalance: creditBalance || 0,
      referenceNumber: referenceNumber || "",
      receiptUrl: "", // Uploaded in next step
      receiptPublicId: "", // Uploaded in next step
      signatureUrl,
      signaturePublicId,
      photoConsent,
      uniformOrdered: uniformOrdered || false,
      lanyardOrdered: lanyardOrdered || false,
      welcomeKitOrdered: welcomeKitOrdered || false,
      isNewFamily: typeof data.isNewFamily === "boolean" ? data.isNewFamily : true,
      isPioneer,
      customRate: customRate || null,
      notes: isPromo ? "Reserved via promo code A1RENEWAL2026 (Unpaid slot holds until Oct 16, 1:00 PM)" : "",
      submittedAt: new Date(),
      period: "adventure-2",
      approvedAt: null,
      approvedBy: null,
      confirmationEmailSent: false,
      leadId: leadId || null,
      promoCode: isPromo ? promoCode : null,
      isPromoRegistration: isPromo,
    };

    const result = await db.collection("student_registrations").insertOne(newRegistration);

    // NEW — mark the lead as converted. Never block the registration if this fails.
    if (leadId && ObjectId.isValid(leadId)) {
      try {
        await db.collection("leads").updateOne(
          { _id: new ObjectId(leadId) },
          {
            $set: {
              status: "converted",
              registrationId: result.insertedId.toString(),
              program,
              classTime,
              updatedAt: new Date(),
            },
          }
        );
      } catch (err) {
        console.error("[registrations POST] Failed to mark lead as converted:", err);
      }
    }

    // Match against renewal_families list (Task 5: Auto-match email + child's name)
    try {
      const parentEmailClean = (parentInfo?.email || "").toLowerCase().trim();
      const childNameClean = `${childInfo?.firstName || ""} ${childInfo?.lastName || ""}`.trim();
      if (parentEmailClean && childNameClean) {
        const familyMatch = await db.collection("renewal_families").findOne({
          parentEmail: parentEmailClean,
          childName: { $regex: new RegExp(`^${childNameClean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        });

        if (familyMatch) {
          await db.collection("renewal_families").updateOne(
            { _id: familyMatch._id },
            {
              $set: {
                renewalStatus: isPromo ? "reserved" : (amountPaid > 0 ? "confirmed" : "reserved"),
                registrationId: result.insertedId.toString(),
                updatedAt: new Date(),
              },
            }
          );
        } else {
          // Flag registration as unmatched so admin can review and link
          await db.collection("student_registrations").updateOne(
            { _id: result.insertedId },
            { $set: { unmatchedFamily: true } }
          );
        }
      }
    } catch (familyMatchErr) {
      console.error("[registrations POST] Failed to match renewal family:", familyMatchErr);
    }

    // Send instant confirmation and payment reminder email to returning / reserving families
    if (parentInfo?.email) {
      try {
        // Fetch program configuration & adventure start date
        const renewalSettingsDoc = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
        const storedPrograms: Array<{ programKey: string; currentAdventure: number; nextAdventureStart: string | null }> = renewalSettingsDoc?.programs || [];
        
        const programKeyMap: Record<string, string> = {
          "curious-explorer": "Discovery Club: Curious Explorer",
          "creative-explorer": "Discovery Club: Creative Explorer",
          "everyday-curious": "Discovery Club: Everyday Curious",
          "brave-explorer": "Trailblazer: Brave Explorer",
          "ballet": "Ballet",
          "saturday-playdate": "Saturday Playdate",
        };

        const readableProgramName = programKeyMap[program] || program;
        const matchedProg = storedPrograms.find((p) =>
          p.programKey.toLowerCase().includes(readableProgramName.toLowerCase()) ||
          readableProgramName.toLowerCase().includes(p.programKey.toLowerCase())
        ) || storedPrograms[0];

        const advNum = matchedProg?.currentAdventure ?? 2;
        const advLabel = `Adventure ${advNum}`;
        const advStartDateStr = matchedProg?.nextAdventureStart
          ? new Date(matchedProg.nextAdventureStart).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
          : null;

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

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://merry-explorers.vercel.app";
        const paymentUrl = `${baseUrl}/register/payment/${result.insertedId.toString()}`;
        const parentName = parentInfo.name || "Parent / Guardian";
        const childName = childInfo?.firstName || "Explorer";

        await transporter.sendMail({
          from: `"Merry Explorers" <merryexplorerscenter@gmail.com>`,
          to: parentInfo.email,
          subject: `Payment Reminder & Slot Confirmation: ${readableProgramName} (${advLabel}) for ${childName} 🌈`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
              <div style="background-color: #002f76; padding: 24px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 20px; font-weight: bold;">Merry Explorers Playgroup Learning Center</h1>
                <p style="margin: 4px 0 0; font-size: 13px; color: #ffb800; font-weight: bold;">Slot Reservation & Payment Confirmation · ${advLabel}</p>
              </div>
              <div style="padding: 28px;">
                <p>Dear <strong>${parentName}</strong>,</p>
                <p>Thank you for submitting your renewal registration for <strong>${childName}</strong>! Your slot has been received and is currently held on reservation.</p>

                <!-- Specific Program & Schedule Details Box -->
                <div style="background-color: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 14px; padding: 18px 20px; margin: 20px 0;">
                  <p style="margin: 0 0 10px; font-size: 12px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">📋 Confirmed Renewal Details</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13.5px; color: #1e293b;">
                    <tr>
                      <td style="padding: 4px 0; color: #64748b; width: 140px;"><strong>Explorer:</strong></td>
                      <td style="padding: 4px 0; font-weight: bold; color: #002f76;">${childName} ${childInfo?.lastName || ""}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #64748b;"><strong>Program:</strong></td>
                      <td style="padding: 4px 0; font-weight: bold; color: #002f76;">${readableProgramName}</td>
                    </tr>
                    ${classTime ? `
                    <tr>
                      <td style="padding: 4px 0; color: #64748b;"><strong>Class / Session:</strong></td>
                      <td style="padding: 4px 0; font-weight: bold; color: #002f76;">${classTime}</td>
                    </tr>
                    ` : ""}
                    <tr>
                      <td style="padding: 4px 0; color: #64748b;"><strong>Adventure Cycle:</strong></td>
                      <td style="padding: 4px 0; font-weight: bold; color: #059669;">${advLabel}</td>
                    </tr>
                    ${advStartDateStr ? `
                    <tr>
                      <td style="padding: 4px 0; color: #64748b;"><strong>Adventure Starts:</strong></td>
                      <td style="padding: 4px 0; font-weight: 800; color: #d97706;">🚀 ${advStartDateStr}</td>
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
                    "In the event that a family has unsettled balance, your downpayment for ${advLabel} will be credited as your balance payment for the previous cycle."
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
          `,
        });
      } catch (emailErr) {
        console.error("[registrations POST] Failed to send instant payment reminder email:", emailErr);
      }
    }

    return NextResponse.json({ success: true, data: { id: result.insertedId.toString() } });
  } catch (error: any) {
    console.error("[registrations POST]", error);
    return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
  }
}