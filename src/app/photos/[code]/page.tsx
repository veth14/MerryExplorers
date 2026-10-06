"use client";

import { useEffect, useState, use, useCallback, type ReactNode } from "react";
import Image from "next/image";
import { m, AnimatePresence } from "framer-motion";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

// ─── Design tokens ───────────────────────────────────────────────────────────
const NAVY = "#0b2a82";
const BLUE = "#1f7ae0";
const SUN = "#ffd23f";
const SUN_LIGHT = "#ffe066";
const SUN_DEEP = "#ffb82e";
const ORANGE = "#ff8a1f";
const INPUT_BG = "#f2faff";
const INPUT_BORDER = "#b6dcf5";
const TEXT_2 = "#3d5a99";
const ERROR = "#b3261e";

interface Photo {
  url: string;
  caption: string;
}

interface AlbumData {
  accessCode: string;
  childFirstName: string;
  childNickname: string;
  programName: string;
  classTime: string;
  sessionLabel: string;
  sessionDate: string;
  note: string;
  photos: Photo[];
  expiresAt: string;
  createdAt: string;
  requiresPin?: boolean;
}

function timeUntilExpiry(expiresAt: string): { label: string; hoursLeft: number } {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { label: "Expired", hoursLeft: 0 };
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  if (days > 0) return { label: `${days}d ${remH}h left`, hoursLeft: hours };
  return { label: `${hours}h left`, hoursLeft: hours };
}

// ─── Background scene ────────────────────────────────────────────────────────
const SK = "vp-sticker";
function Cloud({ className }: { className: string }) {
  return (
    <svg className={`vp-cloud ${SK} ${className}`} viewBox="-4 -16 124 78" aria-hidden="true">
      <path d="M26 52a18 18 0 0 1-2-35 24 24 0 0 1 46-6 20 20 0 0 1 28 18 14 14 0 0 1-4 23z" fill="#fff" stroke="#cfeaff" strokeWidth="3" />
    </svg>
  );
}
function Star({ style, far = false }: { style: React.CSSProperties; far?: boolean }) {
  return (
    <svg className={`vp-star ${SK} ${far ? "far" : ""}`} style={style} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 3 6.5 7 .9-5.2 4.8 1.4 7L12 17.7 5.8 21.2l1.4-7L2 9.4l7-.9z" fill={SUN} stroke={SUN_DEEP} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function Scene() {
  return (
    <div className="vp-scene" aria-hidden="true">
      <svg className={`vp-rainbow ${SK}`} viewBox="0 0 160 90">
        {["#ef4444", "#ff9a1f", "#ffd23f", "#4cc35b", "#2f8bf0", "#7c4dcc"].map((c, i) => {
          const r = 68 - i * 7;
          return <path key={c} d={`M${80 - r} 70A${r} ${r} 0 0 1 ${80 + r} 70`} fill="none" stroke={c} strokeWidth="7" />;
        })}
        <g fill="#fff">
          <circle cx="14" cy="72" r="13" /><circle cx="30" cy="68" r="15" /><circle cx="26" cy="78" r="12" />
          <circle cx="132" cy="72" r="13" /><circle cx="148" cy="68" r="12" /><circle cx="140" cy="78" r="12" />
        </g>
      </svg>
      <svg className={`vp-sun ${SK}`} viewBox="0 0 140 140">
        <g className="vp-rays">
          {Array.from({ length: 12 }).map((_, i) => (
            <ellipse key={i} cx="70" cy="16" rx="6" ry="12" fill={SUN} stroke={SUN_DEEP} strokeWidth="2" transform={`rotate(${i * 30} 70 70)`} />
          ))}
        </g>
        <circle cx="70" cy="70" r="36" fill={SUN_LIGHT} stroke={SUN_DEEP} strokeWidth="5" />
        <circle cx="52" cy="77" r="6" fill="#ffa9c4" opacity=".85" /><circle cx="88" cy="77" r="6" fill="#ffa9c4" opacity=".85" />
        <circle cx="58" cy="64" r="3.5" fill={NAVY} /><circle cx="82" cy="64" r="3.5" fill={NAVY} />
        <path d="M58 76q12 11 24 0" fill="none" stroke={NAVY} strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      <Cloud className="c1" /><Cloud className="c2" /><Cloud className="c3" />
      <Star style={{ top: "24%", left: "6%", animationDelay: "0s" }} />
      <Star far style={{ top: "13%", left: "62%", animationDelay: "0.9s" }} />
      <Star style={{ top: "52%", left: "94%", animationDelay: "1.6s" }} />
      <Star far style={{ top: "72%", left: "4%", animationDelay: "0.4s" }} />
      <svg className={`vp-plane ${SK}`} viewBox="0 0 220 60">
        <path d="M0 52Q60 58 100 32T168 24" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
        <path d="M168 24 214 6 192 42 183 29z" fill="#dff1ff" stroke={BLUE} strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <svg className={`vp-rocket ${SK}`} viewBox="0 0 60 90">
        <path d="M30 4c14 12 18 34 14 54H16C12 38 16 16 30 4z" fill="#fff" stroke={NAVY} strokeWidth="3" />
        <circle cx="30" cy="30" r="8" fill="#8fd3f7" stroke={NAVY} strokeWidth="3" />
        <path d="M16 46 4 62l12-2zM44 46l12 16-12-2z" fill="#ef4444" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
        <path d="M22 60c2 12 6 22 8 26 2-4 6-14 8-26z" fill={ORANGE} stroke={SUN} strokeWidth="3" />
      </svg>
      {[{ l: "12%", c: "#fff", d: 13, s: "0s" }, { l: "46%", c: SUN_LIGHT, d: 16, s: "4s" }, { l: "74%", c: "#ffc4dd", d: 12, s: "7s" }, { l: "90%", c: "#b8f0bf", d: 17, s: "2s" }].map((b, i) => (
        <span key={i} className="vp-bubble" style={{ left: b.l, background: b.c, animationDuration: `${b.d}s`, animationDelay: b.s }} />
      ))}
      <svg className="vp-bank" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <g fill="#fff">
          {Array.from({ length: 12 }).map((_, i) => <circle key={i} cx={i * 110 + 20} cy={95 - (i % 3) * 14} r={55 + (i % 2) * 14} />)}
          <rect x="0" y="90" width="1300" height="40" />
        </g>
      </svg>
    </div>
  );
}

// ─── "Dream. Discover. Explore." banner ──────────────────────────────────────
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
  ["DREAM", "#ffffff"], [".", "#5cc8ff"], ["Discover", SUN], [".", "#5cc8ff"], ["Explore", "#ffffff"],
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
          return <tspan key={k} dy={dy} fontSize={ch === "." ? 78 : undefined} {...(colored ? { fill } : {})}>{ch}</tspan>;
        })
      )}
    </>
  );
}
function Banner() {
  const text = {
    fontSize: 58, fontWeight: 700, textAnchor: "middle" as const, letterSpacing: 1,
    strokeLinejoin: "round" as const, strokeLinecap: "round" as const, paintOrder: "stroke",
  };
  const CENTER = "M70 175Q400 5 730 175";
  return (
    <div className="vp-banner" role="img" aria-label="Dream. Discover. Explore.">
      <svg viewBox="0 0 800 250" aria-hidden="true">
        <defs>
          <filter id="vp-rough" filterUnits="userSpaceOnUse" x="0" y="0" width="800" height="250">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.25" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <path id="vp-arc" d="M70 195Q400 25 730 195" />
        </defs>
        <g filter="url(#vp-rough)" fill="none">
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
          <textPath href="#vp-arc" startOffset="50%"><BannerChars colored={false} /></textPath>
        </text>
        <text {...text} stroke="#0a2380" strokeWidth="5">
          <textPath href="#vp-arc" startOffset="50%"><BannerChars colored /></textPath>
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

// ─── Building blocks ─────────────────────────────────────────────────────────
function Card({ children, tape = false, className = "" }: { children: ReactNode; tape?: boolean; className?: string }) {
  return (
    <section className={`vp-card ${className}`}>
      {tape && <span className="vp-tape" aria-hidden="true" />}
      {children}
    </section>
  );
}

/** Sky background + centered content, used for loading / error / PIN screens */
function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={`vp-root ${fredoka.className}`}>
      <style>{CSS}</style>
      <Scene />
      <div className={`vp-main ${wide ? "" : "vp-center"}`}>{children}</div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function PublicPhotoAlbumPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [data, setData] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadedSingle, setDownloadedSingle] = useState<number | null>(null);

  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [checkingPin, setCheckingPin] = useState(false);

  const fetchAlbum = useCallback(async (pinToTry?: string) => {
    try {
      setCheckingPin(true);
      const savedPin = typeof window !== "undefined" ? sessionStorage.getItem(`album-pin-${code}`) : null;
      const activePin = pinToTry || savedPin;
      const url = `/api/photo-albums/${code}${activePin ? `?pin=${activePin}` : ""}`;

      const r = await fetch(url);
      const res = await r.json();

      if (res.success) {
        setData(res.data);
        if (!res.data.requiresPin && activePin) {
          sessionStorage.setItem(`album-pin-${code}`, activePin);
          setPinError("");
        } else if (pinToTry && res.data.requiresPin) {
          setPinError("Incorrect PIN. Please try again.");
        }
      } else {
        setError(res.error || "Failed to load album");
      }
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading(false);
      setCheckingPin(false);
    }
  }, [code]);

  useEffect(() => { fetchAlbum(); }, [fetchAlbum]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length !== 4) return;
    fetchAlbum(pinInput);
  };

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxIndex !== null) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [lightboxIndex]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null || !data) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : data.photos.length - 1));
      if (e.key === "ArrowRight") setLightboxIndex((prev) => (prev! < data.photos.length - 1 ? prev! + 1 : 0));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, data]);

  // Download helpers
  const downloadImage = useCallback(async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank");
    }
  }, []);

  const handleDownloadAll = useCallback(async () => {
    if (!data) return;
    setDownloading(true);
    const dName = data.childNickname || data.childFirstName;
    for (let i = 0; i < data.photos.length; i++) {
      const photo = data.photos[i];
      const ext = photo.url.split(".").pop()?.split("?")[0] || "jpg";
      await downloadImage(photo.url, `${dName}-photo-${i + 1}.${ext}`);
      await new Promise((r) => setTimeout(r, 300));
    }
    setDownloading(false);
  }, [data, downloadImage]);

  const handleDownloadSingle = useCallback(async (photo: Photo, index: number, dName: string) => {
    setDownloadedSingle(index);
    const ext = photo.url.split(".").pop()?.split("?")[0] || "jpg";
    await downloadImage(photo.url, `${dName}-photo-${index + 1}.${ext}`);
    setTimeout(() => setDownloadedSingle(null), 2000);
  }, [downloadImage]);

  // ── Loading
  if (loading) {
    return (
      <Shell>
        <Card tape className="vp-narrow">
          <div className="vp-empty vp-plain">
            <span className="vp-emoji bounce" aria-hidden="true">🌟</span>
            <h1 className="vp-h2" role="status">Loading your special moments…</h1>
          </div>
        </Card>
      </Shell>
    );
  }

  // ── Error / expired
  if (error || !data) {
    return (
      <Shell>
        <Card tape className="vp-narrow">
          <div className="vp-empty vp-plain">
            <span className="vp-emoji" aria-hidden="true">🕐</span>
            <h1 className="vp-h2">Link unavailable</h1>
            <p className="vp-sub" style={{ marginTop: 8 }}>
              {error || "This photo link may have expired or is invalid. Albums are automatically removed to protect student privacy."}
            </p>
          </div>
        </Card>
      </Shell>
    );
  }

  const displayName = data.childNickname || data.childFirstName;
  const expiry = timeUntilExpiry(data.expiresAt);
  const shortProgram = data.programName.includes(":") ? data.programName.split(":")[1].trim() : data.programName;

  // ── PIN gate
  if (data.requiresPin) {
    return (
      <Shell>
        <Card tape className="vp-narrow">
          <div style={{ textAlign: "center" }}>
            <span className="vp-badge big" style={{ margin: "0 auto 12px" }}><span style={{ fontSize: 28 }} aria-hidden="true">🔒</span></span>
            <h1 className="vp-h2">Secure album</h1>
            <p className="vp-sub" style={{ margin: "8px 0 22px" }}>
              Please enter the 4-digit PIN sent to your email to view {displayName}'s photos.
            </p>
          </div>
          <form onSubmit={handlePinSubmit}>
            <label htmlFor="vp-pin" className="vp-sr">4-digit PIN</label>
            <input
              id="vp-pin"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "")); setPinError(""); }}
              className="vp-input vp-pin"
              placeholder="••••"
              autoFocus
            />
            {pinError && <p className="vp-error" role="alert">{pinError}</p>}
            <button type="submit" className="vp-btn blue wide" disabled={checkingPin || pinInput.length !== 4}>
              {checkingPin ? <><span className="vp-spin light" aria-hidden="true" />Verifying…</> : "Unlock photos ✨"}
            </button>
          </form>
        </Card>
      </Shell>
    );
  }

  // ── Album
  return (
    <Shell wide>
      {/* Hero */}
      <Card tape className="vp-hero-card">
        <span className="vp-logo-badge"><Image src="/LOGO-noBG.png" alt="Merry Explorers Playgroup & Learning Center" fill style={{ objectFit: "contain", padding: 6 }} /></span>
        <div className="vp-hero">
          <div className="vp-title-wrap">
            <h1 className="vp-title">{displayName}'s</h1>
          </div>
          <p className="vp-note big">Special Moments! 🎉</p>
          <p className="vp-sub">{data.sessionLabel} · {data.classTime}</p>
          <div className="vp-tags">
            <span className="vp-tag" style={{ background: SUN_LIGHT }}>✨ {data.photos.length} special moment{data.photos.length !== 1 ? "s" : ""}</span>
            <span className="vp-tag" style={expiry.hoursLeft < 24 ? { background: "#fff1ee", borderColor: "#ff6b57", color: ERROR } : { background: "#d8f5dc" }}>
              ⏰ Available for {expiry.label}
            </span>
            <span className="vp-tag" style={{ background: "#dff1ff" }}>🎒 {shortProgram}</span>
          </div>
        </div>
      </Card>

      {/* Download all */}
      <div className="vp-due">
        <div className="vp-due-row">
          <span style={{ fontSize: 40 }} aria-hidden="true">💾</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong className="vp-due-title">Save these memories forever!</strong>
            <p className="vp-due-text">
              Photos will be automatically deleted in <b style={{ color: SUN_LIGHT }}>{expiry.label}</b>. Download now to keep them!
            </p>
          </div>
          <button className="vp-btn" onClick={handleDownloadAll} disabled={downloading}>
            {downloading ? <><span className="vp-spin" aria-hidden="true" />Downloading…</> : <>⬇️ Download all {data.photos.length}</>}
          </button>
        </div>
      </div>

      {/* Teacher note */}
      {data.note && (
        <Card tape className="vp-narrow vp-teacher">
          <p className="vp-label" style={{ marginBottom: 8 }}>📝 Note from teacher</p>
          <p className="vp-quote">"{data.note}"</p>
        </Card>
      )}

      {/* Gallery */}
      <Card tape>
        <div className="vp-head" style={{ justifyContent: "center", textAlign: "center", flexDirection: "column", gap: 4 }}>
          <h2 className="vp-h2">📸 Photo gallery</h2>
          <p className="vp-sub">Tap a photo to view it full size, or save it with the button.</p>
        </div>
        <div className="vp-masonry">
          {data.photos.map((photo, i) => (
            <figure key={i} className="vp-shot">
              <button className="vp-shot-btn" onClick={() => setLightboxIndex(i)} aria-label={`Open photo ${i + 1}${photo.caption ? `: ${photo.caption}` : ""}`}>
                <Image
                  src={photo.url}
                  alt={photo.caption || `Photo ${i + 1}`}
                  width={800}
                  height={800}
                  className="vp-shot-img"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </button>
              <span className="vp-shot-num" aria-hidden="true">{i + 1}</span>
              <button className="vp-btn small vp-save" onClick={() => handleDownloadSingle(photo, i, displayName)}>
                {downloadedSingle === i ? "✓ Saved!" : "⬇ Save"}
              </button>
              {photo.caption && <figcaption className="vp-cap">{photo.caption}</figcaption>}
            </figure>
          ))}
        </div>
      </Card>

      {/* Bottom CTA */}
      <div style={{ textAlign: "center" }}>
        <p className="vp-note" style={{ marginBottom: 16 }}>Don't forget to save your photos before they expire! ⏰</p>
        <div>
          <button className="vp-btn blue" onClick={handleDownloadAll} disabled={downloading}>
            {downloading ? <><span className="vp-spin light" aria-hidden="true" />Downloading…</> : "⬇️ Save all photos"}
          </button>
        </div>
      </div>

      <Banner />
      <p className="vp-foot">Merry Explorers Playgroup &amp; Learning Center</p>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <m.div
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="vp-lb"
          >
            <div className="vp-lb-bg" onClick={() => setLightboxIndex(null)} />

            <div className="vp-lb-top">
              <span className="vp-tag">{lightboxIndex + 1} / {data.photos.length}</span>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="vp-btn small" onClick={() => handleDownloadSingle(data.photos[lightboxIndex], lightboxIndex, displayName)}>
                  {downloadedSingle === lightboxIndex ? "✓ Saved!" : "⬇ Save photo"}
                </button>
                <button className="vp-btn small ghost" onClick={() => setLightboxIndex(null)} aria-label="Close viewer">✕</button>
              </div>
            </div>

            <button className="vp-btn small ghost vp-lb-nav l" aria-label="Previous photo"
              onClick={() => setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : data.photos.length - 1))}>←</button>
            <button className="vp-btn small ghost vp-lb-nav r" aria-label="Next photo"
              onClick={() => setLightboxIndex((prev) => (prev! < data.photos.length - 1 ? prev! + 1 : 0))}>→</button>

            <m.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="vp-lb-stage"
            >
              <div className="vp-lb-frame">
                <Image
                  src={data.photos[lightboxIndex].url}
                  alt={data.photos[lightboxIndex].caption || `Photo ${lightboxIndex + 1}`}
                  fill
                  style={{ objectFit: "contain" }}
                  sizes="100vw"
                  quality={90}
                  priority
                />
              </div>
              {data.photos[lightboxIndex].caption && <p className="vp-lb-cap">{data.photos[lightboxIndex].caption}</p>}
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </Shell>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const CSS = `
.vp-root{min-height:100vh;position:relative;overflow-x:hidden;color:${NAVY};font-weight:500;
  background:radial-gradient(ellipse at 50% 0%,#b9e5fb 0%,#8fd3f7 55%,#74c3f1 100%);background-attachment:fixed}
.vp-root *{box-sizing:border-box}
.vp-main{position:relative;z-index:1;width:100%;max-width:1100px;margin:0 auto;padding:28px 20px 80px;display:flex;flex-direction:column;gap:40px}
.vp-main.vp-center{min-height:100vh;justify-content:center;align-items:center;padding-bottom:40px}
.vp-narrow{width:100%;max-width:460px;margin-left:auto;margin-right:auto}
.vp-teacher{max-width:640px}
.vp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.vp-sub{margin:4px 0 0;font-size:14px;color:${TEXT_2};font-weight:500;line-height:1.5}
.vp-h2{margin:0;font-size:22px;font-weight:700;color:${NAVY}}
.vp-label{font-size:15px;font-weight:600;color:${NAVY};margin:0}
.vp-quote{margin:0;font-size:18px;font-weight:500;line-height:1.6;color:#27407f}
.vp-title{margin:0;font-size:44px;font-weight:700;line-height:1.1;color:${BLUE};-webkit-text-stroke:7px ${NAVY};paint-order:stroke fill;text-shadow:0 4px 0 ${NAVY};filter:drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff)}
.vp-emoji{display:block;font-size:52px;margin-bottom:8px}.vp-emoji.bounce{animation:vp-bob 1.2s ease-in-out infinite}

/* scene */
.vp-sticker{filter:drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff)}
.vp-scene{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.vp-sun{position:absolute;top:8px;right:16px;width:150px;animation:vp-bob 5s ease-in-out infinite}
.vp-rays{transform-origin:70px 70px;animation:vp-rot 40s linear infinite}
.vp-rainbow{position:absolute;top:14px;left:10px;width:190px;animation:vp-bob 5s ease-in-out infinite;animation-delay:-2s}
.vp-cloud{position:absolute;left:0;width:130px;overflow:visible;animation:vp-drift linear infinite;will-change:transform}
.vp-cloud.c1{top:18%;animation-duration:70s}
.vp-cloud.c2{top:46%;width:104px;animation-duration:90s;animation-delay:-40s}
.vp-cloud.c3{top:72%;width:156px;animation-duration:58s;animation-delay:-20s}
.vp-star{position:absolute;width:28px;animation:vp-twinkle 2.6s ease-in-out infinite}
.vp-bubble{position:absolute;bottom:-40px;width:22px;height:22px;border-radius:50%;border:3px solid #fff;opacity:.8;animation:vp-rise linear infinite}
.vp-bank{position:absolute;left:-5%;bottom:-20px;width:110%;height:90px;animation:vp-sway 9s ease-in-out infinite}
.vp-plane{position:absolute;top:32%;left:0;width:220px;animation:vp-fly 26s linear infinite}
.vp-rocket{position:absolute;left:-80px;bottom:-110px;width:56px;animation:vp-launch 20s linear infinite;animation-delay:5s}
@keyframes vp-bob{50%{transform:translateY(10px)}}
@keyframes vp-rot{to{transform:rotate(360deg)}}
@keyframes vp-drift{from{transform:translateX(-200px)}to{transform:translateX(110vw)}}
@keyframes vp-fly{from{transform:translateX(-260px)}to{transform:translateX(110vw)}}
@keyframes vp-launch{from{transform:translate(0,0) rotate(45deg)}to{transform:translate(115vw,-125vh) rotate(45deg)}}
@keyframes vp-twinkle{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.6);opacity:.5}}
@keyframes vp-rise{to{transform:translateY(-110vh)}}
@keyframes vp-sway{50%{transform:translateX(24px)}}
@keyframes vp-spin{to{transform:rotate(360deg)}}

/* note sticker */
.vp-note{display:inline-flex;align-items:center;gap:8px;margin:0;padding:8px 16px;font-size:15px;font-weight:600;color:${NAVY};
  background:linear-gradient(#ffeb8f,${SUN_LIGHT});border-radius:6px;transform:rotate(-1.5deg);box-shadow:0 4px 0 rgba(11,42,130,.18)}
.vp-note.big{font-size:22px;padding:10px 20px}

/* cards */
.vp-card{position:relative;background:#fff;border:4px solid ${NAVY};border-radius:28px;padding:28px;
  box-shadow:0 0 0 6px #fff,0 12px 0 6px rgba(11,42,130,.18)}
.vp-tape{position:absolute;top:-17px;left:50%;width:92px;height:28px;margin-left:-46px;transform:rotate(6deg);
  background:repeating-linear-gradient(45deg,${SUN} 0 9px,${SUN_LIGHT} 9px 18px);border:2px solid rgba(11,42,130,.25);border-radius:4px}
.vp-head{display:flex;gap:14px;align-items:center;margin-bottom:22px}
.vp-badge{width:46px;height:46px;border-radius:16px;border:3px solid ${NAVY};background:${SUN_LIGHT};color:${NAVY};display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.vp-badge.big{width:68px;height:68px;border-radius:50%}
.vp-empty.vp-plain{text-align:center;padding:12px}

/* hero */
.vp-hero-card{margin-top:36px}
.vp-logo-badge{position:absolute;top:-54px;left:50%;margin-left:-46px;z-index:2;width:92px;height:92px;border-radius:50%;overflow:hidden;background:#fff;border:4px solid ${NAVY};
  box-shadow:0 0 0 5px #fff,0 6px 0 5px rgba(11,42,130,.18)}
.vp-hero{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;padding-top:46px}
.vp-title-wrap{position:relative;display:inline-block;padding:0 6px}
.vp-title-wrap::before,.vp-title-wrap::after{content:"";position:absolute;top:8px;width:12px;height:28px;border-radius:50%;background:${SUN};border:2px solid #fff}
.vp-title-wrap::before{left:-24px;transform:rotate(-50deg)}.vp-title-wrap::after{right:-24px;transform:rotate(50deg)}
.vp-tags{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.vp-tag{display:inline-block;font-size:13px;font-weight:600;color:${NAVY};border:2.5px solid ${NAVY};border-radius:20px;padding:3px 12px;background:#fff6cf}

/* buttons */
.vp-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;padding:0 24px;font:inherit;font-size:18px;font-weight:700;color:${NAVY};text-decoration:none;cursor:pointer;
  background:linear-gradient(${SUN_LIGHT},${SUN} 50%,${SUN_DEEP});border:3px solid ${NAVY};border-radius:18px;box-shadow:0 6px 0 ${NAVY};transition:transform .1s,box-shadow .1s}
.vp-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 0 ${NAVY}}
.vp-btn:active:not(:disabled){transform:translateY(5px);box-shadow:0 1px 0 ${NAVY}}
.vp-btn:disabled{background:#fff3c4;color:#6f7fb0;border-color:#8c9bc9;box-shadow:0 6px 0 #c3cce6;cursor:not-allowed}
.vp-btn.blue{background:${BLUE};color:#fff}
.vp-btn.blue:disabled{background:#b9d3f3;color:#fff;border-color:#8c9bc9}
.vp-btn.ghost{background:#fff}
.vp-btn.small{min-height:44px;font-size:15px;padding:0 16px;box-shadow:0 4px 0 ${NAVY}}
.vp-btn.wide{width:100%;margin-top:20px}
.vp-spin{width:18px;height:18px;border:3px solid rgba(11,42,130,.25);border-top-color:${NAVY};border-radius:50%;animation:vp-spin .7s linear infinite}
.vp-spin.light{border-color:rgba(255,255,255,.35);border-top-color:#fff}
.vp-root button:focus-visible,.vp-root a:focus-visible,.vp-input:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(255,210,63,.9),0 0 0 7px ${NAVY}}

/* inputs */
.vp-input{width:100%;font:inherit;font-size:16px;font-weight:500;color:${NAVY};padding:13px 14px;background:${INPUT_BG};border:3px solid ${INPUT_BORDER};border-radius:16px;min-height:48px}
.vp-input::placeholder{color:#8aa7cc}
.vp-input:focus{outline:none;border-color:${BLUE};background:#fff;box-shadow:0 0 0 4px rgba(255,210,63,.6)}
.vp-pin{text-align:center;font-size:38px;font-weight:700;letter-spacing:.5em;padding-left:.5em}
.vp-error{margin:12px 0 0;padding:10px 14px;border:3px solid #ff6b57;background:#fff1ee;color:${ERROR};border-radius:16px;font-weight:600;font-size:14px}

/* download banner */
.vp-due{background:linear-gradient(135deg,${BLUE},#2f8bf0);border:3px solid ${NAVY};border-radius:24px;padding:20px 24px;color:#fff;box-shadow:0 6px 0 ${NAVY}}
.vp-due-row{display:flex;align-items:center;gap:18px;flex-wrap:wrap;justify-content:center;text-align:center}
.vp-due-title{display:block;font-size:20px;line-height:1.2}
.vp-due-text{margin:4px 0 0;font-size:14px;opacity:.95}
@media(min-width:700px){.vp-due-row{text-align:left;justify-content:flex-start}}

/* gallery */
.vp-masonry{columns:1;column-gap:18px}
@media(min-width:640px){.vp-masonry{columns:2}}
@media(min-width:1000px){.vp-masonry{columns:3}}
.vp-shot{position:relative;margin:0 0 20px;break-inside:avoid;background:#fff;border:3px solid ${NAVY};border-radius:20px;box-shadow:0 5px 0 rgba(11,42,130,.25);overflow:hidden}
.vp-shot-btn{display:block;width:100%;padding:0;border:none;background:${INPUT_BG};cursor:zoom-in;font:inherit}
.vp-shot-img{display:block;width:100%;height:auto;object-fit:cover}
.vp-shot-num{position:absolute;top:10px;left:10px;min-width:28px;text-align:center;font-size:13px;font-weight:700;color:${NAVY};background:${SUN_LIGHT};border:2.5px solid ${NAVY};border-radius:20px;padding:1px 8px}
.vp-save{position:absolute;right:10px;bottom:10px}
.vp-shot:has(.vp-cap) .vp-save{bottom:auto;top:10px;right:10px}
.vp-cap{padding:10px 14px;font-size:14px;font-weight:500;line-height:1.4;color:${TEXT_2};background:#fff6cf;border-top:3px solid ${NAVY}}

/* lightbox */
.vp-lb{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(6,22,90,.94)}
.vp-lb-bg{position:absolute;inset:0}
.vp-lb-top{position:absolute;top:0;left:0;right:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:14px 16px}
.vp-lb-nav{position:absolute;top:50%;z-index:2;margin-top:-22px;min-width:52px;padding:0 14px}
.vp-lb-nav.l{left:10px}.vp-lb-nav.r{right:10px}
.vp-lb-stage{position:relative;z-index:1;width:100%;height:100%;padding:76px 72px 90px;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.vp-lb-frame{position:relative;width:100%;height:100%}
.vp-lb-cap{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);max-width:min(560px,90vw);margin:0;padding:10px 18px;text-align:center;font-size:15px;font-weight:500;color:${NAVY};background:#fff6cf;border:3px solid ${NAVY};border-radius:18px;pointer-events:auto}
@media(max-width:640px){.vp-lb-stage{padding:70px 12px 100px}.vp-lb-nav{top:auto;bottom:18px;margin-top:0}}

/* footer */
.vp-banner{width:min(720px,100%);margin:0 auto}
.vp-banner svg{display:block;width:100%;height:auto;filter:drop-shadow(0 6px 0 rgba(11,42,130,.2))}
.vp-foot{margin:-20px 0 0;text-align:center;font-size:14px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:${NAVY}}

@media(max-width:640px){
  .vp-main{padding:90px 14px 70px;gap:34px}
  .vp-main.vp-center{padding-top:40px}
  .vp-title{font-size:34px}
  .vp-card{padding:24px 18px}
  .vp-sun{width:84px;right:8px}.vp-rainbow{width:104px;left:4px}
  .vp-star.far,.vp-plane,.vp-rocket{display:none}
  .vp-title-wrap::before,.vp-title-wrap::after{display:none}
  .vp-pin{font-size:32px}
}
@media(prefers-reduced-motion:reduce){
  .vp-scene *,.vp-scene{animation:none!important}.vp-bubble,.vp-plane,.vp-rocket{display:none}
  .vp-emoji.bounce{animation:none}.vp-btn{transition:none}
}
`;