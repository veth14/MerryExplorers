import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth-guard";
import { calcRegistrationTerms, FALLBACK_PIONEER_RATES, fmtIsoDate, getManilaTodayIso, getRegistrationAdventureStart, getRegistrationTotal, getStudentSessionInfo, isRegistrationVerified, WEEKLY_INTEREST_RATE } from "@/lib/payment-terms";
import { PROGRAM_SLOTS } from "@/data/landing";
import { pioneerEmailQuery } from "@/lib/pioneer-families";
import { isReturningFamilyRecord } from "@/lib/returning-family";

export const dynamic = "force-dynamic";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]!));

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const previewOnly = body.action === "preview";
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const registration = await db.collection("student_registrations").findOne({ _id: new ObjectId(id) });
    if (!registration) return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    const email = String(registration.parentInfo?.email || "").trim();
    if (!email) return NextResponse.json({ error: "No parent email is on this registration." }, { status: 400 });

    const program = (PROGRAM_SLOTS as any)[registration.program];
    const parentEmail = (registration.parentInfo?.email || "").toLowerCase().trim();
    const pioneerFamily = parentEmail
      ? await db.collection("pioneer_families").findOne(pioneerEmailQuery(parentEmail))
      : null;
    const isPioneer = Boolean(registration.isPioneer || pioneerFamily);
    const pioneerSettings = await db.collection("settings").findOne({ _key: "pioneer_settings_v1" });
    const currentPioneerRate = Number(pioneerSettings?.pioneerPrices?.[registration.program]) || FALLBACK_PIONEER_RATES[registration.program];
    const childFirst = String(registration.childInfo?.firstName || "").trim();
    const childLast = String(registration.childInfo?.lastName || "").trim();
    const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parentAccount = parentEmail
      ? await db.collection("accounts").findOne({ email: { $regex: `^${escapeRegex(parentEmail)}$`, $options: "i" } })
      : null;
    const existingStudent = childFirst && childLast
      ? await db.collection("students").findOne({
          "childInfo.firstName": { $regex: new RegExp(`^${escapeRegex(childFirst)}(?:\\s|$)`, "i") },
          "childInfo.lastName": { $regex: new RegExp(`^${escapeRegex(childLast)}$`, "i") },
          registrationId: { $ne: id },
        })
      : null;
    const isReturningFamily = Boolean(isPioneer || registration.parentInfo?.isRenewal || registration.isNewFamily === false || existingStudent || await isReturningFamilyRecord(db, registration, id));
    const pricingRegistration = {
      ...registration,
      isPioneer,
      isNewFamily: !isReturningFamily,
      welcomeKitOrdered: isReturningFamily ? false : registration.welcomeKitOrdered,
      ...(isPioneer && currentPioneerRate ? { customRate: currentPioneerRate } : {}),
    };
    const fallbackTotal =
      (getRegistrationTotal({ ...pricingRegistration, uniformOrdered: false }, program?.rate || 0) || 0) +
      (registration.uniformOrdered ? 650 : 0);
    const amountPaid = isRegistrationVerified(registration.status)
      ? Number(registration.amountPaid || registration.amountDue || 0)
      : 0;
    const renewalSettings = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
    const adventureStart = getRegistrationAdventureStart(renewalSettings?.programs || [], registration, getManilaTodayIso());
    const student = getStudentSessionInfo(registration, parentAccount, adventureStart);
    const terms = calcRegistrationTerms(pricingRegistration, student, amountPaid, fallbackTotal);
    const total = terms.due ?? fallbackTotal;
    const balance = terms.balance ?? Math.max(0, total - amountPaid);
    const interest = Number(terms.interest) || 0;
    const weeksOfInterest = Number(terms.mondays) || 0;
    const totalPayable = terms.totalPayable ?? balance;
    if (balance === 0) {
      return NextResponse.json({ error: "This registration has no remaining balance to remind about." }, { status: 409 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://merry-explorers.vercel.app";
    const paymentUrl = `${baseUrl}/register/payment/${id}`;
    const parentName = escapeHtml(registration.parentInfo?.name || "Parent / Guardian");
    const childName = escapeHtml(registration.childInfo?.firstName || "your child");
    const programName = escapeHtml(program?.name || registration.program || "your program");

    const subject = `Payment Reminder — ${registration.childInfo?.firstName || "Your Explorer"} at Merry Explorers`;
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background-color:#eaf4ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eaf4ff;padding:32px 16px">
          <tr><td align="center">
            <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 6px 20px rgba(0,51,160,.12);border:3px solid #ffd84d">
              <tr><td style="background:#ffd84d;padding:14px 20px;text-align:center">
                <p style="margin:0;color:#0033A0;font-size:13px;font-weight:700;letter-spacing:.5px">💛 A PAYMENT REMINDER FOR YOUR EXPLORER 💛</p>
              </td></tr>
              <tr><td style="background:#0033A0;padding:36px 20px;text-align:center">
                <p style="margin:0 0 4px;font-size:40px">🎒🎈🧭</p>
                <h1 style="color:#fff;margin:0;font-size:30px;font-weight:800;letter-spacing:1px">MERRY EXPLORERS</h1>
                <p style="color:#ffd84d;margin:6px 0 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:600">Playgroup and Learning Center</p>
                <p style="color:#a3c4f3;margin:14px 0 0;font-size:15px;font-style:italic">Dream. Discover. Explore. 🤍</p>
              </td></tr>
              <tr><td style="padding:36px 40px 30px">
                <p style="text-align:center;margin:0 0 6px"><span style="font-size:46px">💛</span></p>
                <h2 style="color:#1e293b;font-size:23px;margin:0 0 8px;text-align:center">Payment Reminder</h2>
                <p style="color:#0033A0;font-size:15px;font-weight:700;margin:0 0 24px;text-align:center">${childName}’s Explorer registration</p>
                <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 22px">Hi <strong>${parentName}</strong>, our records show a remaining balance for <strong>${childName}</strong> in <strong>${programName}</strong>. Please use the payment page below to review the details and settle the amount due.</p>

                <div style="background:#f8fbff;border:1.5px solid #dbeafe;border-radius:16px;padding:20px 22px;margin:0 0 18px">
                  <p style="margin:0 0 12px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px">📋 Registration Details</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;font-weight:600;width:38%">Explorer</td><td style="padding:5px 0;color:#0033A0;font-size:13px;font-weight:700">${escapeHtml(`${registration.childInfo?.firstName || ""} ${registration.childInfo?.lastName || ""}`.trim() || "Explorer")}</td></tr>
                    <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;font-weight:600">Program</td><td style="padding:5px 0;color:#0033A0;font-size:13px;font-weight:700">${programName}</td></tr>
                    ${registration.classTime ? `<tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;font-weight:600">Class</td><td style="padding:5px 0;color:#0033A0;font-size:13px;font-weight:700">${escapeHtml(registration.classTime)}</td></tr>` : ""}
                    ${program?.sessions ? `<tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;font-weight:600">Sessions</td><td style="padding:5px 0;color:#0033A0;font-size:13px;font-weight:700">${escapeHtml(program.sessions)} Sessions</td></tr>` : ""}
                  </table>
                </div>

                <div style="background:#fffbea;border:2px dashed #ffd84d;border-radius:16px;padding:20px 22px;margin:0 0 18px">
                  <p style="margin:0 0 12px;color:#92400e;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px">💰 Payment Summary</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:5px 0;color:#78350f;font-size:13px">Total Rate${isPioneer ? " · Pioneer Family Rate" : ""}</td><td style="padding:5px 0;color:#78350f;font-size:14px;font-weight:700;text-align:right">₱${total.toLocaleString()}</td></tr>
                    <tr><td style="padding:5px 0;color:#78350f;font-size:13px">Verified Amount Paid</td><td style="padding:5px 0;color:#16a34a;font-size:14px;font-weight:700;text-align:right">₱${amountPaid.toLocaleString()} ✓</td></tr>
                    <tr><td style="padding:8px 0 4px;color:#92400e;font-size:13px;font-weight:700;border-top:1px solid #fde68a">Remaining Balance</td><td style="padding:8px 0 4px;color:#b45309;font-size:14px;font-weight:800;text-align:right;border-top:1px solid #fde68a">₱${balance.toLocaleString()}</td></tr>
                    ${interest > 0 ? `<tr><td style="padding:5px 0;color:#92400e;font-size:13px">Overdue Interest (${(WEEKLY_INTEREST_RATE * 100).toLocaleString()}% weekly${weeksOfInterest ? ` · ${weeksOfInterest} week${weeksOfInterest === 1 ? "" : "s"}` : ""})</td><td style="padding:5px 0;color:#c2410c;font-size:14px;font-weight:700;text-align:right">₱${interest.toLocaleString()}</td></tr>` : ""}
                    <tr><td style="padding:10px 0 4px;color:#92400e;font-size:14px;font-weight:800;border-top:1px solid #fde68a">Total Due Now</td><td style="padding:10px 0 4px;color:#b45309;font-size:16px;font-weight:800;text-align:right;border-top:1px solid #fde68a">₱${totalPayable.toLocaleString()}</td></tr>
                  </table>
                  ${interest > 0
                    ? `<p style="margin:12px 0 0;color:#b45309;font-size:12px;line-height:1.5">⚠️ This amount includes ${weeksOfInterest} week${weeksOfInterest === 1 ? "" : "s"} of overdue interest, charged at ${(WEEKLY_INTEREST_RATE * 100).toLocaleString()}% per week.</p>`
                    : `<p style="margin:12px 0 0;color:#b45309;font-size:12px;line-height:1.5">⚠️ The remaining balance is due on the 6th session. A ${(WEEKLY_INTEREST_RATE * 100).toLocaleString()}% weekly interest applies to overdue balances.</p>`}
                  ${terms.dueDate ? `<p style="margin:5px 0 0;color:#92400e;font-size:12px">Balance due date: ${fmtIsoDate(terms.dueDate)}</p>` : ""}
                </div>

                <p style="text-align:center;margin:24px 0 10px"><a href="${paymentUrl}" style="display:inline-block;background:#0033A0;color:#fff;padding:14px 26px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Pay Remaining Balance →</a></p>
                <p style="text-align:center;color:#64748b;font-size:12px;line-height:1.6;margin:0 0 22px">This button opens your registration payment page, where you can review and pay the remaining balance.</p>
                <p style="color:#475569;font-size:13px;line-height:1.6;margin:0">If you have already paid or need help, please reply to this email or message us on Facebook. 💛</p>
              </td></tr>
              <tr><td style="background:#eaf4ff;padding:22px 40px;text-align:center;border-top:2px dashed #ffd84d">
                <p style="color:#64748b;font-size:12px;margin:0;line-height:1.6"><strong style="color:#0033A0">Merry Explorers Center</strong><br>📍 2nd floor, Starla 88 Bldg., Camarin Road, Caloocan — near Camarin Doctors Hospital</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>`;

    if (previewOnly) {
      return NextResponse.json({ success: true, preview: { to: email, subject, html } });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: `"Merry Explorers" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });

    return NextResponse.json({ success: true, emailSent: true });
  } catch (error: any) {
    console.error("[send-reminder POST]", error);
    return NextResponse.json({ error: error.message || "Failed to send payment reminder." }, { status: 500 });
  }
}
