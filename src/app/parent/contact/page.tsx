"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

// Palette from the Merry Explorers post (same as sign-in and support)
const SKY = "#8fd3f7";
const NAVY = "#0b2a82";
const BLUE = "#1f7ae0";
const SUN = "#ffd23f";
const ORANGE = "#ff8a1f";

// ─── Office hours (Philippine time) ───────────────────────────────────────────
// Keep OFFICE_HOURS_TEXT in sync with the numbers below if the hours change.

const OFFICE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const OFFICE_OPEN_MINS = 10 * 60; // 10:00 AM
const OFFICE_CLOSE_MINS = 17 * 60; // 5:00 PM
const OFFICE_HOURS_TEXT = "Monday – Friday · 10:00 AM – 5:00 PM";

function isOfficeOpen(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  const hour = parseInt(get("hour"), 10) % 24; // some engines report midnight as 24
  const minute = parseInt(get("minute"), 10);
  const mins = hour * 60 + minute;
  return OFFICE_DAYS.includes(weekday) && mins >= OFFICE_OPEN_MINS && mins < OFFICE_CLOSE_MINS;
}

// ─── Icons (rounded stroke, same style as the dashboard) ─────────────────────

function Svg({ size = 20, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
const MailIcon = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></Svg>
);
const PhoneIcon = () => (
  <Svg><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.1 6.1l1.27-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></Svg>
);
const MapPinIcon = () => (
  <Svg><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></Svg>
);
const ClockIcon = () => (
  <Svg><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
);
const UserIcon = () => (
  <Svg size={18}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></Svg>
);
const MessageIcon = () => (
  <Svg size={18}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Svg>
);
const SendIcon = () => (
  <Svg size={20}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></Svg>
);
const AlertIcon = () => (
  <Svg size={18}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></Svg>
);
const ArrowLeftIcon = () => (
  <Svg size={16}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></Svg>
);
const ArrowUpRightIcon = () => (
  <Svg size={16}><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></Svg>
);

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
  ["DREAM", "#ffffff"], [".", "#5cc8ff"], ["Discover", SUN], [".", "#5cc8ff"], ["Explore", "#ffffff"],
];
const BANNER_BOUNCE = [-2, 3, -3, 2, -1, 3, -2];

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

function DreamBanner({ w = 440 }: { w?: number }) {
  const text = {
    fontSize: 58, fontWeight: 700, textAnchor: "middle" as const, letterSpacing: 1,
    strokeLinejoin: "round" as const, strokeLinecap: "round" as const, paintOrder: "stroke",
  };
  const CENTER = "M70 175Q400 5 730 175";
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
        <g filter="url(#me-rough)" fill="none" strokeLinecap="round">
          <path d={CENTER} stroke="#3db8ff" strokeWidth="116" />
          <path d={CENTER} stroke="#0a2380" strokeWidth="100" />
        </g>
        <g mask="url(#me-band-mask)" fill="none" strokeLinecap="round">
          <path d={CENTER} transform="translate(0 -38)" stroke="#1e4fc4" strokeWidth="3" strokeDasharray="130 20 70 34 210 26" />
          <path d={CENTER} transform="translate(0 -26)" stroke="#2f6fe0" strokeWidth="2" strokeDasharray="90 40 160 20" />
          <path d={CENTER} transform="translate(0 28)" stroke="#2f6fe0" strokeWidth="2" strokeDasharray="140 24 80 36" />
          <path d={CENTER} transform="translate(0 38)" stroke="#1e4fc4" strokeWidth="3" strokeDasharray="70 22 190 28" />
        </g>
        <text {...text} fill="#041048" stroke="#041048" strokeWidth="9" transform="translate(0 5)">
          <textPath href="#me-arc" startOffset="50%"><BannerChars colored={false} /></textPath>
        </text>
        <text {...text} stroke="#0a2380" strokeWidth="5">
          <textPath href="#me-arc" startOffset="50%"><BannerChars colored /></textPath>
        </text>
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

// ─── Contact row ──────────────────────────────────────────────────────────────

function ContactRow({
  icon, label, value, href, bg, badge,
}: {
  icon: React.ReactNode; label: string; value: string; href?: string; bg: string; badge?: React.ReactNode;
}) {
  const body = (
    <>
      <span className="me-contact-icon">{icon}</span>
      <span className="me-contact-text">
        <span className="me-contact-top">
          <span className="me-contact-label">{label}</span>
          {badge}
        </span>
        <span className="me-contact-value">{value}</span>
      </span>
      {href && <span className="me-contact-arrow"><ArrowUpRightIcon /></span>}
    </>
  );
  return href ? (
    <a href={href} className="me-contact link" style={{ background: bg }}>{body}</a>
  ) : (
    <div className="me-contact" style={{ background: bg }}>{body}</div>
  );
}

function OfficeBadge({ open }: { open: boolean | null }) {
  // null until the browser has checked the time (avoids a server/client mismatch)
  if (open === null) return null;
  return (
    <span className={`me-badge ${open ? "open" : "closed"}`}>
      <span className="me-dot" aria-hidden="true" />
      {open ? "Open now" : "Closed now"}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ParentContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [openNow, setOpenNow] = useState<boolean | null>(null);

  useEffect(() => {
    const tick = () => setOpenNow(isOfficeOpen(new Date()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/parent-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="parent-contact-page" className={`${fredoka.className} me-page`}>
      {/* Animated background */}
      <div className="me-decor" aria-hidden="true">
        <div className="me-pos me-bob" style={{ top: 10, left: 10 }}><Rainbow w={230} /></div>
        <div className="me-pos me-bob" style={{ top: 14, right: 18, animationDelay: "-2s" }}><Sun s={150} /></div>

        <div className="me-pos me-cross" style={{ top: "10%", animationDuration: "55s", animationDelay: "-12s" }}><Cloud w={170} /></div>
        <div className="me-pos me-cross" style={{ top: "30%", animationDuration: "75s", animationDelay: "-48s" }}><Cloud w={120} /></div>
        <div className="me-pos me-cross" style={{ top: "52%", animationDuration: "65s", animationDelay: "-30s" }}><Cloud w={150} /></div>
        <div className="me-pos me-cross" style={{ top: "70%", animationDuration: "90s", animationDelay: "-70s" }}><Cloud w={110} /></div>

        <div className="me-pos me-twinkle" style={{ top: 120, left: "24%" }}><Star s={36} rot={-12} /></div>
        <div className="me-pos me-twinkle" style={{ top: "55%", left: "4%", animationDelay: "-1s" }}><Star s={44} rot={10} /></div>
        <div className="me-pos me-twinkle" style={{ bottom: 170, right: "5%", animationDelay: "-2s" }}><Star s={40} rot={14} /></div>
        <div className="me-pos me-twinkle" style={{ top: "22%", right: "26%", animationDelay: "-.5s" }}><Star s={28} rot={-6} /></div>

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
          <span key={i} className="me-bubble" style={{ left: b.l, width: b.s, height: b.s, background: b.c, animationDuration: `${b.d}s`, animationDelay: `${b.t}s` }} />
        ))}

        <div className="me-pos me-plane"><Plane w={80} /></div>
        <div className="me-pos me-rocket"><Rocket s={110} /></div>

        <div className="me-pos me-sway" style={{ bottom: 0, left: -20, right: -20, display: "flex", justifyContent: "space-around" }}>
          <Cloud w={190} /><Cloud w={230} /><Cloud w={180} /><Cloud w={220} />
        </div>
      </div>

      <div className="me-wrap">
        <div id="parent-contact-grid" className="me-card">
          <div className="me-tape" aria-hidden="true" />

          {/* ── Left: contact details ── */}
          <aside className="me-side" aria-labelledby="pc-title">
            <div className="me-logo">
              <Image src="/LOGO-noBG.png" alt="Merry Explorers" fill sizes="108px" priority className="object-contain" style={{ padding: 6 }} />
            </div>
            <h1 id="pc-title" className="me-title">Contact our team</h1>
            <p className="me-sub">We&apos;re here to help. Reach out any time.</p>

            <div className="me-contacts">
              <ContactRow icon={<MailIcon />} label="Email" value="merryexplorerscenter@gmail.com" href="mailto:merryexplorerscenter@gmail.com" bg="#dff1ff" />
              <ContactRow icon={<PhoneIcon />} label="Phone / Messenger" value="0917 123 4567" href="tel:+639171234567" bg="#d8f5dc" />
              <ContactRow icon={<MapPinIcon />} label="Location" value="Merry Explorers Learning Center, Philippines" bg="#fff6cf" />
              <ContactRow icon={<ClockIcon />} label="Office hours" value={OFFICE_HOURS_TEXT} bg="#ffe3ef" badge={<OfficeBadge open={openNow} />} />
            </div>

            <div className="me-side-bottom">
              <p className="me-note">Urgent about your child? Please call us or visit during office hours.</p>
              <Link href="/parent/login" className="me-btn ghost small"><ArrowLeftIcon />Back to login</Link>
            </div>
          </aside>

          {/* ── Right: message form or success ── */}
          <section className="me-main" aria-live="polite">
            {sent ? (
              <div className="me-done" role="status">
                <span className="me-check" aria-hidden="true">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                </span>
                <h2 className="me-h2" style={{ textAlign: "center" }}>Message sent!</h2>
                <p className="me-sub" style={{ margin: "0 auto 22px", textAlign: "center", maxWidth: 360, overflowWrap: "anywhere" }}>
                  Thank you for reaching out! A confirmation has been sent to <strong>{email.trim() || "your email inbox"}</strong>. We&apos;ll get back to you as soon as we can.
                </p>
                <button
                  type="button"
                  className="me-btn"
                  onClick={() => { setSent(false); setName(""); setEmail(""); setSubject(""); setMessage(""); }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <h2 className="me-h2">Send us a message</h2>
                <p className="me-hint">Fields marked <span className="me-req">*</span> are required.</p>

                <form id="parent-contact-form" onSubmit={handleSubmit} noValidate className="me-form">
                  <div>
                    <label htmlFor="contact-name" className="me-label">Your name <span className="me-req">*</span></label>
                    <div className="me-input-wrap">
                      <span className="me-icon-l"><UserIcon /></span>
                      <input id="contact-name" className="me-input has-icon" type="text" placeholder="e.g. Maria Santos" autoComplete="name" aria-required="true" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="me-label">Email address <span className="me-req">*</span></label>
                    <div className="me-input-wrap">
                      <span className="me-icon-l"><MailIcon size={18} /></span>
                      <input id="contact-email" className="me-input has-icon" type="email" placeholder="your@email.com" autoComplete="email" aria-required="true" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-subject" className="me-label">Subject</label>
                    <div className="me-input-wrap">
                      <span className="me-icon-l"><MessageIcon /></span>
                      <input id="contact-subject" className="me-input has-icon" type="text" placeholder="e.g. Question about my child's schedule" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={loading} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="me-label">Message <span className="me-req">*</span></label>
                    <textarea id="contact-message" className="me-input me-textarea" rows={4} placeholder="Write your message here…" aria-required="true" value={message} onChange={(e) => setMessage(e.target.value)} disabled={loading} />
                  </div>

                  {error && (
                    <div role="alert" className="me-error"><AlertIcon /><span>{error}</span></div>
                  )}

                  <button id="contact-submit-btn" type="submit" disabled={loading} className="me-btn">
                    {loading ? <><span className="me-spinner" aria-hidden="true" />Sending…</> : <><SendIcon />Send message</>}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>

        {/* Banner and copyright hang below the card, same as sign-in */}
        <div className="me-below">
          <DreamBanner w={440} />
          <p className="me-copy">© {new Date().getFullYear()} Merry Explorers · Secure parent portal</p>
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
        .me-wrap { position: relative; z-index: 1; width: 100%; max-width: 520px; display: flex; flex-direction: column; align-items: center; }

        .me-card {
          position: relative; width: 100%; display: grid; grid-template-columns: 1fr; gap: 22px;
          background: #fff; border: 4px solid ${NAVY}; border-radius: 28px; padding: 22px;
          box-shadow: 0 0 0 6px #fff, 0 12px 0 6px ${NAVY}2e;
        }
        .me-tape {
          position: absolute; top: -16px; left: 50%; margin-left: -46px; width: 92px; height: 28px;
          background: repeating-linear-gradient(45deg, #ffe58a 0 8px, #ffd95e 8px 16px);
          opacity: .92; transform: rotate(6deg); border-radius: 3px;
        }

        /* left panel */
        .me-side {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 24px 20px 20px; background: #f2faff; border: 3px dashed #b6dcf5; border-radius: 22px;
        }
        .me-logo {
          position: relative; width: 84px; height: 84px; flex-shrink: 0; margin-bottom: 12px; overflow: hidden;
          border-radius: 50%; background: #fff; border: 4px solid ${NAVY}; box-shadow: 0 5px 0 ${NAVY}33;
        }
        .me-title {
          margin: 0 0 8px; font-size: 34px; line-height: 1.1; font-weight: 700; color: ${BLUE}; letter-spacing: .5px;
          -webkit-text-stroke: 7px ${NAVY}; paint-order: stroke fill; text-shadow: 0 4px 0 ${NAVY};
        }
        .me-h2 { margin: 0 0 4px; font-size: 28px; font-weight: 700; color: ${NAVY}; }
        .me-sub { margin: 0; font-size: 16px; line-height: 1.4; font-weight: 500; color: #3d5a99; }
        .me-hint { margin: 0 0 16px; font-size: 14px; font-weight: 500; color: #3d5a99; }
        .me-req { color: #d6322a; }

        .me-contacts { width: 100%; display: grid; gap: 10px; margin-top: 18px; }
        .me-contact {
          display: flex; align-items: center; gap: 12px; padding: 9px 12px; text-align: left;
          color: ${NAVY}; text-decoration: none; border: 3px solid ${NAVY}; border-radius: 16px;
          box-shadow: 0 3px 0 rgba(11,42,130,.2); transition: transform .12s, box-shadow .12s;
        }
        .me-contact.link:hover { transform: translateY(-2px); box-shadow: 0 5px 0 rgba(11,42,130,.25); }
        .me-contact.link:focus-visible { outline: 4px solid ${BLUE}; outline-offset: 2px; }
        .me-contact-icon {
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 40px; height: 40px; border-radius: 13px; background: #fff; border: 3px solid ${NAVY};
        }
        .me-contact-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
        .me-contact-top { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .me-contact-label { font-size: 13px; font-weight: 600; color: #3d5a99; }
        .me-contact-value { font-size: 15px; font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
        .me-contact-arrow { flex-shrink: 0; opacity: 0; transform: translate(-4px, 4px); transition: opacity .15s, transform .15s; }
        .me-contact.link:hover .me-contact-arrow, .me-contact.link:focus-visible .me-contact-arrow { opacity: 1; transform: none; }

        .me-badge {
          display: inline-flex; align-items: center; gap: 6px; padding: 0 9px; font-size: 12px; font-weight: 600;
          color: ${NAVY}; border: 2px solid ${NAVY}; border-radius: 20px;
        }
        .me-badge.open { background: #d8f5dc; }
        .me-badge.closed { background: #e6eaf2; }
        .me-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
        .me-badge.open .me-dot { background: #1fa33a; animation: me-pulse 2s ease-in-out infinite; }

        .me-side-bottom { margin-top: auto; padding-top: 20px; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .me-note {
          margin: 0; padding: 9px 14px; font-size: 14px; font-weight: 600; line-height: 1.35; color: ${NAVY};
          background: linear-gradient(#ffeb8f, #ffe066); border-radius: 6px; transform: rotate(-1.5deg);
          box-shadow: 0 4px 0 rgba(11,42,130,.18);
        }

        /* right panel */
        .me-main { display: flex; flex-direction: column; justify-content: center; padding: 4px 4px 2px; }
        .me-form { display: flex; flex-direction: column; gap: 14px; }
        .me-label { display: block; margin: 0 0 6px 4px; font-size: 15px; font-weight: 600; color: ${NAVY}; }
        .me-input-wrap { position: relative; }
        .me-icon-l { position: absolute; inset: 0 auto 0 0; display: flex; align-items: center; padding-left: 15px; color: ${BLUE}; pointer-events: none; }
        .me-input {
          display: block; width: 100%; padding: 12px 16px; font: inherit; font-size: 16px; font-weight: 500;
          color: ${NAVY}; background: #f2faff; border: 3px solid #b6dcf5; border-radius: 16px; outline: none;
          transition: border-color .15s, background .15s, box-shadow .15s;
        }
        .me-input.has-icon { padding-left: 46px; }
        .me-input::placeholder { color: #8aa7cc; }
        .me-input:focus { border-color: ${BLUE}; background: #fff; box-shadow: 0 0 0 4px ${SUN}99; }
        .me-input:disabled { opacity: .6; }
        .me-textarea { min-height: 104px; resize: none; line-height: 1.4; }

        .me-error {
          display: flex; align-items: center; gap: 8px; padding: 10px 14px; font-size: 14px; font-weight: 600; color: #b3261e;
          background: #fff1ee; border: 3px solid #ff6b57; border-radius: 14px;
        }
        .me-error svg { flex-shrink: 0; }

        .me-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%;
          padding: 14px; font: inherit; font-size: 18px; font-weight: 700; color: ${NAVY}; text-decoration: none;
          background: linear-gradient(180deg, #ffe066 0%, ${SUN} 55%, #ffb82e 100%);
          border: 3px solid ${NAVY}; border-radius: 18px; box-shadow: 0 6px 0 ${NAVY};
          cursor: pointer; transition: transform .12s, box-shadow .12s;
        }
        .me-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 0 ${NAVY}; }
        .me-btn:active:not(:disabled) { transform: translateY(5px); box-shadow: 0 1px 0 ${NAVY}; }
        .me-btn:focus-visible { outline: 4px solid ${BLUE}; outline-offset: 3px; }
        .me-btn:disabled { cursor: not-allowed; background: #ffe9a3; box-shadow: 0 6px 0 ${NAVY}66; border-color: ${NAVY}88; }
        .me-btn.ghost { background: #fff; }
        .me-btn.small { width: auto; padding: 0 18px; min-height: 46px; font-size: 15px; box-shadow: 0 4px 0 ${NAVY}; }
        .me-btn.small:hover { box-shadow: 0 6px 0 ${NAVY}; }

        .me-spinner {
          width: 20px; height: 20px; border-radius: 50%; display: inline-block;
          border: 3px solid ${NAVY}33; border-top-color: ${NAVY}; animation: me-spin .7s linear infinite;
        }

        .me-done { display: flex; flex-direction: column; align-items: stretch; max-width: 420px; margin: 0 auto; padding: 10px 0; }
        .me-done strong { font-weight: 700; color: ${NAVY}; }
        .me-check {
          align-self: center; width: 80px; height: 80px; margin-bottom: 16px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: #d8f5dc; border: 3px solid ${NAVY}; box-shadow: 0 5px 0 ${NAVY}33;
          animation: me-pop .45s cubic-bezier(.34,1.56,.64,1) both;
        }

        .me-below {
          position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          width: min(440px, calc(100vw - 32px)); margin-top: 26px;
          display: flex; flex-direction: column; align-items: center;
        }
        .me-banner { width: 100%; }
        .me-banner svg { display: block; width: 100%; height: auto; filter: drop-shadow(0 6px 0 rgba(11, 42, 130, .2)); }
        .me-copy { margin: 4px 0 0; font-size: 12px; font-weight: 500; color: ${NAVY}; opacity: .75; text-align: center; }

        /* wide screens: details left, form right */
        @media (min-width: 900px) {
          .me-wrap { max-width: 1080px; }
          .me-card { grid-template-columns: 430px 1fr; gap: 28px; padding: 24px; }
          .me-main { padding: 6px 12px 4px 0; }
        }
        @media (min-width: 900px) and (max-height: 860px) {
          .me-side { padding: 18px 18px 16px; }
          .me-logo { width: 68px; height: 68px; margin-bottom: 8px; }
          .me-title { font-size: 30px; }
          .me-contacts { margin-top: 12px; gap: 8px; }
          .me-contact { padding: 6px 10px; }
          .me-contact-icon { width: 34px; height: 34px; }
          .me-side-bottom { padding-top: 14px; gap: 12px; }
          .me-form { gap: 10px; }
          .me-input { padding: 10px 14px; }
          .me-input.has-icon { padding-left: 44px; }
          .me-textarea { min-height: 84px; }
        }
        @media (max-width: 899px) {
          .me-main { order: 1; }
          .me-side { order: 2; }
        }

        @keyframes me-spin { to { transform: rotate(360deg); } }
        @keyframes me-pop { from { transform: scale(.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes me-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
        .me-spin { animation: me-spin 40s linear infinite; }

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
          .me-card { padding: 16px; }
          .me-side { padding: 20px 14px 16px; }
          .me-title { font-size: 30px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .me-spin, .me-spinner, .me-bob, .me-cross, .me-twinkle, .me-sway, .me-check, .me-dot { animation: none !important; }
          .me-plane, .me-rocket, .me-bubble { display: none; }
          .me-btn, .me-contact, .me-contact-arrow { transition: none; }
        }
        * { box-sizing: border-box; }
      `}</style>
    </main>
  );
}