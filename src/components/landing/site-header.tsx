"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { NAV_LINKS } from "@/data/landing";
import { MenuIcon, CloseIcon } from "./icons";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

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
      className="relative z-50 bg-white/60 border-b border-black/5 sticky top-0 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-[80px] w-full max-w-[1400px] items-center justify-between px-6 sm:px-10">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Link href="/" className="flex items-center gap-2.5 shrink-0 transition-transform hover:scale-[0.98]">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl">
              <Image src="/LOGO-noBG.png" alt="Merry Explorers Logo" fill sizes="40px" className="object-contain" />
            </div>
            <span className="flex flex-col leading-none">
              <span className="font-headline text-[18px] font-extrabold tracking-tight text-[#0033A0]">Merry</span>
              <span className="font-headline text-[12px] font-bold tracking-[0.12em] text-[#FFB800]">Explorers</span>
            </span>
          </Link>
        </motion.div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          {NAV_LINKS.map((link, i) => (
            <motion.div
              key={link.label}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.4 }}
            >
              <Link
                href={link.href}
                className="rounded-full px-6 py-2.5 text-[15px] font-bold transition-all text-[#64748b] hover:bg-black/5 hover:text-[#0033A0]"
              >
                {link.label}
              </Link>
            </motion.div>
          ))}
        </nav>

        {/* Spacer (desktop) + Mobile toggle */}
        <div className="flex items-center">
          <div className="hidden md:block w-10 shrink-0" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F9FC] text-[#0033A0] ring-1 ring-black/5 md:hidden"
          >
            {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden"
          >
            <div
              className="fixed inset-0 top-[80px] z-40 bg-[#0b1a3d]/30 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-x-3 top-[80px] z-50 rounded-3xl bg-white p-4 shadow-[0_24px_60px_-15px_rgba(0,51,160,0.3)] ring-1 ring-black/5"
            >
              <nav aria-label="Mobile Navigation">
                <ul className="flex flex-col gap-1">
                  {NAV_LINKS.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="block rounded-2xl px-4 py-3 text-[15px] font-semibold transition-colors text-[#334155] hover:bg-[#0033A0]/5 hover:text-[#0033A0]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}