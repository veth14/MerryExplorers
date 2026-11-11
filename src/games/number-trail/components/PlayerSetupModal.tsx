"use client";

import { useState } from "react";
import {
  GamePlayer,
  TrailblazerStudent,
  ChallengeMode,
  NumberDifficulty,
  ChoiceDisplayFormat,
} from "../types";
import {
  DEFAULT_AVATARS,
  DIFFICULTY_RANGES,
  MODE_METADATA,
} from "../data";
import {
  SpeakerIcon,
  MuteIcon,
  VoiceIcon,
  VoiceOffIcon,
  SparklesIcon,
  ArrowRightIcon,
  RecognitionModeIcon,
  CountMatchModeIcon,
  SequenceModeIcon,
  MoreLessModeIcon,
  AnimalAvatarBadge,
  CheckIcon,
} from "./GameIcons";

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
  cardFormat?: ChoiceDisplayFormat;
  onCardFormatChange?: (format: ChoiceDisplayFormat) => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  speechEnabled: boolean;
  onSpeechToggle: () => void;
  onStartGame: () => void;
};

function renderModeIcon(mode: ChallengeMode, className = "h-5 w-5") {
  switch (mode) {
    case "recognition":
      return <RecognitionModeIcon className={className} />;
    case "count_match":
      return <CountMatchModeIcon className={className} />;
    case "sequence":
      return <SequenceModeIcon className={className} />;
    case "more_or_less":
      return <MoreLessModeIcon className={className} />;
  }
}

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
  cardFormat = "words",
  onCardFormatChange,
  soundEnabled,
  onSoundToggle,
  speechEnabled,
  onSpeechToggle,
  onStartGame,
}: PlayerSetupModalProps) {
  const [guestName, setGuestName] = useState("");
  const [editingAvatarIndex, setEditingAvatarIndex] = useState<number | null>(null);

  const handleAddFromRoster = (student: TrailblazerStudent) => {
    if (selectedPlayers.length >= 6) return;
    if (selectedPlayers.some((p) => p.studentId === student.id)) return;

    const avatar = DEFAULT_AVATARS[selectedPlayers.length % DEFAULT_AVATARS.length];
    const newPlayer: GamePlayer = {
      studentId: student.id,
      name: student.nickname || student.firstName,
      avatar: avatar.id,
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

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guestName.trim();
    if (!trimmed || selectedPlayers.length >= 6) return;

    const avatar = DEFAULT_AVATARS[selectedPlayers.length % DEFAULT_AVATARS.length];
    const newPlayer: GamePlayer = {
      studentId: null,
      name: trimmed,
      avatar: avatar.id,
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
      avatar: avatarObj.id,
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
      if (selectedModes.length <= 1) return;
      onModesChange(selectedModes.filter((m) => m !== mode));
    } else {
      onModesChange([...selectedModes, mode]);
    }
  };

  return (
    <div className="w-full space-y-7">
      {/* ─── Hero Setup Banner (Full Width) ─── */}
      <div className="relative w-full overflow-hidden rounded-[32px] border border-[#dbe4f1] bg-gradient-to-r from-[#002f76] via-[#094895] to-[#125ba8] p-6 sm:p-9 text-white shadow-md">
        {/* Decorative background shapes */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute right-48 -bottom-24 h-64 w-64 rounded-full border border-white/5" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-emerald-200">
              <SparklesIcon className="h-3.5 w-3.5 text-emerald-300" />
              Preschool Math Exploration • Ages 2–6
            </span>
            <h1 className="mt-3 font-[family-name:var(--font-fredoka)] text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Number Trail Setup
            </h1>
            <p className="mt-2 text-sm text-blue-100 max-w-2xl leading-relaxed">
              Select your student explorers, calibrate difficulty ranges, and choose which counting challenges to include.
            </p>
          </div>

          {/* Quick Sound Toggles */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSoundToggle}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition shadow-xs ${
                soundEnabled
                  ? "border-emerald-300 bg-emerald-400/20 text-emerald-100"
                  : "border-white/20 bg-white/10 text-white/70"
              }`}
            >
              {soundEnabled ? (
                <>
                  <SpeakerIcon className="h-4 w-4 text-emerald-300" />
                  <span>Sound ON</span>
                </>
              ) : (
                <>
                  <MuteIcon className="h-4 w-4 text-white/70" />
                  <span>Sound OFF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onSpeechToggle}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition shadow-xs ${
                speechEnabled
                  ? "border-emerald-300 bg-emerald-400/20 text-emerald-100"
                  : "border-white/20 bg-white/10 text-white/70"
              }`}
            >
              {speechEnabled ? (
                <>
                  <VoiceIcon className="h-4 w-4 text-emerald-300" />
                  <span>Voice Narration ON</span>
                </>
              ) : (
                <>
                  <VoiceOffIcon className="h-4 w-4 text-white/70" />
                  <span>Voice Silent</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Responsive Configuration Grid (Full Width) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* ── LEFT COLUMN (6 cols): Players & Roster ── */}
        <div className="lg:col-span-6 space-y-6">
          {/* Active Lineup Card */}
          <div className="rounded-[28px] border border-[#dbe4f1] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-[#002f76]">
                  Active Explorers ({selectedPlayers.length}/6)
                </h2>
                <p className="text-xs text-[#64748b]">
                  Tap any character icon to switch their animal mascot
                </p>
              </div>
              {selectedPlayers.length === 0 && (
                <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-700">
                  Select at least 1 explorer
                </span>
              )}
            </div>

            {selectedPlayers.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#cbd5e1] p-8 text-center text-xs font-bold text-[#64748b] bg-slate-50/50">
                No explorers added yet. Choose a student from the class roster below or enter a guest name!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedPlayers.map((player, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingAvatarIndex(editingAvatarIndex === idx ? null : idx)
                        }
                        title="Click to change animal avatar"
                        className="transition hover:scale-105 active:scale-95"
                      >
                        <AnimalAvatarBadge
                          name={player.petName || player.name}
                          color={player.color}
                          bgLight={player.bgLight}
                          borderColor={player.borderColor}
                          className="h-11 w-11"
                        />
                      </button>

                      <div className="min-w-0">
                        <span className="block truncate font-black text-[#1e293b] text-sm leading-tight">
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
                      className="ml-2 text-xs font-bold text-slate-400 hover:text-red-600 p-1 transition"
                      aria-label={`Remove ${player.name}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Avatar Selector Drawer when clicked */}
            {editingAvatarIndex !== null && (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
                <span className="block text-xs font-black text-blue-900 mb-2">
                  Choose animal mascot for {selectedPlayers[editingAvatarIndex]?.name}:
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {DEFAULT_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => handleSelectAvatar(editingAvatarIndex, av)}
                      className="flex flex-col items-center justify-center p-1 rounded-xl hover:bg-white transition"
                      title={av.name}
                    >
                      <AnimalAvatarBadge
                        name={av.name}
                        color={av.color}
                        bgLight={av.bgLight}
                        borderColor={av.borderColor}
                        className="h-10 w-10"
                      />
                      <span className="mt-1 text-[10px] font-bold text-blue-900 truncate max-w-full">
                        {av.name.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add Custom Guest Form */}
            <form onSubmit={handleAddGuest} className="mt-4 flex gap-2 pt-3 border-t border-slate-100">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter child name (e.g. Maya)..."
                maxLength={25}
                className="flex-1 rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-xs font-bold text-[#1e293b] focus:border-[#3b82f6] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20"
              />
              <button
                type="submit"
                disabled={!guestName.trim() || selectedPlayers.length >= 6}
                className="rounded-xl bg-[#002f76] px-5 py-2.5 text-xs font-black text-white disabled:opacity-40 hover:bg-[#002358] active:scale-95 transition"
              >
                + Add Child
              </button>
            </form>
          </div>

          {/* Class Roster Quick-Pick Card */}
          <div className="rounded-[28px] border border-[#dbe4f1] bg-white p-6 shadow-xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#002f76] mb-1">
              Class Roster Quick-Pick
            </h3>
            <p className="text-xs text-[#64748b] mb-4">
              Tap any enrolled student to add them directly into the adventure
            </p>

            {isLoadingRoster ? (
              <p className="text-xs text-[#64748b]">Loading Trailblazer class roster...</p>
            ) : roster.length === 0 ? (
              <p className="text-xs text-[#64748b]">No roster students found.</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-1">
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
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                        isSelected
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 opacity-60 cursor-default"
                          : "border-[#e2e8f0] bg-white text-[#1e293b] hover:border-[#3b82f6] hover:bg-blue-50/50 active:scale-95 shadow-2xs"
                      }`}
                    >
                      {isSelected ? (
                        <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <span className="text-blue-600 font-black">+</span>
                      )}
                      <span>{student.nickname || student.firstName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN (6 cols): Settings, Modes & Launch ── */}
        <div className="lg:col-span-6 space-y-6">
          {/* Difficulty & Number Range */}
          <div className="rounded-[28px] border border-[#dbe4f1] bg-white p-6 shadow-xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#002f76] mb-3">
              Difficulty & Number Range
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["easy", "medium", "explorer"] as NumberDifficulty[]).map((diff) => {
                const config = DIFFICULTY_RANGES[diff];
                const isCurrent = difficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => onDifficultyChange(diff)}
                    className={`text-left rounded-2xl border-2 p-3.5 transition-all flex flex-col justify-between ${
                      isCurrent
                        ? "border-[#3b82f6] bg-blue-50/60 shadow-xs ring-2 ring-[#3b82f6]/20"
                        : "border-[#e2e8f0] bg-white hover:border-[#cbd5e1]"
                    }`}
                  >
                    <div>
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-[#475569] mb-1.5">
                        {config.badge}
                      </span>
                      <span className="block text-xs font-black text-[#1e293b] leading-tight">
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-[#64748b] leading-normal">
                      {config.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card Display Format: Words vs Digits */}
          {onCardFormatChange && (
            <div className="rounded-[28px] border border-[#dbe4f1] bg-white p-5 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#002f76] mb-1">
                Answer Card Display Style
              </h3>
              <p className="text-[11px] text-[#64748b] mb-3">
                Choose how answer cards present numbers to reinforce memorization
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onCardFormatChange("words")}
                  className={`text-left rounded-2xl border-2 p-3 transition ${
                    cardFormat === "words"
                      ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-400/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs text-[#1e293b]">Number Words</span>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5">
                      Recommended
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 font-[family-name:var(--font-fredoka)]">
                    <span>ONE</span> • <span>TWO</span> • <span>TEN</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#64748b]">
                    Helps students memorize word spelling and connect words with quantities.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onCardFormatChange("digits")}
                  className={`text-left rounded-2xl border-2 p-3 transition ${
                    cardFormat === "digits"
                      ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-400/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs text-[#1e293b]">Numerals</span>
                    <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5">
                      Beginner
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-black text-blue-700 font-[family-name:var(--font-fredoka)]">
                    <span>1</span> • <span>2</span> • <span>10</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#64748b]">
                    Basic numeral digits for younger learners just starting math.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Trail Challenges Included */}
          <div className="rounded-[28px] border border-[#dbe4f1] bg-white p-6 shadow-xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#002f76] mb-3">
              Trail Challenges Included
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["recognition", "count_match", "sequence", "more_or_less"] as ChallengeMode[]).map(
                (mode) => {
                  const meta = MODE_METADATA[mode];
                  const isChecked = selectedModes.includes(mode);
                  return (
                    <label
                      key={mode}
                      className={`flex items-start gap-3 rounded-2xl border-2 p-3 cursor-pointer transition ${
                        isChecked
                          ? "border-[#3b82f6]/60 bg-blue-50/30"
                          : "border-[#e2e8f0] bg-white hover:bg-slate-50 opacity-70"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleMode(mode)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {renderModeIcon(mode, "h-4 w-4")}
                          <span className="block text-xs font-black text-[#1e293b]">
                            {meta.title}
                          </span>
                        </div>
                        <span className="block text-[11px] text-[#64748b] leading-tight">
                          {meta.subtitle}
                        </span>
                      </div>
                    </label>
                  );
                }
              )}
            </div>
          </div>

          {/* Trail Length (Steps to Win) */}
          <div className="rounded-[28px] border border-[#dbe4f1] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#002f76]">
                Trail Length (Steps to Win)
              </h3>
              <span className="text-xs font-black text-[#002f76]">
                {roundsPerPlayer} Steps
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {[3, 5, 8, 10].map((rounds) => (
                <button
                  key={rounds}
                  type="button"
                  onClick={() => onRoundsChange(rounds)}
                  className={`rounded-xl border-2 py-2.5 text-xs font-black transition ${
                    roundsPerPlayer === rounds
                      ? "border-[#002f76] bg-[#002f76] text-white shadow-sm"
                      : "border-[#e2e8f0] bg-white text-[#475569] hover:border-[#cbd5e1]"
                  }`}
                >
                  {rounds} Steps
                </button>
              ))}
            </div>
          </div>

          {/* Launch Button (Full Width) */}
          <button
            type="button"
            onClick={onStartGame}
            disabled={selectedPlayers.length === 0}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-[#ffbf1f] p-4.5 text-center font-[family-name:var(--font-fredoka)] text-xl font-black text-[#173764] shadow-md transition hover:bg-[#ffd04a] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Start Number Trail Adventure</span>
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
