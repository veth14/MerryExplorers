"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { NAV_LINKS } from "@/data/landing";
import { MenuIcon, CloseIcon } from "./icons";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
          ? "bg-white/95 shadow-[0_4px_24px_-8px_rgba(0,51,160,0.12)] backdrop-blur-md"
          : "bg-white backdrop-blur-sm"
        }`}
    >
      <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* Logo */}
        <Link href="#home" className="group flex items-center gap-2.5">
          <div className="relative h-9 w-9 overflow-hidden rounded-xl">
            <Image
              src="/LOGO-noBG.png"
              alt="Merry Explorers Logo"
              fill
              sizes="36px"
              className="object-contain"
            />
          </div>
          <span className="flex flex-col leading-none">
            <span className="font-headline text-[16px] font-extrabold tracking-tight text-[#0033A0]">
              Merry
            </span>
            <span className="font-headline text-[11px] font-bold tracking-[0.12em] text-[#FFB800]">
              Explorers
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 lg:flex">
          {NAV_LINKS.map((link, i) => (
            <motion.a
              key={link.label}
              href={link.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
              className="rounded-full px-4 py-2 text-[14px] font-bold text-[#0066CC] transition-colors hover:bg-[#0033A0]/5 hover:text-[#0033A0]"
            >
              {link.label}
            </motion.a>
          ))}
        </nav>

        {/* Desktop CTA — Portal Login (navy pill) */}
        <div className="hidden items-center gap-3 lg:flex">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-full bg-[#FFB800] px-5 py-2.5 text-[14px] font-bold text-white shadow-[0_6px_18px_-4px_rgba(255,184,0,0.5)] transition-all hover:bg-[#F0A800] hover:shadow-[0_8px_22px_-4px_rgba(255,184,0,0.6)]"
            >
              {/* Login arrow icon */}
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Portal Login
            </Link>
          </motion.div>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F9FC] text-[#0033A0] ring-1 ring-black/5 lg:hidden"
        >
          {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden"
          >
            <div
              className="fixed inset-0 top-[64px] z-40 bg-[#0b1a3d]/30 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.nav
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-x-3 top-[72px] z-50 rounded-3xl bg-white p-4 shadow-[0_24px_60px_-15px_rgba(0,51,160,0.3)] ring-1 ring-black/5"
            >
              <div className="flex flex-col">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-2xl px-4 py-3 text-[15px] font-semibold text-[#334155] transition-colors hover:bg-[#0033A0]/5 hover:text-[#0033A0]"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/5 pt-3">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-[#0033A0] px-4 py-2.5 text-center text-[14px] font-bold text-white"
                >
                  Portal Login
                </Link>
                <Link
                  href="#admissions"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-[#FFC107] px-4 py-2.5 text-center text-[14px] font-bold text-[#0b1a3d]"
                >
                  Enroll Now
                </Link>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}