import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

// Same parsing logic as the frontend
function parseScheduleDays(schedule: string): number[] {
  const days: number[] = [];
  const s = schedule.toLowerCase();
  if (s.includes("monday – friday") || s.includes("monday - friday")) {
    return [1, 2, 3, 4, 5];
  }
  if (s.includes("monday")) days.push(1);
  if (s.includes("tuesday")) days.push(2);
  if (s.includes("wednesday")) days.push(3);
  if (s.includes("thursday")) days.push(4);
  if (s.includes("friday")) days.push(5);
  if (s.includes("saturday")) days.push(6);
  if (s.includes("sunday")) days.push(0);
  return days;
}

function parseStartTime(classTime: string): { hour: number; minute: number } | null {
  const match = classTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return { hour, minute: min };
}

function getNextSessionDate(schedule: string, classTime: string): Date | null {
  const days = parseScheduleDays(schedule);
  const time = parseStartTime(classTime);
  if (days.length === 0 || !time) return null;

  const now = new Date();
  let candidate = new Date(now);
  candidate.setHours(time.hour, time.minute, 0, 0);

  if (days.includes(now.getDay()) && candidate > now) {
    return candidate;
  }

  for (let i = 1; i <= 7; i++) {
    candidate = new Date(now);
    candidate.setDate(now.getDate() + i);
    if (days.includes(candidate.getDay())) {
      candidate.setHours(time.hour, time.minute, 0, 0);
      return candidate;
    }
  }
  return null;
}

export async function GET(request: Request) {
  // 1. Verify cron secret (if running in production)
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();
    
    // 2. Fetch all active parents
    const parents = await db.collection("accounts").find({ role: { $in: ["parent", "Parent"] }, status: "active" }).toArray();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const now = new Date();
    const emailsSent = [];

    for (const parent of parents) {
      if (!parent.schedule || !parent.classTime || !parent.email) continue;

      const nextSession = getNextSessionDate(parent.schedule, parent.classTime);
      if (!nextSession) continue;

      const diffHours = (nextSession.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Check if session starts in roughly 2 hours (between 1.75 and 2.0 hours from now)
      // Assuming this cron job runs every 15 minutes
      if (diffHours > 1.75 && diffHours <= 2.0) {
        
        // Prevent duplicate emails for the same session date
        const sessionDateStr = nextSession.toISOString().split("T")[0];
        const lastRemindedDate = parent.lastRemindedDate;
        if (lastRemindedDate === sessionDateStr) {
          continue; // Already reminded today
        }

        const html = `
<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,47,118,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#002f76 0%,#0050d5 100%);padding:36px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Upcoming Session Reminder</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#1e3a6e;font-size:16px;font-weight:600;">Hi ${parent.fullName.split(" ")[0]},</p>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                This is a quick reminder that <strong>${parent.childName}'s</strong> adventure with Merry Explorers starts in <strong>2 hours!</strong>
              </p>
              
              <div style="background:#f8faff;border:1px solid #e8efff;border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Program Details</p>
                <p style="margin:0 0 4px;color:#002f76;font-size:15px;font-weight:700;">${parent.program}</p>
                <p style="margin:0;color:#0050d5;font-size:14px;font-weight:600;">${parent.classTime} Philippine Standard Time (PST)</p>
              </div>

              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                We can't wait to see them! If you have any questions or are running late, feel free to contact us.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        try {
          await transporter.sendMail({
            from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
            to: parent.email,
            subject: `Reminder: ${parent.childName}'s Merry Explorers session starts in 2 hours!`,
            html: html,
          });

          // Mark as reminded so we don't send multiple emails if the cron runs twice
          await db.collection("accounts").updateOne(
            { _id: parent._id },
            { $set: { lastRemindedDate: sessionDateStr } }
          );

          emailsSent.push(parent.email);
        } catch (e) {
          console.error(`Failed to send reminder to ${parent.email}`, e);
        }
      }
    }

    return NextResponse.json({ success: true, emailsSent, timestamp: new Date() });
  } catch (error) {
    console.error("[cron/session-reminders] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
