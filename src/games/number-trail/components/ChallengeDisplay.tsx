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
            <div className="inline-flex items-center justify-center rounded-[32px] border-3 border-dashed border-[#93c5fd] bg-[#eff6ff] px-12 py-6 shadow-xs">
              <span className="font-[family-name:var(--font-fredoka)] text-6xl sm:text-7xl md:text-8xl font-black text-[#1d4ed8]">
                {challenge.targetNumber}
              </span>
            </div>
            <p className="mt-3 text-xs sm:text-sm font-bold text-[#64748b]">
              Spot and tap the matching card below!
            </p>
          </div>
        )}

        {/* 2. COUNT & MATCH */}
        {challenge.mode === "count_match" && (
          <div className="flex justify-center w-full">
            <DotGrid
              count={challenge.dotCount || challenge.targetNumber}
              iconId={challenge.dotIconId || "star"}
              interactive={interactiveGrid}
              size="lg"
            />
          </div>
        )}

        {/* 3. SEQUENCE */}
        {challenge.mode === "sequence" && challenge.sequence && (
          <div className="flex flex-col items-center justify-center py-2">
            <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
              {challenge.sequence.map((item, idx) => {
                const isBlank = item.value === null;
                return (
                  <div
                    key={idx}
                    className={`flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl border-3 font-[family-name:var(--font-fredoka)] text-4xl sm:text-5xl font-black shadow-sm transition-transform ${
                      isBlank
                        ? "border-[#f59e0b] bg-[#fef3c7] text-[#b45309] animate-pulse ring-4 ring-[#fde68a]"
                        : "border-[#93c5fd] bg-white text-[#1d4ed8]"
                    }`}
                  >
                    {isBlank ? "?" : item.display}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs sm:text-sm font-bold text-[#64748b]">
              Which number fills the question mark?
            </p>
          </div>
        )}

        {/* 4. MORE OR LESS */}
        {challenge.mode === "more_or_less" && challenge.comparison && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto py-2">
            {/* Group A */}
            <div className="rounded-3xl border-2 border-[#93c5fd] bg-gradient-to-b from-white to-[#f0f7ff] p-5 shadow-xs flex flex-col items-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-800 mb-2">
                Group A
              </span>
              <DotGrid
                count={challenge.comparison.groupA.count}
                iconId={challenge.comparison.groupA.iconId}
                interactive={false}
                size="md"
              />
              <span className="mt-3 text-xs sm:text-sm font-black text-[#1e293b]">
                {challenge.comparison.groupA.count} {challenge.comparison.groupA.label}
              </span>
            </div>

            {/* Group B */}
            <div className="rounded-3xl border-2 border-[#c084fc] bg-gradient-to-b from-white to-[#faf5ff] p-5 shadow-xs flex flex-col items-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-purple-800 mb-2">
                Group B
              </span>
              <DotGrid
                count={challenge.comparison.groupB.count}
                iconId={challenge.comparison.groupB.iconId}
                interactive={false}
                size="md"
              />
              <span className="mt-3 text-xs sm:text-sm font-black text-[#1e293b]">
                {challenge.comparison.groupB.count} {challenge.comparison.groupB.label}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
