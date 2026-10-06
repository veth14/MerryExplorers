"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

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

// ─── Icons ────────────────────────────────────────────────────────────────────

function Svg({
  size = 20,
  strokeWidth = 2,
  children,
}: {
  size?: number;
  strokeWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function MailIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </Svg>
  );
}

function PhoneIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.1 6.1l1.27-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </Svg>
  );
}

function MapPinIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </Svg>
  );
}

function ClockIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Svg>
  );
}

function UserIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Svg>
  );
}

function MessageIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

function SendIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg size={size} strokeWidth={2.2}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </Svg>
  );
}

function LockIcon({ size = 12 }: { size?: number }) {
  return (
    <Svg size={size} strokeWidth={2.5}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
}

function InfoIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </Svg>
  );
}

function AlertIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </Svg>
  );
}

function ArrowLeftIcon() {
  return (
    <Svg size={16} strokeWidth={2.5}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </Svg>
  );
}

function ArrowUpRightIcon() {
  return (
    <Svg size={16} strokeWidth={2.2}>
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </Svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path className="pc-draw" pathLength={1} d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path className="pc-draw pc-draw-2" pathLength={1} d="m9 11 3 3L22 4" />
    </svg>
  );
}

// ─── Contact info card ────────────────────────────────────────────────────────

function ContactCard({
  icon,
  label,
  value,
  href,
  accentColor,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  accentColor: string;
  badge?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="pc-card-icon" style={{ background: accentColor }}>
        {icon}
      </div>
      <div className="pc-card-body">
        <div className="pc-card-top">
          <p className="pc-card-label">{label}</p>
          {badge}
        </div>
        <p className="pc-card-value">{value}</p>
      </div>
      {href && (
        <span className="pc-card-arrow">
          <ArrowUpRightIcon />
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <a href={href} className="pc-card pc-card-link">
        {body}
      </a>
    );
  }
  return <div className="pc-card">{body}</div>;
}

function OfficeBadge({ open }: { open: boolean | null }) {
  // null until the browser has checked the time (avoids a server/client mismatch)
  if (open === null) return null;
  return (
    <span className={`pc-badge ${open ? "pc-badge-open" : "pc-badge-closed"}`}>
      <span className="pc-dot" aria-hidden="true" />
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
    <main id="parent-contact-page" className="pc-page">
      {/* Decorative background blobs */}
      <div aria-hidden="true" className="pc-blob pc-blob-a" />
      <div aria-hidden="true" className="pc-blob pc-blob-b" />

      <div className="pc-wrap">
        {/* Back link */}
        <Link href="/parent/login" className="pc-back">
          <ArrowLeftIcon />
          Back to Login
        </Link>

        {/* Header card */}
        <header className="pc-hero">
          <div className="pc-bar" />
          <div className="pc-hero-body">
            <div className="pc-logo">
              <Image src="/LOGO-noBG.png" alt="Merry Explorers" fill sizes="76px" priority className="object-contain p-1.5" />
            </div>
            <div>
              <span className="pc-eyebrow">
                <LockIcon />
                Parent Portal
              </span>
              <h1 className="pc-title">Contact Our Team</h1>
              <p className="pc-subtitle">We&apos;re here to help. Reach out to the Merry Explorers team any time.</p>
            </div>
          </div>
        </header>

        {/* Main grid */}
        <div id="parent-contact-grid" className="pc-grid">
          {/* Left — contact info */}
          <section className="pc-info" aria-labelledby="pc-info-title">
            <h2 id="pc-info-title" className="pc-section-title">
              Get in Touch
            </h2>

            <ContactCard
              icon={<MailIcon />}
              label="Email"
              value="merryexplorerscenter@gmail.com"
              href="mailto:merryexplorerscenter@gmail.com"
              accentColor="linear-gradient(135deg, #002f76 0%, #0050d5 100%)"
            />

            <ContactCard
              icon={<PhoneIcon />}
              label="Phone / Messenger"
              value="0917 123 4567"
              href="tel:+639171234567"
              accentColor="linear-gradient(135deg, #0050d5 0%, #4a90d9 100%)"
            />

            <ContactCard
              icon={<MapPinIcon />}
              label="Location"
              value="Merry Explorers Learning Center, Philippines"
              accentColor="linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
            />

            <ContactCard
              icon={<ClockIcon />}
              label="Office Hours"
              value={OFFICE_HOURS_TEXT}
              accentColor="linear-gradient(135deg, #10b981 0%, #34d399 100%)"
              badge={<OfficeBadge open={openNow} />}
            />

            <div className="pc-note">
              <span className="pc-note-icon">
                <InfoIcon />
              </span>
              <p>For urgent concerns about your child, please call us directly or visit the school during office hours.</p>
            </div>
          </section>

          {/* Right — message form */}
          <section className="pc-form-card" aria-live="polite">
            <div className="pc-bar pc-bar-thin" />
            <div className="pc-form-body">
              {sent ? (
                <div className="pc-success" role="status">
                  <div className="pc-check">
                    <CheckCircleIcon />
                  </div>
                  <h3 className="pc-success-title">Message Sent!</h3>
                  <p className="pc-success-text">
                    Thank you for reaching out! Your message has been sent to our team and a confirmation has been sent to{" "}
                    <strong>{email.trim() || "your email inbox"}</strong>. We&apos;ll get back to you as soon as possible.
                  </p>
                  <button
                    type="button"
                    className="pc-submit pc-submit-auto"
                    onClick={() => {
                      setSent(false);
                      setName("");
                      setEmail("");
                      setSubject("");
                      setMessage("");
                    }}
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="pc-form-title">Send us a Message</h2>
                  <p className="pc-form-hint">
                    Fields marked <span className="pc-req">*</span> are required.
                  </p>

                  <form id="parent-contact-form" onSubmit={handleSubmit} noValidate className="pc-form">
                    <div className="pc-field">
                      <label htmlFor="contact-name" className="pc-label">
                        Your Name <span className="pc-req">*</span>
                      </label>
                      <div className="pc-input-wrap">
                        <span className="pc-input-icon">
                          <UserIcon />
                        </span>
                        <input
                          id="contact-name"
                          className="pc-input pc-input-with-icon"
                          type="text"
                          placeholder="e.g. Maria Santos"
                          autoComplete="name"
                          aria-required="true"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="pc-field">
                      <label htmlFor="contact-email" className="pc-label">
                        Email Address <span className="pc-req">*</span>
                      </label>
                      <div className="pc-input-wrap">
                        <span className="pc-input-icon">
                          <MailIcon size={16} />
                        </span>
                        <input
                          id="contact-email"
                          className="pc-input pc-input-with-icon"
                          type="email"
                          placeholder="your@email.com"
                          autoComplete="email"
                          aria-required="true"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="pc-field">
                      <label htmlFor="contact-subject" className="pc-label">
                        Subject
                      </label>
                      <div className="pc-input-wrap">
                        <span className="pc-input-icon">
                          <MessageIcon />
                        </span>
                        <input
                          id="contact-subject"
                          className="pc-input pc-input-with-icon"
                          type="text"
                          placeholder="e.g. Question about my child's schedule"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="pc-field">
                      <label htmlFor="contact-message" className="pc-label">
                        Message <span className="pc-req">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        className="pc-input pc-textarea"
                        rows={5}
                        placeholder="Write your message here…"
                        aria-required="true"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={loading}
                      />
                    </div>

                    {error && (
                      <div role="alert" className="pc-error">
                        <AlertIcon />
                        <span>{error}</span>
                      </div>
                    )}

                    <button id="contact-submit-btn" type="submit" disabled={loading} className="pc-submit">
                      {loading ? (
                        <>
                          <span className="pc-spinner" aria-hidden="true" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <SendIcon />
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <p className="pc-footer">© {new Date().getFullYear()} Merry Explorers · Secure Parent Portal</p>
      </div>

      <style>{`
        .pc-page, .pc-page * { box-sizing: border-box; }

        .pc-page {
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
          padding: 40px 16px 64px;
          font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif;
          color: #1e3a6e;
          background-color: #f0f7ff;
          background-image:
            radial-gradient(rgba(0, 47, 118, 0.05) 1px, transparent 1px),
            linear-gradient(135deg, #f0f7ff 0%, #e8f0fe 40%, #fdf4ff 100%);
          background-size: 22px 22px, 100% 100%;
        }
        .pc-blob { position: fixed; border-radius: 50%; pointer-events: none; }
        .pc-blob-a { top: -100px; right: -100px; width: 420px; height: 420px; background: radial-gradient(circle, rgba(0, 80, 213, 0.12) 0%, transparent 70%); }
        .pc-blob-b { bottom: -90px; left: -90px; width: 380px; height: 380px; background: radial-gradient(circle, rgba(255, 184, 0, 0.14) 0%, transparent 70%); }
        .pc-wrap { position: relative; max-width: 920px; margin: 0 auto; }

        /* Back link */
        .pc-back {
          display: inline-flex; align-items: center; gap: 8px;
          margin-bottom: 24px; padding: 8px 14px 8px 12px;
          font-size: 13px; font-weight: 700; color: #0050d5; text-decoration: none;
          background: rgba(255, 255, 255, 0.75);
          border: 1.5px solid rgba(0, 80, 213, 0.12); border-radius: 999px;
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .pc-back:hover { background: #fff; transform: translateX(-2px); box-shadow: 0 4px 14px rgba(0, 47, 118, 0.10); }
        .pc-back:focus-visible { outline: 3px solid rgba(0, 80, 213, 0.35); outline-offset: 2px; }

        /* Header */
        .pc-bar { height: 5px; background: linear-gradient(90deg, #002f76 0%, #0050d5 50%, #4a90d9 100%); }
        .pc-bar-thin { height: 4px; }
        .pc-hero {
          position: relative; overflow: hidden; margin-bottom: 24px;
          background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(20px);
          border-radius: 28px;
          box-shadow: 0 24px 80px -10px rgba(0, 47, 118, 0.18), 0 0 0 1px rgba(0, 47, 118, 0.06);
        }
        .pc-hero::after {
          content: ""; position: absolute; right: -70px; top: -70px; width: 280px; height: 280px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 184, 0, 0.20) 0%, transparent 70%); pointer-events: none;
        }
        .pc-hero-body { position: relative; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 24px; padding: 34px 40px 32px; }
        .pc-logo {
          position: relative; flex-shrink: 0; width: 76px; height: 76px; border-radius: 50%;
          background: #fff; border: 3px solid #fff;
          box-shadow: 0 0 0 4px rgba(0, 80, 213, 0.10), 0 12px 30px rgba(0, 47, 118, 0.20);
        }
        .pc-eyebrow {
          display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
          font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
          color: #0050d5; background: rgba(0, 80, 213, 0.08); border-radius: 999px;
        }
        .pc-title { margin: 10px 0 4px; font-size: clamp(24px, 4vw, 30px); font-weight: 800; letter-spacing: -0.5px; color: #002f76; line-height: 1.15; }
        .pc-subtitle { margin: 0; font-size: 14px; font-weight: 500; color: #64748b; line-height: 1.5; }

        /* Grid */
        .pc-grid { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: 24px; align-items: stretch; }
        .pc-info { display: flex; flex-direction: column; gap: 12px; }
        .pc-section-title {
          display: flex; align-items: center; gap: 10px; margin: 0 0 4px;
          font-size: 12px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: #64748b;
        }
        .pc-section-title::before { content: ""; width: 24px; height: 3px; border-radius: 2px; background: #ffb800; }

        /* Contact cards */
        .pc-card {
          position: relative; display: flex; align-items: center; gap: 14px; padding: 16px 18px;
          text-decoration: none; color: inherit;
          background: rgba(255, 255, 255, 0.90); backdrop-filter: blur(12px);
          border: 1.5px solid rgba(0, 47, 118, 0.08); border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 47, 118, 0.06);
          transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
        }
        .pc-card-link:hover { transform: translateY(-2px); border-color: rgba(0, 80, 213, 0.25); box-shadow: 0 10px 30px rgba(0, 47, 118, 0.14); }
        .pc-card-link:focus-visible { outline: 3px solid rgba(0, 80, 213, 0.35); outline-offset: 2px; }
        .pc-card-icon {
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 44px; height: 44px; border-radius: 13px; color: #fff;
          box-shadow: 0 6px 14px rgba(0, 47, 118, 0.18);
        }
        .pc-card-body { min-width: 0; flex: 1; }
        .pc-card-top { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .pc-card-label { margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #64748b; }
        .pc-card-value { margin: 3px 0 0; font-size: 14px; font-weight: 600; color: #1e3a6e; line-height: 1.4; overflow-wrap: anywhere; }
        .pc-card-arrow { flex-shrink: 0; color: #94a3b8; opacity: 0; transform: translate(-4px, 4px); transition: opacity 0.2s, transform 0.2s, color 0.2s; }
        .pc-card-link:hover .pc-card-arrow, .pc-card-link:focus-visible .pc-card-arrow { opacity: 1; transform: translate(0, 0); color: #0050d5; }

        /* Open / closed badge */
        .pc-badge { display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: 999px; }
        .pc-badge-open { color: #047857; background: rgba(16, 185, 129, 0.14); }
        .pc-badge-closed { color: #64748b; background: #eef2f7; }
        .pc-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
        .pc-badge-open .pc-dot { animation: pc-pulse 2s ease-in-out infinite; }

        /* Urgent note */
        .pc-note {
          display: flex; align-items: flex-start; gap: 10px; margin-top: auto; padding: 14px 16px;
          background: rgba(0, 80, 213, 0.06); border: 1.5px solid rgba(0, 80, 213, 0.12); border-radius: 14px;
        }
        .pc-note p { margin: 0; font-size: 12.5px; font-weight: 500; line-height: 1.6; color: #1e3a6e; }
        .pc-note-icon { flex-shrink: 0; margin-top: 1px; color: #0050d5; }

        /* Form card */
        .pc-form-card {
          display: flex; flex-direction: column; overflow: hidden;
          background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(20px);
          border-radius: 24px;
          box-shadow: 0 8px 40px rgba(0, 47, 118, 0.10), 0 0 0 1px rgba(0, 47, 118, 0.06);
        }
        .pc-form-body { display: flex; flex: 1; flex-direction: column; padding: 28px 30px 30px; }
        .pc-form-title { margin: 0; font-size: 18px; font-weight: 800; color: #002f76; }
        .pc-form-hint { margin: 4px 0 20px; font-size: 12.5px; font-weight: 500; color: #64748b; }
        .pc-form { display: flex; flex: 1; flex-direction: column; gap: 16px; }
        .pc-field { display: flex; flex-direction: column; }
        .pc-label { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 700; color: #1e3a6e; }
        .pc-req { color: #e53e3e; }
        .pc-input-wrap { position: relative; }
        .pc-input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); display: flex; color: #94a3b8; pointer-events: none; transition: color 0.2s; }
        .pc-input-wrap:focus-within .pc-input-icon { color: #0050d5; }
        .pc-input {
          width: 100%; padding: 11px 14px; font: inherit; font-size: 14px; font-weight: 500; color: #1e3a6e;
          background: #f8faff; border: 1.5px solid #dde5f0; border-radius: 12px; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .pc-input-with-icon { padding-left: 40px; }
        .pc-input::placeholder { color: #94a3b8; font-weight: 400; }
        .pc-input:hover:not(:disabled) { border-color: #c3d2ea; }
        .pc-input:focus { background: #fff; border-color: #0050d5; box-shadow: 0 0 0 4px rgba(0, 80, 213, 0.12); }
        .pc-input:disabled { opacity: 0.65; cursor: not-allowed; }
        .pc-textarea { min-height: 130px; resize: vertical; line-height: 1.5; }

        .pc-error {
          display: flex; align-items: center; gap: 8px; padding: 10px 14px;
          font-size: 13px; font-weight: 600; color: #ba1a1a;
          background: rgba(186, 26, 26, 0.06); border: 1.5px solid rgba(186, 26, 26, 0.20); border-radius: 12px;
        }
        .pc-error svg { flex-shrink: 0; }

        /* Buttons */
        .pc-submit {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; margin-top: auto; padding: 14px; font: inherit; font-size: 14px; font-weight: 800; color: #fff;
          background: linear-gradient(135deg, #002f76 0%, #0050d5 100%);
          border: none; border-radius: 12px; cursor: pointer;
          box-shadow: 0 6px 20px rgba(0, 47, 118, 0.30);
          transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
        }
        .pc-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 26px rgba(0, 47, 118, 0.36); filter: brightness(1.08); }
        .pc-submit:active:not(:disabled) { transform: translateY(0); }
        .pc-submit:focus-visible { outline: 3px solid rgba(0, 80, 213, 0.45); outline-offset: 2px; }
        .pc-submit:disabled { background: #7ba3e0; box-shadow: none; cursor: not-allowed; }
        .pc-submit-auto { width: auto; margin-top: 0; padding: 12px 26px; }
        .pc-spinner { display: inline-block; width: 16px; height: 16px; border-radius: 50%; border: 2.5px solid rgba(255, 255, 255, 0.3); border-top-color: #fff; animation: pc-spin 0.7s linear infinite; }

        /* Success state */
        .pc-success { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; padding: 24px 8px; text-align: center; }
        .pc-check {
          display: flex; align-items: center; justify-content: center; width: 92px; height: 92px; margin-bottom: 22px; border-radius: 50%;
          color: #10b981; background: rgba(16, 185, 129, 0.12); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0.06);
          animation: pc-pop 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.3) both;
        }
        .pc-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: pc-draw 0.6s 0.2s ease forwards; }
        .pc-draw-2 { animation-delay: 0.5s; }
        .pc-success-title { margin: 0 0 8px; font-size: 22px; font-weight: 800; color: #002f76; }
        .pc-success-text { max-width: 340px; margin: 0 0 26px; font-size: 14px; font-weight: 500; line-height: 1.65; color: #64748b; overflow-wrap: anywhere; }
        .pc-success-text strong { color: #1e3a6e; font-weight: 700; }

        .pc-footer { margin: 32px 0 0; text-align: center; font-size: 12px; font-weight: 500; color: #94a3b8; }

        @keyframes pc-spin { to { transform: rotate(360deg); } }
        @keyframes pc-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes pc-pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
        @keyframes pc-draw { to { stroke-dashoffset: 0; } }

        /* Phones and small tablets: stack, form first */
        @media (max-width: 760px) {
          .pc-page { padding: 24px 14px 48px; }
          .pc-grid { grid-template-columns: 1fr; }
          .pc-form-card { order: 1; }
          .pc-info { order: 2; }
          .pc-hero { border-radius: 22px; }
          .pc-hero-body { gap: 16px; padding: 26px 22px 24px; }
          .pc-logo { width: 64px; height: 64px; }
          .pc-form-body { padding: 24px 20px 24px; }
          .pc-card-arrow { opacity: 1; transform: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .pc-page *, .pc-page *::before, .pc-page *::after { animation: none !important; transition: none !important; }
          .pc-draw { stroke-dashoffset: 0; }
        }
      `}</style>
    </main>
  );
}