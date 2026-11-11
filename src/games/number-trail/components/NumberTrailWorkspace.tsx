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
  ChoiceDisplayFormat,
  NumberChallenge,
  NumberChoice,
  GameSessionRecord,
  LeaderboardEntry,
} from "../types";
import { CHEER_PHRASES } from "../data";
import { generateNumberChallenge } from "../utils/challenge-generator";
import { calculateAnswerScore, rankPlayers } from "../utils/scoring";
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
  SparklesIcon,
} from "./GameIcons";

type NumberTrailWorkspaceProps = {
  mode: "admin" | "teacher";
};

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
  const [cardFormat, setCardFormat] = useState<ChoiceDisplayFormat>("words");

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
    (playerIdx: number, formatOverride?: ChoiceDisplayFormat) => {
      const activeFormat = formatOverride || cardFormat;
      const challenge = generateNumberChallenge(
        selectedModes,
        difficulty,
        previousTargetRef.current,
        activeFormat
      );
      previousTargetRef.current = challenge.targetNumber;
      setCurrentChallenge(challenge);
      setCardStatus({});
      setIsLocked(false);
      setCheerBanner(null);
      questionStartTimeRef.current = Date.now();

      // Audio narration
      if (speechEnabled) {
        const activeP = players[playerIdx];
        const turnPrefix = activeP ? `${activeP.name}'s turn! ` : "";
        GameAudio.speakText(`${turnPrefix}${challenge.spokenPrompt}`);
      }
    },
    [selectedModes, difficulty, speechEnabled, players, cardFormat]
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

  // ─── Race Phase Handlers ───────────────────────────────────────────────────
  const handleContinueAfterRace = useCallback(() => {
    if (!raceMotion) return;
    if (raceMotion.willReachGoal) {
      if (soundEnabled) {
        GameAudio.playVictoryFanfare();
      }
      const ranked = rankPlayers(players);
      setPlayers(ranked);
      setPhase("game_over");
    } else {
      const nextIndex = (raceMotion.playerIndex + 1) % players.length;
      setActivePlayerIndex(nextIndex);
      setPhase("playing");
      nextTurnChallenge(nextIndex);
    }
  }, [raceMotion, soundEnabled, players, nextTurnChallenge]);

  useEffect(() => {
    if (phase !== "racing" || !raceMotion) return;
    const timer = setTimeout(() => {
      handleContinueAfterRace();
    }, 3200);
    return () => clearTimeout(timer);
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
        const nextIndex = (activePlayerIndex + 1) % updatedPlayers.length;
        setActivePlayerIndex(nextIndex);
        nextTurnChallenge(nextIndex);
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
      const ranked = rankPlayers(players);
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
          players: ranked,
          winner: ranked[0] || null,
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
      description="Preschool number recognition, counting races, and skill challenges."
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
            {/* Word / Digit Cards Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = cardFormat === "words" ? "digits" : "words";
                setCardFormat(next);
                if (phase === "playing") {
                  nextTurnChallenge(activePlayerIndex, next);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-900 hover:bg-indigo-100 transition shadow-2xs"
              title="Toggle between Word Cards (TEN, TWO) and Digit Cards (10, 2)"
            >
              <span>{cardFormat === "words" ? "🔤 Words" : "🔢 Digits"}</span>
            </button>

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
                ? phase === "playing"
                  ? "h-dvh overflow-y-auto rounded-none"
                  : "min-h-dvh overflow-y-auto rounded-none"
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
              <div className="forest-tree forest-tree-small absolute bottom-[13%] left-[1%]" />
              <div className="forest-tree forest-tree-medium absolute bottom-[12%] left-[10%]" />
              <div className="forest-tree forest-tree-small absolute bottom-[17%] left-[21%]" />
              <div className="forest-tree forest-tree-medium absolute bottom-[11%] right-[11%]" />
              <div className="forest-tree forest-tree-small absolute bottom-[15%] right-[2%]" />
              <div className="forest-ground absolute -bottom-14 -left-[8%] h-[27%] w-[116%] rounded-[50%_50%_0_0]" />
              <span className="forest-firefly absolute left-[31%] top-[58%]" />
              <span className="forest-firefly absolute right-[34%] top-[43%] [animation-delay:1.3s]" />
              <span className="forest-firefly absolute right-[12%] top-[64%] [animation-delay:2.1s]" />
            </div>

            <div
              className={`relative z-10 mx-auto flex w-full max-w-6xl flex-col justify-between p-3 sm:p-5 md:p-6 ${
                isFullscreen ? "h-full overflow-hidden" : "min-h-[580px]"
              }`}
            >
              {/* Fullscreen Floating Controls Bar (Only visible in fullscreen) */}
              {isFullscreen && (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/95 backdrop-blur-md border border-white/60 px-4 py-2.5 shadow-md shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-[family-name:var(--font-fredoka)] text-base font-black text-[#002f76]">
                      Number Trail Adventure
                    </span>
                    <span className="hidden sm:inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                      Fullscreen Mode
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = cardFormat === "words" ? "digits" : "words";
                        setCardFormat(next);
                        if (phase === "playing") {
                          nextTurnChallenge(activePlayerIndex, next);
                        }
                      }}
                      className="rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-900 hover:bg-indigo-100 transition"
                      title="Switch between Words and Digits"
                    >
                      {cardFormat === "words" ? "🔤 Words" : "🔢 Digits"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      {soundEnabled ? "Sound ON" : "Muted"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpeechEnabled(!speechEnabled)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      {speechEnabled ? "Voice ON" : "Silent"}
                    </button>
                    <button
                      type="button"
                      onClick={toggleGameFullscreen}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs font-black text-[#002f76] hover:bg-slate-50 transition shadow-2xs"
                    >
                      <MinimizeIcon className="h-3.5 w-3.5" />
                      <span>Exit Fullscreen</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 1: Setup */}
              {phase === "setup" && (
                <div className="overflow-y-auto w-full">
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
                    cardFormat={cardFormat}
                    onCardFormatChange={setCardFormat}
                    soundEnabled={soundEnabled}
                    onSoundToggle={() => setSoundEnabled(!soundEnabled)}
                    speechEnabled={speechEnabled}
                    onSpeechToggle={() => setSpeechEnabled(!speechEnabled)}
                    onStartGame={handleStartGame}
                  />
                </div>
              )}

              {/* Phase 2: Playing Turn (Clean Academoo-style, fits 100% on screen with ZERO scrolling) */}
              {phase === "playing" && (
                <div className="w-full max-w-4xl mx-auto flex flex-col justify-center gap-3 sm:gap-4 my-auto">
                  {/* Active Player Compact Pill Header */}
                  {activePlayer && (
                    <div
                      className="relative flex items-center justify-between gap-3 rounded-2xl border-[2.5px] px-4 py-2 sm:py-2.5 shadow-md transition-all w-full bg-white/95 backdrop-blur-md shrink-0"
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
                    <div className="rounded-[28px] border-[3.5px] border-white/90 bg-white/95 backdrop-blur-md p-4 sm:p-6 shadow-2xl w-full flex flex-col justify-between">
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
                <div className="w-full max-w-5xl mx-auto space-y-4 my-auto animate-fade-in">
                  {/* Race Celebration Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border-[3.5px] border-white/90 bg-white/95 backdrop-blur-md p-4 sm:p-5 shadow-xl">
                    <div className="flex items-center gap-3.5">
                      <div className="animate-bounce">
                        <AnimalAvatarBadge
                          name={players[raceMotion.playerIndex]?.petName || players[raceMotion.playerIndex]?.name || "Explorer"}
                          color={players[raceMotion.playerIndex]?.color || "#0284c7"}
                          bgLight="#ffffff"
                          borderColor={players[raceMotion.playerIndex]?.borderColor}
                          className="h-14 w-14 sm:h-16 sm:w-16 shadow-lg ring-4 ring-white"
                        />
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-emerald-800">
                          <SparklesIcon className="h-3.5 w-3.5 text-emerald-600" />
                          Correct Answer!
                        </span>
                        <h2 className="font-[family-name:var(--font-fredoka)] text-2xl sm:text-3xl font-black text-[#002f76]">
                          {players[raceMotion.playerIndex]?.name}&apos;s Mascot is Racing!
                        </h2>
                        <p className="text-xs sm:text-sm font-bold text-slate-600">
                          {raceMotion.willReachGoal
                            ? "Crossed the finish line! Trail champion!"
                            : "Advancing closer to the victory trophy on the trail!"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-2.5 text-center shadow-xs">
                      <span className="block text-xs font-black uppercase tracking-wide text-amber-800">Trail Progress</span>
                      <span className="font-[family-name:var(--font-fredoka)] text-2xl font-black text-amber-950">
                        Step {raceMotion.toCount} of {roundsPerPlayer}
                      </span>
                    </div>
                  </div>

                  {/* Race Track */}
                  <div className="rounded-[32px] border-[3.5px] border-white/90 bg-white/95 backdrop-blur-md shadow-2xl p-3 sm:p-5">
                    <TrailRaceTrack
                      players={players}
                      totalSteps={roundsPerPlayer}
                      activePlayerIndex={raceMotion.playerIndex}
                    />
                  </div>

                  {/* Race Footer Action */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/95 backdrop-blur-md p-3.5 shadow-lg">
                    <span className="text-xs sm:text-sm font-bold text-slate-600 text-center sm:text-left">
                      Every explorer can win by reaching the trail goal. Turn advances automatically or tap next.
                    </span>
                    <button
                      type="button"
                      onClick={handleContinueAfterRace}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#002f76] px-6 py-3 text-sm font-black text-white shadow-md hover:bg-[#002358] active:scale-95 transition"
                    >
                      <span>{raceMotion.willReachGoal ? "Victory! View Results 🏆" : "Next Explorer's Turn ➜"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 3: Victory Podium (Full Width) */}
              {phase === "game_over" && (
                <div className="rounded-[36px] border-[4px] border-white/80 bg-white/95 backdrop-blur-md shadow-2xl p-4 sm:p-8 my-auto">
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
