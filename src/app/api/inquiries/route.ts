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
          <div style="font-family: 'Comic Sans MS', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f0fdf4; padding: 25px; border-radius: 24px; border: 2px dashed #bbf7d0;">
          <div style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0, 51, 160, 0.12); border: 2px solid #fff;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0033A0 0%, #0050d5 100%); padding: 40px 30px; text-align: center; position: relative;">
              <div style="font-size: 50px; margin-bottom: 15px;">🧸🎨🚀</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 36px; font-weight: 900; letter-spacing: -0.5px;">
                Merry <span style="color: #FFB800;">Explorers</span>
              </h1>
              <p style="color: #e0e7ff; font-size: 14px; font-weight: bold; letter-spacing: 2px; margin-top: 10px; text-transform: uppercase;">
                Where learning is an adventure! 🌟
              </p>
            </div>

            <!-- Body -->
            <div style="padding: 40px 35px;">
              <h2 style="color: #1e293b; margin-top: 0; font-size: 24px; font-weight: 800;">Hi ${parentName}! 👋</h2>
              
              <p style="color: #334155; font-size: 16px; line-height: 1.8; margin-top: 20px; font-weight: 500;">
                Thank you for reaching out to <strong>Merry Explorers</strong>! We're thrilled that you are considering our playgroup and learning center for your little one.
              </p>
              
              <p style="color: #334155; font-size: 16px; line-height: 1.8; font-weight: 500;">
                We have successfully received your inquiry and our admissions team will get back to you within 1-2 business days with more information.
              </p>
              
              <!-- Original Message Quote -->
              <div style="background-color: #fffbeb; border-radius: 16px; padding: 25px; border: 2px solid #fde68a; position: relative; margin: 35px 0;">
                <div style="position: absolute; top: -12px; left: 20px; background: #FFB800; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                  Your Message
                </div>
                <p style="color: #475569; margin: 0; font-size: 15px; line-height: 1.6; font-style: italic;">
                  "${message}"
                </p>
              </div>
              
              <p style="color: #334155; font-size: 16px; line-height: 1.8; font-weight: 500;">
                In the meantime, feel free to explore our website to learn more about our programs and the fun learning environment we offer.
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #eff6ff; padding: 30px; text-align: center; border-top: 2px dashed #bfdbfe;">
              <p style="color: #1e40af; font-size: 14px; font-weight: 800; margin: 0 0 10px 0;">
                Merry Explorers Playgroup & Learning Center 🏫
              </p>
              <p style="color: #475569; font-size: 13px; line-height: 1.6; margin: 0;">
                Unit C, 2nd Floor, Starla 88 Bldg, Camarin Rd., Caloocan<br/>
                <a href="mailto:Merryexplorerscenter@gmail.com" style="color: #0066CC; text-decoration: none; font-weight: 700;">Merryexplorerscenter@gmail.com</a> &nbsp;|&nbsp; <span style="color: #475569; font-weight: 700;">(0947) 782 0606</span>
              </p>
            </div>
          </div>
        </div>
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
