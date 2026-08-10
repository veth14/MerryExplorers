"use client";

import Link from "next/link";
import Image from "next/image";
import { m, useReducedMotion } from "framer-motion";

const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
  </svg>
);

const NAV_COLS = [
  {
    label: "Quick Links",
    links: [
      { label: "Contact Information", href: "/contact" },
      { label: "Our Location", href: "/location" },
      { label: "Send an Inquiry", href: "/inquire" },
    ],
  },
  {
    label: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms of Service", href: "/terms-of-service" },
    ],
  },
  {
    label: "Programs",
    links: [
      { label: "Tiny Explorers", href: "/#programs" },
      { label: "Little Explorers", href: "/#programs" },
    ],
  },
];

export function SiteFooter() {
  const reduce = useReducedMotion();

  return (
    <footer id="contact" className="border-t border-[#e8edf7] bg-[#f7f9fe]">
      <div className="mx-auto w-full max-w-[1200px] px-6">

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-12 py-16 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">

          {/* Brand Column */}
          <m.div
            initial={reduce ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Link href="/" className="inline-flex items-center gap-3 group mb-6">
              <div className="relative h-11 w-11 transition-transform duration-300 group-hover:scale-105">
                <Image src="/LOGO-noBG.png" alt="Merry Explorers" fill sizes="44px" className="object-contain" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-headline text-[19px] font-extrabold text-[#0033A0]">Merry</span>
                <span className="font-headline text-[11px] font-bold tracking-[0.18em] text-[#FFB800]">Explorers</span>
              </div>
            </Link>

            <p className="text-[14px] leading-[1.8] text-[#6b7d9c] max-w-[260px] mb-6">
              A safe, creative, and nurturing playgroup where young minds bloom and little hearts find joy.
            </p>

            <address className="not-italic text-[13px] text-[#6b7d9c] leading-[1.9] mb-7">
              Unit C, 2nd Floor, B13 L33<br />
              Camarin Rd., North, Caloocan<br />
              1421 Metro Manila
            </address>

            <Link
              href="https://www.facebook.com/profile.php?id=61588889372224"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Merry Explorers on Facebook"
              className="inline-flex items-center gap-2.5 text-[13px] font-semibold text-[#0066CC] hover:text-[#0033A0] transition-colors group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0066CC]/10 text-[#0066CC] transition-all duration-200 group-hover:bg-[#0066CC] group-hover:text-white">
                <FacebookIcon />
              </div>
              Follow us on Facebook
            </Link>
          </m.div>

          {/* Nav Columns */}
          {NAV_COLS.map((col, colIdx) => (
            <m.div
              key={col.label}
              initial={reduce ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: (colIdx + 1) * 0.08, ease: "easeOut" }}
            >
              <h3 className="mb-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#0033A0]">
                {col.label}
              </h3>
              <ul className="flex flex-col gap-3.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-2 text-[14px] text-[#4a5f82] hover:text-[#0033A0] transition-colors font-medium"
                    >
                      <span className="inline-block h-px w-3 rounded-full bg-[#c8d5e8] transition-all duration-300 group-hover:w-5 group-hover:bg-[#FFB800]" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </m.div>
          ))}
        </div>

        {/* Bottom Bar */}
        <m.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10px" }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          className="border-t border-[#e2e8f4] py-6 flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <p className="text-[13px] text-[#8fa0be]" suppressHydrationWarning>
            © {new Date().getFullYear()} Merry Explorers Playgroup &amp; Learning Center.
          </p>
          <p className="text-[13px] text-[#8fa0be]">
            Made with <span className="text-rose-400">♥</span> for every little explorer.
          </p>
        </m.div>
      </div>
    </footer>
  );
}