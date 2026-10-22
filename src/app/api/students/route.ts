import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";
import { getAdventureCycleTimeline, getProgramAdventureSetting, getRegistrationAdventureNumber } from "@/lib/adventure-cycle";

export const dynamic = "force-dynamic";

function normalizeIdentity(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// GET /api/students — Admin only: Fetches all students & aggregated parents across all programs
export async function GET(request: Request) {
  const t0 = Date.now();
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const tAuth = Date.now();

  try {
    const { db } = await connectToDatabase();
    const url = new URL(request.url);
    const program = url.searchParams.get("program");

    const query = program && program !== "all" ? { program } : {};
    const students = await db
      .collection("students")
      .find(query)
      .sort({ enrolledAt: -1 })
      .toArray();

    // 1. Fetch all student registrations
    const allRegistrations = await db
      .collection("student_registrations")
      .find({})
      .sort({ submittedAt: -1 })
      .toArray();

    const registrationMap = new Map(allRegistrations.map((r) => [r._id.toString(), r]));

    // 2. Fetch renewal settings for adventure cycle info
    const renewalSettings = await db.collection("settings").findOne({ _key: "renewal_settings_v2" });
    const adventureSettings = renewalSettings?.programs || [];

    // 3. Fetch all accounts (parent_accounts + staff/legacy from accounts) and pioneer families
    const [accounts, parentAccounts, pioneerDocs] = await Promise.all([
      db.collection("accounts").find({}).toArray(),
      db.collection("parent_accounts").find({}).toArray(),
      db.collection("pioneer_families").find({}).toArray(),
    ]);
    const parentAccountMap = new Map<string, any>();
    for (const acc of [...accounts, ...parentAccounts]) {
      if (acc.email) {
        parentAccountMap.set(acc.email.toLowerCase().trim(), acc);
      }
    }
    const pioneerEmails = new Set(
      pioneerDocs.flatMap((p: any) => [p.email, p.email2].map((e: string) => (e || "").toLowerCase().trim()).filter(Boolean))
    );

    // 4. Format existing students from students collection
    const studentKeys = new Set<string>();

    const formattedStudents: any[] = students.map((s: any) => {
      const parentAcc = s.parentInfo?.email ? parentAccountMap.get(s.parentInfo.email.toLowerCase().trim()) : null;
      const registration = s.registrationId ? registrationMap.get(s.registrationId) : null;
      
      const adventureNumber = s.adventureNumber ?? registration?.adventureNumber ?? (
        getProgramAdventureSetting(s.program, adventureSettings)
          ? getRegistrationAdventureNumber({
              adventureNumber: registration?.adventureNumber,
              period: registration?.period,
              submittedAt: registration?.submittedAt || s.enrolledAt,
            }, s.program, adventureSettings)
          : null
      );
      
      const timeline = getProgramAdventureSetting(s.program, adventureSettings)
        ? getAdventureCycleTimeline(s.program, adventureSettings)
        : null;

      // Key includes adventure number so Adv 1 and Adv 2 registrations are NOT collapsed together
      const childKey = `${normalizeIdentity(s.childInfo?.firstName)} ${normalizeIdentity(s.childInfo?.lastName)}|${normalizeIdentity(s.parentInfo?.email)}|adv${adventureNumber ?? 0}`;
      studentKeys.add(childKey);

      const parentEmailClean = (s.parentInfo?.email || "").toLowerCase().trim();
      const isPioneer = Boolean(
        s.isPioneer ||
        registration?.isPioneer ||
        (parentEmailClean && pioneerEmails.has(parentEmailClean))
      );

      return {
        ...s,
        adventureNumber,
        adventureStartDate: s.adventureStartDate || registration?.adventureStartDate || null,
        activeAdventureNumber: timeline?.activeAdventureNumber ?? null,
        upcomingAdventureNumber: timeline?.upcomingAdventureNumber ?? null,
        previousAdventureNumber: timeline?.previousAdventureNumber ?? null,
        upcomingAdventureStartDate: timeline?.upcomingAdventureStartDate ?? null,
        id: s._id.toString(),
        _id: undefined,
        isPioneer,
        hasAccount: !!parentAcc,
        accountRole: parentAcc?.role || null,
        photoConsent: parentAcc?.photoConsent !== undefined ? parentAcc.photoConsent : s.photoConsent,
        waiverSignedAt: parentAcc?.waiverSignedAt || s.waiverSignedAt,
        waiverSignature: parentAcc?.waiverSignature || s.waiverSignature,
        receiptUrl: s.receiptUrl || registration?.receiptUrl || null,
        paymentStatus: s.paymentStatus || registration?.paymentStatus || null,
        paid: s.paid !== undefined ? s.paid : registration?.paid,
        paymentMethod: s.paymentMethod || registration?.paymentMethod || null,
        amountDue: s.amountDue ?? registration?.amountDue ?? null,
        amountPaid: s.amountPaid ?? registration?.amountPaid ?? null,
        referenceNumber: s.referenceNumber || registration?.referenceNumber || null,
        signatureUrl: s.signatureUrl || registration?.signatureUrl || null,
        notes: s.notes || registration?.notes || null,
        source: "students_collection",
      };
    });

    // 5. Also bring in any registrations from student_registrations that aren't yet in students collection
    // (e.g. Everyday Explorer, Ballet, Saturday Playdate, or reserved/pending registrations)
    for (const r of allRegistrations) {
      // Build a per-adventure key so that Adv 2 registrations are NOT suppressed when Adv 1 is already present
      const regAdventureNumber = r.adventureNumber ?? null;
      const childKeyForReg = `${normalizeIdentity(r.childInfo?.firstName)} ${normalizeIdentity(r.childInfo?.lastName)}|${normalizeIdentity(r.parentInfo?.email)}|adv${regAdventureNumber ?? 0}`;
      const alreadyIncluded = studentKeys.has(childKeyForReg) || formattedStudents.some((s: any) => s.registrationId === r._id.toString());

      if (!alreadyIncluded && (!program || program === "all" || r.program === program)) {
        const parentAcc = r.parentInfo?.email ? parentAccountMap.get(r.parentInfo.email.toLowerCase().trim()) : null;
        const timeline = getProgramAdventureSetting(r.program, adventureSettings)
          ? getAdventureCycleTimeline(r.program, adventureSettings)
          : null;

        const regEmailClean = (r.parentInfo?.email || "").toLowerCase().trim();
        const isPioneer = Boolean(
          r.isPioneer ||
          (regEmailClean && pioneerEmails.has(regEmailClean))
        );

        formattedStudents.push({
          id: r._id.toString(),
          registrationId: r._id.toString(),
          program: r.program,
          programName: r.programName || r.program,
          classTime: r.classTime || "",
          schedule: r.schedule || "",
          // Derive adventure number from period field if not explicitly set
          // e.g. period:'adventure-2' → 2, so we don't accidentally treat it as Adv 1
          adventureNumber: r.adventureNumber ?? (
            r.period?.includes('adventure-2') ? 2 :
            r.period?.includes('adventure-1') ? 1 :
            null
          ),
          adventureStartDate: r.adventureStartDate ?? null,
          activeAdventureNumber: timeline?.activeAdventureNumber ?? null,
          upcomingAdventureNumber: timeline?.upcomingAdventureNumber ?? null,
          previousAdventureNumber: timeline?.previousAdventureNumber ?? null,
          upcomingAdventureStartDate: timeline?.upcomingAdventureStartDate ?? null,
          childInfo: r.childInfo || { firstName: "", lastName: "" },
          parentInfo: r.parentInfo || { name: "", email: "", phone: "" },
          emergencyContact: r.emergencyContact || { name: "", relationship: "", phone: "" },
          enrolledAt: r.submittedAt || new Date().toISOString(),
          status: r.status || "registered",
          isPioneer,
          hasAccount: !!parentAcc,
          accountRole: parentAcc?.role || null,
          photoConsent: parentAcc?.photoConsent !== undefined ? parentAcc.photoConsent : r.photoConsent,
          waiverSignedAt: parentAcc?.waiverSignedAt || r.submittedAt,
          waiverSignature: parentAcc?.waiverSignature || r.signatureUrl,
          receiptUrl: r.receiptUrl || null,
          paymentStatus: r.paymentStatus || null,
          paid: r.paid,
          paymentMethod: r.paymentMethod || null,
          amountDue: r.amountDue ?? null,
          amountPaid: r.amountPaid ?? null,
          referenceNumber: r.referenceNumber || null,
          signatureUrl: r.signatureUrl || null,
          notes: r.notes || null,
          source: "registration_only",
        });
      }
    }

    // 6. Build consolidated parents list
    const parentsMap = new Map<string, any>();

    for (const s of formattedStudents) {
      const email = s.parentInfo?.email?.trim().toLowerCase();
      if (!email) continue;

      const parentAcc = parentAccountMap.get(email);
      const existing = parentsMap.get(email);

      const childEntry = {
        studentId: s.id,
        firstName: s.childInfo?.firstName || "",
        lastName: s.childInfo?.lastName || "",
        nickname: s.childInfo?.nickname || "",
        program: s.program,
        programName: s.programName,
        adventureNumber: s.adventureNumber,
        status: s.status,
      };

      if (!existing) {
        parentsMap.set(email, {
          email,
          name: s.parentInfo?.name || parentAcc?.fullName || "Unknown Parent",
          phone: s.parentInfo?.phone || parentAcc?.phone || "",
          relationship: s.parentInfo?.relationship || parentAcc?.relationship || "Parent",
          address: s.parentInfo?.address || parentAcc?.address || "",
          isPioneer: pioneerEmails.has(email) || !!s.isPioneer,
          hasAccount: !!parentAcc,
          accountId: parentAcc?._id?.toString() || null,
          accountRole: parentAcc?.role || null,
          children: [childEntry],
        });
      } else {
        if (!existing.phone && s.parentInfo?.phone) existing.phone = s.parentInfo.phone;
        if (!existing.children.some((c: any) => c.firstName === childEntry.firstName && c.lastName === childEntry.lastName)) {
          existing.children.push(childEntry);
        }
      }
    }

    // Also include parents from accounts who might not have active student links
    for (const [email, acc] of parentAccountMap.entries()) {
      if (acc.role === "parent" && !parentsMap.has(email)) {
        parentsMap.set(email, {
          email,
          name: acc.fullName || acc.email,
          phone: acc.phone || "",
          relationship: acc.relationship || "Parent",
          address: acc.address || "",
          hasAccount: true,
          accountId: acc._id?.toString() || null,
          accountRole: acc.role,
          children: acc.childName ? [{
            studentId: "",
            firstName: acc.childName,
            lastName: "",
            nickname: "",
            program: acc.program || "",
            programName: acc.program || "",
            adventureNumber: null,
            status: acc.status || "active",
          }] : [],
        });
      }
    }

    const parentsList = Array.from(parentsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    console.log(`[perf] GET /api/students — auth:${tAuth - t0}ms db+compute:${Date.now() - tAuth}ms total:${Date.now() - t0}ms count:${formattedStudents.length}`);

    return NextResponse.json({
      success: true,
      data: formattedStudents,
      parents: parentsList,
    }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error: any) {
    console.error("[students GET]", error);
    return NextResponse.json({ error: "Failed to fetch students and families" }, { status: 500 });
  }
}

// PUT /api/students — Update student information across students, registrations, and accounts
export async function PUT(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const {
      id,
      childInfo,
      parentInfo,
      emergencyContact,
      program,
      programName,
      classTime,
      schedule,
      adventureNumber,
      status,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing student ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Check if student doc exists in students collection
    let studentDoc = ObjectId.isValid(id)
      ? await db.collection("students").findOne({ _id: new ObjectId(id) })
      : null;

    if (!studentDoc && ObjectId.isValid(id)) {
      studentDoc = await db.collection("students").findOne({ registrationId: id });
    }

    const updateFields: any = {};
    if (childInfo) updateFields.childInfo = childInfo;
    if (parentInfo) updateFields.parentInfo = parentInfo;
    if (emergencyContact) updateFields.emergencyContact = emergencyContact;
    if (program !== undefined) updateFields.program = program;
    if (programName !== undefined) updateFields.programName = programName;
    if (classTime !== undefined) updateFields.classTime = classTime;
    if (schedule !== undefined) updateFields.schedule = schedule;
    if (adventureNumber !== undefined) updateFields.adventureNumber = adventureNumber ? Number(adventureNumber) : null;
    if (status !== undefined) updateFields.status = status;
    if (notes !== undefined) updateFields.notes = notes;
    updateFields.updatedAt = new Date();

    let studentIdStr = id;

    if (studentDoc) {
      await db.collection("students").updateOne(
        { _id: studentDoc._id },
        { $set: updateFields }
      );
      studentIdStr = studentDoc._id.toString();

      // If registrationId exists, sync registration
      if (studentDoc.registrationId && ObjectId.isValid(studentDoc.registrationId)) {
        await db.collection("student_registrations").updateOne(
          { _id: new ObjectId(studentDoc.registrationId) },
          { $set: updateFields }
        );
      }
    } else if (ObjectId.isValid(id)) {
      // It is a registration doc that doesn't yet have a student doc
      const regDoc = await db.collection("student_registrations").findOne({ _id: new ObjectId(id) });
      if (regDoc) {
        await db.collection("student_registrations").updateOne(
          { _id: new ObjectId(id) },
          { $set: updateFields }
        );

        // Formally create matching student document
        const newStudentDoc = {
          registrationId: id,
          program: program || regDoc.program,
          programName: programName || regDoc.programName || program || regDoc.program,
          classTime: classTime !== undefined ? classTime : regDoc.classTime || "",
          schedule: schedule !== undefined ? schedule : regDoc.schedule || "",
          adventureNumber: adventureNumber !== undefined ? Number(adventureNumber) : regDoc.adventureNumber,
          childInfo: childInfo || regDoc.childInfo,
          parentInfo: parentInfo || regDoc.parentInfo,
          emergencyContact: emergencyContact || regDoc.emergencyContact,
          enrolledAt: regDoc.submittedAt || new Date().toISOString(),
          status: status || "active",
          updatedAt: new Date(),
        };

        const ins = await db.collection("students").insertOne(newStudentDoc);
        studentIdStr = ins.insertedId.toString();
      }
    }

    // Sync accounts collection if parent has an account
    const emailToMatch = parentInfo?.email || studentDoc?.parentInfo?.email;
    if (emailToMatch) {
      const cleanEmail = emailToMatch.trim().toLowerCase();
      const accountUpdate: any = {};
      if (parentInfo?.name) accountUpdate.fullName = parentInfo.name;
      if (parentInfo?.phone) accountUpdate.phone = parentInfo.phone;
      if (parentInfo?.relationship) accountUpdate.relationship = parentInfo.relationship;
      if (childInfo?.firstName) {
        accountUpdate.childName = `${childInfo.firstName} ${childInfo.lastName || ""}`.trim();
        accountUpdate.childrenNames = accountUpdate.childName;
      }
      if (Object.keys(accountUpdate).length > 0) {
        await db.collection("parent_accounts").updateOne(
          { email: cleanEmail },
          { $set: accountUpdate }
        );
        await db.collection("accounts").updateOne(
          { email: cleanEmail },
          { $set: accountUpdate }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Student information updated successfully",
      id: studentIdStr,
    });
  } catch (error: any) {
    console.error("[students PUT]", error);
    return NextResponse.json({ error: error.message || "Failed to update student" }, { status: 500 });
  }
}

// POST /api/students — Admin manually adds a student
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const {
      childInfo,
      parentInfo,
      emergencyContact,
      program,
      programName,
      classTime,
      schedule,
      adventureNumber,
      status,
      notes,
    } = body;

    if (!childInfo?.firstName || !childInfo?.lastName) {
      return NextResponse.json({ error: "Child first and last name are required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const studentDoc = {
      program: program || "curious-explorer",
      programName: programName || "Discovery Club: Curious Explorer",
      classTime: classTime || "",
      schedule: schedule || "",
      adventureNumber: adventureNumber ? Number(adventureNumber) : 1,
      childInfo: {
        firstName: childInfo.firstName.trim(),
        lastName: childInfo.lastName.trim(),
        nickname: childInfo.nickname?.trim() || "",
        dateOfBirth: childInfo.dateOfBirth || "",
        gender: childInfo.gender || "",
        healthProfile: childInfo.healthProfile || "",
        allergies: childInfo.allergies || "",
        favoriteColor: childInfo.favoriteColor || "",
        favoriteSong: childInfo.favoriteSong || "",
        favoriteCharacter: childInfo.favoriteCharacter || "",
      },
      parentInfo: {
        name: parentInfo?.name?.trim() || "",
        email: parentInfo?.email?.trim().toLowerCase() || "",
        phone: parentInfo?.phone?.trim() || "",
        relationship: parentInfo?.relationship?.trim() || "Parent",
        address: parentInfo?.address?.trim() || "",
      },
      emergencyContact: {
        name: emergencyContact?.name?.trim() || "",
        relationship: emergencyContact?.relationship?.trim() || "",
        phone: emergencyContact?.phone?.trim() || "",
      },
      enrolledAt: new Date().toISOString(),
      status: status || "active",
      notes: notes || "",
      createdAt: new Date(),
    };

    const result = await db.collection("students").insertOne(studentDoc);
    return NextResponse.json({
      success: true,
      message: "Student created successfully",
      data: { ...studentDoc, id: result.insertedId.toString() },
    });
  } catch (error: any) {
    console.error("[students POST]", error);
    return NextResponse.json({ error: error.message || "Failed to create student" }, { status: 500 });
  }
}

// DELETE /api/students — Admin removes a student
export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    await db.collection("students").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true, message: "Student removed" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 });
  }
}
