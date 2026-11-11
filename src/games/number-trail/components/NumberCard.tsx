"use client";

import { NumberChoice } from "../types";
import { CheckIcon, CloseIcon } from "./GameIcons";

type NumberCardProps = {
  choice: NumberChoice;
  onSelect: (choice: NumberChoice) => void;
  status?: "idle" | "correct" | "wrong";
  disabled?: boolean;
  colorIndex?: number;
};

/** Vibrant card colour palette — one per slot in the answer grid */
const CARD_PALETTES = [
  {
    bg: "linear-gradient(145deg, #dbeafe 0%, #eff6ff 100%)",
    border: "#93c5fd",
    text: "#1e40af",
    glow: "rgba(59,130,246,0.18)",
    hoverBorder: "#3b82f6",
  },
  {
    bg: "linear-gradient(145deg, #fce7f3 0%, #fdf2f8 100%)",
    border: "#f9a8d4",
    text: "#9d174d",
    glow: "rgba(236,72,153,0.18)",
    hoverBorder: "#ec4899",
  },
  {
    bg: "linear-gradient(145deg, #d1fae5 0%, #ecfdf5 100%)",
    border: "#6ee7b7",
    text: "#065f46",
    glow: "rgba(16,185,129,0.18)",
    hoverBorder: "#10b981",
  },
  {
    bg: "linear-gradient(145deg, #fef3c7 0%, #fffbeb 100%)",
    border: "#fcd34d",
    text: "#78350f",
    glow: "rgba(245,158,11,0.18)",
    hoverBorder: "#f59e0b",
  },
];

export function NumberCard({
  choice,
  onSelect,
  status = "idle",
  disabled = false,
  colorIndex = 0,
}: NumberCardProps) {
  const isCorrect = status === "correct";
  const isWrong = status === "wrong";

  const palette = CARD_PALETTES[colorIndex % CARD_PALETTES.length];

  const idleStyle: React.CSSProperties = {
    background: palette.bg,
    borderColor: palette.border,
    color: palette.text,
    boxShadow: `0 4px 16px ${palette.glow}`,
  };
  const correctStyle: React.CSSProperties = {
    background: "linear-gradient(145deg, #d1fae5 0%, #ecfdf5 100%)",
    borderColor: "#10b981",
    color: "#065f46",
    boxShadow: "0 16px 36px rgba(16,185,129,0.30)",
  };
  const wrongStyle: React.CSSProperties = {
    background: "linear-gradient(145deg, #fee2e2 0%, #fef2f2 100%)",
    borderColor: "#f87171",
    color: "#991b1b",
    opacity: 0.85,
  };

  const appliedStyle = isCorrect ? correctStyle : isWrong ? wrongStyle : idleStyle;

  const stateClasses = isCorrect
    ? "scale-[1.03] ring-4 ring-[#34d399]/40"
    : isWrong
    ? "animate-[shake_0.4s_ease-in-out]"
    : "hover:-translate-y-1.5 hover:shadow-xl";

  const text = String(choice.label || choice.numeral);
  const isWord = isNaN(Number(text));

  let fontClass = "text-5xl sm:text-6xl";
  if (isWord) {
    if (text.length > 7) {
      fontClass = "text-xl sm:text-2xl tracking-tight";
    } else if (text.length > 4) {
      fontClass = "text-2xl sm:text-3xl tracking-wide";
    } else {
      fontClass = "text-3xl sm:text-4xl tracking-wider";
    }
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(choice)}
      disabled={disabled}
      className={`group relative flex min-h-[105px] sm:min-h-[125px] w-full flex-col items-center justify-center rounded-[24px] border-[3px] p-3 sm:p-5 transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffb800] disabled:cursor-not-allowed ${stateClasses}`}
      style={appliedStyle}
      aria-label={`Choose number ${choice.numeral}${choice.sublabel ? ` (${choice.sublabel})` : ""}`}
    >
      {/* Gloss highlight blob */}
      <span
        className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full opacity-50 transition-transform group-hover:scale-125"
        style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      {/* Main Label (Word e.g. "TEN" or Numeral e.g. "10") */}
      <span className={`relative font-[family-name:var(--font-fredoka)] font-black select-none drop-shadow-sm leading-tight text-center ${fontClass}`}>
        {choice.label || choice.numeral}
      </span>

      {/* Sublabel */}
      {choice.sublabel && (
        <span
          className={
            isWord
              ? "relative mt-1.5 inline-flex items-center justify-center rounded-full bg-white/75 px-2.5 py-0.5 text-xs font-black text-slate-700 shadow-2xs group-hover:bg-white"
              : "relative mt-1 text-[11px] sm:text-xs font-black uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity"
          }
        >
          {choice.sublabel}
        </span>
      )}

      {/* Status icon badge */}
      {isCorrect && (
        <span className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#10b981] text-white shadow-lg animate-bounce">
          <CheckIcon className="h-4.5 w-4.5" />
        </span>
      )}
      {isWrong && (
        <span className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#ef4444] text-white shadow-lg">
          <CloseIcon className="h-4.5 w-4.5" />
        </span>
      )}
    </button>
  );
}
