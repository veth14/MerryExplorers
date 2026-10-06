"use client";

import { useState } from "react";
import Link from "next/link";

import { useAuth } from "@/lib/auth-context";

const iconProps = {
  width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
};
const MailIcon = () => (<svg {...iconProps}><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>);
const LockIcon = () => (<svg {...iconProps}><rect width="18" height="11" x="3" y="11" rx="3" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>);
const EyeIcon = () => (<svg {...iconProps}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>);
const EyeOffIcon = () => (<svg {...iconProps}><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>);
const ArrowRightIcon = () => (<svg {...iconProps} width={20} height={20} strokeWidth={2.6}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>);

// Styles for these classes (me-input, me-btn, ...) live in page.tsx
export function LoginForm() {
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
    } catch (err: any) {
      console.error(err);
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate style={{ display: "grid", gap: 18 }}>
        {/* Email */}
        <div>
          <label htmlFor="email" className="me-label">Email address</label>
          <div style={{ position: "relative" }}>
            <span className="me-icon-l"><MailIcon /></span>
            <input
              id="email"
              name="email"
              className="me-input"
              type="email"
              autoComplete="email"
              placeholder="admin@merryexplorers.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="me-label">Password</label>
          <div style={{ position: "relative" }}>
            <span className="me-icon-l"><LockIcon /></span>
            <input
              id="password"
              name="password"
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

        {/* Remember / Forgot */}
        <div className="me-row">
          <label htmlFor="remember" className="me-remember">
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={loading}
            />
            Remember me for 30 days
          </label>
          <Link href="/forgot-password" className="me-link">Forgot password?</Link>
        </div>

        {/* Error */}
        {error && <div role="alert" className="me-error">{error}</div>}

        {/* Submit */}
        <button type="submit" disabled={loading} className="me-btn">
          {loading ? (
            <>
              <span className="me-spinner" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRightIcon />
            </>
          )}
        </button>
      </form>

      <p className="me-help">
        Need help?{" "}
        <Link href="/support" className="me-link">Contact support</Link>
      </p>
    </>
  );
}