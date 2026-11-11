"use client";

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { GameAudio } from "@/lib/game-audio";
import {
  GamePhase,
  GamePlayer,
  TrailblazerStudent,
  ChallengeMode,
  NumberDifficulty,
  NumberChallenge,
  NumberChoice,
  GameSessionRecord,
  LeaderboardEntry,
} from "../types";
import { CHEER_PHRASES } from "../data";
import { generateNumberChallenge } from "../utils/challenge-generator";
import { calculateAnswerScore } from "../utils/scoring";
import { ConfettiEffect } from "./ConfettiEffect";
import { TrailRaceTrack } from "./TrailRaceTrack";
import { ChallengeDisplay } from "./ChallengeDisplay";
import { NumberCard } from "./NumberCard";
import { PlayerSetupModal } from "./PlayerSetupModal";
import { GameOverPodium } from "./GameOverPodium";
import {
  ArrowLeftIcon,
  SpeakerIcon,
  MuteIcon,
  VoiceIcon,
  VoiceOffIcon,
  StarIcon,
  FlameIcon,
  AnimalAvatarBadge,
  MaximizeIcon,
  MinimizeIcon,
} from "./GameIcons";

type NumberTrailWorkspaceProps = {
  mode: "admin" | "teacher";
};

function findNextUnfinishedPlayerIndex(players: GamePlayer[], currentIndex: number, stepsPerPlayer: number) {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const candidateIndex = (currentIndex + offset) % players.length;
    if (players[candidateIndex].correctCount < stepsPerPlayer) return candidateIndex;
  }
  return -1;
}

export function NumberTrailWorkspace({ mode }: NumberTrailWorkspaceProps) {
  const { user } = useAuth();

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    try {
      const token = await user?.getIdToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  }, [user]);

  // Tab State
  const [activeTab, setActiveTab] = useState<"game" | "history">("game");

  // Game Settings & Phase
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [difficulty, setDifficulty] = useState<NumberDifficulty>("medium");
  const [selectedModes, setSelectedModes] = useState<ChallengeMode[]>([
    "recognition",
    "count_match",
    "sequence",
    "more_or_less",
  ]);
  const [roundsPerPlayer, setRoundsPerPlayer] = useState<number>(5);

  // Audio & Accessibility Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(true);

  // Players State
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);

  // Challenge & Turn State
  const [currentChallenge, setCurrentChallenge] = useState<NumberChallenge | null>(null);
  const [cardStatus, setCardStatus] = useState<Record<string, "idle" | "correct" | "wrong">>({});
  const [isLocked, setIsLocked] = useState(false);
  const [cheerBanner, setCheerBanner] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [raceMotion, setRaceMotion] = useState<{
    playerIndex: number;
    fromCount: number;
    toCount: number;
    willReachGoal: boolean;
  } | null>(null);
  const [raceAnimationStarted, setRaceAnimationStarted] = useState(false);
  const [raceAnimationDone, setRaceAnimationDone] = useState(false);

  // Timing
  const questionStartTimeRef = useRef<number>(Date.now());
  const previousTargetRef = useRef<number | undefined>(undefined);

  // Roster & API
  const [roster, setRoster] = useState<TrailblazerStudent[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  // History & Leaderboard
  const [historySessions, setHistorySessions] = useState<GameSessionRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [hasSavedSession, setHasSavedSession] = useState(false);

  const activityHomePath = mode === "teacher" ? "/teacher/activities" : "/admin/activities";

  // ─── Fullscreen ────────────────────────────────────────────────────────────
  const gamePanelRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === gamePanelRef.current);
    };
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  const toggleGameFullscreen = async () => {
    const gamePanel = gamePanelRef.current;
    if (!gamePanel) return;
    if (!document.fullscreenElement) {
      await gamePanel.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  // ─── Fetch Class Roster ────────────────────────────────────────────────────
  const fetchRoster = useCallback(async () => {
    setIsLoadingRoster(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/activities/number-trail/students", { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.students)) {
        setRoster(data.students);
      }
    } catch (err) {
      console.error("[NumberTrail] Failed to load students:", err);
    } finally {
      setIsLoadingRoster(false);
    }
  }, [getAuthHeaders]);

  // ─── Fetch History & Leaderboard ───────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/activities/number-trail/scores", { headers });
      const data = await res.json();
      if (data.success) {
        setHistorySessions(data.sessions || []);
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error("[NumberTrail] Failed to load scores:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  useEffect(() => {
    if (activeTab === "history" && mode === "admin") {
      fetchHistory();
    }
  }, [activeTab, mode, fetchHistory]);

  // ─── Challenge Generation ──────────────────────────────────────────────────
  const nextTurnChallenge = useCallback(
    (playerIdx: number) => {
      const challenge = generateNumberChallenge(
        selectedModes,
        difficulty,
        previousTargetRef.current
      );
      previousTargetRef.current = challenge.targetNumber;
      setCurrentChallenge(challenge);
      setCardStatus({});
      setIsLocked(false);
      setCheerBanner(null);
      questionStartTimeRef.current = Date.now();

      // Audio narration: in the audio, just say the number!
      if (speechEnabled) {
        GameAudio.speakText(challenge.spokenPrompt);
      }
    },
    [selectedModes, difficulty, speechEnabled]
  );

  // ─── Start Game ────────────────────────────────────────────────────────────
  const handleStartGame = () => {
    if (players.length === 0) return;

    const resetPlayers = players.map((p) => ({
      ...p,
      score: 0,
      correctCount: 0,
      mistakesCount: 0,
      streak: 0,
      maxStreak: 0,
    }));

    setPlayers(resetPlayers);
    setActivePlayerIndex(0);
    setHasSavedSession(false);
    setPhase("playing");
    setRaceMotion(null);

    if (soundEnabled) {
      GameAudio.playPop();
    }

    nextTurnChallenge(0);
  };

  // ─── Auto-Save Session on Game Completion ─────────────────────────────────
  const autoSaveSession = useCallback(
    async (currentPlayers: GamePlayer[]) => {
      if (currentPlayers.length === 0 || hasSavedSession) return;
      setIsSavingSession(true);
      try {
        const headers = await getAuthHeaders();
        const sorted = [...currentPlayers].sort((a, b) => b.score - a.score);
        const winner = sorted[0] || null;

        const res = await fetch("/api/admin/activities/number-trail/scores", {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            gameType: "number-trail",
            gameTitle: "Number Trail Adventure",
            roundsTotal: roundsPerPlayer,
            players: currentPlayers,
            winner,
            notes: `Played Number Trail with ${currentPlayers.length} Trailblazers across ${roundsPerPlayer} rounds.`,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setHasSavedSession(true);
        }
      } catch (err) {
        console.error("[NumberTrail] Auto-save error:", err);
      } finally {
        setIsSavingSession(false);
      }
    },
    [getAuthHeaders, hasSavedSession, roundsPerPlayer]
  );

  // ─── Race Phase Handlers ───────────────────────────────────────────────────
  const handleContinueAfterRace = useCallback(() => {
    if (!raceMotion) return;
    const everyoneFinished = players.length > 0 && players.every((player) => player.correctCount >= roundsPerPlayer);
    if (everyoneFinished) {
      if (soundEnabled) {
        GameAudio.playVictoryFanfare();
      }
      setPhase("game_over");
      autoSaveSession(players);
    } else {
      const nextIndex = findNextUnfinishedPlayerIndex(players, raceMotion.playerIndex, roundsPerPlayer);
      if (nextIndex >= 0) {
        setActivePlayerIndex(nextIndex);
        setPhase("playing");
        nextTurnChallenge(nextIndex);
      }
    }
  }, [raceMotion, soundEnabled, players, roundsPerPlayer, nextTurnChallenge, autoSaveSession]);

  useEffect(() => {
    if (phase !== "racing" || !raceMotion) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startTimer = window.setTimeout(
      () => setRaceAnimationStarted(true),
      reducedMotion ? 0 : 850
    );
    const finishAnimationTimer = window.setTimeout(
      () => setRaceAnimationDone(true),
      reducedMotion ? 0 : 2450
    );
    const timer = setTimeout(() => {
      handleContinueAfterRace();
    }, reducedMotion ? 120 : 3200);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(finishAnimationTimer);
      clearTimeout(timer);
    };
  }, [phase, raceMotion, handleContinueAfterRace]);

  // ─── Handle Card Click / Answer ────────────────────────────────────────────
  const handleSelectChoice = (choice: NumberChoice) => {
    if (isLocked || !currentChallenge) return;

    const activePlayer = players[activePlayerIndex];
    if (!activePlayer) return;

    setIsLocked(true);
    const timeTaken = Date.now() - questionStartTimeRef.current;

    if (choice.isCorrect) {
      setCardStatus({ [choice.id]: "correct" });

      const newStreak = activePlayer.streak + 1;
      const scoreCalc = calculateAnswerScore(newStreak, timeTaken, CHEER_PHRASES);

      if (soundEnabled) {
        if (newStreak >= 2) {
          GameAudio.playStreak();
        } else {
          GameAudio.playCorrect();
        }
      }

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);

      const phrase = `${scoreCalc.cheerPhrase} +${scoreCalc.points} pts!`;
      setCheerBanner(phrase);

      if (speechEnabled) {
        GameAudio.speakText(scoreCalc.cheerPhrase);
      }

      const newCount = activePlayer.correctCount + 1;
      const willReachGoal = newCount >= roundsPerPlayer;

      const updatedPlayers = players.map((p, idx) => {
        if (idx !== activePlayerIndex) return p;
        return {
          ...p,
          score: p.score + scoreCalc.points,
          correctCount: newCount,
          streak: newStreak,
          maxStreak: Math.max(p.maxStreak, newStreak),
        };
      });

      setPlayers(updatedPlayers);

      setTimeout(() => {
        setRaceAnimationStarted(false);
        setRaceAnimationDone(false);
        setRaceMotion({
          playerIndex: activePlayerIndex,
          fromCount: activePlayer.correctCount,
          toCount: newCount,
          willReachGoal,
        });
        setPhase("racing");
      }, 700);
    } else {
      setCardStatus({ [choice.id]: "wrong" });

      if (soundEnabled) {
        GameAudio.playOops();
      }

      setCheerBanner("Nice try! Passing the turn to the next explorer!");

      const updatedPlayers = players.map((p, idx) => {
        if (idx !== activePlayerIndex) return p;
        return {
          ...p,
          mistakesCount: p.mistakesCount + 1,
          streak: 0,
        };
      });
      setPlayers(updatedPlayers);

      setTimeout(() => {
        const nextIndex = findNextUnfinishedPlayerIndex(updatedPlayers, activePlayerIndex, roundsPerPlayer);
        if (nextIndex >= 0) {
          setActivePlayerIndex(nextIndex);
          nextTurnChallenge(nextIndex);
        }
      }, 1400);
    }
  };

  const handlePlayAgain = () => {
    handleStartGame();
  };

  const handleNewGameSetup = () => {
    setPhase("setup");
    setCardStatus({});
    setCheerBanner(null);
    setRaceMotion(null);
  };

  const handleSaveSession = async (notes: string): Promise<boolean> => {
    if (players.length === 0 || isSavingSession || hasSavedSession) return false;

    setIsSavingSession(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/activities/number-trail/scores", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameType: "number-trail",
          gameTitle: "Number Trail",
          roundsTotal: roundsPerPlayer,
          players,
          winner: null,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setHasSavedSession(true);
        return true;
      } else {
        alert(data.error || "Failed to save session");
        return false;
      }
    } catch (err) {
      console.error("[NumberTrail] Save error:", err);
      alert("Failed to connect to database");
      return false;
    } finally {
      setIsSavingSession(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recorded session?")) return;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/activities/number-trail/scores?id=${id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setHistorySessions((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert(data.error || "Failed to delete session");
      }
    } catch (err) {
      console.error("[NumberTrail] Delete error:", err);
    }
  };

  const activePlayer = players[activePlayerIndex];

  return (
    <AppShell
      title={
        mode === "admin" && activeTab === "history"
          ? "Number Trail Analytics"
          : "Number Trail Adventure"
      }
      description="A playful number adventure for Trailblazer playgroup friends."
    >
      {showConfetti && <ConfettiEffect count={100} />}

      <div className="w-full space-y-6 pb-8">
        {/* Top Control Bar & Breadcrumb (Full Width) */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dbe4f1] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <Link
              href={activityHomePath}
              className="inline-flex items-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2 text-xs font-black text-[#002f76] hover:bg-[#f8fafc] transition shadow-2xs"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              <span>Back to Games</span>
            </Link>

            {/* Admin Tabs */}
            {mode === "admin" && (
              <div className="flex items-center rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("game")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                    activeTab === "game"
                      ? "bg-white text-[#002f76] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Play Trail
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                    activeTab === "history"
                      ? "bg-white text-[#002f76] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Scores & History
                </button>
              </div>
            )}
          </div>

          {/* Quick Audio Controls with SVGs & Fullscreen */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                soundEnabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
              title="Toggle Sound Effects"
            >
              {soundEnabled ? (
                <>
                  <SpeakerIcon className="h-3.5 w-3.5" />
                  <span>Sound</span>
                </>
              ) : (
                <>
                  <MuteIcon className="h-3.5 w-3.5" />
                  <span>Muted</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSpeechEnabled(!speechEnabled)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                speechEnabled
                  ? "border-blue-200 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
              title="Toggle Voice Speech"
            >
              {speechEnabled ? (
                <>
                  <VoiceIcon className="h-3.5 w-3.5" />
                  <span>Voice</span>
                </>
              ) : (
                <>
                  <VoiceOffIcon className="h-3.5 w-3.5" />
                  <span>Silent</span>
                </>
              )}
            </button>
            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleGameFullscreen}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#002f76]/20 bg-[#002f76] px-3.5 py-1.5 text-xs font-black text-white hover:bg-[#002358] transition shadow-sm"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen (Smartboard Mode)"}
            >
              {isFullscreen ? (
                <>
                  <MinimizeIcon className="h-3.5 w-3.5" />
                  <span>Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <MaximizeIcon className="h-3.5 w-3.5" />
                  <span>Fullscreen</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: GAMEPLAY WORKSPACE (Full Width & Fullscreen-ready)           */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "game" && (
          <div
            ref={gamePanelRef}
            className={`relative w-full overflow-hidden shadow-2xl transition-all ${
              isFullscreen
              ? "h-dvh overflow-hidden rounded-none"
                : "rounded-3xl"
            }`}
          >
            {/* ─── VIBRANT OUTDOOR EXPLORER NATURE BACKGROUND SCENE ─── */}
            <div className="forest-scene pointer-events-none absolute inset-0 z-0 select-none overflow-hidden">
              <div className="forest-sun absolute right-[8%] top-8 h-24 w-24 rounded-full sm:h-32 sm:w-32" />
              <div className="forest-cloud forest-cloud-one absolute left-[8%] top-12 h-10 w-28 rounded-full" />
              <div className="forest-cloud forest-cloud-two absolute right-[24%] top-20 hidden h-11 w-32 rounded-full sm:block" />
              <div className="forest-mountain forest-mountain-left absolute bottom-[14%] -left-[6%] h-[38%] w-[34%]" />
              <div className="forest-mountain forest-mountain-right absolute bottom-[12%] -right-[5%] h-[43%] w-[38%]" />
              <div className="forest-foothill absolute bottom-[11%] -left-[10%] h-[28%] w-[62%]" />
              <div className="forest-foothill forest-foothill-right absolute bottom-[11%] -right-[10%] h-[30%] w-[64%]" />
              <div className="forest-tree forest-oak absolute bottom-[12%] left-[27%]" />
              <div className="forest-tree forest-oak forest-oak-light absolute bottom-[13%] right-[24%]" />
              <div className="forest-tree forest-tree-small absolute bottom-[13%] left-[1%]" />
              <div className="forest-tree forest-tree-medium absolute bottom-[12%] left-[10%]" />
              <div className="forest-tree forest-tree-small absolute bottom-[17%] left-[21%]" />
              <div className="forest-tree forest-tree-medium absolute bottom-[11%] right-[11%]" />
              <div className="forest-tree forest-tree-small absolute bottom-[15%] right-[2%]" />
              <div className="forest-ground absolute -bottom-14 -left-[8%] h-[27%] w-[116%] rounded-[50%_50%_0_0]" />
              {phase !== "racing" && <svg aria-hidden="true" viewBox="0 0 1000 460" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-[4%] left-0 z-[4] h-[38%] w-full overflow-hidden">
                <defs>
                  <linearGradient id="forestTrailDirt" x1="0" x2="0.2" y1="0" y2="1">
                    <stop offset="0" stopColor="#d9b77f" />
                    <stop offset="1" stopColor="#a9794e" />
                  </linearGradient>
                </defs>
                <path d="M 465 0 C 505 92 625 130 600 218 C 570 310 300 348 112 460 L 888 460 C 710 350 630 310 646 218 C 665 130 535 92 535 0 Z" fill="#825a3e" opacity=".82" />
                <path d="M 477 0 C 520 92 630 132 608 218 C 580 305 326 350 145 460 L 855 460 C 690 350 620 305 638 218 C 658 132 527 92 523 0 Z" fill="url(#forestTrailDirt)" />
                <path d="M 500 0 C 540 92 640 132 623 218 C 605 302 500 348 500 460" fill="none" stroke="#f4d9a6" strokeDasharray="4 22" strokeLinecap="round" strokeWidth="5" opacity=".56" />
              </svg>}
              <span className="forest-firefly absolute left-[31%] top-[58%]" />
              <span className="forest-firefly absolute right-[34%] top-[43%] [animation-delay:1.3s]" />
              <span className="forest-firefly absolute right-[12%] top-[64%] [animation-delay:2.1s]" />
            </div>

            <div
              className={`relative z-10 mx-auto flex w-full flex-col justify-between p-3 sm:p-5 md:p-6 ${
                isFullscreen
                  ? `h-full px-3 py-2 sm:px-5 sm:py-3 ${phase === "game_over" ? "max-w-7xl overflow-y-auto" : "max-w-none overflow-hidden"}`
                  : "min-h-[580px] max-w-6xl"
              }`}
            >
              {/* Fullscreen Floating Controls Bar (Only visible in fullscreen) */}
              {isFullscreen && (
                <div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md sm:px-5 sm:py-2.5">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="font-[family-name:var(--font-fredoka)] text-base font-black text-[#002f76]">
                      Number Trail Adventure
                    </span>
                    <span className="hidden sm:inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                      Fullscreen Mode
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-xl bg-slate-100/80 p-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="min-h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:px-3 sm:text-xs"
                    >
                      {soundEnabled ? "Sound ON" : "Muted"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpeechEnabled(!speechEnabled)}
                      className="min-h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:px-3 sm:text-xs"
                    >
                      {speechEnabled ? "Voice ON" : "Silent"}
                    </button>
                    <button
                      type="button"
                      onClick={toggleGameFullscreen}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-[#002f76] px-3 py-1.5 text-[11px] font-black text-white shadow-sm transition hover:bg-[#002358] sm:text-xs"
                    >
                      <MinimizeIcon className="h-3.5 w-3.5" />
                      <span>Exit Fullscreen</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 1: Setup */}
              {phase === "setup" && (
                <div className={`w-full ${isFullscreen ? "min-h-0 flex-1 overflow-hidden pt-3 sm:pt-4" : "overflow-y-auto"}`}>
                  <PlayerSetupModal
                    roster={roster}
                    isLoadingRoster={isLoadingRoster}
                    selectedPlayers={players}
                    onPlayersChange={setPlayers}
                    roundsPerPlayer={roundsPerPlayer}
                    onRoundsChange={setRoundsPerPlayer}
                    difficulty={difficulty}
                    onDifficultyChange={setDifficulty}
                    selectedModes={selectedModes}
                    onModesChange={setSelectedModes}
                    soundEnabled={soundEnabled}
                    onSoundToggle={() => setSoundEnabled(!soundEnabled)}
                    speechEnabled={speechEnabled}
                    onSpeechToggle={() => setSpeechEnabled(!speechEnabled)}
                    onStartGame={handleStartGame}
                    isFullscreen={isFullscreen}
                  />
                </div>
              )}

              {/* Phase 2: Playing Turn (Clean Academoo-style, fits 100% on screen with ZERO scrolling) */}
              {phase === "playing" && (
                <div className="w-full max-w-5xl mx-auto flex flex-col justify-center gap-3 sm:gap-4 my-auto">
                  {/* Active Player Compact Pill Header */}
                  {activePlayer && (
                    <div
                      className="relative flex items-center justify-between gap-3 rounded-[24px] border-2 px-4 py-2.5 shadow-[0_12px_28px_rgba(24,65,52,.16)] ring-1 ring-white/80 transition-all w-full bg-gradient-to-r from-white via-white/95 to-emerald-50/95 backdrop-blur-md shrink-0"
                      style={{
                        borderColor: activePlayer.borderColor || "#f59e0b",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <AnimalAvatarBadge
                          name={activePlayer.petName || activePlayer.name}
                          color={activePlayer.color}
                          bgLight="#ffffff"
                          borderColor={activePlayer.borderColor}
                          className="h-10 w-10 sm:h-11 sm:w-11 shadow-md ring-2 ring-white"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">
                              Active Explorer
                            </span>
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900">
                              Step {activePlayer.correctCount + 1} of {roundsPerPlayer}
                            </span>
                            {activePlayer.streak > 1 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                                <FlameIcon className="h-3 w-3" />
                                <span>{activePlayer.streak}</span>
                              </span>
                            )}
                          </div>
                          <h2
                            className="font-[family-name:var(--font-fredoka)] text-lg sm:text-2xl font-black leading-tight drop-shadow-xs"
                            style={{ color: activePlayer.color || "#002f76" }}
                          >
                            {activePlayer.name}&apos;s Turn!
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="block text-[10px] font-bold text-[#64748b]">
                            Stars
                          </span>
                          <div className="inline-flex items-center gap-1 font-[family-name:var(--font-fredoka)] text-xl sm:text-2xl font-black text-[#002f76]">
                            <StarIcon className="h-5 w-5 text-amber-500" />
                            <span>{activePlayer.score}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleNewGameSetup}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs active:scale-95"
                        >
                          Exit
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Academoo-style Challenge Card */}
                  {currentChallenge && (
                    <div className="number-trail-challenge-card w-full rounded-[32px] border-[3px] border-white/90 p-4 backdrop-blur-md sm:p-6">
                      <ChallengeDisplay
                        challenge={currentChallenge}
                        onSpeakPrompt={() => {
                          if (currentChallenge) {
                            GameAudio.speakText(currentChallenge.spokenPrompt);
                          }
                        }}
                      />

                      {/* Celebration / Feedback Banner */}
                      {cheerBanner && (
                        <div className="my-2 rounded-xl bg-gradient-to-r from-amber-50 via-emerald-50 to-amber-50 border-2 border-emerald-300 p-2 text-center animate-fade-in shadow-xs">
                          <span className="font-[family-name:var(--font-fredoka)] text-sm sm:text-base font-black text-[#065f46]">
                            {cheerBanner}
                          </span>
                        </div>
                      )}

                      {/* Answer Choice Cards Grid (Compact & fitted) */}
                      <div
                        className={`mt-4 grid gap-3 sm:gap-4 w-full ${
                          currentChallenge.choices.length === 2
                            ? "grid-cols-2 max-w-2xl mx-auto"
                            : currentChallenge.choices.length === 3
                            ? "grid-cols-3 max-w-3xl mx-auto"
                            : "grid-cols-2 sm:grid-cols-4"
                        }`}
                      >
                        {currentChallenge.choices.map((choice, idx) => (
                          <NumberCard
                            key={choice.id}
                            choice={choice}
                            onSelect={handleSelectChoice}
                            status={cardStatus[choice.id] || "idle"}
                            disabled={isLocked}
                            colorIndex={idx}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Phase 2.5: Racing Stage (Appears only after answer!) */}
              {phase === "racing" && raceMotion && (
                <div className="my-auto flex min-h-0 w-full flex-1 animate-fade-in">
                  <TrailRaceTrack
                    players={players}
                    totalSteps={roundsPerPlayer}
                    activePlayerIndex={raceMotion.playerIndex}
                    raceMotion={raceMotion}
                    raceAnimationStarted={raceAnimationStarted}
                    raceAnimationDone={raceAnimationDone}
                    onContinue={handleContinueAfterRace}
                  />
                </div>
              )}

              {/* Phase 3: Victory Podium (Full Width) */}
              {phase === "game_over" && (
                <div className="my-auto w-full rounded-[36px] border-[4px] border-white/80 bg-white/95 p-2 shadow-2xl backdrop-blur-md sm:p-4">
                  <GameOverPodium
                    players={players}
                    roundsTotal={roundsPerPlayer}
                    onPlayAgain={handlePlayAgain}
                    onNewGameSetup={handleNewGameSetup}
                    onSaveSession={handleSaveSession}
                    isSaving={isSavingSession}
                    hasSaved={hasSavedSession}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: HISTORY & LEADERBOARD (Full Width)                           */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "history" && mode === "admin" && (
          <div className="space-y-6 w-full">
            {/* Top Explorers Leaderboard */}
            <div className="rounded-[28px] border border-[#dbe4f1] bg-white p-6 shadow-xs w-full">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-[#002f76]">
                    Number Trail All-Time Leaderboard
                  </h2>
                  <p className="text-xs text-[#64748b]">
                    Top scoring explorers across all recorded classroom sessions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchHistory}
                  disabled={isLoadingHistory}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                >
                  {isLoadingHistory ? "Refreshing..." : "Refresh Scores"}
                </button>
              </div>

              {leaderboard.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                  No sessions recorded yet. Play a game and save the score to build the leaderboard!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leaderboard.map((entry, idx) => (
                    <div
                      key={entry.name + idx}
                      className="flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-3.5 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black ${
                            idx === 0
                              ? "bg-amber-400 text-white shadow-xs"
                              : idx === 1
                              ? "bg-slate-300 text-slate-800"
                              : idx === 2
                              ? "bg-amber-700/60 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <AnimalAvatarBadge
                          name={entry.name}
                          color="#0284c7"
                          className="h-9 w-9"
                        />
                        <div>
                          <span className="block font-black text-sm text-[#1e293b]">
                            {entry.name}
                          </span>
                          <span className="text-[11px] text-[#64748b]">
                            {entry.gamesPlayed} games • {entry.wins} wins
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-sm font-black text-[#002f76]">
                          <StarIcon className="h-4 w-4" />
                          <span>{entry.totalStars}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Sessions History */}
            <div className="rounded-[28px] border border-[#dbe4f1] bg-white p-6 shadow-xs w-full">
              <h2 className="text-base font-black text-[#002f76] mb-4">
                Recorded Sessions ({historySessions.length})
              </h2>

              {historySessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                  No sessions saved yet.
                </div>
              ) : (
                <div className="divide-y divide-[#f1f5f9]">
                  {historySessions.map((session) => (
                    <div
                      key={session.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-[#1e293b]">
                            {session.winner
                              ? `Winner: ${session.winner.name} (${session.winner.score} pts)`
                              : "Classroom Session"}
                          </span>
                          <span className="text-xs text-[#64748b]">
                            • {session.playersCount} players • {session.roundsTotal} steps
                          </span>
                        </div>
                        <p className="text-xs text-[#64748b] mt-0.5">
                          {new Date(session.playedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {session.recordedByEmail && ` • Recorded by ${session.recordedByEmail}`}
                        </p>
                        {session.notes && (
                          <p className="mt-2 rounded-xl bg-amber-50/80 border border-amber-200/60 p-2.5 text-xs text-amber-900">
                            {session.notes}
                          </p>
                        )}
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {session.players.map((p, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700"
                            >
                              <span>{p.name}:</span>
                              <span className="text-[#002f76] font-black">{p.score} pts</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSession(session.id)}
                        className="self-start sm:self-center text-xs font-bold text-red-500 hover:text-red-700 p-1.5 transition"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
