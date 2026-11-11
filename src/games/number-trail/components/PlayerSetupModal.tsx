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
  soundEnabled: boolean;
  onSoundToggle: () => void;
  speechEnabled: boolean;
  onSpeechToggle: () => void;
  onStartGame: () => void;
  isFullscreen?: boolean;
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

const rosterChipColors = [
  "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100",
  "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
  "border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100",
  "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
  "border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100",
  "border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100",
];

const difficultyCardColors: Record<NumberDifficulty, { idle: string; selected: string; icon: string }> = {
  easy: {
    idle: "border-amber-200 bg-[#fffaf0] hover:border-amber-300 hover:bg-amber-50",
    selected: "border-amber-400 bg-amber-100 ring-4 ring-amber-200/70 shadow-md",
    icon: "🌱",
  },
  medium: {
    idle: "border-sky-200 bg-[#f2faff] hover:border-sky-300 hover:bg-sky-50",
    selected: "border-sky-400 bg-sky-100 ring-4 ring-sky-200/70 shadow-md",
    icon: "🧭",
  },
  explorer: {
    idle: "border-violet-200 bg-[#faf7ff] hover:border-violet-300 hover:bg-violet-50",
    selected: "border-violet-400 bg-violet-100 ring-4 ring-violet-200/70 shadow-md",
    icon: "🏆",
  },
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
  isFullscreen = false,
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
    <div className={`w-full ${isFullscreen ? "flex h-full min-h-0 flex-col gap-3" : "space-y-5 sm:space-y-6"}`}>
      {/* ─── Hero Setup Banner (Full Width) ─── */}
      <div className={`relative w-full overflow-hidden border-[3px] border-white bg-gradient-to-br from-[#63c8ee] via-[#a0e6dd] to-[#d5edb1] text-[#164b73] shadow-[0_12px_30px_rgba(13,94,163,0.2)] ${isFullscreen ? "shrink-0 rounded-[26px] p-3 sm:p-4" : "rounded-[32px] p-6 sm:p-8 lg:p-9"}`}>
        {/* Decorative background shapes */}
        <div className="pointer-events-none absolute -right-8 -top-10 select-none text-7xl opacity-25 sm:right-10 sm:top-4 sm:text-8xl">☀️</div>
        <div className="pointer-events-none absolute bottom-3 right-[34%] select-none text-3xl opacity-50">✨</div>
        <div className="pointer-events-none absolute -bottom-24 right-48 h-64 w-64 rounded-full border-2 border-white/20" />

        <div className={`relative flex flex-col justify-between lg:flex-row lg:items-center ${isFullscreen ? "gap-2 sm:gap-3" : "gap-5"}`}>
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-white/70 bg-white/90 px-4 py-1.5 text-[11px] font-black tracking-wide text-[#12608e] shadow-sm sm:text-xs">
              <SparklesIcon className="h-4 w-4 text-[#ff9e27]" />
              Trailblazer Playgroup · Ages 2–6
            </span>
            <h1 className={`max-w-3xl font-[family-name:var(--font-fredoka)] font-black leading-[1.08] tracking-tight ${isFullscreen ? "mt-2 text-2xl sm:text-3xl lg:text-4xl" : "mt-4 text-3xl sm:text-4xl lg:text-5xl"}`}>
              Ready for a Number Adventure?
            </h1>
            <p className={`max-w-2xl text-sm font-semibold leading-relaxed text-[#205b7a] ${isFullscreen ? "mt-1" : "mt-3 sm:text-base"}`}>
              Pick your Trailblazer friends, choose a number trail, and play together!
            </p>
          </div>

          {/* Quick Sound Toggles */}
          {!isFullscreen && <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSoundToggle}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition shadow-xs ${
                soundEnabled
                ? "border-white bg-white text-[#087c83]"
                  : "border-white/80 bg-white/70 text-[#2c6174]"
              }`}
            >
              {soundEnabled ? (
                <>
                  <SpeakerIcon className="h-4 w-4 text-emerald-600" />
                  <span>Sound ON</span>
                </>
              ) : (
                <>
                  <MuteIcon className="h-4 w-4 text-slate-500" />
                  <span>Sound OFF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onSpeechToggle}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition shadow-xs ${
                speechEnabled
                ? "border-white bg-white text-[#087c83]"
                  : "border-white/80 bg-white/70 text-[#2c6174]"
              }`}
            >
              {speechEnabled ? (
                <>
                  <VoiceIcon className="h-4 w-4 text-emerald-600" />
                  <span>Voice Narration ON</span>
                </>
              ) : (
                <>
                  <VoiceOffIcon className="h-4 w-4 text-slate-500" />
                  <span>Voice Silent</span>
                </>
              )}
            </button>
          </div>}
        </div>
      </div>

      {/* ─── Main Responsive Configuration Grid (Full Width) ─── */}
      <div className={`grid w-full grid-cols-1 ${isFullscreen ? "min-h-0 flex-1 grid-rows-1 gap-3 overflow-hidden lg:grid-cols-2" : "gap-5 lg:grid-cols-12 lg:gap-6"}`}>
        {/* ── LEFT COLUMN (6 cols): Players & Roster ── */}
        <div className={`min-h-0 ${isFullscreen ? "grid grid-rows-[1.15fr_.85fr] gap-3" : "space-y-5 lg:col-span-6 lg:space-y-6"}`}>
          {/* Active Lineup Card */}
          <div className={`min-h-0 overflow-auto rounded-[28px] border-[3px] border-white bg-gradient-to-br from-[#fff9e7] via-white to-[#fff4d8] shadow-[0_10px_24px_rgba(116,89,23,0.12)] ${isFullscreen ? "p-3 sm:p-4" : "p-5 sm:p-6"}`}>
            <div className={`flex flex-wrap items-center justify-between ${isFullscreen ? "mb-2 gap-2" : "mb-4 gap-3"}`}>
              <div>
                <h2 className="font-[family-name:var(--font-fredoka)] text-lg font-black text-[#754f0a] sm:text-xl">
                  Who’s joining the trail?
                </h2>
                <p className="mt-0.5 text-sm font-medium text-[#8c7446]">
                  Pick up to 6 playgroup friends
                </p>
              </div>
              <span className="rounded-full border-2 border-amber-200 bg-white px-3.5 py-1.5 text-xs font-black text-[#8a5a00] shadow-sm">
                ⭐ {selectedPlayers.length} / 6
              </span>
              {selectedPlayers.length === 0 && (
                <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-800">
                  Choose a friend to begin
                </span>
              )}
            </div>

            {selectedPlayers.length === 0 ? (
                <div className={`rounded-[24px] border-2 border-dashed border-amber-300 bg-white/75 px-5 text-center ${isFullscreen ? "py-3" : "py-7 sm:py-8"}`}>
                <div className={`text-4xl ${isFullscreen ? "mb-1 text-3xl" : "mb-2"}`} aria-hidden="true">🧭</div>
                <p className="font-[family-name:var(--font-fredoka)] text-base font-bold text-[#77520f] sm:text-lg">
                  Your adventure crew will appear here!
                </p>
                <p className="mx-auto mt-1 max-w-lg text-sm font-medium text-[#8c7446]">
                  Tap a Trailblazer friend below, or add a guest explorer.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedPlayers.map((player, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-2xl border-2 border-white bg-white/90 p-3 shadow-[0_4px_12px_rgba(108,84,26,0.1)]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingAvatarIndex(editingAvatarIndex === idx ? null : idx)
                        }
                        title="Click to change animal avatar"
                        className="transition-transform hover:scale-110 active:scale-95"
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
                        <span className="block truncate font-black text-[#1e293b] text-sm leading-tight sm:text-base">
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
                      className="ml-2 rounded-full bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-500 transition hover:bg-rose-100 hover:text-rose-700"
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
              <div className="mt-4 rounded-2xl border-2 border-sky-200 bg-sky-50 p-4">
                <span className="mb-2 block text-sm font-black text-sky-900">
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
            <form onSubmit={handleAddGuest} className={`flex flex-col gap-2 border-t border-amber-200/70 sm:flex-row ${isFullscreen ? "mt-2 pt-2" : "mt-4 pt-4"}`}>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Add a guest friend (e.g. Maya)"
                maxLength={25}
                className={`min-h-12 flex-1 rounded-2xl border-2 border-amber-200 bg-white px-4 text-sm font-semibold text-[#1e293b] placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-100 ${isFullscreen ? "py-2" : "py-3"}`}
              />
              <button
                type="submit"
                disabled={!guestName.trim() || selectedPlayers.length >= 6}
                className={`min-h-12 rounded-2xl bg-[#ffbd35] px-5 text-sm font-black text-[#684400] shadow-sm transition hover:bg-[#ffd066] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${isFullscreen ? "py-2" : "py-3"}`}
              >
                + Add Friend
              </button>
            </form>
          </div>

          {/* Trailblazer Playgroup Friends */}
          <div className={`min-h-0 overflow-auto rounded-[28px] border-[3px] border-white bg-gradient-to-br from-[#eafcf6] via-white to-[#e5fbf5] shadow-[0_10px_24px_rgba(19,111,82,0.11)] ${isFullscreen ? "p-3 sm:p-4" : "p-5 sm:p-6"}`}>
            <h3 className="mb-1 font-[family-name:var(--font-fredoka)] text-lg font-black text-[#176c58] sm:text-xl">
              🐾 Trailblazer Playgroup Friends
            </h3>
            <p className={`${isFullscreen ? "mb-2" : "mb-4"} text-sm font-medium text-[#52796f]`}>
              Tap a friend to invite them on the number trail.
            </p>

            {isLoadingRoster ? (
              <p className="text-sm font-semibold text-[#52796f]">Finding your playgroup friends…</p>
            ) : roster.length === 0 ? (
              <p className="rounded-2xl bg-white/80 p-4 text-sm font-semibold text-[#52796f]">No playgroup friends to pick yet.</p>
            ) : (
              <div className={`flex flex-wrap gap-2 overflow-y-auto p-1 ${isFullscreen ? "max-h-28" : "max-h-56"}`}>
                {roster.map((student, index) => {
                  const isSelected = selectedPlayers.some(
                    (p) => p.studentId === student.id
                  );
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleAddFromRoster(student)}
                      disabled={isSelected || selectedPlayers.length >= 6}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-2xl border-2 px-3 py-2 text-sm font-black shadow-sm transition hover:-translate-y-0.5 active:scale-95 ${
                        isSelected
                          ? "cursor-default border-emerald-300 bg-emerald-100 text-emerald-800 opacity-80"
                          : `${rosterChipColors[index % rosterChipColors.length]} cursor-pointer`
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
        <div className={`min-h-0 ${isFullscreen ? "space-y-2.5 overflow-auto" : "space-y-5 lg:col-span-6 lg:space-y-6"}`}>
          {/* Difficulty & Number Range */}
          <div className={`rounded-[28px] border-[3px] border-white bg-gradient-to-br from-[#eff8ff] via-white to-[#f4f8ff] shadow-[0_10px_24px_rgba(36,92,154,0.11)] ${isFullscreen ? "p-3 sm:p-4" : "p-5 sm:p-6"}`}>
            <h3 className={`font-[family-name:var(--font-fredoka)] font-black text-[#164d81] ${isFullscreen ? "mb-0 text-base sm:text-lg" : "mb-1 text-lg sm:text-xl"}`}>
              🎈 Pick your number adventure
            </h3>
            <p className={`${isFullscreen ? "mb-2 text-xs" : "mb-4 text-sm"} font-medium text-[#5b7894]`}>
              Choose the number range that feels just right.
            </p>
            <div className={`grid grid-cols-1 sm:grid-cols-3 ${isFullscreen ? "gap-2" : "gap-3"}`}>
              {(["easy", "medium", "explorer"] as NumberDifficulty[]).map((diff) => {
                const config = DIFFICULTY_RANGES[diff];
                const isCurrent = difficulty === diff;
                const colors = difficultyCardColors[diff];
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => onDifficultyChange(diff)}
                    aria-pressed={isCurrent}
                    className={`flex flex-col justify-between rounded-[22px] border-2 text-left transition-all duration-200 hover:-translate-y-1 ${isFullscreen ? "min-h-0 p-2.5" : "min-h-44 p-4"} ${
                      isCurrent
                        ? colors.selected
                        : colors.idle
                    }`}
                  >
                    <div>
                      <div className={`flex items-center justify-between gap-2 ${isFullscreen ? "mb-1" : "mb-2"}`}>
                        <span className={isFullscreen ? "text-2xl" : "text-3xl"} aria-hidden="true">{colors.icon}</span>
                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black text-[#52667b] shadow-sm">
                          {config.badge}
                        </span>
                      </div>
                      <span className="block text-xs font-black leading-tight text-[#1e293b] sm:text-sm">
                        {config.label}
                      </span>
                    </div>
                    <p className={`${isFullscreen ? "mt-1 text-[10px] leading-snug" : "mt-3 text-xs leading-relaxed"} font-medium text-[#64748b]`}>
                      {config.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trail Challenges Included */}
          <div className={`rounded-[28px] border-[3px] border-white bg-gradient-to-br from-[#fff0f5] via-white to-[#fff6fa] shadow-[0_10px_24px_rgba(158,58,110,0.1)] ${isFullscreen ? "p-3 sm:p-4" : "p-5 sm:p-6"}`}>
            <h3 className={`font-[family-name:var(--font-fredoka)] font-black text-[#923e68] ${isFullscreen ? "mb-0 text-base sm:text-lg" : "mb-1 text-lg sm:text-xl"}`}>
              🌟 Choose the trail games
            </h3>
            <p className={`${isFullscreen ? "mb-2 text-xs" : "mb-4 text-sm"} font-medium text-[#946c80]`}>Pick the games your group wants to play.</p>
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isFullscreen ? "gap-2" : "gap-3"}`}>
              {(["recognition", "count_match", "sequence", "more_or_less"] as ChallengeMode[]).map(
                (mode) => {
                  const meta = MODE_METADATA[mode];
                  const isChecked = selectedModes.includes(mode);
                  return (
                    <label
                      key={mode}
                      className={`flex cursor-pointer items-start gap-3 rounded-[20px] border-2 transition-all hover:-translate-y-0.5 ${isFullscreen ? "min-h-0 gap-2 p-2" : "min-h-20 p-3.5"} ${
                        isChecked
                          ? "border-sky-300 bg-sky-100/80 shadow-sm"
                          : "border-slate-200 bg-white/85 hover:border-sky-200 hover:bg-sky-50/70"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleMode(mode)}
                        className="mt-0.5 h-5 w-5 rounded border-gray-300 accent-[#1789d4] focus:ring-blue-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          {renderModeIcon(mode, isFullscreen ? "h-4 w-4" : "h-5 w-5")}
                          <span className={`block font-black text-[#1e293b] ${isFullscreen ? "text-xs" : "text-sm"}`}>
                            {meta.title}
                          </span>
                        </div>
                        <span className={`block font-medium leading-relaxed text-[#64748b] ${isFullscreen ? "text-[10px]" : "text-xs"}`}>
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
          <div className={`rounded-[28px] border-[3px] border-white bg-gradient-to-br from-[#f4f0ff] via-white to-[#f7f3ff] shadow-[0_10px_24px_rgba(84,56,141,0.1)] ${isFullscreen ? "p-3 sm:p-4" : "p-5 sm:p-6"}`}>
            <div className={`flex flex-wrap items-center justify-between gap-2 ${isFullscreen ? "mb-2" : "mb-4"}`}>
              <div>
                <h3 className={`font-[family-name:var(--font-fredoka)] font-black text-[#543b8a] ${isFullscreen ? "text-base sm:text-lg" : "text-lg sm:text-xl"}`}>
                  🏁 How long is your trail?
                </h3>
                <p className={`font-medium text-[#756a91] ${isFullscreen ? "text-xs" : "mt-0.5 text-sm"}`}>More steps mean more chances to play!</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#543b8a] shadow-sm">
                {roundsPerPlayer} steps
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[3, 5, 8, 10].map((rounds) => (
                <button
                  key={rounds}
                  type="button"
                  onClick={() => onRoundsChange(rounds)}
                  aria-pressed={roundsPerPlayer === rounds}
                  className={`rounded-2xl border-2 text-sm font-black transition-all hover:-translate-y-0.5 ${isFullscreen ? "min-h-10 py-1.5 text-xs" : "min-h-12 py-2.5"} ${
                    roundsPerPlayer === rounds
                      ? "border-[#ffbd35] bg-[#ffbd35] text-[#684400] shadow-md ring-4 ring-amber-100"
                      : "border-violet-200 bg-white/90 text-[#5d4b86] hover:border-violet-300 hover:bg-violet-50"
                  }`}
                >
                  {rounds} steps
                </button>
              ))}
            </div>
          </div>

          {/* Launch Button (Full Width) */}
          <button
            type="button"
            onClick={onStartGame}
            disabled={selectedPlayers.length === 0}
            className={`flex w-full items-center justify-center gap-3 rounded-[24px] border-[3px] border-white bg-gradient-to-r from-[#ffca3a] via-[#ffd956] to-[#ffb83f] text-center font-[family-name:var(--font-fredoka)] font-black text-[#684400] shadow-[0_8px_0_#e79a24,0_14px_24px_rgba(135,91,10,0.18)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-1 active:shadow-[0_4px_0_#e79a24] disabled:cursor-not-allowed disabled:opacity-55 ${isFullscreen ? "min-h-12 p-2 text-lg" : "min-h-16 p-4 text-xl sm:text-2xl"}`}
          >
            <span aria-hidden="true">🚀</span>
            <span>{selectedPlayers.length ? "Let’s start the adventure!" : "Choose a friend to begin!"}</span>
            <ArrowRightIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
