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

/** POST — Admin sends a reply email to the client */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { replyMessage } = await request.json();

    if (!replyMessage) {
      return NextResponse.json({ error: "Reply message is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const inquiry = await db.collection("inquiries").findOne({ _id: new ObjectId(id) });
    if (!inquiry) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Build References header to keep Gmail threading correct
    const existingMessageId = inquiry.gmailMessageId ?? null;
    const references = existingMessageId ? existingMessageId : undefined;

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
      to: inquiry.email,
      subject: "Re: Your Inquiry - Merry Explorers 🌟",
      inReplyTo: existingMessageId ?? undefined,
      references: references ?? undefined,
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
                Merry Explorers Playgroup &amp; Learning Center 🏫
              </p>
              <p style="color: #475569; font-size: 13px; line-height: 1.6; margin: 0;">
                Unit C, 2nd Floor, B13 L33 Camarin Rd., North, Caloocan<br/>
                <a href="mailto:Merryexplorerscenter@gmail.com" style="color: #0066CC; text-decoration: none; font-weight: 700;">Merryexplorerscenter@gmail.com</a> &nbsp;|&nbsp; <span style="color: #475569; font-weight: 700;">(0947) 782 0606</span>
              </p>
            </div>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    // The Message-ID nodemailer returns (used later to match client replies)
    const sentMessageId: string | null = info.messageId ?? null;

    const sentAt = new Date().toISOString();
    const threadEntry = {
      from: "school" as const,
      message: replyMessage,
      sentAt,
    };

    await db.collection("inquiries").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "Replied",
          updatedAt: new Date(),
          // Store the most recent sent Message-ID so we can match In-Reply-To headers
          ...(sentMessageId ? { gmailMessageId: sentMessageId } : {}),
        },
        $push: { thread: threadEntry } as any,
      }
    );

    return NextResponse.json({ success: true, status: "Replied" });
  } catch (error: any) {
    console.error("Failed to send reply:", error);
    return NextResponse.json({ error: "Failed to send reply email" }, { status: 500 });
  }
}

/** PUT — Admin manually logs a client follow-up message they received outside the system */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { clientMessage } = await request.json();

    if (!clientMessage?.trim()) {
      return NextResponse.json({ error: "Client message is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const threadEntry = {
      from: "client" as const,
      message: clientMessage.trim(),
      sentAt: new Date().toISOString(),
      manual: true,
    };

    await db.collection("inquiries").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { thread: threadEntry } as any,
        $set: { status: "Awaiting Reply", updatedAt: new Date() },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to log client reply" }, { status: 500 });
  }
}
