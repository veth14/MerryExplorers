import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";

// GET /api/dashboard/metrics
export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const { db } = await connectToDatabase();

    // 1. Total staff = Lead Teacher + Assistant Teacher + executive partner
    const totalTeachers = await db.collection("accounts").countDocuments({
      role: { $in: ["Lead Teacher", "Assistant Teacher", "executive partner"] },
    });

    // 2. Today's date in Manila timezone (avoids UTC off-by-one)
    const todayStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    const todayPHT = new Date(todayStr);
    const yyyy = todayPHT.getFullYear();
    const mm = String(todayPHT.getMonth() + 1).padStart(2, "0");
    const dd = String(todayPHT.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const todayAttendance = await db
      .collection("attendance")
      .find({ dateStr })
      .toArray();

    const activeSessions = todayAttendance.filter(
      (a) => a.status === "In Progress"
    ).length;
    const totalClockIns = todayAttendance.length;

    // 3. Real punctuality from stored timeInStatus ("On Time" | "Late" | "Exempt")
    const onTimeCount = todayAttendance.filter(
      (a) => a.timeInStatus === "On Time" || a.timeInStatus === "Exempt"
    ).length;
    const punctualityRate =
      totalClockIns > 0
        ? `${Math.round((onTimeCount / totalClockIns) * 100)}%`
        : "–";
    const punctualityMeta =
      totalClockIns > 0 ? `${onTimeCount} on time today` : "No clock-ins yet";

    const data = {
      totalTeachers: {
        value: totalTeachers.toString(),
        meta: `${totalClockIns} present today`,
      },
      activeSessions: {
        value: `${activeSessions}/${totalTeachers}`,
        meta: "Teachers timed-in",
      },
      punctualityRate: {
        value: punctualityRate,
        meta: punctualityMeta,
      },
      totalClockIns: {
        value: totalClockIns.toString(),
        meta: "Total today",
      },
    };

    return NextResponse.json({ success: true, data }, {
      headers: {
        // Shorter cache so dashboard refreshes more frequently
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch dashboard metrics:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
