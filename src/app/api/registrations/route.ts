import { NextResponse } from "next/server";
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
      paymentType,
      amountDue,
      amountPaid,
      creditBalance,
      referenceNumber,
    } = data;

    // Validate required fields
    if (!program || !classTime || !parentInfo?.email || !parentInfo?.name || !childInfo?.firstName || !receiptBase64 || !signatureBase64) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
      console.error("[registrations POST] Cloudinary receipt upload failed:", err);
      return NextResponse.json({ error: "Failed to upload receipt. Please try again." }, { status: 500 });
    }

    // Upload signature to Cloudinary
    let signatureUrl = "";
    let signaturePublicId = "";
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

    const { db } = await connectToDatabase();

    // Check slot availability
    const programConfig = {
      "curious-explorer": { classes: { "Morning Class": 4, "Afternoon Class": 4 } },
      "creative-explorer": { classes: { "Morning Class": 6, "Mid-Day Class": 6, "Afternoon Class": 6 } },
      "brave-explorer": { classes: { "Afternoon Class": 6 } },
    } as Record<string, { classes: Record<string, number> }>;

    const maxSlots = programConfig[program]?.classes[classTime];
    if (maxSlots !== undefined) {
      const takenSlots = await db.collection("student_registrations").countDocuments({
        program,
        classTime,
        status: { $in: ["pending", "approved"] },
      });
      if (takenSlots >= maxSlots) {
        return NextResponse.json({ error: `Sorry, ${classTime} for this program is now full.` }, { status: 409 });
      }
    }

    const newRegistration = {
      status: "pending",
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
      receiptUrl,
      receiptPublicId,
      signatureUrl,
      signaturePublicId,
      photoConsent,
      uniformOrdered: uniformOrdered || false,
      notes: "",
      submittedAt: new Date(),
      approvedAt: null,
      approvedBy: null,
      confirmationEmailSent: false,
    };

    const result = await db.collection("student_registrations").insertOne(newRegistration);

    // Create admin notification
    await db.collection("notifications").insertOne({
      title: "New Student Registration",
      message: `${childInfo.firstName} ${childInfo.lastName} has applied for ${program.replace(/-/g, " ")}.`,
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
        user: "merryexplorerscenter@gmail.com", // The new email!
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
        "creative-explorer": "Discovery Club: Creative Explorer",
        "brave-explorer": "Trailblazer: Brave Explorer",
      };

      await transporter.sendMail({
        from: `"Merry Explorers" <merryexplorerscenter@gmail.com>`,
        to: parentInfo.email,
        subject: "We've Received Your Registration! ✨",
        html: `
          <!DOCTYPE html>
          <html>
          <body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f6; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <!-- Header -->
                    <tr>
                      <td style="background-color: #0033A0; padding: 40px 0; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">MERRY EXPLORERS</h1>
                        <p style="color: #a3c4f3; margin: 8px 0 0 0; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">Play • Learn • Grow</p>
                      </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                      <td style="padding: 40px 40px 30px 40px;">
                        <h2 style="color: #1e293b; font-size: 24px; margin: 0 0 20px 0;">Hi ${parentInfo.name},</h2>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                          Thank you for registering <strong>${childInfo.firstName}</strong> for our <strong>${programNames[program] || program}</strong> program! We have safely received your application and payment receipt.
                        </p>
                        
                        <div style="background-color: #f8fafc; border-left: 4px solid #0033A0; padding: 20px; border-radius: 4px; margin: 30px 0;">
                          <h3 style="color: #0033A0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0;">What Happens Next?</h3>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td valign="top" style="padding-bottom: 12px;">
                                <span style="background-color: #e2e8f0; color: #475569; font-weight: bold; border-radius: 50%; width: 24px; height: 24px; display: inline-block; text-align: center; line-height: 24px; font-size: 12px; margin-right: 12px;">1</span>
                              </td>
                              <td style="color: #475569; font-size: 15px; line-height: 1.5; padding-bottom: 12px;">Our team will manually review and verify your payment receipt.</td>
                            </tr>
                            <tr>
                              <td valign="top" style="padding-bottom: 12px;">
                                <span style="background-color: #e2e8f0; color: #475569; font-weight: bold; border-radius: 50%; width: 24px; height: 24px; display: inline-block; text-align: center; line-height: 24px; font-size: 12px; margin-right: 12px;">2</span>
                              </td>
                              <td style="color: #475569; font-size: 15px; line-height: 1.5; padding-bottom: 12px;">Once verified, you will receive an official confirmation email securing ${childInfo.firstName}'s slot.</td>
                            </tr>
                            <tr>
                              <td valign="top">
                                <span style="background-color: #e2e8f0; color: #475569; font-weight: bold; border-radius: 50%; width: 24px; height: 24px; display: inline-block; text-align: center; line-height: 24px; font-size: 12px; margin-right: 12px;">3</span>
                              </td>
                              <td style="color: #475569; font-size: 15px; line-height: 1.5;">This verification process usually takes <strong>3-5 business days</strong>.</td>
                            </tr>
                          </table>
                        </div>

                        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 10px 0;">
                          We are incredibly excited to welcome ${childInfo.firstName} to our community! If you have any immediate questions, please feel free to message us on our Facebook page.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8fafc; padding: 25px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                          <strong>Merry Explorers Center</strong><br>
                          2nd floor, Starla 88 Bldg., Camarin Road, Caloocan
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
      console.warn("[registrations POST] Failed to send acknowledgment email:", emailErr);
    }

    return NextResponse.json({ success: true, data: { id: result.insertedId.toString() } });
  } catch (error: any) {
    console.error("[registrations POST]", error);
    return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
  }
}
