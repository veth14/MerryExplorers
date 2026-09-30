import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { actorName, sendEmail = true } = body;

    const { db } = await connectToDatabase();

    const reg = await db.collection("student_registrations").findOne({ _id: new ObjectId(id) });
    if (!reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    // Re-open the payment portal: status -> reserved, new 48-hour window
    const newDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await db.collection("student_registrations").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "reserved",
          reservedUntil: newDeadline,
          paymentPortalOpen: true,
          paymentPortalOpenedAt: new Date(),
          paymentPortalOpenedBy: actorName || "Admin",
        },
      }
    );

    // Send email reminder to parent if requested
    let emailSent = false;
    if (sendEmail && reg.parentInfo?.email) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });

        const paymentUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://merry-explorers.vercel.app"}/register/payment/${id}`;
        const deadlineStr = newDeadline.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

        await transporter.sendMail({
          from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
          to: reg.parentInfo.email,
          subject: `⏰ Time to Secure Your Slot! Payment Portal Open — ${reg.childInfo?.firstName || ""}`,
          html: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #fdfdfd; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 40px rgba(0,47,118,0.10);">
              <div style="background: linear-gradient(135deg, #0033A0 0%, #1a2e6b 100%); padding: 36px 36px 28px; text-align: center;">
                <div style="font-size: 40px; margin-bottom: 8px;">🐣</div>
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Payment Portal is Now Open!</h1>
                <p style="margin: 8px 0 0; color: rgba(255,255,255,0.75); font-size: 14px;">Your early bird slot is secured — it's time to pay your downpayment</p>
              </div>
              <div style="padding: 32px 36px;">
                <p style="font-size: 15px; color: #334155; line-height: 1.6;">Hi <strong>${reg.parentInfo.name}</strong>,</p>
                <p style="font-size: 14px; color: #64748b; line-height: 1.7;">
                  Great news! Your payment portal for <strong>${reg.childInfo?.firstName || "your child"}'s</strong> slot in 
                  <strong>${reg.program?.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</strong> (${reg.classTime}) 
                  is now open. Your slot has been secured as an <strong>Early Bird</strong> — now just complete your downpayment to confirm it!
                </p>
                <div style="background: #fff7ed; border: 2px solid #fed7aa; border-radius: 16px; padding: 16px 20px; margin: 20px 0; text-align: center;">
                  <p style="margin: 0; font-size: 13px; font-weight: 700; color: #ea580c;">⏰ Payment deadline: ${deadlineStr}</p>
                </div>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #0033A0, #1a2e6b); color: white; font-size: 15px; font-weight: 800; text-decoration: none; padding: 16px 40px; border-radius: 100px; box-shadow: 0 8px 24px rgba(0,51,160,0.3);">
                    Complete Payment →
                  </a>
                </div>
                <p style="font-size: 13px; color: #94a3b8; text-align: center; line-height: 1.6;">
                  If you have any questions, feel free to message us on Facebook.<br/>
                  <strong style="color: #0033A0;">Merry Explorers Playgroup Learning Center</strong>
                </p>
              </div>
            </div>
          `,
        });
        emailSent = true;
      } catch (emailErr) {
        console.error("[open-payment email]", emailErr);
      }
    }

    return NextResponse.json({ success: true, emailSent });
  } catch (error: any) {
    console.error("[open-payment POST]", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}