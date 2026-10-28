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

function exactEmailRegex(value: string) {
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
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
      
      // Always run getRegistrationAdventureNumber so it can correct stale DB values
      // (e.g. adventureNumber: 2 saved by the old Oct-12 bug for pre-Oct-26 submissions).
      const rawAdvNum = s.adventureNumber ?? registration?.adventureNumber;
      const adventureNumber = getProgramAdventureSetting(s.program, adventureSettings)
        ? getRegistrationAdventureNumber({
            adventureNumber: rawAdvNum,
            period: registration?.period ?? s.period,
            submittedAt: registration?.submittedAt || s.enrolledAt,
          }, s.program, adventureSettings)
        : rawAdvNum ?? null;
      
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
      // Always derive the corrected adventure number (fixes stale adventureNumber: 2 DB values)
      const regAdventureNumber = getProgramAdventureSetting(r.program, adventureSettings)
        ? getRegistrationAdventureNumber({
            adventureNumber: r.adventureNumber,
            period: r.period,
            submittedAt: r.submittedAt,
          }, r.program, adventureSettings)
        : r.adventureNumber ?? null;
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
          // Always run the corrector so stale adventureNumber: 2 (from the old Oct-12 bug) is fixed
          adventureNumber: getProgramAdventureSetting(r.program, adventureSettings)
            ? getRegistrationAdventureNumber({
                adventureNumber: r.adventureNumber,
                period: r.period,
                submittedAt: r.submittedAt,
              }, r.program, adventureSettings)
            : (r.adventureNumber ?? (
                r.period?.includes('adventure-2') ? 2 :
                r.period?.includes('adventure-1') ? 1 :
                null
              )),
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

    // Capture the old family address before changing the selected record. It is
    // the stable link that lets this editor update siblings and family lists too.
    const selectedRegistration = studentDoc?.registrationId && ObjectId.isValid(studentDoc.registrationId)
      ? await db.collection("student_registrations").findOne({ _id: new ObjectId(studentDoc.registrationId) })
      : (!studentDoc && ObjectId.isValid(id)
        ? await db.collection("student_registrations").findOne({ _id: new ObjectId(id) })
        : null);
    const oldFamilyEmail = String(studentDoc?.parentInfo?.email || selectedRegistration?.parentInfo?.email || "").trim().toLowerCase();
    const cleanParentInfo = parentInfo ? {
      name: String(parentInfo.name || "").trim(),
      email: String(parentInfo.email || "").trim().toLowerCase(),
      phone: String(parentInfo.phone || "").trim(),
      relationship: String(parentInfo.relationship || "Parent").trim(),
      address: String(parentInfo.address || "").trim(),
    } : null;
    if (cleanParentInfo?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanParentInfo.email)) {
      return NextResponse.json({ error: "Enter a valid parent email address." }, { status: 400 });
    }
    if (oldFamilyEmail && cleanParentInfo?.email && oldFamilyEmail !== cleanParentInfo.email) {
      const [existingParentAccount, existingAccount] = await Promise.all([
        db.collection("parent_accounts").findOne({ email: exactEmailRegex(cleanParentInfo.email) }),
        db.collection("accounts").findOne({ email: exactEmailRegex(cleanParentInfo.email) }),
      ]);
      if (existingParentAccount || existingAccount) {
        return NextResponse.json({ error: "That email is already used by another account. Update that family first or choose a different email." }, { status: 409 });
      }
    }

    const updateFields: any = {};
    if (childInfo) updateFields.childInfo = childInfo;
    if (cleanParentInfo) {
      for (const [key, value] of Object.entries(cleanParentInfo)) updateFields[`parentInfo.${key}`] = value;
    }
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
          parentInfo: cleanParentInfo ? { ...(regDoc.parentInfo || {}), ...cleanParentInfo } : regDoc.parentInfo,
          emergencyContact: emergencyContact || regDoc.emergencyContact,
          enrolledAt: regDoc.submittedAt || new Date().toISOString(),
          status: status || "active",
          updatedAt: new Date(),
        };

        const ins = await db.collection("students").insertOne(newStudentDoc);
        studentIdStr = ins.insertedId.toString();
      }
    }

    // Family contact details are shared across every adventure and child.
    // Keep child-specific and emergency fields limited to the selected record.
    const familyEmail = oldFamilyEmail || cleanParentInfo?.email || "";
    const familyEmailRegex = familyEmail ? exactEmailRegex(familyEmail) : null;
    const familyContactSet: Record<string, any> = cleanParentInfo ? {
      "parentInfo.name": cleanParentInfo.name,
      "parentInfo.email": cleanParentInfo.email,
      "parentInfo.phone": cleanParentInfo.phone,
      "parentInfo.relationship": cleanParentInfo.relationship,
      "parentInfo.address": cleanParentInfo.address,
      updatedAt: new Date(),
    } : {};
    let linkedRecordsUpdated = 0;

    if (familyEmailRegex && cleanParentInfo) {
      const [siblingStudents, siblingRegistrations] = await Promise.all([
        db.collection("students").updateMany({ "parentInfo.email": familyEmailRegex }, { $set: familyContactSet }),
        db.collection("student_registrations").updateMany({ "parentInfo.email": familyEmailRegex }, { $set: familyContactSet }),
      ]);
      linkedRecordsUpdated += siblingStudents.modifiedCount + siblingRegistrations.modifiedCount;

      const renewalPrimaryResult = await db.collection("renewal_families").updateMany(
        { parentEmail: familyEmailRegex },
        { $set: {
          parentName: cleanParentInfo.name,
          parentEmail: cleanParentInfo.email,
          phone: cleanParentInfo.phone,
          updatedAt: new Date(),
        } }
      );
      const renewalSecondaryResult = await db.collection("renewal_families").updateMany(
        { secondaryEmail: familyEmailRegex },
        { $set: {
          parentName: cleanParentInfo.name,
          secondaryEmail: cleanParentInfo.email,
          phone: cleanParentInfo.phone,
          updatedAt: new Date(),
        } }
      );
      linkedRecordsUpdated += renewalPrimaryResult.modifiedCount + renewalSecondaryResult.modifiedCount;

      const pioneerPrimaryResult = await db.collection("pioneer_families").updateMany(
        { email: familyEmailRegex },
        { $set: {
          parentName: cleanParentInfo.name,
          email: cleanParentInfo.email,
          phone: cleanParentInfo.phone,
          updatedAt: new Date().toISOString(),
        } }
      );
      const pioneerSecondaryResult = await db.collection("pioneer_families").updateMany(
        { email2: familyEmailRegex },
        { $set: {
          parentName: cleanParentInfo.name,
          email2: cleanParentInfo.email,
          phone: cleanParentInfo.phone,
          updatedAt: new Date().toISOString(),
        } }
      );
      linkedRecordsUpdated += pioneerPrimaryResult.modifiedCount + pioneerSecondaryResult.modifiedCount;

      // Update matching parent accounts by their old email, and move their
      // login address too when it changes so the parent can still sign in.
      for (const collectionName of ["parent_accounts", "accounts"]) {
        const accountResult = await db.collection(collectionName).updateMany(
          { email: familyEmailRegex },
          { $set: {
            ...(cleanParentInfo.email ? { email: cleanParentInfo.email } : {}),
            fullName: cleanParentInfo.name,
            phone: cleanParentInfo.phone,
            relationship: cleanParentInfo.relationship,
            address: cleanParentInfo.address,
          } }
        );
        linkedRecordsUpdated += accountResult.modifiedCount;
      }
    }

    // New manually added records may not have an old family email to match.
    if (!familyEmailRegex && cleanParentInfo?.email) {
      for (const collectionName of ["parent_accounts", "accounts"]) {
        await db.collection(collectionName).updateMany(
          { email: exactEmailRegex(cleanParentInfo.email) },
          { $set: { fullName: cleanParentInfo.name, phone: cleanParentInfo.phone, relationship: cleanParentInfo.relationship, address: cleanParentInfo.address } }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Student and family contact information updated successfully",
      id: studentIdStr,
      linkedRecordsUpdated,
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
