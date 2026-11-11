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
    const timeRange = url.searchParams.get("timeRange") || "all";
    const gameFilter = url.searchParams.get("gameType") || "all";
    const limitParam = Math.min(Number(url.searchParams.get("limit") || 500), 1000);

    const { db } = await connectToDatabase();

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Strictly Query Live Sessions from Database (Zero Invented Data)
    // ──────────────────────────────────────────────────────────────────────────
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

    const rawSessions: RawSession[] = realDocs.map((doc) => ({
      _id: doc._id.toString(),
      gameType: doc.gameType,
      gameTitle: doc.gameTitle || (doc.gameType === "number-trail" ? "Number Trail Adventure" : "Body Parts Explorer"),
      roundsTotal: doc.roundsTotal || 3,
      playersCount: doc.playersCount || (doc.players ? doc.players.length : 0),
      players: doc.players || [],
      winner:
        doc.winner ||
        (doc.players && doc.players.length > 0
          ? [...doc.players].sort((a: RawPlayer, b: RawPlayer) => (b.score || 0) - (a.score || 0))[0]
          : null),
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
    // 2. Calculate Aggregated Executive KPIs (Live Real Numbers Only)
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

    // Challenge Mastery Dynamic Accumulator
    const masteryMap: Record<
      string,
      { title: string; category: string; correct: number; mistakes: number; sessions: number }
    > = {
      "body-parts-map": { title: "Body Map Match", category: "Body Parts Explorer", correct: 0, mistakes: 0, sessions: 0 },
      "body-parts-pic": { title: "Picture Match", category: "Body Parts Explorer", correct: 0, mistakes: 0, sessions: 0 },
      "number-trail-main": { title: "Number Recognition & Trail", category: "Number Trail Adventure", correct: 0, mistakes: 0, sessions: 0 },
    };

    // Student Intelligence & History Map
    type StudentEntry = {
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
      bodyPartsStars: number;
      bodyPartsMatches: number;
      numberTrailStars: number;
      numberTrailMatches: number;
      lastPlayedAt: string;
      gameDistribution: Record<string, number>;
      isTestAccount?: boolean;
      history: {
        sessionId: string;
        gameTitle: string;
        gameType: string;
        playedAt: string;
        score: number;
        correctCount: number;
        mistakesCount: number;
        streak: number;
        rank: number;
        roundsTotal: number;
        notes?: string;
        facilitator?: string;
      }[];
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Query Live Class Roster Students (Trailblazers / Brave Explorers)
    // ──────────────────────────────────────────────────────────────────────────
    const rawRoster = await db
      .collection("students")
      .find({
        $or: [
          { program: { $regex: /trailblazer|brave/i } },
          { programName: { $regex: /trailblazer|brave/i } },
        ],
      })
      .sort({ "childInfo.firstName": 1 })
      .toArray();

    const DEFAULT_COLORS = ["#0284c7", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];
    const DEFAULT_AVATARS = [
      "Puppy Explorer",
      "Kitten Explorer",
      "Bear Explorer",
      "Fox Explorer",
      "Lion Explorer",
      "Bunny Explorer",
      "Panda Explorer",
    ];

    const seenRosterNames = new Set<string>();
    const realRosterStudents: { id: string; name: string }[] = [];
    const playerStatsMap = new Map<string, StudentEntry>();

    // Prepopulate playerStatsMap with all available students from live class roster (0 baseline)
    rawRoster.forEach((s, idx) => {
      const child = (s.childInfo as Record<string, string>) || {};
      const firstName = (child.firstName || "").trim();
      const lastName = (child.lastName || "").trim();
      const nickname = (child.nickname || "").trim() || firstName;
      const fullName = [firstName, lastName].filter(Boolean).join(" ");
      if (!fullName && !nickname) return;

      const normName = (nickname || firstName).toLowerCase();
      if (seenRosterNames.has(normName)) return;

      // Exclude Kaili (now a Creative Explorer)
      if (/kaili|suaverdez/i.test(fullName) || /kaili/i.test(nickname)) return;

      seenRosterNames.add(normName);

      const isTest = Boolean(
        s.isTestAccount ||
        (s as Record<string, unknown>).testAccount ||
        /gelo/i.test(nickname) ||
        /ian\s+angelo\s+valmores/i.test(fullName)
      );

      const sId = s._id.toString();
      realRosterStudents.push({ id: sId, name: nickname });

      playerStatsMap.set(normName, {
        name: nickname,
        studentId: sId,
        avatar: child.favoriteCharacter || DEFAULT_AVATARS[idx % DEFAULT_AVATARS.length],
        color: child.favoriteColor || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
        totalStars: 0,
        sessionsPlayed: 0,
        wins: 0,
        correctAnswers: 0,
        mistakes: 0,
        maxStreak: 0,
        bodyPartsStars: 0,
        bodyPartsMatches: 0,
        numberTrailStars: 0,
        numberTrailMatches: 0,
        lastPlayedAt: "",
        gameDistribution: {},
        history: [],
        isTestAccount: isTest,
      });
    });

    const scoreBuckets: Record<string, number> = {
      "1–2 Stars": 0,
      "3–4 Stars": 0,
      "5–7 Stars": 0,
      "8+ Stars": 0,
    };

    const streakBuckets: Record<string, number> = {
      "1–2 Combo": 0,
      "3–4 Combo": 0,
      "5+ Master": 0,
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Construct Continuous Date Timeline (Zero Baseline)
    // ──────────────────────────────────────────────────────────────────────────
    type TimelinePoint = {
      date: string;
      label: string;
      dayOfWeek: string;
      sessions: number;
      stars: number;
      bodyParts: number;
      numberTrail: number;
      players: number;
      correct: number;
      mistakes: number;
    };

    const timelineMap = new Map<string, TimelinePoint>();

    const daysCount =
      timeRange === "today" ? 1 : timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : timeRange === "30d" ? 30 : 14;

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "short" });
      timelineMap.set(dateKey, {
        date: dateKey,
        label,
        dayOfWeek,
        sessions: 0,
        stars: 0,
        bodyParts: 0,
        numberTrail: 0,
        players: 0,
        correct: 0,
        mistakes: 0,
      });
    }

    // Process all live sessions
    for (const s of filteredSessions) {
      const gType = s.gameType === "number-trail" ? "number-trail" : "body-parts";
      if (!gameCounts[gType]) {
        gameCounts[gType] = {
          sessions: 0,
          stars: 0,
          title: s.gameTitle || (gType === "number-trail" ? "Number Trail" : "Body Parts"),
        };
      }
      gameCounts[gType].sessions += 1;
      totalRounds += s.roundsTotal || 3;

      // Classify challenge mode
      let masteryKey = "number-trail-main";
      if (gType === "body-parts") {
        if (s.gameTitle.toLowerCase().includes("map")) masteryKey = "body-parts-map";
        else masteryKey = "body-parts-pic";
      }
      if (masteryMap[masteryKey]) {
        masteryMap[masteryKey].sessions += 1;
      }

      // Date key for timeline
      const sDateObj = new Date(s.playedAt || s.playedAtStr || now);
      const sDateKey = sDateObj.toISOString().split("T")[0];
      const label = sDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dayOfWeek = sDateObj.toLocaleDateString("en-US", { weekday: "short" });

      if (!timelineMap.has(sDateKey)) {
        timelineMap.set(sDateKey, {
          date: sDateKey,
          label,
          dayOfWeek,
          sessions: 0,
          stars: 0,
          bodyParts: 0,
          numberTrail: 0,
          players: 0,
          correct: 0,
          mistakes: 0,
        });
      }

      const dayData = timelineMap.get(sDateKey)!;
      dayData.sessions += 1;
      if (gType === "body-parts") dayData.bodyParts += 1;
      else if (gType === "number-trail") dayData.numberTrail += 1;

      const pList = s.players || [];
      totalPlayersEngaged += pList.length;
      dayData.players += pList.length;

      for (const p of pList) {
        const pScore = Number(p.score) || 0;
        const pCorrect = Number(p.correctCount) || (pScore > 10 ? Math.round(pScore / 100) : pScore);
        const pMistakes = Number(p.mistakesCount) || 0;
        const pStreak = Number(p.streak) || 0;

        totalStars += pScore;
        dayData.stars += pScore;
        totalCorrectAnswers += pCorrect;
        dayData.correct += pCorrect;
        totalMistakes += pMistakes;
        dayData.mistakes += pMistakes;
        gameCounts[gType].stars += pScore;

        if (masteryMap[masteryKey]) {
          masteryMap[masteryKey].correct += pCorrect;
          masteryMap[masteryKey].mistakes += pMistakes;
        }

        // Bucketing scores
        if (pScore <= 2) scoreBuckets["1–2 Stars"] += 1;
        else if (pScore <= 4) scoreBuckets["3–4 Stars"] += 1;
        else if (pScore <= 7) scoreBuckets["5–7 Stars"] += 1;
        else scoreBuckets["8+ Stars"] += 1;

        // Bucketing streaks
        if (pStreak <= 2) streakBuckets["1–2 Combo"] += 1;
        else if (pStreak <= 4) streakBuckets["3–4 Combo"] += 1;
        else streakBuckets["5+ Master"] += 1;

        // Player key matching: try studentId first, then normalized name
        const pNameKey = p.name ? p.name.trim().toLowerCase() : "";
        let matchedKey = pNameKey;

        if (p.studentId) {
          for (const [key, entry] of playerStatsMap.entries()) {
            if (entry.studentId === p.studentId) {
              matchedKey = key;
              break;
            }
          }
        }

        uniqueStudentsSet.add(matchedKey);

        const existing: StudentEntry = playerStatsMap.get(matchedKey) || {
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
          bodyPartsStars: 0,
          bodyPartsMatches: 0,
          numberTrailStars: 0,
          numberTrailMatches: 0,
          lastPlayedAt: "",
          gameDistribution: {},
          history: [],
          isTestAccount: Boolean(/gelo/i.test(p.name)),
        };

        if (p.avatar) existing.avatar = p.avatar;
        if (p.color) existing.color = p.color;
        existing.lastPlayedAt = s.playedAt ? new Date(s.playedAt).toISOString() : existing.lastPlayedAt;
        existing.totalStars += pScore;
        existing.sessionsPlayed += 1;
        existing.correctAnswers += pCorrect;
        existing.mistakes += pMistakes;
        existing.maxStreak = Math.max(existing.maxStreak, pStreak);
        if (p.rank === 1) existing.wins += 1;

        if (gType === "body-parts") {
          existing.bodyPartsStars += pScore;
          existing.bodyPartsMatches += 1;
        } else if (gType === "number-trail") {
          existing.numberTrailStars += pScore;
          existing.numberTrailMatches += 1;
        }

        existing.gameDistribution[gType] = (existing.gameDistribution[gType] || 0) + 1;

        // Add to individual match history
        existing.history.push({
          sessionId: s._id ? s._id.toString() : "",
          gameTitle: s.gameTitle,
          gameType: s.gameType,
          playedAt: s.playedAt ? new Date(s.playedAt).toISOString() : new Date().toISOString(),
          score: pScore,
          correctCount: pCorrect,
          mistakesCount: pMistakes,
          streak: pStreak,
          rank: p.rank || 1,
          roundsTotal: s.roundsTotal || 3,
          notes: s.notes,
          facilitator: s.recordedByEmail?.split("@")[0] || "teacher",
        });

        playerStatsMap.set(matchedKey, existing);
      }
    }

    // Sort timeline chronologically (oldest to newest)
    const timeline = Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate leaderboard & student explorer profiles
    const leaderboard = Array.from(playerStatsMap.values())
      .map((entry) => {
        const winRate = entry.sessionsPlayed > 0 ? Math.round((entry.wins / entry.sessionsPlayed) * 100) : 0;
        const totalAttempts = entry.correctAnswers + entry.mistakes;
        const accuracy = totalAttempts > 0 ? Math.round((entry.correctAnswers / totalAttempts) * 100) : 0;
        const avgScore = entry.sessionsPlayed > 0 ? Math.round(entry.totalStars / entry.sessionsPlayed) : 0;

        let favoriteGame = "–";
        if (entry.sessionsPlayed > 0) {
          favoriteGame = entry.numberTrailMatches > entry.bodyPartsMatches ? "Number Trail" : "Body Parts";
        }

        // Award Skill Badges
        const skillBadges: string[] = [];
        if (entry.sessionsPlayed === 0) {
          skillBadges.push("Explorer");
        } else {
          if (accuracy >= 90) skillBadges.push("Precision Ace");
          if (entry.maxStreak >= 4) skillBadges.push("Streak Master");
          if (entry.wins >= 3) skillBadges.push("Champion Racer");
          if (entry.sessionsPlayed >= 5) skillBadges.push("Dedicated Explorer");
          if (entry.totalStars >= 1000) skillBadges.push("Star Voyager");
          if (skillBadges.length === 0) skillBadges.push("Trailblazer");
        }

        // Sort student's individual history descending
        entry.history.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());

        return {
          ...entry,
          winRate,
          accuracy,
          avgScore,
          favoriteGame,
          skillBadges,
          isTestAccount: Boolean(entry.isTestAccount || /gelo/i.test(entry.name)),
        };
      })
      .sort((a, b) => {
        if (b.totalStars !== a.totalStars) return b.totalStars - a.totalStars;
        if (b.sessionsPlayed !== a.sessionsPlayed) return b.sessionsPlayed - a.sessionsPlayed;
        return a.name.localeCompare(b.name);
      })
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Accuracy Calculation
    const overallAttempts = totalCorrectAnswers + totalMistakes;
    const overallAccuracy = overallAttempts > 0 ? Math.round((totalCorrectAnswers / overallAttempts) * 100) : 0;

    const avgStarsPerSession = totalSessions > 0 ? Math.round(totalStars / totalSessions) : 0;
    const avgScorePerPlayer = totalPlayersEngaged > 0 ? Math.round(totalStars / totalPlayersEngaged) : 0;
    const avgRoundsPerSession = totalSessions > 0 ? Number((totalRounds / totalSessions).toFixed(1)) : 0;

    // Determine Most Popular Game
    let topGame = totalSessions > 0 ? "Body Parts Explorer" : "None";
    let maxGameSessions = -1;
    for (const val of Object.values(gameCounts)) {
      if (val.sessions > maxGameSessions && val.sessions > 0) {
        maxGameSessions = val.sessions;
        topGame = val.title;
      }
    }

    // Game Share Data for Donut Chart
    const totalGameSessions = (gameCounts["number-trail"]?.sessions || 0) + (gameCounts["body-parts"]?.sessions || 0);
    const gameDistributionList = [
      {
        id: "body-parts",
        title: "Body Parts Explorer",
        sessions: gameCounts["body-parts"]?.sessions || 0,
        stars: gameCounts["body-parts"]?.stars || 0,
        percentage:
          totalGameSessions > 0
            ? Math.round(((gameCounts["body-parts"]?.sessions || 0) / totalGameSessions) * 100)
            : 0,
        color: "#0284c7",
        accentColor: "#0369a1",
        badge: "Anatomy & Science",
      },
      {
        id: "number-trail",
        title: "Number Trail Adventure",
        sessions: gameCounts["number-trail"]?.sessions || 0,
        stars: gameCounts["number-trail"]?.stars || 0,
        percentage:
          totalGameSessions > 0
            ? Math.round(((gameCounts["number-trail"]?.sessions || 0) / totalGameSessions) * 100)
            : 0,
        color: "#10b981",
        accentColor: "#059669",
        badge: "Math & Counting",
      },
    ];

    // Challenge Mode Mastery Distribution
    const challengeModesMastery = Object.values(masteryMap).map((m) => {
      const attempts = m.correct + m.mistakes;
      const acc = attempts > 0 ? Math.round((m.correct / attempts) * 100) : 0;
      return {
        mode: m.title,
        category: m.category,
        accuracy: acc,
        attempts,
        sessions: m.sessions,
        status: attempts === 0 && m.sessions === 0 ? "Awaiting matches" : acc >= 90 ? "Mastered" : "Proficient",
      };
    });

    // Class Roster Participation Analysis
    const activeCount = Array.from(playerStatsMap.values()).filter((e) => e.sessionsPlayed > 0).length;
    const totalRosterCount = realRosterStudents.length || playerStatsMap.size;
    const unplayed = Array.from(playerStatsMap.values()).filter((e) => e.sessionsPlayed === 0);
    const unplayedNames = unplayed.map((u) => u.name);
    const participationRate = totalRosterCount > 0 ? Math.round((activeCount / totalRosterCount) * 100) : 0;

    const rosterParticipation = {
      totalRoster: totalRosterCount,
      activeStudents: activeCount,
      unplayedStudents: unplayed.length,
      participationRate,
      unplayedNames,
    };

    return NextResponse.json({
      success: true,
      timeRange,
      gameFilter,
      isDemoData: false,
      kpis: {
        totalSessions,
        totalPlayersEngaged,
        activePlayers: activeCount,
        totalStars,
        avgStarsPerSession,
        avgScorePerPlayer,
        overallAccuracy,
        totalRounds,
        avgRoundsPerSession,
        topGame,
      },
      timeline,
      gameDistribution: gameDistributionList,
      challengeModesMastery,
      scoreBuckets,
      streakBuckets,
      leaderboard,
      rosterParticipation,
      recentSessions: filteredSessions.map((s) => ({
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
    const idParam = url.searchParams.get("id");
    const idsParam = url.searchParams.get("ids");
    const deleteAllParam = url.searchParams.get("deleteAll") === "true";
    const gameTypeParam = url.searchParams.get("gameType");

    let body: { id?: string; ids?: string[]; deleteAll?: boolean; gameType?: string } = {};
    if (request.headers.get("content-type")?.includes("application/json")) {
      try {
        body = await request.json();
      } catch {
        // empty body ok
      }
    }

    const { db } = await connectToDatabase();

    // 1. Delete All Sessions (with optional gameType filter)
    if (deleteAllParam || body.deleteAll) {
      const filter: Record<string, unknown> = {};
      const targetGame = gameTypeParam || body.gameType;
      if (targetGame && targetGame !== "all") {
        filter.gameType = targetGame;
      }

      const deleteResult = await db.collection("activity_game_scores").deleteMany(filter);

      await db.collection("audit_log").insertOne({
        action: "delete_all_activity_game_sessions",
        category: "Activities",
        details: `Deleted all (${deleteResult.deletedCount}) activity game sessions${
          targetGame ? ` for gameType: ${targetGame}` : ""
        }`,
        performedBy: auth.user.email,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `Permanently deleted all ${deleteResult.deletedCount} activity session(s)`,
        deletedCount: deleteResult.deletedCount,
      });
    }

    // 2. Single or Bulk IDs Deletion
    const candidateIds: string[] = [];
    if (idParam) candidateIds.push(idParam);
    if (body.id) candidateIds.push(body.id);
    if (idsParam) candidateIds.push(...idsParam.split(","));
    if (Array.isArray(body.ids)) candidateIds.push(...body.ids);

    const validObjectIds = candidateIds
      .map((s) => s.trim())
      .filter((s) => ObjectId.isValid(s))
      .map((s) => new ObjectId(s));

    if (validObjectIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid activity session IDs found to delete" },
        { status: 400 }
      );
    }

    const deleteResult = await db
      .collection("activity_game_scores")
      .deleteMany({ _id: { $in: validObjectIds } });

    await db.collection("audit_log").insertOne({
      action: "delete_activity_game_sessions",
      category: "Activities",
      details: `Deleted ${deleteResult.deletedCount} activity game session(s): [${validObjectIds.join(", ")}]`,
      performedBy: auth.user.email,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} session(s)`,
      deletedCount: deleteResult.deletedCount,
    });
  } catch (error) {
    console.error("[api/admin/activities/analytics] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete activity session" },
      { status: 500 }
    );
  }
}
