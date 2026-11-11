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

      // Audio narration
      if (speechEnabled) {
        const activeP = players[playerIdx];
        const turnPrefix = activeP ? `${activeP.name}'s turn! ` : "";
        GameAudio.speakText(`${turnPrefix}${challenge.spokenPrompt}`);
      }
    },
    [selectedModes, difficulty, speechEnabled, players]
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

    if (soundEnabled) {
      GameAudio.playPop();
    }

    nextTurnChallenge(0);
  };

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

      const updatedPlayers = players.map((p, idx) => {
        if (idx !== activePlayerIndex) return p;
        return {
          ...p,
          score: p.score + scoreCalc.points,
          correctCount: p.correctCount + 1,
          streak: newStreak,
          maxStreak: Math.max(p.maxStreak, newStreak),
        };
      });

      setPlayers(updatedPlayers);

      const willReachGoal = activePlayer.correctCount + 1 >= roundsPerPlayer;

      setTimeout(() => {
        if (willReachGoal) {
          if (soundEnabled) {
            GameAudio.playVictoryFanfare();
          }
          const ranked = rankPlayers(updatedPlayers);
          setPlayers(ranked);
          setPhase("game_over");
        } else {
          const nextIndex = (activePlayerIndex + 1) % updatedPlayers.length;
          setActivePlayerIndex(nextIndex);
          nextTurnChallenge(nextIndex);
        }
      }, 1400);
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
      }, 1600);
    }
  };

  const handlePlayAgain = () => {
    handleStartGame();
  };

  const handleNewGameSetup = () => {
    setPhase("setup");
    setCardStatus({});
    setCheerBanner(null);
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
              className={`relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-start gap-5 p-3.5 sm:p-6 md:p-8 ${
                isFullscreen ? "min-h-full" : "min-h-[640px]"
              }`}
            >
              {/* Fullscreen Floating Controls Bar (Only visible in fullscreen) */}
              {isFullscreen && (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/95 backdrop-blur-md border border-white/60 p-3 shadow-lg">
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
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      {soundEnabled ? "Sound ON" : "Muted"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpeechEnabled(!speechEnabled)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      {speechEnabled ? "Voice ON" : "Silent"}
                    </button>
                    <button
                      type="button"
                      onClick={toggleGameFullscreen}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-[#002f76] hover:bg-slate-50 transition shadow-2xs"
                    >
                      <MinimizeIcon className="h-3.5 w-3.5" />
                      <span>Exit Fullscreen</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 1: Setup */}
              {phase === "setup" && (
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
                />
              )}

              {/* Phase 2: Playing Turn */}
              {phase === "playing" && (
                <div className="w-full space-y-6">
                  {/* Active Player Panoramic HUD */}
                  {activePlayer && (
                    <div
                      className="relative flex flex-wrap items-center justify-between gap-4 rounded-[28px] border-[3.5px] p-5 sm:p-7 shadow-2xl transition-all w-full bg-white/95 backdrop-blur-md"
                      style={{
                        borderColor: activePlayer.borderColor || "#f59e0b",
                        boxShadow: `0 16px 36px ${activePlayer.color || "#0284c7"}26`,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <AnimalAvatarBadge
                          name={activePlayer.petName || activePlayer.name}
                          color={activePlayer.color}
                          bgLight="#ffffff"
                          borderColor={activePlayer.borderColor}
                          className="h-16 w-16 sm:h-20 sm:w-20 shadow-lg ring-4 ring-white"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-[#475569]">
                              Active Explorer
                            </span>
                            {activePlayer.streak > 1 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-black text-white animate-pulse shadow-2xs">
                                <FlameIcon className="h-3.5 w-3.5" />
                                <span>{activePlayer.streak} Streak!</span>
                              </span>
                            )}
                          </div>
                          <h2
                            className="font-[family-name:var(--font-fredoka)] text-3xl sm:text-4xl lg:text-5xl font-black leading-tight drop-shadow-xs"
                            style={{ color: activePlayer.color || "#002f76" }}
                          >
                            {activePlayer.name}&apos;s Turn!
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="block text-xs font-bold text-[#64748b]">
                            Stars Earned
                          </span>
                          <div className="inline-flex items-center gap-2 font-[family-name:var(--font-fredoka)] text-3xl sm:text-4xl font-black text-[#002f76]">
                            <StarIcon className="h-7 w-7 text-amber-500" />
                            <span>{activePlayer.score}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleNewGameSetup}
                          className="rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 transition shadow-sm active:scale-95"
                        >
                          Exit Game
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Challenge Display & Choices Arena (Full Width) */}
                  {currentChallenge && (
                    <div className="rounded-[36px] border-[4px] border-white/80 bg-white/95 backdrop-blur-md p-6 sm:p-10 shadow-2xl w-full relative">
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
                        <div className="mt-6 rounded-2xl bg-gradient-to-r from-amber-50 via-emerald-50 to-amber-50 border-2 border-emerald-300 p-4 text-center animate-fade-in shadow-md">
                          <span className="font-[family-name:var(--font-fredoka)] text-base sm:text-lg font-black text-[#065f46]">
                            {cheerBanner}
                          </span>
                        </div>
                      )}

                      {/* Answer Choice Cards Grid (Expands to full width with vibrant palettes) */}
                      <div
                        className={`mt-8 grid gap-4 sm:gap-6 w-full ${
                          currentChallenge.choices.length === 2
                            ? "grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto"
                            : currentChallenge.choices.length === 3
                            ? "grid-cols-1 sm:grid-cols-3 max-w-5xl mx-auto"
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

                  {/* Trail Race Track (Full Width Glassmorphic) */}
                  <div className="rounded-[32px] border-[3.5px] border-white/80 bg-white/95 backdrop-blur-md shadow-2xl p-2 sm:p-3">
                    <TrailRaceTrack
                      players={players}
                      totalSteps={roundsPerPlayer}
                      activePlayerIndex={activePlayerIndex}
                    />
                  </div>
                </div>
              )}

              {/* Phase 3: Victory Podium (Full Width) */}
              {phase === "game_over" && (
                <div className="rounded-[36px] border-[4px] border-white/80 bg-white/95 backdrop-blur-md shadow-2xl p-4 sm:p-8">
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
