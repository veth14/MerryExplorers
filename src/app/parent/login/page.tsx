"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

// ─── Icons ────────────────────────────────────────────────────────────────────

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
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
      className="flex min-h-screen w-full items-center justify-center px-4 py-10"
      style={{
        background: "linear-gradient(135deg, #f0f7ff 0%, #e8f0fe 40%, #fdf4ff 100%)",
        fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
      }}
    >
      {/* Background decorative blobs */}
      <div aria-hidden="true" style={{ position: "fixed", top: "-100px", right: "-100px", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,80,213,0.10) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div aria-hidden="true" style={{ position: "fixed", bottom: "-80px", left: "-80px", width: "350px", height: "350px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,193,7,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div className="w-full max-w-md">

        {/* Card */}
        <div
          style={{
            background: "rgba(255,255,255,0.90)",
            backdropFilter: "blur(20px)",
            borderRadius: "28px",
            boxShadow: "0 24px 80px -10px rgba(0,47,118,0.18), 0 0 0 1px rgba(0,47,118,0.06)",
            overflow: "hidden",
          }}
        >
          {/* Top accent bar */}
          <div style={{ background: "linear-gradient(90deg, #002f76 0%, #0050d5 50%, #4a90d9 100%)", height: "5px" }} />

          {/* Header */}
          <div className="flex flex-col items-center px-8 pt-10 pb-6">
            <div
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "50%",
                overflow: "hidden",
                background: "#f0f5ff",
                boxShadow: "0 8px 24px rgba(0,47,118,0.18)",
                border: "3px solid white",
                position: "relative",
                marginBottom: "16px",
              }}
            >
              <Image src="/LOGO-noBG.png" alt="Merry Explorers" fill className="object-contain p-1.5" />
            </div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "800",
                color: "#002f76",
                margin: "0 0 6px",
                letterSpacing: "-0.4px",
                textAlign: "center",
              }}
            >
              Parent Portal
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", fontWeight: "500", margin: 0, textAlign: "center" }}>
              Sign in to follow your child's adventure at Merry Explorers
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            <form onSubmit={handleSubmit} noValidate className="space-y-5">

              {/* Email */}
              <div>
                <label htmlFor="parent-email" style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1e3a6e", marginBottom: "6px" }}>
                  Email Address
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", inset: "0 auto 0 0", display: "flex", alignItems: "center", paddingLeft: "14px", color: "#94a3b8", pointerEvents: "none" }}>
                    <MailIcon />
                  </span>
                  <input
                    id="parent-email"
                    type="email"
                    autoComplete="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "12px 14px 12px 44px",
                      border: "1.5px solid #dde5f0",
                      borderRadius: "12px",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#1e3a6e",
                      background: "#f8faff",
                      outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#0050d5"; e.target.style.boxShadow = "0 0 0 3px rgba(0,80,213,0.12)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#dde5f0"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="parent-password" style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1e3a6e", marginBottom: "6px" }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", inset: "0 auto 0 0", display: "flex", alignItems: "center", paddingLeft: "14px", color: "#94a3b8", pointerEvents: "none" }}>
                    <LockIcon />
                  </span>
                  <input
                    id="parent-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "12px 44px 12px 44px",
                      border: "1.5px solid #dde5f0",
                      borderRadius: "12px",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#1e3a6e",
                      background: "#f8faff",
                      outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#0050d5"; e.target.style.boxShadow = "0 0 0 3px rgba(0,80,213,0.12)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#dde5f0"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    style={{ position: "absolute", inset: "0 0 0 auto", display: "flex", alignItems: "center", paddingRight: "14px", color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  id="parent-remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={loading}
                  style={{ width: "16px", height: "16px", accentColor: "#0050d5", cursor: "pointer" }}
                />
                <label htmlFor="parent-remember" style={{ fontSize: "13px", fontWeight: "500", color: "#64748b", cursor: "pointer", userSelect: "none" }}>
                  Remember me for 30 days
                </label>
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  style={{
                    background: "rgba(186,26,26,0.06)",
                    border: "1.5px solid rgba(186,26,26,0.20)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#ba1a1a",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                id="parent-signin-btn"
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: loading ? "#7ba3e0" : "linear-gradient(135deg, #002f76 0%, #0050d5 100%)",
                  color: "white",
                  fontWeight: "800",
                  fontSize: "15px",
                  border: "none",
                  borderRadius: "12px",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 6px 20px rgba(0,47,118,0.30)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.2s",
                }}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: "2.5px solid rgba(255,255,255,0.3)",
                        borderTopColor: "white",
                        animation: "spin 0.7s linear infinite",
                        display: "inline-block",
                      }}
                    />
                    Signing in…
                  </>
                ) : (
                  "Sign In to Portal"
                )}
              </button>

            </form>

            {/* Footer note */}
            <p style={{ marginTop: "24px", textAlign: "center", fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>
              Need help?{" "}
              <a href="mailto:merryexplorerscenter@gmail.com" style={{ color: "#0050d5", fontWeight: "700", textDecoration: "none" }}>
                Contact our team
              </a>
            </p>
          </div>
        </div>

        {/* Bottom note */}
        <p style={{ marginTop: "20px", textAlign: "center", fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>
          © {new Date().getFullYear()} Merry Explorers · Secure Parent Portal
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </main>
  );
}
