import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

/**
 * GET /api/students/reschedule
 * Accessible by: admin, executive assistant, developer
 * Returns recent reschedule history from audit_log
 */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { db } = await connectToDatabase();
    const history = await db
      .collection("audit_log")
      .find({ action: "student_rescheduled" })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      history: history.map((entry: any) => ({
        id: entry._id.toString(),
        studentId: entry.studentId || "",
        studentName: entry.studentName || "",
        previousSchedule: entry.previousSchedule || "",
        newSchedule: entry.newSchedule || "",
        previousClassTime: entry.previousClassTime || "",
        newClassTime: entry.newClassTime || "",
        reason: entry.reason || "",
        performedBy: entry.performedBy || "",
        performedByEmail: entry.performedByEmail || "",
        performedByRole: entry.performedByRole || "",
        timestamp: entry.timestamp || entry.createdAt || "",
      })),
    });
  } catch (error: any) {
    console.error("[reschedule GET history]", error);
    return NextResponse.json({ error: "Failed to fetch reschedule history" }, { status: 500 });
  }
}

/**
 * PATCH /api/students/reschedule
 * Accessible by: admin, executive assistant, developer
 * Updates only the classTime and schedule fields for a student and syncs registration.
 */
export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { id, classTime, schedule, reason } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }
    if (!classTime && !schedule) {
      return NextResponse.json({ error: "At least one of classTime or schedule is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const updateFields: Record<string, string> = {};
    if (classTime !== undefined) updateFields.classTime = classTime;
    if (schedule !== undefined) updateFields.schedule = schedule;

    let updatedCount = 0;
    let studentName = "";
    let prevClassTime = "";
    let prevSchedule = "";
    let studentDoc: any = null;
    let regDoc: any = null;

    if (ObjectId.isValid(id)) {
      // 1. Check students collection
      studentDoc = await db.collection("students").findOne({ _id: new ObjectId(id) });
      if (studentDoc) {
        prevClassTime = studentDoc.classTime || "";
        prevSchedule = studentDoc.schedule || "";
        studentName = `${studentDoc.childInfo?.firstName || ""} ${studentDoc.childInfo?.lastName || ""}`.trim();

        await db.collection("students").updateOne(
          { _id: studentDoc._id },
          {
            $set: {
              ...updateFields,
              rescheduledAt: new Date().toISOString(),
              rescheduledBy: auth.user.uid,
              ...(reason ? { rescheduleReason: reason } : {}),
            },
          }
        );
        updatedCount++;

        // If registrationId exists, sync registration doc
        if (studentDoc.registrationId && ObjectId.isValid(studentDoc.registrationId)) {
          await db.collection("student_registrations").updateOne(
            { _id: new ObjectId(studentDoc.registrationId) },
            {
              $set: {
                ...updateFields,
                rescheduledAt: new Date().toISOString(),
                rescheduledBy: auth.user.uid,
                ...(reason ? { rescheduleReason: reason } : {}),
              },
            }
          );
        }
      }

      // 2. Also check if the id directly points to student_registrations
      regDoc = await db.collection("student_registrations").findOne({ _id: new ObjectId(id) });
      if (regDoc) {
        if (!studentName) {
          studentName = `${regDoc.childInfo?.firstName || ""} ${regDoc.childInfo?.lastName || ""}`.trim();
          prevClassTime = regDoc.classTime || "";
          prevSchedule = regDoc.schedule || "";
        }

        await db.collection("student_registrations").updateOne(
          { _id: regDoc._id },
          {
            $set: {
              ...updateFields,
              rescheduledAt: new Date().toISOString(),
              rescheduledBy: auth.user.uid,
              ...(reason ? { rescheduleReason: reason } : {}),
            },
          }
        );
        updatedCount++;

        // Sync any students collection doc that refers to this registrationId
        await db.collection("students").updateMany(
          { registrationId: id },
          {
            $set: {
              ...updateFields,
              rescheduledAt: new Date().toISOString(),
              rescheduledBy: auth.user.uid,
              ...(reason ? { rescheduleReason: reason } : {}),
            },
          }
        );
      }
    }

    if (updatedCount === 0) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    // 3. Write to audit_log
    try {
      await db.collection("audit_log").insertOne({
        action: "student_rescheduled",
        category: "students",
        studentId: id,
        studentName: studentName || "Unknown Student",
        previousSchedule: prevSchedule,
        newSchedule: schedule ?? prevSchedule,
        previousClassTime: prevClassTime,
        newClassTime: classTime ?? prevClassTime,
        reason: reason || "",
        performedBy: auth.user.uid,
        performedByEmail: auth.user.email || "",
        performedByRole: auth.user.role || "",
        timestamp: new Date().toISOString(),
        createdAt: new Date(),
      });
    } catch (auditErr) {
      console.error("[reschedule audit_log error]", auditErr);
    }

    return NextResponse.json({
      success: true,
      updatedFields: updateFields,
      studentName,
    });
  } catch (error: any) {
    console.error("[reschedule PATCH]", error);
    return NextResponse.json({ error: "Failed to reschedule student session" }, { status: 500 });
  }
}
