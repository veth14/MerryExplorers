import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { db } = await connectToDatabase();

    await db.collection("inquiries").updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update inquiry" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    await db.collection("inquiries").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete inquiry" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { replyMessage } = await request.json();

    if (!replyMessage) {
      return NextResponse.json({ error: "Reply message is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Fetch inquiry to get email and name
    const inquiry = await db.collection("inquiries").findOne({ _id: new ObjectId(id) });
    if (!inquiry) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    // Send reply email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
      to: inquiry.email,
      subject: "Re: Your Inquiry - Merry Explorers 🌟",
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
              <h2 style="color: #1e293b; margin-top: 0; font-size: 24px; font-weight: 800;">Hi ${inquiry.parentName}! 👋</h2>
              
              <div style="color: #334155; font-size: 16px; line-height: 1.8; white-space: pre-wrap; margin-top: 20px; font-weight: 500;">
${replyMessage}
              </div>
              
              <!-- Divider -->
              <div style="text-align: center; margin: 35px 0;">
                <span style="color: #FFB800; font-size: 24px; letter-spacing: 10px;">•••</span>
              </div>
              
              <!-- Original Message Quote -->
              <div style="background-color: #fffbeb; border-radius: 16px; padding: 25px; border: 2px solid #fde68a; position: relative;">
                <div style="position: absolute; top: -12px; left: 20px; background: #FFB800; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                  Your Message ( ${new Date(inquiry.createdAt).toLocaleDateString()} )
                </div>
                <p style="color: #475569; margin: 0; font-size: 15px; line-height: 1.6; font-style: italic;">
                  "${inquiry.message}"
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #eff6ff; padding: 30px; text-align: center; border-top: 2px dashed #bfdbfe;">
              <p style="color: #1e40af; font-size: 14px; font-weight: 800; margin: 0 0 10px 0;">
                Merry Explorers Playgroup & Learning Center 🏫
              </p>
              <p style="color: #475569; font-size: 13px; line-height: 1.6; margin: 0;">
                Unit C, 2nd Floor, B13 L33 Camarin Rd., North, Caloocan<br/>
                <a href="mailto:info@merryexplorers.com" style="color: #0066CC; text-decoration: none; font-weight: 700;">info@merryexplorers.com</a> &nbsp;|&nbsp; <span style="color: #475569; font-weight: 700;">+63 912 345 6789</span>
              </p>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Save the reply to history and update status to Replied
    const replyRecord = {
      message: replyMessage,
      sentAt: new Date(),
    };

    await db.collection("inquiries").updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { status: "Replied", updatedAt: new Date() },
        $push: { replies: replyRecord } as any
      }
    );

    return NextResponse.json({ success: true, status: "Replied" });
  } catch (error: any) {
    console.error("Failed to send reply:", error);
    return NextResponse.json({ error: "Failed to send reply email" }, { status: 500 });
  }
}

