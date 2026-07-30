import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign In · Merry Explorers",
  description: "Sign in to the Merry Explorers admin dashboard.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#F8FAFC] px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_-15px_rgba(0,51,160,0.18)] md:grid-cols-[45%_55%]">
        {/* Left: branding panel */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-[#0033A0] to-[#0050d5] p-10 md:flex">
          {/* Decorative soft circles */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-[#FFC107]/20 blur-2xl"
          />

          {/* Logo */}
          <div className="relative">
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-white/95 shadow-lg ring-4 ring-white/20">
              <Image
                src="/LOGO-noBG.png"
                alt="Merry Explorers logo"
                fill
                className="object-contain p-1.5"
              />
            </div>
          </div>

          {/* Welcome text */}
          <div className="relative">
            <h1 className="font-headline text-[32px] font-extrabold leading-tight tracking-tight text-white">
              Welcome back to Merry Explorers
            </h1>
            <p className="mt-4 max-w-sm text-[15px] font-medium leading-relaxed text-white/80">
              The structured playground for efficient early education management.
            </p>
          </div>

          {/* Footnote */}
          <p className="relative text-[12px] font-semibold text-white/60">
            © {new Date().getFullYear()} Merry Explorers. All rights reserved.
          </p>
        </div>

        {/* Right: form panel */}
        <LoginForm />
      </div>
    </main>
  );
}
