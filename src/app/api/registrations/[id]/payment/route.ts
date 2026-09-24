import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { v2 as cloudinary } from "cloudinary";
import nodemailer from "nodemailer";

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

    if (registration.status !== "reserved") {
      if (registration.status === "expired") {
        return NextResponse.json({ error: "Your slot reservation has expired." }, { status: 410 });
      }
      return NextResponse.json({ error: "Payment already submitted for this registration." }, { status: 400 });
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
    await db.collection("student_registrations").updateOne(
      { _id: new ObjectId(id) },
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

    // Create admin notification
    await db.collection("notifications").insertOne({
      title: "New Student Registration (Payment Uploaded)",
      message: `${registration.childInfo.firstName} ${registration.childInfo.lastName} has completed payment for ${registration.program.replace(/-/g, " ")}.`,
      type: "info",
      read: false,
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
        "everyday-curious": "Discovery Club: Everyday Curious",
        "creative-explorer": "Discovery Club: Creative Explorer",
        "brave-explorer": "Trailblazer: Brave Explorer",
      };

      await transporter.sendMail({
        from: `"Merry Explorers" <merryexplorerscenter@gmail.com>`,
        to: registration.parentInfo.email,
        subject: "We've Received Your Registration! ✨",
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
                        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                          Thank you for registering <strong>${registration.childInfo.firstName}</strong> for our <strong>${programNames[registration.program] || registration.program}</strong> program! We've safely received your application and payment receipt, and we can't wait for this next Merry Adventure together.
                        </p>

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
    } catch (emailErr) {
      console.warn("[payment POST] Failed to send acknowledgment email:", emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[payment POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process payment" }, { status: 500 });
  }
}
