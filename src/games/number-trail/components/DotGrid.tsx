"use client";

import { useState, useEffect } from "react";
import { GameAudio } from "@/lib/game-audio";

type DotGridProps = {
  count: number;
  emoji?: string;
  interactive?: boolean;
  onCountProgress?: (counted: number) => void;
  size?: "md" | "lg";
};

export function DotGrid({
  count,
  emoji = "⭐",
  interactive = true,
  onCountProgress,
  size = "lg",
}: DotGridProps) {
  // Track which items the child has tapped/counted so far
  const [tappedIndices, setTappedIndices] = useState<Set<number>>(new Set());

  // Reset tapped items when count or emoji changes
  useEffect(() => {
    setTappedIndices(new Set());
  }, [count, emoji]);

  const handleTap = (index: number) => {
    if (!interactive) return;
    GameAudio.playPop();

    const next = new Set(tappedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setTappedIndices(next);
    onCountProgress?.(next.size);
  };

  const isLg = size === "lg";

  return (
    <div className="flex flex-col items-center">
      <div
        className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-xl py-2"
        role="group"
        aria-label={`Visual group of ${count} items`}
      >
        {Array.from({ length: count }).map((_, idx) => {
          const isTapped = tappedIndices.has(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleTap(idx)}
              aria-label={`Item ${idx + 1}`}
              className={`relative flex items-center justify-center rounded-2xl border-2 transition-all duration-200 select-none ${
                isLg
                  ? "h-14 w-14 sm:h-16 sm:w-16 text-3xl sm:text-4xl"
                  : "h-11 w-11 sm:h-12 sm:w-12 text-2xl sm:text-3xl"
              } ${
                isTapped
                  ? "border-[#10b981] bg-[#d1fae5] scale-110 shadow-md ring-2 ring-[#10b981]/30"
                  : "border-[#e2e8f0] bg-white hover:scale-105 hover:border-[#94a3b8] shadow-sm"
              }`}
            >
              <span className="leading-none">{emoji}</span>
              {/* Optional tiny count number pill when tapped */}
              {isTapped && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#10b981] text-[10px] font-black text-white shadow">
                  {idx + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {interactive && count > 0 && (
        <p className="mt-2 text-xs font-semibold text-[#6b7f9e]">
          Tip: Tap the items to count along! (Counted: {tappedIndices.size}/{count})
        </p>
      )}
    </div>
  );
}

