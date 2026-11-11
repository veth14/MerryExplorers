"use client";

import { NumberChoice } from "../types";
import { CheckIcon, CloseIcon } from "./GameIcons";

type NumberCardProps = {
  choice: NumberChoice;
  onSelect: (choice: NumberChoice) => void;
  status?: "idle" | "correct" | "wrong";
  disabled?: boolean;
};

export function NumberCard({
  choice,
  onSelect,
  status = "idle",
  disabled = false,
}: NumberCardProps) {
  const isCorrect = status === "correct";
  const isWrong = status === "wrong";

  let bgClass = "bg-white border-[#dbe4f1] text-[#002f76] hover:border-[#3b82f6] hover:shadow-[0_16px_32px_rgba(0,47,118,0.12)] hover:-translate-y-1";
  if (isCorrect) {
    bgClass = "bg-[#ecfdf5] border-[#10b981] text-[#065f46] shadow-[0_16px_36px_rgba(16,185,129,0.28)] scale-[1.02] ring-4 ring-[#34d399]/40";
  } else if (isWrong) {
    bgClass = "bg-[#fef2f2] border-[#f87171] text-[#991b1b] opacity-80 animate-[shake_0.4s_ease-in-out]";
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(choice)}
      disabled={disabled}
      className={`group relative flex min-h-[160px] w-full flex-col items-center justify-center rounded-[28px] border-3 p-6 sm:p-8 transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffb800] disabled:cursor-not-allowed ${bgClass}`}
      style={{
        borderColor: isCorrect ? "#10b981" : isWrong ? "#f87171" : undefined,
      }}
      aria-label={`Choose number ${choice.numeral}${choice.sublabel ? ` (${choice.sublabel})` : ""}`}
    >
      {/* Visual background gloss accent */}
      <span
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-slate-50/80 transition-transform group-hover:scale-125"
        aria-hidden="true"
      />

      {/* Main Numeral */}
      <span className="relative font-[family-name:var(--font-fredoka)] text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight select-none">
        {choice.label || choice.numeral}
      </span>

      {/* Word Sublabel (e.g. "FIVE") */}
      {choice.sublabel && (
        <span className="relative mt-2 text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#57719b] group-hover:text-[#002f76]">
          {choice.sublabel}
        </span>
      )}

      {/* Status icon badge */}
      {isCorrect && (
        <span className="absolute -top-3.5 -right-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#10b981] text-white shadow-lg animate-bounce">
          <CheckIcon className="h-5 w-5" />
        </span>
      )}
      {isWrong && (
        <span className="absolute -top-3.5 -right-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#ef4444] text-white shadow-lg">
          <CloseIcon className="h-5 w-5" />
        </span>
      )}
    </button>
  );
}
