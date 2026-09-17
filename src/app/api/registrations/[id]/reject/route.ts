import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  const resolvedParams = await params;
  const { id } = resolvedParams;
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { reason, actorUid, actorName, actorRole } = body;

    const { db } = await connectToDatabase();

    const registration = await db
      .collection("student_registrations")
      .findOne({ _id: new ObjectId(id) });

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    await db.collection("student_registrations").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "rejected",
          rejectedAt: new Date(),
          rejectedBy: actorName || actorUid || "Admin",
          rejectionReason: reason || "",
        },
      }
    );

    // Audit log
    if (actorUid) {
      await db.collection("audit_log").insertOne({
        actorUid,
        actorName: actorName || "Unknown",
        actorRole: actorRole || "Unknown",
        action: "REJECT",
        category: "registration",
        targetId: id,
        details: `Rejected registration for ${registration.childInfo?.firstName} ${registration.childInfo?.lastName}. Reason: ${reason || "None"}`,
        createdAt: new Date(),
      });
    }

    // Notify the parent
    let emailSent = false;
    try {
      const { childInfo, parentInfo } = registration;

      if (parentInfo?.email) {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });

        await transporter.sendMail({
          from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
          to: parentInfo.email,
          subject: `Update on ${childInfo?.firstName || "Your Child"}'s Registration — Merry Explorers`,
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
                            🎈 MERRY EXPLORERS PLAYGROUP AND LEARNING CENTER 🎈
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
                          <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 18px 0;">Hi ${parentInfo.name},</h2>

                          <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 20px 0;">
                            Thank you for your interest in enrolling <strong>${childInfo?.firstName || "your child"}</strong> at Merry Explorers. After reviewing your registration, we're unable to confirm this slot at this time.
                          </p>

                          ${reason
              ? `<div style="background-color: #fffbea; border: 2px dashed #ffd84d; border-radius: 14px; padding: 22px 24px; margin: 0 0 24px 0;">
                                  <p style="margin: 0 0 10px 0; color: #0033A0; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">📋 Reason</p>
                                  <p style="color: #475569; margin: 0; font-size: 15px; line-height: 1.6;">${reason}</p>
                                </div>`
              : ""
            }

                          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                            If you believe this was a mistake, or would like to discuss other available programs and class times, please reach out to us on our Facebook page — we're happy to help however we can.
                          </p>

                          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
                            We hope to welcome ${childInfo?.firstName || "your child"} on a future Merry Adventure. 💙
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
        emailSent = true;
      }
    } catch (emailErr) {
      console.warn("[reject] Failed to send rejection email:", emailErr);
    }

    return NextResponse.json({ success: true, emailSent });
  } catch (error: any) {
    console.error("[reject POST]", error);
    return NextResponse.json({ error: error.message || "Failed to reject" }, { status: 500 });
  }
}