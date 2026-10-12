"use client";

// ─── "Dream. Discover. Explore." brush banner (Exact Admin Portal design & size) ───
const NAVY = "#0b2a82";
const SUN = "#ffd23f";

function BannerDrop({ x, y, r, s = 1, fill }: { x: number; y: number; r: number; s?: number; fill: string }) {
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
const BANNER_BOUNCE = [-2, 3, -3, 2, -1, 3, -2]; // vertical offset per letter

function BannerChars({ colored }: { colored: boolean }) {
  let i = 0;
  return (
    <>
      {BANNER_SEGS.flatMap(([word, fill]) =>
        [...word].map((ch) => {
          const k = i++;
          const dy = BANNER_BOUNCE[k % BANNER_BOUNCE.length] - (k ? BANNER_BOUNCE[(k - 1) % BANNER_BOUNCE.length] : 0);
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

export function DreamBanner({ w = 440 }: { w?: number }) {
  const text = {
    fontSize: 58,
    fontWeight: 700,
    textAnchor: "middle" as const,
    letterSpacing: 1,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    paintOrder: "stroke",
  };
  const CENTER = "M70 175Q400 5 730 175"; // band centerline

  return (
    <div
      className="me-banner my-6 mx-auto flex flex-col items-center"
      role="img"
      aria-label="Dream. Discover. Explore."
      style={{ width: `min(${w}px, 100%)` }}
    >
      <svg viewBox="-30 -10 860 270" aria-hidden="true" className="w-full h-auto block">
        <defs>
          <filter id="me-rough-exact" filterUnits="userSpaceOnUse" x="0" y="0" width="800" height="250">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.25" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <mask id="me-band-mask-exact" maskUnits="userSpaceOnUse" x="0" y="0" width="800" height="250">
            <path d={CENTER} fill="none" stroke="#fff" strokeWidth="92" strokeLinecap="round" />
          </mask>
          <path id="me-arc-exact" d="M70 195Q400 25 730 195" />
        </defs>

        {/* brush band: thin light-blue rim, thick navy core */}
        <g filter="url(#me-rough-exact)" fill="none" strokeLinecap="round">
          <path d={CENTER} stroke="#3db8ff" strokeWidth="116" />
          <path d={CENTER} stroke="#0a2380" strokeWidth="100" />
        </g>

        {/* dry-brush streaks, masked to stay inside the band */}
        <g mask="url(#me-band-mask-exact)" fill="none" strokeLinecap="round">
          <path d={CENTER} transform="translate(0 -38)" stroke="#1e4fc4" strokeWidth="3" strokeDasharray="130 20 70 34 210 26" />
          <path d={CENTER} transform="translate(0 -26)" stroke="#2f6fe0" strokeWidth="2" strokeDasharray="90 40 160 20" />
          <path d={CENTER} transform="translate(0 28)" stroke="#2f6fe0" strokeWidth="2" strokeDasharray="140 24 80 36" />
          <path d={CENTER} transform="translate(0 38)" stroke="#1e4fc4" strokeWidth="3" strokeDasharray="70 22 190 28" />
        </g>

        {/* lettering: dark shadow, then white letters with navy outline */}
        <text {...text} fill="#041048" stroke="#041048" strokeWidth="9" transform="translate(0 5)">
          <textPath href="#me-arc-exact" startOffset="50%"><BannerChars colored={false} /></textPath>
        </text>
        <text {...text} stroke="#0a2380" strokeWidth="5">
          <textPath href="#me-arc-exact" startOffset="50%"><BannerChars colored /></textPath>
        </text>

        {/* splashes, mirrored to the right side */}
        {[false, true].map((mirror) => (
          <g key={String(mirror)} transform={mirror ? "translate(800 0) scale(-1 1)" : undefined}>
            <BannerDrop x={40} y={104} r={-35} s={1.45} fill={SUN} />
            <BannerDrop x={86} y={76} r={-12} s={0.85} fill="#5cc8ff" />
            <BannerDrop x={-2} y={136} r={-80} s={0.85} fill="#5cc8ff" />
            <BannerDrop x={-4} y={196} r={-115} s={1.2} fill={SUN} />
            <BannerDrop x={30} y={236} r={-150} s={0.7} fill="#5cc8ff" />
          </g>
        ))}
      </svg>
      <p className="me-copy mt-1 text-[12px] font-semibold text-[#0b2a82]/75 text-center">
        Merry Explorers Playgroup Learning Center
      </p>

      <style jsx>{`
        .me-banner svg {
          filter: drop-shadow(0 6px 0 rgba(11, 42, 130, 0.2));
        }
      `}</style>
    </div>
  );
}
