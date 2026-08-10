"use client";

import { m, useReducedMotion } from "framer-motion";
import { HIGHLIGHTS } from "@/data/landing";
import { HighlightIcon } from "./icons";

const ICON_CONFIG: Record<string, { color: string; bg: string }> = {
  book:   { color: "#0066CC", bg: "#E8F0FF" },
  heart:  { color: "#FFB800", bg: "#FFF8E1" },
  puzzle: { color: "#339933", bg: "#E8F5E8" },
  shield: { color: "#FFC107", bg: "#FFF5CC" },
};

const DISPLAY_TITLES: Record<string, string> = {
  book:   "Small Group Setting",
  heart:  "Caring Teachers",
  puzzle: "Fun Activities",
  shield: "Safe Environment",
};

export function HighlightsSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative py-14 sm:py-20">
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230033A0' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />

      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <h2 className="sr-only">Why Families Choose Merry Explorers</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((item, i) => {
            const cfg = ICON_CONFIG[item.icon] ?? { color: "#0066CC", bg: "#E8F0FF" };
            return (
              <m.div
                key={item.title}
                initial={reduce ? false : { opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                whileHover={{ y: -6, transition: { duration: 0.2, ease: "easeOut" } }}
                className="group flex flex-col items-center gap-4 rounded-[2.5rem] bg-white/80 backdrop-blur-2xl border border-white px-5 py-8 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] cursor-default"
              >
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-3xl transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}
                >
                  <HighlightIcon name={item.icon} className="h-8 w-8" />
                </div>
                <h3 className="font-headline text-[16px] font-bold text-[#0033A0]">
                  {DISPLAY_TITLES[item.icon] ?? item.title}
                </h3>
              </m.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}