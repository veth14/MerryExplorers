"use client";

import { NumberChallenge } from "../types";
import { MODE_METADATA } from "../data";
import { DotGrid } from "./DotGrid";

type ChallengeDisplayProps = {
  challenge: NumberChallenge;
  onSpeakPrompt?: () => void;
  interactiveGrid?: boolean;
};

export function ChallengeDisplay({
  challenge,
  onSpeakPrompt,
  interactiveGrid = true,
}: ChallengeDisplayProps) {
  const meta = MODE_METADATA[challenge.mode] || MODE_METADATA.recognition;

  return (
    <div className="w-full flex flex-col items-center text-center">
      {/* Mode Tag & Speaker Icon */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${meta.badgeColor}`}
        >
          <span>{meta.icon}</span>
          <span>{meta.title}</span>
        </span>

        {onSpeakPrompt && (
          <button
            type="button"
            onClick={onSpeakPrompt}
            title="Read out loud"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#cbd5e1] bg-white text-[#002f76] hover:bg-[#f1f5f9] hover:scale-105 active:scale-95 shadow-sm transition"
          >
            🔊
          </button>
        )}
      </div>

      {/* Main Question / Prompt Text */}
      <h2 className="font-[family-name:var(--font-fredoka)] text-2xl sm:text-3xl md:text-4xl font-black text-[#002f76] tracking-tight max-w-xl">
        {challenge.promptText}
      </h2>

      {/* Mode-Specific Visual Presentation Area */}
      <div className="mt-4 w-full">
        {/* 1. RECOGNITION: Big number visual or speech indicator */}
        {challenge.mode === "recognition" && (
          <div className="flex flex-col items-center justify-center py-2">
            <div className="inline-flex items-center justify-center rounded-3xl border-2 border-dashed border-[#93c5fd] bg-[#eff6ff] px-8 py-5 shadow-sm">
              <span className="text-4xl sm:text-5xl font-[family-name:var(--font-fredoka)] font-black text-[#1d4ed8]">
                {challenge.targetNumber}
              </span>
            </div>
            <p className="mt-2 text-xs font-bold text-[#64748b]">
              Spot this number from the cards below!
            </p>
          </div>
        )}

        {/* 2. COUNT & MATCH: Dot Grid */}
        {challenge.mode === "count_match" && (
          <div className="flex justify-center">
            <DotGrid
              count={challenge.dotCount || challenge.targetNumber}
              emoji={challenge.dotEmoji || "⭐"}
              interactive={interactiveGrid}
              size="lg"
            />
          </div>
        )}

        {/* 3. SEQUENCE: Stepping stones sequence */}
        {challenge.mode === "sequence" && challenge.sequence && (
          <div className="flex flex-col items-center justify-center py-2">
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              {challenge.sequence.map((item, idx) => {
                const isBlank = item.value === null;
                return (
                  <div
                    key={idx}
                    className={`flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl border-3 font-[family-name:var(--font-fredoka)] text-3xl sm:text-4xl font-black shadow-sm transition-transform ${
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
            <p className="mt-3 text-xs font-bold text-[#64748b]">
              Which number fills the question mark?
            </p>
          </div>
        )}

        {/* 4. MORE OR LESS: Side-by-side groups */}
        {challenge.mode === "more_or_less" && challenge.comparison && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto py-2">
            {/* Group A */}
            <div className="rounded-3xl border-2 border-[#93c5fd] bg-white p-4 shadow-sm flex flex-col items-center">
              <span className="text-xs font-black uppercase tracking-wider text-[#1d4ed8] mb-1">
                Group A
              </span>
              <DotGrid
                count={challenge.comparison.groupA.count}
                emoji={challenge.comparison.groupA.emoji}
                interactive={false}
                size="md"
              />
              <span className="mt-2 text-xs font-bold text-[#64748b]">
                {challenge.comparison.groupA.count} {challenge.comparison.groupA.label}
              </span>
            </div>

            {/* Group B */}
            <div className="rounded-3xl border-2 border-[#c084fc] bg-white p-4 shadow-sm flex flex-col items-center">
              <span className="text-xs font-black uppercase tracking-wider text-[#7e22ce] mb-1">
                Group B
              </span>
              <DotGrid
                count={challenge.comparison.groupB.count}
                emoji={challenge.comparison.groupB.emoji}
                interactive={false}
                size="md"
              />
              <span className="mt-2 text-xs font-bold text-[#64748b]">
                {challenge.comparison.groupB.count} {challenge.comparison.groupB.label}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
