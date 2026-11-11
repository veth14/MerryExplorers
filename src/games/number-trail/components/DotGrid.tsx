"use client";

import { useState, useEffect } from "react";
import { GameAudio } from "@/lib/game-audio";
import {
  AppleSvg,
  StarCounterSvg,
  BalloonSvg,
  FlowerSvg,
  GemSvg,
  CarSvg,
} from "./GameIcons";

type DotGridProps = {
  count: number;
  iconId?: string;
  interactive?: boolean;
  onCountProgress?: (counted: number) => void;
  size?: "md" | "lg";
};

function renderVectorItem(iconId: string, className: string) {
  switch (iconId) {
    case "apple":
      return <AppleSvg className={className} />;
    case "star":
      return <StarCounterSvg className={className} />;
    case "balloon":
      return <BalloonSvg className={className} />;
    case "flower":
      return <FlowerSvg className={className} />;
    case "gem":
      return <GemSvg className={className} />;
    case "car":
      return <CarSvg className={className} />;
    default:
      return <StarCounterSvg className={className} />;
  }
}

export function DotGrid({
  count,
  iconId = "star",
  interactive = true,
  onCountProgress,
  size = "lg",
}: DotGridProps) {
  const [tappedIndices, setTappedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    setTappedIndices(new Set());
  }, [count, iconId]);

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
    <div className="flex w-full flex-col items-center">
      <div
        className="flex w-full flex-wrap justify-center gap-2.5 py-2.5 sm:gap-3.5 sm:py-3"
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
              className={`relative flex items-center justify-center rounded-2xl border-2 transition-all duration-200 select-none shadow-xs ${
                isLg
                  ? "h-16 w-16 sm:h-20 sm:w-20 p-2.5"
                  : "h-14 w-14 sm:h-16 sm:w-16 p-2"
              } ${
                isTapped
                  ? "border-[#10b981] bg-[#ecfdf5] scale-110 shadow-md ring-4 ring-[#10b981]/25"
                  : "border-[#e2e8f0] bg-white hover:-translate-y-1 hover:scale-105 hover:border-sky-300 hover:shadow-md active:scale-95"
              }`}
            >
              {renderVectorItem(iconId, isLg ? "h-full w-full" : "h-full w-full")}
              {isTapped && (
                <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#10b981] text-xs font-black text-white shadow-md">
                  {idx + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {interactive && count > 0 && (
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-bold text-[#57719b]">
          <span>Tap items to count along:</span>
          <span className="font-black text-[#002f76]">
            {tappedIndices.size} / {count} counted
          </span>
        </div>
      )}
    </div>
  );
}
