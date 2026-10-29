import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin, requireRoles } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireRoles(request, ["admin", "developer", "executive assistant", "teacher", "lead teacher", "assistant teacher"]);
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const {
      gameType = "body-parts",
      gameTitle = "Body Parts Explorer",
      roundsTotal = 3,
      players = [],
      winner = null,
      notes = "",
    } = body;

    if (!Array.isArray(players) || players.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one player is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    const sessionDoc = {
      gameType,
      gameTitle,
      roundsTotal,
      playersCount: players.length,
      players: players.map((p, index) => ({
        studentId: p.studentId || null,
        name: p.name,
        avatar: p.avatar,
        color: p.color || "#0284c7",
        score: Number(p.score) || 0,
        correctCount: Number(p.correctCount) || 0,
        mistakesCount: Number(p.mistakesCount) || 0,
        streak: Number(p.streak) || 0,
        rank: Number(p.rank) || index + 1,
      })),
      winner: winner || (players.length > 0 ? players[0] : null),
      notes: notes.trim(),
      playedAt: new Date(),
      playedAtStr: new Date().toISOString(),
      recordedByEmail: auth.user.email,
      recordedByUid: auth.user.uid,
    };

    const result = await db.collection("activity_game_scores").insertOne(sessionDoc);

    // Write audit log
    await db.collection("audit_log").insertOne({
      action: "record_activity_score",
      category: "Activities",
      details: `Saved ${gameTitle} session for ${players.length} players. Winner: ${sessionDoc.winner?.name || "N/A"} (${sessionDoc.winner?.score || 0} pts)`,
      performedBy: auth.user.email,
      targetId: result.insertedId.toString(),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Score recorded successfully",
      sessionId: result.insertedId.toString(),
    });
  } catch (error) {
    console.error("[api/admin/activities/body-parts/scores] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record activity scores" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { db } = await connectToDatabase();
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);

    const sessions = await db
      .collection("activity_game_scores")
      .find({ gameType: "body-parts" })
      .sort({ playedAt: -1 })
      .limit(limit)
      .toArray();

    const formattedSessions = sessions.map((s) => ({
      id: s._id.toString(),
      gameType: s.gameType,
      gameTitle: s.gameTitle,
      roundsTotal: s.roundsTotal,
      playersCount: s.playersCount || s.players?.length || 0,
      players: s.players || [],
      winner: s.winner,
      notes: s.notes,
      playedAt: s.playedAt || s.playedAtStr,
      recordedByEmail: s.recordedByEmail,
    }));

    // Aggregate summary statistics across all games
    const totalSessions = formattedSessions.length;
    const playerStatsMap = new Map<
      string,
      { name: string; avatar: string; totalStars: number; gamesPlayed: number; wins: number }
    >();

    for (const s of formattedSessions) {
      for (const p of s.players) {
        const key = p.studentId || p.name.toLowerCase();
        const existing = playerStatsMap.get(key) || {
          name: p.name,
          avatar: p.avatar,
          totalStars: 0,
          gamesPlayed: 0,
          wins: 0,
        };
        existing.totalStars += p.score;
        existing.gamesPlayed += 1;
        if (p.rank === 1) existing.wins += 1;
        playerStatsMap.set(key, existing);
      }
    }

    const leaderboard = Array.from(playerStatsMap.values())
      .sort((a, b) => b.totalStars - a.totalStars)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      totalSessions,
      sessions: formattedSessions,
      leaderboard,
    });
  } catch (error) {
    console.error("[api/admin/activities/body-parts/scores] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch activity scores" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Session ID required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    await db.collection("activity_game_scores").deleteOne({ _id: new ObjectId(id) });

    await db.collection("audit_log").insertOne({
      action: "delete_activity_score",
      category: "Activities",
      details: `Deleted body parts game session ${id}`,
      performedBy: auth.user.email,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: "Session deleted" });
  } catch (error) {
    console.error("[api/admin/activities/body-parts/scores] DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete score" }, { status: 500 });
  }
}

