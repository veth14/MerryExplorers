"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Fredoka } from "next/font/google";
import { m, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { EmojiPalette, EmojiMagnifyingGlass, EmojiLightbulb } from "@/components/landing/icons";
import { SiteHeader } from "@/components/landing/site-header";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const SKY = "#8fd3f7";
const NAVY = "#0b2a82";
const BLUE = "#1f7ae0";
const SUN = "#ffd23f";
const ORANGE = "#ff8a1f";

type SectionKey = "curious" | "creative" | "trailblazer";
type QuizPhase = "intro" | "child-info" | "question" | "email-capture" | "result";

const SECTION_META = {
  curious: { title: "Curious Explorer", subtitle: "Discovery Club · Supported Learning", ageLabel: "Ages 1.6 – 4.11 years", accentColor: "#7DD3FC", bgCard: "#F0F9FF", Icon: EmojiMagnifyingGlass },
  creative: { title: "Creative Explorer", subtitle: "Discovery Club · Independent Learning", ageLabel: "Ages 2.6 – 4.11 years", accentColor: "#FDE261", bgCard: "#FFFDF0", Icon: EmojiPalette },
  trailblazer: { title: "Trailblazer", subtitle: "Brave Explorer · Classroom Readiness", ageLabel: "Ages 3 – 4.11 years", accentColor: "#A5F3FC", bgCard: "#F0FDFF", Icon: EmojiLightbulb },
} satisfies Record<SectionKey, any>;

const Highlight = ({ children }: { children: React.ReactNode }) => (
  <span className="relative inline-block whitespace-nowrap z-10 px-1">
    <span className="absolute bottom-1 left-0 w-full h-3 -z-10 -rotate-1 rounded-sm" style={{ background: SUN }} />
    <span style={{ color: NAVY }}>{children}</span>
  </span>
);

const getQuestions = (name: string): { section: SectionKey; text: React.ReactNode }[] => [
  { section: "curious", text: <>{name} is <Highlight>new to structured learning</Highlight> or classroom experiences?</> },
  { section: "curious", text: <>{name} needs <Highlight>frequent guidance</Highlight> or encouragement to participate?</> },
  { section: "curious", text: <>{name} needs their <Highlight>guardian nearby</Highlight> to feel secure in a new environment?</> },
  { section: "curious", text: <>{name} needs <Highlight>more time to adjust</Highlight> before joining an activity?</> },
  { section: "curious", text: <>{name} benefits from <Highlight>additional adult attention</Highlight> during learning activities?</> },
  { section: "creative", text: <>{name} can enter and participate <Highlight>without needing a guardian</Highlight> beside them?</> },
  { section: "creative", text: <>{name} can engage with a teacher <Highlight>independently?</Highlight></> },
  { section: "creative", text: <>{name} can participate in an activity with <Highlight>minimal assistance?</Highlight></> },
  { section: "creative", text: <>{name} can <Highlight>follow simple instructions</Highlight> during the activity?</> },
  { section: "creative", text: <>If upset, {name} can <Highlight>calm or self-pacify</Highlight> within approx. 3 minutes?</> },
  { section: "trailblazer", text: <>{name} can <Highlight>sit independently</Highlight> without being held?</> },
  { section: "trailblazer", text: <>{name} can <Highlight>remain seated</Highlight> and reasonably still for approx. 3 minutes?</> },
  { section: "trailblazer", text: <>{name} can <Highlight>grip and manipulate</Highlight> age-appropriate learning materials?</> },
  { section: "trailblazer", text: <>{name} is <Highlight>comfortable participating</Highlight> in a classroom setup?</> },
  { section: "trailblazer", text: <>{name} can <Highlight>stay engaged</Highlight> in a teacher-led activity for a short period?</> },
];

const getOptions = (qi: number) => {
  const d = { activeBorder: NAVY, activeBg: "#dbeafe" };
  const m = { activeBorder: "#C49B00", activeBg: "#FEFCE8" };
  const l = { activeBorder: "#94A3B8", activeBg: "#F8FAFC" };
  const rows: Record<number, any[]> = {
    0: [{ value: 2, label: "Yes", sublabel: "This is their first time", emoji: "⭐", ...d }, { value: 1, label: "Somewhat", sublabel: "They've had a little exposure", emoji: "🌱", ...m }, { value: 0, label: "No", sublabel: "They are used to classrooms", emoji: "💭", ...l }],
    1: [{ value: 2, label: "Yes", sublabel: "Needs a lot of help getting started", emoji: "⭐", ...d }, { value: 1, label: "Sometimes", sublabel: "Needs a little help now and then", emoji: "🌱", ...m }, { value: 0, label: "No", sublabel: "Usually jumps right in", emoji: "💭", ...l }], 2: [{ value: 2, label: "Yes", sublabel: "Stays very close to me", emoji: "⭐", ...d }, { value: 1, label: "Sometimes", sublabel: "Checks in occasionally", emoji: "🌱", ...m }, { value: 0, label: "No", sublabel: "Explores independently", emoji: "💭", ...l }],
    3: [{ value: 2, label: "Yes", sublabel: "Takes a while to warm up", emoji: "⭐", ...d }, { value: 1, label: "Sometimes", sublabel: "Needs a few minutes", emoji: "🌱", ...m }, { value: 0, label: "No", sublabel: "Joins immediately", emoji: "💭", ...l }],
    4: [{ value: 2, label: "Yes", sublabel: "Learns best 1-on-1", emoji: "⭐", ...d }, { value: 1, label: "Sometimes", sublabel: "Benefits from check-ins", emoji: "🌱", ...m }, { value: 0, label: "No", sublabel: "Works well independently", emoji: "💭", ...l }],
    5: [{ value: 2, label: "Yes", sublabel: "Explores confidently alone", emoji: "⭐", ...d }, { value: 1, label: "Sometimes", sublabel: "With some reassurance", emoji: "🌱", ...m }, { value: 0, label: "Not Yet", sublabel: "Needs me right there", emoji: "💭", ...l }],
    6: [{ value: 2, label: "Yes", sublabel: "Converses/plays easily", emoji: "⭐", ...d }, { value: 1, label: "Sometimes", sublabel: "With some warming up", emoji: "🌱", ...m }, { value: 0, label: "Not Yet", sublabel: "Shies away", emoji: "💭", ...l }],
    7: [{ value: 2, label: "Yes", sublabel: "Does most things alone", emoji: "⭐", ...d }, { value: 1, label: "Sometimes", sublabel: "Needs occasional help", emoji: "🌱", ...m }, { value: 0, label: "Not Yet", sublabel: "Needs full assistance", emoji: "💭", ...l }],
    8: [{ value: 2, label: "Yes", sublabel: "Understands and follows easily", emoji: "⭐", ...d }, { value: 1, label: "Sometimes", sublabel: "With repetition/help", emoji: "🌱", ...m }, { value: 0, label: "Not Yet", sublabel: "Struggles to follow", emoji: "💭", ...l }],
    9: [{ value: 2, label: "Yes", sublabel: "Calms down quickly", emoji: "⭐", ...d }, { value: 1, label: "Sometimes", sublabel: "Needs a little help", emoji: "🌱", ...m }, { value: 0, label: "Not Yet", sublabel: "Needs significant comforting", emoji: "💭", ...l }],
    10: [{ value: 2, label: "Yes", sublabel: "Sits upright comfortably", emoji: "⭐", ...d }, { value: 1, label: "Sometimes", sublabel: "Wiggles or needs support", emoji: "🌱", ...m }, { value: 0, label: "Not Yet", sublabel: "Needs to be held", emoji: "💭", ...l }],
    11: [{ value: 2, label: "Yes", sublabel: "Stays focused and seated", emoji: "⭐", ...d }, { value: 1, label: "Sometimes", sublabel: "Gets restless", emoji: "🌱", ...m }, { value: 0, label: "Not Yet", sublabel: "Constantly moving", emoji: "💭", ...l }],
    12: [{ value: 2, label: "Yes", sublabel: "Handles things easily", emoji: "⭐", ...d }, { value: 1, label: "Sometimes", sublabel: "Still developing grip", emoji: "🌱", ...m }, { value: 0, label: "Not Yet", sublabel: "Struggles to hold", emoji: "💭", ...l }],
    13: [{ value: 2, label: "Yes", sublabel: "Enjoys the structure", emoji: "⭐", ...d }, { value: 1, label: "Sometimes", sublabel: "Can get overwhelmed", emoji: "🌱", ...m }, { value: 0, label: "Not Yet", sublabel: "Prefers free play", emoji: "💭", ...l }],
    14: [{ value: 2, label: "Yes", sublabel: "Pays attention easily", emoji: "⭐", ...d }, { value: 1, label: "Sometimes", sublabel: "Distracted easily", emoji: "🌱", ...m }, { value: 0, label: "Not Yet", sublabel: "Shows little interest", emoji: "💭", ...l }],
  };
  return rows[qi] ?? rows[14];
};

const RESULT_COPY: Record<SectionKey, Record<string, string>> = {
  curious: { strong: "Your little explorer thrives in a nurturing environment where they can learn at their own pace with guidance and the reassurance of having their guardian nearby.", developing: "Your child may benefit from additional support while gradually building independence toward a more independent program.", low: "Your child shows some independence already. Based on their other scores and age, a more independent program may be a better fit." },
  creative: { strong: "Your little explorer shows independence, self-regulation, and readiness to participate with minimal adult assistance.", developing: "Your child may be ready for Creative Explorer with some additional support, depending on what your teacher observes.", low: "Your child may benefit from more guidance and adult support at this stage." },
  trailblazer: { strong: "Your little explorer is showing classroom readiness, sitting ability, fine-motor skills, and comfort with structured activities.", developing: "Your child is showing emerging classroom readiness and may benefit from additional guidance as they build routine.", low: "Your child may benefit from a setting with more flexibility, guidance, and one-on-one support for now." },
};
function getResultTier(s: number): "strong" | "developing" | "low" { return s >= 8 ? "strong" : s >= 5 ? "developing" : "low"; }

const slide = { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -18 }, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const } };

// ── Decorations ───────────────────────────────────────────────────────────────
function Cloud({ w = 160 }: { w?: number }) {
  return (
    <svg width={w} viewBox="0 0 160 90" aria-hidden="true">
      <g fill="#fff" stroke="#fff" strokeWidth="8" strokeLinejoin="round">
        <circle cx="45" cy="55" r="26" /><circle cx="80" cy="38" r="32" />
        <circle cx="116" cy="55" r="26" /><rect x="45" y="55" width="72" height="26" />
      </g>
      <g fill="#fff" stroke="#c9e8fb" strokeWidth="2.5">
        <circle cx="45" cy="55" r="26" /><circle cx="80" cy="38" r="32" /><circle cx="116" cy="55" r="26" />
      </g>
      <rect x="40" y="52" width="82" height="30" fill="#fff" />
    </svg>
  );
}
function Rainbow({ w = 230 }: { w?: number }) {
  const bands = ["#ef4444", "#ff9a1f", "#ffd23f", "#4cc35b", "#2f8bf0", "#7c4dcc"];
  const f = "drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff)";
  return (
    <svg width={w} viewBox="0 0 160 90" style={{ overflow: "visible", filter: f }} aria-hidden="true">
      {bands.map((c, i) => { const r = 68 - i * 7; return <path key={c} d={`M${80 - r} 70A${r} ${r} 0 0 1 ${80 + r} 70`} fill="none" stroke={c} strokeWidth="7" />; })}
      <g fill="#fff">
        <circle cx="14" cy="72" r="13" /><circle cx="30" cy="68" r="15" /><circle cx="26" cy="78" r="12" />
        <circle cx="132" cy="72" r="13" /><circle cx="148" cy="68" r="12" /><circle cx="140" cy="78" r="12" />
      </g>
    </svg>
  );
}
function Star({ s = 40, rot = 0 }: { s?: number; rot?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" style={{ transform: `rotate(${rot}deg)` }} aria-hidden="true">
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill={SUN} stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" paintOrder="stroke" />
    </svg>
  );
}
function Sun({ s = 150 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 120 120" aria-hidden="true">
      <g className="dq-spin" style={{ transformOrigin: "60px 60px" }} stroke={SUN} strokeWidth="9" strokeLinecap="round">
        {Array.from({ length: 12 }).map((_, i) => <line key={i} x1="60" y1="8" x2="60" y2="20" transform={`rotate(${i * 30} 60 60)`} />)}
      </g>
      <circle cx="60" cy="60" r="31" fill="#ffe27a" stroke="#f6b91c" strokeWidth="4" />
      <circle cx="49" cy="55" r="3.2" fill={NAVY} /><circle cx="71" cy="55" r="3.2" fill={NAVY} />
      <circle cx="42" cy="66" r="5" fill="#ffa8a8" opacity=".7" /><circle cx="78" cy="66" r="5" fill="#ffa8a8" opacity=".7" />
      <path d="M50 67 Q60 78 70 67" fill="none" stroke={NAVY} strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}
function Plane({ w = 90 }: { w?: number }) {
  return (
    <svg width={w} viewBox="0 0 100 80" aria-hidden="true">
      <path d="M6 36 L94 6 L66 74 L50 46 Z" fill="#e8f5ff" stroke="#fff" strokeWidth="8" strokeLinejoin="round" />
      <path d="M6 36 L94 6 L66 74 L50 46 Z" fill="#e8f5ff" stroke={BLUE} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M94 6 L50 46 L56 62 Z" fill="#9fd0f5" stroke={BLUE} strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  );
}
function Rocket({ s = 110 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" aria-hidden="true">
      <g transform="rotate(40 50 50)" strokeLinejoin="round">
        <path d="M50 4 C70 20 72 52 66 72 H34 C28 52 30 20 50 4Z" fill="#fff" stroke="#fff" strokeWidth="9" />
        <path d="M34 50 L16 70 L18 42 Z M66 50 L84 70 L82 42 Z" fill="#e53935" stroke="#fff" strokeWidth="6" />
        <path d="M50 4 C70 20 72 52 66 72 H34 C28 52 30 20 50 4Z" fill="#fff" stroke={NAVY} strokeWidth="3" />
        <path d="M50 4 C58 10 63 18 65 26 H35 C37 18 42 10 50 4Z" fill="#e53935" />
        <circle cx="50" cy="44" r="9" fill="#7fd0ff" stroke={NAVY} strokeWidth="3" />
        <path d="M40 74 Q50 98 60 74Z" fill={SUN} stroke={ORANGE} strokeWidth="3" />
      </g>
    </svg>
  );
}

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
const BSEGS: [string, string][] = [["Dream", "#fff"], [".", `#5cc8ff`], ["Discover", SUN], [".", `#5cc8ff`], ["Explore", "#fff"]];
const BBOUNCE = [-2, 3, -3, 2, -1, 3, -2];
function BChars({ colored }: { colored: boolean }) {
  let i = 0;
  return <>{BSEGS.flatMap(([w, fill]) => [...w].map(ch => { const k = i++; const dy = BBOUNCE[k % BBOUNCE.length] - (k ? BBOUNCE[(k - 1) % BBOUNCE.length] : 0); return <tspan key={k} dy={dy} fontSize={ch === "." ? 78 : undefined} {...(colored ? { fill } : {})}>{ch}</tspan>; }))}</>;
}
function DreamBanner({ w = 520 }: { w?: number }) {
  const t = { fontSize: 58, fontWeight: 700, textAnchor: "middle" as const, letterSpacing: 1, strokeLinejoin: "round" as const, strokeLinecap: "round" as const, paintOrder: "stroke" };
  const C = "M70 175Q400 5 730 175";
  return (
    <div className="dq-banner" role="img" aria-label="Dream. Discover. Explore." style={{ width: `min(${w}px, 100%)` }}>
      <svg viewBox="-30 -10 860 270" aria-hidden="true">
        <defs>
          <filter id="dq-rough" filterUnits="userSpaceOnUse" x="0" y="0" width="800" height="250">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.25" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <mask id="dq-band-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="800" height="250">
            <path d={C} fill="none" stroke="#fff" strokeWidth="92" strokeLinecap="round" />
          </mask>
          <path id="dq-arc" d="M70 195Q400 25 730 195" />
        </defs>
        <g filter="url(#dq-rough)" fill="none" strokeLinecap="round">
          <path d={C} stroke="#3db8ff" strokeWidth="116" /><path d={C} stroke="#0a2380" strokeWidth="100" />
        </g>
        <g mask="url(#dq-band-mask)" fill="none" strokeLinecap="round">
          <path d={C} transform="translate(0 -38)" stroke="#1e4fc4" strokeWidth="3" strokeDasharray="130 20 70 34 210 26" />
          <path d={C} transform="translate(0 -26)" stroke="#2f6fe0" strokeWidth="2" strokeDasharray="90 40 160 20" />
          <path d={C} transform="translate(0 28)" stroke="#2f6fe0" strokeWidth="2" strokeDasharray="140 24 80 36" />
          <path d={C} transform="translate(0 38)" stroke="#1e4fc4" strokeWidth="3" strokeDasharray="70 22 190 28" />
        </g>
        <text {...t} fill="#041048" stroke="#041048" strokeWidth="9" transform="translate(0 5)">
          <textPath href="#dq-arc" startOffset="50%"><BChars colored={false} /></textPath>
        </text>
        <text {...t} stroke="#0a2380" strokeWidth="5">
          <textPath href="#dq-arc" startOffset="50%"><BChars colored /></textPath>
        </text>
        {[false, true].map(mirror => (
          <g key={String(mirror)} transform={mirror ? "translate(800 0) scale(-1 1)" : undefined}>
            <BannerDrop x={40} y={104} r={-35} s={1.45} fill={SUN} />
            <BannerDrop x={86} y={76} r={-12} s={0.85} fill="#5cc8ff" />
            <BannerDrop x={-2} y={136} r={-80} s={0.85} fill="#5cc8ff" />
            <BannerDrop x={-4} y={196} r={-115} s={1.2} fill={SUN} />
            <BannerDrop x={30} y={236} r={-150} s={0.7} fill="#5cc8ff" />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Quiz Screens ──────────────────────────────────────────────────────────────
function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="dq-screen">
      <m.div animate={{ y: [-6, 6, -6] }}
        // @ts-ignore
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 88, height: 88, borderRadius: "50%", background: "#dbeafe", border: `3px solid ${NAVY}`, boxShadow: `0 4px 0 ${NAVY}55`, fontSize: 44, marginBottom: 8 }}>
        🧭
      </m.div>
      <div style={{ textAlign: "center" }}>
        <h1 className="dq-title">Discover Your Child&apos;s</h1>
        <h1 className="dq-title dq-title-sun">Learning Path</h1>
        <p className="dq-sub">Every child learns differently. Let&apos;s find out how your little explorer learns best today so we can match them with the perfect environment.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 8, width: "100%" }}>
        <button className="dq-btn" onClick={onStart} id="dq-begin-btn" style={{ maxWidth: 340 }}>Begin Discovery &#8594;</button>
        <p style={{ fontSize: 12, color: "#5b74a8", fontWeight: 500, marginTop: 4 }}>Takes about 3 minutes &middot; No right or wrong answers</p>
      </div>
    </div>
  );
}

function ChildInfoScreen({ childName, setChildName, childAge, setChildAge, onNext }: { childName: string; setChildName: (v: string) => void; childAge: string; setChildAge: (v: string) => void; onNext: () => void }) {
  const ok = childName.trim().length > 0 && childAge.trim().length > 0;
  return (
    <div className="dq-screen">
      <div style={{ fontSize: 44 }}>👋</div>
      <h2 className="dq-title" style={{ fontSize: 28 }}>Let&apos;s get to know<br />your little explorer!</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 340, textAlign: "left", marginTop: 8 }}>
        <div>
          <label className="dq-label">What is their name?</label>
          <input type="text" placeholder="e.g. Mia" value={childName} onChange={e => setChildName(e.target.value)} className="dq-input" autoFocus />
        </div>
        <div>
          <label className="dq-label">How old are they?</label>
          <select value={childAge} onChange={e => setChildAge(e.target.value)} className="dq-input">
            <option value="" disabled>Select age...</option>
            <option value="1.5 - 2 years">1.5 – 2 years</option>
            <option value="2 - 3 years">2 – 3 years</option>
            <option value="3 - 4 years">3 – 4 years</option>
            <option value="4+ years">4+ years</option>
          </select>
        </div>
      </div>
      <button className="dq-btn" onClick={onNext} disabled={!ok} style={{ marginTop: 8, maxWidth: 340, opacity: ok ? 1 : 0.45, cursor: ok ? "pointer" : "not-allowed" }}>Continue &#8594;</button>
    </div>
  );
}

function QuestionScreen({ qIndex, questionText, onAnswer }: { qIndex: number; section: SectionKey; questionText: React.ReactNode; onAnswer: (p: number) => void }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const opts = getOptions(qIndex);
  function pick(v: number) { if (chosen !== null) return; setChosen(v); onAnswer(v); }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ textAlign: "center", padding: "0 4px" }}>
        <h2 style={{ fontFamily: "inherit", fontSize: "clamp(20px,5vw,26px)", fontWeight: 700, lineHeight: 1.35, color: NAVY, margin: 0 }}>{questionText}</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        {opts.map(o => {
          const ic = chosen === o.value; const id = chosen !== null && !ic;
          return (
            <m.button key={o.value} whileHover={chosen === null ? { scale: 1.01, y: -1 } : {}} whileTap={chosen === null ? { scale: 0.99 } : {}} onClick={() => pick(o.value)} disabled={chosen !== null}
              style={{ display: "flex", alignItems: "center", gap: 14, borderRadius: 18, border: `3px solid ${ic ? o.activeBorder : "#b6dcf5"}`, padding: "13px 16px", textAlign: "left", cursor: chosen !== null ? "default" : "pointer", background: ic ? o.activeBg : "#f2faff", opacity: id ? 0.4 : 1, transition: "border-color .15s,background .15s,opacity .2s", boxShadow: ic ? `0 4px 0 ${o.activeBorder}55` : "none" }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>{o.emoji}</span>
              <div><p style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>{o.label}</p><p style={{ fontSize: 12, fontWeight: 500, color: "#5b74a8", margin: 0 }}>{o.sublabel}</p></div>
            </m.button>
          );
        })}
      </div>
    </div>
  );
}

function EmailCaptureScreen({ program, scores, attempted, childName, childAge, onSubmit }: { program: SectionKey; scores: Record<SectionKey, number>; attempted: SectionKey[]; childName: string; childAge: string; onSubmit: () => void }) {
  const [pn, setPn] = useState(""); const [em, setEm] = useState(""); const [loading, setLoading] = useState(false);
  async function hs(e: React.FormEvent) {
    e.preventDefault(); if (!em) return; setLoading(true);
    try { await fetch("/api/discovery-day-results", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parentName: pn, email: em, childName, childAge, scores, finalProgram: program, attempted }) }); }
    catch (err) { console.error(err); } finally { setLoading(false); onSubmit(); }
  }
  return (
    <div className="dq-screen">
      <m.div animate={{ scale: [1, 1.06, 1] }}
        // @ts-ignore
        transition={{ duration: 2.5, repeat: Infinity }}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 80, height: 80, borderRadius: "50%", background: "#dbeafe", border: `3px solid ${NAVY}`, boxShadow: `0 4px 0 ${NAVY}44`, fontSize: 38 }}>📬</m.div>
      <div style={{ textAlign: "center" }}>
        <h2 className="dq-title" style={{ fontSize: 26 }}>You&apos;ve completed<br />the discovery!</h2>
        <p className="dq-sub" style={{ marginTop: 8 }}>Where should we send {childName ? `${childName}'s` : "your child's"} program recommendation?</p>
      </div>
      <form onSubmit={hs} style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
        <input type="text" placeholder="Parent's Name (Optional)" value={pn} onChange={e => setPn(e.target.value)} className="dq-input" />
        <input type="email" required placeholder="Email Address" value={em} onChange={e => setEm(e.target.value)} className="dq-input" />
        <button type="submit" className="dq-btn" disabled={loading || !em} style={{ marginTop: 4, opacity: loading || !em ? 0.5 : 1, cursor: loading || !em ? "not-allowed" : "pointer" }}>{loading ? "Sending..." : "See My Results →"}</button>
      </form>
    </div>
  );
}

function ResultScreen({ program, scores, childName, onRetake }: { program: SectionKey; scores: Record<SectionKey, number>; childName: string; onRetake: () => void }) {
  const meta = SECTION_META[program]; const { Icon } = meta; const tier = getResultTier(scores[program]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ borderRadius: 28, overflow: "hidden", border: `3px solid ${meta.accentColor}` }}>
        <div style={{ background: NAVY, padding: "28px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#7DD3FC", margin: "0 0 8px" }}>{childName ? `${childName}'s Best Fit` : "Your Explorer's Best Fit"}</p>
          <h2 style={{ fontSize: "clamp(26px,6vw,36px)", fontWeight: 700, color: "#fff", margin: 0 }}>{meta.title}</h2>
          <p style={{ fontSize: 13, fontWeight: 700, marginTop: 6, color: meta.accentColor }}>{meta.subtitle}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px", background: meta.bgCard }}>
          <m.div animate={{ scale: [1, 1.05, 1] }}
            // @ts-ignore
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 88, height: 88, borderRadius: "50%", background: "#fff", border: `3px solid ${meta.accentColor}`, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
            <Icon className="w-14 h-14" />
          </m.div>
          <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: "#475569", textAlign: "center", maxWidth: 320 }}>{RESULT_COPY[program][tier]}</p>
        </div>
      </div>
      <div style={{ borderRadius: 20, background: "#FEF8C8", border: "2px solid #FDE261", padding: "16px 20px" }}>
        <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#B45309", margin: "0 0 6px" }}>One Important Reminder</p>
        <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.6, color: "#92400E", margin: 0 }}>Our teachers will also consider how your child responds during the actual Discovery Day experience.</p>
        <p style={{ marginTop: 10, textAlign: "center", fontSize: 13, fontWeight: 700, fontStyle: "italic", color: "#92400E" }}>&quot;The goal is to find the program that fits the child.&quot;</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 6, width: "100%" }}>
        <Link
          href={`/inquire?program=${encodeURIComponent(meta.title)}&child=${encodeURIComponent(childName || "")}`}
          className="dq-btn"
          style={{ textDecoration: "none", width: "100%", boxSizing: "border-box" }}
        >
          Book Discovery Day &rarr;
        </Link>
        <button
          onClick={onRetake}
          className="dq-btn-outline"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function DiscoveryQuiz() {
  const [phase, setPhase] = useState<QuizPhase>("intro");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [qIndex, setQIndex] = useState(0);
  const [scores, setScores] = useState<Record<SectionKey, number>>({ curious: 0, creative: 0, trailblazer: 0 });
  const [locked, setLocked] = useState(false);
  const [finalProgram, setFinalProgram] = useState<SectionKey>("curious");

  const firstName = childName ? childName.trim().split(" ")[0] : "your child";
  const questions = getQuestions(firstName);

  function handleAnswer(pts: number) {
    if (locked) return; setLocked(true);
    const q = questions[qIndex]; const sec = q.section;
    const ns = scores[sec] + pts;
    setScores(prev => ({ ...prev, [sec]: ns }));
    setTimeout(() => {
      setLocked(false);
      const eod = (qIndex + 1) % 5 === 0;
      if (eod) {
        if (sec === "curious" && ns >= 6) { setFinalProgram("curious"); setPhase("email-capture"); return; }
        if (sec === "creative" && ns < 8) { setFinalProgram("creative"); setPhase("email-capture"); return; }
        if (qIndex + 1 === questions.length) { setFinalProgram("trailblazer"); setPhase("email-capture"); return; }
      }
      setQIndex(q => q + 1);
    }, 400);
  }

  function retake() {
    setPhase("intro"); setChildName(""); setChildAge("");
    setQIndex(0); setScores({ curious: 0, creative: 0, trailblazer: 0 });
    setLocked(false); setFinalProgram("curious");
  }

  const getAttempted = () => {
    if (qIndex < 5) return ["curious" as SectionKey];
    if (qIndex < 10) return ["curious" as SectionKey, "creative" as SectionKey];
    return ["curious" as SectionKey, "creative" as SectionKey, "trailblazer" as SectionKey];
  };

  const animKey = phase === "question" ? `q-${qIndex}` : phase;

  const BUBBLES = [
    { l: "8%", c: "#fff", s: 14, d: 11, t: 0 }, { l: "18%", c: SUN, s: 10, d: 14, t: -5 },
    { l: "32%", c: "#fff", s: 18, d: 13, t: -9 }, { l: "47%", c: "#ff9ec4", s: 12, d: 16, t: -3 },
    { l: "61%", c: "#fff", s: 16, d: 12, t: -7 }, { l: "74%", c: SUN, s: 12, d: 15, t: -11 },
    { l: "86%", c: "#fff", s: 20, d: 17, t: -2 }, { l: "94%", c: "#b7f0c2", s: 12, d: 13, t: -8 },
  ];

  return (
    <LazyMotion features={domAnimation}>
      {/* Universal Floating Pill Header */}
      <SiteHeader />

      <main className={`${fredoka.className} dq-page`}>
        {/* Decorations */}
        <div className="dq-decor" aria-hidden="true">
          <div className="dq-pos dq-bob" style={{ top: 75, left: 10 }}><Rainbow w={230} /></div>
          <div className="dq-pos dq-bob" style={{ top: 70, right: 18, animationDelay: "-2s" }}><Sun s={150} /></div>
          <div className="dq-pos dq-cross" style={{ top: "10%", animationDuration: "55s", animationDelay: "-12s" }}><Cloud w={170} /></div>
          <div className="dq-pos dq-cross" style={{ top: "30%", animationDuration: "75s", animationDelay: "-48s" }}><Cloud w={120} /></div>
          <div className="dq-pos dq-cross" style={{ top: "52%", animationDuration: "65s", animationDelay: "-30s" }}><Cloud w={150} /></div>
          <div className="dq-pos dq-cross" style={{ top: "70%", animationDuration: "90s", animationDelay: "-70s" }}><Cloud w={110} /></div>
          <div className="dq-pos dq-twinkle" style={{ top: 120, left: "24%" }}><Star s={36} rot={-12} /></div>
          <div className="dq-pos dq-twinkle" style={{ top: "55%", left: "6%", animationDelay: "-1s" }}><Star s={44} rot={10} /></div>
          <div className="dq-pos dq-twinkle" style={{ bottom: 170, right: "8%", animationDelay: "-2s" }}><Star s={40} rot={14} /></div>
          <div className="dq-pos dq-twinkle" style={{ top: "22%", right: "26%", animationDelay: "-.5s" }}><Star s={28} rot={-6} /></div>
          {BUBBLES.map((b, i) => (<span key={i} className="dq-bubble" style={{ left: b.l, width: b.s, height: b.s, background: b.c, animationDuration: `${b.d}s`, animationDelay: `${b.t}s` }} />))}
          <div className="dq-pos dq-plane"><Plane w={80} /></div>
          <div className="dq-pos dq-rocket"><Rocket s={110} /></div>
          <div className="dq-pos dq-sway" style={{ bottom: 0, left: -20, right: -20, display: "flex", justifyContent: "space-around" }}><Cloud w={190} /><Cloud w={230} /><Cloud w={180} /><Cloud w={220} /></div>
        </div>

        {/* Content */}
        <div className="dq-wrap">
          <div className="dq-logo">
            <Image src="/LOGO-noBG.png" alt="Merry Explorers" fill className="object-contain" style={{ padding: 6 }} />
          </div>
          <div className="dq-card">
            <div className="dq-tape" aria-hidden="true" />
            {phase === "question" && (
              <div className="dq-progress-row">
                <button onClick={retake} className="dq-back-btn">&#8592; Start Over</button>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, maxWidth: 180, margin: "0 auto" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#5b74a8", textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{qIndex + 1} / {questions.length}</span>
                  <div style={{ flex: 1, height: 6, background: "#b6dcf5", borderRadius: 99, overflow: "hidden" }}>
                    <m.div style={{ height: "100%", background: SUN, borderRadius: 99 }} initial={{ width: 0 }} animate={{ width: `${((qIndex + 1) / questions.length) * 100}%` }} transition={{ duration: 0.35 }} />
                  </div>
                </div>
              </div>
            )}
            <div className="dq-content">
              <AnimatePresence mode="wait">
                <m.div key={animKey} initial={slide.initial} animate={slide.animate} exit={slide.exit} transition={slide.transition} style={{ width: "100%" }}>
                  {phase === "intro" && <IntroScreen onStart={() => setPhase("child-info")} />}
                  {phase === "child-info" && <ChildInfoScreen childName={childName} setChildName={setChildName} childAge={childAge} setChildAge={setChildAge} onNext={() => setPhase("question")} />}
                  {phase === "question" && <QuestionScreen qIndex={qIndex} section={questions[qIndex].section} questionText={questions[qIndex].text} onAnswer={handleAnswer} />}
                  {phase === "email-capture" && <EmailCaptureScreen program={finalProgram} scores={scores} attempted={getAttempted()} childName={childName} childAge={childAge} onSubmit={() => setPhase("result")} />}
                  {phase === "result" && <ResultScreen program={finalProgram} scores={scores} childName={childName} onRetake={retake} />}
                </m.div>
              </AnimatePresence>
            </div>
          </div>
          <div className="dq-below"><DreamBanner w={440} /><p className="dq-copy">© {new Date().getFullYear()} Merry Explorers · Discovery Day Quiz</p></div>
        </div>

        <style>{`
          .dq-page{position:relative;min-height:100vh;width:100%;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:125px 16px 200px;background:radial-gradient(ellipse at 50% 0%,#b9e5fb 0%,${SKY} 60%,#74c3f1 100%);color:${NAVY};}
          .dq-decor{position:absolute;inset:0;pointer-events:none;}
          .dq-pos{position:absolute;}
          .dq-wrap{position:relative;z-index:1;width:100%;max-width:480px;display:flex;flex-direction:column;align-items:center;}
          .dq-logo{position:relative;z-index:2;width:104px;height:104px;border-radius:50%;background:#fff;border:4px solid ${NAVY};box-shadow:0 6px 0 ${NAVY}33;margin-bottom:-44px;overflow:hidden;}
          .dq-card{position:relative;width:100%;background:#fff;border:4px solid ${NAVY};border-radius:28px;padding:62px 28px 28px;box-shadow:0 0 0 6px #fff,0 12px 0 6px ${NAVY}2e;}
          .dq-tape{position:absolute;top:-16px;right:28px;width:92px;height:28px;background:repeating-linear-gradient(45deg,#ffe58a 0 8px,#ffd95e 8px 16px);opacity:.92;transform:rotate(6deg);border-radius:3px;}
          .dq-progress-row{display:flex;align-items:center;gap:12px;padding-bottom:16px;margin-bottom:4px;border-bottom:2px solid ${NAVY}15;}
          .dq-back-btn{font:inherit;font-size:12px;font-weight:700;color:#5b74a8;background:none;border:none;cursor:pointer;padding:4px 0;transition:color .15s;white-space:nowrap;}
          .dq-back-btn:hover{color:${NAVY};}
          .dq-content{min-height:360px;display:flex;flex-direction:column;justify-content:center;padding-top:8px;}
          .dq-screen{display:flex;flex-direction:column;align-items:center;text-align:center;gap:20px;padding:12px 0;}
          .dq-title{margin:0;font-size:clamp(26px,6vw,36px);font-weight:700;line-height:1.1;color:${BLUE};letter-spacing:.5px;-webkit-text-stroke:6px ${NAVY};paint-order:stroke fill;text-shadow:0 3px 0 ${NAVY};}
          .dq-title-sun{color:${SUN};-webkit-text-stroke:5px ${NAVY};text-shadow:0 3px 0 ${NAVY};}
          .dq-sub{margin:8px 0 0;font-size:14px;font-weight:500;color:#3d5a99;line-height:1.6;max-width:360px;text-align:center;}
          .dq-label{display:block;margin:0 0 6px 4px;font-size:14px;font-weight:600;color:${NAVY};}
          .dq-input{width:100%;padding:13px 16px;font:inherit;font-size:16px;font-weight:500;color:${NAVY};background:#f2faff;border:3px solid #b6dcf5;border-radius:16px;outline:none;transition:border-color .15s,background .15s,box-shadow .15s;appearance:none;-webkit-appearance:none;}
          .dq-input::placeholder{color:#8aa7cc;}
          .dq-input:focus{border-color:${BLUE};background:#fff;box-shadow:0 0 0 4px ${SUN}99;}
          .dq-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px 24px;font:inherit;font-size:18px;font-weight:700;color:${NAVY};background:linear-gradient(180deg,#ffe066 0%,${SUN} 55%,#ffb82e 100%);border:3px solid ${NAVY};border-radius:18px;box-shadow:0 6px 0 ${NAVY};cursor:pointer;transition:transform .12s,box-shadow .12s;text-decoration:none;box-sizing:border-box;}
          .dq-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 0 ${NAVY};}
          .dq-btn:active:not(:disabled){transform:translateY(5px);box-shadow:0 1px 0 ${NAVY};}
          .dq-btn:focus-visible{outline:4px solid ${BLUE};outline-offset:3px;}
          .dq-btn-outline{display:flex;align-items:center;justify-content:center;width:100%;padding:14px 24px;font:inherit;font-size:15px;font-weight:700;color:#5b74a8;background:#fff;border:3px solid ${NAVY}33;border-radius:18px;cursor:pointer;transition:border-color .15s,color .15s,background .15s,transform .12s;box-sizing:border-box;}
          .dq-btn-outline:hover{border-color:${NAVY};color:${NAVY};background:#f2faff;transform:translateY(-1px);}
          .dq-btn-outline:active{transform:translateY(2px);}
          .dq-below{position:absolute;top:100%;left:50%;transform:translateX(-50%);width:min(480px,calc(100vw - 32px));margin-top:26px;display:flex;flex-direction:column;align-items:center;}
          .dq-banner{width:100%;}
          .dq-banner svg{display:block;width:100%;height:auto;filter:drop-shadow(0 6px 0 rgba(11,42,130,.2));}
          .dq-copy{margin:4px 0 0;font-size:12px;font-weight:500;color:${NAVY};opacity:.75;text-align:center;}
          @keyframes dq-spin{to{transform:rotate(360deg);}}
          @keyframes dq-bob{0%,100%{translate:0 0;}50%{translate:0 -12px;}}
          @keyframes dq-cross{from{transform:translateX(-260px);}to{transform:translateX(calc(100vw + 260px));}}
          @keyframes dq-twinkle{0%,100%{scale:1;opacity:1;}50%{scale:.6;opacity:.55;}}
          @keyframes dq-rise{0%{transform:translateY(0) scale(.6);opacity:0;}10%{opacity:.85;}100%{transform:translateY(-110vh) translateX(30px) scale(1.1);opacity:0;}}
          @keyframes dq-plane{0%{transform:translate(-140px,0) rotate(-14deg);opacity:0;}6%{opacity:1;}50%{transform:translate(50vw,-9vh) rotate(-6deg);}94%{opacity:1;}100%{transform:translate(calc(100vw + 140px),-3vh) rotate(-14deg);opacity:0;}}
          @keyframes dq-rocket{0%{transform:translate(-140px,0);opacity:0;}6%{opacity:1;}94%{opacity:1;}100%{transform:translate(calc(100vw + 140px),-85vh);opacity:0;}}
          @keyframes dq-sway{0%,100%{translate:-14px 0;}50%{translate:14px 0;}}
          .dq-spin{animation:dq-spin 40s linear infinite;}
          .dq-bob{animation:dq-bob 5s ease-in-out infinite;}
          .dq-cross{left:0;animation:dq-cross linear infinite;}
          .dq-twinkle{animation:dq-twinkle 2.6s ease-in-out infinite;}
          .dq-bubble{position:absolute;bottom:-30px;border-radius:50%;border:2px solid #ffffffaa;animation:dq-rise linear infinite;}
          .dq-plane{left:0;top:62%;animation:dq-plane 26s linear infinite;animation-delay:-4s;}
          .dq-plane::after{content:"";position:absolute;right:78px;top:40px;width:160px;height:0;border-top:4px dashed #ffffffcc;transform:rotate(-4deg);transform-origin:right;}
          .dq-rocket{left:0;bottom:0;animation:dq-rocket 20s ease-in infinite;animation-delay:-9s;}
          .dq-sway{animation:dq-sway 9s ease-in-out infinite;}
          @media(max-width:900px){.dq-plane,.dq-rocket{scale:.7;}}
          @media(max-width:520px){.dq-page{padding:105px 12px 180px;}.dq-card{padding:58px 18px 22px;}.dq-title{font-size:24px;}}
          @media(prefers-reduced-motion:reduce){.dq-spin,.dq-bob,.dq-cross,.dq-twinkle,.dq-sway{animation:none;}.dq-plane,.dq-rocket,.dq-bubble{display:none;}.dq-btn{transition:none;}}
          *{box-sizing:border-box;}
        `}</style>
      </main>
    </LazyMotion>
  );
}

