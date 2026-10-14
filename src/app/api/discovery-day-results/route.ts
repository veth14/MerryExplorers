import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { parentName, email, childName, childAge, scores, finalProgram, attempted } = data;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const newResult = {
      parentName: parentName || "Parent",
      email,
      childName: childName || "",
      childAge: childAge || "",
      scores,
      finalProgram,
      attempted,
      status: "New",
      createdAt: new Date(),
    };

    // 1. Save to database
    await db.collection("discovery_day_results").insertOne(newResult);

    // 2. Admin Notification
    await db.collection("notifications").insertOne({
      title: "New Discovery Day Quiz Result",
      message: `${parentName || "A parent"} completed the quiz. Best fit: ${finalProgram}.`,
      type: "info",
      read: false,
      createdAt: new Date(),
      link: "/admin/inquiries", // Assuming teachers check leads here
    });

    // 3. Send Email to Parent
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Program metadata
    const PROGRAM_META: Record<string, { title: string; subtitle: string; ageRange: string; description: string }> = {
      curious: {
        title: "Curious Explorer",
        subtitle: "Discovery Club · Supported Learning",
        ageRange: "Ages 1.6 – 4.11 years",
        description: "Ideal for little ones starting their learning journey who thrive in a nurturing environment with gentle guidance and a familiar adult nearby.",
      },
      creative: {
        title: "Creative Explorer",
        subtitle: "Discovery Club · Independent Learning",
        ageRange: "Ages 2.6 – 4.11 years",
        description: "Great for explorers who can engage independently, follow simple instructions, and participate with confidence alongside peers and teachers.",
      },
      trailblazer: {
        title: "Trailblazer",
        subtitle: "Brave Explorer · Classroom Readiness",
        ageRange: "Ages 3 – 4.11 years",
        description: "Designed to prepare children for structured classroom environments, building sitting stamina, fine-motor dexterity, and teacher-led participation.",
      },
    };

    const programInfo = PROGRAM_META[finalProgram] || {
      title: finalProgram ? finalProgram.charAt(0).toUpperCase() + finalProgram.slice(1) : "Discovery Club",
      subtitle: "Playgroup & Learning Center",
      ageRange: childAge || "Early Childhood",
      description: "A tailored playgroup program supporting your child's developmental milestones.",
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://merry-explorers.vercel.app";
    const bookingUrl = `${baseUrl}/inquire?program=${encodeURIComponent(programInfo.title)}&child=${encodeURIComponent(childName || "")}`;

    const attemptedList = Array.isArray(attempted) && attempted.length > 0
      ? attempted
      : Object.keys(scores || { [finalProgram]: 10 });

    const scoreRows = attemptedList.map((key: string) => {
      const meta = PROGRAM_META[key] || { title: key.toUpperCase(), subtitle: "" };
      const scoreVal = scores?.[key] ?? 0;
      const isRecommended = key === finalProgram;
      const percentage = Math.min(100, Math.max(0, (scoreVal / 10) * 100));

      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
            <div style="font-weight: 700; color: #0033A0; font-size: 14px;">
              ${meta.title} ${isRecommended ? '<span style="background-color: #ffd84d; color: #0033A0; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 999px; margin-left: 6px; letter-spacing: 0.5px;">BEST FIT ⭐</span>' : ''}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${meta.subtitle}</div>
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; width: 140px;">
            <div style="font-weight: 800; color: #1e293b; font-size: 15px; margin-bottom: 4px;">${scoreVal} / 10</div>
            <div style="background-color: #e2e8f0; border-radius: 999px; height: 6px; width: 100%; overflow: hidden;">
              <div style="background-color: ${isRecommended ? '#0033A0' : '#94a3b8'}; height: 6px; width: ${percentage}%; border-radius: 999px;"></div>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    const htmlContent = `
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
                      🎈 DISCOVERY DAY FIT SCORE RESULTS 🎈
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
                    <h2 style="color: #1e293b; font-size: 23px; margin: 0 0 14px 0;">Hello ${parentName || "Explorer Parent"}! 👋</h2>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 22px 0;">
                      Thank you for taking the <strong>Merry Explorers Play &amp; Learning Fit Score quiz</strong>${childName ? ` for <strong>${childName}</strong>` : ""}! Based on your observations, here is the program recommendation tailored to your little explorer's current development:
                    </p>

                    <!-- Hero Recommended Fit Box -->
                    <div style="background-color: #0033A0; border-radius: 18px; padding: 26px 22px; text-align: center; color: #ffffff; margin: 0 0 22px 0; border: 3px solid #ffd84d; box-shadow: 0 6px 16px rgba(0, 51, 160, 0.18);">
                      <p style="margin: 0 0 6px 0; color: #7dd3fc; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
                        ${childName ? `${childName.toUpperCase()}'S RECOMMENDED BEST FIT` : "RECOMMENDED BEST FIT"}
                      </p>
                      <h2 style="margin: 0 0 6px 0; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">${programInfo.title}</h2>
                      <p style="margin: 0 0 14px 0; color: #ffd84d; font-size: 13px; font-weight: 700;">${programInfo.subtitle}</p>
                      <div style="background-color: rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 12px 16px; margin-top: 10px;">
                        <p style="margin: 0; color: #f1f5f9; font-size: 13.5px; line-height: 1.6;">${programInfo.description}</p>
                      </div>
                    </div>

                    <!-- Profile summary -->
                    <div style="background-color: #f8fbff; border: 1.5px solid #dbeafe; border-radius: 14px; padding: 18px 20px; margin: 0 0 22px 0;">
                      <p style="margin: 0 0 12px 0; color: #0033A0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">📋 Explorer Profile</p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13.5px;">
                        ${childName ? `<tr><td style="padding: 4px 0; color: #64748b; width: 140px;"><strong>Explorer:</strong></td><td style="padding: 4px 0; font-weight: bold; color: #0033A0;">${childName}</td></tr>` : ''}
                        ${childAge ? `<tr><td style="padding: 4px 0; color: #64748b; width: 140px;"><strong>Age Group:</strong></td><td style="padding: 4px 0; font-weight: bold; color: #1e293b;">${childAge}</td></tr>` : ''}
                        <tr><td style="padding: 4px 0; color: #64748b; width: 140px;"><strong>Target Program:</strong></td><td style="padding: 4px 0; font-weight: bold; color: #0033A0;">${programInfo.title}</td></tr>
                        <tr><td style="padding: 4px 0; color: #64748b; width: 140px;"><strong>Age Fit:</strong></td><td style="padding: 4px 0; font-weight: bold; color: #1e293b;">${programInfo.ageRange}</td></tr>
                      </table>
                    </div>

                    <!-- Scores Table -->
                    <div style="background-color: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin: 0 0 22px 0;">
                      <div style="background-color: #f8fbff; padding: 12px 18px; border-bottom: 1.5px solid #e2e8f0;">
                        <p style="margin: 0; color: #0033A0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">📊 Fit Score Breakdown</p>
                      </div>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        ${scoreRows}
                      </table>
                    </div>

                    <!-- Quoted reminder note -->
                    <div style="background-color: #fffbea; border: 2px dashed #ffd84d; border-radius: 14px; padding: 20px 22px; margin: 0 0 26px 0;">
                      <p style="margin: 0 0 8px 0; color: #0033A0; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">💛 One Important Reminder</p>
                      <p style="color: #475569; margin: 0 0 8px 0; font-size: 14px; line-height: 1.6; font-style: italic;">
                        &ldquo;The goal isn&apos;t to fit the child into a program. The goal is to find the program that fits the child.&rdquo;
                      </p>
                      <p style="color: #64748b; margin: 0; font-size: 13px; line-height: 1.6;">
                        Our teachers will also observe and consider how your child responds in person during the actual Discovery Day experience.
                      </p>
                    </div>

                    <!-- CTA button -->
                    <div style="text-align: center; margin: 28px 0 12px 0;">
                      <a href="${bookingUrl}" style="display: inline-block; background-color: #ffd84d; color: #0033A0; font-size: 16px; font-weight: 800; text-decoration: none; padding: 16px 36px; border-radius: 16px; border: 3px solid #0033A0; box-shadow: 0 5px 0 #0033A0;">
                        Book Discovery Day &rarr;
                      </a>
                      <p style="margin: 12px 0 0 0; font-size: 13px; color: #64748b;">
                        Or reply directly to this email to book your child&apos;s trial slot!
                      </p>
                    </div>

                    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                      Warmly,<br/>
                      <strong style="color: #0033A0;">The Merry Explorers Team</strong>
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
    `;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail({
        from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `🌟 Discovery Day Fit Score: ${programInfo.title} for ${childName || "Your Little Explorer"}`,
        html: htmlContent,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving discovery day result:", error);
    return NextResponse.json({ error: "Failed to save results" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const results = await db
      .collection("discovery_day_results")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const serialized = results.map((r) => ({
      id: r._id.toString(),
      parentName: r.parentName,
      email: r.email,
      childName: r.childName || "",
      childAge: r.childAge || "",
      scores: r.scores,
      finalProgram: r.finalProgram,
      attempted: r.attempted,
      status: r.status || "New",
      createdAt: r.createdAt,
    }));

    return NextResponse.json({ success: true, data: serialized });
  } catch (error: any) {
    console.error("Error fetching discovery day results:", error);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}
