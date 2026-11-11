"use client";

import { NumberChoice } from "../types";

type NumberCardProps = {
  choice: NumberChoice;
  onSelect: (choice: NumberChoice) => void;
  status?: "idle" | "correct" | "wrong";
  disabled?: boolean;
  accentColor?: string;
};

export function NumberCard({
  choice,
  onSelect,
  status = "idle",
  disabled = false,
  accentColor = "#002f76",
}: NumberCardProps) {
  const isCorrect = status === "correct";
  const isWrong = status === "wrong";

  let bgClass = "bg-white border-[#dbe4f1] text-[#002f76] hover:border-[#3b82f6] hover:shadow-[0_12px_28px_rgba(0,47,118,0.12)] hover:-translate-y-1";
  if (isCorrect) {
    bgClass = "bg-[#d1fae5] border-[#10b981] text-[#065f46] shadow-[0_14px_32px_rgba(16,185,129,0.28)] scale-[1.03] ring-4 ring-[#34d399]/40";
  } else if (isWrong) {
    bgClass = "bg-[#fee2e2] border-[#f87171] text-[#991b1b] opacity-80 animate-[shake_0.4s_ease-in-out]";
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(choice)}
      disabled={disabled}
      className={`group relative flex min-h-[140px] w-full flex-col items-center justify-center rounded-3xl border-3 p-5 sm:p-6 transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffb800] disabled:cursor-not-allowed ${bgClass}`}
      style={{
        borderColor: isCorrect ? "#10b981" : isWrong ? "#f87171" : undefined,
      }}
      aria-label={`Choose number ${choice.numeral}${choice.sublabel ? ` (${choice.sublabel})` : ""}`}
    >
      {/* Visual background gloss effect */}
      <span
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 transition-transform group-hover:scale-125"
        aria-hidden="true"
      />

      {/* Main Numeral */}
      <span className="relative font-[family-name:var(--font-fredoka)] text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight">
        {choice.label || choice.numeral}
      </span>

      {/* Word Sublabel (e.g. "FIVE") */}
      {choice.sublabel && (
        <span className="relative mt-1 text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#57719b] group-hover:text-[#002f76]">
          {choice.sublabel}
        </span>
      )}

      {/* Status icon badge */}
      {isCorrect && (
        <span className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#10b981] text-white shadow-md animate-bounce">
          ✓
        </span>
      )}
      {isWrong && (
        <span className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#ef4444] text-white shadow-md">
          ✕
        </span>
      )}
    </button>
  );
}

