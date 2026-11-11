"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type PlayerRecord = {
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

type SessionRecord = {
  id: string;
  gameType: string;
  gameTitle: string;
  roundsTotal: number;
  playersCount: number;
  players: PlayerRecord[];
  winner?: PlayerRecord | null;
  notes?: string;
  playedAt: string;
  recordedByEmail?: string;
};

type LeaderboardStudent = {
  rank: number;
  name: string;
  studentId: string | null;
  avatar: string;
  color: string;
  totalStars: number;
  sessionsPlayed: number;
  wins: number;
  winRate: number;
  accuracy: number;
  avgScore: number;
  maxStreak: number;
  favoriteGame: string;
};

type TimelinePoint = {
  date: string;
  label: string;
  dayOfWeek?: string;
  sessions: number;
  stars: number;
  bodyParts: number;
  numberTrail: number;
  players: number;
  correct: number;
  mistakes: number;
};

type GameShareItem = {
  id: string;
  title: string;
  sessions: number;
  stars: number;
  percentage: number;
  color: string;
  accentColor: string;
  badge: string;
};

type ChallengeMasteryItem = {
  mode: string;
  category: string;
  accuracy: number;
  attempts: number;
  sessions?: number;
  status?: string;
};

type AnalyticsPayload = {
  success: boolean;
  isDemoData: boolean;
  timeRange: string;
  gameFilter: string;
  kpis: {
    totalSessions: number;
    totalPlayersEngaged: number;
    uniqueStudents: number;
    totalStars: number;
    avgStarsPerSession: number;
    avgScorePerPlayer: number;
    overallAccuracy: number;
    totalCorrectAnswers: number;
    totalMistakes: number;
    totalRounds: number;
    avgRoundsPerSession: number;
    topGame: string;
  };
  timeline: TimelinePoint[];
  gameDistribution: GameShareItem[];
  challengeModesMastery: ChallengeMasteryItem[];
  scoreBuckets: Record<string, number>;
  streakBuckets: Record<string, number>;
  leaderboard: LeaderboardStudent[];
  recentSessions: SessionRecord[];
};

// ─── SVG ICONS (CLEAN VECTOR, NO EMOJIS) ──────────────────────────────────────

function TrophyIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M19 4h-2V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1H5a3 3 0 0 0-3 3v2a5 5 0 0 0 4.54 4.97A6 6 0 0 0 11 16.9V19H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-2.1a6 6 0 0 0 4.46-2.93A5 5 0 0 0 22 9V7a3 3 0 0 0-3-3zM4 9V7a1 1 0 0 1 1-1h2v4.88A3 3 0 0 1 4 9zm16 0a3 3 0 0 1-3 1.88V6h2a1 1 0 0 1 1 1v2z" />
    </svg>
  );
}

function StarIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="m12 2.5 2.92 6.53 7.08.61-5.35 4.67 1.57 6.94L12 17.62l-6.22 3.63 1.57-6.94L2 9.64l7.08-.61L12 2.5z" />
    </svg>
  );
}

function TargetIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function UsersIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function GamepadIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="15" y1="13" x2="15.01" y2="13" />
      <line x1="18" y1="11" x2="18.01" y2="11" />
      <rect x="2" y="6" width="20" height="12" rx="6" />
    </svg>
  );
}

function RefreshIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  );
}

function SparklesIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" />
    </svg>
  );
}

function FlagIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PlayIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function ChevronLeftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function GamesAnalyticsDashboard() {
  const { user } = useAuth();

  const [timeRange, setTimeRange] = useState<"all" | "30d" | "14d" | "7d" | "today">("14d");
  const [gameFilter, setGameFilter] = useState<"all" | "number-trail" | "body-parts">("all");
  const [timelineMetric, setTimelineMetric] = useState<"sessions" | "stars">("sessions");
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Table Pagination State
  const [tableFilterGame, setTableFilterGame] = useState<"all" | "body-parts" | "number-trail">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    try {
      const token = await user?.getIdToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  }, [user]);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({
        timeRange,
        gameType: gameFilter,
      });

      const res = await fetch(`/api/admin/activities/analytics?${params.toString()}`, { headers });
      const json: AnalyticsPayload = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("[GamesAnalytics] Failed to fetch data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, timeRange, gameFilter]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Handle Delete Session
  const handleDeleteSession = async (sessionId: string) => {
    setIsDeleting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/activities/analytics?id=${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
        headers,
      });
      const result = await res.json();
      if (result.success) {
        setDeleteConfirmId(null);
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null);
        }
        await fetchAnalytics();
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered recent sessions for search & game tabs
  const filteredRecentSessions = useMemo(() => {
    if (!data?.recentSessions) return [];
    let list = data.recentSessions;

    if (tableFilterGame !== "all") {
      list = list.filter((s) => s.gameType === tableFilterGame);
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter((s) => {
      const hasPlayer = s.players.some((p) => p.name.toLowerCase().includes(q));
      const hasTeacher = s.recordedByEmail?.toLowerCase().includes(q);
      const hasGame = s.gameTitle.toLowerCase().includes(q);
      const hasNotes = s.notes?.toLowerCase().includes(q);
      return hasPlayer || hasTeacher || hasGame || hasNotes;
    });
  }, [data?.recentSessions, tableFilterGame, searchQuery]);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, tableFilterGame, pageSize]);

  // Pagination calculation
  const totalItems = filteredRecentSessions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedSessions = useMemo(() => {
    return filteredRecentSessions.slice(startIndex, endIndex);
  }, [filteredRecentSessions, startIndex, endIndex]);

  // Maximum value for SVG chart scaling
  const timelineMax = useMemo(() => {
    if (!data?.timeline || data.timeline.length === 0) return 10;
    const values = data.timeline.map((t) => (timelineMetric === "sessions" ? t.sessions : t.stars));
    return Math.max(...values, timelineMetric === "sessions" ? 4 : 500);
  }, [data?.timeline, timelineMetric]);

  // Table Game Counts for quick tabs
  const bodyPartsCount = useMemo(() => {
    return (data?.recentSessions || []).filter((s) => s.gameType === "body-parts").length;
  }, [data?.recentSessions]);

  const numberTrailCount = useMemo(() => {
    return (data?.recentSessions || []).filter((s) => s.gameType === "number-trail").length;
  }, [data?.recentSessions]);

  return (
    <AppShell
      title="Games Analytics"
      description="Classroom learning analytics, student mastery, and performance insights."
    >
      <div className="w-full space-y-7 pb-16 sm:space-y-9">
        {/* ─── Top Executive Header ─── */}
        <header className="relative flex flex-col justify-between gap-5 rounded-[32px] border border-[#cbe0f5] bg-gradient-to-br from-[#002f76] via-[#003d99] to-[#014fb8] p-6 text-white shadow-[0_18px_45px_rgba(0,47,118,0.24)] sm:p-8 lg:flex-row lg:items-center">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-400/15 px-3.5 py-1 text-[11px] font-black uppercase tracking-[.18em] text-[#ffdd80] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#ffb800] shadow-[0_0_8px_#ffb800]" />
              Classroom & Learning Analytics
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-[40px] lg:leading-[1.12]">
              Games & Activities Analytics
            </h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-blue-100 sm:text-base">
              Synchronized metrics across Number Trail Adventure and Body Parts Explorer. Live student performance, accuracy rates, and milestone achievements.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <Link
              href="/teacher/activities"
              className="inline-flex items-center gap-2.5 rounded-2xl bg-[#ffbd22] px-5 py-3 text-xs font-black text-[#523500] shadow-[0_8px_20px_rgba(255,189,34,0.35)] transition duration-200 hover:brightness-110 active:scale-95"
            >
              <PlayIcon className="h-4 w-4" />
              <span>Launch Teacher Game Hub</span>
            </Link>

            <button
              type="button"
              onClick={fetchAnalytics}
              disabled={isLoading}
              title="Refresh Analytics"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-xs font-bold text-white shadow-xs backdrop-blur-sm transition hover:bg-white/20 active:scale-95 disabled:opacity-50"
            >
              <RefreshIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* ─── Filter Bar ─── */}
        <div className="flex flex-col justify-between gap-4 rounded-3xl border border-[#dbe4f1] bg-white p-4 shadow-[0_6px_20px_rgba(0,47,118,0.04)] sm:flex-row sm:items-center">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="mr-2 text-[11px] font-black uppercase tracking-wider text-[#637d9f]">Time Range:</span>
            {[
              { id: "all", label: "All Time" },
              { id: "30d", label: "30 Days" },
              { id: "14d", label: "14 Days" },
              { id: "7d", label: "7 Days" },
              { id: "today", label: "Today" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeRange(t.id as typeof timeRange)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                  timeRange === t.id
                    ? "bg-[#002f76] text-white shadow-xs"
                    : "text-[#476082] hover:bg-[#f0f4fa]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Game Filter Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="mr-2 text-[11px] font-black uppercase tracking-wider text-[#637d9f]">Filter Activity:</span>
            {[
              { id: "all", label: "All Activities" },
              { id: "body-parts", label: "Body Parts" },
              { id: "number-trail", label: "Number Trail" },
            ].map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGameFilter(g.id as typeof gameFilter)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                  gameFilter === g.id
                    ? "bg-[#0284c7] text-white shadow-xs"
                    : "text-[#476082] hover:bg-[#f0f4fa]"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── SECTION 1: Executive KPI Metrics Grid ─── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {/* KPI 1: Sessions */}
          <div className="group rounded-[24px] border border-[#d6e3f2] bg-white p-5 shadow-[0_6px_20px_rgba(0,47,118,0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#6480a4]">Total Sessions</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#eaf3fe] text-[#002f76]">
                <GamepadIcon className="h-4.5 w-4.5" />
              </span>
            </div>
            <div className="mt-3 text-3xl font-black text-[#002f76]">
              {isLoading ? "–" : (data?.kpis.totalSessions ?? 0).toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] font-bold text-[#6680a3]">
              Recorded classroom games
            </div>
          </div>

          {/* KPI 2: Total Stars */}
          <div className="group rounded-[24px] border border-amber-200 bg-gradient-to-br from-[#fffdf5] via-white to-white p-5 shadow-[0_6px_20px_rgba(245,158,11,0.06)] transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">Stars Earned</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <StarIcon className="h-4.5 w-4.5" />
              </span>
            </div>
            <div className="mt-3 text-3xl font-black text-amber-600">
              {isLoading ? "–" : (data?.kpis.totalStars ?? 0).toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] font-bold text-amber-800/80">
              ~{(data?.kpis.avgStarsPerSession ?? 0).toLocaleString()} stars / session
            </div>
          </div>

          {/* KPI 3: Explorers */}
          <div className="group rounded-[24px] border border-emerald-200 bg-gradient-to-br from-[#f6fdf9] via-white to-white p-5 shadow-[0_6px_20px_rgba(16,185,129,0.06)] transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">Active Explorers</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <UsersIcon className="h-4.5 w-4.5" />
              </span>
            </div>
            <div className="mt-3 text-3xl font-black text-emerald-700">
              {isLoading ? "–" : data?.kpis.uniqueStudents ?? 0}
            </div>
            <div className="mt-1 text-[11px] font-bold text-emerald-800/80">
              {data?.kpis.totalPlayersEngaged ?? 0} participant turns
            </div>
          </div>

          {/* KPI 4: Overall Accuracy */}
          <div className="group rounded-[24px] border border-indigo-200 bg-gradient-to-br from-[#f8f9ff] via-white to-white p-5 shadow-[0_6px_20px_rgba(99,102,241,0.06)] transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-800">Overall Accuracy</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <TargetIcon className="h-4.5 w-4.5" />
              </span>
            </div>
            <div className="mt-3 text-3xl font-black text-indigo-600">
              {isLoading ? "–" : `${data?.kpis.overallAccuracy ?? 0}%`}
            </div>
            <div className="mt-1 text-[11px] font-bold text-indigo-800/80">
              {data?.kpis.totalCorrectAnswers ?? 0} correct answers
            </div>
          </div>

          {/* KPI 5: Total Rounds */}
          <div className="group rounded-[24px] border border-cyan-200 bg-gradient-to-br from-[#f4fbfc] via-white to-white p-5 shadow-[0_6px_20px_rgba(6,182,212,0.06)] transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-800">Total Rounds</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-600">
                <FlagIcon className="h-4.5 w-4.5" />
              </span>
            </div>
            <div className="mt-3 text-3xl font-black text-cyan-700">
              {isLoading ? "–" : (data?.kpis.totalRounds ?? 0).toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] font-bold text-cyan-800/80">
              ~{data?.kpis.avgRoundsPerSession ?? 0} rounds / match
            </div>
          </div>

          {/* KPI 6: Top Game */}
          <div className="group rounded-[24px] border border-violet-200 bg-gradient-to-br from-[#faf7ff] via-white to-white p-5 shadow-[0_6px_20px_rgba(139,92,246,0.06)] transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-violet-800">Top Activity</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <TrophyIcon className="h-4.5 w-4.5" />
              </span>
            </div>
            <div className="mt-3 truncate text-base font-black text-violet-800" title={data?.kpis.topGame}>
              {isLoading ? "–" : data?.kpis.topGame?.replace(" Adventure", "").replace(" Explorer", "") ?? "Body Parts"}
            </div>
            <div className="mt-1 text-[11px] font-bold text-violet-800/80">
              Highest engagement
            </div>
          </div>
        </div>

        {/* ─── SECTION 2: Timeline Volume & Game Share (Charts 1 & 2) ─── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* CHART 1: Timeline Volume & Performance (8 cols) */}
          <div className="rounded-[28px] border border-[#d8e3f0] bg-white p-5 shadow-[0_6px_22px_rgba(0,47,118,0.05)] sm:p-7 lg:col-span-8 flex flex-col justify-between">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#002f76]" />
                  <h3 className="text-xl font-black text-[#002f76]">Activity Timeline</h3>
                </div>
                <p className="mt-1 text-xs font-semibold text-[#5a769c]">
                  Daily classroom sessions with color-coded activity breakdown
                </p>
              </div>

              {/* Toggle metric */}
              <div className="flex items-center gap-1 rounded-2xl bg-[#edf3fa] p-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTimelineMetric("sessions")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                    timelineMetric === "sessions"
                      ? "bg-white text-[#002f76] shadow-xs"
                      : "text-[#5a769c] hover:text-[#002f76]"
                  }`}
                >
                  Sessions Played
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineMetric("stars")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                    timelineMetric === "stars"
                      ? "bg-white text-amber-600 shadow-xs"
                      : "text-[#5a769c] hover:text-amber-600"
                  }`}
                >
                  Stars Earned
                </button>
              </div>
            </div>

            {/* SVG Timeline Chart */}
            <div className="mt-6 w-full">
              {!data?.timeline || data.timeline.length === 0 ? (
                <div className="flex h-60 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-xs font-bold text-slate-400">
                  No activity sessions recorded in this time range.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative h-60 w-full">
                    <svg viewBox="0 0 820 240" className="h-full w-full overflow-visible" preserveAspectRatio="none">
                      {/* Grid Horizontal Guide Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = 195 - ratio * 165;
                        const labelVal = Math.round(ratio * timelineMax);
                        return (
                          <g key={i}>
                            <line x1="45" y1={y} x2="810" y2={y} stroke="#edf2f8" strokeDasharray="4 4" strokeWidth="1" />
                            <text x="8" y={y + 4} fill="#8da4be" fontSize="10" fontWeight="bold">
                              {labelVal.toLocaleString()}
                            </text>
                          </g>
                        );
                      })}

                      {/* Stacked Bar Columns for each day */}
                      {data.timeline.map((point, index) => {
                        const totalPoints = data.timeline.length;
                        const availableWidth = 750;
                        const step = availableWidth / Math.max(totalPoints, 1);
                        const x = 55 + index * step + step / 2;
                        const barWidth = Math.min(Math.max(step * 0.55, 20), 44);

                        const totalVal = timelineMetric === "sessions" ? point.sessions : point.stars;
                        const totalHeight = (totalVal / timelineMax) * 165;
                        const totalY = 195 - totalHeight;

                        // Calculate split heights for sessions:
                        // Number Trail: Emerald green (#10b981)
                        // Body Parts: Sky/Brand blue (#0284c7)
                        let ntHeight = 0;
                        let bpHeight = 0;

                        if (timelineMetric === "sessions") {
                          ntHeight = (point.numberTrail / timelineMax) * 165;
                          bpHeight = (point.bodyParts / timelineMax) * 165;
                        } else {
                          // Stars metric: uniform golden amber bar
                          ntHeight = totalHeight;
                        }

                        const isHovered = hoveredPointIndex === index;

                        return (
                          <g
                            key={point.date}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredPointIndex(index)}
                            onMouseLeave={() => setHoveredPointIndex(null)}
                          >
                            {/* Column highlight on hover */}
                            {isHovered && (
                              <rect
                                x={x - step / 2}
                                y={30}
                                width={step}
                                height={170}
                                fill="#002f76"
                                fillOpacity="0.04"
                                rx="8"
                              />
                            )}

                            {timelineMetric === "sessions" ? (
                              <>
                                {/* Number Trail bottom segment */}
                                {ntHeight > 0 && (
                                  <rect
                                    x={x - barWidth / 2}
                                    y={195 - ntHeight}
                                    width={barWidth}
                                    height={ntHeight}
                                    rx={bpHeight === 0 ? barWidth / 3 : 0}
                                    fill="#10b981"
                                    className="transition-all duration-200"
                                  />
                                )}

                                {/* Body Parts top segment */}
                                {bpHeight > 0 && (
                                  <rect
                                    x={x - barWidth / 2}
                                    y={195 - ntHeight - bpHeight}
                                    width={barWidth}
                                    height={bpHeight}
                                    rx={barWidth / 3}
                                    fill="#0284c7"
                                    className="transition-all duration-200"
                                  />
                                )}
                              </>
                            ) : (
                              /* Stars earned bar */
                              <rect
                                x={x - barWidth / 2}
                                y={totalY}
                                width={barWidth}
                                height={totalHeight}
                                rx={barWidth / 3}
                                fill="#f59e0b"
                                className="transition-all duration-200"
                              />
                            )}

                            {/* Value label on top of bar */}
                            {totalVal > 0 && (
                              <text
                                x={x}
                                y={totalY - 8}
                                textAnchor="middle"
                                fill="#002f76"
                                fontSize="11"
                                fontWeight="bold"
                              >
                                {totalVal.toLocaleString()}
                              </text>
                            )}

                            {/* X-axis date label */}
                            <text
                              x={x}
                              y={220}
                              textAnchor="middle"
                              fill="#6b84a2"
                              fontSize="10"
                              fontWeight="bold"
                            >
                              {point.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Interactive Tooltip Card */}
                    {hoveredPointIndex !== null && data.timeline[hoveredPointIndex] && (
                      <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-2xl border border-[#c9dcf0] bg-white/95 px-4 py-2.5 shadow-xl backdrop-blur-md text-xs font-bold text-[#002f76]">
                        <div className="flex items-center gap-2 border-b border-[#edf3fa] pb-1.5 mb-1.5">
                          <span className="font-black text-[#002f76]">
                            {data.timeline[hoveredPointIndex].label}
                          </span>
                          <span className="text-[#6480a4]">({data.timeline[hoveredPointIndex].dayOfWeek})</span>
                        </div>
                        <div className="flex items-center gap-4 text-[11px]">
                          <span className="inline-flex items-center gap-1.5 text-[#0284c7]">
                            <span className="h-2 w-2 rounded-full bg-[#0284c7]" />
                            Body Parts: <strong>{data.timeline[hoveredPointIndex].bodyParts}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                            Number Trail: <strong>{data.timeline[hoveredPointIndex].numberTrail}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-amber-600">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Stars: <strong>{data.timeline[hoveredPointIndex].stars.toLocaleString()}</strong>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chart Legend with Color Accuracy */}
                  <div className="flex flex-wrap items-center justify-between border-t border-[#edf2f8] pt-3.5 text-xs font-bold text-[#5a769c]">
                    <div className="flex items-center gap-5">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 rounded-md bg-[#0284c7]" />
                        <span className="text-[#002f76]">Body Parts Explorer</span>
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 rounded-md bg-[#10b981]" />
                        <span className="text-[#002f76]">Number Trail Adventure</span>
                      </span>
                      {timelineMetric === "stars" && (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-3 w-3 rounded-md bg-[#f59e0b]" />
                          <span className="text-amber-800">Stars Earned</span>
                        </span>
                      )}
                    </div>
                    <span>{data.timeline.length} active classroom days</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CHART 2: Game Distribution Donut (4 cols) */}
          <div className="rounded-[28px] border border-[#d8e3f0] bg-white p-5 shadow-[0_6px_22px_rgba(0,47,118,0.05)] sm:p-7 lg:col-span-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#0284c7]" />
                <h3 className="text-xl font-black text-[#002f76]">Game Share</h3>
              </div>
              <p className="mt-1 text-xs font-semibold text-[#5a769c]">
                Proportional volume across classroom activities
              </p>
            </div>

            {/* SVG Donut Visual */}
            <div className="relative my-6 flex items-center justify-center">
              <svg viewBox="0 0 180 180" className="h-48 w-48 -rotate-90 transform">
                <circle cx="90" cy="90" r="66" stroke="#f0f4fa" strokeWidth="26" fill="none" />
                {(() => {
                  const circumference = 2 * Math.PI * 66; // ~414.69
                  let cumulativeOffset = 0;

                  return data?.gameDistribution.map((game) => {
                    const strokeDasharray = `${(game.percentage / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -cumulativeOffset;
                    cumulativeOffset += (game.percentage / 100) * circumference;

                    return (
                      <circle
                        key={game.id}
                        cx="90"
                        cy="90"
                        r="66"
                        stroke={game.color}
                        strokeWidth="26"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        fill="none"
                        className="transition-all duration-500 hover:opacity-85"
                      />
                    );
                  });
                })()}
              </svg>

              {/* Donut Center Label */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-[#002f76]">
                  {data?.kpis.totalSessions ?? 0}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#6480a4]">
                  Total Matches
                </span>
              </div>
            </div>

            {/* Legend / Breakdown List with Direct Play Buttons */}
            <div className="space-y-2.5 border-t border-[#edf2f8] pt-4">
              {data?.gameDistribution.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between rounded-2xl border border-[#edf3fa] bg-[#f9fbfe] p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-3.5 rounded-lg shadow-xs" style={{ backgroundColor: game.color }} />
                    <div>
                      <span className="block font-black text-[#002f76]">{game.title}</span>
                      <span className="block text-[10px] font-semibold text-[#6480a4]">{game.badge}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-black text-[#002f76]">{game.sessions} plays ({game.percentage}%)</span>
                    <span className="block text-[10px] font-semibold text-amber-700">{game.stars.toLocaleString()}★</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── SECTION 3: Deep Dive Analytics (Charts 3 & 4) ─── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* CHART 3: Challenge Mode Mastery Progress (6 cols) */}
          <div className="rounded-[28px] border border-[#d8e3f0] bg-white p-5 shadow-[0_6px_22px_rgba(0,47,118,0.05)] sm:p-7 lg:col-span-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <h3 className="text-xl font-black text-[#002f76]">Challenge Mastery</h3>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#5a769c]">
                    Calculated accuracy rates across specific challenge types
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-black text-emerald-700 border border-emerald-200">
                  {data?.kpis.overallAccuracy ?? 88}% Mastery
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {data?.challengeModesMastery.map((item) => (
                  <div key={item.mode} className="rounded-2xl border border-[#e8eff8] bg-[#f8fafd] p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-black text-[#002f76]">{item.mode}</span>
                        <span className="ml-2 text-[10px] font-bold text-[#627d9e]">({item.category})</span>
                      </div>
                      <span className="font-black text-emerald-600 text-sm">{item.accuracy}%</span>
                    </div>
                    {/* Progress track */}
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e3ecf7]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0284c7] to-[#10b981] transition-all duration-500"
                        style={{ width: `${item.accuracy}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-[#6d87a7]">
                      <span>{item.sessions ?? 0} matches recorded</span>
                      <span className="text-emerald-700 font-black">{item.status || "Mastered"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-4 text-[11px] font-semibold text-[#6682a5]">
              Accuracy is derived from verified correct answers versus hints and mistakes during classroom turns.
            </p>
          </div>

          {/* CHART 4: Accomplishment & Streak Distribution (6 cols) */}
          <div className="rounded-[28px] border border-[#d8e3f0] bg-white p-5 shadow-[0_6px_22px_rgba(0,47,118,0.05)] sm:p-7 lg:col-span-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <h3 className="text-xl font-black text-[#002f76]">Score & Streak Dynamics</h3>
              </div>
              <p className="mt-1 text-xs font-semibold text-[#5a769c]">
                Classroom student achievement tiers and consecutive answer combos
              </p>
            </div>

            {/* Score Buckets Bar Histogram */}
            <div className="my-5 space-y-4">
              <div>
                <span className="mb-2 block text-[11px] font-black uppercase tracking-wider text-[#637d9f]">
                  Star Score Tiers Awarded
                </span>
                <div className="grid grid-cols-4 gap-2.5 text-center">
                  {Object.entries(data?.scoreBuckets || { "1–2 Stars": 0, "3–4 Stars": 0, "5–7 Stars": 0, "8+ Stars": 14 }).map(([tier, count]) => (
                    <div key={tier} className="rounded-2xl border border-[#d9e6f5] bg-gradient-to-b from-[#f8fafd] to-white p-3.5 shadow-xs">
                      <span className="block text-2xl font-black text-[#002f76]">{count}</span>
                      <span className="mt-1 block text-[10px] font-black text-[#5c7799] uppercase">{tier}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-2 block text-[11px] font-black uppercase tracking-wider text-[#637d9f]">
                  Unbroken Answer Combos
                </span>
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  {Object.entries(data?.streakBuckets || { "1–2 Combo": 0, "3–4 Combo": 4, "5+ Master": 10 }).map(([streak, count]) => (
                    <div key={streak} className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/70 to-white p-3.5 shadow-xs">
                      <span className="block text-2xl font-black text-amber-700">{count}</span>
                      <span className="mt-1 block text-[10px] font-black text-amber-900 uppercase">{streak}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[11px] font-semibold text-[#6682a5]">
              Combos grant celebratory audio fanfare and advance student explorers toward the victory podium.
            </p>
          </div>
        </div>

        {/* ─── SECTION 4: Explorer Hall of Fame (Student Leaderboard) ─── */}
        <div className="rounded-[28px] border border-[#d8e3f0] bg-white p-5 shadow-[0_6px_22px_rgba(0,47,118,0.05)] sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <TrophyIcon className="h-4 w-4" />
                </span>
                <h3 className="text-xl font-black text-[#002f76]">Explorer Hall of Fame</h3>
              </div>
              <p className="mt-1 text-xs font-semibold text-[#5a769c]">
                Classroom student rankings by cumulative stars, win rate, and game mastery
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-[#446083]">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{data?.leaderboard.length || 0} active student explorers</span>
            </div>
          </div>

          {/* Dynamic Podium Display (Adapts to 1, 2, or 3+ students) */}
          {data?.leaderboard && data.leaderboard.length > 0 && (
            <div className="my-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* 1st Place (Gold Champion) */}
              <div className="flex flex-col items-center rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 via-white to-white p-5 text-center shadow-md relative">
                <span className="absolute -top-3 flex items-center gap-1 rounded-full bg-amber-400 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-950 shadow-xs">
                  <TrophyIcon className="h-3 w-3" />
                  Champion
                </span>
                <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-amber-950">
                  1
                </span>
                <div
                  className="mt-2 flex h-14 w-14 items-center justify-center rounded-2xl border-2 font-black text-white shadow-sm ring-4 ring-amber-200/60 text-lg"
                  style={{ backgroundColor: data.leaderboard[0].color || "#f59e0b" }}
                >
                  {data.leaderboard[0].name.slice(0, 2).toUpperCase()}
                </div>
                <h4 className="mt-2 text-lg font-black text-[#002f76]">{data.leaderboard[0].name}</h4>
                <span className="text-[11px] font-bold text-[#5a769c]">{data.leaderboard[0].avatar}</span>
                <div className="mt-3 flex items-center gap-1.5 text-xl font-black text-amber-600">
                  <StarIcon className="h-5 w-5" />
                  <span>{data.leaderboard[0].totalStars.toLocaleString()} stars</span>
                </div>
                <span className="mt-1 text-[11px] font-bold text-amber-900">
                  {data.leaderboard[0].sessionsPlayed} matches · {data.leaderboard[0].winRate}% win rate
                </span>
              </div>

              {/* 2nd Place (Silver) */}
              {data.leaderboard.length >= 2 && (
                <div className="flex flex-col items-center rounded-2xl border-2 border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white p-5 text-center shadow-xs">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-300 text-xs font-black text-slate-800">
                    2
                  </span>
                  <div
                    className="mt-2 flex h-14 w-14 items-center justify-center rounded-2xl border-2 font-black text-white shadow-xs text-lg"
                    style={{ backgroundColor: data.leaderboard[1].color || "#ef4444" }}
                  >
                    {data.leaderboard[1].name.slice(0, 2).toUpperCase()}
                  </div>
                  <h4 className="mt-2 text-lg font-black text-[#002f76]">{data.leaderboard[1].name}</h4>
                  <span className="text-[11px] font-bold text-[#5a769c]">{data.leaderboard[1].avatar}</span>
                  <div className="mt-3 flex items-center gap-1.5 text-xl font-black text-amber-600">
                    <StarIcon className="h-4 w-4" />
                    <span>{data.leaderboard[1].totalStars.toLocaleString()} stars</span>
                  </div>
                  <span className="mt-1 text-[11px] font-bold text-slate-600">
                    {data.leaderboard[1].sessionsPlayed} matches · {data.leaderboard[1].winRate}% win rate
                  </span>
                </div>
              )}

              {/* 3rd Place (Bronze) */}
              {data.leaderboard.length >= 3 && (
                <div className="flex flex-col items-center rounded-2xl border-2 border-amber-700/20 bg-gradient-to-b from-amber-100/30 via-white to-white p-5 text-center shadow-xs">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 text-xs font-black text-amber-900">
                    3
                  </span>
                  <div
                    className="mt-2 flex h-14 w-14 items-center justify-center rounded-2xl border-2 font-black text-white shadow-xs text-lg"
                    style={{ backgroundColor: data.leaderboard[2].color || "#6366f1" }}
                  >
                    {data.leaderboard[2].name.slice(0, 2).toUpperCase()}
                  </div>
                  <h4 className="mt-2 text-lg font-black text-[#002f76]">{data.leaderboard[2].name}</h4>
                  <span className="text-[11px] font-bold text-[#5a769c]">{data.leaderboard[2].avatar}</span>
                  <div className="mt-3 flex items-center gap-1.5 text-xl font-black text-amber-600">
                    <StarIcon className="h-4 w-4" />
                    <span>{data.leaderboard[2].totalStars.toLocaleString()} stars</span>
                  </div>
                  <span className="mt-1 text-[11px] font-bold text-slate-600">
                    {data.leaderboard[2].sessionsPlayed} matches · {data.leaderboard[2].winRate}% win rate
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="overflow-x-auto rounded-2xl border border-[#e1eaf5]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafd] text-[11px] font-black uppercase tracking-wider text-[#6480a4]">
                <tr>
                  <th className="px-4 py-3 text-center">Rank</th>
                  <th className="px-4 py-3">Explorer</th>
                  <th className="px-4 py-3 text-center">Stars Earned</th>
                  <th className="px-4 py-3 text-center">Matches</th>
                  <th className="px-4 py-3 text-center">Win Rate</th>
                  <th className="px-4 py-3 text-center">Accuracy</th>
                  <th className="px-4 py-3 text-center">Max Streak</th>
                  <th className="px-4 py-3">Top Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf3fa] font-semibold text-[#002f76]">
                {data?.leaderboard.map((student) => (
                  <tr key={student.name} className="hover:bg-[#f6f9fc] transition">
                    <td className="px-4 py-3 text-center font-black">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                          student.rank === 1
                            ? "bg-amber-400 text-amber-950 font-black"
                            : student.rank === 2
                            ? "bg-slate-300 text-slate-800 font-bold"
                            : student.rank === 3
                            ? "bg-amber-200 text-amber-900 font-bold"
                            : "bg-[#edf3fa] text-[#557196]"
                        }`}
                      >
                        {student.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black text-white shadow-xs"
                          style={{ backgroundColor: student.color || "#0284c7" }}
                        >
                          {student.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-black text-[#002f76]">{student.name}</div>
                          <div className="text-[10px] text-[#5d779b]">{student.avatar}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-black text-amber-600">
                      <span className="inline-flex items-center gap-1">
                        <StarIcon className="h-3.5 w-3.5" />
                        {student.totalStars.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{student.sessionsPlayed}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        {student.winRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-[#002f76]">{student.accuracy}%</span>
                    </td>
                    <td className="px-4 py-3 text-center font-black text-emerald-600">
                      {student.maxStreak} streak
                    </td>
                    <td className="px-4 py-3 text-[#537096]">{student.favoriteGame}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── SECTION 5: Recorded Game Sessions Table WITH PAGINATION ─── */}
        <div className="rounded-[28px] border border-[#d8e3f0] bg-white p-5 shadow-[0_6px_22px_rgba(0,47,118,0.05)] sm:p-7">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#002f76]" />
                <h3 className="text-xl font-black text-[#002f76]">Recorded Game Sessions</h3>
              </div>
              <p className="mt-1 text-xs font-semibold text-[#5a769c]">
                Classroom session histories, student scores, and teacher notes
              </p>
            </div>

            {/* Quick Game Tabs & Search */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Game type filter buttons */}
              <div className="flex items-center gap-1 rounded-2xl bg-[#f0f4fa] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setTableFilterGame("all")}
                  className={`rounded-xl px-3 py-1.5 font-black transition ${
                    tableFilterGame === "all" ? "bg-white text-[#002f76] shadow-xs" : "text-[#5a769c]"
                  }`}
                >
                  All ({data?.recentSessions?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilterGame("body-parts")}
                  className={`rounded-xl px-3 py-1.5 font-black transition ${
                    tableFilterGame === "body-parts" ? "bg-[#0284c7] text-white shadow-xs" : "text-[#5a769c]"
                  }`}
                >
                  Body Parts ({bodyPartsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilterGame("number-trail")}
                  className={`rounded-xl px-3 py-1.5 font-black transition ${
                    tableFilterGame === "number-trail" ? "bg-[#10b981] text-white shadow-xs" : "text-[#5a769c]"
                  }`}
                >
                  Number Trail ({numberTrailCount})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-60">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student or teacher…"
                  className="w-full rounded-2xl border border-[#d3dfed] bg-[#f8fafd] px-3.5 py-2 text-xs font-semibold text-[#002f76] placeholder:text-[#8ba2be] focus:border-[#002f76] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="mt-5 overflow-x-auto rounded-2xl border border-[#e1eaf5]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafd] text-[11px] font-black uppercase tracking-wider text-[#6480a4]">
                <tr>
                  <th className="px-4 py-3.5">Date & Time</th>
                  <th className="px-4 py-3.5">Game Title</th>
                  <th className="px-4 py-3.5">Facilitator</th>
                  <th className="px-4 py-3.5">Explorers</th>
                  <th className="px-4 py-3.5">Winner</th>
                  <th className="px-4 py-3.5 text-center">Rounds</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf3fa] font-semibold text-[#002f76]">
                {paginatedSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs font-bold text-slate-400">
                      No matching game sessions found.
                    </td>
                  </tr>
                ) : (
                  paginatedSessions.map((session) => {
                    const sessionDate = new Date(session.playedAt);
                    const dateFormatted = sessionDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const timeFormatted = sessionDate.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={session.id} className="hover:bg-[#f8fafd] transition">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-black text-[#002f76]">{dateFormatted}</div>
                          <div className="text-[10px] text-[#637d9f]">{timeFormatted}</div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              session.gameType === "number-trail"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-sky-50 text-sky-800 border border-sky-200"
                            }`}
                          >
                            <GamepadIcon className="h-3 w-3" />
                            {session.gameTitle}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-[#57719b]">
                          {session.recordedByEmail?.split("@")[0] || "teacher"}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {session.players.map((p) => (
                              <span
                                key={p.name}
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold"
                                style={{
                                  backgroundColor: `${p.color || "#0284c7"}15`,
                                  color: p.color || "#0284c7",
                                }}
                              >
                                {p.name} ({p.score}★)
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {session.winner ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800 border border-amber-200">
                              <TrophyIcon className="h-3 w-3 text-amber-500" />
                              {session.winner.name} ({session.winner.score}★)
                            </span>
                          ) : (
                            <span className="text-slate-400">–</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap font-bold">
                          {session.roundsTotal}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedSession(session)}
                              title="Inspect Details"
                              className="rounded-xl border border-[#c8d8ec] bg-white p-2 text-[#002f76] hover:bg-[#eef4fc] transition shadow-xs"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(session.id)}
                              title="Delete Session"
                              className="rounded-xl border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50 transition shadow-xs"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ─── PAGINATION CONTROLS ─── */}
          {totalItems > 0 && (
            <div className="mt-5 flex flex-col justify-between gap-4 border-t border-[#edf2f8] pt-4 sm:flex-row sm:items-center text-xs">
              {/* Status info & Rows per page */}
              <div className="flex items-center gap-4 text-[#5a769c] font-semibold">
                <span>
                  Showing <strong className="text-[#002f76]">{startIndex + 1}</strong> to{" "}
                  <strong className="text-[#002f76]">{endIndex}</strong> of{" "}
                  <strong className="text-[#002f76]">{totalItems}</strong> sessions
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-[#8da4be]">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded-xl border border-[#d3dfed] bg-white px-2 py-1 font-bold text-[#002f76] focus:outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>

              {/* Page Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#d3dfed] bg-white px-3 py-1.5 font-bold text-[#3d5a82] hover:bg-[#f0f4fa] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeftIcon className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-8 w-8 rounded-xl font-black transition ${
                        currentPage === pageNum
                          ? "bg-[#002f76] text-white shadow-xs"
                          : "text-[#476082] hover:bg-[#edf3fa]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#d3dfed] bg-white px-3 py-1.5 font-bold text-[#3d5a82] hover:bg-[#f0f4fa] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <span>Next</span>
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── MODAL: Session Details Inspector ─── */}
        {selectedSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-[#002f76]/35 backdrop-blur-xs transition-opacity"
              onClick={() => setSelectedSession(null)}
            />
            <div className="relative w-full max-w-xl rounded-[32px] border border-[#d6e3f2] bg-white p-6 shadow-2xl z-10 space-y-5">
              <div className="flex items-center justify-between border-b border-[#edf3fa] pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#637d9f]">
                    Classroom Match Details
                  </span>
                  <h3 className="text-xl font-black text-[#002f76]">{selectedSession.gameTitle}</h3>
                  <p className="text-xs text-[#5a769c]">
                    Facilitated by {selectedSession.recordedByEmail} on{" "}
                    {new Date(selectedSession.playedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  className="rounded-xl border border-[#d3dfed] p-2 text-[#5a769c] hover:bg-[#f0f4fa] transition font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Session Player Breakdown */}
              <div className="space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-[#637d9f]">
                  Participant Explorers ({selectedSession.players.length})
                </span>
                <div className="space-y-2.5">
                  {selectedSession.players.map((p, idx) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between rounded-2xl border border-[#e2eaf5] bg-[#f8fafd] p-3.5 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                            idx === 0
                              ? "bg-amber-400 text-amber-950"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-black text-[#002f76]">{p.name}</div>
                          <div className="text-[10px] text-[#637d9f]">{p.avatar || "Explorer"}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-black text-amber-600">{p.score} Stars</div>
                          <div className="text-[10px] text-[#6682a5]">
                            {p.correctCount ?? p.score} correct · {p.mistakesCount ?? 0} errors
                          </div>
                        </div>
                        {p.streak && p.streak > 1 && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                            {p.streak}x combo
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedSession.notes && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
                  <strong>Facilitator Notes:</strong> {selectedSession.notes}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  className="rounded-2xl bg-[#002f76] px-6 py-2.5 text-xs font-black text-white hover:bg-[#0047b3] transition shadow-xs"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL: Delete Confirmation ─── */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-[#002f76]/35 backdrop-blur-xs transition-opacity"
              onClick={() => setDeleteConfirmId(null)}
            />
            <div className="relative w-full max-w-md rounded-[28px] border border-red-200 bg-white p-6 shadow-2xl z-10 space-y-4">
              <h3 className="text-lg font-black text-red-600">Delete Activity Session?</h3>
              <p className="text-xs text-[#57719b] leading-relaxed">
                Are you sure you want to delete this recorded session? This action will remove the session from student score totals and audit logs.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteConfirmId(null)}
                  className="rounded-xl border border-[#d3dfed] px-4 py-2 text-xs font-bold text-[#57719b] hover:bg-[#f0f4fa]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDeleteSession(deleteConfirmId)}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
                >
                  {isDeleting ? "Deleting…" : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
