"use client";

import Link from "next/link";
import Image from "next/image";

const FacebookIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5"
  >
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
  </svg>
);

export function SiteFooter() {
  return (
    <footer id="contact" className="relative bg-white/60 backdrop-blur-xl border-t border-black/5">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">

          {/* Brand Column */}
          <div className="max-w-xs">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="relative h-10 w-10 overflow-hidden rounded-xl shadow-sm">
                <Image
                  src="/LOGO-noBG.png"
                  alt="Merry Explorers Logo"
                  fill
                  sizes="40px"
                  className="object-contain"
                />
              </div>
              <span className="flex flex-col leading-none">
                <span className="font-headline text-[18px] font-extrabold tracking-tight text-[#0033A0]">
                  Merry
                </span>
                <span className="font-headline text-[12px] font-bold tracking-[0.12em] text-[#b47b00]">
                  Explorers
                </span>
              </span>
            </Link>

            <p className="mt-5 text-[13px] font-semibold leading-relaxed text-[#475569]">
              Unit C, 2nd Floor, B13 L33<br />
              Camarin Rd., North, Caloocan<br />
              1421 Metro Manila
            </p>

            <p className="mt-5 text-[12px] font-semibold text-[#475569]">
              © {new Date().getFullYear()} Merry Explorers Playgroup & Learning Center.
            </p>

            {/* Social Media */}
            <div className="mt-5 flex items-center gap-3">
              <Link
                href="https://www.facebook.com/profile.php?id=61588889372224"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Merry Explorers on Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E1ECFF] text-[#0033A0] transition-colors hover:bg-[#0033A0] hover:text-white"
              >
                <FacebookIcon />
              </Link>
            </div>
          </div>

          {/* Divider (hidden on mobile) */}
          <div className="hidden md:block w-px bg-black/5 self-stretch" />

          {/* Links Columns */}
          <div className="flex flex-col sm:flex-row gap-10 sm:gap-16">

            {/* Quick Links */}
            <div>
              <h2 className="font-headline text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#0033A0] mb-4">
                Quick Links
              </h2>
              <nav className="flex flex-col gap-3">
                <Link href="/contact" className="text-[14px] font-semibold text-[#475569] hover:text-[#0033A0] transition-colors">
                  Contact Us
                </Link>
                <Link href="/location" className="text-[14px] font-semibold text-[#475569] hover:text-[#0033A0] transition-colors">
                  Location
                </Link>
                <Link href="/inquire" className="text-[14px] font-semibold text-[#475569] hover:text-[#0033A0] transition-colors">
                  Inquire
                </Link>
              </nav>
            </div>

            {/* Legal */}
            <div>
              <h2 className="font-headline text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#0033A0] mb-4">
                Legal
              </h2>
              <nav className="flex flex-col gap-3">
                <Link href="/privacy-policy" className="text-[14px] font-semibold text-[#475569] hover:text-[#0033A0] transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms-of-service" className="text-[14px] font-semibold text-[#475569] hover:text-[#0033A0] transition-colors">
                  Terms of Service
                </Link>
              </nav>
            </div>

            {/* Programs */}
            <div>
              <h2 className="font-headline text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#0033A0] mb-4">
                Programs
              </h2>
              <nav className="flex flex-col gap-3">
                <Link href="/#programs" className="text-[14px] font-semibold text-[#475569] hover:text-[#0033A0] transition-colors">
                  Tiny Explorers
                </Link>
                <Link href="/#programs" className="text-[14px] font-semibold text-[#475569] hover:text-[#0033A0] transition-colors">
                  Little Explorers
                </Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] font-semibold text-[#475569]">
            Made with ❤️ for every little explorer.
          </p>
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-bold text-[#FFC107]">✦</span>
            <span className="text-[12px] font-bold text-[#0033A0]">Dream.</span>
            <span className="text-[12px] font-bold text-[#FFC107]">✦</span>
            <span className="text-[12px] font-bold text-[#0033A0]">Discover.</span>
            <span className="text-[12px] font-bold text-[#FFC107]">✦</span>
            <span className="text-[12px] font-bold text-[#0033A0]">Explore.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}