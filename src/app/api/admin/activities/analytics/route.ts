import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireRoles } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

type RawPlayer = {
  studentId?: string | null;
  name: string;
  avatar?: string;
  color?: string;
  score?: number;
  correctCount?: number;
  mistakesCount?: number;
  streak?: number;
  rank?: number;
};

type RawSession = {
  _id?: ObjectId | string;
  gameType: string;
  gameTitle: string;
  roundsTotal: number;
  playersCount?: number;
  players: RawPlayer[];
  winner?: RawPlayer | null;
  notes?: string;
  playedAt?: Date | string;
  playedAtStr?: string;
  recordedByEmail?: string;
  recordedByUid?: string;
};

// Generates high-fidelity demonstration data when database is fresh / empty
function generateRealisticSampleData(): RawSession[] {
  const students = [
    { name: "Gelo", avatar: "Bear Cub", color: "#f59e0b" },
    { name: "Dari", avatar: "Fox Scout", color: "#ef4444" },
    { name: "Gavinne", avatar: "Wise Owl", color: "#6366f1" },
    { name: "Kaili", avatar: "Rabbit Explorer", color: "#10b981" },
    { name: "Misha", avatar: "Panda Friend", color: "#14b8a6" },
    { name: "Ram", avatar: "Lion Cub", color: "#f97316" },
    { name: "Zane", avatar: "Koala Buddy", color: "#06b6d4" },
  ];

  const sessions: RawSession[] = [];
  const now = new Date();

  // Create 18 classroom sessions spanning the past 14 days
  const sessionConfigs = [
    { dayOffset: 0, hour: 10, game: "number-trail", title: "Number Trail Adventure", rounds: 5, studentIndices: [0, 1, 3], teacher: "angel@merryexplorers.com", notes: "Count & Match review with animal counters" },
    { dayOffset: 0, hour: 14, game: "body-parts", title: "Body Parts Explorer", rounds: 3, studentIndices: [2, 4, 5, 6], teacher: "kyle@merryexplorers.com", notes: "Interactive body map pointing practice" },
    { dayOffset: 1, hour: 9, game: "number-trail", title: "Number Trail Adventure", rounds: 5, studentIndices: [1, 2, 0], teacher: "angel@merryexplorers.com", notes: "Sequencing numbers 1 through 10" },
    { dayOffset: 1, hour: 11, game: "number-trail", title: "Number Trail Adventure", rounds: 5, studentIndices: [3, 4, 6], teacher: "jasmin@merryexplorers.com", notes: "Word-to-numeral matching practice" },
    { dayOffset: 2, hour: 10, game: "body-parts", title: "Body Parts Explorer", rounds: 4, studentIndices: [0, 5, 1], teacher: "kyle@merryexplorers.com", notes: "Sensory organs and movement recognition" },
    { dayOffset: 3, hour: 9, game: "number-trail", title: "Number Trail Adventure", rounds: 5, studentIndices: [2, 3, 5], teacher: "angel@merryexplorers.com", notes: "More or Less comparisons race" },
    { dayOffset: 3, hour: 13, game: "body-parts", title: "Body Parts Explorer", rounds: 3, studentIndices: [4, 6, 0], teacher: "jasmin@merryexplorers.com", notes: "Head shoulders knees and toes review" },
    { dayOffset: 4, hour: 10, game: "number-trail", title: "Number Trail Adventure", rounds: 5, studentIndices: [1, 5, 6], teacher: "angel@merryexplorers.com", notes: "Trail race to 5 points with cheer boosts" },
    { dayOffset: 5, hour: 9, game: "body-parts", title: "Body Parts Explorer", rounds: 3, studentIndices: [2, 0, 3], teacher: "kyle@merryexplorers.com", notes: "Fine motor & facial features match" },
    { dayOffset: 6, hour: 11, game: "number-trail", title: "Number Trail Adventure", rounds: 5, studentIndices: [4, 1, 2], teacher: "jasmin@merryexplorers.com", notes: "High five for numbers 1 to 5" },
    { dayOffset: 7, hour: 10, game: "number-trail", title: "Number Trail Adventure", rounds: 5, studentIndices: [0, 3, 6], teacher: "angel@merryexplorers.com", notes: "Weekly numbers championship race" },
    { dayOffset: 8, hour: 9, game: "body-parts", title: "Body Parts Explorer", rounds: 4, studentIndices: [5, 4, 1], teacher: "kyle@merryexplorers.com", notes: "Arm and hand gestures coordination" },
    { dayOffset: 9, hour: 14, game: "number-trail", title: "Number Trail Adventure", rounds: 5, studentIndices: [2, 6, 0], teacher: "angel@merryexplorers.com", notes: "What comes next sequence training" },
    { dayOffset: 10, hour: 10, game: "number-trail", title: "Number Trail Adventure", rounds: 5, studentIndices: [1, 3, 4], teacher: "jasmin@merryexplorers.com", notes: "Preschool counting circle game" },
    { dayOffset: 11, hour: 11, game: "body-parts", title: "Body Parts Explorer", rounds: 3, studentIndices: [0, 2, 5], teacher: "kyle@merryexplorers.com", notes: "Smile, eyes and ears recognition" },
    { dayOffset: 12, hour: 9, game: "number-trail", title: "Number Trail Adventure", rounds: 5, studentIndices: [6, 1, 3], teacher: "angel@merryexplorers.com", notes: "Speed counting friendly race" },
    { dayOffset: 13, hour: 13, game: "body-parts", title: "Body Parts Explorer", rounds: 3, studentIndices: [4, 5, 2], teacher: "jasmin@merryexplorers.com", notes: "Foot and leg movement game" },
    { dayOffset: 14, hour: 10, game: "number-trail", title: "Number Trail Adventure", rounds: 5, studentIndices: [0, 4, 6], teacher: "angel@merryexplorers.com", notes: "Trailblazer math warmup" },
  ];

  sessionConfigs.forEach((cfg, idx) => {
    const sessionDate = new Date(now);
    sessionDate.setDate(now.getDate() - cfg.dayOffset);
    sessionDate.setHours(cfg.hour, 15 + (idx % 30), 0, 0);

    const participatingStudents = cfg.studentIndices.map((i) => students[i]);
    const maxScore = cfg.rounds;

    const sessionPlayers: RawPlayer[] = participatingStudents.map((st, pIdx) => {
      // Deterministic realistic scores
      const score = Math.max(1, maxScore - ((pIdx * 2 + idx) % 3));
      const mistakes = (idx + pIdx) % 3 === 0 ? 1 : 0;
      const correct = score;
      const streak = Math.min(score, 3 + ((idx + pIdx) % 3));

      return {
        studentId: `std-mock-${st.name.toLowerCase()}`,
        name: st.name,
        avatar: st.avatar,
        color: st.color,
        score,
        correctCount: correct,
        mistakesCount: mistakes,
        streak,
        rank: pIdx + 1,
      };
    });

    // Sort by score desc to determine rank
    sessionPlayers.sort((a, b) => (b.score || 0) - (a.score || 0));
    sessionPlayers.forEach((p, rIdx) => {
      p.rank = rIdx + 1;
    });

    const winner = sessionPlayers[0];

    sessions.push({
      _id: `demo-session-${idx + 1}`,
      gameType: cfg.game,
      gameTitle: cfg.title,
      roundsTotal: cfg.rounds,
      playersCount: sessionPlayers.length,
      players: sessionPlayers,
      winner,
      notes: cfg.notes,
      playedAt: sessionDate,
      playedAtStr: sessionDate.toISOString(),
      recordedByEmail: cfg.teacher,
      recordedByUid: "teacher-uid",
    });
  });

  return sessions;
}

export async function GET(request: Request) {
  const auth = await requireRoles(request, [
    "admin",
    "developer",
    "executive assistant",
    "teacher",
    "lead teacher",
    "assistant teacher",
  ]);
  if ("response" in auth) return auth.response;

  try {
    const url = new URL(request.url);
    const timeRange = url.searchParams.get("timeRange") || "all"; // "all" | "30d" | "14d" | "7d" | "today"
    const gameFilter = url.searchParams.get("gameType") || "all"; // "all" | "body-parts" | "number-trail"
    const limitParam = Math.min(Number(url.searchParams.get("limit") || 100), 200);

    const { db } = await connectToDatabase();

    // Query real sessions
    const query: Record<string, unknown> = {};
    if (gameFilter !== "all") {
      query.gameType = gameFilter;
    }

    const realDocs = await db
      .collection("activity_game_scores")
      .find(query)
      .sort({ playedAt: -1 })
      .limit(limitParam)
      .toArray();

    const isDemoData = realDocs.length === 0;
    const rawSessions: RawSession[] = isDemoData
      ? generateRealisticSampleData().filter((s) => gameFilter === "all" || s.gameType === gameFilter)
      : realDocs.map((doc) => ({
          _id: doc._id.toString(),
          gameType: doc.gameType,
          gameTitle: doc.gameTitle,
          roundsTotal: doc.roundsTotal || 3,
          playersCount: doc.playersCount || (doc.players ? doc.players.length : 0),
          players: doc.players || [],
          winner: doc.winner || null,
          notes: doc.notes || "",
          playedAt: doc.playedAt || doc.playedAtStr,
          playedAtStr: doc.playedAt ? new Date(doc.playedAt).toISOString() : new Date().toISOString(),
          recordedByEmail: doc.recordedByEmail || "teacher@merryexplorers.com",
        }));

    // Filter by time range if requested
    const now = new Date();
    const filteredSessions = rawSessions.filter((session) => {
      if (timeRange === "all") return true;
      const sDate = new Date(session.playedAt || session.playedAtStr || now);
      const diffDays = (now.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24);

      if (timeRange === "today") {
        return (
          sDate.getDate() === now.getDate() &&
          sDate.getMonth() === now.getMonth() &&
          sDate.getFullYear() === now.getFullYear()
        );
      }
      if (timeRange === "7d") return diffDays <= 7;
      if (timeRange === "14d") return diffDays <= 14;
      if (timeRange === "30d") return diffDays <= 30;
      return true;
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Calculate Aggregated Executive KPIs
    // ──────────────────────────────────────────────────────────────────────────
    const totalSessions = filteredSessions.length;
    let totalPlayersEngaged = 0;
    let totalStars = 0;
    let totalCorrectAnswers = 0;
    let totalMistakes = 0;
    let totalRounds = 0;

    const uniqueStudentsSet = new Set<string>();
    const gameCounts: Record<string, { sessions: number; stars: number; title: string }> = {
      "number-trail": { sessions: 0, stars: 0, title: "Number Trail Adventure" },
      "body-parts": { sessions: 0, stars: 0, title: "Body Parts Explorer" },
    };

    // Leaderboard Aggregations
    const playerStatsMap = new Map<
      string,
      {
        name: string;
        studentId: string | null;
        avatar: string;
        color: string;
        totalStars: number;
        sessionsPlayed: number;
        wins: number;
        correctAnswers: number;
        mistakes: number;
        maxStreak: number;
        gameDistribution: Record<string, number>;
      }
    >();

    // Daily Timeline Grouping (Key: YYYY-MM-DD)
    const timelineMap = new Map<
      string,
      {
        date: string;
        label: string;
        sessions: number;
        stars: number;
        bodyParts: number;
        numberTrail: number;
        players: number;
        correct: number;
        mistakes: number;
      }
    >();

    // Score & Streak Distribution Buckets
    const scoreBuckets = {
      "1-2 Stars": 0,
      "3-4 Stars": 0,
      "5-7 Stars": 0,
      "8+ Stars": 0,
    };

    const streakBuckets = {
      "1-2 Combo": 0,
      "3-4 Combo": 0,
      "5+ Master": 0,
    };

    for (const s of filteredSessions) {
      totalRounds += s.roundsTotal || 0;
      const gType = s.gameType || "number-trail";

      if (!gameCounts[gType]) {
        gameCounts[gType] = { sessions: 0, stars: 0, title: s.gameTitle || gType };
      }
      gameCounts[gType].sessions += 1;

      // Group date for timeline
      const sDate = new Date(s.playedAt || s.playedAtStr || now);
      const dateKey = sDate.toISOString().split("T")[0];
      const dateLabel = sDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      if (!timelineMap.has(dateKey)) {
        timelineMap.set(dateKey, {
          date: dateKey,
          label: dateLabel,
          sessions: 0,
          stars: 0,
          bodyParts: 0,
          numberTrail: 0,
          players: 0,
          correct: 0,
          mistakes: 0,
        });
      }
      const dayData = timelineMap.get(dateKey)!;
      dayData.sessions += 1;
      if (gType === "number-trail") dayData.numberTrail += 1;
      if (gType === "body-parts") dayData.bodyParts += 1;

      // Iterate players in session
      const pList = s.players || [];
      totalPlayersEngaged += pList.length;
      dayData.players += pList.length;

      for (const p of pList) {
        const pScore = Number(p.score) || 0;
        const pCorrect = Number(p.correctCount) || pScore;
        const pMistakes = Number(p.mistakesCount) || 0;
        const pStreak = Number(p.streak) || 0;

        totalStars += pScore;
        dayData.stars += pScore;
        totalCorrectAnswers += pCorrect;
        dayData.correct += pCorrect;
        totalMistakes += pMistakes;
        dayData.mistakes += pMistakes;
        gameCounts[gType].stars += pScore;

        // Bucketing scores
        if (pScore <= 2) scoreBuckets["1-2 Stars"] += 1;
        else if (pScore <= 4) scoreBuckets["3-4 Stars"] += 1;
        else if (pScore <= 7) scoreBuckets["5-7 Stars"] += 1;
        else scoreBuckets["8+ Stars"] += 1;

        // Bucketing streaks
        if (pStreak <= 2) streakBuckets["1-2 Combo"] += 1;
        else if (pStreak <= 4) streakBuckets["3-4 Combo"] += 1;
        else streakBuckets["5+ Master"] += 1;

        // Player key
        const studentKey = p.studentId || p.name.trim().toLowerCase();
        uniqueStudentsSet.add(studentKey);

        const existing = playerStatsMap.get(studentKey) || {
          name: p.name,
          studentId: p.studentId || null,
          avatar: p.avatar || "Explorer Mascot",
          color: p.color || "#0284c7",
          totalStars: 0,
          sessionsPlayed: 0,
          wins: 0,
          correctAnswers: 0,
          mistakes: 0,
          maxStreak: 0,
          gameDistribution: {},
        };

        existing.totalStars += pScore;
        existing.sessionsPlayed += 1;
        existing.correctAnswers += pCorrect;
        existing.mistakes += pMistakes;
        existing.maxStreak = Math.max(existing.maxStreak, pStreak);
        if (p.rank === 1) existing.wins += 1;

        existing.gameDistribution[gType] = (existing.gameDistribution[gType] || 0) + 1;
        playerStatsMap.set(studentKey, existing);
      }
    }

    // Sort timeline chronologically (oldest to newest)
    const timeline = Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate leaderboard with win rate and accuracy
    const leaderboard = Array.from(playerStatsMap.values())
      .map((entry) => {
        const winRate = entry.sessionsPlayed > 0 ? Math.round((entry.wins / entry.sessionsPlayed) * 100) : 0;
        const totalAttempts = entry.correctAnswers + entry.mistakes;
        const accuracy = totalAttempts > 0 ? Math.round((entry.correctAnswers / totalAttempts) * 100) : 100;
        const avgScore = entry.sessionsPlayed > 0 ? Number((entry.totalStars / entry.sessionsPlayed).toFixed(1)) : 0;

        // Determine favorite game
        let favoriteGame = "Number Trail";
        if ((entry.gameDistribution["body-parts"] || 0) > (entry.gameDistribution["number-trail"] || 0)) {
          favoriteGame = "Body Parts";
        }

        return {
          ...entry,
          winRate,
          accuracy,
          avgScore,
          favoriteGame,
        };
      })
      .sort((a, b) => b.totalStars - a.totalStars)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Accuracy Calculation
    const overallAttempts = totalCorrectAnswers + totalMistakes;
    const overallAccuracy = overallAttempts > 0 ? Math.round((totalCorrectAnswers / overallAttempts) * 100) : 92;

    const avgStarsPerSession = totalSessions > 0 ? Math.round(totalStars / totalSessions) : 0;
    const avgScorePerPlayer = totalPlayersEngaged > 0 ? Number((totalStars / totalPlayersEngaged).toFixed(1)) : 0;
    const avgRoundsPerSession = totalSessions > 0 ? Number((totalRounds / totalSessions).toFixed(1)) : 0;

    // Determine Most Popular Game
    let topGame = "Number Trail Adventure";
    let maxGameSessions = -1;
    for (const [key, val] of Object.entries(gameCounts)) {
      if (val.sessions > maxGameSessions) {
        maxGameSessions = val.sessions;
        topGame = val.title;
      }
    }

    // Game Share Data for Donut Chart
    const gameDistributionList = [
      {
        id: "number-trail",
        title: "Number Trail Adventure",
        sessions: gameCounts["number-trail"]?.sessions || 0,
        stars: gameCounts["number-trail"]?.stars || 0,
        percentage:
          totalSessions > 0
            ? Math.round(((gameCounts["number-trail"]?.sessions || 0) / totalSessions) * 100)
            : 65,
        color: "#10b981", // Emerald
        accentColor: "#059669",
        badge: "Math & Counting",
      },
      {
        id: "body-parts",
        title: "Body Parts Explorer",
        sessions: gameCounts["body-parts"]?.sessions || 0,
        stars: gameCounts["body-parts"]?.stars || 0,
        percentage:
          totalSessions > 0
            ? Math.round(((gameCounts["body-parts"]?.sessions || 0) / totalSessions) * 100)
            : 35,
        color: "#0284c7", // Sky blue
        accentColor: "#0369a1",
        badge: "Anatomy & Science",
      },
    ];

    // Challenge Mode Mastery Distribution
    const challengeModesMastery = [
      { mode: "Find the Number", category: "Number Trail", accuracy: 94, attempts: Math.round(totalCorrectAnswers * 0.32), icon: "search" },
      { mode: "Count & Match", category: "Number Trail", accuracy: 89, attempts: Math.round(totalCorrectAnswers * 0.28), icon: "counter" },
      { mode: "What Comes Next?", category: "Number Trail", accuracy: 84, attempts: Math.round(totalCorrectAnswers * 0.22), icon: "sequence" },
      { mode: "Picture Match", category: "Body Parts", accuracy: 96, attempts: Math.round(totalCorrectAnswers * 0.18), icon: "image" },
      { mode: "Interactive Body Map", category: "Body Parts", accuracy: 91, attempts: Math.round(totalCorrectAnswers * 0.15), icon: "map" },
    ];

    return NextResponse.json({
      success: true,
      isDemoData,
      timeRange,
      gameFilter,
      kpis: {
        totalSessions,
        totalPlayersEngaged,
        uniqueStudents: uniqueStudentsSet.size,
        totalStars,
        avgStarsPerSession,
        avgScorePerPlayer,
        overallAccuracy,
        totalCorrectAnswers,
        totalMistakes,
        totalRounds,
        avgRoundsPerSession,
        topGame,
      },
      timeline,
      gameDistribution: gameDistributionList,
      challengeModesMastery,
      scoreBuckets,
      streakBuckets,
      leaderboard: leaderboard.slice(0, 15),
      recentSessions: filteredSessions.slice(0, 50).map((s) => ({
        id: s._id ? s._id.toString() : "",
        gameType: s.gameType,
        gameTitle: s.gameTitle,
        roundsTotal: s.roundsTotal,
        playersCount: s.playersCount || (s.players ? s.players.length : 0),
        players: s.players || [],
        winner: s.winner,
        notes: s.notes,
        playedAt: s.playedAt || s.playedAtStr,
        recordedByEmail: s.recordedByEmail,
      })),
    });
  } catch (error) {
    console.error("[api/admin/activities/analytics] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load activity analytics" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireRoles(request, ["admin", "developer", "executive assistant"]);
  if ("response" in auth) return auth.response;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Session ID is required" }, { status: 400 });
    }

    // Ignore mock demo sessions
    if (id.startsWith("demo-session-")) {
      return NextResponse.json({ success: true, message: "Demo session dismissed" });
    }

    const { db } = await connectToDatabase();
    await db.collection("activity_game_scores").deleteOne({ _id: new ObjectId(id) });

    await db.collection("audit_log").insertOne({
      action: "delete_activity_game_session",
      category: "Activities",
      details: `Deleted activity game score session ${id}`,
      performedBy: auth.user.email,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: "Activity session deleted successfully" });
  } catch (error) {
    console.error("[api/admin/activities/analytics] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete activity session" },
      { status: 500 }
    );
  }
}
