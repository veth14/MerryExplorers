import { useId, type ReactNode } from "react";
import type { BodyPartId } from "@/data/body-parts-game";

const HIGHLIGHTS: Record<BodyPartId, ReactNode> = {
  head: <ellipse cx="100" cy="49" rx="34" ry="39" />,
  hair: <path d="M67 46 Q68 15 100 14 Q132 15 133 46 Q120 34 108 38 Q94 31 81 42 Z" />,
  eyes: <g><circle cx="88" cy="50" r="10" /><circle cx="112" cy="50" r="10" /></g>,
  ears: <g><circle cx="67" cy="58" r="11" /><circle cx="133" cy="58" r="11" /></g>,
  nose: <ellipse cx="100" cy="61" rx="9" ry="11" />,
  mouth: <ellipse cx="100" cy="73" rx="17" ry="10" />,
  shoulders: <ellipse cx="100" cy="95" rx="42" ry="15" />,
  arms: <g><path d="M72 91 Q61 107 65 128" /><path d="M128 91 Q139 107 135 128" /></g>,
  elbows: <g><circle cx="65" cy="116" r="12" /><circle cx="135" cy="116" r="12" /></g>,
  hands: <g><circle cx="64" cy="134" r="13" /><circle cx="136" cy="134" r="13" /></g>,
  knees: <g><circle cx="88" cy="166" r="12" /><circle cx="112" cy="166" r="12" /></g>,
  feet: <g><ellipse cx="83" cy="206" rx="17" ry="10" /><ellipse cx="117" cy="206" rx="17" ry="10" /></g>,
};

const FOCUS_VIEWBOXES: Record<BodyPartId, string> = {
  head: "54 3 92 91",
  hair: "61 9 78 43",
  eyes: "61 22 78 59",
  ears: "54 23 92 73",
  nose: "62 18 76 68",
  mouth: "62 36 76 58",
  shoulders: "44 68 112 70",
  arms: "48 75 104 75",
  elbows: "48 91 104 57",
  hands: "47 109 106 53",
  knees: "57 137 86 62",
  feet: "55 178 90 46",
};

export function BodyPartPicture({ part, className = "", focus = false, showHighlight = true }: { part: BodyPartId; className?: string; focus?: boolean; showHighlight?: boolean }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      viewBox={focus ? FOCUS_VIEWBOXES[part] : "0 0 200 224"}
      role="img"
      aria-label={`Illustration showing the ${part}`}
      className={className}
    >
      <defs>
        <linearGradient id={`shirt-${part}-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#57bed0" />
          <stop offset="1" stopColor="#1686a4" />
        </linearGradient>
        <filter id={`glow-${part}-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ffb800" floodOpacity=".75" />
        </filter>
      </defs>
      <ellipse cx="100" cy="212" rx="48" ry="7" fill="#5caa85" opacity=".18" />
      <path d="M82 146 L96 146 L94 195 L82 195 Z M104 146 L118 146 L118 195 L106 195 Z" fill="#506a8b" stroke="#344b68" strokeWidth="2" />
      <path d="M81 193 Q90 190 98 196 L98 207 Q96 214 88 214 L73 214 Q69 212 73 205 Z M119 193 Q110 190 102 196 L102 207 Q104 214 112 214 L127 214 Q131 212 127 205 Z" fill="#fff" stroke="#7f9bb5" strokeWidth="2" />
      <path d="M73 209 Q85 214 98 208 M127 209 Q115 214 102 208" fill="none" stroke="#ff9b58" strokeWidth="4" strokeLinecap="round" />
      <path d="M82 84 Q71 89 67 105 L63 128 Q63 137 70 138 Q77 138 79 130 L85 110 M118 84 Q129 89 133 105 L137 128 Q137 137 130 138 Q123 138 121 130 L115 110" fill="#f2bd94" stroke="#c78362" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M79 82 Q100 73 121 82 L127 143 Q121 151 100 151 Q79 151 73 143 Z" fill={`url(#shirt-${part}-${uid})`} stroke="#126b86" strokeWidth="2.5" />
      <path d="M89 77 L111 77 L113 89 Q100 97 87 89 Z" fill="#f2bd94" stroke="#c78362" strokeWidth="2" />
      <ellipse cx="100" cy="49" rx="34" ry="37" fill="#f6c59e" stroke="#bd805d" strokeWidth="2.5" />
      <circle cx="67" cy="57" r="9" fill="#f0ba91" stroke="#bd805d" strokeWidth="2" />
      <circle cx="133" cy="57" r="9" fill="#f0ba91" stroke="#bd805d" strokeWidth="2" />
      <path d="M68 48 Q71 17 100 17 Q129 17 132 48 Q121 37 110 39 Q96 32 83 43 Z" fill="#70452e" stroke="#4d3023" strokeWidth="2.5" />
      <path d="M80 48 Q87 44 93 48 M107 48 Q113 44 120 48" fill="none" stroke="#593b2d" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="88" cy="53" rx="4.5" ry="6" fill="#fff" />
      <ellipse cx="112" cy="53" rx="4.5" ry="6" fill="#fff" />
      <circle cx="89" cy="54" r="2.5" fill="#253748" />
      <circle cx="111" cy="54" r="2.5" fill="#253748" />
      <path d="M98 59 Q95 66 100 67 Q104 67 106 64" fill="none" stroke="#c78362" strokeWidth="2" strokeLinecap="round" />
      <path d="M91 73 Q100 79 109 72" fill="none" stroke="#9b5049" strokeWidth="2.5" strokeLinecap="round" />
      {showHighlight && (
        <g
          fill="#ffd139"
          fillOpacity=".38"
          stroke="#ed9900"
          strokeWidth="3.5"
          strokeLinejoin="round"
          filter={`url(#glow-${part}-${uid})`}
          pointerEvents="none"
        >
          {HIGHLIGHTS[part]}
        </g>
      )}
    </svg>
  );
}
