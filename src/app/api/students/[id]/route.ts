import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

// GET /api/students/[id]
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const { db } = await connectToDatabase();
    let student = ObjectId.isValid(id) ? await db.collection("students").findOne({ _id: new ObjectId(id) }) : null;

    if (!student && ObjectId.isValid(id)) {
      student = await db.collection("students").findOne({ registrationId: id });
    }

    if (!student && ObjectId.isValid(id)) {
      const reg = await db.collection("student_registrations").findOne({ _id: new ObjectId(id) });
      if (reg) {
        student = {
          _id: reg._id,
          registrationId: reg._id.toString(),
          program: reg.program,
          programName: reg.programName || reg.program,
          classTime: reg.classTime || "",
          schedule: reg.schedule || "",
          adventureNumber: reg.adventureNumber || null,
          childInfo: reg.childInfo,
          parentInfo: reg.parentInfo,
          emergencyContact: reg.emergencyContact,
          enrolledAt: reg.submittedAt,
          status: reg.status,
        };
      }
    }

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...student,
        id: student._id.toString(),
        _id: undefined,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch student" }, { status: 500 });
  }
}

// PUT /api/students/[id]
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const forwardRequest = new Request(new URL("/api/students", request.url).toString(), {
      method: "PUT",
      headers: request.headers,
      body: JSON.stringify({ ...body, id }),
    });

    const { PUT: parentPut } = await import("@/app/api/students/route");
    return parentPut(forwardRequest);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/students/[id]
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const forwardRequest = new Request(new URL(`/api/students?id=${id}`, request.url).toString(), {
      method: "DELETE",
      headers: request.headers,
    });

    const { DELETE: parentDelete } = await import("@/app/api/students/route");
    return parentDelete(forwardRequest);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 });
  }
}
