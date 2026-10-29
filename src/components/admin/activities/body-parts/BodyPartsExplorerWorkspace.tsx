"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import {
  BODY_PARTS,
  DEFAULT_AVATARS,
  CHEER_PHRASES,
  type BodyPartItem,
  type BodyPartId,
} from "@/data/body-parts-game";
import { GameAudio } from "@/lib/game-audio";
import { ExplorerCharacter } from "@/components/admin/activities/body-parts/ExplorerCharacter";
import { ConfettiEffect } from "@/components/admin/activities/body-parts/ConfettiEffect";
import { BodyPartAnswerPicture } from "@/components/admin/activities/body-parts/BodyPartAnswerPicture";
import { RacePetPicture } from "@/components/admin/activities/body-parts/RacePetPicture";

type GamePlayer = {
  studentId: string | null;
  name: string;
  avatar: string;
  petName: string;
  color: string;
  bgLight: string;
  borderColor: string;
  score: number;
  correctCount: number;
  mistakesCount: number;
  streak: number;
  maxStreak: number;
  rank?: number;
};

type TrailblazerStudent = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  fullName: string;
  displayName: string;
  program: string;
  status: string;
};

type GameSessionRecord = {
  id: string;
  gameTitle: string;
  roundsTotal: number;
  playersCount: number;
  players: Array<{
    studentId?: string | null;
    name: string;
    avatar: string;
    score: number;
    correctCount: number;
    rank: number;
  }>;
  winner: {
    name: string;
    score: number;
    avatar: string;
  };
  playedAt: string;
  recordedByEmail?: string;
};

type LeaderboardEntry = {
  name: string;
  avatar: string;
  totalStars: number;
  gamesPlayed: number;
  wins: number;
};

type TapSparkle = {
  id: number;
  x: number;
  y: number;
  emoji: string;
};

// ─── Pure Random Generation Helpers (Outside Component Scope for Purity) ────
function getRandomCheer(): string {
  return CHEER_PHRASES[Math.floor(Math.random() * CHEER_PHRASES.length)];
}

function getRandomSparkleEmoji(): string {
  const icons = ["✨", "⭐", "🌟", "🎈", "🫧", "💛"];
  return icons[Math.floor(Math.random() * icons.length)];
}

function getRandomQuestionChoices(promptPart: BodyPartItem, count = 4): BodyPartItem[] {
  const otherParts = BODY_PARTS.filter((p) => p.id !== promptPart.id);
  const shuffledOthers = [...otherParts].sort(() => 0.5 - Math.random());
  const distractors = shuffledOthers.slice(0, Math.max(1, count - 1));
  return [promptPart, ...distractors].sort(() => 0.5 - Math.random());
}

type WorkspaceMode = "teacher" | "admin";

const LEARN_CATEGORIES = [
  { id: "face", label: "Face", emoji: "😊", category: "face" },
  { id: "body", label: "Body", emoji: "🧍", category: "upper" },
  { id: "legs", label: "Legs & feet", emoji: "🦶", category: "lower" },
] as const;

export function BodyPartsExplorerWorkspace({ mode }: { mode: WorkspaceMode }) {
  const { user } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"game" | "learn" | "history">("game");

  // Game phase
  const [phase, setPhase] = useState<"setup" | "playing" | "racing" | "game_over">("setup");

  // Trailblazer roster loaded from MongoDB
  const [trailblazers, setTrailblazers] = useState<TrailblazerStudent[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);

  // Player Setup State (1 to 6 players)
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [petPickerIndex, setPetPickerIndex] = useState<number | null>(null);
  const [roundsPerPlayer, setRoundsPerPlayer] = useState<number>(3);
  const [gameMode, setGameMode] = useState<"explorer" | "pictures">("pictures");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [guestNameInput, setGuestNameInput] = useState("");

  // Voice Selection
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // Gameplay State
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState<BodyPartItem>(BODY_PARTS[0]);
  const [choiceOptions, setChoiceOptions] = useState<BodyPartItem[]>([]);
  const questionDeckRef = useRef<BodyPartId[]>([]);
  const lastQuestionRef = useRef<BodyPartId | null>(null);
  const [raceMotion, setRaceMotion] = useState<{ playerIndex: number; fromCount: number; toCount: number } | null>(null);
  const [raceAnimationStarted, setRaceAnimationStarted] = useState(false);
  const [raceAnimationDone, setRaceAnimationDone] = useState(false);
  const [selectedLearnPartId, setSelectedLearnPartId] = useState<BodyPartId>("head");
  const [feedback, setFeedback] = useState<{
    status: "idle" | "correct" | "try_again";
    message: string;
    subMessage?: string;
  }>({ status: "idle", message: "" });
  const [showConfetti, setShowConfetti] = useState(false);

  // Tap ripple sparkles on screen
  const [sparkles, setSparkles] = useState<TapSparkle[]>([]);
  const sparkleCounterRef = useRef(0);
  const gamePanelRef = useRef<HTMLDivElement>(null);
  const learnViewerRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (phase !== "racing" || !raceMotion) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = window.requestAnimationFrame(() => setRaceAnimationStarted(true));
    const finishTimer = window.setTimeout(() => setRaceAnimationDone(true), reducedMotion ? 120 : 3000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(finishTimer);
    };
  }, [phase, raceMotion]);

  // Misclick & spam lock protection
  const isInputLockedRef = useRef(false);

  // Database saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // History & Leaderboard state
  const [historySessions, setHistorySessions] = useState<GameSessionRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // ─── Load Voice Options ────────────────────────────────────────────────────
  useEffect(() => {
    const updateVoices = () => {
      const v = GameAudio.getAvailableVoices();
      setAvailableVoices(v);
      if (v.length > 0 && !selectedVoice) {
        setSelectedVoice(v[0].voiceURI);
      }
    };
    updateVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [selectedVoice]);

  const handleVoiceChange = (uri: string) => {
    setSelectedVoice(uri);
    GameAudio.setSelectedVoice(uri);
  };

  const handleTestVoice = () => {
    GameAudio.speakText("Nose", true);
  };

  const selectLearnPart = useCallback((part: BodyPartItem, playFeedback = true) => {
    setSelectedLearnPartId(part.id);
    if (playFeedback && speechEnabled) GameAudio.speakText(part.name, true);
    if (playFeedback && soundEnabled) GameAudio.playCorrect();
  }, [speechEnabled, soundEnabled]);

  useEffect(() => {
    const handleExplorerMessage = (event: MessageEvent<{ type?: string; id?: BodyPartId }>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== learnViewerRef.current?.contentWindow ||
        !["little-explorer-part", "little-explorer-navigate"].includes(event.data?.type ?? "")
      ) return;

      const part = BODY_PARTS.find((item) => item.id === event.data.id);
      if (part) {
        selectLearnPart(part);
        learnViewerRef.current?.contentWindow?.postMessage(
          {
            type: "little-explorer-commentary",
            id: part.id,
            name: part.name,
            emoji: part.emoji,
            hint: part.hint,
          },
          window.location.origin,
        );
      }
    };

    window.addEventListener("message", handleExplorerMessage);
    return () => window.removeEventListener("message", handleExplorerMessage);
  }, [selectLearnPart]);

  useEffect(() => {
    learnViewerRef.current?.contentWindow?.postMessage(
      { type: "little-explorer-point", id: selectedLearnPartId },
      window.location.origin
    );
  }, [selectedLearnPartId]);

  // ─── Fetch Trailblazers from MongoDB ───────────────────────────────────────
  const fetchTrailblazers = useCallback(async () => {
    setIsLoadingRoster(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/admin/activities/body-parts/students", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.students)) {
        setTrailblazers(data.students);
      }
    } catch (err) {
      console.error("Failed to load Trailblazer roster:", err);
    } finally {
      setIsLoadingRoster(false);
    }
  }, [user]);

  // ─── Fetch Past Game Sessions ──────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/admin/activities/body-parts/scores?limit=30", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setHistorySessions(data.sessions || []);
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error("Failed to load activity history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTrailblazers();
  }, [fetchTrailblazers, mode]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

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

    try {
      if (document.fullscreenElement === gamePanel) {
        await document.exitFullscreen();
      } else if (!document.fullscreenElement) {
        await gamePanel.requestFullscreen();
      }
    } catch (error) {
      console.error("Could not change game fullscreen mode:", error);
    }
  };

  // ─── Tap Sparkle Animation ─────────────────────────────────────────────────
  const triggerTapSparkle = (e: React.MouseEvent) => {
    if (soundEnabled) {
      GameAudio.playPop();
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const emoji = getRandomSparkleEmoji();
    const id = ++sparkleCounterRef.current;

    setSparkles((prev) => [...prev.slice(-8), { id, x, y, emoji }]);
    setTimeout(() => {
      setSparkles((prev) => prev.filter((s) => s.id !== id));
    }, 700);
  };

  // ─── Player Selection Helpers ──────────────────────────────────────────────
  const handleToggleTrailblazer = (student: TrailblazerStudent) => {
    const isSelected = players.some((p) => p.studentId === student.id);
    if (isSelected) {
      setPlayers(players.filter((p) => p.studentId !== student.id));
      setPetPickerIndex(null);
    } else {
      if (players.length >= 6) {
        alert("Maximum 6 players per activity!");
        return;
      }
      const avatarIdx = players.length % DEFAULT_AVATARS.length;
      const avatarInfo = DEFAULT_AVATARS[avatarIdx];
      const newPlayer: GamePlayer = {
        studentId: student.id,
        name: student.nickname || student.firstName,
        avatar: avatarInfo.emoji,
        petName: avatarInfo.name,
        color: avatarInfo.color,
        bgLight: avatarInfo.bgLight,
        borderColor: avatarInfo.borderColor,
        score: 0,
        correctCount: 0,
        mistakesCount: 0,
        streak: 0,
        maxStreak: 0,
      };
      setPlayers([...players, newPlayer]);
    }
  };

  const handleAddGuest = () => {
    const name = guestNameInput.trim();
    if (!name) return;
    if (players.length >= 6) {
      alert("Maximum 6 players per activity!");
      return;
    }
    const avatarIdx = players.length % DEFAULT_AVATARS.length;
    const avatarInfo = DEFAULT_AVATARS[avatarIdx];
    const newPlayer: GamePlayer = {
      studentId: null,
      name,
      avatar: avatarInfo.emoji,
      petName: avatarInfo.name,
      color: avatarInfo.color,
      bgLight: avatarInfo.bgLight,
      borderColor: avatarInfo.borderColor,
      score: 0,
      correctCount: 0,
      mistakesCount: 0,
      streak: 0,
      maxStreak: 0,
    };
    setPlayers([...players, newPlayer]);
    setGuestNameInput("");
  };

  const handleRemovePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
    setPetPickerIndex(null);
  };

  const handleChoosePet = (playerIndex: number, pet: (typeof DEFAULT_AVATARS)[number]) => {
    setPlayers((prev) =>
      prev.map((p, idx) => {
        if (idx !== playerIndex) return p;
        return { ...p, avatar: pet.emoji, petName: pet.name, color: pet.color, bgLight: pet.bgLight, borderColor: pet.borderColor };
      })
    );
    setPetPickerIndex(null);
  };

  // ─── Generate Question for Current Turn ────────────────────────────────────
  const generateQuestionForTurn = useCallback(
    () => {
      if (questionDeckRef.current.length === 0) {
        const freshDeck = BODY_PARTS.map((part) => part.id).filter((partId) => partId !== lastQuestionRef.current);
        for (let index = freshDeck.length - 1; index > 0; index -= 1) {
          const swapIndex = Math.floor(Math.random() * (index + 1));
          [freshDeck[index], freshDeck[swapIndex]] = [freshDeck[swapIndex], freshDeck[index]];
        }
        questionDeckRef.current = freshDeck;
      }

      const nextPartId = questionDeckRef.current.shift() ?? BODY_PARTS[0].id;
      lastQuestionRef.current = nextPartId;
      const targetPart = BODY_PARTS.find((part) => part.id === nextPartId) ?? BODY_PARTS[0];
      const allChoices = gameMode === "pictures" ? getRandomQuestionChoices(targetPart, 2) : [];

      setCurrentPrompt(targetPart);
      setChoiceOptions(allChoices);
      setFeedback({ status: "idle", message: "" });
      isInputLockedRef.current = false;

      // Speak only the body-part name so children can listen without extra clues.
      if (soundEnabled) {
        GameAudio.playTurn();
      }
      if (speechEnabled) {
        setTimeout(() => {
          GameAudio.speakText(targetPart.name, true);
        }, 300);
      }
    },
    [soundEnabled, speechEnabled, gameMode]
  );

  // ─── Auto-save to MongoDB ──────────────────────────────────────────────────
  const autoSaveSession = useCallback(async () => {
    setIsSaving(true);
    try {
      const token = await user?.getIdToken();
      const sorted = [...players].sort((a, b) => b.score - a.score);
      const rankedPlayers = players.map((p) => {
        const rank = sorted.findIndex((s) => s.name === p.name) + 1;
        return { ...p, rank };
      });

      const finishLineWinners = [...players]
        .filter((player) => player.correctCount >= roundsPerPlayer)
        .sort((a, b) => b.score - a.score);
      const winner = finishLineWinners[0]
        ? { name: finishLineWinners[0].name, score: finishLineWinners[0].score, avatar: finishLineWinners[0].avatar }
        : { name: "No finish-line winner", score: 0, avatar: "" };

      const payload = {
        gameType: "body-parts",
        gameTitle: gameMode === "pictures" ? "Body Parts Race - Picture Match" : "Body Parts Race - Body Map",
        roundsTotal: roundsPerPlayer,
        players: rankedPlayers,
        winner,
        notes: `Played in ${gameMode === "pictures" ? "Picture Match" : "Body Map"} mode with ${players.length} Trailblazers across ${roundsPerPlayer} rounds per child.`,
      };

      const res = await fetch("/api/admin/activities/body-parts/scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
      }
    } catch (err) {
      console.error("Failed to auto-save activity score:", err);
    } finally {
      setIsSaving(false);
    }
  }, [user, players, roundsPerPlayer, gameMode]);

  // ─── Finish Game & Show Podium ─────────────────────────────────────────────
  const finishGame = useCallback(() => {
    setPhase("game_over");
    if (soundEnabled) {
      GameAudio.playVictoryFanfare();
    }
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3800);

    autoSaveSession();
  }, [soundEnabled, speechEnabled, autoSaveSession]);

  // ─── Advance to Next Player or Round ───────────────────────────────────────
  const advanceTurn = useCallback(() => {
    let nextPlayerIdx = -1;
    for (let step = 1; step <= players.length; step += 1) {
      const candidateIdx = (currentPlayerIdx + step) % players.length;
      if (players[candidateIdx].correctCount < roundsPerPlayer) {
        nextPlayerIdx = candidateIdx;
        break;
      }
    }

    if (nextPlayerIdx === -1) {
      finishGame();
      return;
    }

    setCurrentPlayerIdx(nextPlayerIdx);
    generateQuestionForTurn();
  }, [players, currentPlayerIdx, roundsPerPlayer, finishGame, generateQuestionForTurn]);

  // ─── Start Adventure Game ──────────────────────────────────────────────────
  const handleStartGame = () => {
    if (players.length === 0) {
      alert("Please select at least 1 Trailblazer explorer!");
      return;
    }

    const freshPlayers = players.map((p) => ({
      ...p,
      score: 0,
      correctCount: 0,
      mistakesCount: 0,
      streak: 0,
      maxStreak: 0,
    }));
    setRaceMotion(null);
    questionDeckRef.current = [];
    lastQuestionRef.current = null;
    setRaceAnimationStarted(false);
    setRaceAnimationDone(false);
    setPlayers(freshPlayers);
    setCurrentPlayerIdx(0);
    setPhase("playing");
    setSaveSuccess(false);

    generateQuestionForTurn();
  };

  // ─── Handle Child's Answer (With Misclick Protection & Teaching) ───────────
  const handleAnswer = useCallback(
    (selectedPartId: BodyPartId) => {
      if (isInputLockedRef.current || feedback.status === "correct") return;

      const activePlayer = players[currentPlayerIdx];
      if (!activePlayer) return;

      if (selectedPartId === currentPrompt.id) {
        // ─── CORRECT ANSWER ───
        isInputLockedRef.current = true; // Lock during celebration
        const points = 100;
        const newStreak = activePlayer.streak + 1;
        const maxStreak = Math.max(activePlayer.maxStreak, newStreak);
        const streakBonus = newStreak > 1 ? (newStreak - 1) * 25 : 0;
        const totalPointsEarned = points + streakBonus;

        const randomCheer = getRandomCheer();

        setFeedback({
          status: "correct",
          message: `${randomCheer} +${totalPointsEarned} Stars! ⭐`,
        });

        if (soundEnabled) {
          if (newStreak >= 2) {
            GameAudio.playStreak();
          } else {
            GameAudio.playCorrect();
          }
        }
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2400);

        setPlayers((prev) =>
          prev.map((p, idx) => {
            if (idx !== currentPlayerIdx) return p;
            return {
              ...p,
              score: p.score + totalPointsEarned,
              correctCount: p.correctCount + 1,
              streak: newStreak,
              maxStreak,
            };
          })
        );
        setRaceMotion({
          playerIndex: currentPlayerIdx,
          fromCount: activePlayer.correctCount,
          toCount: activePlayer.correctCount + 1,
        });
        setRaceAnimationStarted(false);
        setRaceAnimationDone(false);
        setPhase("racing");
      } else {
        // A wrong pick uses this turn and passes play to the next unfinished racer.
        if (soundEnabled) {
          GameAudio.playOops();
        }

        setPlayers((prev) => prev.map((player, index) => index === currentPlayerIdx
          ? { ...player, mistakesCount: player.mistakesCount + 1, streak: 0 }
          : player));
        setFeedback({ status: "idle", message: "" });
        isInputLockedRef.current = true;
        window.setTimeout(advanceTurn, 420);
      }
    },
    [
      feedback.status,
      players,
      currentPlayerIdx,
      currentPrompt,
      soundEnabled,
      speechEnabled,
      advanceTurn,
    ]
  );

  const continueAfterRace = () => {
    if (!raceAnimationDone) return;
    setRaceMotion(null);
    setRaceAnimationStarted(false);
    setRaceAnimationDone(false);
    setPhase("playing");
    advanceTurn();
  };

  // ─── Delete Session in History ─────────────────────────────────────────────
  const handleDeleteSession = async (id: string) => {
    if (!confirm("Are you sure you want to delete this game record?")) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/activities/body-parts/scores?id=${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        fetchHistory();
      }
    } catch (err) {
      console.error("Failed to delete score record:", err);
    }
  };

  const currentPlayer = players[currentPlayerIdx] || players[0];
  const finishLineWinners = players.filter((player) => player.correctCount >= roundsPerPlayer);
  const allPlayersFinished = players.length > 0 && finishLineWinners.length === players.length;
  const selectedLearnPart = BODY_PARTS.find((part) => part.id === selectedLearnPartId) || BODY_PARTS[0];
  const activeLearnCategory = LEARN_CATEGORIES.find((category) => category.category === selectedLearnPart.category) || LEARN_CATEGORIES[0];

  return (
    <AppShell
      title={mode === "admin" && activeTab === "history" ? "Body Parts Scores & Analytics" : "Body Parts Adventure"}
      description={mode === "admin" && activeTab === "history" ? "Review recorded game scores, leaderboard standings, and activity analytics." : "Choose a mode and play a body-parts learning game with your students."}
    >
      {showConfetti && <ConfettiEffect count={120} />}

      {/* ─── Top Control Strip & Voice Selector ─── */}
      {phase !== "racing" && (
        <>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-xs mb-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("game")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === "game"
                ? "bg-[#002f76] text-white shadow-md shadow-[#002f76]/25 scale-[1.02]"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>🎮</span>
            <span>Play Game</span>
          </button>
          {mode === "teacher" && <button
            onClick={() => setActiveTab("learn")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${activeTab === "learn" ? "bg-[#002f76] text-white shadow-md shadow-[#002f76]/25 scale-[1.02]" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          ><span>🧠</span><span>Learn Body Parts</span></button>}
          {mode === "admin" && <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all sm:text-sm ${activeTab === "history" ? "bg-[#002f76] text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            <span aria-hidden="true">🏆</span><span>Scores &amp; Analytics</span>
          </button>}
        </div>

        {/* Audio & Teacher Controls */}
        {mode === "teacher" && <div className="flex items-center gap-2">
          {/* Voice Settings Dropdown Toggle */}
          <button
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-300 bg-sky-50 text-sky-800 text-xs font-bold hover:bg-sky-100 transition-all"
            title="Configure Teacher Speech Voice"
          >
            <span>🎙️</span>
            <span className="hidden sm:inline">Voice Settings</span>
          </button>

          {/* SFX Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              soundEnabled
                ? "bg-amber-50 border-amber-300 text-amber-900 shadow-2xs"
                : "bg-slate-100 border-slate-300 text-slate-400"
            }`}
          >
            {soundEnabled ? "🔊 Sound On" : "🔇 Sound Off"}
          </button>

          {/* Speech Toggle */}
          <button
            onClick={() => setSpeechEnabled(!speechEnabled)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              speechEnabled
                ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs"
                : "bg-slate-100 border-slate-300 text-slate-400"
            }`}
          >
            {speechEnabled ? "🗣️ Voice On" : "🤫 Voice Off"}
          </button>
        </div>}
      </div>

      {/* Voice Customization Drawer */}
      {mode === "teacher" && showVoiceSettings && (
        <div className="mb-4 p-4 rounded-2xl bg-sky-50 border-2 border-sky-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex-1 w-full">
            <label className="text-xs font-black uppercase text-sky-900 block mb-1">
              Select Narration Voice (Natural Neural Voices Sound Best):
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-sky-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {availableVoices.length === 0 ? (
                <option value="">Default System Voice</option>
              ) : (
                availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={handleTestVoice}
            className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <span>🔊</span>
            <span>Test Voice</span>
          </button>
        </div>
      )}
        </>
      )}

      {activeTab === "learn" && mode === "teacher" && (
        <section className="relative w-full overflow-hidden rounded-[28px] border border-[#d7e2f3] bg-white p-4 text-[#002f76] shadow-[0_16px_45px_rgba(0,47,118,.12)] sm:p-6 lg:p-7">
              <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[#e6f4f8] blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-[#ffcc00]/15 blur-2xl" />
              <header className="relative mb-5 flex flex-col items-center gap-2 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d7e2f3] bg-[#f8fbff] px-4 py-2 text-xs font-black uppercase tracking-[.12em] text-[#003399] shadow-sm">✨ Little Explorer</span>
                <h2 className="font-[family-name:var(--font-fredoka)] text-3xl font-bold tracking-tight text-[#002f76] sm:text-4xl">Let’s learn about our bodies!</h2>
                <p className="max-w-xl text-base font-medium text-[#3d5a8a] sm:text-lg">Tap the explorer to discover each body part!</p>
              </header>

              <div className="relative mb-4 grid grid-cols-3 gap-2 sm:gap-3" aria-label="Choose a body part group">
                {LEARN_CATEGORIES.map((category) => {
                    const active = activeLearnCategory.id === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        const firstPart = BODY_PARTS.find((part) => part.category === category.category);
                        if (firstPart) selectLearnPart(firstPart, false);
                      }}
                      aria-pressed={active}
                      className={`min-h-14 touch-manipulation rounded-2xl border-2 px-2 py-2 text-base font-extrabold transition active:scale-[.98] sm:min-h-16 sm:text-lg ${active ? "border-[#ffcc00] bg-[#002f76] text-white shadow-md ring-2 ring-[#ffcc00]/35" : "border-[#d7e2f3] bg-[#f8fbff] text-[#002f76] hover:border-[#0066cc] hover:bg-[#eaf3ff]"}`}
                    >
                      <span className="mr-1.5" aria-hidden="true">{category.emoji}</span>{category.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <div className="overflow-hidden rounded-[26px] border-2 border-[#d7e2f3] bg-[#e6f4f8] shadow-inner">
                  <iframe
                    ref={learnViewerRef}
                    src="/little-explorer.html"
                    title="Little Explorer 3D character. Drag to turn the character and tap a body part to learn its name."
                    allowFullScreen
                    className="h-[70dvh] min-h-[460px] max-h-[900px] w-full border-0"
                    loading="lazy"
                    scrolling="no"
                    onLoad={(event) => event.currentTarget.contentWindow?.postMessage(
                      { type: "little-explorer-point", id: selectedLearnPartId },
                      window.location.origin
                    )}
                  />
                </div>
              </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: GAMEPLAY                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "game" && (
        <div
          ref={gamePanelRef}
          onClick={triggerTapSparkle}
          className={`relative w-full overflow-hidden shadow-2xl ${isFullscreen ? phase === "playing" ? "h-dvh overflow-y-auto rounded-none" : "min-h-dvh overflow-y-auto rounded-none" : "rounded-3xl"}`}
        >
          {/* ─── Animated Kids Tap Sparkles ─── */}
          {sparkles.map((s) => (
            <span
              key={s.id}
              style={{ left: s.x, top: s.y }}
              className="pointer-events-none absolute text-2xl -translate-x-1/2 -translate-y-1/2 animate-ping z-50 select-none"
            >
              {s.emoji}
            </span>
          ))}

          {/* ─── VIBRANT OUTDOOR EXPLORER BACKGROUND ─── */}
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

          <div className={`relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-start gap-3 p-3 sm:p-5 md:p-6 ${isFullscreen ? phase === "playing" ? "h-full min-h-0" : "min-h-dvh" : "min-h-[640px]"}`}>
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void toggleGameFullscreen();
                }}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                className="inline-flex items-center gap-2 rounded-xl border border-[#003399]/15 bg-white/95 px-3.5 py-2 text-xs font-extrabold text-[#003399] shadow-sm transition-colors hover:bg-[#fff7d6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc] focus-visible:ring-offset-2"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  {isFullscreen ? "fullscreen_exit" : "fullscreen"}
                </span>
                <span>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</span>
              </button>
            </div>
            {/* ─────────────────────────────────────────────────────────────── */}
            {/* PHASE 1: SETUP SCREEN                                           */}
            {/* ─────────────────────────────────────────────────────────────── */}
            {phase === "setup" && (
              <div className="w-full space-y-6">
                {/* Hero Card */}
                <div className="rounded-3xl bg-white/95 backdrop-blur-md p-6 sm:p-8 border-4 border-amber-300 shadow-xl text-center relative overflow-hidden">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-400 text-amber-950 text-xs sm:text-sm font-black uppercase tracking-wider mb-2 shadow-sm">
                    ⭐ Trailblazer Group Activity
                  </span>
                  <h1 className="text-2xl sm:text-4xl font-[family-name:var(--font-fredoka)] font-black text-[#002f76] tracking-tight">
                    Body Parts Explorer Challenge!
                  </h1>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 font-semibold max-w-xl mx-auto leading-relaxed">
                    Tap the Trailblazer kids below to add them to this game (1 to 6 players).
                    Then choose Picture Match or Body Map for the group.
                  </p>
                </div>

                {/* Trailblazer Picker Box */}
                <div className="rounded-3xl bg-white/95 backdrop-blur-md p-5 sm:p-6 border-4 border-sky-300 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-[#002f76] flex items-center gap-2">
                        <span>👥</span> Pick Trailblazers ({players.length}/6 Max)
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Students from your MongoDB database. Tap to add or remove!
                      </p>
                    </div>

                    {players.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlayers([]);
                          setPetPickerIndex(null);
                        }}
                        className="text-xs font-black text-rose-600 hover:text-rose-700 underline self-start sm:self-auto"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {isLoadingRoster ? (
                    <div className="py-8 text-center text-sm font-bold text-sky-700 animate-pulse">
                      Loading Trailblazer kids from MongoDB...
                    </div>
                  ) : trailblazers.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500">
                      No Trailblazer students found in MongoDB. You can add guest kids below!
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                      {trailblazers.map((student) => {
                        const isSelected = players.some((p) => p.studentId === student.id);
                        return (
                          <button
                            key={student.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTrailblazer(student);
                            }}
                            className={`flex min-h-16 touch-manipulation items-center gap-2.5 rounded-2xl border-3 p-3.5 text-left transition-colors active:scale-[0.99] ${
                              isSelected
                                ? "bg-amber-100 border-amber-400 text-amber-950 shadow-md scale-[1.02]"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-sky-50 hover:border-sky-300"
                            }`}
                          >
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-xs ${
                                isSelected ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {isSelected ? "✓" : "+"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black truncate leading-tight">
                                {student.nickname || student.firstName}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate leading-tight">
                                {student.fullName}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Guest Kid */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      value={guestNameInput}
                      onChange={(e) => setGuestNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddGuest()}
                      placeholder="Add guest child name (e.g. Maya)..."
                      className="min-h-12 w-full touch-manipulation rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 sm:w-72"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddGuest();
                      }}
                      disabled={!guestNameInput.trim() || players.length >= 6}
                      className="min-h-12 w-full touch-manipulation rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-sky-700 disabled:opacity-40 sm:w-auto"
                    >
                      + Add Child
                    </button>
                  </div>
                </div>

                {/* Selected Players Lineup (1 to 6) */}
                <div className="rounded-3xl bg-white/95 backdrop-blur-md p-5 sm:p-6 border-4 border-emerald-300 shadow-xl">
                  <h3 className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span>🎒</span> Active Explorers Lineup ({players.length}/6)
                  </h3>
                  <p className="-mt-2 mb-3 text-xs font-semibold text-emerald-800">
                    Tap a pet to choose from {DEFAULT_AVATARS.length} animal friends.
                  </p>

                  {players.length === 0 ? (
                    <div className="py-8 text-center border-3 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-400">
                      Tap any child above to join this game!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {players.map((player, idx) => (
                        <div key={idx}>
                          <div
                            className="flex items-center justify-between rounded-2xl border-3 p-3.5 shadow-sm"
                            style={{ backgroundColor: player.bgLight, borderColor: player.borderColor }}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPetPickerIndex(petPickerIndex === idx ? null : idx);
                                }}
                                aria-label={`Choose a pet for ${player.name}`}
                                aria-expanded={petPickerIndex === idx}
                                title="Choose a pet"
                                className="flex size-14 shrink-0 touch-manipulation items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 active:scale-95"
                              >
                                <RacePetPicture name={player.petName} color={player.color} background={player.bgLight} className="h-12 w-14" />
                              </button>
                              <div className="min-w-0">
                                <p className="truncate text-base font-black" style={{ color: player.color }}>
                                  {player.name}
                                </p>
                                <span className="text-[10px] font-black uppercase text-slate-500">
                                  Player #{idx + 1}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePlayer(idx);
                                setPetPickerIndex(null);
                              }}
                              aria-label={`Remove ${player.name}`}
                              className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-full bg-white/85 text-base font-bold text-slate-500 shadow-sm transition-colors hover:bg-rose-500 hover:text-white active:scale-95"
                              title="Remove player"
                            >
                              ✕
                            </button>
                          </div>

                          {petPickerIndex === idx && (
                            <div
                              className="mt-2 rounded-2xl border border-sky-200 bg-white p-3 shadow-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="mb-2 text-xs font-extrabold text-[#003399]">Choose {player.name}&apos;s pet</p>
                              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                                {DEFAULT_AVATARS.map((pet) => {
                                  const isSelected = player.petName === pet.name;
                                  return (
                                    <button
                                      key={pet.emoji}
                                      type="button"
                                      onClick={() => handleChoosePet(idx, pet)}
                                      aria-label={pet.name}
                                      aria-pressed={isSelected}
                                      title={pet.name}
                                      className={`flex min-h-16 touch-manipulation flex-col items-center justify-center rounded-xl border-2 p-1 transition-colors active:scale-95 ${
                                        isSelected
                                          ? "border-amber-400 bg-amber-100 ring-2 ring-amber-200"
                                          : "border-slate-100 bg-slate-50 hover:border-sky-300 hover:bg-sky-50"
                                      }`}
                                    >
                                      <RacePetPicture name={pet.name} color={pet.color} background={pet.bgLight} className="h-12 w-full" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <section className="rounded-3xl border-4 border-sky-300 bg-white/95 p-5 shadow-xl sm:p-6" aria-labelledby="game-mode-heading">
                  <h2 id="game-mode-heading" className="mb-3 text-xs font-black uppercase tracking-wider text-slate-700">Choose a game mode</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setGameMode("pictures"); }}
                      aria-pressed={gameMode === "pictures"}
                      className={`min-h-24 rounded-2xl border-3 p-4 text-left transition active:scale-[.99] ${gameMode === "pictures" ? "border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-200" : "border-slate-200 bg-slate-50 hover:border-sky-300"}`}
                    >
                      <span className="block text-base font-black text-[#002f76]">🖼️ Picture Match</span>
                      <span className="mt-1 block text-xs font-semibold text-slate-600">Hear the body-part name, then choose the matching picture from two cards.</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setGameMode("explorer"); }}
                      aria-pressed={gameMode === "explorer"}
                      className={`min-h-24 rounded-2xl border-3 p-4 text-left transition active:scale-[.99] ${gameMode === "explorer" ? "border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-200" : "border-slate-200 bg-slate-50 hover:border-sky-300"}`}
                    >
                      <span className="block text-base font-black text-[#002f76]">🧍 Body Map</span>
                      <span className="mt-1 block text-xs font-semibold text-slate-600">Hear the name, then find and tap that part on the explorer.</span>
                    </button>
                  </div>
                  <p className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-center text-xs font-bold text-sky-900">
                    Each correct answer moves the pet toward the finish line.
                  </p>
                </section>

                {/* Launch Bar */}
                <div className="rounded-3xl bg-white/95 backdrop-blur-md p-5 sm:p-6 border-4 border-amber-400 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                      Rounds Per Child:
                    </label>
                    <div className="flex items-center gap-2">
                      {[2, 3, 5, 8].map((count) => (
                        <button
                          key={count}
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoundsPerPlayer(count);
                          }}
                          className={`min-h-12 touch-manipulation rounded-xl px-4 py-3 text-sm font-black transition-colors ${
                            roundsPerPlayer === count
                              ? "bg-[#002f76] text-white shadow-md scale-105"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {count} Rounds
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartGame();
                    }}
                    disabled={players.length === 0}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white text-lg font-black rounded-2xl shadow-xl shadow-emerald-600/30 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.03] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-b-4 border-emerald-700"
                  >
                    <span>🚀</span>
                    <span>START ADVENTURE!</span>
                  </button>
                </div>
              </div>
            )}

            {phase === "racing" && raceMotion && (
              <section className="relative isolate min-h-[min(82dvh,980px)] overflow-hidden rounded-[30px] border-4 border-sky-300 bg-gradient-to-b from-[#67c8ff] via-[#c9efff] to-[#dff6bd] p-4 shadow-2xl sm:p-7" aria-live="polite">
                <div aria-hidden="true" className="pointer-events-none absolute -left-12 top-28 h-40 w-[58%] rounded-[50%] bg-gradient-to-b from-[#9de77a] to-[#63bd62] opacity-85" />
                <div aria-hidden="true" className="pointer-events-none absolute -right-16 top-24 h-48 w-[55%] rounded-[50%] bg-gradient-to-b from-[#b1ef83] to-[#59b66b] opacity-85" />
                <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#60b95e] to-transparent" />

                <div className="relative mx-auto max-w-6xl">
                  <header className="mb-5 flex flex-col items-center justify-between gap-3 rounded-3xl border-2 border-white/80 bg-white/90 p-4 text-center shadow-lg backdrop-blur sm:flex-row sm:text-left">
                    <div className="flex items-center gap-3">
                      <RacePetPicture name={currentPlayer.petName} color={currentPlayer.color} background={currentPlayer.bgLight} className="h-16 w-24 shrink-0 sm:h-20 sm:w-28" />
                      <div>
                        <span className="text-xs font-black uppercase tracking-[.16em] text-emerald-700">Correct answer!</span>
                        <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-black text-[#002f76] sm:text-4xl">{currentPlayer.name}&apos;s pet is racing!</h2>
                        <p className="text-sm font-bold text-slate-600">{raceMotion.toCount >= roundsPerPlayer ? (raceAnimationDone ? "You crossed the finish line! You are a winner!" : "Your pet is racing toward the finish!") : "Watch your pet race closer to the finish."}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-3 text-center shadow-sm">
                      <span className="block text-xs font-black uppercase tracking-wide text-amber-800">Race progress</span>
                      <span className="font-[family-name:var(--font-fredoka)] text-2xl font-black text-amber-950">{raceMotion.toCount} of {roundsPerPlayer}</span>
                    </div>
                  </header>

                  <div className="relative rounded-[28px] border-4 border-white/90 bg-white/55 p-3 shadow-[0_18px_38px_rgba(31,94,116,.2)] backdrop-blur-sm sm:p-5">
                    <div className="mb-3 flex items-end justify-between px-2">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-950">Start</span>
                      <span className="rounded-xl border-2 border-amber-400 bg-white px-4 py-2 text-sm font-black uppercase tracking-widest text-[#002f76] shadow-md">Finish</span>
                    </div>

                    <div className="space-y-3">
                      {players.map((player, index) => {
                        const isMoving = index === raceMotion.playerIndex && raceAnimationStarted;
                        const count = index === raceMotion.playerIndex
                          ? (raceAnimationStarted ? raceMotion.toCount : raceMotion.fromCount)
                          : player.correctCount;
                        const progress = Math.min(100, (count / roundsPerPlayer) * 100);
                        const isFinisher = progress >= 100 && (index !== raceMotion.playerIndex || raceAnimationDone);
                        return (
                          <div key={`${player.studentId ?? player.name}-${index}`} className={`relative rounded-2xl border-2 p-2.5 shadow-sm sm:p-3 ${index === raceMotion.playerIndex ? "border-amber-400 bg-amber-50/95 ring-2 ring-amber-200" : "border-white bg-white/85"}`}>
                            <div className="mb-1 flex items-center justify-between gap-2 px-1">
                              <span className="truncate text-sm font-black" style={{ color: player.color }}>{player.name}</span>
                              <span className={`shrink-0 text-xs font-black ${isFinisher ? "text-emerald-700" : "text-slate-500"}`}>{isFinisher ? "FINISHED — WINNER" : `${count} of ${roundsPerPlayer}`}</span>
                            </div>
                            <div className="relative h-[82px] overflow-hidden rounded-full border-2 border-[#a96e39] shadow-inner sm:h-[92px]" style={{ backgroundImage: "repeating-linear-gradient(180deg, #d8a66b 0 23px, #c88e55 23px 46px)" }}>
                              <div aria-hidden="true" className="absolute inset-x-0 top-1/2 border-t-[3px] border-dashed border-white/90" />
                              <div aria-hidden="true" className="absolute bottom-0 left-[5%] top-0 border-l-2 border-dashed border-white/70" />
                              <div aria-hidden="true" className="absolute bottom-0 right-[10%] top-0 w-3 border-x border-slate-600" style={{ backgroundImage: "repeating-conic-gradient(#fff 0 25%, #26364a 0 50%)", backgroundSize: "12px 12px" }} />
                              <div aria-hidden="true" className="absolute left-2 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-300 to-emerald-400 transition-[width] duration-[2600ms] ease-out" style={{ width: `calc(5% + ${Math.max(progress * 0.85, 0)}%)` }} />
                              <div
                                className="race-lane-runner absolute top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2"
                                style={{ left: `calc(5% + ${progress * 0.85}%)` }}
                              >
                                <div className={isMoving ? "pet-race-bounce drop-shadow-xl" : "drop-shadow-md"}>
                                  <RacePetPicture name={player.petName} color={player.color} background={player.bgLight} className="h-[68px] w-[96px] sm:h-[76px] sm:w-[108px]" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <footer className="relative mt-5 flex flex-col items-center gap-3 rounded-3xl border-2 border-white/80 bg-white/90 p-4 text-center shadow-lg sm:flex-row sm:justify-between sm:text-left">
                    <p className="text-sm font-bold text-slate-700">Every racer can win by reaching the finish line. The next turn starts when you are ready.</p>
                    {raceAnimationDone ? (
                      <button type="button" onClick={(event) => { event.stopPropagation(); continueAfterRace(); }} className="min-h-14 w-full touch-manipulation rounded-2xl border-b-4 border-emerald-800 bg-emerald-600 px-8 py-3 text-lg font-black text-white shadow-lg transition hover:bg-emerald-700 active:translate-y-1 active:border-b-0 sm:w-auto">
                        {raceMotion.toCount >= roundsPerPlayer ? "Winner! Next racer" : "Next racer →"}
                      </button>
                    ) : (
                      <span className="inline-flex min-h-12 items-center rounded-2xl bg-sky-100 px-5 text-sm font-black text-sky-900">Watch the race…</span>
                    )}
                  </footer>
                </div>
              </section>
            )}

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* PHASE 2: PLAYING ACTIVE GAME                                    */}
            {/* ─────────────────────────────────────────────────────────────── */}
            {phase === "playing" && (
              <div className={isFullscreen
                ? "mx-auto grid min-h-[calc(100dvh-8rem)] w-full max-w-5xl grid-cols-1 content-start items-center gap-3 lg:content-center"
                : "w-full space-y-4"}>
                {/* Round & Exit Header */}
                <div className={`flex items-center justify-between rounded-2xl border-3 border-sky-300 bg-white/95 p-3 shadow-md backdrop-blur-md sm:p-4 ${isFullscreen ? "lg:col-span-full" : ""}`}>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="px-3.5 py-1 bg-amber-400 text-amber-950 text-xs sm:text-sm font-black rounded-full uppercase tracking-wider shadow-xs">
                      Race step {currentPlayer.correctCount + 1} of {roundsPerPlayer}
                    </span>
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-900">
                      {gameMode === "pictures" ? "Picture Match" : "Body Map"}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-600 font-bold hidden sm:inline">
                      Turn {currentPlayerIdx + 1} of {players.length}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("End this game and return to player setup?")) {
                        setPhase("setup");
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    ✕ End Game
                  </button>
                </div>

                {/* Scoreboard Strip with Jumper Avatars */}
                <div className="flex w-full flex-wrap justify-center gap-3">
                  {players.map((p, idx) => {
                    const isCurrent = idx === currentPlayerIdx;
                    return (
                      <div
                        key={idx}
                        className={`relative w-[calc(50%-0.375rem)] max-w-52 p-2.5 text-center sm:w-[calc(33.333%-0.5rem)] sm:p-3 lg:w-[calc(16.666%-0.625rem)] rounded-2xl border-3 transition-all ${
                          isCurrent
                            ? "ring-4 ring-amber-400 shadow-xl scale-105 bg-white"
                            : "opacity-85 bg-white/80"
                        }`}
                        style={{
                          borderColor: isCurrent ? "#f59e0b" : p.borderColor,
                        }}
                      >
                        {isCurrent && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full tracking-wider uppercase shadow-md animate-pulse">
                            ACTIVE
                          </span>
                        )}
                        <RacePetPicture name={p.petName} color={p.color} background={p.bgLight} className="mx-auto mt-1 h-12 w-20" />
                        <p className="text-xs sm:text-sm font-black truncate mt-1" style={{ color: p.color }}>
                          {p.name}
                        </p>
                        <p className="text-xs font-black text-amber-600 flex items-center justify-center gap-1">
                          <span>⭐</span>
                          <span>{p.score}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Turn Announcement Banner (Wooden explorer style) */}
                <div
                  className={`relative mx-auto flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border-4 bg-white/95 p-4 text-center shadow-xl backdrop-blur-md transition-all sm:p-6 ${isFullscreen ? "max-w-2xl" : ""}`}
                  style={{
                    borderColor: currentPlayer.borderColor,
                  }}
                >
                  <div className="flex w-full flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3 lg:flex-col lg:gap-2">
                    <RacePetPicture name={currentPlayer.petName} color={currentPlayer.color} background={currentPlayer.bgLight} className="h-12 w-16 shrink-0 sm:h-14 sm:w-20" />
                    <h2
                      className="text-xl leading-tight sm:text-2xl font-[family-name:var(--font-fredoka)] font-black [overflow-wrap:anywhere]"
                      style={{ color: currentPlayer.color }}
                    >
                      It&apos;s {currentPlayer.name}&apos;s Turn!
                    </h2>
                    {currentPlayer.streak >= 2 && (
                      <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950 shadow-sm animate-pulse">
                        🔥 {currentPlayer.streak} IN A ROW!
                      </span>
                    )}
                  </div>

                  {/* Audio Replay Button */}
                  <div className="flex w-full items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        GameAudio.speakText(currentPrompt.name, true);
                      }}
                      className="inline-flex min-h-12 w-full max-w-64 touch-manipulation items-center justify-center gap-2 rounded-2xl border-2 border-amber-300 bg-amber-100 px-5 py-3 text-sm font-black text-amber-900 shadow-sm transition-[background-color,transform,box-shadow] hover:bg-amber-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 active:scale-[.98]"
                    >
                      <span aria-hidden="true" className="text-lg leading-none">🔊</span>
                      <span>Listen Again</span>
                    </button>

                  </div>

                  {/* Feedback Notification (Bouncy celebration or gentle guidance) */}
                  {feedback.status !== "idle" && (
                    <div
                      className={`mt-3 py-2.5 px-5 rounded-2xl text-sm sm:text-base font-black inline-block shadow-md animate-bounce ${
                        feedback.status === "correct"
                          ? "bg-emerald-500 text-white border-2 border-emerald-600"
                          : "bg-amber-400 text-amber-950 border-2 border-amber-500"
                      }`}
                    >
                      <p>{feedback.message}</p>
                      {feedback.subMessage && (
                        <p className="text-xs font-bold opacity-90">{feedback.subMessage}</p>
                      )}
                    </div>
                  )}
                </div>

                  {/* Picture Match uses picture cards only; Body Map uses the explorer only. */}
                <div className="grid w-full grid-cols-1 items-center gap-4 lg:gap-5">
                  {/* Left / Center: The Explorer Cartoon (With generous clickable body zones) */}
                  {gameMode === "explorer" && <div className={`mx-auto flex w-full flex-col items-center rounded-3xl border-4 border-emerald-400 bg-white/95 shadow-xl ${isFullscreen ? "max-w-3xl p-2 sm:p-3" : "max-w-4xl p-4 sm:p-6"}`}>
                    <ExplorerCharacter
                      onSelectPart={handleAnswer}
                      disabled={feedback.status === "correct"}
                      compact={isFullscreen}
                    />
                  </div>
                  }

                  {/* Right: Giant Pictorial Cards (Easy for Young Kids or Misclicks) */}
                  {gameMode === "pictures" && <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
                    <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 border-4 border-sky-400 shadow-xl">
                      <div className="grid grid-cols-2 gap-3">
                        {choiceOptions.map((choice) => {
                          return (
                            <button
                              key={choice.id}
                              aria-label={`Choose the ${choice.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnswer(choice.id);
                              }}
                              disabled={feedback.status === "correct"}
                              className="flex min-h-52 touch-manipulation flex-col items-center justify-center rounded-3xl border-3 border-slate-300 bg-gradient-to-b from-white to-slate-50 p-4 shadow-md transition-[transform,border-color,box-shadow] hover:-translate-y-1 hover:border-sky-500 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 active:scale-[.98] sm:min-h-64"
                            >
                              <BodyPartAnswerPicture
                                part={choice.id}
                                className="h-36 w-44 sm:h-44 sm:w-56"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>}
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* PHASE 3: GAME OVER & TROPHY PODIUM                              */}
            {/* ─────────────────────────────────────────────────────────────── */}
            {phase === "game_over" && (
              <div className="w-full space-y-6">
                {/* Podium Stage Card */}
                <div className="rounded-3xl bg-white/95 backdrop-blur-md p-6 sm:p-8 border-4 border-amber-400 shadow-2xl text-center relative overflow-hidden">
                  <h2 className="text-2xl sm:text-4xl font-[family-name:var(--font-fredoka)] font-black text-[#002f76] tracking-tight">
                    {allPlayersFinished ? "Everyone crossed the finish line!" : finishLineWinners.length > 0 ? "Finish-line winners!" : "Race results"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 font-bold">
                    {finishLineWinners.length === 0
                      ? "No finish-line winners yet. Keep racing until every pet reaches the line!"
                      : `${finishLineWinners.length} of ${players.length} racers crossed the finish. Every racer who reaches the line is a winner.`}
                  </p>

                  {/* 1st, 2nd, 3rd Podium */}
                  {finishLineWinners.length === 0 ? (
                    <div className="mt-8 rounded-2xl bg-sky-50 p-6 text-center text-lg font-black text-sky-900">The race only ends when every pet crosses the finish line.</div>
                  ) : (() => {
                    const sorted = [...finishLineWinners].sort((a, b) => b.score - a.score);
                    const first = sorted[0];
                    const second = sorted[1];
                    const third = sorted[2];

                    return (
                      <div className="mt-8 flex items-end justify-center gap-3 sm:gap-6 max-w-lg mx-auto">
                        {/* 2nd Place */}
                        {second && (
                          <div className="flex-1 flex flex-col items-center">
                            <RacePetPicture name={second.petName} color={second.color} background={second.bgLight} className="mb-1 h-14 w-20" />
                            <p className="text-xs sm:text-sm font-black truncate max-w-[95px] text-slate-800">
                              {second.name}
                            </p>
                            <span className="text-xs font-black text-amber-600">
                              {second.score} pts
                            </span>
                            <div className="w-full h-24 sm:h-28 bg-gradient-to-t from-slate-300 to-slate-200 rounded-t-2xl mt-2 flex flex-col items-center justify-center border-t-4 border-slate-400 shadow-inner">
                              <span className="text-3xl">🥈</span>
                              <span className="text-xs font-black uppercase text-slate-700">2nd</span>
                            </div>
                          </div>
                        )}

                        {/* 1st Place Champion */}
                        {first && (
                          <div className="flex-1 flex flex-col items-center -mt-6">
                            <RacePetPicture name={first.petName} color={first.color} background={first.bgLight} className="mb-1 h-16 w-24" />
                            <p className="text-sm sm:text-base font-black truncate max-w-[120px] text-amber-700">
                              {first.name}
                            </p>
                            <span className="text-sm font-black text-amber-600">
                              {first.score} pts
                            </span>
                            <div className="w-full h-32 sm:h-38 bg-gradient-to-t from-amber-400 via-amber-300 to-yellow-200 rounded-t-2xl mt-2 flex flex-col items-center justify-center border-t-4 border-amber-500 shadow-md">
                              <span className="text-4xl animate-pulse">🥇</span>
                              <span className="text-xs sm:text-sm font-black uppercase text-amber-950">
                                Champion
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 3rd Place */}
                        {third && (
                          <div className="flex-1 flex flex-col items-center">
                            <RacePetPicture name={third.petName} color={third.color} background={third.bgLight} className="mb-1 h-14 w-20" />
                            <p className="text-xs sm:text-sm font-black truncate max-w-[95px] text-slate-800">
                              {third.name}
                            </p>
                            <span className="text-xs font-black text-amber-600">
                              {third.score} pts
                            </span>
                            <div className="w-full h-20 sm:h-24 bg-gradient-to-t from-amber-200 to-amber-100 rounded-t-2xl mt-2 flex flex-col items-center justify-center border-t-4 border-amber-600 shadow-inner">
                              <span className="text-3xl">🥉</span>
                              <span className="text-xs font-black uppercase text-amber-900">3rd</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Scorecard List */}
                <div className="rounded-3xl bg-white/95 backdrop-blur-md p-5 sm:p-6 border-4 border-emerald-300 shadow-xl">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-3">
                    🎖️ All Explorers Scorecard
                  </h3>
                  <div className="divide-y divide-slate-100">
                    {[...players]
                      .sort((a, b) => b.score - a.score)
                      .map((p, idx) => (
                        <div key={idx} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-6 text-sm font-black text-slate-400">
                              #{idx + 1}
                            </span>
                            <RacePetPicture name={p.petName} color={p.color} background={p.bgLight} className="h-12 w-16" />
                            <div>
                              <p className="text-sm font-black text-slate-900">{p.name}</p>
                              <p className="text-[11px] text-slate-500 font-medium">
                                {p.correctCount} correct • Best streak: {p.maxStreak} 🔥
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-black text-amber-600 flex items-center gap-1 justify-end">
                              <span>⭐</span> {p.score} pts
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {p.correctCount >= roundsPerPlayer ? "Finish-line winner" : "Super Explorer"}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Save & Play Again Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-5 rounded-3xl border-4 border-sky-300 shadow-xl">
                  <div className="flex items-center gap-2">
                    {saveSuccess ? (
                      <span className="text-xs font-black text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200">
                        <span>✅</span> Saved to MongoDB Database!
                      </span>
                    ) : isSaving ? (
                      <span className="text-xs font-black text-sky-700 animate-pulse">
                        Saving scores to MongoDB...
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          autoSaveSession();
                        }}
                        className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-xl text-xs font-bold transition-all"
                      >
                        💾 Re-save to MongoDB
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhase("setup");
                      }}
                      className="flex-1 sm:flex-none px-6 py-3 bg-[#002f76] hover:bg-[#00245a] text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg transition-all"
                    >
                      🔄 Play Again
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.print();
                      }}
                      className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-2xl transition-all"
                    >
                      🖨️ Print
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: ACTIVITY SCORES & HISTORY (MONGODB)                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && mode === "admin" && (
        <div className="w-full space-y-6">
          <section className="rounded-3xl border border-sky-100 bg-gradient-to-br from-white to-sky-50 p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-[#002f76]">Activity Analytics</h2>
                <p className="text-xs font-medium text-slate-500">Score trends from the latest 30 recorded sessions</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm">Sessions tracked: <span className="text-[#002f76]">{historySessions.length}</span></div>
            </div>
            {leaderboard.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-sky-200 bg-white/70 p-8 text-center text-sm font-semibold text-slate-400">The chart will appear after the first game is recorded.</div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-sky-100 bg-white p-4 sm:p-5" role="img" aria-label="Bar chart of top explorers by stars">
                <h3 className="mb-2 text-sm font-black text-slate-700">Top Explorers by Stars</h3>
                {leaderboard.slice(0, 8).map((entry, index) => {
                  const highest = Math.max(...leaderboard.map((player) => player.totalStars), 1);
                  return <div key={`${entry.name}-${index}`} className="grid grid-cols-[minmax(86px,140px)_1fr_48px] items-center gap-3 text-xs">
                    <span className="truncate font-bold text-slate-600">{entry.avatar} {entry.name}</span>
                    <div className="h-4 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all" style={{ width: `${Math.max(4, (entry.totalStars / highest) * 100)}%` }} /></div>
                    <span className="text-right font-black text-amber-600">{entry.totalStars} ⭐</span>
                  </div>;
                })}
              </div>
            )}
          </section>

          {/* Leaderboard Cards */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 mb-4">
              <span>🌟</span> Trailblazer All-Time Star Leaderboard
            </h2>

            {isLoadingHistory ? (
              <div className="py-8 text-center text-sm text-slate-400 animate-pulse font-bold">
                Loading activity scores from MongoDB...
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400 font-medium">
                No game scores recorded yet. Play a game to record stars!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {leaderboard.map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-sm font-black text-slate-400">#{idx + 1}</span>
                      <span className="text-3xl">{entry.avatar}</span>
                      <div>
                        <p className="text-sm font-black text-slate-900">{entry.name}</p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {entry.gamesPlayed} {entry.gamesPlayed === 1 ? "game" : "games"} • {entry.wins} wins
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-amber-600 flex items-center gap-1 justify-end">
                        <span>⭐</span> {entry.totalStars}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Sessions List */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>📋</span> Recorded Game Sessions ({historySessions.length})
              </h2>
              <button
                onClick={fetchHistory}
                className="text-xs font-black text-blue-600 hover:text-blue-800"
              >
                ↻ Refresh
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="py-8 text-center text-sm text-slate-400 animate-pulse font-bold">
                Loading history...
              </div>
            ) : historySessions.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400 font-medium">
                No past activity records found in MongoDB.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {historySessions.map((session) => (
                  <div
                    key={session.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">
                          {session.gameTitle}
                        </span>
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {session.playersCount} players • {session.roundsTotal} rounds
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-semibold">
                        Winner:{" "}
                        <span className="font-black text-slate-800">
                          {session.winner?.avatar} {session.winner?.name}
                        </span>{" "}
                        ({session.winner?.score} pts)
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Played on{" "}
                        {new Date(session.playedAt).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {session.players.slice(0, 6).map((p, pIdx) => (
                          <span
                            key={pIdx}
                            title={`${p.name} (${p.score} pts)`}
                            className="inline-block w-8 h-8 rounded-full bg-white border border-slate-200 text-base flex items-center justify-center shadow-xs"
                          >
                            {p.avatar}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="text-xs font-bold text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-all"
                        title="Delete session record"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
