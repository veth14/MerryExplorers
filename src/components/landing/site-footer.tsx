"use client";

import Link from "next/link";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer id="contact" className="relative bg-white/60 backdrop-blur-xl pt-16 pb-12 border-t border-black/5">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          
          {/* Brand & Address Column */}
          <div className="max-w-sm">
            <Link href="/#home" className="inline-flex items-center gap-2.5">
              <div className="relative h-10 w-10 overflow-hidden rounded-xl">
                <Image
                  src="/LOGO-noBG.png"
                  alt="Merry Explorers Logo"
                  fill
                  sizes="40px"
                  className="object-contain"
                />
              </div>
              <span className="flex flex-col leading-none">
                <span className="font-headline text-[18px] font-extrabold text-[#0033A0]">
                  Merry
                </span>
                <span className="font-headline text-[12px] font-bold tracking-[0.15em] text-[#FF8A3D]">
                  Explorers
                </span>
              </span>
            </Link>

            <p className="mt-6 text-[13px] font-semibold leading-relaxed text-[#0066CC]">
              Unit C, 2nd Floor, Starla 88 Bldg, Camarin
              <br />
              Rd., Caloocan Near Camarin Doctors
              <br />
              Hospital
            </p>

            <p className="mt-8 text-[12px] font-bold text-[#64748b]">
              © 2024 Merry Explorers Playgroup. ✌️
            </p>
          </div>

          {/* Quick Links Column */}
          <div className="flex flex-col items-start md:items-end">
            <div className="mb-4 text-2xl">
              🚀
            </div>
            <h4 className="font-headline text-[12px] font-extrabold uppercase tracking-widest text-[#0033A0]">
              QUICK LINKS
            </h4>
            <nav className="mt-4 flex flex-col space-y-3 text-left md:text-right">
              <Link
                href="/#contact"
                className="text-[13px] font-bold text-[#0066CC] transition-colors hover:text-[#FFC107]"
              >
                Contact Us
              </Link>
              <Link
                href="/#location"
                className="text-[13px] font-bold text-[#0066CC] transition-colors hover:text-[#FFC107]"
              >
                Location
              </Link>
              <Link
                href="#"
                className="text-[13px] font-bold text-[#0066CC] transition-colors hover:text-[#FFC107]"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="text-[13px] font-bold text-[#0066CC] transition-colors hover:text-[#FFC107]"
              >
                Terms of Service
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
