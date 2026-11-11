"use client";

import { GamePlayer } from "../types";

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
  // If no players or 0 steps, provide fallback
  const steps = Math.max(totalSteps, 3);

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-[#dbe4f1] bg-gradient-to-b from-[#f8fafc] to-[#eef2f6] p-4 sm:p-6 shadow-inner">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#002f76] text-white text-xs font-black">
            🏁
          </span>
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#002f76]">
            Number Trail Race
          </span>
        </div>
        <span className="text-xs font-bold text-[#57719b]">
          Goal: {steps} steps to the Trophy 🏆
        </span>
      </div>

      {/* Stepping stones bar */}
      <div className="relative pt-1 pb-2">
        {/* Track Line */}
        <div className="absolute top-[22px] left-4 right-4 h-2 rounded-full bg-[#cbd5e1]" />

        {/* Stone markers */}
        <div className="relative flex justify-between px-2">
          {Array.from({ length: steps + 1 }).map((_, stepIdx) => {
            const isStart = stepIdx === 0;
            const isFinish = stepIdx === steps;
            return (
              <div key={stepIdx} className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border-2 text-xs font-black shadow-sm transition-all ${
                    isFinish
                      ? "border-[#f59e0b] bg-[#fef3c7] text-[#b45309] scale-110"
                      : isStart
                      ? "border-[#002f76] bg-white text-[#002f76]"
                      : "border-[#94a3b8] bg-white text-[#475569]"
                  }`}
                >
                  {isFinish ? "🏆" : isStart ? "🏁" : stepIdx}
                </div>
                <span className="mt-1 text-[10px] font-bold text-[#64748b]">
                  {isFinish ? "Goal" : isStart ? "Start" : `S${stepIdx}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Players lanes */}
      <div className="mt-4 space-y-2 border-t border-[#e2e8f0] pt-3">
        {players.map((player, idx) => {
          const isActive = idx === activePlayerIndex;
          const currentStep = Math.min(player.correctCount, steps);
          const percent = Math.min(100, Math.round((currentStep / steps) * 100));

          return (
            <div
              key={player.name + idx}
              className={`relative flex items-center rounded-2xl border px-3 py-2 transition-all ${
                isActive
                  ? "border-[#3b82f6] bg-white shadow-md ring-2 ring-[#3b82f6]/20"
                  : "border-transparent bg-white/60 hover:bg-white"
              }`}
            >
              {/* Player identifier tag */}
              <div className="flex w-28 sm:w-36 shrink-0 items-center gap-2">
                <span className="text-xl sm:text-2xl">{player.avatar}</span>
                <div className="min-w-0">
                  <span className="block truncate text-xs sm:text-sm font-extrabold text-[#1e293b]">
                    {player.name}
                  </span>
                  <span className="text-[10px] font-semibold text-[#64748b]">
                    {player.score} pts • {player.correctCount} steps
                  </span>
                </div>
              </div>

              {/* Player Trail Progress Track */}
              <div className="relative mx-3 sm:mx-4 flex-1 h-8 flex items-center">
                <div className="w-full h-2.5 rounded-full bg-[#e2e8f0] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: player.color || "#0284c7",
                    }}
                  />
                </div>

                {/* Hopping Animal Token */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500 ease-out z-10"
                  style={{ left: `${Math.max(4, Math.min(96, percent))}%` }}
                >
                  <span
                    className={`inline-flex items-center justify-center rounded-full text-base sm:text-lg p-0.5 border-2 shadow-md ${
                      isActive ? "animate-bounce ring-2 ring-yellow-400" : ""
                    }`}
                    style={{
                      backgroundColor: player.bgLight || "#fef3c7",
                      borderColor: player.borderColor || player.color || "#f59e0b",
                    }}
                    title={`${player.name} (${currentStep}/${steps} steps)`}
                  >
                    {player.avatar}
                  </span>
                </div>
              </div>

              {/* Active indicator */}
              <div className="w-16 sm:w-20 text-right shrink-0">
                {isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#dbeafe] px-2 py-0.5 text-[10px] font-black uppercase text-[#1d4ed8]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb] animate-ping" />
                    Turn
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-[#64748b]">
                    {percent}%
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

