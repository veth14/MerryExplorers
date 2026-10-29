import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireRoles } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireRoles(request, ["admin", "developer", "executive assistant", "teacher", "lead teacher", "assistant teacher"]);
  if ("response" in auth) return auth.response;

  try {
    const { db } = await connectToDatabase();

    // Query students enrolled in the Trailblazer (Brave Explorer) program
    const rawStudents = await db
      .collection("students")
      .find({
        $or: [
          { program: { $regex: /trailblazer|brave/i } },
          { programName: { $regex: /trailblazer|brave/i } },
        ],
      })
      .sort({ "childInfo.firstName": 1 })
      .toArray();

    // Deduplicate students by normalized name so repeated adventure records are consolidated
    const seenNames = new Set<string>();
    const formattedStudents = [];

    for (const s of rawStudents) {
      const child = s.childInfo || {};
      const firstName = (child.firstName || "").trim();
      const lastName = (child.lastName || "").trim();
      const nickname = (child.nickname || "").trim() || firstName;
      const fullName = [firstName, lastName].filter(Boolean).join(" ");

      if (!fullName) continue;

      const normKey = fullName.toLowerCase();
      if (seenNames.has(normKey)) continue;
      seenNames.add(normKey);

      formattedStudents.push({
        id: s._id.toString(),
        firstName,
        lastName,
        nickname,
        fullName,
        displayName: nickname !== firstName ? `${nickname} (${firstName})` : firstName,
        gender: child.gender || "unspecified",
        favoriteColor: child.favoriteColor || null,
        favoriteCharacter: child.favoriteCharacter || null,
        program: s.program || "brave-explorer",
        programName: s.programName || "Trailblazer: Brave Explorer",
        status: s.status || "active",
      });
    }

    // Sort alphabetically by nickname / first name
    formattedStudents.sort((a, b) => a.nickname.localeCompare(b.nickname));

    return NextResponse.json({
      success: true,
      count: formattedStudents.length,
      students: formattedStudents,
    });
  } catch (error) {
    console.error("[api/admin/activities/body-parts/students] Error fetching trailblazers:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load Trailblazer roster" },
      { status: 500 }
    );
  }
}

