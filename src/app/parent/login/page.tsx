"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Fredoka } from "next/font/google";
import { useAuth } from "@/lib/auth-context";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

// Palette taken from the Merry Explorers post
const SKY = "#8fd3f7";
const NAVY = "#0b2a82";
const BLUE = "#1f7ae0";
const SUN = "#ffd23f";
const ORANGE = "#ff8a1f";

// ─── Form icons ───────────────────────────────────────────────────────────────

const iconProps = {
  width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
};
const MailIcon = () => (<svg {...iconProps}><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>);
const LockIcon = () => (<svg {...iconProps}><rect width="18" height="11" x="3" y="11" rx="3" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>);
const EyeIcon = () => (<svg {...iconProps}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>);
const EyeOffIcon = () => (<svg {...iconProps}><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>);

// ─── Sticker decorations ──────────────────────────────────────────────────────

function Cloud({ w = 160 }: { w?: number }) {
  return (
    <svg width={w} viewBox="0 0 160 90" aria-hidden="true">
      <g fill="#fff" stroke="#fff" strokeWidth="8" strokeLinejoin="round">
        <circle cx="45" cy="55" r="26" /><circle cx="80" cy="38" r="32" />
        <circle cx="116" cy="55" r="26" /><rect x="45" y="55" width="72" height="26" />
      </g>
      <g fill="#fff" stroke="#c9e8fb" strokeWidth="2.5">
        <circle cx="45" cy="55" r="26" /><circle cx="80" cy="38" r="32" />
        <circle cx="116" cy="55" r="26" />
      </g>
      <rect x="40" y="52" width="82" height="30" fill="#fff" />
    </svg>
  );
}

function Rainbow({ w = 230 }: { w?: number }) {
  const bands = ["#ef4444", "#ff9a1f", "#ffd23f", "#4cc35b", "#2f8bf0", "#7c4dcc"];
  const sticker = "drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff)";
  return (
    <svg width={w} viewBox="0 0 160 90" style={{ overflow: "visible", filter: sticker }} aria-hidden="true">
      {bands.map((c, i) => {
        const r = 68 - i * 7;
        return <path key={c} d={`M${80 - r} 70A${r} ${r} 0 0 1 ${80 + r} 70`} fill="none" stroke={c} strokeWidth="7" />;
      })}
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
      <g className="me-spin" style={{ transformOrigin: "60px 60px" }} stroke={SUN} strokeWidth="9" strokeLinecap="round">
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1="60" y1="8" x2="60" y2="20" transform={`rotate(${i * 30} 60 60)`} />
        ))}
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

// ─── "Dream. Discover. Explore." brush banner ─────────────────────────────────

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

function DreamBanner({ w = 520 }: { w?: number }) {
  const text = {
    fontSize: 58, fontWeight: 700, textAnchor: "middle" as const, letterSpacing: 1,
    strokeLinejoin: "round" as const, strokeLinecap: "round" as const, paintOrder: "stroke",
  };
  const CENTER = "M70 175Q400 5 730 175"; // band centerline
  return (
    <div className="me-banner" role="img" aria-label="Dream. Discover. Explore." style={{ width: `min(${w}px, 100%)` }}>
      <svg viewBox="-30 -10 860 270" aria-hidden="true">
        <defs>
          <filter id="me-rough" filterUnits="userSpaceOnUse" x="0" y="0" width="800" height="250">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.25" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <mask id="me-band-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="800" height="250">
            <path d={CENTER} fill="none" stroke="#fff" strokeWidth="92" strokeLinecap="round" />
          </mask>
          <path id="me-arc" d="M70 195Q400 25 730 195" />
        </defs>

        {/* brush band: thin light-blue rim, thick navy core */}
        <g filter="url(#me-rough)" fill="none" strokeLinecap="round">
          <path d={CENTER} stroke="#3db8ff" strokeWidth="116" />
          <path d={CENTER} stroke="#0a2380" strokeWidth="100" />
        </g>

        {/* dry-brush streaks, masked to stay inside the band */}
        <g mask="url(#me-band-mask)" fill="none" strokeLinecap="round">
          <path d={CENTER} transform="translate(0 -38)" stroke="#1e4fc4" strokeWidth="3" strokeDasharray="130 20 70 34 210 26" />
          <path d={CENTER} transform="translate(0 -26)" stroke="#2f6fe0" strokeWidth="2" strokeDasharray="90 40 160 20" />
          <path d={CENTER} transform="translate(0 28)" stroke="#2f6fe0" strokeWidth="2" strokeDasharray="140 24 80 36" />
          <path d={CENTER} transform="translate(0 38)" stroke="#1e4fc4" strokeWidth="3" strokeDasharray="70 22 190 28" />
        </g>

        {/* lettering: dark shadow, then white letters with navy outline */}
        <text {...text} fill="#041048" stroke="#041048" strokeWidth="9" transform="translate(0 5)">
          <textPath href="#me-arc" startOffset="50%"><BannerChars colored={false} /></textPath>
        </text>
        <text {...text} stroke="#0a2380" strokeWidth="5">
          <textPath href="#me-arc" startOffset="50%"><BannerChars colored /></textPath>
        </text>

        {/* splashes: bigger, fanned out from each band end, mirrored to the right */}
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
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ParentLoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password, remember);
      // signIn in auth-context handles redirect based on role
    } catch {
      setError("Incorrect email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      id="parent-login-page"
      className={`${fredoka.className} me-page`}
    >
      {/* Animated background */}
      <div className="me-decor" aria-hidden="true">
        {/* Sun + rainbow bob gently */}
        <div className="me-pos me-bob" style={{ top: 10, left: 10 }}><Rainbow w={230} /></div>
        <div className="me-pos me-bob" style={{ top: 14, right: 18, animationDelay: "-2s" }}><Sun s={150} /></div>

        {/* Clouds sail across the whole screen at different heights and speeds */}
        <div className="me-pos me-cross" style={{ top: "10%", animationDuration: "55s", animationDelay: "-12s" }}><Cloud w={170} /></div>
        <div className="me-pos me-cross" style={{ top: "30%", animationDuration: "75s", animationDelay: "-48s" }}><Cloud w={120} /></div>
        <div className="me-pos me-cross" style={{ top: "52%", animationDuration: "65s", animationDelay: "-30s" }}><Cloud w={150} /></div>
        <div className="me-pos me-cross" style={{ top: "70%", animationDuration: "90s", animationDelay: "-70s" }}><Cloud w={110} /></div>

        {/* Twinkling stars */}
        <div className="me-pos me-twinkle" style={{ top: 120, left: "24%" }}><Star s={36} rot={-12} /></div>
        <div className="me-pos me-twinkle" style={{ top: "55%", left: "6%", animationDelay: "-1s" }}><Star s={44} rot={10} /></div>
        <div className="me-pos me-twinkle" style={{ bottom: 170, right: "8%", animationDelay: "-2s" }}><Star s={40} rot={14} /></div>
        <div className="me-pos me-twinkle" style={{ top: "22%", right: "26%", animationDelay: "-.5s" }}><Star s={28} rot={-6} /></div>

        {/* Colourful bubbles float up */}
        {[
          { l: "8%", c: "#fff", s: 14, d: 11, t: 0 },
          { l: "18%", c: SUN, s: 10, d: 14, t: -5 },
          { l: "32%", c: "#fff", s: 18, d: 13, t: -9 },
          { l: "47%", c: "#ff9ec4", s: 12, d: 16, t: -3 },
          { l: "61%", c: "#fff", s: 16, d: 12, t: -7 },
          { l: "74%", c: SUN, s: 12, d: 15, t: -11 },
          { l: "86%", c: "#fff", s: 20, d: 17, t: -2 },
          { l: "94%", c: "#b7f0c2", s: 12, d: 13, t: -8 },
        ].map((b, i) => (
          <span
            key={i}
            className="me-bubble"
            style={{ left: b.l, width: b.s, height: b.s, background: b.c, animationDuration: `${b.d}s`, animationDelay: `${b.t}s` }}
          />
        ))}

        {/* Flyers */}
        <div className="me-pos me-plane"><Plane w={80} /></div>
        <div className="me-pos me-rocket"><Rocket s={110} /></div>

        {/* Bottom cloud bank sways */}
        <div className="me-pos me-sway" style={{ bottom: 0, left: -20, right: -20, display: "flex", justifyContent: "space-around" }}>
          <Cloud w={190} /><Cloud w={230} /><Cloud w={180} /><Cloud w={220} />
        </div>
      </div>

      <div className="me-wrap">
        {/* Logo sticker */}
        <div className="me-logo">
          <Image src="/LOGO-noBG.png" alt="Merry Explorers" fill className="object-contain" style={{ padding: 6 }} />
        </div>

        {/* Card — styled like the taped photo frames in the post */}
        <div className="me-card">
          <div className="me-tape" aria-hidden="true" />

          <h1 className="me-title">Parent Portal</h1>
          <p className="me-sub">Sign in to follow your child&apos;s adventure at Merry Explorers</p>

          <form onSubmit={handleSubmit} noValidate style={{ display: "grid", gap: 18 }}>
            {/* Email */}
            <div>
              <label htmlFor="parent-email" className="me-label">Email address</label>
              <div style={{ position: "relative" }}>
                <span className="me-icon-l"><MailIcon /></span>
                <input
                  id="parent-email"
                  className="me-input"
                  type="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="parent-password" className="me-label">Password</label>
              <div style={{ position: "relative" }}>
                <span className="me-icon-l"><LockIcon /></span>
                <input
                  id="parent-password"
                  className="me-input"
                  style={{ paddingRight: 48 }}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="me-eye"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label htmlFor="parent-remember" className="me-remember">
              <input
                id="parent-remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={loading}
              />
              Remember me for 30 days
            </label>

            {/* Error */}
            {error && (
              <div role="alert" className="me-error">{error}</div>
            )}

            {/* Submit */}
            <button id="parent-signin-btn" type="submit" disabled={loading} className="me-btn">
              {loading ? (
                <>
                  <span className="me-spinner" />
                  Signing in…
                </>
              ) : (
                "Sign in to portal"
              )}
            </button>
          </form>

          <p className="me-help">
            Need help?{" "}
            <Link href="/parent/contact" style={{ color: BLUE, fontWeight: 600 }}>
              Contact our team
            </Link>
          </p>
        </div>

        {/* Tagline banner + copyright hang below the card without affecting its centering */}
        <div className="me-below">
          <DreamBanner w={440} />
          <p className="me-copy">© {new Date().getFullYear()} Merry Explorers · Secure Parent Portal</p>
        </div>
      </div>

      <style>{`
        .me-page {
          position: relative; min-height: 100vh; width: 100%; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          padding: 40px 16px 200px;
          background: radial-gradient(ellipse at 50% 0%, #b9e5fb 0%, ${SKY} 60%, #74c3f1 100%);
          color: ${NAVY};
        }
        .me-decor { position: absolute; inset: 0; pointer-events: none; }
        .me-pos { position: absolute; }
        .me-wrap { position: relative; z-index: 1; width: 100%; max-width: 440px; display: flex; flex-direction: column; align-items: center; }

        .me-logo {
          position: relative; z-index: 2; width: 104px; height: 104px; border-radius: 50%;
          background: #fff; border: 4px solid ${NAVY}; box-shadow: 0 6px 0 ${NAVY}33;
          margin-bottom: -44px; overflow: hidden;
        }
        .me-card {
          position: relative; width: 100%; background: #fff; border: 4px solid ${NAVY};
          border-radius: 28px; padding: 62px 28px 26px;
          box-shadow: 0 0 0 6px #fff, 0 12px 0 6px ${NAVY}2e;
        }
        .me-tape {
          position: absolute; top: -16px; right: 28px; width: 92px; height: 28px;
          background: repeating-linear-gradient(45deg, #ffe58a 0 8px, #ffd95e 8px 16px);
          opacity: .92; transform: rotate(6deg); border-radius: 3px;
        }
        .me-title {
          margin: 0 0 6px; text-align: center; font-size: 40px; line-height: 1.05; font-weight: 700;
          color: ${BLUE}; letter-spacing: .5px;
          -webkit-text-stroke: 7px ${NAVY}; paint-order: stroke fill;
          text-shadow: 0 4px 0 ${NAVY};
        }
        .me-sub { margin: 0 0 24px; text-align: center; font-size: 15px; font-weight: 500; color: #3d5a99; }
        .me-label { display: block; margin: 0 0 6px 4px; font-size: 15px; font-weight: 600; color: ${NAVY}; }

        .me-input {
          width: 100%; padding: 13px 14px 13px 46px; font: inherit; font-size: 16px; font-weight: 500;
          color: ${NAVY}; background: #f2faff; border: 3px solid #b6dcf5; border-radius: 16px; outline: none;
          transition: border-color .15s, background .15s, box-shadow .15s;
        }
        .me-input::placeholder { color: #8aa7cc; }
        .me-input:focus { border-color: ${BLUE}; background: #fff; box-shadow: 0 0 0 4px ${SUN}99; }
        .me-input:disabled { opacity: .6; }
        .me-icon-l { position: absolute; inset: 0 auto 0 0; display: flex; align-items: center; padding-left: 15px; color: ${BLUE}; pointer-events: none; }
        .me-eye {
          position: absolute; inset: 0 0 0 auto; display: flex; align-items: center; padding: 0 15px;
          color: ${BLUE}; background: none; border: none; cursor: pointer; border-radius: 0 16px 16px 0;
        }
        .me-eye:focus-visible { outline: 3px solid ${NAVY}; outline-offset: -3px; }

        .me-remember { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; color: #3d5a99; cursor: pointer; user-select: none; }
        .me-remember input { width: 20px; height: 20px; accent-color: ${BLUE}; cursor: pointer; }

        .me-error {
          background: #fff1ee; border: 3px solid #ff6b57; border-radius: 14px;
          padding: 10px 14px; font-size: 14px; font-weight: 600; color: #b3261e;
        }

        .me-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%;
          padding: 14px; font: inherit; font-size: 18px; font-weight: 700; color: ${NAVY};
          background: linear-gradient(180deg, #ffe066 0%, ${SUN} 55%, #ffb82e 100%);
          border: 3px solid ${NAVY}; border-radius: 18px; box-shadow: 0 6px 0 ${NAVY};
          cursor: pointer; transition: transform .12s, box-shadow .12s;
        }
        .me-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 0 ${NAVY}; }
        .me-btn:active:not(:disabled) { transform: translateY(5px); box-shadow: 0 1px 0 ${NAVY}; }
        .me-btn:focus-visible { outline: 4px solid ${BLUE}; outline-offset: 3px; }
        .me-btn:disabled { cursor: not-allowed; background: #ffe9a3; box-shadow: 0 6px 0 ${NAVY}66; border-color: ${NAVY}88; }

        .me-spinner {
          width: 20px; height: 20px; border-radius: 50%; display: inline-block;
          border: 3px solid ${NAVY}33; border-top-color: ${NAVY}; animation: me-spin .7s linear infinite;
        }
        .me-help { margin: 22px 0 0; text-align: center; font-size: 14px; font-weight: 500; color: #5b74a8; }

        .me-below {
          position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          width: min(440px, calc(100vw - 32px)); margin-top: 26px;
          display: flex; flex-direction: column; align-items: center;
        }
        .me-banner { width: 100%; }
        .me-banner svg {
          display: block; width: 100%; height: auto;
          filter: drop-shadow(0 6px 0 rgba(11, 42, 130, .2));
        }
        .me-copy { margin: 4px 0 0; font-size: 12px; font-weight: 500; color: ${NAVY}; opacity: .75; text-align: center; }

        @keyframes me-spin { to { transform: rotate(360deg); } }
        @keyframes me-drift { 0%, 100% { translate: 0 0; } 50% { translate: 26px 0; } }
        .me-spin { animation: me-spin 40s linear infinite; }
        .me-drift { animation: me-drift 14s ease-in-out infinite; }

        @keyframes me-bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -12px; } }
        @keyframes me-cross { from { transform: translateX(-260px); } to { transform: translateX(calc(100vw + 260px)); } }
        @keyframes me-twinkle { 0%, 100% { scale: 1; opacity: 1; } 50% { scale: .6; opacity: .55; } }
        @keyframes me-rise {
          0% { transform: translateY(0) scale(.6); opacity: 0; }
          10% { opacity: .85; }
          100% { transform: translateY(-110vh) translateX(30px) scale(1.1); opacity: 0; }
        }
        @keyframes me-plane {
          0% { transform: translate(-140px, 0) rotate(-14deg); opacity: 0; }
          6% { opacity: 1; }
          50% { transform: translate(50vw, -9vh) rotate(-6deg); }
          94% { opacity: 1; }
          100% { transform: translate(calc(100vw + 140px), -3vh) rotate(-14deg); opacity: 0; }
        }
        @keyframes me-rocket {
          0% { transform: translate(-140px, 0); opacity: 0; }
          6% { opacity: 1; }
          94% { opacity: 1; }
          100% { transform: translate(calc(100vw + 140px), -85vh); opacity: 0; }
        }
        @keyframes me-sway { 0%, 100% { translate: -14px 0; } 50% { translate: 14px 0; } }
        .me-bob { animation: me-bob 5s ease-in-out infinite; }
        .me-cross { left: 0; animation: me-cross linear infinite; }
        .me-twinkle { animation: me-twinkle 2.6s ease-in-out infinite; }
        .me-bubble { position: absolute; bottom: -30px; border-radius: 50%; border: 2px solid #ffffffaa; animation: me-rise linear infinite; }
        .me-plane { left: 0; top: 62%; animation: me-plane 26s linear infinite; animation-delay: -4s; }
        .me-plane::after {
          content: ""; position: absolute; right: 78px; top: 40px; width: 160px; height: 0;
          border-top: 4px dashed #ffffffcc; transform: rotate(-4deg); transform-origin: right;
        }
        .me-rocket { left: 0; bottom: 0; animation: me-rocket 20s ease-in infinite; animation-delay: -9s; }
        .me-sway { animation: me-sway 9s ease-in-out infinite; }

        @media (max-width: 900px) { .me-plane, .me-rocket { scale: .7; } }
        @media (max-width: 480px) {
          .me-card { padding: 58px 20px 22px; }
          .me-title { font-size: 34px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .me-spin, .me-drift, .me-spinner, .me-bob, .me-cross, .me-twinkle, .me-sway { animation: none; }
          .me-plane, .me-rocket, .me-bubble { display: none; }
          .me-btn { transition: none; }
        }
        * { box-sizing: border-box; }
      `}</style>
    </main>
  );
}