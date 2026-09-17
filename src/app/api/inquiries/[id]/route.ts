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
                      <h2 style="color: #1e293b; font-size: 23px; margin: 0 0 18px 0;">Hi ${inquiry.parentName}! 👋</h2>

                      <p style="color: #334155; font-size: 16px; line-height: 1.7; white-space: pre-wrap; margin: 0 0 30px 0;">${replyMessage}</p>

                      <!-- Divider -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                        <tr>
                          <td align="center">
                            <span style="color: #ffd84d; font-size: 20px; letter-spacing: 10px;">•••</span>
                          </td>
                        </tr>
                      </table>

                      <!-- Original message quote -->
                      <div style="background-color: #fffbea; border: 2px dashed #ffd84d; border-radius: 14px; padding: 22px 24px;">
                        <p style="margin: 0 0 10px 0; color: #0033A0; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                          💬 Your Message ( ${new Date(inquiry.createdAt).toLocaleDateString()} )
                        </p>
                        <p style="color: #475569; margin: 0; font-size: 15px; line-height: 1.6; font-style: italic;">"${inquiry.message}"</p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #eaf4ff; padding: 22px 40px; text-align: center; border-top: 2px dashed #ffd84d;">
                      <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.7;">
                        <strong style="color: #0033A0;">Merry Explorers Playgroup &amp; Learning Center</strong><br>
                        📍 Unit C, 2nd Floor, B13 L33 Camarin Rd., North, Caloocan<br>
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