import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { v2 as cloudinary } from "cloudinary";
import nodemailer from "nodemailer";
import { allocateBalancePayment } from "@/lib/balance-payment";
import { calcRegistrationTerms, FALLBACK_PIONEER_RATES, getManilaTodayIso, getRegistrationAdventureStart, getRegistrationTotal, getStudentSessionInfo, isRegistrationVerified } from "@/lib/payment-terms";
import { pioneerEmailQuery } from "@/lib/pioneer-families";

export const dynamic = "force-dynamic";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
    }

    const data = await request.json();
    const {
      paymentMethod,
      receiptBase64,
      uniformOrdered,
      lanyardOrdered,
      welcomeKitOrdered,
      recitalKitOrdered,
      isNewFamily,
      paymentType,
      amountDue,
      amountPaid,
      creditBalance,
      referenceNumber,
    } = data;

    if (!paymentMethod || !receiptBase64) {
      return NextResponse.json({ error: "Missing required payment fields" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Check if registration exists and is still reserved
    const registration = await db.collection("student_registrations").findOne({
      _id: new ObjectId(id)
    });

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    if (data.balancePayment === true) {
      if (!["approved", "active"].includes(registration.status)) {
        return NextResponse.json({ error: "This registration is not ready for a balance payment. Please contact Merry Explorers for help." }, { status: 409 });
      }
      const amount = Math.round(Number(amountPaid) * 100) / 100;
      const reference = String(referenceNumber || "").trim();
      if (!["gcash", "bpi", "mari-bank"].includes(String(paymentMethod))) {
        return NextResponse.json({ error: "Please choose a supported payment method." }, { status: 400 });
      }
      if (!Number.isFinite(amount) || amount <= 0 || !reference) {
        return NextResponse.json({ error: "Enter a valid amount and payment reference number." }, { status: 400 });
      }
      if (typeof receiptBase64 !== "string" || !/^data:image\//.test(receiptBase64)) {
        return NextResponse.json({ error: "Please upload a payment receipt image." }, { status: 400 });
      }
      if (receiptBase64.length > 2_500_000) {
        return NextResponse.json({ error: "The receipt image is too large. Please use a smaller image." }, { status: 413 });
      }

      const existingRefs = [registration.referenceNumber, ...(registration.balancePayments || []).map((p: any) => p.referenceNumber)]
        .filter(Boolean).map((value: string) => value.replace(/\s+/g, "").toLowerCase());
      if (existingRefs.includes(reference.replace(/\s+/g, "").toLowerCase())) {
        return NextResponse.json({ error: "This reference number has already been submitted for this registration." }, { status: 409 });
      }
      if ((registration.balancePayments || []).some((payment: any) => payment?.verified !== true && payment?.rejected !== true)) {
        return NextResponse.json({ error: "A balance payment is already waiting for verification. Please wait for it to be reviewed before submitting another." }, { status: 409 });
      }

      const parentEmail = String(registration.parentInfo?.email || "").trim().toLowerCase();
      const pioneerFamily = parentEmail ? await db.collection("pioneer_families").findOne(pioneerEmailQuery(parentEmail)) : null;
      const isPioneer = Boolean(registration.isPioneer || pioneerFamily);
      const pioneerSettings = await db.collection("settings").findOne({ _key: "pioneer_settings_v1" });
      const pioneerRate = Number(pioneerSettings?.pioneerPrices?.[registration.program]) || FALLBACK_PIONEER_RATES[registration.program];
      const pricingRegistration = {
        ...registration,
        isPioneer,
        ...(isPioneer && pioneerRate ? { customRate: pioneerRate } : {}),
      };
      const escapedEmail = parentEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const parentAccount = parentEmail
        ? await db.collection("accounts").findOne({ email: { $regex: `^${escapedEmail}$`, $options: "i" } })
        : null;
      const renewalSettings = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
      const adventureStart = getRegistrationAdventureStart(renewalSettings?.programs || [], registration, getManilaTodayIso());
      const student = getStudentSessionInfo(registration, parentAccount, adventureStart);
      const paidVerified = isRegistrationVerified(registration.status) ? Number(registration.amountPaid || registration.amountDue || 0) : 0;
      const fallbackTotal = (getRegistrationTotal({ ...pricingRegistration, uniformOrdered: false }, Number(registration.amountDue) || 0) || 0)
        + (registration.uniformOrdered ? 650 : 0);
      const terms = calcRegistrationTerms(pricingRegistration, student, paidVerified, fallbackTotal);
      if (data.expectedTotalPayable != null && terms.totalPayable != null && Math.abs(Number(data.expectedTotalPayable) - terms.totalPayable) > 0.01) {
        return NextResponse.json({ error: "The balance changed while you were preparing this payment. Refresh this page to see the latest amount." }, { status: 409 });
      }
      const allocation = allocateBalancePayment(terms, amount, false);
      if (!allocation.ok) return NextResponse.json({ error: allocation.error || "This payment amount cannot be applied to the current balance." }, { status: 400 });

      let receiptUrl = "";
      let receiptPublicId = "";
      try {
        const uploaded = await cloudinary.uploader.upload(receiptBase64, { folder: "merry_explorers_receipts", resource_type: "image" });
        receiptUrl = uploaded.secure_url;
        receiptPublicId = uploaded.public_id;
      } catch (uploadError: any) {
        console.error("[payment balance upload] Receipt upload failed:", uploadError);
        return NextResponse.json({ error: "Failed to upload your receipt. Please try again." }, { status: 502 });
      }

      const now = new Date();
      const entry = {
        id: new ObjectId().toString(),
        amountPaid: amount,
        paymentMethod,
        referenceNumber: reference,
        receiptUrl,
        receiptPublicId,
        paidOn: now,
        submittedAt: now,
        verified: false,
        rejected: false,
        balanceBefore: allocation.balanceBefore,
        interestAtTime: allocation.interest,
        totalPayableAtTime: allocation.totalPayable,
        adminNote: "",
      };
      const saved = await db.collection("student_registrations").updateOne(
        {
          _id: new ObjectId(id),
          status: { $in: ["approved", "active"] },
          balancePayments: { $not: { $elemMatch: { verified: { $ne: true }, rejected: { $ne: true } } } },
        },
        { $push: { balancePayments: entry } as any }
      );
      if (!saved.matchedCount) {
        await cloudinary.uploader.destroy(receiptPublicId).catch(() => {});
        return NextResponse.json({ error: "A payment was submitted or this registration changed. Refresh the page and try again." }, { status: 409 });
      }
      await db.collection("notifications").insertOne({
        title: "Balance Payment Receipt Submitted",
        message: `${registration.childInfo?.firstName || "A student"} submitted a balance payment receipt for ${registration.program}.`,
        type: "info",
        read: false,
        link: "/admin/payments",
        time: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }),
        createdAt: now,
      });
      return NextResponse.json({ success: true, balancePaymentSubmitted: true });
    }

    if (registration.status !== "reserved") {
      if (registration.status === "expired") {
        return NextResponse.json({ error: "Your slot reservation has expired." }, { status: 410 });
      }
      return NextResponse.json({ error: "Payment already submitted for this registration." }, { status: 400 });
    }
    if (registration.reservedUntil && new Date(registration.reservedUntil).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Your slot reservation has expired. Renew it to continue." }, { status: 410 });
    }

    // Upload receipt to Cloudinary
    let receiptUrl = "";
    let receiptPublicId = "";
    try {
      const uploadResult = await cloudinary.uploader.upload(receiptBase64, {
        folder: "merry_explorers_receipts",
        resource_type: "image",
      });
      receiptUrl = uploadResult.secure_url;
      receiptPublicId = uploadResult.public_id;
    } catch (err: any) {
      console.error("[payment POST] Cloudinary receipt upload failed:", err);
      return NextResponse.json({ error: "Failed to upload receipt. Please try again." }, { status: 500 });
    }

    // Update the registration document
    const saved = await db.collection("student_registrations").updateOne(
      {
        _id: new ObjectId(id),
        status: "reserved",
        $or: [
          { reservedUntil: { $exists: false } },
          { reservedUntil: null },
          { reservedUntil: { $gt: new Date() } },
        ],
      },
      {
        $set: {
          status: "pending", // Change to pending verification
          paymentMethod,
          paymentType,
          amountDue,
          amountPaid,
          creditBalance,
          referenceNumber,
          receiptUrl,
          receiptPublicId,
          uniformOrdered: uniformOrdered || false,
          lanyardOrdered: lanyardOrdered || false,
          welcomeKitOrdered: welcomeKitOrdered || false,
          recitalKitOrdered: recitalKitOrdered || false,
          isNewFamily: isNewFamily || false,
          submittedAt: new Date(), // Reset submitted time to now
        }
      }
    );
    if (!saved.matchedCount) {
      await cloudinary.uploader.destroy(receiptPublicId).catch(() => {});
      return NextResponse.json({ error: "Your slot reservation has expired. Renew it to continue." }, { status: 410 });
    }

    // Sync payment details into renewal_families
    try {
      const childFull = `${registration.childInfo?.firstName || ""} ${registration.childInfo?.lastName || ""}`.trim();
      const parentEmailClean = (registration.parentInfo?.email || "").toLowerCase().trim();
      if (parentEmailClean && childFull) {
        await db.collection("renewal_families").updateOne(
          {
            parentEmail: parentEmailClean,
            childName: { $regex: new RegExp(`^${childFull.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          },
          {
            $set: {
              renewalStatus: "confirmed",
              registrationId: id,
              updatedAt: new Date(),
            },
          }
        );
      }
    } catch (syncErr) {
      console.error("[payment POST] Failed to sync to renewal_families:", syncErr);
    }

    // Create admin notification
    await db.collection("notifications").insertOne({
      title: "New Student Registration (Payment Uploaded)",
      message: `${registration.childInfo.firstName} ${registration.childInfo.lastName} has completed payment for ${registration.program.replace(/-/g, " ")}.`,
      type: "info",
      read: false,
      link: "/admin/registrations",
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }),
      createdAt: new Date(),
    });

    // Send acknowledgment email to parent
    try {
      // Use OAuth2 if configured, otherwise fallback to standard auth
      const auth = process.env.GMAIL_CLIENT_ID ? {
        type: "OAuth2",
        user: "merryexplorerscenter@gmail.com",
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      } : {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      };

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: auth as any,
      });

      const programNames: Record<string, string> = {
        "curious-explorer": "Discovery Club: Curious Explorer",
        "everyday-curious": "Discovery Club: Everyday Explorer",
        "creative-explorer": "Discovery Club: Creative Explorer",
        "brave-explorer": "Trailblazer: Brave Explorer",
        "ballet": "Ballet",
        "saturday-playdate": "Saturday Playdate",
      };

      const resolvedProgramTitle = programNames[registration.program] || registration.program;

      // Fetch dynamic adventure number & start date
      const renewalSettingsDoc = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
      const storedPrograms: Array<{ programKey: string; currentAdventure: number; adventureStartDate?: string | null; nextAdventureStart: string | null }> = renewalSettingsDoc?.programs || [];
      const matchedProg = storedPrograms.find((p) =>
        p.programKey.toLowerCase().includes(resolvedProgramTitle.toLowerCase()) ||
        resolvedProgramTitle.toLowerCase().includes(p.programKey.toLowerCase())
      ) || storedPrograms[0];

      const periodNumMatch = (registration.period || "").match(/adventure\s*[-_]?\s*(\d+)/i);
      const advNumber = periodNumMatch
        ? parseInt(periodNumMatch[1], 10)
        : (matchedProg?.nextAdventureStart ? ((matchedProg.currentAdventure ?? 1) + 1) : 2);
      const advLabel = `Adventure ${advNumber}`;
      const advStartDateStr = (matchedProg?.nextAdventureStart || matchedProg?.adventureStartDate)
        ? new Date(matchedProg.nextAdventureStart || matchedProg.adventureStartDate!).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
        : null;

      await transporter.sendMail({
        from: `"Merry Explorers" <merryexplorerscenter@gmail.com>`,
        to: registration.parentInfo.email,
        subject: `Payment Receipt Received: ${resolvedProgramTitle} (${advLabel}) for ${registration.childInfo.firstName}! ✨`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="margin: 0; padding: 0; background-color: #eaf4ff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eaf4ff; padding: 32px 16px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 6px 20px rgba(0, 51, 160, 0.12); border: 3px solid #ffd84d;">

                    <!-- Yellow banner strip -->
                    <tr>
                      <td style="background-color: #ffd84d; padding: 14px 20px; text-align: center;">
                        <p style="margin: 0; color: #0033A0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">
                          🎈 A NEW ADVENTURE COMES WITH NEW WAYS TO LEARN, PLAY, AND GROW 🎈
                        </p>
                      </td>
                    </tr>

                    <!-- Header -->
                    <tr>
                      <td style="background-color: #0033A0; padding: 36px 20px; text-align: center;">
                        <p style="margin: 0 0 4px 0; font-size: 36px;">🎈🧭✈️</p>
                        <h1 style="color: #ffffff; margin: 0; font-size: 30px; font-weight: 800; letter-spacing: 1px;">MERRY EXPLORERS</h1>
                        <p style="color: #ffd84d; margin: 6px 0 0 0; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Playgroup and Learning Center</p>
                        <p style="color: #a3c4f3; margin: 14px 0 0 0; font-size: 15px; font-style: italic;">Dream. Discover. Explore. 🤍</p>
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td style="padding: 36px 40px 30px 40px;">
                        <h2 style="color: #1e293b; font-size: 23px; margin: 0 0 18px 0;">Hi ${registration.parentInfo.name}! 👋</h2>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                          Thank you for renewing <strong>${registration.childInfo.firstName}</strong> for our <strong>${resolvedProgramTitle}</strong> program! We've safely received your application and payment receipt, and we can't wait for this next Merry Adventure together.
                        </p>

                        <!-- Program & Adventure Start Summary Box -->
                        <div style="background-color: #f0f7ff; border: 1.5px solid #bfdbfe; border-radius: 14px; padding: 18px 20px; margin: 0 0 24px 0;">
                          <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">📋 Program & Schedule Information</p>
                          <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13.5px; color: #1e293b;">
                            <tr>
                              <td style="padding: 4px 0; color: #64748b; width: 140px;"><strong>Explorer:</strong></td>
                              <td style="padding: 4px 0; font-weight: bold; color: #002f76;">${registration.childInfo.firstName} ${registration.childInfo.lastName || ""}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #64748b;"><strong>Program:</strong></td>
                              <td style="padding: 4px 0; font-weight: bold; color: #002f76;">${resolvedProgramTitle}</td>
                            </tr>
                            ${registration.classTime ? `
                            <tr>
                              <td style="padding: 4px 0; color: #64748b;"><strong>Class / Session:</strong></td>
                              <td style="padding: 4px 0; font-weight: bold; color: #002f76;">${registration.classTime}</td>
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

                        <div style="background-color: #fffbea; border: 2px dashed #ffd84d; border-radius: 14px; padding: 22px 24px; margin: 0 0 26px 0;">
                          <h3 style="color: #0033A0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 14px 0;">☀️ What Happens Next?</h3>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td valign="top" width="34" style="padding-bottom: 14px;">
                                <span style="background-color: #0033A0; color: #ffffff; font-weight: bold; border-radius: 50%; width: 24px; height: 24px; display: inline-block; text-align: center; line-height: 24px; font-size: 12px;">1</span>
                              </td>
                              <td style="color: #475569; font-size: 14px; line-height: 1.5; padding-bottom: 14px;">Our team will manually review and verify your payment receipt.</td>
                            </tr>
                            <tr>
                              <td valign="top" width="34" style="padding-bottom: 14px;">
                                <span style="background-color: #0033A0; color: #ffffff; font-weight: bold; border-radius: 50%; width: 24px; height: 24px; display: inline-block; text-align: center; line-height: 24px; font-size: 12px;">2</span>
                              </td>
                              <td style="color: #475569; font-size: 14px; line-height: 1.5; padding-bottom: 14px;">Once verified, you'll receive an official confirmation email securing ${registration.childInfo.firstName}'s slot.</td>
                            </tr>
                            <tr>
                              <td valign="top" width="34">
                                <span style="background-color: #0033A0; color: #ffffff; font-weight: bold; border-radius: 50%; width: 24px; height: 24px; display: inline-block; text-align: center; line-height: 24px; font-size: 12px;">3</span>
                              </td>
                              <td style="color: #475569; font-size: 14px; line-height: 1.5;">This verification process usually takes <strong>1–2 business days</strong>.</td>
                            </tr>
                          </table>
                        </div>

                        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
                          We are incredibly excited to welcome <strong>${registration.childInfo.firstName}</strong> to our community! If you have any immediate questions, please feel free to message us on our Facebook page. 💙
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #eaf4ff; padding: 22px 40px; text-align: center; border-top: 2px dashed #ffd84d;">
                        <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.6;">
                          <strong style="color: #0033A0;">Merry Explorers Center</strong><br>
                          📍 2nd floor, Starla 88 Bldg., Camarin Road, Caloocan
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
    } catch (emailErr: any) {
      console.error("[payment POST] ❌ Failed to send acknowledgment email:", {
        message: emailErr?.message,
        code: emailErr?.code,
        hasClientId: !!process.env.GMAIL_CLIENT_ID,
        hasEmailUser: !!process.env.EMAIL_USER,
        hasEmailPass: !!process.env.EMAIL_PASS,
        hasRefreshToken: !!process.env.GMAIL_REFRESH_TOKEN,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[payment POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process payment" }, { status: 500 });
  }
}
