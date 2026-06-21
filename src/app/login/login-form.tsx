"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Hardcoded demo credentials (no backend in this project).
// Email:    admin@merryexplorers.edu
// Password: explorers123
const VALID_EMAIL = "admin@merryexplorers.edu";
const VALID_PASSWORD = "explorers123";

const TEACHER_EMAIL = "teacher@merryexplorers.edu";
const TEACHER_PASSWORD = "explorers123";

function MailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    // Simulate a network round-trip before validating credentials.
    window.setTimeout(() => {
      if (email.trim() === VALID_EMAIL && password === VALID_PASSWORD) {
        router.push("/admin");
      } else if (email.trim() === TEACHER_EMAIL && password === TEACHER_PASSWORD) {
        router.push("/teacher");
      } else {
        setError("Invalid email or password.");
        setLoading(false);
      }
    }, 600);
  }

  return (
    <div className="flex h-full flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
      <div className="w-full max-w-sm self-center">
        <div className="mb-8">
          <h2 className="font-headline text-[30px] font-extrabold tracking-tight text-[#0033A0]">
            Sign In
          </h2>
          <p className="mt-1.5 text-[14px] font-medium text-[#555555]">
            Access your account to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[13px] font-bold text-[#1f2a44]"
            >
              Email Address
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#9aa3b2]">
                <MailIcon />
              </span>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@merryexplorers.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full rounded-[10px] border border-[#E0E0E0] bg-white py-3 pl-11 pr-4 text-[14px] font-medium text-[#1f2a44] outline-none transition-colors placeholder:text-[#b6bdc9] focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[13px] font-bold text-[#1f2a44]"
            >
              Password
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#9aa3b2]">
                <LockIcon />
              </span>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full rounded-[10px] border border-[#E0E0E0] bg-white py-3 pl-11 pr-11 text-[14px] font-medium text-[#1f2a44] outline-none transition-colors placeholder:text-[#b6bdc9] focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#9aa3b2] transition-colors hover:text-[#0033A0]"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Remember / Forgot */}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-[#555555]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded-[4px] border-[#E0E0E0] accent-[#0033A0]"
              />
              Remember me for 30 days
            </label>
            <a
              href="#"
              className="text-[13px] font-bold text-[#0033A0] transition-colors hover:text-[#FFC107]"
            >
              Forgot Password?
            </a>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="rounded-[10px] border border-[#ba1a1a]/20 bg-[#ba1a1a]/5 px-4 py-2.5 text-[13px] font-semibold text-[#ba1a1a]"
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#FFC107] py-3.5 text-[15px] font-extrabold text-[#0033A0] shadow-[0_6px_18px_-4px_rgba(255,193,7,0.55)] transition-all hover:bg-[#ffb800] hover:shadow-[0_8px_22px_-4px_rgba(255,193,7,0.65)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0033A0]/30 border-t-[#0033A0]" />
                Signing in…
              </>
            ) : (
              <>
                Sign In
                <ArrowRightIcon />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-[12px] font-medium text-[#9aa3b2]">
          Secure Portal Access • Need help?{" "}
          <a href="#" className="font-bold text-[#0033A0] hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}
