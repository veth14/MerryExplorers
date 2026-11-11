"use client";

import { NumberChallenge } from "../types";
import { MODE_METADATA } from "../data";
import { DotGrid } from "./DotGrid";
import {
  SpeakerIcon,
  RecognitionModeIcon,
  CountMatchModeIcon,
  SequenceModeIcon,
  MoreLessModeIcon,
  SparklesIcon,
  ArrowRightIcon,
  StarIcon,
} from "./GameIcons";

type ChallengeDisplayProps = {
  challenge: NumberChallenge;
  onSpeakPrompt?: () => void;
  interactiveGrid?: boolean;
};

function renderModeIcon(mode: string, className = "h-5 w-5") {
  switch (mode) {
    case "recognition":
      return <RecognitionModeIcon className={className} />;
    case "count_match":
      return <CountMatchModeIcon className={className} />;
    case "sequence":
      return <SequenceModeIcon className={className} />;
    case "more_or_less":
      return <MoreLessModeIcon className={className} />;
    default:
      return <RecognitionModeIcon className={className} />;
  }
}

export function ChallengeDisplay({
  challenge,
  onSpeakPrompt,
  interactiveGrid = true,
}: ChallengeDisplayProps) {
  const meta = MODE_METADATA[challenge.mode] || MODE_METADATA.recognition;

  return (
    <div className="w-full flex flex-col items-center text-center">
      {/* Mode Tag & Speaker Button */}
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-black uppercase tracking-wider ${meta.badgeColor}`}
        >
          {renderModeIcon(challenge.mode, "h-4 w-4")}
          <span>{meta.title}</span>
        </span>

        {onSpeakPrompt && (
          <button
            type="button"
            onClick={onSpeakPrompt}
            title="Read question out loud"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-[#002f76] shadow-sm hover:bg-slate-50 hover:scale-105 active:scale-95 transition"
            aria-label="Listen to question"
          >
            <SpeakerIcon className="h-4.5 w-4.5 text-[#002f76]" />
          </button>
        )}
      </div>

      {/* Main Question / Prompt Text */}
      <h2 className="font-[family-name:var(--font-fredoka)] text-3xl sm:text-4xl md:text-5xl font-black text-[#002f76] tracking-tight max-w-3xl leading-tight">
        {challenge.promptText}
      </h2>

      {/* Mode-Specific Presentation */}
      <div className="mt-6 w-full">
        {/* 1. RECOGNITION */}
        {challenge.mode === "recognition" && (
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative inline-flex items-center justify-center rounded-[36px] border-[4px] border-sky-300 bg-gradient-to-b from-white via-sky-50 to-blue-100 px-14 py-8 shadow-[0_12px_32px_rgba(37,99,235,0.18)]">
              {/* Decorative corner stars */}
              <StarIcon className="absolute -top-3.5 -left-3.5 h-8 w-8 text-amber-400 drop-shadow animate-pulse" />
              <StarIcon className="absolute -bottom-3.5 -right-3.5 h-8 w-8 text-amber-400 drop-shadow animate-pulse" />
              <span className="font-[family-name:var(--font-fredoka)] text-7xl sm:text-8xl md:text-9xl font-black text-[#1d4ed8] drop-shadow-md">
                {challenge.targetNumber}
              </span>
            </div>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-sky-100/80 px-4 py-1.5 text-xs sm:text-sm font-black text-sky-900 shadow-2xs">
              <SparklesIcon className="h-4 w-4 text-sky-600" />
              <span>Spot and tap the matching number card below!</span>
            </p>
          </div>
        )}

        {/* 2. COUNT & MATCH */}
        {challenge.mode === "count_match" && (
          <div className="flex flex-col items-center justify-center w-full">
            <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-b from-white via-emerald-50/50 to-emerald-100/30 p-4 sm:p-6 shadow-inner w-full flex justify-center">
              <DotGrid
                count={challenge.dotCount || challenge.targetNumber}
                iconId={challenge.dotIconId || "star"}
                interactive={interactiveGrid}
                size="lg"
              />
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-4 py-1.5 text-xs sm:text-sm font-black text-emerald-900 shadow-2xs">
              <SparklesIcon className="h-4 w-4 text-emerald-600" />
              <span>Count the items above, then tap your answer!</span>
            </p>
          </div>
        )}

        {/* 3. SEQUENCE */}
        {challenge.mode === "sequence" && challenge.sequence && (
          <div className="flex flex-col items-center justify-center py-2">
            {/* Stepping Stones Trail */}
            <div className="relative flex items-center justify-center gap-2 sm:gap-4 flex-wrap p-4 rounded-3xl bg-gradient-to-r from-amber-50/60 via-sky-50/60 to-purple-50/60 border-2 border-dashed border-sky-200">
              {challenge.sequence.map((item, idx) => {
                const isBlank = item.value === null;
                const isLast = idx === (challenge.sequence?.length || 0) - 1;
                return (
                  <div key={idx} className="flex items-center gap-2 sm:gap-4">
                    <div
                      className={`relative flex h-22 w-22 sm:h-28 sm:w-28 items-center justify-center rounded-[28px] border-[3.5px] font-[family-name:var(--font-fredoka)] text-4xl sm:text-6xl font-black transition-all ${
                        isBlank
                          ? "border-amber-400 bg-gradient-to-b from-amber-100 via-amber-200 to-amber-300 text-amber-900 shadow-[0_12px_28px_rgba(245,158,11,0.35)] scale-110 ring-4 ring-amber-300/60 animate-bounce"
                          : "border-sky-300 bg-gradient-to-b from-white via-sky-50 to-blue-100 text-[#1d4ed8] shadow-[0_8px_20px_rgba(37,99,235,0.14)]"
                      }`}
                    >
                      {isBlank ? (
                        <div className="flex flex-col items-center">
                          <span className="drop-shadow-sm">?</span>
                          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-900/80 -mt-1">
                            Missing
                          </span>
                        </div>
                      ) : (
                        <span className="drop-shadow-sm">{item.display}</span>
                      )}

                      {/* Number stone badge */}
                      <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-white shadow">
                        {idx + 1}
                      </span>
                    </div>

                    {!isLast && (
                      <ArrowRightIcon className="h-5 w-5 sm:h-6 sm:w-6 text-sky-400/80 shrink-0 hidden xs:block" />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-4 py-1.5 text-xs sm:text-sm font-black text-amber-900 shadow-2xs">
              <SparklesIcon className="h-4 w-4 text-amber-600" />
              <span>Follow the trail! Which number fills the question mark?</span>
            </p>
          </div>
        )}

        {/* 4. MORE OR LESS */}
        {challenge.mode === "more_or_less" && challenge.comparison && (
          <div className="flex flex-col items-center py-2 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto w-full relative">
              {/* Group A */}
              <div className="rounded-[30px] border-[3px] border-sky-300 bg-gradient-to-b from-white via-sky-50 to-blue-50 p-6 shadow-md flex flex-col items-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 text-white px-3.5 py-1 text-xs font-black uppercase tracking-wider mb-3 shadow-2xs">
                  Group A
                </span>
                <DotGrid
                  count={challenge.comparison.groupA.count}
                  iconId={challenge.comparison.groupA.iconId}
                  interactive={false}
                  size="md"
                />
                <span className="mt-4 text-sm sm:text-base font-black text-[#1e293b]">
                  {challenge.comparison.groupA.count} {challenge.comparison.groupA.label}
                </span>
              </div>

              {/* Group B */}
              <div className="rounded-[30px] border-[3px] border-purple-300 bg-gradient-to-b from-white via-purple-50 to-fuchsia-50 p-6 shadow-md flex flex-col items-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-600 text-white px-3.5 py-1 text-xs font-black uppercase tracking-wider mb-3 shadow-2xs">
                  Group B
                </span>
                <DotGrid
                  count={challenge.comparison.groupB.count}
                  iconId={challenge.comparison.groupB.iconId}
                  interactive={false}
                  size="md"
                />
                <span className="mt-4 text-sm sm:text-base font-black text-[#1e293b]">
                  {challenge.comparison.groupB.count} {challenge.comparison.groupB.label}
                </span>
              </div>
            </div>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-purple-100/80 px-4 py-1.5 text-xs sm:text-sm font-black text-purple-900 shadow-2xs">
              <SparklesIcon className="h-4 w-4 text-purple-600" />
              <span>Compare Group A and Group B, then tap the right choice!</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
