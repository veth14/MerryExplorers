"use client";

import { GamePlayer } from "../types";
import { FlagIcon, TrophyIcon } from "./GameIcons";

type TrailRaceTrackProps = {
  players: GamePlayer[];
  totalSteps: number;
  activePlayerIndex: number;
  raceMotion: { playerIndex: number; fromCount: number; toCount: number; willReachGoal: boolean };
  raceAnimationStarted: boolean;
  raceAnimationDone: boolean;
  onContinue: () => void;
};

type TrailPoint = { x: number; y: number };

const TRAIL_POINTS: TrailPoint[] = [
  { x: 92, y: 390 }, { x: 145, y: 404 }, { x: 200, y: 410 },
  { x: 245, y: 401 }, { x: 290, y: 379 }, { x: 322, y: 341 },
  { x: 336, y: 295 }, { x: 336, y: 249 }, { x: 351, y: 205 },
  { x: 385, y: 168 }, { x: 428, y: 143 }, { x: 477, y: 132 },
  { x: 526, y: 140 }, { x: 568, y: 162 }, { x: 601, y: 195 },
  { x: 626, y: 235 }, { x: 661, y: 266 }, { x: 705, y: 281 },
  { x: 751, y: 274 }, { x: 789, y: 249 }, { x: 816, y: 211 },
  { x: 826, y: 166 }, { x: 846, y: 123 }, { x: 877, y: 84 },
];

function buildTrailPath(points: TrailPoint[]) {
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const beforePrevious = points[Math.max(0, index - 2)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const controlOne = {
      x: previous.x + (point.x - beforePrevious.x) / 6,
      y: previous.y + (point.y - beforePrevious.y) / 6,
    };
    const controlTwo = {
      x: point.x - (next.x - previous.x) / 6,
      y: point.y - (next.y - previous.y) / 6,
    };
    return `${path} C ${controlOne.x} ${controlOne.y}, ${controlTwo.x} ${controlTwo.y}, ${point.x} ${point.y}`;
  }, "");
}

const TRAIL_PATH = buildTrailPath(TRAIL_POINTS);
const TRAIL_PATH_SAMPLES = TRAIL_POINTS.flatMap((point, index) => {
  if (index === 0) return [point];
  const previous = TRAIL_POINTS[index - 1];
  const beforePrevious = TRAIL_POINTS[Math.max(0, index - 2)];
  const next = TRAIL_POINTS[Math.min(TRAIL_POINTS.length - 1, index + 1)];
  const controlOne = {
    x: previous.x + (point.x - beforePrevious.x) / 6,
    y: previous.y + (point.y - beforePrevious.y) / 6,
  };
  const controlTwo = {
    x: point.x - (next.x - previous.x) / 6,
    y: point.y - (next.y - previous.y) / 6,
  };
  return Array.from({ length: 24 }, (_, sampleIndex) => {
    const t = (sampleIndex + 1) / 24;
    const inverseT = 1 - t;
    return {
      x: inverseT ** 3 * previous.x + 3 * inverseT ** 2 * t * controlOne.x + 3 * inverseT * t ** 2 * controlTwo.x + t ** 3 * point.x,
      y: inverseT ** 3 * previous.y + 3 * inverseT ** 2 * t * controlOne.y + 3 * inverseT * t ** 2 * controlTwo.y + t ** 3 * point.y,
    };
  });
});
const TRAIL_CUMULATIVE_LENGTHS = TRAIL_PATH_SAMPLES.reduce<number[]>((lengths, point, index) => {
  if (index === 0) return [0];
  const previous = TRAIL_PATH_SAMPLES[index - 1];
  const segmentLength = Math.hypot(point.x - previous.x, point.y - previous.y);
  return [...lengths, lengths[index - 1] + segmentLength];
}, []);
const TRAIL_TOTAL_LENGTH = TRAIL_CUMULATIVE_LENGTHS[TRAIL_CUMULATIVE_LENGTHS.length - 1];

function TrailAnimal({ name, color, className = "", walking = false }: { name: string; color: string; className?: string; walking?: boolean }) {
  const kind = name.toLowerCase();
  const isBunny = kind.includes("bunny") || kind.includes("rabbit");
  const isFox = kind.includes("fox");
  const isCat = kind.includes("cat") || kind.includes("tiger");
  const isLion = kind.includes("lion");
  const isPanda = kind.includes("panda") || kind.includes("bear") || kind.includes("koala");
  const isFrog = kind.includes("frog");
  const isPenguin = kind.includes("penguin") || kind.includes("owl");
  const coatColor = isLion ? "#ce8b37" : isBunny ? "#e8d9d2" : isFox || isCat ? "#d98242" : isPanda ? "#e6dfd0" : isFrog ? "#78b85d" : isPenguin ? "#425a6b" : color;

  return (
    <svg viewBox="0 0 128 96" role="img" aria-label={`${name}, walking on the trail`} className={`${className} ${walking ? "trail-animal-walk" : "trail-animal-idle"}`}>
      <ellipse cx="64" cy="87" rx="43" ry="6" fill="#183b2c" opacity=".22" />
      {isLion && <circle cx="90" cy="38" r="27" fill="#d89032" stroke="#70482d" strokeWidth="3" />}
      <path className={walking ? "trail-animal-tail" : ""} d="M30 54 C14 50 13 35 23 31 C31 28 35 36 29 40" fill="none" stroke={coatColor} strokeWidth="8" strokeLinecap="round" />
      <ellipse cx="57" cy="54" rx="34" ry="20" fill={coatColor} stroke="#694832" strokeWidth="3" />
      <ellipse cx="57" cy="59" rx="19" ry="11" fill="#fff3d9" opacity=".9" />
      <g className={walking ? "trail-animal-leg trail-animal-leg-back" : ""}>
        <path d="M42 61 L38 81 Q39 86 47 85 L51 63Z" fill={coatColor} stroke="#694832" strokeWidth="2.5" />
      </g>
      <g className={walking ? "trail-animal-leg trail-animal-leg-front" : ""}>
        <path d="M69 61 L72 82 Q74 86 81 84 L79 61Z" fill={coatColor} stroke="#694832" strokeWidth="2.5" />
      </g>
      <path d="M75 58 Q84 66 95 58" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
      {!isLion && <circle cx="89" cy="39" r="22" fill={coatColor} stroke="#694832" strokeWidth="3" />}
      {isBunny ? (
        <g className={walking ? "trail-animal-ears" : ""}>
          <ellipse cx="81" cy="11" rx="7" ry="18" fill={coatColor} stroke="#694832" strokeWidth="2.5" transform="rotate(-13 81 11)" />
          <ellipse cx="99" cy="10" rx="7" ry="19" fill={coatColor} stroke="#694832" strokeWidth="2.5" transform="rotate(12 99 10)" />
          <ellipse cx="81" cy="11" rx="2.5" ry="11" fill="#f6a9ac" transform="rotate(-13 81 11)" />
          <ellipse cx="99" cy="10" rx="2.5" ry="12" fill="#f6a9ac" transform="rotate(12 99 10)" />
        </g>
      ) : isFox || isCat ? (
        <path d="M72 31 L76 9 L89 22 Q96 18 104 22 L117 10 L116 35Z" fill={coatColor} stroke="#694832" strokeWidth="2.5" strokeLinejoin="round" />
      ) : isPanda ? (
        <g fill="#202d36"><circle cx="74" cy="24" r="8" /><circle cx="104" cy="24" r="8" /></g>
      ) : isFrog ? (
        <g><circle cx="78" cy="20" r="9" fill="#8bd66e" stroke="#694832" strokeWidth="2" /><circle cx="101" cy="20" r="9" fill="#8bd66e" stroke="#694832" strokeWidth="2" /><circle cx="80" cy="20" r="3" fill="#24352c" /><circle cx="99" cy="20" r="3" fill="#24352c" /></g>
      ) : isPenguin ? (
        <path d="M74 26 Q88 12 104 26 L101 31 H77Z" fill="#f2bd42" stroke="#694832" strokeWidth="2" />
      ) : (
        <g fill={coatColor} stroke="#694832" strokeWidth="2"><circle cx="75" cy="23" r="8" /><circle cx="103" cy="23" r="8" /></g>
      )}
      {isPanda ? <ellipse cx="93" cy="44" rx="13" ry="10" fill="#fff" /> : <ellipse cx="96" cy="46" rx="12" ry="9" fill="#fff1d8" />}
      {isPanda && <ellipse cx="85" cy="36" rx="4" ry="5" fill="#202d36" />}
      <circle cx="86" cy="37" r="2.5" fill="#25312d" />
      {isPanda && <ellipse cx="98" cy="36" rx="4" ry="5" fill="#202d36" />}
      <circle cx="100" cy="39" r="2.5" fill="#25312d" />
      <ellipse cx="105" cy="46" rx="3" ry="2.5" fill="#4b3329" />
      <path d="M100 51 Q105 55 110 50" fill="none" stroke="#704b3a" strokeWidth="1.8" strokeLinecap="round" />
      {isPenguin && <ellipse cx="58" cy="57" rx="14" ry="18" fill="#fff" />}
    </svg>
  );
}

function pointAtProgress(progress: number): TrailPoint {
  const targetLength = Math.max(0, Math.min(1, progress)) * TRAIL_TOTAL_LENGTH;
  const segmentIndex = Math.min(
    TRAIL_PATH_SAMPLES.length - 2,
    Math.max(0, TRAIL_CUMULATIVE_LENGTHS.findIndex((length) => length >= targetLength) - 1)
  );
  const start = TRAIL_PATH_SAMPLES[segmentIndex];
  const end = TRAIL_PATH_SAMPLES[segmentIndex + 1];
  const segmentLength = TRAIL_CUMULATIVE_LENGTHS[segmentIndex + 1] - TRAIL_CUMULATIVE_LENGTHS[segmentIndex];
  const segmentProgress = segmentLength === 0
    ? 0
    : (targetLength - TRAIL_CUMULATIVE_LENGTHS[segmentIndex]) / segmentLength;
  return {
    x: start.x + (end.x - start.x) * segmentProgress,
    y: start.y + (end.y - start.y) * segmentProgress,
  };
}

export function TrailRaceTrack({
  players,
  totalSteps,
  activePlayerIndex,
  raceMotion,
  raceAnimationStarted,
  raceAnimationDone,
  onContinue,
}: TrailRaceTrackProps) {
  const steps = Math.max(totalSteps, 3);
  const activePlayer = players[activePlayerIndex];
  const activeCount = raceAnimationStarted ? raceMotion.toCount : raceMotion.fromCount;
  const explorerPoint = pointAtProgress(activeCount / steps);
  const isWalking = raceAnimationStarted && !raceAnimationDone;
  const allExplorersFinished = players.length > 0 && players.every((player) => player.correctCount >= steps);

  return (
    <section className="number-trail-journey relative isolate flex h-full min-h-[460px] w-full flex-col overflow-hidden rounded-[32px] border border-white/70 shadow-[0_24px_70px_rgba(24,63,46,.24)]">
      {/* A winding forest route takes the place of a progress-bar race lane. */}
      <svg aria-hidden="true" viewBox="0 0 1000 500" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-[10%] h-[82%] w-full">
        <defs>
          <linearGradient id="journeyDirt" x1="0" x2=".18" y1="0" y2="1">
            <stop offset="0" stopColor="#dfbd88" />
            <stop offset=".55" stopColor="#c29662" />
            <stop offset="1" stopColor="#a9794d" />
          </linearGradient>
          <linearGradient id="journeyEdge" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#896441" />
            <stop offset="1" stopColor="#694a35" />
          </linearGradient>
        </defs>
        <path d={TRAIL_PATH} fill="none" stroke="url(#journeyEdge)" strokeWidth="92" strokeLinecap="round" strokeLinejoin="round" />
        <path d={TRAIL_PATH} fill="none" stroke="url(#journeyDirt)" strokeWidth="78" strokeLinecap="round" strokeLinejoin="round" />
        <path d={TRAIL_PATH} fill="none" stroke="#f5dfb9" strokeWidth="2.5" strokeDasharray="2 16" strokeLinecap="round" opacity=".8" />
        <path d={TRAIL_PATH} fill="none" stroke="#8b633d" strokeWidth="1.5" strokeDasharray="1 28" strokeLinecap="round" opacity=".5" />
        {TRAIL_POINTS.filter((_, index) => index % 3 === 1).map((point, index) => (
          <g key={`trail-pebbles-${index}`} fill="#80593b" opacity=".26">
            <ellipse cx={point.x - 12} cy={point.y - 18} rx="2.4" ry="1.3" />
            <ellipse cx={point.x + 15} cy={point.y + 17} rx="2" ry="1.2" />
          </g>
        ))}
      </svg>

      <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
        <div className="flex min-w-0 items-center gap-3 rounded-[22px] border border-white/75 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-md sm:px-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-800 text-white shadow-md ring-4 ring-emerald-100">
            <FlagIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] text-emerald-900">
                Forest trail
              </span>
              <span className="text-xs font-black text-emerald-800">{activePlayer?.name}&apos;s adventure</span>
            </div>
            <h2 className="mt-1 font-[family-name:var(--font-fredoka)] text-lg font-black leading-tight text-[#123f31] sm:text-2xl">
              {raceAnimationDone && allExplorersFinished
                ? "Your whole crew found the treasure!"
                : raceAnimationDone && raceMotion.willReachGoal
                  ? `${activePlayer?.name} finished their trail!`
                : raceAnimationStarted
                  ? `Walking to Step ${raceMotion.toCount}!`
                  : "Ready… set… let’s explore!"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-[22px] border border-amber-200 bg-[#fff9e8]/95 px-4 py-2.5 shadow-lg backdrop-blur-md sm:gap-4 sm:px-5">
          <div className="text-right">
            <span className="block text-[10px] font-black uppercase tracking-[.14em] text-amber-800">Trail progress</span>
            <span className="font-[family-name:var(--font-fredoka)] text-xl font-black text-amber-950 sm:text-2xl">
              Step {raceMotion.toCount} of {steps}
            </span>
          </div>
          <span className="flex h-10 min-w-10 items-center justify-center rounded-2xl bg-amber-400 px-2 text-sm font-black text-amber-950 shadow-inner">
            ⭐ {activePlayer?.score ?? 0}
          </span>
        </div>
      </header>

      <div className="pointer-events-none absolute inset-0 z-[5]">
        {/* Milestones sit on the path; the active mascot travels between them. */}
        {Array.from({ length: steps + 1 }).map((_, index) => {
          const point = pointAtProgress(index / steps);
          const isGoal = index === steps;
          const isCurrent = index === activeCount;
          const isNext = index === raceMotion.toCount;
          return (
            <div
              key={`milestone-${index}`}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${point.x / 10}%`, top: `calc(10% + ${point.y * 0.164}%)` }}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-[38%_46%_40%_48%] border-[3px] text-xs font-black shadow-lg transition-all sm:h-12 sm:w-12 ${
                isGoal
                  ? "border-amber-300 bg-amber-100 text-amber-900 ring-4 ring-amber-200/70"
                  : isCurrent || isNext
                    ? "border-white bg-emerald-700 text-white ring-4 ring-emerald-300/70"
                    : "border-[#f5e6c9] bg-[#fff9ed] text-[#704d32]"
              } ${isNext && !raceAnimationStarted ? "animate-pulse" : ""}`}>
                {isGoal ? <TrophyIcon className="h-5 w-5 text-amber-700" /> : index === 0 ? <FlagIcon className="h-4 w-4" /> : index}
              </span>
              {(isGoal || index === 0) && (
                <span className="mt-1 rounded-full border border-white/75 bg-white/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#4f4639] shadow-sm sm:text-[10px]">
                  {isGoal ? "Treasure" : "Start"}
                </span>
              )}
            </div>
          );
        })}

        {/* Other explorers appear as small trail companions. */}
        {players.map((player, index) => {
          if (index === activePlayerIndex) return null;
          const point = pointAtProgress(Math.min(player.correctCount, steps) / steps);
          const sameStepPlayers = players.filter((candidate) => candidate.correctCount === player.correctCount);
          const sameStepIndex = sameStepPlayers.findIndex((candidate) => candidate === player);
          const horizontalSpread = (sameStepIndex - (sameStepPlayers.length - 1) / 2) * 2.4;
          return (
            <div
              key={`companion-${player.studentId ?? player.name}-${index}`}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `calc(${point.x / 10}% + ${horizontalSpread}%)`, top: `calc(10% + ${point.y * 0.164}% - ${index % 2 ? 32 : -32}px)` }}
              title={`${player.name}: ${player.correctCount} steps`}
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/80 bg-white/90 px-2 py-0.5 text-[9px] font-black text-slate-800 shadow-sm">
                {player.name}
              </span>
              <TrailAnimal name={player.petName || player.name} color={player.color} className="h-10 w-14 drop-shadow-md sm:h-12 sm:w-[68px]" />
            </div>
          );
        })}

        {activePlayer && (
          <div
            key={`active-${raceMotion.fromCount}-${raceMotion.toCount}`}
            aria-label={`${activePlayer.name} walking along the forest trail`}
            className="trail-explorer-mover pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${explorerPoint.x / 10}%`,
              top: `calc(10% + ${explorerPoint.y * 0.164}%)`,
            }}
          >
            <span className="mb-0.5 block whitespace-nowrap text-center rounded-full border border-white bg-white/95 px-2 py-0.5 text-[7px] font-black text-emerald-950 shadow-md">
              {activePlayer.name}
            </span>
            <TrailAnimal
              name={activePlayer.petName || activePlayer.name}
              color={activePlayer.color}
              walking={isWalking}
              className="h-[72px] w-[84px] drop-shadow-2xl"
            />
          </div>
        )}
      </div>

      <footer className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
        <div className="rounded-2xl border border-white/75 bg-white/90 px-4 py-2.5 text-sm font-bold text-[#304e3b] shadow-lg backdrop-blur-md">
          {raceAnimationDone
            ? allExplorersFinished
              ? "Everyone reached the treasure together. You’re all trail champions!"
              : raceMotion.willReachGoal
                ? `${activePlayer?.name} finished their trail. Cheer on the next explorer!`
                : "Great walking! Ready for the next explorer?"
            : raceAnimationStarted
              ? `${activePlayer?.name} is on the way to the next trail marker!`
              : "You got it right! Watch your explorer get ready to walk."}
        </div>
        {raceAnimationDone ? (
          <button type="button" onClick={onContinue} className="min-h-12 rounded-2xl border-b-4 border-emerald-950 bg-emerald-800 px-6 py-3 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-emerald-900 active:translate-y-1 active:border-b-0">
            {allExplorersFinished ? "Celebrate together 🏆" : "Next explorer →"}
          </button>
        ) : (
          <span className="rounded-full border border-white/75 bg-emerald-100/95 px-5 py-3 text-sm font-black text-emerald-900 shadow-lg">
            Follow the trail…
          </span>
        )}
      </footer>
    </section>
  );
}
