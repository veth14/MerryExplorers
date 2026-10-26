import { NextResponse } from "next/server";
import { ObjectId } from "mongodb"; // NEW
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { getAdventureCycleRegistrationQuery, getTargetRegistrationAdventureNumber, getRegistrationAdventureStartDate, getProgramAdventureSetting } from "@/lib/adventure-cycle";
import { BALLET, PROGRAM_SLOTS } from "@/data/landing";
import { v2 as cloudinary } from "cloudinary";
import nodemailer from "nodemailer";
import { isReturningFamilyRecord, findReturningFamilyMatch } from "@/lib/returning-family";
import { pioneerEmailQuery } from "@/lib/pioneer-families";
import { activeRegistrationSlotQuery, countUniqueActiveRegistrationSlots } from "@/lib/registration-slots";
import { isPlausiblePersonName, formatPersonName } from "@/lib/person-name-validation";

export const dynamic = "force-dynamic";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET /api/registrations — Admin only, lists all registrations
export async function GET(request: Request) {
  const t0 = Date.now();
  const deny = await requireInternalAuth(request);
  if (deny) return deny;
  const tAuth = Date.now();

  try {
    const { db } = await connectToDatabase();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    const query = status && status !== "all" ? { status } : {};

    // Run all 3 DB reads in parallel instead of sequentially
    const [registrations, knownStudents, existingRenewalFamilies] = await Promise.all([
      db
        .collection("student_registrations")
        .find(query, {
          projection: {
            status: 1, program: 1, classTime: 1, submittedAt: 1,
            adventureNumber: 1, period: 1, adventureStartDate: 1,
            parentInfo: 1, childInfo: 1, emergencyContact: 1,
            paymentMethod: 1, paymentType: 1, amountDue: 1, amountPaid: 1,
            creditBalance: 1, previousAdventureBalance: 1, referenceNumber: 1,
            receiptUrl: 1, signatureUrl: 1, photoConsent: 1,
            uniformOrdered: 1, welcomeKitOrdered: 1, isPioneer: 1,
            customRate: 1, isNewFamily: 1, familyTypeOverride: 1,
            reservedUntil: 1, paymentDeadline: 1, approvedAt: 1, approvedBy: 1,
            rejectionReason: 1, confirmationEmailSent: 1, earlyBirdAt: 1, earlyBirdBy: 1,
            paymentPortalOpen: 1, paymentPortalOpenedAt: 1,
            selfDeclaredPreviousAdventure: 1, detectedPreviousAdventure: 1,
            unmatchedFamily: 1, familyId: 1,
          },
        })
        .sort({ submittedAt: -1 })
        .toArray(),
      db.collection("students").find({}, {
        projection: { "childInfo.firstName": 1, "childInfo.lastName": 1, "parentInfo.name": 1, "parentInfo.phone": 1, registrationId: 1 },
      }).toArray(),
      db.collection("renewal_families").find({
        renewalStatus: { $in: ["submitted", "reserved", "confirmed", "paid"] },
      }, {
        projection: { parentName: 1, phone: 1, parentEmail: 1 },
      }).toArray(),
    ]);
    const tDb = Date.now();

    const familyIdentityKeys = (parentInfo: any, childInfo: any) => {
      const parentName = String(parentInfo?.name || "").trim().toLowerCase().replace(/\s+/g, " ");
      const phone = String(parentInfo?.phone || "").replace(/\D/g, "");
      const childName = `${childInfo?.firstName || ""} ${childInfo?.lastName || ""}`.trim().toLowerCase().replace(/\s+/g, " ");
      return [parentName ? `name:${parentName}` : "", phone ? `phone:${phone}` : "", childName ? `child:${childName}` : ""].filter(Boolean);
    };
    const returningStudentRegistrations = new Map<string, Set<string>>();
    for (const student of knownStudents) {
      for (const key of familyIdentityKeys(student.parentInfo, student.childInfo)) {
        const registrationIds = returningStudentRegistrations.get(key) || new Set<string>();
        if (student.registrationId) registrationIds.add(String(student.registrationId));
        returningStudentRegistrations.set(key, registrationIds);
      }
    }

    const formatted = registrations.map((r) => {
      const identityKeys = familyIdentityKeys(r.parentInfo, r.childInfo);
      const hasDifferentStudentRegistration = identityKeys.some((key) => {
        const linkedStudentRegistrations = returningStudentRegistrations.get(key);
        return Boolean(linkedStudentRegistrations?.size && !linkedStudentRegistrations.has(r._id.toString()));
      });
      const parentName = String(r.parentInfo?.name || "").trim().toLowerCase();
      const parentPhone = String(r.parentInfo?.phone || "").replace(/\D/g, "");
      const submittedAt = new Date(r.submittedAt || 0).getTime();
      const hasPriorFamilyRegistration = registrations.some((previous) => {
        if (previous._id.toString() === r._id.toString() || !["approved", "active", "early-bird", "scholar"].includes(previous.status)) return false;
        if (new Date(previous.submittedAt || 0).getTime() >= submittedAt) return false;
        const previousParentName = String(previous.parentInfo?.name || "").trim().toLowerCase();
        const previousPhone = String(previous.parentInfo?.phone || "").replace(/\D/g, "");
        const sameParent = (parentName && parentName === previousParentName) || (parentPhone && parentPhone === previousPhone);
        return Boolean(sameParent);
      });
      const hasRenewalFamilyMatch = existingRenewalFamilies.some((family) => {
        const familyParentName = String(family.parentName || "").trim().toLowerCase();
        const familyPhone = String(family.phone || "").replace(/\D/g, "");
        const sameParent = (parentName && parentName === familyParentName) || (parentPhone && parentPhone === familyPhone);
        return Boolean(sameParent);
      });
      const inferredReturningFamily = r.isNewFamily === false || Boolean(r.isPioneer || r.parentInfo?.isRenewal) || hasDifferentStudentRegistration || hasPriorFamilyRegistration || hasRenewalFamilyMatch;
      const isNewFamily = typeof r.familyTypeOverride === "boolean" ? r.familyTypeOverride : !inferredReturningFamily;
      return {
        ...r,
        isNewFamily,
        id: r._id.toString(),
        _id: undefined,
      };
    });

    const tTotal = Date.now();
    console.log(`[perf] GET /api/registrations — auth:${tAuth - t0}ms db:${tDb - tAuth}ms total:${tTotal - t0}ms count:${registrations.length}`);

    return NextResponse.json({ success: true, data: formatted }, {
      headers: {
        // private = browser-only cache, safe for authenticated responses (no CDN sharing)
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (error: any) {
    console.error("[registrations GET]", error);
    return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 500 });
  }
}

// POST /api/registrations — Public, submit new registration
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      program,
      classTime,
      parentInfo,
      childInfo,
      emergencyContact,
      paymentMethod,
      receiptBase64,
      photoConsent,
      signatureBase64,
      uniformOrdered,
      lanyardOrdered,
      welcomeKitOrdered,
      paymentType,
      amountDue,
      amountPaid,
      creditBalance,
      referenceNumber,
      leadId, // NEW — sent by the register page after the Details step
      isRenewal,
      promoCode,
      selfDeclaredPreviousAdventure,
    } = data;

    // Validate required fields
    if (!program || !classTime || !parentInfo?.email || !parentInfo?.name || !childInfo?.firstName || (program !== "brave-explorer" && !signatureBase64)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Automatically format names into clean Title Case (prevents ALL CAPS or all-lowercase)
    if (parentInfo?.name) parentInfo.name = formatPersonName(parentInfo.name);
    if (childInfo?.firstName) childInfo.firstName = formatPersonName(childInfo.firstName);
    if (childInfo?.lastName) childInfo.lastName = formatPersonName(childInfo.lastName);
    if (childInfo?.nickname) childInfo.nickname = formatPersonName(childInfo.nickname);
    if (emergencyContact?.name) emergencyContact.name = formatPersonName(emergencyContact.name);

    if (!isPlausiblePersonName(parentInfo.name, true)) {
      return NextResponse.json({ error: "Please enter the parent or guardian’s real full name." }, { status: 400 });
    }
    if (!isPlausiblePersonName(childInfo.firstName) || !isPlausiblePersonName(childInfo.lastName)) {
      return NextResponse.json({ error: "Please enter the child’s real first and last name." }, { status: 400 });
    }
    if (emergencyContact?.name && !isPlausiblePersonName(emergencyContact.name, true)) {
      return NextResponse.json({ error: "Please enter the emergency contact’s real full name." }, { status: 400 });
    }

    const submittedPromoCode = String(promoCode || "").trim().replace(/^[“"']+|[”"':]+$/g, "");
    if (submittedPromoCode.toUpperCase() === "A1RENEWAL2026" && Date.now() > new Date("2026-10-16T13:00:00+08:00").getTime()) {
      return NextResponse.json({
        error: "A1RENEWAL2026 expired on October 16, 2026 at 1:00 PM (Manila time). If you already registered, open your existing payment page to renew your reservation for 24 hours if a slot is available.",
      }, { status: 410 });
    }

    // Payment receipt upload has been moved to the second step of the flow.
    let receiptUrl = "";
    let receiptPublicId = "";

    // Upload signature to Cloudinary
    let signatureUrl = "";
    let signaturePublicId = "";
    if (signatureBase64) {
      try {
        const uploadResult = await cloudinary.uploader.upload(signatureBase64, {
          folder: "merry_explorers_signatures",
          resource_type: "image",
        });
        signatureUrl = uploadResult.secure_url;
        signaturePublicId = uploadResult.public_id;
      } catch (err: any) {
        console.error("[registrations POST] Cloudinary signature upload failed:", err);
        return NextResponse.json({ error: "Failed to upload signature. Please try again." }, { status: 500 });
      }
    }


    const { db } = await connectToDatabase();

    const renewalSettingsDoc = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
    const adventureSettings = (renewalSettingsDoc?.programs || []) as Array<{
      programKey: string;
      currentAdventure?: number;
      adventureStartDate?: string | null;
      nextAdventureStart?: string | null;
    }>;
    const adventureSetting = getProgramAdventureSetting(program, adventureSettings);
    const adventureNumber = adventureSetting ? getTargetRegistrationAdventureNumber(program, adventureSettings) : null;
    const adventureStartDate = adventureSetting
      ? getRegistrationAdventureStartDate(program, adventureSettings)
      : null;
    const cycleQuery: Record<string, unknown>[] = adventureNumber === null
      ? []
      : getAdventureCycleRegistrationQuery(adventureNumber, adventureStartDate);

    // Build slot config dynamically from PROGRAM_SLOTS + DB classSlots overrides.
    // This means changing max slots in the Programs UI is immediately enforced here too.
    const dbClassSlots: Record<string, Record<string, { maxSlots?: number }>> =
      renewalSettingsDoc?.classSlots && typeof renewalSettingsDoc.classSlots === "object"
        ? renewalSettingsDoc.classSlots
        : {};

    const programConfig: Record<string, { classes: Record<string, number> }> = {};
    for (const [progId, config] of Object.entries(PROGRAM_SLOTS)) {
      const classes: Record<string, number> = {};
      for (const cls of (config as any).classes) {
        const dbOverride = dbClassSlots[progId]?.[cls.name];
        classes[cls.name] = typeof dbOverride?.maxSlots === "number" ? dbOverride.maxSlots : cls.maxSlots;
      }
      programConfig[progId] = { classes };
    }

    // Check if the specific class or program is closed by admin
    if (adventureSetting?.registrationOpen === false) {
      return NextResponse.json({ error: `Registration for this program is currently closed.` }, { status: 409 });
    }
    if (Array.isArray((adventureSetting as any)?.closedClasses) && (adventureSetting as any).closedClasses.includes(classTime)) {
      return NextResponse.json({ error: `Sorry, registration for ${classTime} is currently closed.` }, { status: 409 });
    }

    const maxSlots = programConfig[program]?.classes[classTime];
    if (maxSlots !== undefined) {
      const now = new Date();
      const takenSlots = await countUniqueActiveRegistrationSlots(
        db.collection("student_registrations"),
        activeRegistrationSlotQuery({ program, classTime, cycleQuery, now })
      );
      if (takenSlots >= maxSlots) {
        return NextResponse.json({ error: `Sorry, ${classTime} for this program is now full.` }, { status: 409 });
      }
    }

    // ── Duplicate registration guard ──────────────────────────────────────────
    // Prevent the same child from being registered twice in this cycle, even
    // when a second parent uses a different email address.
    const emailForDupe = (parentInfo?.email || "").toLowerCase().trim();
    const childFirstForDupe = (childInfo?.firstName || "").trim();
    if (emailForDupe && childFirstForDupe) {
      const childLastForDupe = (childInfo?.lastName || "").trim();
      const childDobForDupe = (childInfo?.dateOfBirth || "").trim();
      const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const identityQuery = childLastForDupe
        ? {
          "childInfo.firstName": { $regex: new RegExp(`^${escapeRegex(childFirstForDupe)}$`, "i") },
          "childInfo.lastName": { $regex: new RegExp(`^${escapeRegex(childLastForDupe)}$`, "i") },
          ...(childDobForDupe ? { "childInfo.dateOfBirth": childDobForDupe } : {}),
        }
        : {
          "parentInfo.email": { $regex: new RegExp(`^${escapeRegex(emailForDupe)}$`, "i") },
          "childInfo.firstName": { $regex: new RegExp(`^${escapeRegex(childFirstForDupe)}$`, "i") },
        };
      const existing = await db.collection("student_registrations").findOne({
        ...identityQuery,
        ...(cycleQuery.length ? { $or: cycleQuery } : {}),
        status: { $in: ["pending", "approved", "reserved", "expired"] },
      }, { sort: { submittedAt: -1 } });
      if (existing) {
        const existingId = existing._id.toString();
        return NextResponse.json({
          error: `A registration for ${childFirstForDupe} was already found for Adventure ${adventureNumber ?? 2}. Continue from its payment page: /register/payment/${existingId}`,
          duplicateRegistrationId: existingId,
          duplicateRegistrationSubmittedAt: existing.submittedAt || null,
          duplicateRegistrationExpired: existing.status === "expired" || Boolean(existing.reservedUntil && new Date(existing.reservedUntil).getTime() <= Date.now()),
          duplicateRegistrationPromoCode: existing.promoCode || null,
        }, { status: 409 });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const rawPromoCode = (promoCode || "").trim();
    const cleanPromoCode = rawPromoCode.replace(/^[“"']+|[”"':]+$/g, "").trim();
    const isScholar =
      cleanPromoCode === "A1JesusLovesMe2026" ||
      rawPromoCode === "A1JesusLovesMe2026" ||
      rawPromoCode === "A1JesusLovesMe2026:”" ||
      rawPromoCode === 'A1JesusLovesMe2026:"';
    const isPriorityReservation = cleanPromoCode.toUpperCase() === "A1RENEWAL2026";
    // Trailblazer-at-Creative-Explorer-pioneer-price promo
    const isTrailblazerCreativePioneer = cleanPromoCode.toUpperCase() === "TRAILBLAZER2CREATIVE";
    const reservedUntil = isScholar
      ? new Date("2099-12-31T23:59:59+08:00")
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Auto-detect pioneer status if not explicitly passed
    let isPioneer = Boolean(data.isPioneer);
    let customRate = data.customRate ? Number(data.customRate) : undefined;
    // TRAILBLAZER2CREATIVE: force customRate to 4820 (Creative Explorer pioneer price)
    if (isTrailblazerCreativePioneer && !customRate) {
      customRate = 4820;
      isPioneer = true;
    }
    const parentEmailClean = (parentInfo?.email || "").toLowerCase().trim();
    if (!isPioneer && parentEmailClean) {
      const pioneerCheck = await db.collection("pioneer_families").findOne(pioneerEmailQuery(parentEmailClean));
      if (pioneerCheck) {
        isPioneer = true;
        if (!customRate) {
          const pioneerSettingsDoc = await db.collection("settings").findOne({ _key: "pioneer_settings_v1" });
          if (pioneerSettingsDoc?.pioneerPrices?.[program]) {
            customRate = pioneerSettingsDoc.pioneerPrices[program];
          } else if (pioneerSettingsDoc?.pioneerPrice) {
            customRate = pioneerSettingsDoc.pioneerPrice;
          }
        }
      }
    }

    const isNoUniformProgram = ["ballet", "saturday-playdate", "virtual-session", "virtual-tutorial"].includes(program);

    // Existing students remain returning families when a parent registers with a new email.
    const returningMatch = await findReturningFamilyMatch(db, { childInfo, parentInfo });
    const existingStudent = returningMatch.isReturning;
    const isReturningFamily = Boolean(isPioneer || isRenewal || data.isNewFamily === false || existingStudent || selfDeclaredPreviousAdventure);

    const newRegistration = {
      status: isScholar ? "approved" : "reserved",
      reservedUntil,
      program,
      classTime,
      parentInfo: isRenewal ? { ...parentInfo, isRenewal: true } : parentInfo,
      childInfo,
      emergencyContact: emergencyContact || {},
      paymentMethod: isScholar ? "Scholarship (A1JesusLovesMe2026)" : (paymentMethod || ""),
      paymentType: isScholar ? "full" : (paymentType || "downpayment"),
      amountDue: isScholar ? 0 : (amountDue || 0),
      amountPaid: isScholar ? 0 : (amountPaid || 0),
      creditBalance: creditBalance || 0,
      referenceNumber: isScholar ? "SCHOLAR-A1JesusLovesMe2026" : (referenceNumber || ""),
      receiptUrl: "", // Uploaded in next step
      receiptPublicId: "", // Uploaded in next step
      signatureUrl,
      signaturePublicId,
      photoConsent,
      uniformOrdered: isNoUniformProgram ? false : (uniformOrdered || false),
      lanyardOrdered: isNoUniformProgram ? false : (lanyardOrdered || false),
      welcomeKitOrdered: (isReturningFamily || isNoUniformProgram) ? false : (welcomeKitOrdered || false),
      isNewFamily: !isReturningFamily,
      isPioneer,
      customRate: isScholar ? 0 : (customRate || null),
      notes: isScholar
        ? "Scholar Registration (Promo code: A1JesusLovesMe2026 — 100% tuition sponsored, no payment needed)"
        : isTrailblazerCreativePioneer
        ? "Special Rate (Promo code: TRAILBLAZER2CREATIVE — Trailblazer slot at Creative Explorer Pioneer Price ₱4,820)"
        : "",
      submittedAt: new Date(),
      ...(adventureNumber !== null ? { adventureNumber, period: `adventure-${adventureNumber}`, adventureStartDate } : {}),
      approvedAt: isScholar ? new Date() : null,
      approvedBy: isScholar ? "system (scholar code: A1JesusLovesMe2026)" : null,
      confirmationEmailSent: false,
      leadId: leadId || null,
      promoCode: isScholar ? "A1JesusLovesMe2026" : isPriorityReservation ? "A1RENEWAL2026" : isTrailblazerCreativePioneer ? "TRAILBLAZER2CREATIVE" : null,
      isPromoRegistration: isScholar || isPriorityReservation || isTrailblazerCreativePioneer,
      isScholar,
      selfDeclaredPreviousAdventure: Boolean(selfDeclaredPreviousAdventure || returningMatch.isReturning),
      detectedPreviousAdventure: returningMatch.previousAdventureNumber || null,
      previousProgram: returningMatch.previousProgram || null,
    };

    const result = await db.collection("student_registrations").insertOne(newRegistration);

    // NEW — mark the lead as converted. Never block the registration if this fails.
    if (leadId && ObjectId.isValid(leadId)) {
      try {
        await db.collection("leads").updateOne(
          { _id: new ObjectId(leadId) },
          {
            $set: {
              status: "converted",
              registrationId: result.insertedId.toString(),
              program,
              classTime,
              updatedAt: new Date(),
            },
          }
        );
      } catch (err) {
        console.error("[registrations POST] Failed to mark lead as converted:", err);
      }
    }

    // Match against renewal_families list (Task 5: Auto-match email + child's name)
    try {
      const parentEmailClean = (parentInfo?.email || "").toLowerCase().trim();
      const childNameClean = `${childInfo?.firstName || ""} ${childInfo?.lastName || ""}`.trim();
      if (parentEmailClean && childNameClean) {
        const familyMatch = await db.collection("renewal_families").findOne({
          parentEmail: parentEmailClean,
          childName: { $regex: new RegExp(`^${childNameClean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        });

        if (familyMatch) {
          await db.collection("renewal_families").updateOne(
            { _id: familyMatch._id },
            {
              $set: {
                renewalStatus: amountPaid > 0 ? "confirmed" : "reserved",
                registrationId: result.insertedId.toString(),
                updatedAt: new Date(),
              },
            }
          );
        } else {
          // Flag registration as unmatched so admin can review and link
          await db.collection("student_registrations").updateOne(
            { _id: result.insertedId },
            { $set: { unmatchedFamily: true } }
          );
        }
      }
    } catch (familyMatchErr) {
      console.error("[registrations POST] Failed to match renewal family:", familyMatchErr);
    }

    // Send instant confirmation and payment reminder email to returning / reserving families
    if (parentInfo?.email) {
      try {
        // Fetch program configuration & adventure start date
        const storedPrograms: Array<{ programKey: string; currentAdventure: number; adventureStartDate?: string | null; nextAdventureStart: string | null }> = renewalSettingsDoc?.programs || [];

        const programKeyMap: Record<string, string> = {
          "curious-explorer": "Discovery Club: Curious Explorer",
          "creative-explorer": "Discovery Club: Creative Explorer",
          "everyday-curious": "Discovery Club: Everyday Explorer",
          "brave-explorer": "Trailblazer: Brave Explorer",
          "ballet": "Ballet",
          "saturday-playdate": "Saturday Playdate",
          "virtual-session": "Virtual Tutorial",
        };

        const readableProgramName = programKeyMap[program] || program;
        const matchedProg = storedPrograms.find((p) =>
          p.programKey.toLowerCase().includes(readableProgramName.toLowerCase()) ||
          readableProgramName.toLowerCase().includes(p.programKey.toLowerCase())
        ) || storedPrograms[0];

        const isAdvProg = !["ballet", "virtual-session"].includes(program);
        const advNum = adventureNumber ?? 2;
        const advLabel = isAdvProg ? `Adventure ${advNum}` : readableProgramName;
        const advStartDateStr = (matchedProg?.nextAdventureStart || matchedProg?.adventureStartDate)
          ? new Date(matchedProg.nextAdventureStart || matchedProg.adventureStartDate!).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
          : null;

        const auth = process.env.GMAIL_CLIENT_ID
          ? {
            type: "OAuth2",
            user: "merryexplorerscenter@gmail.com",
            clientId: process.env.GMAIL_CLIENT_ID,
            clientSecret: process.env.GMAIL_CLIENT_SECRET,
            refreshToken: process.env.GMAIL_REFRESH_TOKEN,
          }
          : {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          };

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: auth as any,
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://merry-explorers.vercel.app";
        const paymentUrl = `${baseUrl}/register/payment/${result.insertedId.toString()}`;
        const reservationDeadlineText = !isScholar && reservedUntil > new Date()
          ? reservedUntil.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "long", timeStyle: "short" })
          : null;
        const parentName = parentInfo.name || "Parent / Guardian";
        const childName = childInfo?.firstName || "Explorer";

        const emailSubject = isScholar
          ? `Scholarship Slot Confirmed: ${readableProgramName} for ${childName} 🎓✨`
          : isAdvProg
            ? `Payment Reminder & Slot Confirmation: ${readableProgramName} (${advLabel}) for ${childName} 🌈`
            : program === "ballet"
              ? `Payment Reminder & Slot Confirmation: Ballet (${classTime || "Saturday"}) for ${childName} 🩰`
              : program === "saturday-playdate"
                ? `Payment Reminder & Slot Confirmation: Saturday Playdate for ${childName} 🛝`
                : `Payment Reminder & Slot Confirmation: Virtual Tutorial for ${childName} 💻`;

        await transporter.sendMail({
          from: `"Merry Explorers" <merryexplorerscenter@gmail.com>`,
          to: parentInfo.email,
          subject: emailSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
              <div style="background-color: #002f76; padding: 24px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 20px; font-weight: bold;">Merry Explorers Playgroup Learning Center</h1>
                <p style="margin: 4px 0 0; font-size: 13px; color: #ffb800; font-weight: bold;">${isScholar ? "🎓 Scholarship Slot Confirmed" : `Slot Reservation & Payment Confirmation · ${isAdvProg ? advLabel : readableProgramName}`}</p>
              </div>
              <div style="padding: 28px;">
                <p>Dear <strong>${parentName}</strong>,</p>
                <p>${isScholar
              ? `We are delighted to confirm that <strong>${childName}</strong> is registered under our <strong>Scholarship Program</strong>! 100% of the tuition fee is sponsored, and your slot is officially secured.`
              : `Thank you for submitting your registration for <strong>${childName}</strong>! Your slot has been received and is currently held on reservation.`
            }</p>

                <!-- Specific Program & Schedule Details Box -->
                <div style="background-color: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 14px; padding: 18px 20px; margin: 20px 0;">
                  <p style="margin: 0 0 10px; font-size: 12px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">📋 Confirmed Registration Details</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13.5px; color: #1e293b;">
                    <tr>
                      <td style="padding: 4px 0; color: #64748b; width: 140px;"><strong>Explorer:</strong></td>
                      <td style="padding: 4px 0; font-weight: bold; color: #002f76;">${childName} ${childInfo?.lastName || ""}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #64748b;"><strong>Program:</strong></td>
                      <td style="padding: 4px 0; font-weight: bold; color: #002f76;">${readableProgramName}</td>
                    </tr>
                    ${classTime ? `
                    <tr>
                      <td style="padding: 4px 0; color: #64748b;"><strong>Class / Session:</strong></td>
                      <td style="padding: 4px 0; font-weight: bold; color: #002f76;">${classTime}</td>
                    </tr>
                    ` : ""}
                    ${isAdvProg ? `
                    <tr>
                      <td style="padding: 4px 0; color: #64748b;"><strong>Adventure Cycle:</strong></td>
                      <td style="padding: 4px 0; font-weight: bold; color: #059669;">${advLabel}</td>
                    </tr>
                    ` : ""}
                    ${advStartDateStr ? `
                    <tr>
                      <td style="padding: 4px 0; color: #64748b;"><strong>${isAdvProg ? "Adventure Starts:" : "Program Starts:"}</strong></td>
                      <td style="padding: 4px 0; font-weight: 800; color: #d97706;">🚀 ${advStartDateStr}</td>
                    </tr>
                    ` : ""}
                  </table>
                </div>

                ${isScholar ? `
                <div style="background-color: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
                  <p style="margin: 0; font-size: 16px; color: #065f46; font-weight: bold;">🎓 Full Scholarship Confirmed!</p>
                  <p style="margin: 8px 0 16px; font-size: 13.5px; color: #047857;">Your child's slot is 100% sponsored. No payment is needed.</p>
                  <a href="${baseUrl}/parent/dashboard" style="background-color: #059669; color: white; padding: 13px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">
                    Go to Parent Dashboard →
                  </a>
                </div>
                ` : `
                <div style="background-color: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
                  <p style="margin: 0; font-size: 14px; color: #1e40af; font-weight: bold;">Ready to complete your payment?</p>
                  <p style="margin: 8px 0 16px; font-size: 13px; color: #3b82f6;">Click the button below to upload your payment receipt and confirm your child's slot:</p>
                  <a href="${paymentUrl}" style="background-color: #0033a0; color: white; padding: 13px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">
                    Proceed to Payment Page →
                  </a>
                </div>
                `}

                ${isAdvProg ? `
                <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #92400e;">
                  <p style="margin: 0 0 6px; font-weight: bold;">⚠️ RETURNING FAMILY BALANCE REMINDER:</p>
                  <p style="margin: 0 0 8px;">Please ensure any outstanding account balance from previous cycles (Adventure 1) has been settled.</p>
                  <p style="margin: 0; font-style: italic;">
                    "In the event that a family has an unsettled Adventure 1 balance, any payment submitted for ${advLabel} will be credited toward that previous balance first."
                  </p>
                </div>
                ` : program === "ballet" ? `
                <div style="background-color: #fdf2f8; border: 1.5px solid #fbcfe8; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #831843;">
                  <p style="margin: 0 0 6px; font-weight: bold; font-size: 14px;">🩰 ${BALLET.recital.title.toUpperCase()}</p>
                  <p style="margin: 0 0 8px; font-weight: 600;">${BALLET.recital.note}</p>
                  <div style="background-color: white; border: 1px solid #fbcfe8; border-radius: 10px; padding: 12px; margin: 10px 0;">
                    <p style="margin: 0 0 4px; font-weight: bold; color: #be185d;">Recital Kit · ${BALLET.recital.kitPrice}</p>
                    <p style="margin: 0 0 6px; font-size: 12.5px; color: #475569;">${BALLET.recital.kitDetails}</p>
                    <p style="margin: 0; font-size: 12.5px; color: #1e293b;">${BALLET.recital.kitDetails.replace(/^Includes\s*/i, "")}</p>
                  </div>
                  <ul style="margin: 8px 0 0; padding-left: 20px; font-size: 12.5px; color: #475569;">
                    <li>${BALLET.rate.downpaymentNote}</li>
                    <li>${(PROGRAM_SLOTS as any).ballet.notes[3]}</li>
                    <li>${(PROGRAM_SLOTS as any).ballet.notes[4]}</li>
                  </ul>
                </div>
                ` : program === "virtual-session" ? `
                <div style="background-color: #f5f3ff; border: 1.5px solid #ddd6fe; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #5b21b6;">
                  <p style="margin: 0 0 6px; font-weight: bold;">💻 VIRTUAL TUTORIAL INFORMATION:</p>
                  <p style="margin: 0;">Online classroom links and schedules will be coordinated directly with your teacher prior to your first class.</p>
                </div>
                ` : `
                <div style="background-color: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #0369a1;">
                  <p style="margin: 0 0 6px; font-weight: bold;">🛝 SATURDAY PLAYDATE REMINDERS:</p>
                  <p style="margin: 0;">Please wear comfortable play clothes and socks. A parent or guardian is welcome to accompany little explorers!</p>
                </div>
                `}

                ${reservationDeadlineText ? `<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-top: 20px; font-size: 12.5px; color: #475569;">
                  <p style="margin: 0 0 4px; font-weight: bold;">⏰ Deadline Reminder:</p>
                  <p style="margin: 0;">Your reservation is held until <strong>${reservationDeadlineText}</strong>.</p>
                </div>` : ""}

                <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
                  Need help? Feel free to approach Teacher Angel onsite, or reply directly to this email.
                </p>
                
                <p style="margin-top: 24px; font-size: 14px; color: #002f76; font-weight: bold;">
                  Warm regards,<br />
                  The Merry Explorers Team 💛
                </p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("[registrations POST] Failed to send instant payment reminder email:", emailErr);
      }
    }

    return NextResponse.json({ success: true, data: { id: result.insertedId.toString(), isScholar } });
  } catch (error: any) {
    console.error("[registrations POST]", error);
    return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
  }
}
