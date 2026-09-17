// test-approve-email.js
// Standalone script to preview the redesigned Merry Explorers enrollment (approve) email.
// Sends the exact same HTML your API route sends, but skips MongoDB entirely.
//
// SETUP:
//   npm install nodemailer dotenv
//
// RUN:
//   node test-approve-email.cjs you@example.com

require("dotenv").config({ path: ".env.local" });
const nodemailer = require("nodemailer");

const toEmail = process.argv[2];
if (!toEmail) {
  console.error("Usage: node test-approve-email.cjs you@example.com");
  process.exit(1);
}

// --- Fake data standing in for a real approved registration ---
const parentInfo = { name: "Test Parent", email: toEmail };
const childInfo = { firstName: "Alex", lastName: "Santos" };
const program = "creative-explorer";
const classTime = "Morning Class";
const uniformOrdered = true;
const lanyardOrdered = false;
const registration = { amountPaid: 2991 };

const PROGRAM_NAMES = {
  "curious-explorer": "Discovery Club: Curious Explorer",
  "creative-explorer": "Discovery Club: Creative Explorer",
  "brave-explorer": "Trailblazer: Brave Explorer",
};
const PROGRAM_SCHEDULES = {
  "curious-explorer": "Monday & Wednesday",
  "creative-explorer": "Tuesday, Thursday & Friday",
  "brave-explorer": "Monday – Friday",
};
const PROGRAM_RATES = {
  "curious-explorer": { rate: 4395, downpayment: 2637, balance: 1758, sessions: 8 },
  "creative-explorer": { rate: 4985, downpayment: 2991, balance: 1994, sessions: 12 },
  "brave-explorer": { rate: 6900, downpayment: 4140, balance: 2760, sessions: 18 },
};
const PROGRAM_CLASS_TIMES = {
  "curious-explorer": {
    "Morning Class": "9:45 AM – 11:00 AM",
    "Afternoon Class": "1:30 PM – 2:45 PM",
  },
  "creative-explorer": {
    "Morning Class": "9:45 AM – 11:00 AM",
    "Mid-Day Class": "11:15 AM – 12:30 PM",
    "Afternoon Class": "1:30 PM – 2:45 PM",
  },
  "brave-explorer": {
    "Afternoon Class": "3:00 PM – 4:15 PM",
  },
};
function formatClassTime(program, classTime) {
  const time = PROGRAM_CLASS_TIMES[program]?.[classTime];
  return time ? `${classTime} (${time})` : classTime;
}

async function main() {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  await transporter.verify();
  console.log("✅ SMTP connection verified. Sending test APPROVE email...");

  const prog = PROGRAM_RATES[program];
  const programName = PROGRAM_NAMES[program] || program;
  const schedule = PROGRAM_SCHEDULES[program] || "";
  const classTimeDisplay = formatClassTime(program, classTime);
  const totalRate = (prog?.rate || 0) + (uniformOrdered ? 650 : 0);
  const amountPaid = registration.amountPaid || 0;
  const remainingBalance = totalRate - amountPaid;
  const isFullyPaid = remainingBalance <= 0;

  const info = await transporter.sendMail({
    from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🎉 ${childInfo.firstName} is Officially Enrolled at Merry Explorers! (TEST)`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #eaf4ff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eaf4ff; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table width="620" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 6px 20px rgba(0, 51, 160, 0.12); border: 3px solid #ffd84d;">

                <!-- Yellow banner strip -->
                <tr>
                  <td style="background-color: #ffd84d; padding: 14px 20px; text-align: center;">
                    <p style="margin: 0; color: #0033A0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">
                      🎉 WELCOME TO THE MERRY EXPLORERS FAMILY 🎉
                    </p>
                  </td>
                </tr>

                <!-- Header -->
                <tr>
                  <td style="background-color: #0033A0; padding: 36px 20px; text-align: center;">
                    <p style="margin: 0 0 4px 0; font-size: 40px;">🎒🎈🧭</p>
                    <h1 style="color: #ffffff; margin: 0; font-size: 30px; font-weight: 800; letter-spacing: 1px;">MERRY EXPLORERS</h1>
                    <p style="color: #ffd84d; margin: 6px 0 0 0; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Playgroup and Learning Center</p>
                    <p style="color: #a3c4f3; margin: 14px 0 0 0; font-size: 15px; font-style: italic;">Dream. Discover. Explore. 🤍</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 36px 40px 30px 40px;">

                    <p style="text-align: center; margin: 0 0 6px 0;">
                      <span style="font-size: 48px;">🎊</span>
                    </p>
                    <h2 style="color: #1e293b; font-size: 24px; margin: 0 0 4px 0; text-align: center;">Congratulations!</h2>
                    <p style="color: #0033A0; font-size: 16px; font-weight: 700; margin: 0 0 26px 0; text-align: center;">${childInfo.firstName} is officially an Explorer!</p>

                    <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 26px 0;">
                      Hi <strong>${parentInfo.name}</strong>! We're thrilled to confirm that your payment has been verified and <strong>${childInfo.firstName}</strong> is now officially enrolled at Merry Explorers. 🎉
                    </p>

                    <!-- Enrollment details card -->
                    <div style="background-color: #f8fbff; border: 1.5px solid #dbeafe; border-radius: 16px; padding: 22px 24px; margin: 0 0 20px 0;">
                      <p style="margin: 0 0 14px 0; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">📋 Enrollment Details</p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600; width: 40%;">Explorer</td><td style="padding: 6px 0; color: #0033A0; font-size: 14px; font-weight: 700;">${childInfo.firstName} ${childInfo.lastName}</td></tr>
                        <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Program</td><td style="padding: 6px 0; color: #0033A0; font-size: 14px; font-weight: 700;">${programName}</td></tr>
                        <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Class</td><td style="padding: 6px 0; color: #0033A0; font-size: 14px; font-weight: 700;">${classTimeDisplay}</td></tr>
                        <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Schedule</td><td style="padding: 6px 0; color: #0033A0; font-size: 14px; font-weight: 700;">${schedule}</td></tr>
                        <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">Sessions</td><td style="padding: 6px 0; color: #0033A0; font-size: 14px; font-weight: 700;">${prog?.sessions || "—"} Sessions</td></tr>
                      </table>
                    </div>

                    <!-- Payment summary -->
                    <div style="background-color: #fffbea; border: 2px dashed #ffd84d; border-radius: 16px; padding: 22px 24px; margin: 0 0 20px 0;">
                      <p style="margin: 0 0 14px 0; color: #92400e; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">💰 Payment Summary</p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr><td style="padding: 5px 0; color: #78350f; font-size: 13px;">Total Rate</td><td style="padding: 5px 0; color: #78350f; font-size: 14px; font-weight: 700; text-align: right;">₱${totalRate.toLocaleString()}</td></tr>
                        <tr><td style="padding: 5px 0; color: #78350f; font-size: 13px;">Amount Paid</td><td style="padding: 5px 0; color: #16a34a; font-size: 14px; font-weight: 700; text-align: right;">₱${amountPaid.toLocaleString()} ✓</td></tr>
                        <tr>
                          <td style="padding: 10px 0 4px 0; color: #92400e; font-size: 13px; font-weight: 700; border-top: 1px solid #fde68a;">Remaining Balance</td>
                          <td style="padding: 10px 0 4px 0; color: ${isFullyPaid ? "#16a34a" : "#b45309"}; font-size: 15px; font-weight: 800; text-align: right; border-top: 1px solid #fde68a;">
                            ${isFullyPaid ? "₱0 (Fully Paid)" : `₱${remainingBalance.toLocaleString()}`}
                          </td>
                        </tr>
                      </table>
                      ${!isFullyPaid ? `<p style="margin: 12px 0 0 0; color: #b45309; font-size: 12px; line-height: 1.5;">⚠️ The remaining balance is due on the 6th session. A 4% weekly interest applies to overdue balances.</p>` : ""}
                    </div>

                    <!-- Uniform reminder -->
                    <div style="background-color: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 16px; padding: 20px 24px; margin: 0 0 26px 0;">
                      <p style="margin: 0 0 8px 0; color: #166534; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">👕 Uniform Reminder</p>
                      <p style="margin: 0; color: #15803d; font-size: 13px; line-height: 1.6;">Uniform days are <strong>Wednesday &amp; Friday</strong>. On all other days, children may wear anything comfortable and appropriate for active play.</p>
                      ${uniformOrdered ? `<p style="margin: 8px 0 0 0; color: #15803d; font-size: 13px;">✅ Uniform kit ordered — we'll prepare it for you!</p>` : ""}
                      ${lanyardOrdered ? `<p style="margin: 4px 0 0 0; color: #15803d; font-size: 13px;">✅ Lanyard &amp; Name Tag ordered.</p>` : ""}
                    </div>

                    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
                      We can't wait to see <strong>${childInfo.firstName}</strong> start this amazing adventure! If you have any questions, message us on Facebook. 💛
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #eaf4ff; padding: 22px 40px; text-align: center; border-top: 2px dashed #ffd84d;">
                    <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.6;">
                      <strong style="color: #0033A0;">Merry Explorers Center</strong><br>
                      📍 2nd floor, Starla 88 Bldg., Camarin Road, Caloocan — near Camarin Doctors Hospital
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

  console.log("✅ Sent! Message ID:", info.messageId);
  console.log(`Check the inbox for ${toEmail}`);
}

main().catch((err) => {
  console.error("❌ Failed to send test email:", err);
  process.exit(1);
});
