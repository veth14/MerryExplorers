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

// ─── Soft Fluffy Cloud (Generous ViewBox & Rounded Contours — Never Cut Off) ─
export function PlayfulCloud({
  width = 160,
  className = "",
  opacity = 0.95,
}: {
  width?: number;
  className?: string;
  opacity?: number;
}) {
  const height = Math.round((width * 120) / 200);

  return (
    <div
      className={`relative inline-block select-none pointer-events-none ${className}`}
      style={{ width, height, opacity }}
      aria-hidden="true"
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 200 120"
        className="overflow-visible"
        style={{ overflow: "visible" }}
      >
        <defs>
          <filter id="cloudSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0033a0" floodOpacity="0.07" />
          </filter>
        </defs>

        {/* Fluffy Seamless Cloud Body with full 360-degree rounded curves */}
        <path
          d="M 46 94 
             C 26 94, 12 80, 16 62 
             C 12 42, 32 26, 52 30 
             C 64 15, 88 8, 106 14 
             C 128 10, 150 20, 156 38 
             C 174 36, 188 50, 184 66 
             C 188 82, 172 94, 154 94 
             Z"
          fill="#ffffff"
          stroke="#bfe0fb"
          strokeWidth="3.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#cloudSoftShadow)"
        />

        {/* Subtle decorative inner puff highlights for volume */}
        <path
          d="M 52 40 C 62 30, 80 28, 92 34"
          fill="none"
          stroke="#e2f1fe"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 120 38 C 132 30, 146 32, 154 42"
          fill="none"
          stroke="#e2f1fe"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
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

// ─── Playful Hot Air Balloon (Navy & Gold Adventure Balloon) ─────────────────
export function PlayfulHotAirBalloon({
  width = 110,
  tilt = 12,
  floatDuration = 6,
  delay = 0,
  className = "",
}: {
  width?: number;
  tilt?: number;
  floatDuration?: number;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  // Natural aspect ratio is 150:220
  const height = Math.round((width * 220) / 150);

  return (
    <m.div
      animate={
        reduce
          ? {}
          : {
            y: [-8, 8, -8],
            rotate: [tilt - 2.5, tilt + 2.5, tilt - 2.5],
          }
      }
      transition={{
        duration: floatDuration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={`relative inline-block select-none pointer-events-none drop-shadow-[0_12px_24px_rgba(0,51,160,0.18)] ${className}`}
      style={{ width, height, transformOrigin: "center center" }}
      aria-hidden="true"
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 150 220"
        className="overflow-visible"
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          <clipPath id="hotAirBalloonEnvelopeClip">
            <path d="M 52 145 C 24 116 12 80 18 50 C 26 15 54 4 75 4 C 96 4 124 15 132 50 C 138 80 126 116 98 145 Z" />
          </clipPath>
        </defs>

        {/* Outer Envelope Base (Deep Navy Blue) */}
        <path
          d="M 52 145 C 24 116 12 80 18 50 C 26 15 54 4 75 4 C 96 4 124 15 132 50 C 138 80 126 116 98 145 Z"
          fill="#0b3a99"
          stroke="#061f59"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Clipped Gores & Stripes */}
        <g clipPath="url(#hotAirBalloonEnvelopeClip)">
          {/* Left Golden Yellow Gore */}
          <path
            d="M 75 4 C 54 4 36 24 33 55 C 30 85 45 118 61 145 L 75 145 C 60 116 48 85 50 55 C 52 30 65 12 75 4 Z"
            fill="#fbbd08"
            stroke="#061f59"
            strokeWidth="2.5"
          />

          {/* Right Golden Yellow Gore */}
          <path
            d="M 75 4 C 96 4 114 24 117 55 C 120 85 105 118 89 145 L 75 145 C 90 116 102 85 100 55 C 98 30 85 12 75 4 Z"
            fill="#fbbd08"
            stroke="#061f59"
            strokeWidth="2.5"
          />

          {/* Center Blue Gore Contour Seams */}
          <path
            d="M 75 4 C 65 12 52 30 50 55 C 48 85 60 116 75 145"
            fill="none"
            stroke="#061f59"
            strokeWidth="3"
          />
          <path
            d="M 75 4 C 85 12 98 30 100 55 C 102 85 90 116 75 145"
            fill="none"
            stroke="#061f59"
            strokeWidth="3"
          />

          {/* Outer Yellow Gore Contour Seams */}
          <path
            d="M 75 4 C 54 4 36 24 33 55 C 30 85 45 118 61 145"
            fill="none"
            stroke="#061f59"
            strokeWidth="3"
          />
          <path
            d="M 75 4 C 96 4 114 24 117 55 C 120 85 105 118 89 145"
            fill="none"
            stroke="#061f59"
            strokeWidth="3"
          />

          {/* Subtle Left Side Gloss / Highlight */}
          <path
            d="M 28 42 C 24 60 26 80 34 100"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.35"
          />
        </g>

        {/* Burner Collar / Neck Trim */}
        <path
          d="M 52 145 C 52 145 62 149 75 149 C 88 149 98 145 98 145 L 95 151 C 95 151 86 155 75 155 C 64 155 55 151 55 151 Z"
          fill="#061f59"
          stroke="#061f59"
          strokeWidth="1.5"
        />

        {/* Rigging Ropes */}
        <line x1="58" y1="151" x2="62" y2="182" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        <line x1="68" y1="154" x2="67" y2="182" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        <line x1="82" y1="154" x2="83" y2="182" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        <line x1="92" y1="151" x2="88" y2="182" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />

        {/* Diagonal Cross-lines for woven rigging realism */}
        <line x1="58" y1="151" x2="67" y2="182" stroke="#1e293b" strokeWidth="1.2" opacity="0.45" />
        <line x1="92" y1="151" x2="83" y2="182" stroke="#1e293b" strokeWidth="1.2" opacity="0.45" />

        {/* Wicker Basket Top Rim */}
        <rect
          x="58"
          y="179"
          width="34"
          height="6.5"
          rx="3.2"
          fill="#e67e22"
          stroke="#8a4205"
          strokeWidth="2.2"
        />
        {/* Woven Rim Notches */}
        <line x1="64" y1="179" x2="64" y2="185.5" stroke="#8a4205" strokeWidth="1.5" />
        <line x1="70" y1="179" x2="70" y2="185.5" stroke="#8a4205" strokeWidth="1.5" />
        <line x1="75" y1="179" x2="75" y2="185.5" stroke="#8a4205" strokeWidth="1.5" />
        <line x1="80" y1="179" x2="80" y2="185.5" stroke="#8a4205" strokeWidth="1.5" />
        <line x1="86" y1="179" x2="86" y2="185.5" stroke="#8a4205" strokeWidth="1.5" />

        {/* Wicker Basket Box */}
        <path
          d="M 61 185.5 L 63 207 C 63 209 65 211 67 211 L 83 211 C 85 211 87 209 87 207 L 89 185.5 Z"
          fill="#d36e18"
          stroke="#8a4205"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Basket Horizontal Ribs */}
        <line x1="62" y1="193" x2="88" y2="193" stroke="#9e4705" strokeWidth="1.8" />
        <line x1="62.5" y1="200" x2="87.5" y2="200" stroke="#9e4705" strokeWidth="1.8" />

        {/* Basket Vertical Weave Detail */}
        <line x1="67" y1="185.5" x2="67" y2="210" stroke="#9e4705" strokeWidth="1.3" strokeDasharray="3 3" />
        <line x1="75" y1="185.5" x2="75" y2="211" stroke="#9e4705" strokeWidth="1.3" strokeDasharray="3 3" />
        <line x1="83" y1="185.5" x2="83" y2="210" stroke="#9e4705" strokeWidth="1.3" strokeDasharray="3 3" />
      </svg>
    </m.div>
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

// ─── Explorer Compass (Brass & Navy Adventure Compass) ──────────────────────
export function PlayfulCompass({
  size = 72,
  tilt = 12,
  className = "",
}: {
  size?: number;
  tilt?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <m.div
      animate={reduce ? {} : { rotate: [tilt - 6, tilt + 6, tilt - 6], y: [-3, 3, -3] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      className={`relative inline-block select-none pointer-events-none drop-shadow-[0_8px_20px_rgba(0,51,160,0.14)] ${className}`}
      style={{ width: size, height: size * 1.1 }}
      aria-hidden="true"
    >
      <svg width={size} height={size * 1.1} viewBox="0 0 100 110" className="overflow-visible">
        {/* Brass Ring Loop */}
        <circle cx="50" cy="12" r="9" fill="none" stroke="#d97706" strokeWidth="3" />
        <circle cx="50" cy="12" r="9" fill="none" stroke="#ffd23f" strokeWidth="1.5" />

        {/* Outer Brass Casing */}
        <circle cx="50" cy="62" r="42" fill="#ffd23f" stroke="#b45309" strokeWidth="3.5" />
        {/* Inner Bezel Ring */}
        <circle cx="50" cy="62" r="37" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
        {/* White Dial Face */}
        <circle cx="50" cy="62" r="33" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />

        {/* Cardinal Ticks */}
        <line x1="50" y1="33" x2="50" y2="39" stroke="#0033a0" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="50" y1="85" x2="50" y2="91" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <line x1="21" y1="62" x2="27" y2="62" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <line x1="73" y1="62" x2="79" y2="62" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />

        {/* North Label */}
        <text x="50" y="47" textAnchor="middle" fill="#0033a0" fontSize="10" fontWeight="bold" fontFamily="sans-serif">N</text>

        {/* Needle North (Red) */}
        <path d="M 50 62 L 46 62 L 50 36 L 54 62 Z" fill="#ef4444" stroke="#991b1b" strokeWidth="1" strokeLinejoin="round" />
        {/* Needle South (Navy) */}
        <path d="M 50 62 L 46 62 L 50 88 L 54 62 Z" fill="#0033a0" stroke="#061f59" strokeWidth="1" strokeLinejoin="round" />

        {/* Center Pivot Rivet */}
        <circle cx="50" cy="62" r="4" fill="#ffd23f" stroke="#78350f" strokeWidth="1.5" />
      </svg>
    </m.div>
  );
}

// ─── Adventure Trail Signpost (Wooden Directional Arrows) ────────────────────
export function PlayfulSignpost({
  height = 95,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const width = Math.round((height * 100) / 120);

  return (
    <m.div
      animate={reduce ? {} : { rotate: [-1.5, 1.5, -1.5] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className={`relative inline-block select-none pointer-events-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.1)] ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    >
      <svg width="100%" height="100%" viewBox="0 0 100 120" className="overflow-visible">
        {/* Wooden Post */}
        <rect x="44" y="16" width="12" height="98" rx="2.5" fill="#a16207" stroke="#713f12" strokeWidth="2.5" />
        <line x1="50" y1="20" x2="50" y2="108" stroke="#78350f" strokeWidth="1" opacity="0.6" />

        {/* Post Top Cap */}
        <polygon points="44,16 50,8 56,16" fill="#a16207" stroke="#713f12" strokeWidth="2.5" strokeLinejoin="round" />

        {/* Top Sign: Pointing Right (Golden Yellow) */}
        <g>
          <path
            d="M 18 26 L 76 26 L 90 38 L 76 50 L 18 50 Z"
            fill="#ffd23f"
            stroke="#b45309"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Nails */}
          <circle cx="48" cy="38" r="2" fill="#713f12" />
          <circle cx="53" cy="38" r="2" fill="#713f12" />
          {/* Directional dashes */}
          <line x1="26" y1="38" x2="42" y2="38" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
          <line x1="60" y1="38" x2="74" y2="38" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Bottom Sign: Pointing Left (Sky Blue) */}
        <g>
          <path
            d="M 82 58 L 24 58 L 10 70 L 24 82 L 82 82 Z"
            fill="#7dd3fc"
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Nails */}
          <circle cx="48" cy="70" r="2" fill="#0369a1" />
          <circle cx="53" cy="70" r="2" fill="#0369a1" />
          {/* Directional dashes */}
          <line x1="28" y1="70" x2="42" y2="70" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
          <line x1="60" y1="70" x2="74" y2="70" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Base Grass Mound */}
        <ellipse cx="50" cy="114" rx="20" ry="5" fill="#4ade80" stroke="#16a34a" strokeWidth="2" />
      </svg>
    </m.div>
  );
}

// ─── Explorer Field Binoculars ───────────────────────────────────────────────
export function PlayfulBinoculars({
  width = 80,
  tilt = -10,
  className = "",
}: {
  width?: number;
  tilt?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const height = Math.round((width * 65) / 85);

  return (
    <m.div
      animate={reduce ? {} : { y: [-4, 4, -4], rotate: [tilt - 2, tilt + 2, tilt - 2] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      className={`relative inline-block select-none pointer-events-none drop-shadow-[0_8px_16px_rgba(0,51,160,0.15)] ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    >
      <svg width="100%" height="100%" viewBox="0 0 85 65" className="overflow-visible">
        {/* Left Barrel Body */}
        <rect x="10" y="14" width="24" height="42" rx="6" fill="#0033a0" stroke="#061f59" strokeWidth="2.5" />
        <rect x="12" y="24" width="20" height="8" rx="2" fill="#ffd23f" stroke="#b45309" strokeWidth="1.5" />

        {/* Right Barrel Body */}
        <rect x="51" y="14" width="24" height="42" rx="6" fill="#0033a0" stroke="#061f59" strokeWidth="2.5" />
        <rect x="53" y="24" width="20" height="8" rx="2" fill="#ffd23f" stroke="#b45309" strokeWidth="1.5" />

        {/* Center Bridge & Focus Knob */}
        <rect x="33" y="22" width="19" height="6" rx="2" fill="#64748b" stroke="#334155" strokeWidth="1.5" />
        <rect x="38" y="14" width="9" height="12" rx="2" fill="#ffd23f" stroke="#b45309" strokeWidth="1.5" />
        <line x1="42.5" y1="14" x2="42.5" y2="26" stroke="#b45309" strokeWidth="1" />

        {/* Eyepieces (Top) */}
        <rect x="14" y="6" width="16" height="8" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
        <rect x="55" y="6" width="16" height="8" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />

        {/* Objective Lenses (Bottom) with Glass Reflection */}
        <ellipse cx="22" cy="56" rx="12" ry="5" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
        <ellipse cx="22" cy="56" rx="8" ry="3" fill="#bae6fd" opacity="0.6" />

        <ellipse cx="63" cy="56" rx="12" ry="5" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
        <ellipse cx="63" cy="56" rx="8" ry="3" fill="#bae6fd" opacity="0.6" />
      </svg>
    </m.div>
  );
}

// ─── Playful Photo Camera (for Gallery / Memories) ───────────────────────────
export function PlayfulCamera({
  width = 68,
  tilt = 8,
  className = "",
}: {
  width?: number;
  tilt?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const height = Math.round((width * 55) / 70);

  return (
    <m.div
      animate={reduce ? {} : { rotate: [tilt - 3, tilt + 3, tilt - 3], scale: [1, 1.05, 1] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className={`relative inline-block select-none pointer-events-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)] ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    >
      <svg width="100%" height="100%" viewBox="0 0 70 55" className="overflow-visible">
        {/* Camera Top Flash & Shutter Bump */}
        <rect x="16" y="4" width="12" height="7" rx="2" fill="#ffd23f" stroke="#b45309" strokeWidth="1.8" />
        <rect x="42" y="5" width="14" height="6" rx="2" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.8" />

        {/* Main Body */}
        <rect x="6" y="10" width="58" height="40" rx="8" fill="#38bdf8" stroke="#0284c7" strokeWidth="2.5" />
        {/* Top Strip */}
        <path d="M 6 18 Q 35 18 64 18" stroke="#0284c7" strokeWidth="1.5" />

        {/* Big Lens */}
        <circle cx="35" cy="30" r="14" fill="#1e293b" stroke="#0f172a" strokeWidth="2.5" />
        <circle cx="35" cy="30" r="10" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
        <circle cx="38" cy="27" r="3.5" fill="#ffffff" opacity="0.8" />

        {/* Flash Bulb */}
        <circle cx="15" cy="24" r="3.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />
        {/* Heart sticker */}
        <path d="M 54 32 C 54 28 49 28 49 32 C 49 35 54 38 54 38 C 54 38 59 35 59 32 C 59 28 54 28 54 32 Z" fill="#ef4444" />
      </svg>
    </m.div>
  );
}
