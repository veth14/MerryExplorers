import { NextResponse } from "next/server";
import { ObjectId } from "mongodb"; // NEW
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { v2 as cloudinary } from "cloudinary";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET /api/registrations — Admin only, lists all registrations
export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const { db } = await connectToDatabase();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    const query = status && status !== "all" ? { status } : {};
    const registrations = await db
      .collection("student_registrations")
      .find(query)
      .sort({ submittedAt: -1 })
      .toArray();

    const formatted = registrations.map((r) => ({
      ...r,
      id: r._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data: formatted });
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
      paymentType,
      amountDue,
      amountPaid,
      creditBalance,
      referenceNumber,
      leadId, // NEW — sent by the register page after the Details step
    } = data;

    // Validate required fields
    if (!program || !classTime || !parentInfo?.email || !parentInfo?.name || !childInfo?.firstName || (program !== "brave-explorer" && !signatureBase64)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

    // Check slot availability
    const programConfig = {
      "curious-explorer": { classes: { "Morning Class": 4, "Afternoon Class": 4 } },
      "creative-explorer": { classes: { "Morning Class": 6, "Mid-Day Class": 6, "Afternoon Class": 6 } },
      "brave-explorer": { classes: { "Afternoon Class": 6 } },
    } as Record<string, { classes: Record<string, number> }>;

    const maxSlots = programConfig[program]?.classes[classTime];
    if (maxSlots !== undefined) {
      const takenSlots = await db.collection("student_registrations").countDocuments({
        program,
        classTime,
        status: { $in: ["pending", "approved", "reserved"] },
        "parentInfo.name": { $not: /ian angelo valmores/i },
      });
      if (takenSlots >= maxSlots) {
        return NextResponse.json({ error: `Sorry, ${classTime} for this program is now full.` }, { status: 409 });
      }
    }

    const newRegistration = {
      status: "reserved",
      reservedUntil: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      program,
      classTime,
      parentInfo,
      childInfo,
      emergencyContact: emergencyContact || {},
      paymentMethod: paymentMethod || "",
      paymentType: paymentType || "downpayment",
      amountDue: amountDue || 0,
      amountPaid: amountPaid || 0,
      creditBalance: creditBalance || 0,
      referenceNumber: referenceNumber || "",
      receiptUrl: "", // Uploaded in next step
      receiptPublicId: "", // Uploaded in next step
      signatureUrl,
      signaturePublicId,
      photoConsent,
      uniformOrdered: uniformOrdered || false,
      notes: "",
      submittedAt: new Date(),
      approvedAt: null,
      approvedBy: null,
      confirmationEmailSent: false,
      leadId: leadId || null, // NEW
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

    // Notifications and emails have been moved to the payment verification step



    return NextResponse.json({ success: true, data: { id: result.insertedId.toString() } });
  } catch (error: any) {
    console.error("[registrations POST]", error);
    return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
  }
}