"use client";

import React from "react";
import { m, useReducedMotion } from "framer-motion";

const SUN_YELLOW = "#ffd23f";
const NAVY_COLOR = "#0b2a82";
const BLUE_COLOR = "#1f7ae0";
const ORANGE_COLOR = "#ff8a1f";

// ─── Smiling Sun with Spinning Rays ──────────────────────────────────────────
export function PlayfulSun({ size = 130, className = "" }: { size?: number; className?: string }) {
  const reduce = useReducedMotion();

  return (
    <div
      className={`relative inline-block select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 120 120" className="overflow-visible">
        {/* Spinning Sun Rays */}
        <g
          className={reduce ? "" : "me-spin"}
          style={{ transformOrigin: "60px 60px" }}
          stroke={SUN_YELLOW}
          strokeWidth="9"
          strokeLinecap="round"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={i} x1="60" y1="8" x2="60" y2="20" transform={`rotate(${i * 30} 60 60)`} />
          ))}
        </g>
        {/* Sun Face */}
        <circle cx="60" cy="60" r="31" fill="#ffe27a" stroke="#f6b91c" strokeWidth="4" />
        {/* Eyes */}
        <circle cx="49" cy="55" r="3.2" fill={NAVY_COLOR} />
        <circle cx="71" cy="55" r="3.2" fill={NAVY_COLOR} />
        {/* Rosy Cheeks */}
        <circle cx="42" cy="66" r="5" fill="#ffa8a8" opacity=".75" />
        <circle cx="78" cy="66" r="5" fill="#ffa8a8" opacity=".75" />
        {/* Happy Smile */}
        <path d="M50 67 Q60 78 70 67" fill="none" stroke={NAVY_COLOR} strokeWidth="3.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ─── Soft Fluffy Cloud ───────────────────────────────────────────────────────
export function PlayfulCloud({
  width = 160,
  className = "",
  opacity = 0.95,
}: {
  width?: number;
  className?: string;
  opacity?: number;
}) {
  return (
    <div
      className={`relative inline-block select-none pointer-events-none ${className}`}
      style={{ width, opacity }}
      aria-hidden="true"
    >
      <svg width="100%" viewBox="0 0 160 90" className="overflow-visible drop-shadow-[0_8px_16px_rgba(0,51,160,0.06)]">
        <g fill="#fff" stroke="#fff" strokeWidth="8" strokeLinejoin="round">
          <circle cx="45" cy="55" r="26" />
          <circle cx="80" cy="38" r="32" />
          <circle cx="116" cy="55" r="26" />
          <rect x="45" y="55" width="72" height="26" />
        </g>
        <g fill="#fff" stroke="#d4ecfb" strokeWidth="2.5">
          <circle cx="45" cy="55" r="26" />
          <circle cx="80" cy="38" r="32" />
          <circle cx="116" cy="55" r="26" />
        </g>
        <rect x="40" y="52" width="82" height="30" fill="#fff" />
      </svg>
    </div>
  );
}

// ─── Paper Airplane with Dotted Flight Trail ─────────────────────────────────
export function PlayfulAirplane({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <div className={`relative inline-block select-none pointer-events-none ${className}`} aria-hidden="true">
      {/* Flight trail loop */}
      <svg
        width="220"
        height="120"
        viewBox="0 0 220 120"
        fill="none"
        className="overflow-visible"
      >
        <path
          d="M 10 95 C 60 110, 85 40, 125 50 C 150 56, 155 85, 140 92 C 120 98, 115 70, 160 40 L 195 20"
          stroke="#0050d5"
          strokeWidth="2.5"
          strokeDasharray="6 6"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>

      {/* The plane */}
      <m.div
        animate={reduce ? {} : { y: [-3, 3, -3], rotate: [-2, 2, -2] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-3 right-0"
      >
        <svg width="60" viewBox="0 0 100 80" className="drop-shadow-md">
          <path d="M6 36 L94 6 L66 74 L50 46 Z" fill="#e8f5ff" stroke="#fff" strokeWidth="7" strokeLinejoin="round" />
          <path d="M6 36 L94 6 L66 74 L50 46 Z" fill="#e8f5ff" stroke={BLUE_COLOR} strokeWidth="3.2" strokeLinejoin="round" />
          <path d="M94 6 L50 46 L56 62 Z" fill="#9fd0f5" stroke={BLUE_COLOR} strokeWidth="3.2" strokeLinejoin="round" />
        </svg>
      </m.div>
    </div>
  );
}

// ─── Twinkling Star Sticker ──────────────────────────────────────────────────
export function PlayfulStar({
  size = 28,
  rotate = 0,
  delay = 0,
  className = "",
}: {
  size?: number;
  rotate?: number;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <m.div
      animate={reduce ? {} : { scale: [1, 1.15, 1], rotate: [rotate - 4, rotate + 4, rotate - 4] }}
      transition={{ duration: 3.5, delay, repeat: Infinity, ease: "easeInOut" }}
      className={`inline-block select-none pointer-events-none drop-shadow-sm ${className}`}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotate}deg)` }}>
        <path
          d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"
          fill={SUN_YELLOW}
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinejoin="round"
          paintOrder="stroke"
        />
      </svg>
    </m.div>
  );
}

// ─── Cheerful Mini Rainbow ───────────────────────────────────────────────────
export function PlayfulRainbow({ width = 120, className = "" }: { width?: number; className?: string }) {
  const bands = ["#ef4444", "#ff9a1f", "#ffd23f", "#4cc35b", "#2f8bf0", "#7c4dcc"];
  const sticker = "drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff)";

  return (
    <div className={`relative inline-block select-none pointer-events-none ${className}`} style={{ width }} aria-hidden="true">
      <svg width="100%" viewBox="0 0 160 90" style={{ overflow: "visible", filter: sticker }}>
        {bands.map((c, i) => {
          const r = 68 - i * 7;
          return <path key={c} d={`M${80 - r} 70A${r} ${r} 0 0 1 ${80 + r} 70`} fill="none" stroke={c} strokeWidth="6" />;
        })}
        <g fill="#fff">
          <circle cx="14" cy="72" r="13" />
          <circle cx="30" cy="68" r="15" />
          <circle cx="26" cy="78" r="12" />
          <circle cx="132" cy="72" r="13" />
          <circle cx="148" cy="68" r="12" />
          <circle cx="140" cy="78" r="12" />
        </g>
      </svg>
    </div>
  );
}

// ─── Washi Tape Accent (for photo frames & cards) ────────────────────────────
export function WashiTape({
  color = "#ffd23f",
  width = 75,
  tilt = -6,
  className = "",
}: {
  color?: string;
  width?: number;
  tilt?: number;
  className?: string;
}) {
  return (
    <div
      className={`absolute select-none pointer-events-none z-20 ${className}`}
      style={{
        width,
        height: 22,
        backgroundColor: color,
        opacity: 0.85,
        transform: `rotate(${tilt}deg)`,
        clipPath: "polygon(0% 0%, 97% 2%, 100% 98%, 3% 100%, 0% 0%)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
      }}
      aria-hidden="true"
    />
  );
}

// ─── Cloud Wave Section Divider ──────────────────────────────────────────────
export function CloudSectionDivider({
  fill = "#ffffff",
  className = "",
  flip = false,
}: {
  fill?: string;
  className?: string;
  flip?: boolean;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden leading-none z-10 pointer-events-none ${className}`}
      style={{ transform: flip ? "rotate(180deg)" : "none" }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1200 80"
        preserveAspectRatio="none"
        className="relative block w-full h-[36px] sm:h-[50px] lg:h-[65px]"
      >
        <path
          d="M0,0 C150,55 350,-25 500,35 C650,85 850,5 1000,45 C1100,70 1170,30 1200,20 L1200,80 L0,80 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}

// ─── Playful Cloud Puffs Transition Divider ─────────────────────────────────
export function CloudPuffsDivider({
  fill = "#ffffff",
  className = "",
  flip = false,
}: {
  fill?: string;
  className?: string;
  flip?: boolean;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden leading-none z-10 pointer-events-none ${className}`}
      style={{ transform: flip ? "rotate(180deg)" : "none" }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        className="relative block w-full h-[28px] sm:h-[40px] lg:h-[54px]"
      >
        <path
          d="M0,45 Q100,10 200,40 Q300,5 400,38 Q500,15 600,42 Q700,5 800,35 Q900,10 1000,40 Q1100,15 1200,45 L1200,60 L0,60 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}
