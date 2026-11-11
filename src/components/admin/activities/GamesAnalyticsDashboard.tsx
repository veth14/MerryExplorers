"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { m, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
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

type StudentSessionHistory = {
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
  bodyPartsStars: number;
  bodyPartsMatches: number;
  numberTrailStars: number;
  numberTrailMatches: number;
  lastPlayedAt: string;
  skillBadges: string[];
  history: StudentSessionHistory[];
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

type RosterParticipation = {
  totalRoster: number;
  activeStudents: number;
  unplayedCount: number;
  participationRate: number;
  unplayedStudents: string[];
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
  rosterParticipation: RosterParticipation;
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

function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
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

function StudentHatIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function AwardIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="12" cy="8" r="6" />
      <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" />
    </svg>
  );
}

function FlameIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2c-.6 2.3-2.5 4.5-4.1 6.5C6.3 10.6 5 13 5 15.5 5 19.1 7.9 22 11.5 22s6.5-2.9 6.5-6.5c0-1.6-.6-3.2-1.7-4.5-1.5-1.9-3.2-4.1-4.3-9z" />
    </svg>
  );
}

function FlagIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

// ─── BEZIER CURVE GENERATOR ───────────────────────────────────────────────────

function generateSplinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function GamesAnalyticsDashboard() {
  const { user } = useAuth();

  // Top View Pillar: "all" | "games" | "students"
  const [activePillar, setActivePillar] = useState<"all" | "games" | "students">("all");

  const [timeRange, setTimeRange] = useState<"all" | "30d" | "14d" | "7d" | "today">("14d");
  const [gameFilter, setGameFilter] = useState<"all" | "number-trail" | "body-parts">("all");
  const [timelineMetric, setTimelineMetric] = useState<"sessions" | "stars">("sessions");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Selected Student Profile Modal
  const [selectedStudent, setSelectedStudent] = useState<LeaderboardStudent | null>(null);

  // Selected Session Inspection Modal
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, tableFilterGame, pageSize]);

  const totalItems = filteredRecentSessions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedSessions = useMemo(() => {
    return filteredRecentSessions.slice(startIndex, endIndex);
  }, [filteredRecentSessions, startIndex, endIndex]);

  const timelineMax = useMemo(() => {
    const timeline = data?.timeline;
    if (!timeline || timeline.length === 0) return 10;
    const values = timeline.map((t) => (timelineMetric === "sessions" ? t.sessions : t.stars));
    return Math.max(...values, timelineMetric === "sessions" ? 4 : 500);
  }, [data, timelineMetric]);

  const bodyPartsCount = useMemo(() => {
    return (data?.recentSessions || []).filter((s) => s.gameType === "body-parts").length;
  }, [data]);

  const numberTrailCount = useMemo(() => {
    return (data?.recentSessions || []).filter((s) => s.gameType === "number-trail").length;
  }, [data]);

  const { splinePath, areaPath, pointsCoords } = useMemo(() => {
    const timeline = data?.timeline;
    if (!timeline || timeline.length === 0) {
      return { splinePath: "", areaPath: "", pointsCoords: [] };
    }

    const chartWidth = 750;
    const chartHeight = 165;
    const startX = 55;
    const baseY = 195;
    const total = timeline.length;
    const step = chartWidth / Math.max(total, 1);

    const coords = timeline.map((point, i) => {
      const x = startX + i * step + step / 2;
      const val = timelineMetric === "sessions" ? point.sessions : point.stars;
      const h = (val / timelineMax) * chartHeight;
      const y = baseY - h;
      return { x, y, val, point, step };
    });

    const spline = generateSplinePath(coords.map((c) => ({ x: c.x, y: c.y })));
    const firstX = coords[0].x;
    const lastX = coords[coords.length - 1].x;
    const area = `${spline} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;

    return { splinePath: spline, areaPath: area, pointsCoords: coords };
  }, [data, timelineMetric, timelineMax]);

  return (
    <AppShell
      title="Games & Student Analytics"
      description="Classroom learning analytics, student mastery, and performance insights."
    >
      <LazyMotion features={domAnimation}>
        <div className="w-full space-y-8 pb-16 sm:space-y-10">
          {/* ─── Hero Header ─── */}
          <m.header
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-[32px] border border-[#cbe0f5] bg-gradient-to-br from-[#002f76] via-[#003d99] to-[#014fb8] p-6 text-white shadow-[0_20px_50px_rgba(0,47,118,0.22)] sm:p-8 lg:p-9"
          >
            <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 right-48 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />

            <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-400/15 px-3.5 py-1 text-[11px] font-black uppercase tracking-[.18em] text-[#ffdd80] shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-[#ffb800] shadow-[0_0_10px_#ffb800] animate-pulse" />
                  Dual Analytics Engine · Games & Students
                </span>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-[42px] lg:leading-[1.12]">
                  Games & Student Analytics
                </h1>
                <p className="mt-2.5 text-sm font-medium leading-relaxed text-blue-100/90 sm:text-base">
                  Track both the games played and the individual student explorers. Inspect learning accuracy, consecutive combos, class roster participation, and match histories.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/teacher/activities"
                  className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#ffc83b] to-[#ffb800] px-5 py-3 text-xs font-black text-[#4d3200] shadow-[0_8px_24px_rgba(255,184,0,0.38)] transition duration-200 hover:brightness-105 active:scale-95"
                >
                  <PlayIcon className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span>Launch Teacher Game Hub</span>
                </Link>

                <button
                  type="button"
                  onClick={fetchAnalytics}
                  disabled={isLoading}
                  title="Refresh Analytics"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-bold text-white shadow-xs backdrop-blur-md transition hover:bg-white/20 active:scale-95 disabled:opacity-50"
                >
                  <RefreshIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>
          </m.header>

          {/* ─── Pillar Switcher (Games vs Students) & Filters ─── */}
          <div className="flex flex-col justify-between gap-4 rounded-3xl border border-[#dbe4f1] bg-white p-4 shadow-[0_6px_22px_rgba(0,47,118,0.04)] lg:flex-row lg:items-center">
            {/* Pillar Selector Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#637d9f] hidden sm:inline">View Mode:</span>
              <div className="flex items-center gap-1 rounded-2xl bg-[#edf3fa] p-1.5">
                <button
                  type="button"
                  onClick={() => setActivePillar("all")}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                    activePillar === "all"
                      ? "bg-white text-[#002f76] shadow-xs"
                      : "text-[#5a769c] hover:text-[#002f76]"
                  }`}
                >
                  All Analytics
                </button>
                <button
                  type="button"
                  onClick={() => setActivePillar("games")}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                    activePillar === "games"
                      ? "bg-white text-[#0284c7] shadow-xs"
                      : "text-[#5a769c] hover:text-[#0284c7]"
                  }`}
                >
                  <GamepadIcon className="h-3.5 w-3.5" />
                  <span>Game Analytics</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePillar("students")}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                    activePillar === "students"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-[#5a769c] hover:text-emerald-700"
                  }`}
                >
                  <StudentHatIcon className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Student Analytics</span>
                  {data?.leaderboard && (
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] text-emerald-800">
                      {data.leaderboard.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              <span className="mr-1 text-[11px] font-black uppercase tracking-wider text-[#637d9f]">Range:</span>
              {[
                { id: "all", label: "All Time" },
                { id: "30d", label: "30 Days" },
                { id: "14d", label: "14 Days" },
                { id: "7d", label: "7 Days" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeRange(t.id as typeof timeRange)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
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
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              <span className="mr-1 text-[11px] font-black uppercase tracking-wider text-[#637d9f]">Game:</span>
              {[
                { id: "all", label: "All Activities" },
                { id: "number-trail", label: "Number Trail" },
                { id: "body-parts", label: "Body Parts" },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGameFilter(g.id as typeof gameFilter)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
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

          {/* ─── SECTION 1: Executive KPI Cards ─── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <m.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              className="rounded-[24px] border border-[#d6e3f2] bg-white p-5 shadow-[0_6px_20px_rgba(0,47,118,0.04)]"
            >
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
                Classroom matches
              </div>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.12 }}
              className="rounded-[24px] border border-amber-200 bg-gradient-to-br from-[#fffdf5] via-white to-white p-5 shadow-[0_6px_20px_rgba(245,158,11,0.06)]"
            >
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
                ~{(data?.kpis.avgStarsPerSession ?? 0).toLocaleString()} / match
              </div>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.16 }}
              className="rounded-[24px] border border-emerald-200 bg-gradient-to-br from-[#f6fdf9] via-white to-white p-5 shadow-[0_6px_20px_rgba(16,185,129,0.06)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">Active Students</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <UsersIcon className="h-4.5 w-4.5" />
                </span>
              </div>
              <div className="mt-3 text-3xl font-black text-emerald-700">
                {isLoading ? "–" : data?.kpis.uniqueStudents ?? 0}
              </div>
              <div className="mt-1 text-[11px] font-bold text-emerald-800/80">
                of {data?.rosterParticipation?.totalRoster || 7} class roster
              </div>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2 }}
              className="rounded-[24px] border border-indigo-200 bg-gradient-to-br from-[#f8f9ff] via-white to-white p-5 shadow-[0_6px_20px_rgba(99,102,241,0.06)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-800">Class Accuracy</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                  <TargetIcon className="h-4.5 w-4.5" />
                </span>
              </div>
              <div className="mt-3 text-3xl font-black text-indigo-600">
                {isLoading ? "–" : `${data?.kpis.overallAccuracy ?? 0}%`}
              </div>
              <div className="mt-1 text-[11px] font-bold text-indigo-800/80">
                {data?.kpis.totalCorrectAnswers ?? 0} correct turns
              </div>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.24 }}
              className="rounded-[24px] border border-cyan-200 bg-gradient-to-br from-[#f4fbfc] via-white to-white p-5 shadow-[0_6px_20px_rgba(6,182,212,0.06)]"
            >
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
                ~{data?.kpis.avgRoundsPerSession ?? 0} rounds / game
              </div>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.28 }}
              className="rounded-[24px] border border-violet-200 bg-gradient-to-br from-[#faf7ff] via-white to-white p-5 shadow-[0_6px_20px_rgba(139,92,246,0.06)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-violet-800">Top Game</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                  <TrophyIcon className="h-4.5 w-4.5" />
                </span>
              </div>
              <div className="mt-3 truncate text-base font-black text-violet-800" title={data?.kpis.topGame}>
                {isLoading ? "–" : data?.kpis.topGame?.replace(" Adventure", "").replace(" Explorer", "") ?? "Body Parts"}
              </div>
              <div className="mt-1 text-[11px] font-bold text-violet-800/80">
                Most played activity
              </div>
            </m.div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              PILLAR 1: STUDENT EXPLORERS ANALYTICS (When activePillar is "all" or "students")
          ══════════════════════════════════════════════════════════════════════ */}
          {(activePillar === "all" || activePillar === "students") && (
            <div className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-[#e1eaf5] pb-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <StudentHatIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-2xl font-black text-[#002f76]">Student Explorers Analytics</h2>
                    <p className="text-xs font-semibold text-[#5a769c]">
                      Individual student performance, star records, win rates, and learning progression
                    </p>
                  </div>
                </div>

                {data?.rosterParticipation && (
                  <div className="hidden sm:flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-2 text-xs font-bold text-emerald-900">
                    <span>Roster Engagement:</span>
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-white font-black">
                      {data.rosterParticipation.participationRate}%
                    </span>
                    <span>({data.rosterParticipation.activeStudents} of {data.rosterParticipation.totalRoster} kids)</span>
                  </div>
                )}
              </div>

              {/* Roster Participation Alert / Intelligence Banner */}
              {data?.rosterParticipation && data.rosterParticipation.unplayedCount > 0 && (
                <div className="flex flex-col justify-between gap-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-sky-50/60 p-4 text-xs font-semibold text-[#002f76] sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-[#002f76]">
                      <UsersIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <strong>Classroom Roster Intelligence:</strong> {data.rosterParticipation.unplayedCount} students haven&apos;t played a game yet in this period:
                      <span className="ml-1 font-black text-[#0284c7]">
                        {data.rosterParticipation.unplayedStudents.join(", ")}
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/teacher/activities/number-trail"
                    className="shrink-0 rounded-xl bg-[#002f76] px-3.5 py-1.5 text-[11px] font-black text-white hover:bg-[#0047b3] transition"
                  >
                    Start Game With Them &rarr;
                  </Link>
                </div>
              )}

              {/* Dynamic 3D Pedestal Stage for Top Students */}
              {data?.leaderboard && data.leaderboard.length > 0 && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {/* 1st Place (Gold Champion Pedestal) */}
                  <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 20 }}
                    className="flex flex-col items-center rounded-[28px] border-2 border-amber-300 bg-gradient-to-b from-[#fff9e6] via-white to-white p-6 text-center shadow-lg relative cursor-pointer hover:shadow-xl transition-all"
                    onClick={() => setSelectedStudent(data.leaderboard[0])}
                  >
                    <span className="absolute -top-3.5 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 px-4 py-1 text-[11px] font-black uppercase tracking-wider text-amber-950 shadow-md">
                      <TrophyIcon className="h-3.5 w-3.5" />
                      Champion Explorer
                    </span>
                    <span className="mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-amber-950 shadow-xs">
                      1
                    </span>
                    <div
                      className="mt-3 flex h-16 w-16 items-center justify-center rounded-2xl border-2 font-black text-white shadow-md ring-4 ring-amber-200/70 text-xl"
                      style={{ backgroundColor: data.leaderboard[0].color || "#f59e0b" }}
                    >
                      {data.leaderboard[0].name.slice(0, 2).toUpperCase()}
                    </div>
                    <h4 className="mt-3 text-xl font-black text-[#002f76]">{data.leaderboard[0].name}</h4>
                    <span className="text-xs font-bold text-[#5a769c]">{data.leaderboard[0].avatar}</span>

                    <div className="mt-3 flex items-center gap-1.5 text-2xl font-black text-amber-600">
                      <StarIcon className="h-5 w-5" />
                      <span>{data.leaderboard[0].totalStars.toLocaleString()} stars</span>
                    </div>

                    <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                      {data.leaderboard[0].skillBadges.map((badge) => (
                        <span key={badge} className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900">
                          {badge}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 w-full border-t border-amber-100 pt-3 text-xs font-bold text-[#5a769c] flex justify-between">
                      <span>{data.leaderboard[0].sessionsPlayed} matches</span>
                      <span className="text-emerald-700">{data.leaderboard[0].accuracy}% accuracy</span>
                      <span className="text-amber-700">{data.leaderboard[0].winRate}% wins</span>
                    </div>

                    <span className="mt-3 text-[11px] font-black text-[#0284c7] hover:underline">
                      View Student Game Report &rarr;
                    </span>
                  </m.div>

                  {/* 2nd Place (Silver Pedestal) */}
                  {data.leaderboard.length >= 2 && (
                    <m.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 220, damping: 20, delay: 0.05 }}
                      className="flex flex-col items-center rounded-[28px] border-2 border-slate-200 bg-gradient-to-b from-[#f8fafc] via-white to-white p-6 text-center shadow-md cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => setSelectedStudent(data.leaderboard[1])}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-300 text-xs font-black text-slate-800 shadow-xs">
                        2
                      </span>
                      <div
                        className="mt-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 font-black text-white shadow-xs text-lg"
                        style={{ backgroundColor: data.leaderboard[1].color || "#ef4444" }}
                      >
                        {data.leaderboard[1].name.slice(0, 2).toUpperCase()}
                      </div>
                      <h4 className="mt-3 text-lg font-black text-[#002f76]">{data.leaderboard[1].name}</h4>
                      <span className="text-xs font-bold text-[#5a769c]">{data.leaderboard[1].avatar}</span>

                      <div className="mt-3 flex items-center gap-1.5 text-xl font-black text-amber-600">
                        <StarIcon className="h-4.5 w-4.5" />
                        <span>{data.leaderboard[1].totalStars.toLocaleString()} stars</span>
                      </div>

                      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                        {data.leaderboard[1].skillBadges.map((badge) => (
                          <span key={badge} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700">
                            {badge}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 w-full border-t border-slate-100 pt-3 text-xs font-bold text-[#5a769c] flex justify-between">
                        <span>{data.leaderboard[1].sessionsPlayed} matches</span>
                        <span className="text-emerald-700">{data.leaderboard[1].accuracy}% accuracy</span>
                        <span className="text-amber-700">{data.leaderboard[1].winRate}% wins</span>
                      </div>

                      <span className="mt-3 text-[11px] font-black text-[#0284c7] hover:underline">
                        View Student Game Report &rarr;
                      </span>
                    </m.div>
                  )}

                  {/* 3rd Place (Bronze Pedestal) */}
                  {data.leaderboard.length >= 3 && (
                    <m.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 220, damping: 20, delay: 0.1 }}
                      className="flex flex-col items-center rounded-[28px] border-2 border-amber-700/20 bg-gradient-to-b from-[#fef8f3] via-white to-white p-6 text-center shadow-md cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => setSelectedStudent(data.leaderboard[2])}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 text-xs font-black text-amber-900 shadow-xs">
                        3
                      </span>
                      <div
                        className="mt-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 font-black text-white shadow-xs text-lg"
                        style={{ backgroundColor: data.leaderboard[2].color || "#6366f1" }}
                      >
                        {data.leaderboard[2].name.slice(0, 2).toUpperCase()}
                      </div>
                      <h4 className="mt-3 text-lg font-black text-[#002f76]">{data.leaderboard[2].name}</h4>
                      <span className="text-xs font-bold text-[#5a769c]">{data.leaderboard[2].avatar}</span>

                      <div className="mt-3 flex items-center gap-1.5 text-xl font-black text-amber-600">
                        <StarIcon className="h-4.5 w-4.5" />
                        <span>{data.leaderboard[2].totalStars.toLocaleString()} stars</span>
                      </div>

                      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                        {data.leaderboard[2].skillBadges.map((badge) => (
                          <span key={badge} className="rounded-full bg-amber-100/60 px-2 py-0.5 text-[10px] font-black text-amber-900">
                            {badge}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 w-full border-t border-amber-100/50 pt-3 text-xs font-bold text-[#5a769c] flex justify-between">
                        <span>{data.leaderboard[2].sessionsPlayed} matches</span>
                        <span className="text-emerald-700">{data.leaderboard[2].accuracy}% accuracy</span>
                        <span className="text-amber-700">{data.leaderboard[2].winRate}% wins</span>
                      </div>

                      <span className="mt-3 text-[11px] font-black text-[#0284c7] hover:underline">
                        View Student Game Report &rarr;
                      </span>
                    </m.div>
                  )}
                </div>
              )}

              {/* Student Explorer Comparison Matrix Table */}
              <div className="rounded-[28px] border border-[#d8e3f0] bg-white p-5 shadow-[0_6px_22px_rgba(0,47,118,0.05)] sm:p-7">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center border-b border-[#edf3fa] pb-4">
                  <div>
                    <h3 className="text-lg font-black text-[#002f76]">Student Explorer Roster Performance</h3>
                    <p className="text-xs font-semibold text-[#5a769c]">
                      Click on any student row to inspect their complete individual game records and teacher observations
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#0284c7]">
                    Tap a student for detailed breakdown
                  </span>
                </div>

                <div className="mt-4 overflow-x-auto rounded-2xl border border-[#e1eaf5]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8fafd] text-[11px] font-black uppercase tracking-wider text-[#6480a4]">
                      <tr>
                        <th className="px-4 py-3 text-center">Rank</th>
                        <th className="px-4 py-3">Explorer Name</th>
                        <th className="px-4 py-3 text-center">Cumulative Stars</th>
                        <th className="px-4 py-3 text-center">Matches</th>
                        <th className="px-4 py-3 text-center">Win Rate</th>
                        <th className="px-4 py-3 text-center">Accuracy</th>
                        <th className="px-4 py-3 text-center">Max Streak</th>
                        <th className="px-4 py-3">Favorite Game</th>
                        <th className="px-4 py-3 text-right">Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf3fa] font-semibold text-[#002f76]">
                      {data?.leaderboard.map((student) => (
                        <tr
                          key={student.name}
                          onClick={() => setSelectedStudent(student)}
                          className="hover:bg-[#f6f9fc] transition cursor-pointer group"
                        >
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
                                <div className="font-black text-[#002f76] group-hover:text-[#0284c7] transition">
                                  {student.name}
                                </div>
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
                          <td className="px-4 py-3 text-center font-bold text-[#002f76]">
                            {student.accuracy}%
                          </td>
                          <td className="px-4 py-3 text-center font-black text-emerald-600">
                            {student.maxStreak} streak
                          </td>
                          <td className="px-4 py-3 text-[#537096]">{student.favoriteGame}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#0284c7] group-hover:bg-[#0284c7] group-hover:text-white transition">
                              Inspect &rarr;
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              PILLAR 2: GAMES & ACTIVITIES ANALYTICS (When activePillar is "all" or "games")
          ══════════════════════════════════════════════════════════════════════ */}
          {(activePillar === "all" || activePillar === "games") && (
            <div className="space-y-8">
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-[#e1eaf5] pb-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-[#002f76]">
                    <GamepadIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-2xl font-black text-[#002f76]">Game & Activity Analytics</h2>
                    <p className="text-xs font-semibold text-[#5a769c]">
                      Session trends, activity volume, challenge mode accuracy, and recorded game sessions
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline Spline & Game Share Donut */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Timeline Spline & Stacked Capsule Bars (8 cols) */}
                <m.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45 }}
                  className="rounded-[30px] border border-[#d8e3f0] bg-white p-5 shadow-[0_8px_30px_rgba(0,47,118,0.06)] sm:p-7 lg:col-span-8 flex flex-col justify-between"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-[#edf3fa] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#002f76]" />
                        <h3 className="text-xl font-black text-[#002f76]">Activity Timeline & Trend</h3>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[#5a769c]">
                        Continuous daily classroom volume with stacked game distribution
                      </p>
                    </div>

                    <div className="flex items-center gap-1 rounded-2xl bg-[#edf3fa] p-1.5 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setTimelineMetric("sessions")}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
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
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                          timelineMetric === "stars"
                            ? "bg-white text-amber-600 shadow-xs"
                            : "text-[#5a769c] hover:text-amber-600"
                        }`}
                      >
                        Stars Earned
                      </button>
                    </div>
                  </div>

                  <div className="relative mt-6 w-full">
                    {!data?.timeline || data.timeline.length === 0 ? (
                      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-xs font-bold text-slate-400">
                        No activity sessions recorded in this time range.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative h-64 w-full">
                          <svg viewBox="0 0 820 240" className="h-full w-full overflow-visible" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="splineAreaGrad2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.28" />
                                <stop offset="60%" stopColor="#0284c7" stopOpacity="0.08" />
                                <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                              </linearGradient>

                              <linearGradient id="starsAreaGrad2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                                <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.08" />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                              </linearGradient>

                              <linearGradient id="bodyPartsBarGrad2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#38bdf8" />
                                <stop offset="100%" stopColor="#0284c7" />
                              </linearGradient>

                              <linearGradient id="numberTrailBarGrad2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#34d399" />
                                <stop offset="100%" stopColor="#059669" />
                              </linearGradient>

                              <linearGradient id="starsBarGrad2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#fbbf24" />
                                <stop offset="100%" stopColor="#d97706" />
                              </linearGradient>
                            </defs>

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

                            {areaPath && (
                              <m.path
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                d={areaPath}
                                fill={timelineMetric === "sessions" ? "url(#splineAreaGrad2)" : "url(#starsAreaGrad2)"}
                              />
                            )}

                            {splinePath && (
                              <m.path
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                d={splinePath}
                                fill="none"
                                stroke={timelineMetric === "sessions" ? "#0284c7" : "#d97706"}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                            )}

                            {pointsCoords.map((coord, index) => {
                              const { x, point, step } = coord;
                              const barWidth = Math.min(Math.max(step * 0.52, 14), 40);

                              const totalVal = timelineMetric === "sessions" ? point.sessions : point.stars;
                              const totalHeight = (totalVal / timelineMax) * 165;
                              const totalY = 195 - totalHeight;

                              let ntHeight = 0;
                              let bpHeight = 0;

                              if (timelineMetric === "sessions") {
                                ntHeight = (point.numberTrail / timelineMax) * 165;
                                bpHeight = (point.bodyParts / timelineMax) * 165;
                              }

                              const isHovered = hoveredIndex === index;

                              return (
                                <g
                                  key={point.date}
                                  className="cursor-pointer"
                                  onMouseEnter={() => setHoveredIndex(index)}
                                  onMouseLeave={() => setHoveredIndex(null)}
                                >
                                  {isHovered && (
                                    <m.rect
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      x={x - step / 2}
                                      y={25}
                                      width={step}
                                      height={175}
                                      fill="#002f76"
                                      fillOpacity="0.04"
                                      rx="10"
                                    />
                                  )}

                                  {totalVal === 0 && (
                                    <circle cx={x} cy={195} r="3" fill="#cbd5e1" opacity="0.6" />
                                  )}

                                  {timelineMetric === "sessions" ? (
                                    <>
                                      {ntHeight > 0 && (
                                        <m.rect
                                          initial={{ height: 0, y: 195 }}
                                          animate={{ height: ntHeight, y: 195 - ntHeight }}
                                          transition={{ type: "spring", stiffness: 220, damping: 22, delay: index * 0.02 }}
                                          x={x - barWidth / 2}
                                          width={barWidth}
                                          rx={bpHeight === 0 ? barWidth / 3 : 0}
                                          fill="url(#numberTrailBarGrad2)"
                                        />
                                      )}
                                      {bpHeight > 0 && (
                                        <m.rect
                                          initial={{ height: 0, y: 195 }}
                                          animate={{ height: bpHeight, y: 195 - ntHeight - bpHeight }}
                                          transition={{ type: "spring", stiffness: 220, damping: 22, delay: index * 0.02 + 0.04 }}
                                          x={x - barWidth / 2}
                                          width={barWidth}
                                          rx={barWidth / 3}
                                          fill="url(#bodyPartsBarGrad2)"
                                        />
                                      )}
                                    </>
                                  ) : (
                                    totalHeight > 0 && (
                                      <m.rect
                                        initial={{ height: 0, y: 195 }}
                                        animate={{ height: totalHeight, y: totalY }}
                                        transition={{ type: "spring", stiffness: 220, damping: 22, delay: index * 0.02 }}
                                        x={x - barWidth / 2}
                                        width={barWidth}
                                        rx={barWidth / 3}
                                        fill="url(#starsBarGrad2)"
                                      />
                                    )
                                  )}

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

                                  {totalVal > 0 && (
                                    <circle
                                      cx={x}
                                      cy={coord.y}
                                      r={isHovered ? 5.5 : 3.5}
                                      fill={timelineMetric === "sessions" ? "#0284c7" : "#d97706"}
                                      stroke="#ffffff"
                                      strokeWidth="2"
                                      className="transition-all duration-200"
                                    />
                                  )}

                                  <text
                                    x={x}
                                    y={220}
                                    textAnchor="middle"
                                    fill={isHovered ? "#002f76" : "#6b84a2"}
                                    fontSize="10"
                                    fontWeight={isHovered ? "bold" : "600"}
                                  >
                                    {point.label}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>

                          <AnimatePresence>
                            {hoveredIndex !== null && pointsCoords[hoveredIndex] && (
                              <m.div
                                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-2xl border border-[#c9dcf0] bg-white/95 px-4 py-2.5 shadow-2xl backdrop-blur-md text-xs font-bold text-[#002f76] z-20"
                              >
                                <div className="flex items-center gap-2 border-b border-[#edf3fa] pb-1.5 mb-1.5">
                                  <span className="font-black text-[#002f76]">
                                    {pointsCoords[hoveredIndex].point.label}
                                  </span>
                                  <span className="text-[#6480a4]">({pointsCoords[hoveredIndex].point.dayOfWeek})</span>
                                  <span className="ml-auto rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 font-extrabold">
                                    {pointsCoords[hoveredIndex].point.sessions} matches
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-[11px]">
                                  <span className="inline-flex items-center gap-1.5 text-[#0284c7]">
                                    <span className="h-2 w-2 rounded-full bg-[#0284c7]" />
                                    Body Parts: <strong>{pointsCoords[hoveredIndex].point.bodyParts}</strong>
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                                    <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                                    Number Trail: <strong>{pointsCoords[hoveredIndex].point.numberTrail}</strong>
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 text-amber-600">
                                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                                    Stars: <strong>{pointsCoords[hoveredIndex].point.stars.toLocaleString()}</strong>
                                  </span>
                                </div>
                              </m.div>
                            )}
                          </AnimatePresence>
                        </div>

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
                          </div>
                          <span>{data.timeline.length} active classroom days</span>
                        </div>
                      </div>
                    )}
                  </div>
                </m.div>

                {/* Game Share Donut (4 cols) */}
                <m.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, delay: 0.08 }}
                  className="rounded-[30px] border border-[#d8e3f0] bg-white p-5 shadow-[0_8px_30px_rgba(0,47,118,0.06)] sm:p-7 lg:col-span-4 flex flex-col justify-between"
                >
                  <div className="border-b border-[#edf3fa] pb-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#0284c7]" />
                      <h3 className="text-xl font-black text-[#002f76]">Game Share</h3>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#5a769c]">
                      Proportional volume across classroom activities
                    </p>
                  </div>

                  <div className="relative my-6 flex items-center justify-center">
                    <svg viewBox="0 0 200 200" className="h-52 w-52 -rotate-90 transform overflow-visible">
                      <circle cx="100" cy="100" r="70" stroke="#f1f5fa" strokeWidth="26" fill="none" />
                      {(() => {
                        const circumference = 2 * Math.PI * 70;
                        let cumulativeOffset = 0;

                        return data?.gameDistribution.map((game, idx) => {
                          const strokeDasharray = `${(game.percentage / 100) * circumference} ${circumference}`;
                          const strokeDashoffset = -cumulativeOffset;
                          cumulativeOffset += (game.percentage / 100) * circumference;

                          return (
                            <m.circle
                              key={game.id}
                              initial={{ strokeDashoffset: circumference }}
                              animate={{ strokeDashoffset }}
                              transition={{ duration: 1, ease: "easeOut", delay: idx * 0.15 }}
                              cx="100"
                              cy="100"
                              r="70"
                              stroke={game.color}
                              strokeWidth="26"
                              strokeDasharray={strokeDasharray}
                              strokeLinecap="round"
                              fill="none"
                            />
                          );
                        });
                      })()}
                    </svg>

                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <m.span
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-3xl font-black text-[#002f76]"
                      >
                        {data?.kpis.totalSessions ?? 0}
                      </m.span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#6480a4]">
                        Total Matches
                      </span>
                    </div>
                  </div>

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
                </m.div>
              </div>

              {/* Challenge Mastery & Score Dynamics */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <m.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-[30px] border border-[#d8e3f0] bg-white p-5 shadow-[0_8px_30px_rgba(0,47,118,0.06)] sm:p-7 lg:col-span-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-[#edf3fa] pb-4">
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
                      {data?.challengeModesMastery.map((item, idx) => (
                        <div key={item.mode} className="rounded-2xl border border-[#e8eff8] bg-[#f8fafd] p-4 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <span className="font-black text-[#002f76]">{item.mode}</span>
                              <span className="ml-2 text-[10px] font-bold text-[#627d9e]">({item.category})</span>
                            </div>
                            <span className="font-black text-emerald-600 text-sm">{item.accuracy}%</span>
                          </div>

                          <div className="h-3 w-full overflow-hidden rounded-full bg-[#e3ecf7]">
                            <m.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.accuracy}%` }}
                              transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.1 }}
                              className="h-full rounded-full bg-gradient-to-r from-[#0284c7] to-[#10b981]"
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
                    Accuracy is calculated from correct responses vs hints and errors during student classroom turns.
                  </p>
                </m.div>

                <m.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.08 }}
                  className="rounded-[30px] border border-[#d8e3f0] bg-white p-5 shadow-[0_8px_30px_rgba(0,47,118,0.06)] sm:p-7 lg:col-span-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="border-b border-[#edf3fa] pb-4">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        <h3 className="text-xl font-black text-[#002f76]">Score & Streak Dynamics</h3>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[#5a769c]">
                        Classroom student achievement tiers and consecutive answer combos
                      </p>
                    </div>

                    <div className="my-5 space-y-4">
                      <div>
                        <span className="mb-2 block text-[11px] font-black uppercase tracking-wider text-[#637d9f]">
                          Star Score Tiers Awarded
                        </span>
                        <div className="grid grid-cols-4 gap-2.5 text-center">
                          {Object.entries(data?.scoreBuckets || { "1–2 Stars": 0, "3–4 Stars": 0, "5–7 Stars": 0, "8+ Stars": 14 }).map(([tier, count], idx) => (
                            <m.div
                              key={tier}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.05 }}
                              className="rounded-2xl border border-[#d9e6f5] bg-gradient-to-b from-[#f8fafd] to-white p-3.5 shadow-xs"
                            >
                              <span className="block text-2xl font-black text-[#002f76]">{count}</span>
                              <span className="mt-1 block text-[10px] font-black text-[#5c7799] uppercase">{tier}</span>
                            </m.div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="mb-2 block text-[11px] font-black uppercase tracking-wider text-[#637d9f]">
                          Unbroken Answer Combos
                        </span>
                        <div className="grid grid-cols-3 gap-2.5 text-center">
                          {Object.entries(data?.streakBuckets || { "1–2 Combo": 0, "3–4 Combo": 4, "5+ Master": 10 }).map(([streak, count], idx) => (
                            <m.div
                              key={streak}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.2 + idx * 0.05 }}
                              className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/70 to-white p-3.5 shadow-xs"
                            >
                              <div className="flex items-center justify-center gap-1">
                                <FlameIcon className="h-4 w-4 text-amber-500" />
                                <span className="text-2xl font-black text-amber-700">{count}</span>
                              </div>
                              <span className="mt-1 block text-[10px] font-black text-amber-900 uppercase">{streak}</span>
                            </m.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] font-semibold text-[#6682a5]">
                    Combos grant celebratory audio fanfare and advance student explorers toward the victory podium.
                  </p>
                </m.div>
              </div>

              {/* Recorded Game Sessions Table WITH PAGINATION */}
              <m.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-[30px] border border-[#d8e3f0] bg-white p-5 shadow-[0_8px_30px_rgba(0,47,118,0.06)] sm:p-8"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center border-b border-[#edf3fa] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#002f76]" />
                      <h3 className="text-xl font-black text-[#002f76]">Recorded Game Sessions</h3>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#5a769c]">
                      Classroom session histories, student scores, and facilitator notes
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
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

                {totalItems > 0 && (
                  <div className="mt-5 flex flex-col justify-between gap-4 border-t border-[#edf2f8] pt-4 sm:flex-row sm:items-center text-xs">
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
              </m.div>
            </div>
          )}

          {/* ─── MODAL: Individual Student Profile & Game History Drawer ─── */}
          <AnimatePresence>
            {selectedStudent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-[#002f76]/45 backdrop-blur-xs transition-opacity"
                  onClick={() => setSelectedStudent(null)}
                />
                <m.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.2 }}
                  className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-[#d6e3f2] bg-white p-6 sm:p-8 shadow-2xl z-10 space-y-6"
                >
                  {/* Student Header */}
                  <div className="flex items-start justify-between border-b border-[#edf3fa] pb-5">
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-md ring-4 ring-slate-100"
                        style={{ backgroundColor: selectedStudent.color || "#0284c7" }}
                      >
                        {selectedStudent.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-2xl font-black text-[#002f76]">{selectedStudent.name}</h3>
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-900">
                            Rank #{selectedStudent.rank}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[#5a769c]">
                          Animal Mascot: {selectedStudent.avatar}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {selectedStudent.skillBadges.map((badge) => (
                            <span key={badge} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                              <AwardIcon className="h-3 w-3" />
                              <span>{badge}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="rounded-xl border border-[#d3dfed] p-2 text-[#5a769c] hover:bg-[#f0f4fa] transition font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Student Quick Stat Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
                      <span className="block text-2xl font-black text-amber-700">
                        {selectedStudent.totalStars.toLocaleString()}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-black uppercase text-amber-900">Stars Earned</span>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5">
                      <span className="block text-2xl font-black text-[#002f76]">
                        {selectedStudent.sessionsPlayed}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-black uppercase text-[#002f76]">Matches Played</span>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                      <span className="block text-2xl font-black text-emerald-700">
                        {selectedStudent.accuracy}%
                      </span>
                      <span className="mt-0.5 block text-[10px] font-black uppercase text-emerald-900">Accuracy Rate</span>
                    </div>

                    <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-3.5">
                      <span className="block text-2xl font-black text-violet-700">
                        {selectedStudent.maxStreak}x
                      </span>
                      <span className="mt-0.5 block text-[10px] font-black uppercase text-violet-900">Max Streak</span>
                    </div>
                  </div>

                  {/* Activity Preference Split */}
                  <div className="rounded-2xl border border-[#e1eaf5] bg-[#f8fafd] p-4 space-y-2">
                    <span className="block text-xs font-black uppercase tracking-wider text-[#637d9f]">
                      Game Participation Split
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-white p-3 border border-[#e2eaf5]">
                        <span className="block font-black text-[#0284c7]">Body Parts Explorer</span>
                        <span className="text-sm font-bold text-[#002f76]">{selectedStudent.bodyPartsMatches} matches ({selectedStudent.bodyPartsStars.toLocaleString()}★)</span>
                      </div>
                      <div className="rounded-xl bg-white p-3 border border-[#e2eaf5]">
                        <span className="block font-black text-[#10b981]">Number Trail Adventure</span>
                        <span className="text-sm font-bold text-[#002f76]">{selectedStudent.numberTrailMatches} matches ({selectedStudent.numberTrailStars.toLocaleString()}★)</span>
                      </div>
                    </div>
                  </div>

                  {/* Student Match History Transcript */}
                  <div className="space-y-3">
                    <span className="block text-xs font-black uppercase tracking-wider text-[#637d9f]">
                      Game Session Transcript ({selectedStudent.history?.length || 0})
                    </span>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedStudent.history && selectedStudent.history.length > 0 ? (
                        selectedStudent.history.map((h, i) => (
                          <div
                            key={`${h.sessionId}-${i}`}
                            className="flex items-center justify-between rounded-2xl border border-[#e8eff8] bg-white p-3 text-xs"
                          >
                            <div>
                              <div className="font-black text-[#002f76]">{h.gameTitle}</div>
                              <div className="text-[10px] text-[#637d9f]">
                                {new Date(h.playedAt).toLocaleDateString()} · Facilitated by {h.facilitator}
                              </div>
                              {h.notes && (
                                <div className="mt-1 text-[11px] text-[#4d6a8f] italic">
                                  &ldquo;{h.notes}&rdquo;
                                </div>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-black text-amber-600 block">{h.score} Stars</span>
                              <span className="text-[10px] font-bold text-slate-500">
                                Rank #{h.rank} · {h.correctCount} correct
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">No match records for this student.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="rounded-2xl bg-[#002f76] px-6 py-2.5 text-xs font-black text-white hover:bg-[#0047b3] transition shadow-xs"
                    >
                      Close Profile
                    </button>
                  </div>
                </m.div>
              </div>
            )}
          </AnimatePresence>

          {/* ─── MODAL: Session Details Inspector ─── */}
          <AnimatePresence>
            {selectedSession && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-[#002f76]/40 backdrop-blur-xs transition-opacity"
                  onClick={() => setSelectedSession(null)}
                />
                <m.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.2 }}
                  className="relative w-full max-w-xl rounded-[32px] border border-[#d6e3f2] bg-white p-6 shadow-2xl z-10 space-y-5"
                >
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
                </m.div>
              </div>
            )}
          </AnimatePresence>

          {/* ─── MODAL: Delete Confirmation ─── */}
          <AnimatePresence>
            {deleteConfirmId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-[#002f76]/40 backdrop-blur-xs transition-opacity"
                  onClick={() => setDeleteConfirmId(null)}
                />
                <m.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.2 }}
                  className="relative w-full max-w-md rounded-[28px] border border-red-200 bg-white p-6 shadow-2xl z-10 space-y-4"
                >
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
                </m.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </LazyMotion>
    </AppShell>
  );
}
