"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

    // Generate first question
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
      // ── CORRECT ──
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

      // Update player
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

      // Check win condition: Has this player reached the trail goal?
      const willReachGoal = activePlayer.correctCount + 1 >= roundsPerPlayer;

      setTimeout(() => {
        if (willReachGoal) {
          // Finish game!
          if (soundEnabled) {
            GameAudio.playVictoryFanfare();
          }
          const ranked = rankPlayers(updatedPlayers);
          setPlayers(ranked);
          setPhase("game_over");
        } else {
          // Advance turn to next explorer
          const nextIndex = (activePlayerIndex + 1) % updatedPlayers.length;
          setActivePlayerIndex(nextIndex);
          nextTurnChallenge(nextIndex);
        }
      }, 1400);
    } else {
      // ── WRONG / RETRY ──
      setCardStatus({ [choice.id]: "wrong" });

      if (soundEnabled) {
        GameAudio.playOops();
      }

      setCheerBanner("Nice try! Let's pass the torch to the next explorer!");

      // Update player mistakes & reset streak
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
        // Advance turn to keep game moving without embarrassing the child
        const nextIndex = (activePlayerIndex + 1) % updatedPlayers.length;
        setActivePlayerIndex(nextIndex);
        nextTurnChallenge(nextIndex);
      }, 1600);
    }
  };

  // ─── Play Again With Same Players ──────────────────────────────────────────
  const handlePlayAgain = () => {
    handleStartGame();
  };

  // ─── Back to Setup ─────────────────────────────────────────────────────────
  const handleNewGameSetup = () => {
    setPhase("setup");
    setCardStatus({});
    setCheerBanner(null);
  };

  // ─── Save Session to MongoDB ───────────────────────────────────────────────
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

  // ─── Delete Session (Admin) ────────────────────────────────────────────────
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
      description="Fun preschool number learning, counting races, and skill challenges."
    >
      {showConfetti && <ConfettiEffect count={100} />}

      <div className="w-full space-y-6 pb-8">
        {/* Top Control Bar & Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dbe4f1] bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href={activityHomePath}
              className="flex items-center gap-1.5 rounded-xl border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-black text-[#002f76] hover:bg-[#f8fafc] transition"
            >
              ← Back to Games
            </Link>

            {/* Admin Tabs */}
            {mode === "admin" && (
              <div className="flex items-center rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("game")}
                  className={`rounded-lg px-3 py-1 text-xs font-black transition ${
                    activeTab === "game"
                      ? "bg-white text-[#002f76] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🎮 Play Trail
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`rounded-lg px-3 py-1 text-xs font-black transition ${
                    activeTab === "history"
                      ? "bg-white text-[#002f76] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  📊 Scores & History
                </button>
              </div>
            )}
          </div>

          {/* Quick Sound Toggles */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`rounded-xl border px-2.5 py-1 text-xs font-bold transition ${
                soundEnabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
              title="Toggle Sound Effects"
            >
              {soundEnabled ? "🔊 Sound" : "🔇 Muted"}
            </button>
            <button
              type="button"
              onClick={() => setSpeechEnabled(!speechEnabled)}
              className={`rounded-xl border px-2.5 py-1 text-xs font-bold transition ${
                speechEnabled
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
              title="Toggle Voice Speech"
            >
              {speechEnabled ? "🗣️ Voice" : "💬 Silent"}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: GAMEPLAY WORKSPACE                                           */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "game" && (
          <div>
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
              <div className="space-y-6">
                {/* Active Player Banner */}
                {activePlayer && (
                  <div
                    className="relative flex flex-wrap items-center justify-between gap-4 rounded-3xl border-3 p-4 sm:p-5 shadow-sm transition-all"
                    style={{
                      backgroundColor: activePlayer.bgLight || "#fef3c7",
                      borderColor: activePlayer.borderColor || "#f59e0b",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white text-3xl sm:text-4xl shadow-sm">
                        {activePlayer.avatar}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-[#475569]">
                            Current Explorer
                          </span>
                          {activePlayer.streak > 1 && (
                            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                              🔥 {activePlayer.streak} Streak!
                            </span>
                          )}
                        </div>
                        <h2
                          className="font-[family-name:var(--font-fredoka)] text-2xl sm:text-3xl font-black"
                          style={{ color: activePlayer.color || "#002f76" }}
                        >
                          {activePlayer.name}&apos;s Turn!
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="block text-xs font-bold text-[#64748b]">
                          Score
                        </span>
                        <span className="font-[family-name:var(--font-fredoka)] text-2xl font-black text-[#002f76]">
                          ⭐ {activePlayer.score}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleNewGameSetup}
                        className="rounded-xl border border-slate-300 bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white"
                      >
                        Exit Game
                      </button>
                    </div>
                  </div>
                )}

                {/* Challenge Display & Question Prompt */}
                {currentChallenge && (
                  <div className="rounded-[32px] border border-[#dbe4f1] bg-white p-6 sm:p-8 shadow-sm">
                    <ChallengeDisplay
                      challenge={currentChallenge}
                      onSpeakPrompt={() => {
                        if (currentChallenge) {
                          GameAudio.speakText(currentChallenge.spokenPrompt);
                        }
                      }}
                    />

                    {/* Cheer / Feedback Banner */}
                    {cheerBanner && (
                      <div className="mt-4 rounded-2xl bg-gradient-to-r from-amber-100 to-emerald-100 border border-emerald-300/50 p-3 text-center animate-fade-in">
                        <span className="text-sm font-black text-[#065f46]">
                          {cheerBanner}
                        </span>
                      </div>
                    )}

                    {/* Answer Choice Cards Grid */}
                    <div
                      className={`mt-6 grid gap-3 sm:gap-4 ${
                        currentChallenge.choices.length === 2
                          ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
                          : currentChallenge.choices.length === 3
                          ? "grid-cols-1 sm:grid-cols-3 max-w-3xl mx-auto"
                          : "grid-cols-2 sm:grid-cols-4"
                      }`}
                    >
                      {currentChallenge.choices.map((choice) => (
                        <NumberCard
                          key={choice.id}
                          choice={choice}
                          onSelect={handleSelectChoice}
                          status={cardStatus[choice.id] || "idle"}
                          disabled={isLocked}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Trail Race Track */}
                <TrailRaceTrack
                  players={players}
                  totalSteps={roundsPerPlayer}
                  activePlayerIndex={activePlayerIndex}
                />
              </div>
            )}

            {/* Phase 3: Game Over Podium */}
            {phase === "game_over" && (
              <GameOverPodium
                players={players}
                roundsTotal={roundsPerPlayer}
                onPlayAgain={handlePlayAgain}
                onNewGameSetup={handleNewGameSetup}
                onSaveSession={handleSaveSession}
                isSaving={isSavingSession}
                hasSaved={hasSavedSession}
              />
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: HISTORY & LEADERBOARD (ADMIN)                                */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "history" && mode === "admin" && (
          <div className="space-y-6">
            {/* Top Explorers Leaderboard */}
            <div className="rounded-3xl border border-[#dbe4f1] bg-white p-5 sm:p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-[#002f76]">
                    Number Trail All-Time Leaderboard
                  </h2>
                  <p className="text-xs text-[#64748b]">
                    Top scoring explorers across all classroom games
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchHistory}
                  disabled={isLoadingHistory}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  {isLoadingHistory ? "Refreshing..." : "🔄 Refresh"}
                </button>
              </div>

              {leaderboard.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                  No scores recorded yet. Play a game and save the session to populate the leaderboard!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {leaderboard.map((entry, idx) => (
                    <div
                      key={entry.name + idx}
                      className="flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                            idx === 0
                              ? "bg-amber-400 text-white"
                              : idx === 1
                              ? "bg-slate-300 text-slate-700"
                              : idx === 2
                              ? "bg-amber-700/60 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-2xl">{entry.avatar}</span>
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
                        <span className="block font-black text-sm text-[#002f76]">
                          ⭐ {entry.totalStars}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Sessions History */}
            <div className="rounded-3xl border border-[#dbe4f1] bg-white p-5 sm:p-6 shadow-sm">
              <h2 className="text-base font-black text-[#002f76] mb-3">
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
                              ? `🏆 Winner: ${session.winner.name} (${session.winner.score} pts)`
                              : "Game Session"}
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
                          <p className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200/50 p-2 text-xs text-amber-900">
                            📝 {session.notes}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {session.players.map((p, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700"
                            >
                              <span>{p.avatar}</span>
                              <span>{p.name}: {p.score} pts</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSession(session.id)}
                        className="self-start sm:self-center text-xs font-bold text-red-500 hover:text-red-700 p-1"
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
