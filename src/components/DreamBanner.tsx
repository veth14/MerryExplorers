"use client";

const NAVY = "#0b2a82";
const SUN = "#ffd23f";
const SUN_LIGHT = "#ffe066";

function Drop({ x, y, r, s = 1, fill }: { x: number; y: number; r: number; s?: number; fill: string }) {
  const d = "M0 -24C11 -11 16 -1 16 8a16 16 0 0 1-32 0c0-9 5-19 16-32z";
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d={d} fill="#06165a" transform="translate(2 4)" />
      <path d={d} fill={fill} stroke="#fff" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" />
      <ellipse cx="-5" cy="2" rx="3" ry="6" fill="#fff" opacity=".75" transform="rotate(12 -5 2)" />
    </g>
  );
}

const BANNER_SEGS: [string, string][] = [
  ["Dream", "#ffffff"],
  [".", "#5cc8ff"],
  ["Discover", SUN],
  [".", "#5cc8ff"],
  ["Explore", "#ffffff"],
];
const BOUNCE = [-2, 3, -3, 2, -1, 3, -2];

function BannerChars({ colored }: { colored: boolean }) {
  let i = 0;
  return (
    <>
      {BANNER_SEGS.flatMap(([word, fill]) =>
        [...word].map((ch) => {
          const k = i++;
          const dy = BOUNCE[k % BOUNCE.length] - (k ? BOUNCE[(k - 1) % BOUNCE.length] : 0);
          return (
            <tspan key={k} dy={dy} fontSize={ch === "." ? 78 : undefined} {...(colored ? { fill } : {})}>
              {ch}
            </tspan>
          );
        })
      )}
    </>
  );
}

export function DreamBanner() {
  const text = {
    fontSize: 58,
    fontWeight: 700,
    textAnchor: "middle" as const,
    letterSpacing: 1,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    paintOrder: "stroke",
  };
  const CENTER = "M70 175Q400 5 730 175";
  return (
    <div className="vp-banner my-8" role="img" aria-label="Dream. Discover. Explore.">
      <svg viewBox="0 0 800 250" aria-hidden="true" className="w-full h-auto drop-shadow-[0_8px_0_rgba(11,42,130,0.22)]">
        <defs>
          <filter id="vp-rough-banner" filterUnits="userSpaceOnUse" x="0" y="0" width="800" height="250">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.25" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <path id="vp-arc-banner" d="M70 195Q400 25 730 195" />
        </defs>
        <g filter="url(#vp-rough-banner)" fill="none">
          <path d={CENTER} stroke="#3db8ff" strokeWidth="116" />
          <path d={CENTER} stroke="#0a2380" strokeWidth="100" />
        </g>
        <g fill="none" strokeLinecap="round">
          <path d={CENTER} transform="translate(0 -38)" stroke="#1e4fc4" strokeWidth="3" strokeDasharray="130 20 70 34 210 26" />
          <path d={CENTER} transform="translate(0 -26)" stroke="#2f6fe0" strokeWidth="2" strokeDasharray="90 40 160 20" />
          <path d={CENTER} transform="translate(0 28)" stroke="#2f6fe0" strokeWidth="2" strokeDasharray="140 24 80 36" />
          <path d={CENTER} transform="translate(0 38)" stroke="#1e4fc4" strokeWidth="3" strokeDasharray="70 22 190 28" />
        </g>
        <text {...text} fill="#041048" stroke="#041048" strokeWidth="9" transform="translate(0 5)">
          <textPath href="#vp-arc-banner" startOffset="50%"><BannerChars colored={false} /></textPath>
        </text>
        <text {...text} stroke="#0a2380" strokeWidth="5">
          <textPath href="#vp-arc-banner" startOffset="50%"><BannerChars colored /></textPath>
        </text>
        {[false, true].map((mirror) => (
          <g key={String(mirror)} transform={mirror ? "translate(800 0) scale(-1 1)" : undefined}>
            <Drop x={52} y={70} r={-55} s={1.2} fill={SUN} />
            <Drop x={98} y={30} r={-15} s={0.75} fill="#5cc8ff" />
            <Drop x={24} y={112} r={-85} s={0.7} fill="#5cc8ff" />
            <Drop x={28} y={176} r={-125} s={1} fill={SUN} />
            <Drop x={60} y={218} r={-155} s={0.6} fill="#5cc8ff" />
          </g>
        ))}
      </svg>
    </div>
  );
}
