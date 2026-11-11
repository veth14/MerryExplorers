"use client";

import { useState } from "react";
import {
  GamePlayer,
  TrailblazerStudent,
  ChallengeMode,
  NumberDifficulty,
} from "../types";
import {
  DEFAULT_AVATARS,
  DIFFICULTY_RANGES,
  MODE_METADATA,
} from "../data";

type PlayerSetupModalProps = {
  roster: TrailblazerStudent[];
  isLoadingRoster: boolean;
  selectedPlayers: GamePlayer[];
  onPlayersChange: (players: GamePlayer[]) => void;
  roundsPerPlayer: number;
  onRoundsChange: (rounds: number) => void;
  difficulty: NumberDifficulty;
  onDifficultyChange: (diff: NumberDifficulty) => void;
  selectedModes: ChallengeMode[];
  onModesChange: (modes: ChallengeMode[]) => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  speechEnabled: boolean;
  onSpeechToggle: () => void;
  onStartGame: () => void;
};

export function PlayerSetupModal({
  roster,
  isLoadingRoster,
  selectedPlayers,
  onPlayersChange,
  roundsPerPlayer,
  onRoundsChange,
  difficulty,
  onDifficultyChange,
  selectedModes,
  onModesChange,
  soundEnabled,
  onSoundToggle,
  speechEnabled,
  onSpeechToggle,
  onStartGame,
}: PlayerSetupModalProps) {
  const [guestName, setGuestName] = useState("");
  const [editingAvatarIndex, setEditingAvatarIndex] = useState<number | null>(null);

  // Helper to add student from roster
  const handleAddFromRoster = (student: TrailblazerStudent) => {
    if (selectedPlayers.length >= 6) return;
    if (selectedPlayers.some((p) => p.studentId === student.id)) return;

    const avatar = DEFAULT_AVATARS[selectedPlayers.length % DEFAULT_AVATARS.length];
    const newPlayer: GamePlayer = {
      studentId: student.id,
      name: student.nickname || student.firstName,
      avatar: avatar.emoji,
      petName: avatar.name,
      color: avatar.color,
      bgLight: avatar.bgLight,
      borderColor: avatar.borderColor,
      score: 0,
      correctCount: 0,
      mistakesCount: 0,
      streak: 0,
      maxStreak: 0,
    };
    onPlayersChange([...selectedPlayers, newPlayer]);
  };

  // Helper to add custom guest
  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guestName.trim();
    if (!trimmed || selectedPlayers.length >= 6) return;

    const avatar = DEFAULT_AVATARS[selectedPlayers.length % DEFAULT_AVATARS.length];
    const newPlayer: GamePlayer = {
      studentId: null,
      name: trimmed,
      avatar: avatar.emoji,
      petName: avatar.name,
      color: avatar.color,
      bgLight: avatar.bgLight,
      borderColor: avatar.borderColor,
      score: 0,
      correctCount: 0,
      mistakesCount: 0,
      streak: 0,
      maxStreak: 0,
    };
    onPlayersChange([...selectedPlayers, newPlayer]);
    setGuestName("");
  };

  const handleRemovePlayer = (idx: number) => {
    const next = [...selectedPlayers];
    next.splice(idx, 1);
    onPlayersChange(next);
  };

  const handleSelectAvatar = (playerIdx: number, avatarObj: (typeof DEFAULT_AVATARS)[0]) => {
    const next = [...selectedPlayers];
    next[playerIdx] = {
      ...next[playerIdx],
      avatar: avatarObj.emoji,
      petName: avatarObj.name,
      color: avatarObj.color,
      bgLight: avatarObj.bgLight,
      borderColor: avatarObj.borderColor,
    };
    onPlayersChange(next);
    setEditingAvatarIndex(null);
  };

  const handleToggleMode = (mode: ChallengeMode) => {
    if (selectedModes.includes(mode)) {
      if (selectedModes.length <= 1) return; // Keep at least one mode
      onModesChange(selectedModes.filter((m) => m !== mode));
    } else {
      onModesChange([...selectedModes, mode]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Game Banner Header */}
      <div className="rounded-[32px] border border-[#dbe4f1] bg-gradient-to-r from-[#002f76] to-[#0d47a1] p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Number Learning Game • Ages 2–6
            </span>
            <h1 className="mt-2 font-[family-name:var(--font-fredoka)] text-3xl sm:text-4xl font-black">
              Number Trail Setup
            </h1>
            <p className="mt-1 text-sm text-blue-100">
              Pick your little math explorers, adjust difficulty, and hit the trail!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSoundToggle}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                soundEnabled
                  ? "border-emerald-300 bg-emerald-400/20 text-emerald-100"
                  : "border-white/20 bg-white/10 text-white/60"
              }`}
            >
              {soundEnabled ? "🔊 Sound ON" : "🔇 Sound OFF"}
            </button>
            <button
              type="button"
              onClick={onSpeechToggle}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                speechEnabled
                  ? "border-emerald-300 bg-emerald-400/20 text-emerald-100"
                  : "border-white/20 bg-white/10 text-white/60"
              }`}
            >
              {speechEnabled ? "🗣️ Voice ON" : "💬 Voice OFF"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Player Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Players Panel */}
          <div className="rounded-3xl border border-[#dbe4f1] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-[#002f76]">
                  Active Explorers ({selectedPlayers.length}/6)
                </h2>
                <p className="text-xs text-[#64748b]">
                  Each explorer gets their own animal token on the trail
                </p>
              </div>
              {selectedPlayers.length === 0 && (
                <span className="text-xs font-bold text-amber-600">
                  Select at least 1 player
                </span>
              )}
            </div>

            {selectedPlayers.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#cbd5e1] p-6 text-center text-xs text-[#64748b]">
                No players added yet. Tap a student below or type a guest name!
              </div>
            ) : (
              <div className="space-y-2">
                {selectedPlayers.map((player, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-2.5 px-3"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar button to swap */}
                      <button
                        type="button"
                        onClick={() =>
                          setEditingAvatarIndex(editingAvatarIndex === idx ? null : idx)
                        }
                        title="Click to change animal"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border text-2xl shadow-sm transition hover:scale-110"
                        style={{
                          backgroundColor: player.bgLight,
                          borderColor: player.borderColor,
                        }}
                      >
                        {player.avatar}
                      </button>

                      <div>
                        <span className="block font-black text-[#1e293b] text-sm leading-tight">
                          {player.name}
                        </span>
                        <span className="text-[11px] font-semibold text-[#64748b]">
                          {player.petName}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePlayer(idx)}
                      className="text-xs font-bold text-red-500 hover:text-red-700 p-1"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Avatar Selector Drawer when clicked */}
            {editingAvatarIndex !== null && (
              <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-3">
                <span className="block text-xs font-black text-blue-900 mb-2">
                  Choose animal for {selectedPlayers[editingAvatarIndex]?.name}:
                </span>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_AVATARS.map((av) => (
                    <button
                      key={av.name}
                      type="button"
                      onClick={() => handleSelectAvatar(editingAvatarIndex, av)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border bg-white text-xl shadow-sm hover:scale-110 active:scale-95"
                      title={av.name}
                    >
                      {av.emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add Custom Guest Form */}
            <form onSubmit={handleAddGuest} className="mt-4 flex gap-2">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Add custom explorer name..."
                maxLength={25}
                className="flex-1 rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs text-[#1e293b] focus:border-[#3b82f6] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!guestName.trim() || selectedPlayers.length >= 6}
                className="rounded-xl bg-[#002f76] px-4 py-2 text-xs font-black text-white disabled:opacity-50 hover:bg-[#002358]"
              >
                + Add
              </button>
            </form>
          </div>

          {/* Trailblazer Class Roster */}
          <div className="rounded-3xl border border-[#dbe4f1] bg-white p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#002f76] mb-1">
              Class Roster Quick-Pick
            </h3>
            <p className="text-xs text-[#64748b] mb-3">
              Tap a child to add them directly to the trail
            </p>

            {isLoadingRoster ? (
              <p className="text-xs text-[#64748b]">Loading class roster...</p>
            ) : roster.length === 0 ? (
              <p className="text-xs text-[#64748b]">No roster students found.</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                {roster.map((student) => {
                  const isSelected = selectedPlayers.some(
                    (p) => p.studentId === student.id
                  );
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleAddFromRoster(student)}
                      disabled={isSelected || selectedPlayers.length >= 6}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                        isSelected
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 opacity-60"
                          : "border-[#e2e8f0] bg-white text-[#1e293b] hover:border-[#3b82f6] hover:bg-blue-50/50"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {student.nickname || student.firstName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Game Rules & Modes (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Difficulty Selection */}
          <div className="rounded-3xl border border-[#dbe4f1] bg-white p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#002f76] mb-3">
              Difficulty & Number Range
            </h3>
            <div className="space-y-2">
              {(["easy", "medium", "explorer"] as NumberDifficulty[]).map((diff) => {
                const config = DIFFICULTY_RANGES[diff];
                const isCurrent = difficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => onDifficultyChange(diff)}
                    className={`w-full text-left rounded-2xl border p-3 transition-all ${
                      isCurrent
                        ? "border-[#3b82f6] bg-blue-50/50 shadow-sm ring-2 ring-[#3b82f6]/20"
                        : "border-[#e2e8f0] bg-white hover:border-[#cbd5e1]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#1e293b]">
                        {config.label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-[#475569]">
                        {config.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#64748b]">
                      {config.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modes Included */}
          <div className="rounded-3xl border border-[#dbe4f1] bg-white p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#002f76] mb-3">
              Trail Challenges Included
            </h3>
            <div className="space-y-2">
              {(["recognition", "count_match", "sequence", "more_or_less"] as ChallengeMode[]).map(
                (mode) => {
                  const meta = MODE_METADATA[mode];
                  const isChecked = selectedModes.includes(mode);
                  return (
                    <label
                      key={mode}
                      className="flex items-center gap-3 rounded-2xl border border-[#e2e8f0] p-2.5 px-3 cursor-pointer hover:bg-slate-50 transition"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleMode(mode)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-lg">{meta.icon}</span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-black text-[#1e293b]">
                          {meta.title}
                        </span>
                        <span className="text-[10px] text-[#64748b]">
                          {meta.subtitle}
                        </span>
                      </div>
                    </label>
                  );
                }
              )}
            </div>
          </div>

          {/* Rounds / Race Length */}
          <div className="rounded-3xl border border-[#dbe4f1] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#002f76]">
                Trail Length (Steps to Win)
              </h3>
              <span className="text-xs font-black text-[#002f76]">
                {roundsPerPlayer} steps
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[3, 5, 8, 10].map((rounds) => (
                <button
                  key={rounds}
                  type="button"
                  onClick={() => onRoundsChange(rounds)}
                  className={`rounded-xl border py-2 text-xs font-black transition ${
                    roundsPerPlayer === rounds
                      ? "border-[#002f76] bg-[#002f76] text-white shadow-sm"
                      : "border-[#e2e8f0] bg-white text-[#475569] hover:border-[#cbd5e1]"
                  }`}
                >
                  {rounds}
                </button>
              ))}
            </div>
          </div>

          {/* Launch Button */}
          <button
            type="button"
            onClick={onStartGame}
            disabled={selectedPlayers.length === 0}
            className="w-full rounded-2xl bg-[#ffbf1f] p-4 text-center font-[family-name:var(--font-fredoka)] text-xl font-black text-[#173764] shadow-lg transition hover:bg-[#ffd04a] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚀 Start Number Trail!
          </button>
        </div>
      </div>
    </div>
  );
}

