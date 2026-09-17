import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import nodemailer from "nodemailer";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const { db } = await connectToDatabase();
    const inquiries = await db
      .collection("inquiries")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const formatted = inquiries.map((inq) => ({
      ...inq,
      id: inq._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch inquiries" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { parentName, email, phone, childName, childAge, message } = data;

    if (!parentName || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const newInquiry = {
      parentName,
      email,
      phone: phone || "",
      childName: childName || "",
      childAge: childAge || "",
      message,
      status: "New",
      createdAt: new Date(),
    };

    const result = await db.collection("inquiries").insertOne(newInquiry);

    // Create a global notification for admins
    await db.collection("notifications").insertOne({
      title: "New Inquiry Received",
      message: `An inquiry from ${parentName} for ${childName || "their child"} has been received.`,
      type: "info",
      read: false,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }),
      createdAt: new Date(),
    });

    // Send auto-reply email
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "We've Received Your Inquiry! 🌟",
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
                        <p style="margin: 0 0 4px 0; font-size: 36px;">🧸🎨🚀</p>
                        <h1 style="color: #ffffff; margin: 0; font-size: 30px; font-weight: 800; letter-spacing: 1px;">MERRY EXPLORERS</h1>
                        <p style="color: #ffd84d; margin: 6px 0 0 0; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Playgroup and Learning Center</p>
                        <p style="color: #a3c4f3; margin: 14px 0 0 0; font-size: 15px; font-style: italic;">Dream. Discover. Explore. 🤍</p>
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td style="padding: 36px 40px 30px 40px;">
                        <h2 style="color: #1e293b; font-size: 23px; margin: 0 0 18px 0;">Hi ${parentName}! 👋</h2>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                          Thank you for reaching out to <strong>Merry Explorers</strong>! We're thrilled that you're considering our playgroup and learning center for your little one.
                        </p>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 26px 0;">
                          We've successfully received your inquiry, and our admissions team will get back to you within <strong>1–2 business days</strong> with more information.
                        </p>

                        <!-- Quoted message -->
                        <div style="background-color: #fffbea; border: 2px dashed #ffd84d; border-radius: 14px; padding: 22px 24px; margin: 0 0 26px 0;">
                          <p style="margin: 0 0 10px 0; color: #0033A0; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">💬 Your Message</p>
                          <p style="color: #475569; margin: 0; font-size: 15px; line-height: 1.6; font-style: italic;">"${message}"</p>
                        </div>

                        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
                          In the meantime, feel free to explore our website to learn more about our programs and the fun learning environment we offer. 🌟
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #eaf4ff; padding: 22px 40px; text-align: center; border-top: 2px dashed #ffd84d;">
                        <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.7;">
                          <strong style="color: #0033A0;">Merry Explorers Playgroup &amp; Learning Center</strong><br>
                          📍 Unit C, 2nd Floor, Starla 88 Bldg, Camarin Rd., Caloocan<br>
                          <a href="mailto:Merryexplorerscenter@gmail.com" style="color: #0066CC; text-decoration: none; font-weight: 600;">Merryexplorerscenter@gmail.com</a> &nbsp;|&nbsp; (0947) 782 0606
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
      };

      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error("Failed to send auto-reply email:", emailError);
    }

    return NextResponse.json({
      success: true,
      data: { ...newInquiry, id: result.insertedId.toString() },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to submit inquiry" }, { status: 500 });
  }
}