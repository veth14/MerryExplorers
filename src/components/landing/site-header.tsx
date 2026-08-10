"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { m, AnimatePresence } from "framer-motion";
import { NAV_LINKS } from "@/data/landing";
import { MenuIcon, CloseIcon } from "./icons";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 5);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    // The outer header is the fixed full-width container.
    // It uses padding to create the "floating" gap from the screen edges.
    // pointer-events-none lets clicks pass through the gaps.
    <m.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-0 inset-x-0 z-50 pointer-events-none px-4 pt-4 md:pt-6"
    >
      {/* The pill — always centered, never clips its edges */}
      <m.div
        animate={{
          backgroundColor: scrolled ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.85)",
          boxShadow: scrolled ? "0 10px 40px -10px rgba(0,51,160,0.12)" : "0 4px 20px -10px rgba(0,51,160,0)",
        }}
        transition={{ duration: 0.2 }}
        className="relative z-50 pointer-events-auto mx-auto flex h-[68px] md:h-[76px] w-full max-w-[1200px] items-center justify-between rounded-full px-4 py-2 sm:px-8 backdrop-blur-2xl border border-white/80"
      >

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="relative h-10 w-10 md:h-11 md:w-11 overflow-hidden transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3">
            <Image src="/LOGO-noBG.png" alt="Merry Explorers Logo" fill sizes="44px" className="object-contain" priority />
          </div>
          <span className="flex flex-col leading-none">
            <span className="font-headline text-[18px] md:text-[19px] font-extrabold tracking-tight text-[#0033A0]">Merry</span>
            <span className="font-headline text-[11px] md:text-[12px] font-bold tracking-[0.14em] text-[#FFB800]">Explorers</span>
          </span>
        </Link>

        {/* ── Desktop Nav ── */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-3">
          {NAV_LINKS.map((link) => {
            const isCTA = link.label.toLowerCase() === "inquire";
            if (isCTA) return null;
            return (
              <Link
                key={link.label}
                href={link.href}
                className="relative group px-4 py-2 text-[15px] font-bold text-[#4a5f82] transition-colors hover:text-[#0033A0]"
              >
                {link.label}
                <span className="absolute bottom-1 left-4 right-4 h-0.5 scale-x-0 rounded-full bg-[#0033A0] transition-transform duration-300 origin-center group-hover:scale-x-100" />
              </Link>
            );
          })}

          <div className="w-px h-6 bg-black/5 mx-2" aria-hidden="true" />

          <Link
            href="/inquire"
            className="group relative overflow-hidden rounded-full bg-[#FFC107] px-6 py-2.5 text-[15px] font-bold text-[#0a1835] shadow-[0_4px_12px_rgba(255,193,7,0.3)] transition-all duration-300 hover:shadow-[0_8px_20px_rgba(255,193,7,0.4)] hover:-translate-y-0.5 will-change-transform"
          >
            <span className="relative z-10 flex items-center gap-2">
              Inquire Now
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full transition-transform duration-300 group-hover:translate-y-0" />
          </Link>
        </nav>

        {/* ── Mobile Toggle ── */}
        <div className="flex items-center md:hidden">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f7fc] text-[#0033A0] transition-colors hover:bg-[#eaf0fe]"
          >
            <AnimatePresence mode="wait">
              <m.div
                key={open ? "close" : "menu"}
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
              </m.div>
            </AnimatePresence>
          </button>
        </div>
      </m.div>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {open && (
          <div className="md:hidden pointer-events-auto">
            {/* Backdrop — full screen so blur covers behind the pill too */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed inset-0 z-40 bg-[#0b1a3d]/20 backdrop-blur-md"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            {/* Menu Panel */}
            <m.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute inset-x-0 top-[84px] z-50 rounded-[2rem] bg-white/95 backdrop-blur-2xl p-3 shadow-[0_32px_80px_-15px_rgba(0,51,160,0.3)] border border-[#eaf0fe]"
            >
              <nav aria-label="Mobile Navigation">
                <ul className="flex flex-col gap-1">
                  {NAV_LINKS.map((link) => {
                    const isCTA = link.label.toLowerCase() === "inquire";
                    return (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className={[
                            "block rounded-2xl px-6 py-4 text-[16px] font-bold transition-colors",
                            isCTA
                              ? "bg-[#FFC107] text-[#0a1835] mt-2 text-center shadow-md shadow-[#FFC107]/20"
                              : "text-[#334e7a] hover:bg-[#eaf0fe] hover:text-[#0033A0]"
                          ].join(" ")}
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </m.header>
  );
}