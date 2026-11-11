import React from "react";

type IconProps = {
  className?: string;
  size?: number;
};

export function SpeakerIcon({ className = "h-5 w-5", size }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

export function MuteIcon({ className = "h-5 w-5", size }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

export function VoiceIcon({ className = "h-5 w-5", size }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

export function VoiceOffIcon({ className = "h-5 w-5", size }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <path d="M5 10v2a7 7 0 0 0 12 5" />
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

export function StarIcon({ className = "h-5 w-5", size }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="#ffb800"
      stroke="#d97706"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function TrophyIcon({ className = "h-5 w-5", size }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" fill="#fef3c7" />
    </svg>
  );
}

export function FlagIcon({ className = "h-5 w-5", size }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="#002f76" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

export function FlameIcon({ className = "h-5 w-5", size }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="#f97316"
      stroke="#c2410c"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

export function SparklesIcon({ className = "h-5 w-5", size }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "h-4 w-4", size }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function ArrowLeftIcon({ className = "h-4 w-4", size }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export function CheckIcon({ className = "h-4 w-4", size }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function CloseIcon({ className = "h-4 w-4", size }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ─── Mode Specific SVG Icons ─── */

export function RecognitionModeIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <rect x="6" y="6" width="36" height="36" rx="10" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2.5" />
      <text x="24" y="32" textAnchor="middle" fontSize="24" fontWeight="900" fill="#1d4ed8" fontFamily="sans-serif">
        123
      </text>
    </svg>
  );
}

export function CountMatchModeIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <rect x="6" y="6" width="36" height="36" rx="10" fill="#d1fae5" stroke="#10b981" strokeWidth="2.5" />
      <circle cx="16" cy="18" r="5" fill="#ef4444" />
      <circle cx="32" cy="18" r="5" fill="#ef4444" />
      <circle cx="24" cy="31" r="5" fill="#ef4444" />
    </svg>
  );
}

export function SequenceModeIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <rect x="6" y="6" width="36" height="36" rx="10" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2.5" />
      <path d="M12 36 L24 24 L36 12" stroke="#7c3aed" strokeWidth="3" strokeDasharray="3 3" />
      <circle cx="14" cy="34" r="4" fill="#7c3aed" />
      <circle cx="24" cy="24" r="4" fill="#7c3aed" />
      <circle cx="34" cy="14" r="5" fill="#ffb800" stroke="#b45309" strokeWidth="2" />
    </svg>
  );
}

export function MoreLessModeIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <rect x="6" y="6" width="36" height="36" rx="10" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2.5" />
      <path d="M24 10 L24 38 M14 38 L34 38" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 18 L36 14" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
      <circle cx="12" cy="24" r="4" fill="#b45309" />
      <circle cx="36" cy="20" r="4" fill="#b45309" />
    </svg>
  );
}

/* ─── Vector Counter Items for DotGrid ─── */

export function AppleSvg({ className = "h-8 w-8" }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <path d="M20 7 C21 4 25 3 26 5 C27 7 24 9 20 8" stroke="#15803d" strokeWidth="2.5" fill="#22c55e" strokeLinecap="round" />
      <path d="M19 8 C18 10 18 13 18 14" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M20 13 C14 11 8 16 8 23 C8 32 16 35 20 35 C24 35 32 32 32 23 C32 16 26 11 20 13 Z"
        fill="#ef4444"
        stroke="#b91c1c"
        strokeWidth="2"
      />
      <ellipse cx="14" cy="18" rx="2.5" ry="4" fill="#fca5a5" opacity="0.6" transform="rotate(-20 14 18)" />
    </svg>
  );
}

export function StarCounterSvg({ className = "h-8 w-8" }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <polygon
        points="20 4 24.5 14 35 15.5 27.5 23 29.5 33.5 20 28 10.5 33.5 12.5 23 5 15.5 15.5 14 20 4"
        fill="#fbbf24"
        stroke="#d97706"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="17" cy="18" r="2" fill="#78350f" />
      <circle cx="23" cy="18" r="2" fill="#78350f" />
      <path d="M17 23 Q20 26 23 23" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function BalloonSvg({ className = "h-8 w-8" }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <ellipse cx="20" cy="18" rx="12" ry="14" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
      <polygon points="18 32 22 32 20 34" fill="#1d4ed8" />
      <path d="M20 34 Q18 36 21 38" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <ellipse cx="16" cy="13" rx="2" ry="5" fill="#93c5fd" opacity="0.6" transform="rotate(-25 16 13)" />
    </svg>
  );
}

export function FlowerSvg({ className = "h-8 w-8" }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <circle cx="20" cy="13" r="5" fill="#f472b6" stroke="#db2777" strokeWidth="1.5" />
      <circle cx="27" cy="20" r="5" fill="#f472b6" stroke="#db2777" strokeWidth="1.5" />
      <circle cx="20" cy="27" r="5" fill="#f472b6" stroke="#db2777" strokeWidth="1.5" />
      <circle cx="13" cy="20" r="5" fill="#f472b6" stroke="#db2777" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="5.5" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
    </svg>
  );
}

export function GemSvg({ className = "h-8 w-8" }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <polygon points="12 14 28 14 34 22 20 34 6 22" fill="#a855f7" stroke="#7e22ce" strokeWidth="2" strokeLinejoin="round" />
      <polyline points="6 22 15 14 20 34 25 14 34 22" stroke="#7e22ce" strokeWidth="1.5" fill="none" />
      <line x1="6" y1="22" x2="34" y2="22" stroke="#7e22ce" strokeWidth="1.5" />
    </svg>
  );
}

export function CarSvg({ className = "h-8 w-8" }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <path d="M6 25 L10 20 L28 20 L33 25 L34 29 L5 29 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="2" />
      <path d="M12 20 L15 14 L24 14 L27 20 Z" fill="#bae6fd" stroke="#0369a1" strokeWidth="1.8" />
      <circle cx="12" cy="29" r="4" fill="#334155" stroke="#fff" strokeWidth="2" />
      <circle cx="27" cy="29" r="4" fill="#334155" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

/* ─── Vector Animal Avatar Badge ─── */

type AnimalBadgeProps = {
  name: string;
  color: string;
  bgLight?: string;
  borderColor?: string;
  className?: string;
};

export function AnimalAvatarBadge({
  name,
  color,
  bgLight = "#fef3c7",
  borderColor = "#f59e0b",
  className = "h-11 w-11",
}: AnimalBadgeProps) {
  const lower = name.toLowerCase();
  const isLion = lower.includes("lion");
  const isBunny = lower.includes("bunny") || lower.includes("rabbit");
  const isFox = lower.includes("fox");
  const isPanda = lower.includes("panda") || lower.includes("bear");
  const isFrog = lower.includes("frog");
  const isPenguin = lower.includes("penguin") || lower.includes("bird") || lower.includes("owl");
  const isPuppy = lower.includes("puppy") || lower.includes("dog");

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-2xl border-2 shadow-sm ${className}`}
      style={{ backgroundColor: bgLight, borderColor: borderColor }}
      aria-label={name}
      title={name}
    >
      <svg viewBox="0 0 48 48" className="h-full w-full p-1" aria-hidden="true">
        {/* Base head circle */}
        <circle cx="24" cy="26" r="14" fill={color} opacity="0.9" />

        {isLion ? (
          <>
            {/* Mane */}
            <circle cx="24" cy="25" r="18" fill="#d97706" opacity="0.4" />
            <circle cx="24" cy="26" r="13" fill="#fef3c7" />
            <circle cx="19" cy="24" r="2" fill="#78350f" />
            <circle cx="29" cy="24" r="2" fill="#78350f" />
            <polygon points="24 27 21 30 27 30" fill="#d97706" />
          </>
        ) : isBunny ? (
          <>
            {/* Bunny ears */}
            <ellipse cx="18" cy="11" rx="3.5" ry="9" fill={color} transform="rotate(-10 18 11)" />
            <ellipse cx="30" cy="11" rx="3.5" ry="9" fill={color} transform="rotate(10 30 11)" />
            <ellipse cx="18" cy="11" rx="1.8" ry="6" fill="#fce7f3" transform="rotate(-10 18 11)" />
            <ellipse cx="30" cy="11" rx="1.8" ry="6" fill="#fce7f3" transform="rotate(10 30 11)" />
            <circle cx="19" cy="25" r="2" fill="#1f2937" />
            <circle cx="29" cy="25" r="2" fill="#1f2937" />
            <circle cx="24" cy="29" r="2" fill="#ec4899" />
          </>
        ) : isFox ? (
          <>
            {/* Fox ears */}
            <polygon points="12 20 17 8 22 18" fill="#ea580c" />
            <polygon points="26 18 31 8 36 20" fill="#ea580c" />
            <polygon points="14 18 17 11 20 17" fill="#fff" />
            <polygon points="28 17 31 11 34 18" fill="#fff" />
            <circle cx="19" cy="25" r="2" fill="#1f2937" />
            <circle cx="29" cy="25" r="2" fill="#1f2937" />
            <polygon points="24 28 21 31 27 31" fill="#1f2937" />
          </>
        ) : isPanda ? (
          <>
            {/* Panda ears */}
            <circle cx="13" cy="16" r="4.5" fill="#1f2937" />
            <circle cx="35" cy="16" r="4.5" fill="#1f2937" />
            <circle cx="24" cy="26" r="14" fill="#ffffff" />
            <ellipse cx="18" cy="24" rx="3.5" ry="4.5" fill="#1f2937" transform="rotate(15 18 24)" />
            <ellipse cx="30" cy="24" rx="3.5" ry="4.5" fill="#1f2937" transform="rotate(-15 30 24)" />
            <circle cx="19" cy="24" r="1.5" fill="#fff" />
            <circle cx="29" cy="24" r="1.5" fill="#fff" />
            <ellipse cx="24" cy="30" rx="2.5" ry="2" fill="#1f2937" />
          </>
        ) : isFrog ? (
          <>
            {/* Frog big eyes */}
            <circle cx="15" cy="16" r="6" fill="#22c55e" />
            <circle cx="33" cy="16" r="6" fill="#22c55e" />
            <circle cx="15" cy="16" r="3" fill="#fff" />
            <circle cx="33" cy="16" r="3" fill="#fff" />
            <circle cx="15" cy="16" r="1.5" fill="#1f2937" />
            <circle cx="33" cy="16" r="1.5" fill="#1f2937" />
            <path d="M18 31 Q24 35 30 31" stroke="#15803d" strokeWidth="2" strokeLinecap="round" fill="none" />
          </>
        ) : isPenguin ? (
          <>
            <circle cx="24" cy="26" r="14" fill="#0284c7" />
            <ellipse cx="24" cy="28" rx="9" ry="11" fill="#fff" />
            <circle cx="19" cy="23" r="2" fill="#1f2937" />
            <circle cx="29" cy="23" r="2" fill="#1f2937" />
            <polygon points="24 26 21 29 27 29" fill="#f59e0b" />
          </>
        ) : (
          <>
            {/* Puppy / Friendly generic pet */}
            <ellipse cx="12" cy="24" rx="3.5" ry="7" fill={color} transform="rotate(20 12 24)" />
            <ellipse cx="36" cy="24" rx="3.5" ry="7" fill={color} transform="rotate(-20 36 24)" />
            <circle cx="19" cy="24" r="2" fill="#1f2937" />
            <circle cx="29" cy="24" r="2" fill="#1f2937" />
            <ellipse cx="24" cy="29" rx="2.5" ry="2" fill="#78350f" />
            <path d="M22 31 Q24 33 26 31" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </>
        )}
      </svg>
    </div>
  );
}
