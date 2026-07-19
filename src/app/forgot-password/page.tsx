"use client";

import { useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    if (!email.trim()) {
      setMessage({ text: "Please enter your email address.", type: "error" });
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage({ text: "If an account with that email exists, a reset link has been sent.", type: "success" });
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "An error occurred. Please try again later.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#F8FAFC] px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_-15px_rgba(0,51,160,0.18)] md:grid-cols-[45%_55%]">
        {/* Left: branding panel */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-[#0033A0] to-[#0050d5] p-10 md:flex">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-[#FFC107]/20 blur-2xl"
          />
          <div className="relative">
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-white/95 shadow-lg ring-4 ring-white/20">
              <img
                src="/LOGO-noBG.png"
                alt="Merry Explorers logo"
                className="object-contain p-1.5 w-full h-full"
              />
            </div>
          </div>
          <div className="relative">
            <h1 className="font-headline text-[32px] font-extrabold leading-tight tracking-tight text-white">
              Account Recovery
            </h1>
            <p className="mt-4 max-w-sm text-[15px] font-medium leading-relaxed text-white/80">
              Get back to managing your early education playground securely.
            </p>
          </div>
          <p className="relative text-[12px] font-semibold text-white/60">
            © {new Date().getFullYear()} Merry Explorers. All rights reserved.
          </p>
        </div>

        {/* Right: form panel */}
        <div className="flex h-full flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="w-full max-w-sm self-center">
            <div className="mb-8">
              <h2 className="font-headline text-[30px] font-extrabold tracking-tight text-[#0033A0]">
                Forgot Password
              </h2>
              <p className="mt-1.5 text-[14px] font-medium text-[#555555]">
                Enter your email to receive a reset link.
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="teacher@merryexplorers.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-[10px] border border-[#E0E0E0] bg-white py-3 pl-11 pr-4 text-[14px] font-medium text-[#1f2a44] outline-none transition-colors placeholder:text-[#b6bdc9] focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Message */}
              {message && (
                <div
                  role="alert"
                  className={`rounded-[10px] border px-4 py-2.5 text-[13px] font-semibold ${
                    message.type === "error"
                      ? "border-[#ba1a1a]/20 bg-[#ba1a1a]/5 text-[#ba1a1a]"
                      : "border-brand-green/20 bg-brand-green/5 text-[#1a7f4b]"
                  }`}
                >
                  {message.text}
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
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-[12px] font-medium text-[#9aa3b2]">
              Remember your password?{" "}
              <Link href="/login" className="font-bold text-[#0033A0] hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
