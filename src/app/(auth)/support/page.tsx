"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef } from "react";

/* ─── Category data ──────────────────────────────────────────── */
const CATEGORIES = [
  { value: "login", label: "Login Issue", icon: "🔐" },
  { value: "data", label: "Missing Data", icon: "📊" },
  { value: "bug", label: "System Bug", icon: "🐛" },
  { value: "access", label: "Access Denied", icon: "🚫" },
  { value: "performance", label: "Performance", icon: "⚡" },
  { value: "other", label: "Other", icon: "💬" },
];

/* ─── Quick-stat pill ─────────────────────────────────────────── */
function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-[16px] font-extrabold leading-none text-white">{value}</p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/55">{label}</p>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */
export default function SupportPage() {
  const [formData, setFormData] = useState({
    subject: "",
    category: "login",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  /* Subtle 3-D tilt on desktop */
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = ((e.clientX - left) / width - 0.5) * 3;
    const y = ((e.clientY - top) / height - 0.5) * -3;
    el.style.transform = `perspective(1400px) rotateX(${y}deg) rotateY(${x}deg) scale(1.005)`;
  };
  const onMouseLeave = () => {
    if (cardRef.current) cardRef.current.style.transform = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setSubmitted(true); }, 1800);
  };

  return (
    <>
      {/* ── Scoped styles ── */}
      <style>{`
        @keyframes fadeUp   { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmerY { 0%,100%{background-position:0% 50%;} 50%{background-position:100% 50%;} }
        @keyframes spin     { to { transform:rotate(360deg); } }
        @keyframes popIn    { 0%{opacity:0;transform:scale(.75);} 70%{transform:scale(1.05);} 100%{opacity:1;transform:scale(1);} }
        @keyframes checkDraw{ from{stroke-dashoffset:80;} to{stroke-dashoffset:0;} }
        @keyframes blink    { 0%,100%{opacity:1;} 50%{opacity:.4;} }
        @keyframes orbDrift { 0%,100%{transform:translate(0,0);} 50%{transform:translate(18px,-22px);} }

        .support-card { transition: transform .18s ease; transform-style: preserve-3d; }

        /* left panel gradient animation */
        .left-panel {
          background: linear-gradient(145deg,#001f8a,#0033A0 40%,#0050d5 80%,#0040c0);
          background-size: 300% 300%;
          animation: shimmerY 10s ease infinite;
        }

        /* glowing decorative blobs */
        .blob-tl { animation: orbDrift 12s ease-in-out infinite; }
        .blob-br { animation: orbDrift 16s ease-in-out infinite reverse; }

        /* form field reveal */
        .field { animation: fadeUp .45s ease both; }

        /* category chip */
        .chip {
          transition: all .22s cubic-bezier(.34,1.56,.64,1);
          border: 1.5px solid #E0E0E0;
        }
        .chip:hover:not(.chip-active) { transform:translateY(-2px) scale(1.04); border-color:#0033A0; background:#f0f5ff; }
        .chip.chip-active {
          border-color: #0033A0;
          background: linear-gradient(135deg,#eef2ff,#dde8ff);
          color: #0033A0;
          box-shadow: 0 4px 16px -4px rgba(0,51,160,.22), 0 0 0 3px rgba(0,51,160,.1);
          transform: scale(1.06);
        }

        /* input glow */
        .input-wrap { transition: box-shadow .2s, border-color .2s; }
        .input-wrap.active {
          border-color: #0033A0 !important;
          box-shadow: 0 0 0 3px rgba(0,51,160,.12), 0 2px 12px rgba(0,51,160,.08);
        }

        /* yellow CTA */
        .btn-cta {
          background: linear-gradient(135deg,#FFD000,#FFC107,#FFB300);
          box-shadow: 0 6px 24px -4px rgba(255,193,7,.55);
          transition: all .2s;
        }
        .btn-cta:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px -4px rgba(255,193,7,.65);
          filter: brightness(1.04);
        }
        .btn-cta:active:not(:disabled) { transform: translateY(0); }

        /* success */
        .success-pop { animation: popIn .55s cubic-bezier(.34,1.56,.64,1) both; }
        .check-path  { stroke-dasharray:80; animation: checkDraw .5s ease .3s both; }
        .dot-blink   { animation: blink 1.4s ease infinite; }

        /* page fade in */
        .page-enter { animation: fadeUp .6s ease both; }
      `}</style>

      <main className="flex min-h-screen w-full items-center justify-center bg-[#F8FAFC] px-4 py-10 relative overflow-hidden">
        {/* Very subtle background decoration */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-[#0033A0]/5 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#FFC107]/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-[#0033A0]/3 blur-[80px]" />
          {/* subtle dot grid */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: "radial-gradient(#0033A0 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }} />
        </div>

        {/* ── Card ── */}
        <div
          ref={cardRef}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          className="support-card page-enter relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-[0_28px_80px_-15px_rgba(0,51,160,0.22),0_0_0_1px_rgba(0,51,160,0.06)] md:grid-cols-[44%_56%]"
        >
          {/* ══════════════════ LEFT PANEL ══════════════════ */}
          <div className="left-panel relative hidden flex-col justify-between overflow-hidden p-10 md:flex">
            {/* Blobs */}
            <div aria-hidden className="blob-tl pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div aria-hidden className="blob-br pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-[#FFC107]/20 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute bottom-1/3 right-0 h-40 w-40 rounded-full bg-white/5 blur-xl" />

            {/* Logo */}
            <div className="relative" style={{ animation: "fadeUp .5s ease .05s both", opacity: 0 }}>
              <div className="relative h-[72px] w-[72px] overflow-hidden rounded-2xl bg-white/95 shadow-[0_8px_28px_rgba(0,0,0,0.25)] ring-4 ring-white/20">
                <Image src="/LOGO-noBG.png" alt="Merry Explorers logo" fill className="object-contain p-1.5" />
              </div>
              {/* Online badge */}
              <div className="mt-3 flex items-center gap-2">
                <span className="dot-blink h-2 w-2 rounded-full bg-emerald-400"
                  style={{ boxShadow: "0 0 6px rgba(52,211,153,.85)" }} />
                <span className="text-[11px] font-bold uppercase tracking-widest text-white/55">Support Online</span>
              </div>
            </div>

            {/* Heading */}
            <div className="relative" style={{ animation: "fadeUp .5s ease .12s both", opacity: 0 }}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[.12em] text-white/65">Help Center</span>
              </div>
              <h1 className="font-headline text-[36px] font-extrabold leading-[1.1] tracking-tight text-white">
                Support{" "}
                <span style={{
                  background: "linear-gradient(135deg,#FFC107,#FFE066,#FFD000)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  Center
                </span>
              </h1>
              <p className="mt-4 max-w-xs text-[14px] font-medium leading-relaxed text-white/65">
                We&apos;re here to help you resolve any issues quickly and easily. Reports are reviewed immediately.
              </p>

              {/* Stats */}
              <div className="mt-8 grid grid-cols-2 gap-3">
                <Stat icon="⚡" value="&lt; 2 hrs" label="Avg Response" />
                <Stat icon="✅" value="99.2%" label="Issues Resolved" />
              </div>

              {/* Divider */}
              <div className="mt-8 h-px w-full"
                style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)" }} />

              {/* Direct email */}
              <a href="mailto:vianangelo.14@gmail.com"
                className="group mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm transition-all hover:bg-white/15 hover:border-white/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <svg className="h-4 w-4 text-white/75" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Urgent? Email directly</p>
                  <p className="text-[13px] font-bold text-white/80 group-hover:text-white transition-colors">Lead Developer</p>
                </div>
                <svg className="h-4 w-4 text-white/30 transition-all group-hover:translate-x-1 group-hover:text-white/60"
                  fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            {/* Footer */}
            <p className="relative text-[11px] font-semibold text-white/40"
              style={{ animation: "fadeUp .5s ease .2s both", opacity: 0 }}>
              © {new Date().getFullYear()} Merry Explorers. All rights reserved.
            </p>
          </div>

          {/* ══════════════════ RIGHT PANEL ══════════════════ */}
          <div className="relative flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
            {/* Subtle top-right glow */}
            <div aria-hidden
              className="pointer-events-none absolute -top-24 -right-24 h-52 w-52 rounded-full bg-[#FFC107]/10 blur-3xl" />

            {submitted ? (
              /* ── SUCCESS ── */
              <div className="success-pop flex flex-col items-center py-8 text-center">
                <div className="relative mb-6">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full"
                    style={{ background: "linear-gradient(135deg,#dcfce7,#bbf7d0)", boxShadow: "0 8px 32px -8px rgba(52,211,153,.4)" }}>
                    <svg className="h-11 w-11 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path className="check-path" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="font-headline text-[28px] font-extrabold text-[#0a1628]">Report Sent!</h2>
                <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-[#6b7280]">
                  Your support ticket has been submitted. The Lead Developer will review it shortly.
                </p>
                <div className="mt-6 flex items-center gap-2.5 rounded-2xl border border-[#0033A0]/10 bg-[#f0f5ff] px-4 py-3">
                  <svg className="h-4 w-4 shrink-0 text-[#0033A0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[12px] font-semibold text-[#0033A0]">Expected response within 2 hours</span>
                </div>
                <button
                  onClick={() => { setSubmitted(false); setFormData({ subject: "", category: "login", description: "" }); setCharCount(0); }}
                  className="mt-7 text-[13px] font-bold text-[#0033A0] hover:underline transition-colors"
                >
                  ← Submit another report
                </button>
              </div>
            ) : (
              /* ── FORM ── */
              <>
                {/* Header */}
                <div className="mb-8" style={{ animation: "fadeUp .45s ease .08s both", opacity: 0 }}>
                  <h2 className="font-headline text-[30px] font-extrabold tracking-tight text-[#0033A0]">
                    Contact Support
                  </h2>
                  <p className="mt-1.5 text-[14px] font-medium text-[#555555]">
                    Having trouble accessing the Merry Explorers Portal? We&apos;re here to help!
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                  {/* ── Subject ── */}
                  <div className="field" style={{ animationDelay: ".12s", opacity: 0 }}>
                    <label htmlFor="subject" className="mb-1.5 block text-[13px] font-bold text-[#1f2a44]">
                      Subject
                    </label>
                    <div className={`input-wrap relative overflow-hidden rounded-[10px] border bg-white transition-all ${focused === "subject" ? "active" : "border-[#E0E0E0]"}`}>
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#9aa3b2]">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M7 8h10M7 12h6m-6 4h10M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </span>
                      <input
                        id="subject"
                        type="text"
                        required
                        placeholder="Brief description of the issue"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        onFocus={() => setFocused("subject")}
                        onBlur={() => setFocused(null)}
                        disabled={loading}
                        className="w-full bg-transparent py-3 pl-10 pr-10 text-[13px] font-medium text-[#1f2a44] outline-none placeholder:text-[#b6bdc9] disabled:opacity-60"
                      />
                      {formData.subject && (
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                          <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Category chips ── */}
                  <div className="field" style={{ animationDelay: ".18s", opacity: 0 }}>
                    <label className="mb-2 block text-[13px] font-bold text-[#1f2a44]">
                      Category
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          disabled={loading}
                          onClick={() => setFormData({ ...formData, category: cat.value })}
                          className={`chip flex flex-col items-center gap-1 rounded-[10px] bg-white py-3 text-center text-[#555555] disabled:opacity-60 ${formData.category === cat.value ? "chip-active" : ""
                            }`}
                        >
                          <span className="text-[18px] leading-none">{cat.icon}</span>
                          <span className="text-[10px] font-bold leading-tight tracking-wide">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Description ── */}
                  <div className="field" style={{ animationDelay: ".24s", opacity: 0 }}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="description" className="text-[13px] font-bold text-[#1f2a44]">
                        Description
                      </label>
                      <span className={`text-[11px] font-semibold tabular-nums ${charCount > 450 ? "text-red-500" : "text-[#9aa3b2]"}`}>
                        {charCount}/500
                      </span>
                    </div>
                    <div className={`input-wrap rounded-[10px] border bg-white transition-all ${focused === "description" ? "active" : "border-[#E0E0E0]"}`}>
                      <textarea
                        id="description"
                        required
                        rows={4}
                        maxLength={500}
                        placeholder="Please provide details about what went wrong, when it started, and any steps to reproduce…"
                        value={formData.description}
                        onChange={(e) => { setFormData({ ...formData, description: e.target.value }); setCharCount(e.target.value.length); }}
                        onFocus={() => setFocused("description")}
                        onBlur={() => setFocused(null)}
                        disabled={loading}
                        className="w-full resize-none bg-transparent px-4 py-3 text-[13px] font-medium text-[#1f2a44] outline-none placeholder:text-[#b6bdc9] disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {/* ── Submit ── */}
                  <div className="field" style={{ animationDelay: ".3s", opacity: 0 }}>
                    <button
                      id="submit-report"
                      type="submit"
                      disabled={loading || !formData.subject.trim() || !formData.description.trim()}
                      className="btn-cta flex w-full items-center justify-center gap-2.5 rounded-[10px] py-3.5 text-[15px] font-extrabold text-[#0033A0] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:transform-none disabled:hover:shadow-none"
                    >
                      {loading ? (
                        <>
                          <span className="h-5 w-5 rounded-full border-2 border-[#0033A0]/30 border-t-[#0033A0]"
                            style={{ animation: "spin .8s linear infinite" }} />
                          Submitting…
                        </>
                      ) : (
                        <>
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Submit Report
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Footer row */}
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[#9aa3b2]">
                    Need immediate help?{" "}
                    <a href="mailto:vianangelo.14@gmail.com"
                      className="font-bold text-[#0033A0] transition-colors hover:text-[#FFC107]">
                      Email Lead Developer
                    </a>
                  </span>
                </div>

                <div className="mt-5 border-t border-[#f0f4f9] pt-5 text-center">
                  <Link
                    href="/login"
                    className="group inline-flex items-center gap-2 text-[13px] font-bold text-[#555555] transition-colors hover:text-[#0033A0]"
                  >
                    <svg className="h-4 w-4 transition-transform group-hover:-translate-x-1"
                      fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Sign In
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
