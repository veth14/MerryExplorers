"use client";

import { Fredoka } from "next/font/google";

export const merryFont = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const M = {
    sky: "#8fd3f7", navy: "#0b2a82", blue: "#1f7ae0", sun: "#ffd23f", orange: "#ff8a1f",
};

// ─── Sticker decorations ──────────────────────────────────────────────────────

export function Cloud({ w = 160 }: { w?: number }) {
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

export function Rainbow({ w = 230 }: { w?: number }) {
    const bands = ["#ef4444", "#ff9a1f", "#ffd23f", "#4cc35b", "#2f8bf0", "#7c4dcc"];
    return (
        <svg width={w} viewBox="0 0 200 110" aria-hidden="true">
            <path d="M12 104 A88 88 0 0 1 188 104" fill="none" stroke="#fff" strokeWidth="64" strokeLinecap="round" />
            {bands.map((c, i) => (
                <path key={c} d={`M${14 + i * 9} 104 A${86 - i * 9} ${86 - i * 9} 0 0 1 ${186 - i * 9} 104`} fill="none" stroke={c} strokeWidth="9.5" />
            ))}
        </svg>
    );
}

export function Star({ s = 40, rot = 0 }: { s?: number; rot?: number }) {
    return (
        <svg width={s} height={s} viewBox="0 0 24 24" style={{ transform: `rotate(${rot}deg)` }} aria-hidden="true">
            <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill={M.sun} stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" paintOrder="stroke" />
        </svg>
    );
}

export function Sun({ s = 150 }: { s?: number }) {
    return (
        <svg width={s} height={s} viewBox="0 0 120 120" aria-hidden="true">
            <g className="me-spin" style={{ transformOrigin: "60px 60px" }} stroke={M.sun} strokeWidth="9" strokeLinecap="round">
                {Array.from({ length: 12 }).map((_, i) => (
                    <line key={i} x1="60" y1="8" x2="60" y2="20" transform={`rotate(${i * 30} 60 60)`} />
                ))}
            </g>
            <circle cx="60" cy="60" r="31" fill="#ffe27a" stroke="#f6b91c" strokeWidth="4" />
            <circle cx="49" cy="55" r="3.2" fill={M.navy} /><circle cx="71" cy="55" r="3.2" fill={M.navy} />
            <circle cx="42" cy="66" r="5" fill="#ffa8a8" opacity=".7" /><circle cx="78" cy="66" r="5" fill="#ffa8a8" opacity=".7" />
            <path d="M50 67 Q60 78 70 67" fill="none" stroke={M.navy} strokeWidth="3.2" strokeLinecap="round" />
        </svg>
    );
}

export function Plane({ w = 90 }: { w?: number }) {
    return (
        <svg width={w} viewBox="0 0 100 80" aria-hidden="true">
            <path d="M6 36 L94 6 L66 74 L50 46 Z" fill="#e8f5ff" stroke="#fff" strokeWidth="8" strokeLinejoin="round" />
            <path d="M6 36 L94 6 L66 74 L50 46 Z" fill="#e8f5ff" stroke={M.blue} strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M94 6 L50 46 L56 62 Z" fill="#9fd0f5" stroke={M.blue} strokeWidth="3.5" strokeLinejoin="round" />
        </svg>
    );
}

export function Rocket({ s = 110 }: { s?: number }) {
    return (
        <svg width={s} height={s} viewBox="0 0 100 100" aria-hidden="true">
            <g transform="rotate(40 50 50)" strokeLinejoin="round">
                <path d="M50 4 C70 20 72 52 66 72 H34 C28 52 30 20 50 4Z" fill="#fff" stroke="#fff" strokeWidth="9" />
                <path d="M34 50 L16 70 L18 42 Z M66 50 L84 70 L82 42 Z" fill="#e53935" stroke="#fff" strokeWidth="6" />
                <path d="M50 4 C70 20 72 52 66 72 H34 C28 52 30 20 50 4Z" fill="#fff" stroke={M.navy} strokeWidth="3" />
                <path d="M50 4 C58 10 63 18 65 26 H35 C37 18 42 10 50 4Z" fill="#e53935" />
                <circle cx="50" cy="44" r="9" fill="#7fd0ff" stroke={M.navy} strokeWidth="3" />
                <path d="M40 74 Q50 98 60 74Z" fill={M.sun} stroke={M.orange} strokeWidth="3" />
            </g>
        </svg>
    );
}

// ─── Backdrop ─────────────────────────────────────────────────────────────────
// variant="full": plane, rocket, bubbles (login, onboarding)
// variant="calm": sky, sun, rainbow, clouds, stars only (dashboard, forms)

export function ExplorerBackdrop({ variant = "full" }: { variant?: "full" | "calm" }) {
    const full = variant === "full";
    return (
        <div className="me-decor" aria-hidden="true">
            <div className="me-pos me-bob" style={{ top: 10, left: 10 }}><Rainbow w={230} /></div>
            <div className="me-pos me-bob" style={{ top: 14, right: 18, animationDelay: "-2s" }}><Sun s={150} /></div>

            <div className="me-pos me-cross" style={{ top: "10%", animationDuration: "55s", animationDelay: "-12s" }}><Cloud w={170} /></div>
            <div className="me-pos me-cross" style={{ top: "34%", animationDuration: "75s", animationDelay: "-48s" }}><Cloud w={120} /></div>
            {full && <div className="me-pos me-cross" style={{ top: "56%", animationDuration: "65s", animationDelay: "-30s" }}><Cloud w={150} /></div>}

            <div className="me-pos me-twinkle" style={{ top: 120, left: "24%" }}><Star s={36} rot={-12} /></div>
            <div className="me-pos me-twinkle" style={{ top: "55%", left: "6%", animationDelay: "-1s" }}><Star s={44} rot={10} /></div>
            <div className="me-pos me-twinkle" style={{ bottom: 170, right: "8%", animationDelay: "-2s" }}><Star s={40} rot={14} /></div>

            {full && (
                <>
                    {[
                        { l: "8%", c: "#fff", s: 14, d: 11, t: 0 }, { l: "22%", c: M.sun, s: 10, d: 14, t: -5 },
                        { l: "38%", c: "#fff", s: 18, d: 13, t: -9 }, { l: "55%", c: "#ff9ec4", s: 12, d: 16, t: -3 },
                        { l: "70%", c: "#fff", s: 16, d: 12, t: -7 }, { l: "84%", c: M.sun, s: 12, d: 15, t: -11 },
                        { l: "94%", c: "#b7f0c2", s: 12, d: 13, t: -8 },
                    ].map((b, i) => (
                        <span key={i} className="me-bubble" style={{ left: b.l, width: b.s, height: b.s, background: b.c, animationDuration: `${b.d}s`, animationDelay: `${b.t}s` }} />
                    ))}
                    <div className="me-pos me-plane"><Plane w={80} /></div>
                    <div className="me-pos me-rocket"><Rocket s={110} /></div>
                </>
            )}

            <div className="me-pos me-sway" style={{ bottom: 0, left: -20, right: -20, display: "flex", justifyContent: "space-around" }}>
                <Cloud w={190} /><Cloud w={230} /><Cloud w={180} /><Cloud w={220} />
            </div>
        </div>
    );
}

// ─── Shared styles (render once per page) ─────────────────────────────────────

export function MerryStyles() {
    const { navy, blue, sun } = M;
    return (
        <style>{`
      .me-page { position: relative; min-height: 100vh; width: 100%; overflow: hidden; color: ${navy};
        background: radial-gradient(ellipse at 50% 0%, #b9e5fb 0%, ${M.sky} 60%, #74c3f1 100%); }
      .me-decor { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
      .me-pos { position: absolute; }
      .me-layer { position: relative; z-index: 1; }

      .me-card { position: relative; background: #fff; border: 4px solid ${navy}; border-radius: 28px;
        box-shadow: 0 0 0 6px #fff, 0 12px 0 6px ${navy}2e; }
      .me-tape { position: absolute; top: -16px; right: 28px; width: 92px; height: 28px; opacity: .92; border-radius: 3px;
        transform: rotate(6deg); background: repeating-linear-gradient(45deg, #ffe58a 0 8px, #ffd95e 8px 16px); }
      .me-title { margin: 0; text-align: center; font-weight: 700; color: ${blue}; line-height: 1.1;
        -webkit-text-stroke: 7px ${navy}; paint-order: stroke fill; text-shadow: 0 4px 0 ${navy}; }

      .me-input { width: 100%; padding: 14px 18px; font: inherit; font-size: 16px; font-weight: 500; color: ${navy};
        background: #f2faff; border: 3px solid #b6dcf5; border-radius: 16px; outline: none; transition: border-color .15s, box-shadow .15s, background .15s; }
      .me-input::placeholder { color: #8aa7cc; }
      .me-input:focus { border-color: ${blue}; background: #fff; box-shadow: 0 0 0 4px ${sun}99; }

      .me-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 14px; font: inherit;
        font-size: 18px; font-weight: 700; color: ${navy}; cursor: pointer; border: 3px solid ${navy}; border-radius: 18px;
        background: linear-gradient(180deg, #ffe066 0%, ${sun} 55%, #ffb82e 100%); box-shadow: 0 6px 0 ${navy};
        transition: transform .12s, box-shadow .12s; }
      .me-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 0 ${navy}; }
      .me-btn:active:not(:disabled) { transform: translateY(5px); box-shadow: 0 1px 0 ${navy}; }
      .me-btn:focus-visible, .me-pill:focus-visible, .me-link:focus-visible { outline: 4px solid ${blue}; outline-offset: 3px; }
      .me-btn:disabled { cursor: not-allowed; background: #ffe9a3; border-color: ${navy}88; box-shadow: 0 6px 0 ${navy}66; }
      .me-btn-ghost { background: #fff; box-shadow: 0 6px 0 ${navy}55; }

      .me-pill { font: inherit; font-size: 15px; font-weight: 600; color: ${navy}; background: #f2faff; cursor: pointer;
        border: 3px solid #b6dcf5; border-radius: 999px; padding: 8px 16px; transition: transform .12s, background .12s; }
      .me-pill:hover { transform: scale(1.05); }
      .me-pill[aria-pressed="true"] { background: #fff3b0; border-color: ${navy}; box-shadow: 0 3px 0 ${navy}; }

      .me-error { background: #fff1ee; border: 3px solid #ff6b57; border-radius: 14px; padding: 10px 14px; font-size: 14px; font-weight: 600; color: #b3261e; }
      .me-link { background: none; border: none; font: inherit; font-size: 14px; font-weight: 600; color: ${blue}; cursor: pointer; text-decoration: underline; }

      @keyframes me-spin { to { transform: rotate(360deg); } }
      @keyframes me-bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -12px; } }
      @keyframes me-cross { from { transform: translateX(-260px); } to { transform: translateX(calc(100vw + 260px)); } }
      @keyframes me-twinkle { 0%, 100% { scale: 1; opacity: 1; } 50% { scale: .6; opacity: .55; } }
      @keyframes me-rise { 0% { transform: translateY(0) scale(.6); opacity: 0; } 10% { opacity: .85; } 100% { transform: translateY(-110vh) translateX(30px) scale(1.1); opacity: 0; } }
      @keyframes me-plane { 0% { transform: translate(-140px, 0) rotate(-14deg); opacity: 0; } 6% { opacity: 1; } 50% { transform: translate(50vw, -9vh) rotate(-6deg); } 94% { opacity: 1; } 100% { transform: translate(calc(100vw + 140px), -3vh) rotate(-14deg); opacity: 0; } }
      @keyframes me-rocket { 0% { transform: translate(-140px, 0); opacity: 0; } 6% { opacity: 1; } 94% { opacity: 1; } 100% { transform: translate(calc(100vw + 140px), -85vh); opacity: 0; } }
      @keyframes me-sway { 0%, 100% { translate: -14px 0; } 50% { translate: 14px 0; } }
      @keyframes me-pop { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }
      .me-spin { animation: me-spin 40s linear infinite; }
      .me-bob { animation: me-bob 5s ease-in-out infinite; }
      .me-cross { left: 0; animation: me-cross linear infinite; }
      .me-twinkle { animation: me-twinkle 2.6s ease-in-out infinite; }
      .me-bubble { position: absolute; bottom: -30px; border-radius: 50%; border: 2px solid #ffffffaa; animation: me-rise linear infinite; }
      .me-plane { left: 0; top: 62%; animation: me-plane 26s linear infinite; animation-delay: -4s; }
      .me-rocket { left: 0; bottom: 0; animation: me-rocket 20s ease-in infinite; animation-delay: -9s; }
      .me-sway { animation: me-sway 9s ease-in-out infinite; }
      .me-step { animation: me-pop .35s ease both; }

      @media (max-width: 900px) { .me-plane, .me-rocket { scale: .7; } }
      @media (prefers-reduced-motion: reduce) {
        .me-spin, .me-bob, .me-cross, .me-twinkle, .me-sway, .me-step { animation: none; }
        .me-plane, .me-rocket, .me-bubble { display: none; }
        .me-btn, .me-pill { transition: none; }
      }
      * { box-sizing: border-box; }
    `}</style>
    );
}