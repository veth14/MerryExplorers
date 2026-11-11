"use client";

import { GamePlayer } from "../types";
import { FlagIcon, TrophyIcon, AnimalAvatarBadge } from "./GameIcons";

type TrailRaceTrackProps = {
  players: GamePlayer[];
  totalSteps: number;
  activePlayerIndex: number;
};

export function TrailRaceTrack({
  players,
  totalSteps,
  activePlayerIndex,
}: TrailRaceTrackProps) {
  const steps = Math.max(totalSteps, 3);

  return (
    <div className="w-full overflow-hidden rounded-[32px] border border-[#dbe4f1] bg-gradient-to-b from-[#f8fafc] to-[#edf2f7] p-5 sm:p-7 shadow-inner">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#002f76] text-white shadow-xs">
            <FlagIcon className="h-4.5 w-4.5" />
          </span>
          <div>
            <span className="block text-xs sm:text-sm font-black uppercase tracking-wider text-[#002f76]">
              Number Trail Race Arena
            </span>
            <span className="text-[11px] font-semibold text-[#64748b]">
              Correct answers advance your explorer towards the victory trophy
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-xs font-black text-amber-900">
          <TrophyIcon className="h-4 w-4 text-amber-600" />
          <span>Trail Goal: {steps} Steps to Win</span>
        </div>
      </div>

      {/* Stepping stones trail header line */}
      <div className="relative pt-2 pb-3">
        <div className="absolute top-[26px] left-6 right-6 h-2 rounded-full bg-[#cbd5e1]" />

        <div className="relative flex justify-between px-2">
          {Array.from({ length: steps + 1 }).map((_, stepIdx) => {
            const isStart = stepIdx === 0;
            const isFinish = stepIdx === steps;
            return (
              <div key={stepIdx} className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-2xl border-2 text-xs font-black shadow-xs transition-all ${
                    isFinish
                      ? "border-[#f59e0b] bg-[#fef3c7] text-[#b45309] scale-110 shadow-md ring-2 ring-amber-300"
                      : isStart
                      ? "border-[#002f76] bg-white text-[#002f76]"
                      : "border-[#94a3b8] bg-white text-[#475569]"
                  }`}
                >
                  {isFinish ? (
                    <TrophyIcon className="h-5 w-5 text-amber-600" />
                  ) : isStart ? (
                    <FlagIcon className="h-4.5 w-4.5 text-[#002f76]" />
                  ) : (
                    stepIdx
                  )}
                </div>
                <span className="mt-1.5 text-[10px] font-bold text-[#64748b]">
                  {isFinish ? "Goal" : isStart ? "Start" : `S${stepIdx}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Players tracks */}
      <div className="mt-5 space-y-2.5 border-t border-[#e2e8f0] pt-4">
        {players.map((player, idx) => {
          const isActive = idx === activePlayerIndex;
          const currentStep = Math.min(player.correctCount, steps);
          const percent = Math.min(100, Math.round((currentStep / steps) * 100));

          return (
            <div
              key={player.name + idx}
              className={`relative flex items-center rounded-2xl border-2 p-2.5 sm:px-4 transition-all ${
                isActive
                  ? "border-[#3b82f6] bg-white shadow-md ring-4 ring-[#3b82f6]/15"
                  : "border-slate-200/80 bg-white/70 hover:bg-white"
              }`}
            >
              {/* Player identity info */}
              <div className="flex w-36 sm:w-48 shrink-0 items-center gap-3">
                <AnimalAvatarBadge
                  name={player.petName || player.name}
                  color={player.color}
                  bgLight={player.bgLight}
                  borderColor={player.borderColor}
                  className="h-10 w-10 sm:h-11 sm:w-11"
                />
                <div className="min-w-0">
                  <span className="block truncate text-xs sm:text-sm font-black text-[#1e293b]">
                    {player.name}
                  </span>
                  <span className="text-[10px] font-semibold text-[#64748b]">
                    {player.score} pts • {player.correctCount} steps
                  </span>
                </div>
              </div>

              {/* Player track progress bar */}
              <div className="relative mx-3 sm:mx-6 flex-1 h-10 flex items-center">
                <div className="w-full h-3 rounded-full bg-[#e2e8f0] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: player.color || "#0284c7",
                    }}
                  />
                </div>

                {/* Hopping Animal Avatar Token */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500 ease-out z-10"
                  style={{ left: `${Math.max(4, Math.min(96, percent))}%` }}
                >
                  <div className={isActive ? "animate-bounce" : ""}>
                    <AnimalAvatarBadge
                      name={player.petName || player.name}
                      color={player.color}
                      bgLight={player.bgLight}
                      borderColor={player.borderColor}
                      className="h-9 w-9 sm:h-10 sm:w-10 shadow-lg ring-2 ring-white"
                    />
                  </div>
                </div>
              </div>

              {/* Status indicator */}
              <div className="w-20 sm:w-24 text-right shrink-0">
                {isActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dbeafe] px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#1d4ed8]">
                    <span className="h-2 w-2 rounded-full bg-[#2563eb] animate-ping" />
                    Turn
                  </span>
                ) : (
                  <span className="text-xs font-bold text-[#64748b]">
                    {percent}% ({currentStep}/{steps})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
