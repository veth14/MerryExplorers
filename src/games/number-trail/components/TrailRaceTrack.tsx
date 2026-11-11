"use client";

import { GamePlayer } from "../types";
import { FlagIcon, TrophyIcon, AnimalAvatarBadge } from "./GameIcons";

type TrailRaceTrackProps = {
  players: GamePlayer[];
  totalSteps: number;
  activePlayerIndex: number;
  raceMotion: { playerIndex: number; fromCount: number; toCount: number };
  raceAnimationStarted: boolean;
};

const trailHeightStops = [
  [0, 58], [18, 56], [28, 39], [40, 39], [50, 62],
  [62, 62], [76, 38], [85, 38], [100, 58],
] as const;

function trailHeightAt(progress: number) {
  const rightIndex = trailHeightStops.findIndex(([x]) => x >= progress);
  if (rightIndex <= 0) return trailHeightStops[Math.max(rightIndex, 0)][1];
  const [leftX, leftY] = trailHeightStops[rightIndex - 1];
  const [rightX, rightY] = trailHeightStops[rightIndex];
  const ratio = (progress - leftX) / (rightX - leftX);
  return leftY + (rightY - leftY) * ratio;
}

export function TrailRaceTrack({
  players,
  totalSteps,
  activePlayerIndex,
  raceMotion,
  raceAnimationStarted,
}: TrailRaceTrackProps) {
  const steps = Math.max(totalSteps, 3);

  return (
    <div className="number-trail-raceboard w-full overflow-hidden rounded-[32px] border border-white/80 p-4 shadow-inner sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 sm:mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/70 bg-gradient-to-br from-emerald-700 to-emerald-900 text-white shadow-md">
            <FlagIcon className="h-4.5 w-4.5" />
          </span>
          <div>
            <span className="block text-sm font-black uppercase tracking-wider text-[#17452f] sm:text-base">
              Forest Trail Adventure
            </span>
            <span className="text-[11px] font-semibold text-[#47634f] sm:text-xs">
              Each correct answer takes your explorer farther along the winding path
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-50/95 px-3.5 py-2 text-xs font-black text-amber-950 shadow-sm">
          <TrophyIcon className="h-4 w-4 text-amber-600" />
          <span>Trail Goal: {steps} Steps to Win</span>
        </div>
      </div>

      {/* Stepping stones trail header line */}
      <div className="relative px-1 pb-2 pt-1 sm:px-2">
        <div className="absolute left-6 right-6 top-[22px] h-2 rounded-full bg-[linear-gradient(90deg,#b8d09c,#c9a678,#b8d09c)] shadow-inner sm:top-[26px]" />

        <div className="relative flex justify-between px-2">
          {Array.from({ length: steps + 1 }).map((_, stepIdx) => {
            const isStart = stepIdx === 0;
            const isFinish = stepIdx === steps;
            return (
              <div key={stepIdx} className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-[38%_46%_40%_48%] border-2 text-xs font-black shadow-md transition-all ${
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
      <div className="mt-3 space-y-2 border-t border-emerald-900/10 pt-3 sm:mt-4 sm:space-y-2.5 sm:pt-4">
        {players.map((player, idx) => {
          const isActive = idx === activePlayerIndex;
          const shownCount = idx === raceMotion.playerIndex && !raceAnimationStarted
            ? raceMotion.fromCount
            : player.correctCount;
          const currentStep = Math.min(shownCount, steps);
          const percent = Math.min(100, Math.round((currentStep / steps) * 100));
          const trailHeight = trailHeightAt(percent);
          const isPreparing = idx === raceMotion.playerIndex && !raceAnimationStarted;
          const isMoving = idx === raceMotion.playerIndex && raceAnimationStarted;

          return (
            <div
              key={player.name + idx}
              className={`relative flex items-center rounded-[22px] border-2 p-2 sm:px-4 transition-all ${
                isActive
                  ? "border-emerald-300 bg-white/95 shadow-lg ring-4 ring-emerald-500/15"
                  : "border-white/80 bg-white/80 hover:bg-white"
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
                    {player.score} pts • {shownCount} steps
                  </span>
                </div>
              </div>

              {/* Player track progress bar */}
              <div className="relative mx-3 flex h-[70px] flex-1 items-center sm:mx-6 sm:h-[82px]">
                <svg aria-hidden="true" viewBox="0 0 1000 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                  <path d="M 0 58 C 140 58 130 39 240 39 S 390 62 500 62 S 650 37 760 37 S 900 58 1000 58" fill="none" stroke="#765037" strokeWidth="35" strokeLinecap="round" />
                  <path d="M 0 58 C 140 58 130 39 240 39 S 390 62 500 62 S 650 37 760 37 S 900 58 1000 58" fill="none" stroke="#c9955b" strokeWidth="28" strokeLinecap="round" />
                  <path d="M 0 58 C 140 58 130 39 240 39 S 390 62 500 62 S 650 37 760 37 S 900 58 1000 58" fill="none" stroke="#efd09c" strokeWidth="2" strokeDasharray="3 18" strokeLinecap="round" opacity=".9" />
                  <path d="M 0 58 C 140 58 130 39 240 39 S 390 62 500 62 S 650 37 760 37 S 900 58 1000 58" fill="none" stroke={player.color || "#0284c7"} strokeWidth="21" strokeLinecap="round" pathLength="100" strokeDasharray={`${percent} 100`} className="trail-progress-stroke" />
                </svg>

                {/* Hopping Animal Avatar Token */}
                <div
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-[1600ms] ease-out"
                  style={{ left: `${Math.max(2, Math.min(98, percent))}%`, top: `${trailHeight}%` }}
                >
                  {isPreparing && (
                    <span className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-amber-300 bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-900 shadow-md animate-pulse">
                      Ready… set…
                    </span>
                  )}
                  <div className={isMoving ? "pet-race-bounce" : isPreparing ? "pet-race-ready" : ""}>
                    <AnimalAvatarBadge
                      name={player.petName || player.name}
                      color={player.color}
                      bgLight={player.bgLight}
                      borderColor={player.borderColor}
                      className="h-9 w-9 shadow-lg ring-[3px] ring-white sm:h-10 sm:w-10"
                    />
                  </div>
                </div>
              </div>

              {/* Status indicator */}
              <div className="w-20 sm:w-24 text-right shrink-0">
                {isActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
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
