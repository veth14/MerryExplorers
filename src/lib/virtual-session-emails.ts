import * as nodemailer from "nodemailer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://merry-explorers.vercel.app";

function makeTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function sendPaymentSubmittedEmail(toEmail: string, parentName: string, amountPaid: number) {
  const transporter = makeTransporter();
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Payment Received</title></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,47,118,0.12);">
        <tr><td style="background:linear-gradient(135deg,#002f76 0%,#0050d5 100%);padding:32px 40px;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">💳</div>
          <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;">Payment Received!</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:8px 0 0;">Merry Explorers Virtual Tutorial</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi <strong style="color:#002f76;">${parentName}</strong>,</p>
          <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 24px;">We have received your payment of <strong style="color:#002f76;">₱${amountPaid}</strong>. Our team is now verifying it — this usually takes a few hours.</p>
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
            <p style="color:#92400e;font-size:14px;font-weight:600;margin:0;">⏳ Your next session will be unlocked once payment is confirmed.</p>
          </div>
          <p style="color:#64748b;font-size:13px;line-height:1.7;margin:0;">You'll receive another email as soon as your payment is verified. Thank you!</p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} Merry Explorers. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  await transporter.sendMail({
    from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "💳 Payment Received — We're Verifying It",
    html,
  });
}

export async function sendPaymentVerifiedEmail(toEmail: string, parentName: string) {
  const transporter = makeTransporter();
  const loginUrl = `${APP_URL}/parent/login`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Payment Verified</title></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,47,118,0.12);">
        <tr><td style="background:linear-gradient(135deg,#047857 0%,#10b981 100%);padding:32px 40px;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">✅</div>
          <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;">Payment Verified!</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:8px 0 0;">Your next session is now unlocked</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi <strong style="color:#002f76;">${parentName}</strong>,</p>
          <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 24px;">Great news — your payment has been <strong style="color:#047857;">verified</strong>! Your next virtual tutorial session is now ready. We'll send you the session link when it's time.</p>
          <div style="text-align:center;margin:0 0 28px;">
            <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#002f76,#0050d5);color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;padding:14px 40px;border-radius:50px;box-shadow:0 6px 20px rgba(0,47,118,0.3);">Go to My Portal →</a>
          </div>
          <p style="color:#64748b;font-size:13px;line-height:1.7;margin:0;">Keep an eye on your email — your teacher will send the session link before your next class. See you soon! 🌟</p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} Merry Explorers. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  await transporter.sendMail({
    from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "✅ Payment Verified — Your Next Session is Ready!",
    html,
  });
}

export async function sendSessionLinkEmail(toEmail: string, parentName: string, _sessionLink: string, sessionTime?: string) {
  const transporter = makeTransporter();
  const loginUrl = `${APP_URL}/parent/login`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Your Session is Ready</title></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,47,118,0.12);">
        <tr><td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 40px;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">🖥️</div>
          <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;">Your Session is About to Start!</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:8px 0 0;">Merry Explorers Virtual Tutorial</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi <strong style="color:#002f76;">${parentName}</strong>,</p>
          <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 24px;">Your virtual tutorial session is ready! Log in to your Parent Portal and click the <strong>"Virtual Class"</strong> tab to access the session link.</p>
          <div style="text-align:center;margin:0 0 24px;">
            <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;padding:14px 40px;border-radius:50px;box-shadow:0 6px 20px rgba(79,70,229,0.35);">Go to My Session →</a>
          </div>
          <div style="background:#f0f5ff;border-left:4px solid #4f46e5;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
            <p style="color:#312e81;font-size:13px;font-weight:600;margin:0;">🕐 ${sessionTime ? `Your session is scheduled for <strong>${(() => {
              try {
                const d = new Date(sessionTime);
                return isNaN(d.getTime()) ? sessionTime : d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
              } catch {
                return sessionTime;
              }
            })()}</strong>. ` : ""}Please be ready a few minutes before your scheduled session time.</p>
          </div>
          <p style="color:#64748b;font-size:13px;line-height:1.7;margin:0;">After the session, a payment prompt will appear in your portal to unlock your next session.</p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} Merry Explorers. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  await transporter.sendMail({
    from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "🖥️ Your Virtual Session is Ready — Join Now!",
    html,
  });
}
