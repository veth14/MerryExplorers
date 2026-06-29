"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  // Auto-redirect countdown to landing page.
  useEffect(() => {
    if (countdown <= 0) {
      router.push("/");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, router]);

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#F7F9FC] via-white to-[#FFF7E6] px-5">
      <div className="w-full max-w-2xl text-center">
        {/* Big number */}
        <div className="relative inline-flex items-center justify-center">
          <span className="font-headline text-[140px] font-extrabold leading-none text-[#E8EDF5] sm:text-[180px] select-none">
            404
          </span>
          {/* Floating decorative elements */}
          <span className="absolute -top-4 -left-6 h-8 w-8 rounded-full bg-[#FFC107] opacity-50 blur-sm" />
          <span className="absolute -bottom-2 -right-4 h-10 w-10 rounded-full bg-[#FF8A3D] opacity-40 blur-sm" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="font-headline text-[44px] font-extrabold text-[#0b1a3d] sm:text-[56px]">
              Oops!
            </span>
          </span>
        </div>

        {/* Illustration: lost balloon */}
        <div className="mx-auto mt-2 flex justify-center">
          <svg
            viewBox="0 0 120 180"
            className="h-32 w-auto sm:h-40"
            aria-hidden="true"
          >
            {/* Balloon string */}
            <path
              d="M60 110 q-10 30 4 60 q6 12 -2 18"
              stroke="#94A3B8"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="4 3"
            />
            {/* Balloon body */}
            <ellipse cx="60" cy="60" rx="34" ry="42" fill="#0033A0" opacity="0.9" />
            <ellipse cx="52" cy="48" rx="12" ry="18" fill="#FFFFFF" opacity="0.15" />
            {/* Balloon knot */}
            <path d="M55 102 l5 6 5-6" fill="#0033A0" />
            {/* Question mark */}
            <text
              x="60"
              y="68"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="32"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              ?
            </text>
          </svg>
        </div>

        <h1 className="mt-4 font-headline text-[28px] font-extrabold tracking-tight text-[#0b1a3d] sm:text-[34px]">
          Page Not Found
        </h1>
        <p className="mt-3 mx-auto max-w-md text-[16px] leading-relaxed text-[#64748b]">
          Looks like this page wandered off on its own little adventure.
          Don&apos;t worry — we&apos;ll guide you back home in a moment!
        </p>

        {/* Countdown progress bar */}
        <div className="mx-auto mt-8 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#0033A0] to-[#3a6fd8] transition-all duration-1000 ease-linear"
            style={{ width: `${((10 - countdown) / 10) * 100}%` }}
          />
        </div>

        <p className="mt-3 text-[13px] font-semibold text-[#94A3B8]">
          Redirecting to home in{" "}
          <span className="text-[#0033A0]">{countdown}</span>
          {countdown !== 1 ? " seconds" : " second"}…
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[#0033A0] px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_14px_30px_-10px_rgba(0,51,160,0.6)] transition-all hover:bg-[#002a82] hover:shadow-[0_18px_36px_-10px_rgba(0,51,160,0.7)]"
          >
            Go Home Now
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-black/10 bg-white px-6 py-3.5 text-[15px] font-bold text-[#334155] transition-all hover:border-[#0033A0]/20 hover:text-[#0033A0]"
          >
            Go Back
          </button>
        </div>
      </div>
    </main>
  );
}
